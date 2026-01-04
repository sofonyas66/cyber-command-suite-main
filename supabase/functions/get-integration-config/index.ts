// Type checking for Deno remote imports isn't available in this workspace.
// Tell TypeScript to skip type checking for this file to avoid editor diagnostics.
// @ts-nocheck
// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate user JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Invalid authentication');
    }

    const { integration_id } = await req.json();
    if (!integration_id) {
      throw new Error('integration_id is required');
    }

    // Fetch integration row
    const { data: integration, error: intError } = await supabase
      .from('integrations')
      .select('id, name, type, status, config, workspace_id')
      .eq('id', integration_id)
      .single();

    if (intError || !integration) {
      throw new Error('Integration not found');
    }

    // Check that requesting user is a member of the workspace
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', integration.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    // Fetch secret keys only (do not expose values)
    const { data: secrets, error: secretsError } = await supabase
      .from('integration_secrets')
      .select('key')
      .eq('integration_id', integration_id);

    if (secretsError) {
      throw new Error('Failed to fetch integration secrets');
    }

    const secretKeys: Record<string, boolean> = {};
    for (const s of secrets || []) {
      secretKeys[s.key] = true;
    }

    // Return non-sensitive integration info and which secret keys exist
    return new Response(JSON.stringify({
      success: true,
      integration: {
        id: integration.id,
        name: integration.name,
        type: integration.type,
        status: integration.status,
        config: integration.config || {},
        workspace_id: integration.workspace_id,
      },
      secrets: secretKeys,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in get-integration-config:', error?.message || error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to retrieve integration config' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
