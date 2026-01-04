-- Create sites table for physical locations
CREATE TABLE public.sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  description TEXT,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace sites" ON public.sites
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Analysts+ can insert sites" ON public.sites
  FOR INSERT WITH CHECK (has_workspace_role_or_higher(auth.uid(), workspace_id, 'analyst'::workspace_role));

CREATE POLICY "Analysts+ can update sites" ON public.sites
  FOR UPDATE USING (has_workspace_role_or_higher(auth.uid(), workspace_id, 'analyst'::workspace_role));

CREATE POLICY "Admins+ can delete sites" ON public.sites
  FOR DELETE USING (has_workspace_role_or_higher(auth.uid(), workspace_id, 'admin'::workspace_role));

-- Create vlans table
CREATE TABLE public.vlans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vlan_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  network_id UUID REFERENCES public.networks(id) ON DELETE SET NULL,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.vlans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace vlans" ON public.vlans
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Analysts+ can insert vlans" ON public.vlans
  FOR INSERT WITH CHECK (has_workspace_role_or_higher(auth.uid(), workspace_id, 'analyst'::workspace_role));

CREATE POLICY "Analysts+ can update vlans" ON public.vlans
  FOR UPDATE USING (has_workspace_role_or_higher(auth.uid(), workspace_id, 'analyst'::workspace_role));

CREATE POLICY "Admins+ can delete vlans" ON public.vlans
  FOR DELETE USING (has_workspace_role_or_higher(auth.uid(), workspace_id, 'admin'::workspace_role));

-- Create interfaces table for asset network interfaces
CREATE TABLE public.interfaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ip_address INET,
  mac_address TEXT,
  vlan_id UUID REFERENCES public.vlans(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'up',
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.interfaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace interfaces" ON public.interfaces
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Analysts+ can insert interfaces" ON public.interfaces
  FOR INSERT WITH CHECK (has_workspace_role_or_higher(auth.uid(), workspace_id, 'analyst'::workspace_role));

CREATE POLICY "Analysts+ can update interfaces" ON public.interfaces
  FOR UPDATE USING (has_workspace_role_or_higher(auth.uid(), workspace_id, 'analyst'::workspace_role));

CREATE POLICY "Admins+ can delete interfaces" ON public.interfaces
  FOR DELETE USING (has_workspace_role_or_higher(auth.uid(), workspace_id, 'admin'::workspace_role));

-- Create ports_services table
CREATE TABLE public.ports_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  port INTEGER NOT NULL,
  protocol TEXT DEFAULT 'tcp',
  service_name TEXT,
  version TEXT,
  status TEXT DEFAULT 'open',
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.ports_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace ports_services" ON public.ports_services
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Analysts+ can insert ports_services" ON public.ports_services
  FOR INSERT WITH CHECK (has_workspace_role_or_higher(auth.uid(), workspace_id, 'analyst'::workspace_role));

CREATE POLICY "Analysts+ can update ports_services" ON public.ports_services
  FOR UPDATE USING (has_workspace_role_or_higher(auth.uid(), workspace_id, 'analyst'::workspace_role));

CREATE POLICY "Admins+ can delete ports_services" ON public.ports_services
  FOR DELETE USING (has_workspace_role_or_higher(auth.uid(), workspace_id, 'admin'::workspace_role));

-- Add site_id to networks table
ALTER TABLE public.networks ADD COLUMN site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL;

-- Add triggers for updated_at
CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_vlans_updated_at BEFORE UPDATE ON public.vlans
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_interfaces_updated_at BEFORE UPDATE ON public.interfaces
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_ports_services_updated_at BEFORE UPDATE ON public.ports_services
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();