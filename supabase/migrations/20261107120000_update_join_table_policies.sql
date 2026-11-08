-- Join tables: workspace-based RLS (replaces creator-only user_id policies)

-- vuln_assets
DROP POLICY IF EXISTS "Users can view own vuln_assets" ON public.vuln_assets;
DROP POLICY IF EXISTS "Users can insert own vuln_assets" ON public.vuln_assets;
DROP POLICY IF EXISTS "Users can delete own vuln_assets" ON public.vuln_assets;
DROP POLICY IF EXISTS "Members can select vuln_assets" ON public.vuln_assets;
DROP POLICY IF EXISTS "Analysts+ can insert vuln_assets" ON public.vuln_assets;
DROP POLICY IF EXISTS "Analysts+ can delete vuln_assets" ON public.vuln_assets;

CREATE POLICY "Members can select vuln_assets" ON public.vuln_assets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.vulnerabilities v
    WHERE v.id = vuln_assets.vulnerability_id
      AND is_workspace_member(auth.uid(), v.workspace_id)));

CREATE POLICY "Analysts+ can insert vuln_assets" ON public.vuln_assets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vulnerabilities v
      WHERE v.id = vuln_assets.vulnerability_id
        AND has_workspace_role_or_higher(auth.uid(), v.workspace_id, 'analyst'::workspace_role))
    AND EXISTS (
      SELECT 1 FROM public.vulnerabilities v
      JOIN public.assets a ON a.id = vuln_assets.asset_id
      WHERE v.id = vuln_assets.vulnerability_id
        AND a.workspace_id = v.workspace_id));

CREATE POLICY "Analysts+ can delete vuln_assets" ON public.vuln_assets FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.vulnerabilities v
    WHERE v.id = vuln_assets.vulnerability_id
      AND has_workspace_role_or_higher(auth.uid(), v.workspace_id, 'analyst'::workspace_role)));

-- incident_assets
DROP POLICY IF EXISTS "Users can view own incident_assets" ON public.incident_assets;
DROP POLICY IF EXISTS "Users can insert own incident_assets" ON public.incident_assets;
DROP POLICY IF EXISTS "Users can delete own incident_assets" ON public.incident_assets;
DROP POLICY IF EXISTS "Members can select incident_assets" ON public.incident_assets;
DROP POLICY IF EXISTS "Analysts+ can insert incident_assets" ON public.incident_assets;
DROP POLICY IF EXISTS "Analysts+ can delete incident_assets" ON public.incident_assets;

CREATE POLICY "Members can select incident_assets" ON public.incident_assets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.incidents i
    WHERE i.id = incident_assets.incident_id
      AND is_workspace_member(auth.uid(), i.workspace_id)));

CREATE POLICY "Analysts+ can insert incident_assets" ON public.incident_assets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.incidents i
      WHERE i.id = incident_assets.incident_id
        AND has_workspace_role_or_higher(auth.uid(), i.workspace_id, 'analyst'::workspace_role))
    AND EXISTS (
      SELECT 1 FROM public.incidents i
      JOIN public.assets a ON a.id = incident_assets.asset_id
      WHERE i.id = incident_assets.incident_id
        AND a.workspace_id = i.workspace_id));

CREATE POLICY "Analysts+ can delete incident_assets" ON public.incident_assets FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.incidents i
    WHERE i.id = incident_assets.incident_id
      AND has_workspace_role_or_higher(auth.uid(), i.workspace_id, 'analyst'::workspace_role)));

-- asset_networks
DROP POLICY IF EXISTS "Users can view own asset_networks" ON public.asset_networks;
DROP POLICY IF EXISTS "Users can insert own asset_networks" ON public.asset_networks;
DROP POLICY IF EXISTS "Users can delete own asset_networks" ON public.asset_networks;
DROP POLICY IF EXISTS "Members can select asset_networks" ON public.asset_networks;
DROP POLICY IF EXISTS "Analysts+ can insert asset_networks" ON public.asset_networks;
DROP POLICY IF EXISTS "Analysts+ can delete asset_networks" ON public.asset_networks;

CREATE POLICY "Members can select asset_networks" ON public.asset_networks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.assets a
    WHERE a.id = asset_networks.asset_id
      AND is_workspace_member(auth.uid(), a.workspace_id)));

CREATE POLICY "Analysts+ can insert asset_networks" ON public.asset_networks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assets a
      WHERE a.id = asset_networks.asset_id
        AND has_workspace_role_or_higher(auth.uid(), a.workspace_id, 'analyst'::workspace_role))
    AND EXISTS (
      SELECT 1 FROM public.assets a
      JOIN public.networks n ON n.id = asset_networks.network_id
      WHERE a.id = asset_networks.asset_id
        AND n.workspace_id = a.workspace_id));

CREATE POLICY "Analysts+ can delete asset_networks" ON public.asset_networks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.assets a
    WHERE a.id = asset_networks.asset_id
      AND has_workspace_role_or_higher(auth.uid(), a.workspace_id, 'analyst'::workspace_role)));