-- Create change_type enum
CREATE TYPE public.change_type AS ENUM ('Firewall', 'ACL', 'Routing', 'VPN', 'Switch', 'DNS');

-- Create change_status enum
CREATE TYPE public.change_status AS ENUM ('Draft', 'Review', 'Approved', 'Implemented', 'Verified', 'Closed');

-- Create change_risk_level enum
CREATE TYPE public.change_risk_level AS ENUM ('Low', 'Medium', 'High', 'Critical');

-- Create changes table
CREATE TABLE public.changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  change_number TEXT,
  change_type change_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  risk_level change_risk_level DEFAULT 'Medium',
  impacted_asset_ids UUID[] DEFAULT '{}',
  impacted_network_ids UUID[] DEFAULT '{}',
  planned_start TIMESTAMP WITH TIME ZONE,
  planned_end TIMESTAMP WITH TIME ZONE,
  rollback_plan TEXT,
  validation_steps JSONB DEFAULT '[]',
  status change_status DEFAULT 'Draft',
  approver TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  implemented_at TIMESTAMP WITH TIME ZONE,
  verified_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  evidence_links TEXT[] DEFAULT '{}',
  timeline JSONB DEFAULT '[]',
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace changes" ON public.changes
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Analysts+ can insert changes" ON public.changes
  FOR INSERT WITH CHECK (has_workspace_role_or_higher(auth.uid(), workspace_id, 'analyst'::workspace_role));

CREATE POLICY "Analysts+ can update changes" ON public.changes
  FOR UPDATE USING (has_workspace_role_or_higher(auth.uid(), workspace_id, 'analyst'::workspace_role));

CREATE POLICY "Admins+ can delete changes" ON public.changes
  FOR DELETE USING (has_workspace_role_or_higher(auth.uid(), workspace_id, 'admin'::workspace_role));

-- Add trigger for updated_at
CREATE TRIGGER update_changes_updated_at BEFORE UPDATE ON public.changes
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Create sequence for change numbers
CREATE SEQUENCE public.change_number_seq START 1;

-- Function to generate change number
CREATE OR REPLACE FUNCTION public.generate_change_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.change_number := 'CHG-' || LPAD(nextval('public.change_number_seq')::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate change number
CREATE TRIGGER set_change_number
  BEFORE INSERT ON public.changes
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_change_number();