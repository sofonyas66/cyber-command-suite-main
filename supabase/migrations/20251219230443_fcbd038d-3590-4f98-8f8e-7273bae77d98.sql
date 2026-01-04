-- Create workspace role enum
CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'analyst', 'readonly');

-- Create workspaces table
CREATE TABLE public.workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workspace_members table
CREATE TABLE public.workspace_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'analyst',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

-- Enable RLS on new tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Security definer function to check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id
  )
$$;

-- Security definer function to check workspace role
CREATE OR REPLACE FUNCTION public.has_workspace_role(_user_id UUID, _workspace_id UUID, _role workspace_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id 
      AND workspace_id = _workspace_id 
      AND role = _role
  )
$$;

-- Security definer function to check if user has at least a certain role level
CREATE OR REPLACE FUNCTION public.has_workspace_role_or_higher(_user_id UUID, _workspace_id UUID, _min_role workspace_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id 
      AND workspace_id = _workspace_id 
      AND (
        (_min_role = 'readonly') OR
        (_min_role = 'analyst' AND role IN ('analyst', 'admin', 'owner')) OR
        (_min_role = 'admin' AND role IN ('admin', 'owner')) OR
        (_min_role = 'owner' AND role = 'owner')
      )
  )
$$;

-- Get user's workspaces function
CREATE OR REPLACE FUNCTION public.get_user_workspaces(_user_id UUID)
RETURNS TABLE(workspace_id UUID, workspace_name TEXT, workspace_slug TEXT, user_role workspace_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.id, w.name, w.slug, wm.role
  FROM public.workspaces w
  INNER JOIN public.workspace_members wm ON w.id = wm.workspace_id
  WHERE wm.user_id = _user_id
$$;

-- RLS policies for workspaces (members can view their workspaces)
CREATE POLICY "Users can view workspaces they belong to"
ON public.workspaces FOR SELECT
USING (public.is_workspace_member(auth.uid(), id));

CREATE POLICY "Owners and admins can update workspace"
ON public.workspaces FOR UPDATE
USING (public.has_workspace_role_or_higher(auth.uid(), id, 'admin'));

CREATE POLICY "Authenticated users can create workspaces"
ON public.workspaces FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owners can delete workspace"
ON public.workspaces FOR DELETE
USING (public.has_workspace_role(auth.uid(), id, 'owner'));

-- RLS policies for workspace_members
CREATE POLICY "Members can view workspace members"
ON public.workspace_members FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Owners and admins can manage members"
ON public.workspace_members FOR INSERT
WITH CHECK (public.has_workspace_role_or_higher(auth.uid(), workspace_id, 'admin'));

CREATE POLICY "Owners and admins can update members"
ON public.workspace_members FOR UPDATE
USING (public.has_workspace_role_or_higher(auth.uid(), workspace_id, 'admin'));

CREATE POLICY "Owners and admins can remove members"
ON public.workspace_members FOR DELETE
USING (public.has_workspace_role_or_higher(auth.uid(), workspace_id, 'admin'));

-- Add workspace_id to all existing tables
ALTER TABLE public.assets ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.networks ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.vulnerabilities ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.incidents ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.runbooks ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.log_snippets ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Drop old user-based RLS policies and create workspace-based ones
-- Assets
DROP POLICY IF EXISTS "Users can view own assets" ON public.assets;
DROP POLICY IF EXISTS "Users can insert own assets" ON public.assets;
DROP POLICY IF EXISTS "Users can update own assets" ON public.assets;
DROP POLICY IF EXISTS "Users can delete own assets" ON public.assets;

CREATE POLICY "Members can view workspace assets"
ON public.assets FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Analysts+ can insert assets"
ON public.assets FOR INSERT
WITH CHECK (public.has_workspace_role_or_higher(auth.uid(), workspace_id, 'analyst'));

CREATE POLICY "Analysts+ can update assets"
ON public.assets FOR UPDATE
USING (public.has_workspace_role_or_higher(auth.uid(), workspace_id, 'analyst'));

CREATE POLICY "Admins+ can delete assets"
ON public.assets FOR DELETE
USING (public.has_workspace_role_or_higher(auth.uid(), workspace_id, 'admin'));

-- Networks
DROP POLICY IF EXISTS "Users can view own networks" ON public.networks;
DROP POLICY IF EXISTS "Users can insert own networks" ON public.networks;
DROP POLICY IF EXISTS "Users can update own networks" ON public.networks;
DROP POLICY IF EXISTS "Users can delete own networks" ON public.networks;

CREATE POLICY "Members can view workspace networks"
ON public.networks FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Analysts+ can insert networks"
ON public.networks FOR INSERT
WITH CHECK (public.has_workspace_role_or_higher(auth.uid(), workspace_id, 'analyst'));

CREATE POLICY "Analysts+ can update networks"
ON public.networks FOR UPDATE
USING (public.has_workspace_role_or_higher(auth.uid(), workspace_id, 'analyst'));

CREATE POLICY "Admins+ can delete networks"
ON public.networks FOR DELETE
USING (public.has_workspace_role_or_higher(auth.uid(), workspace_id, 'admin'));

-- Vulnerabilities
DROP POLICY IF EXISTS "Users can view own vulnerabilities" ON public.vulnerabilities;
DROP POLICY IF EXISTS "Users can insert own vulnerabilities" ON public.vulnerabilities;
DROP POLICY IF EXISTS "Users can update own vulnerabilities" ON public.vulnerabilities;
DROP POLICY IF EXISTS "Users can delete own vulnerabilities" ON public.vulnerabilities;

CREATE POLICY "Members can view workspace vulnerabilities"
ON public.vulnerabilities FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Analysts+ can insert vulnerabilities"
ON public.vulnerabilities FOR INSERT
WITH CHECK (public.has_workspace_role_or_higher(auth.uid(), workspace_id, 'analyst'));

CREATE POLICY "Analysts+ can update vulnerabilities"
ON public.vulnerabilities FOR UPDATE
USING (public.has_workspace_role_or_higher(auth.uid(), workspace_id, 'analyst'));

CREATE POLICY "Admins+ can delete vulnerabilities"
ON public.vulnerabilities FOR DELETE
USING (public.has_workspace_role_or_higher(auth.uid(), workspace_id, 'admin'));

-- Incidents
DROP POLICY IF EXISTS "Users can view own incidents" ON public.incidents;
DROP POLICY IF EXISTS "Users can insert own incidents" ON public.incidents;
DROP POLICY IF EXISTS "Users can update own incidents" ON public.incidents;
DROP POLICY IF EXISTS "Users can delete own incidents" ON public.incidents;

CREATE POLICY "Members can view workspace incidents"
ON public.incidents FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Analysts+ can insert incidents"
ON public.incidents FOR INSERT
WITH CHECK (public.has_workspace_role_or_higher(auth.uid(), workspace_id, 'analyst'));

CREATE POLICY "Analysts+ can update incidents"
ON public.incidents FOR UPDATE
USING (public.has_workspace_role_or_higher(auth.uid(), workspace_id, 'analyst'));

CREATE POLICY "Admins+ can delete incidents"
ON public.incidents FOR DELETE
USING (public.has_workspace_role_or_higher(auth.uid(), workspace_id, 'admin'));

-- Runbooks
DROP POLICY IF EXISTS "Users can view own runbooks" ON public.runbooks;
DROP POLICY IF EXISTS "Users can insert own runbooks" ON public.runbooks;
DROP POLICY IF EXISTS "Users can update own runbooks" ON public.runbooks;
DROP POLICY IF EXISTS "Users can delete own runbooks" ON public.runbooks;

CREATE POLICY "Members can view workspace runbooks"
ON public.runbooks FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Analysts+ can insert runbooks"
ON public.runbooks FOR INSERT
WITH CHECK (public.has_workspace_role_or_higher(auth.uid(), workspace_id, 'analyst'));

CREATE POLICY "Analysts+ can update runbooks"
ON public.runbooks FOR UPDATE
USING (public.has_workspace_role_or_higher(auth.uid(), workspace_id, 'analyst'));

CREATE POLICY "Admins+ can delete runbooks"
ON public.runbooks FOR DELETE
USING (public.has_workspace_role_or_higher(auth.uid(), workspace_id, 'admin'));

-- Log snippets
DROP POLICY IF EXISTS "Users can view own log_snippets" ON public.log_snippets;
DROP POLICY IF EXISTS "Users can insert own log_snippets" ON public.log_snippets;
DROP POLICY IF EXISTS "Users can update own log_snippets" ON public.log_snippets;
DROP POLICY IF EXISTS "Users can delete own log_snippets" ON public.log_snippets;

CREATE POLICY "Members can view workspace log_snippets"
ON public.log_snippets FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Analysts+ can insert log_snippets"
ON public.log_snippets FOR INSERT
WITH CHECK (public.has_workspace_role_or_higher(auth.uid(), workspace_id, 'analyst'));

CREATE POLICY "Analysts+ can update log_snippets"
ON public.log_snippets FOR UPDATE
USING (public.has_workspace_role_or_higher(auth.uid(), workspace_id, 'analyst'));

CREATE POLICY "Admins+ can delete log_snippets"
ON public.log_snippets FOR DELETE
USING (public.has_workspace_role_or_higher(auth.uid(), workspace_id, 'admin'));

-- Tasks
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

CREATE POLICY "Members can view workspace tasks"
ON public.tasks FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Analysts+ can insert tasks"
ON public.tasks FOR INSERT
WITH CHECK (public.has_workspace_role_or_higher(auth.uid(), workspace_id, 'analyst'));

CREATE POLICY "Analysts+ can update tasks"
ON public.tasks FOR UPDATE
USING (public.has_workspace_role_or_higher(auth.uid(), workspace_id, 'analyst'));

CREATE POLICY "Admins+ can delete tasks"
ON public.tasks FOR DELETE
USING (public.has_workspace_role_or_higher(auth.uid(), workspace_id, 'admin'));

-- Notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

CREATE POLICY "Members can view workspace notifications"
ON public.notifications FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can update own notifications"
ON public.notifications FOR UPDATE
USING (public.is_workspace_member(auth.uid(), workspace_id) AND user_id = auth.uid());

CREATE POLICY "Members can delete own notifications"
ON public.notifications FOR DELETE
USING (public.is_workspace_member(auth.uid(), workspace_id) AND user_id = auth.uid());

-- Update triggers for new tables
CREATE TRIGGER update_workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_workspace_members_updated_at
BEFORE UPDATE ON public.workspace_members
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Function to create default workspace for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_workspace_id UUID;
BEGIN
  -- Create default "HomeLab" workspace for new user
  INSERT INTO public.workspaces (name, slug, description)
  VALUES ('HomeLab', 'homelab-' || substr(NEW.id::text, 1, 8), 'My personal security lab')
  RETURNING id INTO new_workspace_id;
  
  -- Add user as owner of the workspace
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, NEW.id, 'owner');
  
  RETURN NEW;
END;
$$;

-- Trigger to create workspace on user signup
CREATE TRIGGER on_auth_user_created_workspace
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_workspace();