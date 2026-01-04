import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Invalid authentication');
    }

    const { integration_id } = await req.json();

    if (!integration_id) {
      throw new Error('integration_id is required');
    }

    // Get the integration
    const { data: integration, error: intError } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', integration_id)
      .eq('type', 'splunk')
      .single();

    if (intError || !integration) {
      throw new Error('Splunk integration not found');
    }

    // Get secrets for this integration
    const { data: secrets, error: secretsError } = await supabase
      .from('integration_secrets')
      .select('key, encrypted_value')
      .eq('integration_id', integration_id);

    if (secretsError) {
      throw new Error('Failed to fetch integration secrets');
    }

    const secretMap: Record<string, string> = {};
    for (const s of secrets || []) {
      // Secrets are stored encrypted by the application layer
      secretMap[s.key] = s.encrypted_value;
    }

    const splunkUrl = secretMap['splunk_url'] || integration.config?.url;
    const splunkToken = secretMap['splunk_token'];

    if (!splunkUrl || !splunkToken) {
      throw new Error('Splunk URL and token are required');
    }

    console.log(`Fetching saved searches from Splunk: ${splunkUrl}`);

    // Fetch saved searches from Splunk REST API
    const searchesResponse = await fetch(
      `${splunkUrl}/servicesNS/-/-/saved/searches?output_mode=json&count=100`,
      {
        headers: {
          'Authorization': `Bearer ${splunkToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!searchesResponse.ok) {
      const errorText = await searchesResponse.text();
      console.error('Splunk API error:', errorText);
      throw new Error(`Splunk API error: ${searchesResponse.status}`);
    }

    const searchesData = await searchesResponse.json();
    
    // Map to our format
    const savedSearches = (searchesData.entry || []).map((entry: any) => ({
      name: entry.name,
      search: entry.content?.search || '',
      description: entry.content?.description || '',
      cron_schedule: entry.content?.cron_schedule || '',
      is_scheduled: entry.content?.is_scheduled === '1',
      alert_type: entry.content?.alert_type || '',
      severity: entry.content?.alert?.severity || 'medium',
      actions: entry.content?.actions || '',
      owner: entry.acl?.owner || '',
      app: entry.acl?.app || 'search',
    }));

    console.log(`Found ${savedSearches.length} saved searches`);

    return new Response(JSON.stringify({ 
      success: true, 
      saved_searches: savedSearches 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in splunk-saved-searches:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
