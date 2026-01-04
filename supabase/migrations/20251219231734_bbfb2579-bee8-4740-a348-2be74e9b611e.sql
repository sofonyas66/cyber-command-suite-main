-- Create detections table
CREATE TABLE public.detections (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'Splunk',
  query_text TEXT,
  schedule TEXT,
  enabled BOOLEAN DEFAULT true,
  severity vuln_severity DEFAULT 'medium',
  mitre_techniques TEXT[] DEFAULT '{}',
  data_sources TEXT[] DEFAULT '{}',
  owner TEXT,
  notes TEXT,
  last_fired_at TIMESTAMP WITH TIME ZONE,
  false_positive_rate NUMERIC(5,2) DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  user_id UUID NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add updated_at trigger
CREATE TRIGGER handle_detections_updated_at
  BEFORE UPDATE ON public.detections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.detections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view workspace detections"
  ON public.detections FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Analysts+ can insert detections"
  ON public.detections FOR INSERT
  WITH CHECK (has_workspace_role_or_higher(auth.uid(), workspace_id, 'analyst'));

CREATE POLICY "Analysts+ can update detections"
  ON public.detections FOR UPDATE
  USING (has_workspace_role_or_higher(auth.uid(), workspace_id, 'analyst'));

CREATE POLICY "Admins+ can delete detections"
  ON public.detections FOR DELETE
  USING (has_workspace_role_or_higher(auth.uid(), workspace_id, 'admin'));