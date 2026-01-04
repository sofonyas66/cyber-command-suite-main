-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types for various statuses
CREATE TYPE asset_criticality AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE asset_environment AS ENUM ('production', 'staging', 'development', 'testing', 'dmz');
CREATE TYPE vuln_status AS ENUM ('new', 'triage', 'in_progress', 'mitigated', 'accepted', 'false_positive');
CREATE TYPE vuln_severity AS ENUM ('critical', 'high', 'medium', 'low', 'informational');
CREATE TYPE incident_severity AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE incident_status AS ENUM ('open', 'investigating', 'contained', 'eradicated', 'recovered', 'closed');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'blocked');

-- Profiles table (single user)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'Security Engineer',
  theme TEXT DEFAULT 'dark',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assets table
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  hostname TEXT NOT NULL,
  ip_address INET,
  mac_address TEXT,
  os TEXT,
  os_version TEXT,
  asset_type TEXT DEFAULT 'server',
  owner TEXT,
  location TEXT,
  environment asset_environment DEFAULT 'production',
  criticality asset_criticality DEFAULT 'medium',
  tags TEXT[] DEFAULT '{}',
  last_seen TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Networks/Subnets table
CREATE TABLE public.networks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  cidr TEXT NOT NULL,
  vlan_id INTEGER,
  description TEXT,
  firewall_zone TEXT,
  gateway TEXT,
  dns_servers TEXT[],
  routing_notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asset-Network join table
CREATE TABLE public.asset_networks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID REFERENCES public.assets ON DELETE CASCADE NOT NULL,
  network_id UUID REFERENCES public.networks ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(asset_id, network_id)
);

-- Vulnerabilities table
CREATE TABLE public.vulnerabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  cve_id TEXT,
  cvss_score DECIMAL(3,1),
  severity vuln_severity DEFAULT 'medium',
  status vuln_status DEFAULT 'new',
  description TEXT,
  solution TEXT,
  source TEXT,
  first_detected TIMESTAMPTZ DEFAULT NOW(),
  sla_due_date DATE,
  remediation_steps TEXT,
  evidence_links TEXT[],
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vulnerability-Asset join table
CREATE TABLE public.vuln_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vulnerability_id UUID REFERENCES public.vulnerabilities ON DELETE CASCADE NOT NULL,
  asset_id UUID REFERENCES public.assets ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vulnerability_id, asset_id)
);

-- Incidents table
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  incident_number TEXT UNIQUE,
  severity incident_severity DEFAULT 'medium',
  status incident_status DEFAULT 'open',
  description TEXT,
  timeline JSONB DEFAULT '[]',
  artifacts TEXT[],
  root_cause TEXT,
  lessons_learned TEXT,
  post_incident_checklist JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incident-Asset join table
CREATE TABLE public.incident_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID REFERENCES public.incidents ON DELETE CASCADE NOT NULL,
  asset_id UUID REFERENCES public.assets ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(incident_id, asset_id)
);

-- Runbooks table
CREATE TABLE public.runbooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  description TEXT,
  steps JSONB DEFAULT '[]',
  commands JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  last_used TIMESTAMPTZ,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log Snippets table
CREATE TABLE public.log_snippets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  query TEXT,
  log_source TEXT,
  content TEXT,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status task_status DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  due_date DATE,
  related_incident_id UUID REFERENCES public.incidents ON DELETE SET NULL,
  related_vulnerability_id UUID REFERENCES public.vulnerabilities ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vuln_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_snippets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Assets RLS policies
CREATE POLICY "Users can view own assets" ON public.assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own assets" ON public.assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own assets" ON public.assets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own assets" ON public.assets FOR DELETE USING (auth.uid() = user_id);

-- Networks RLS policies
CREATE POLICY "Users can view own networks" ON public.networks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own networks" ON public.networks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own networks" ON public.networks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own networks" ON public.networks FOR DELETE USING (auth.uid() = user_id);

-- Asset Networks RLS policies
CREATE POLICY "Users can view own asset_networks" ON public.asset_networks FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.assets WHERE assets.id = asset_networks.asset_id AND assets.user_id = auth.uid()));
CREATE POLICY "Users can insert own asset_networks" ON public.asset_networks FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.assets WHERE assets.id = asset_networks.asset_id AND assets.user_id = auth.uid()));
CREATE POLICY "Users can delete own asset_networks" ON public.asset_networks FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.assets WHERE assets.id = asset_networks.asset_id AND assets.user_id = auth.uid()));

