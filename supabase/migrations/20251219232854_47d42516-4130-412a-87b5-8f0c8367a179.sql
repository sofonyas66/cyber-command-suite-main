-- Create integrations table
CREATE TABLE public.integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'splunk', 'elastic', 'microsoft_sentinel', 'crowdstrike', etc.
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive', -- 'active', 'inactive', 'error'
  config JSONB DEFAULT '{}'::jsonb, -- non-sensitive config like URLs, indices
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create integration_secrets table (encrypted values stored)
CREATE TABLE public.integration_secrets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID REFERENCES public.integrations(id) ON DELETE CASCADE NOT NULL,
  key TEXT NOT NULL, -- 'api_key', 'client_secret', etc.
  encrypted_value TEXT NOT NULL, -- stored encrypted
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(integration_id, key)
);

-- Create sync_runs table
CREATE TABLE public.sync_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID REFERENCES public.integrations(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
  records_in INTEGER DEFAULT 0,
  records_out INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;

-- Integrations RLS policies
CREATE POLICY "Members can view workspace integrations" ON public.integrations
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins+ can insert integrations" ON public.integrations
  FOR INSERT WITH CHECK (has_workspace_role_or_higher(auth.uid(), workspace_id, 'admin'::workspace_role));

CREATE POLICY "Admins+ can update integrations" ON public.integrations
  FOR UPDATE USING (has_workspace_role_or_higher(auth.uid(), workspace_id, 'admin'::workspace_role));

CREATE POLICY "Admins+ can delete integrations" ON public.integrations
  FOR DELETE USING (has_workspace_role_or_higher(auth.uid(), workspace_id, 'admin'::workspace_role));

-- Integration secrets RLS policies (only admins can access)
CREATE POLICY "Admins+ can view integration secrets" ON public.integration_secrets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.integrations i 
      WHERE i.id = integration_secrets.integration_id 
      AND has_workspace_role_or_higher(auth.uid(), i.workspace_id, 'admin'::workspace_role)
    )
  );

CREATE POLICY "Admins+ can insert integration secrets" ON public.integration_secrets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.integrations i 
      WHERE i.id = integration_secrets.integration_id 
      AND has_workspace_role_or_higher(auth.uid(), i.workspace_id, 'admin'::workspace_role)
    )
  );

CREATE POLICY "Admins+ can update integration secrets" ON public.integration_secrets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.integrations i 
      WHERE i.id = integration_secrets.integration_id 
      AND has_workspace_role_or_higher(auth.uid(), i.workspace_id, 'admin'::workspace_role)
    )
  );

CREATE POLICY "Admins+ can delete integration secrets" ON public.integration_secrets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.integrations i 
      WHERE i.id = integration_secrets.integration_id 
      AND has_workspace_role_or_higher(auth.uid(), i.workspace_id, 'admin'::workspace_role)
    )
  );

-- Sync runs RLS policies
CREATE POLICY "Members can view sync runs" ON public.sync_runs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.integrations i 
      WHERE i.id = sync_runs.integration_id 
      AND is_workspace_member(auth.uid(), i.workspace_id)
    )
  );

CREATE POLICY "Admins+ can insert sync runs" ON public.sync_runs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.integrations i 
      WHERE i.id = sync_runs.integration_id 
      AND has_workspace_role_or_higher(auth.uid(), i.workspace_id, 'admin'::workspace_role)
    )
  );

CREATE POLICY "Admins+ can update sync runs" ON public.sync_runs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.integrations i 
      WHERE i.id = sync_runs.integration_id 
      AND has_workspace_role_or_higher(auth.uid(), i.workspace_id, 'admin'::workspace_role)
    )
  );

-- Add updated_at triggers
CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_integration_secrets_updated_at
  BEFORE UPDATE ON public.integration_secrets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();