-- Vulnerabilities RLS policies
CREATE POLICY "Users can view own vulnerabilities" ON public.vulnerabilities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own vulnerabilities" ON public.vulnerabilities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vulnerabilities" ON public.vulnerabilities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own vulnerabilities" ON public.vulnerabilities FOR DELETE USING (auth.uid() = user_id);

-- Vuln Assets RLS policies
CREATE POLICY "Users can view own vuln_assets" ON public.vuln_assets FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.vulnerabilities WHERE vulnerabilities.id = vuln_assets.vulnerability_id AND vulnerabilities.user_id = auth.uid()));
CREATE POLICY "Users can insert own vuln_assets" ON public.vuln_assets FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.vulnerabilities WHERE vulnerabilities.id = vuln_assets.vulnerability_id AND vulnerabilities.user_id = auth.uid()));
CREATE POLICY "Users can delete own vuln_assets" ON public.vuln_assets FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.vulnerabilities WHERE vulnerabilities.id = vuln_assets.vulnerability_id AND vulnerabilities.user_id = auth.uid()));

-- Incidents RLS policies
CREATE POLICY "Users can view own incidents" ON public.incidents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own incidents" ON public.incidents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own incidents" ON public.incidents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own incidents" ON public.incidents FOR DELETE USING (auth.uid() = user_id);

-- Incident Assets RLS policies
CREATE POLICY "Users can view own incident_assets" ON public.incident_assets FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.incidents WHERE incidents.id = incident_assets.incident_id AND incidents.user_id = auth.uid()));
CREATE POLICY "Users can insert own incident_assets" ON public.incident_assets FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.incidents WHERE incidents.id = incident_assets.incident_id AND incidents.user_id = auth.uid()));
CREATE POLICY "Users can delete own incident_assets" ON public.incident_assets FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.incidents WHERE incidents.id = incident_assets.incident_id AND incidents.user_id = auth.uid()));

-- Runbooks RLS policies
CREATE POLICY "Users can view own runbooks" ON public.runbooks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own runbooks" ON public.runbooks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own runbooks" ON public.runbooks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own runbooks" ON public.runbooks FOR DELETE USING (auth.uid() = user_id);

-- Log Snippets RLS policies
CREATE POLICY "Users can view own log_snippets" ON public.log_snippets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own log_snippets" ON public.log_snippets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own log_snippets" ON public.log_snippets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own log_snippets" ON public.log_snippets FOR DELETE USING (auth.uid() = user_id);

-- Tasks RLS policies
CREATE POLICY "Users can view own tasks" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

-- Notifications RLS policies
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_networks_updated_at BEFORE UPDATE ON public.networks FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_vulnerabilities_updated_at BEFORE UPDATE ON public.vulnerabilities FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_runbooks_updated_at BEFORE UPDATE ON public.runbooks FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_log_snippets_updated_at BEFORE UPDATE ON public.log_snippets FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Create trigger function for new user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for performance
CREATE INDEX idx_assets_user_id ON public.assets(user_id);
CREATE INDEX idx_assets_hostname ON public.assets(hostname);
CREATE INDEX idx_assets_ip ON public.assets(ip_address);
CREATE INDEX idx_assets_environment ON public.assets(environment);
CREATE INDEX idx_assets_criticality ON public.assets(criticality);

CREATE INDEX idx_networks_user_id ON public.networks(user_id);
CREATE INDEX idx_networks_cidr ON public.networks(cidr);

CREATE INDEX idx_vulnerabilities_user_id ON public.vulnerabilities(user_id);
CREATE INDEX idx_vulnerabilities_severity ON public.vulnerabilities(severity);
CREATE INDEX idx_vulnerabilities_status ON public.vulnerabilities(status);
CREATE INDEX idx_vulnerabilities_cve ON public.vulnerabilities(cve_id);

CREATE INDEX idx_incidents_user_id ON public.incidents(user_id);
CREATE INDEX idx_incidents_severity ON public.incidents(severity);
CREATE INDEX idx_incidents_status ON public.incidents(status);

CREATE INDEX idx_runbooks_user_id ON public.runbooks(user_id);
CREATE INDEX idx_runbooks_category ON public.runbooks(category);

CREATE INDEX idx_log_snippets_user_id ON public.log_snippets(user_id);
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);