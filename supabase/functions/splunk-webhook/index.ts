import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-splunk-signature, x-webhook-token',
};

// Constant-time string comparison to prevent timing attacks
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Sanitize string for safe use in ILIKE patterns - escape special characters
function sanitizeForIlike(input: string): string {
  // Escape % and _ which are ILIKE wildcards, and limit length
  return input
    .slice(0, 255) // Limit length
    .replace(/[%_\\]/g, '\\$&') // Escape special chars
    .replace(/[^\w\-\.]/g, ''); // Only allow alphanumeric, dash, dot
}

// Sanitize content to prevent XSS in markdown
function sanitizeMarkdown(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .slice(0, 10000) // Limit length
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/on\w+=/gi, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse the webhook payload from Splunk
    const body = await req.text();
    let payload: any;
    
    try {
      payload = JSON.parse(body);
    } catch {
      const formData = new URLSearchParams(body);
      payload = Object.fromEntries(formData.entries());
    }

    console.log('Received Splunk webhook payload');

    // Get webhook token from header or query params
    const webhookToken = req.headers.get('x-webhook-token') || 
                         new URL(req.url).searchParams.get('token');

    if (!webhookToken) {
      console.error('Missing webhook authentication token');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing authentication token' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Look up the integration by webhook token
    const { data: integration, error: intError } = await supabase
      .from('integrations')
      .select('id, workspace_id, user_id, config')
      .eq('config->>webhook_token', webhookToken)
      .single();

    if (intError || !integration) {
      console.error('Invalid webhook token - no matching integration found');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid authentication token' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const workspaceId = integration.workspace_id;
    const integrationId = integration.id;
    let userId = integration.user_id;

    if (!workspaceId) {
      throw new Error('Integration has no associated workspace');
    }

    // If no user from integration, get workspace owner
    if (!userId) {
      const { data: member } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspaceId)
        .eq('role', 'owner')
        .single();
      userId = member?.user_id || null;
    }

    if (!userId) {
      throw new Error('Could not determine user for incident creation');
    }

    // Extract and sanitize alert details from Splunk payload
    const alertName = sanitizeMarkdown(
      String(payload.search_name || payload.name || payload.alert_name || 'Splunk Alert').slice(0, 200)
    );
    const searchQuery = sanitizeMarkdown(String(payload.search || payload.search_string || '').slice(0, 5000));
    const results = Array.isArray(payload.results) ? payload.results.slice(0, 100) : 
                    (payload.result ? [payload.result] : []);
    const resultCount = Math.min(
      Number(payload.results_count || payload.result_count || results.length) || 1,
      10000
    );
    const sid = sanitizeMarkdown(String(payload.sid || payload.search_id || '').slice(0, 100));
    const owner = sanitizeMarkdown(String(payload.owner || '').slice(0, 100));
    const app = sanitizeMarkdown(String(payload.app || 'search').slice(0, 50));

    // Determine severity from Splunk severity field
    const splunkSeverity = String(payload.severity || payload.alert_severity || '3').slice(0, 1);
    const severityMap: Record<string, string> = {
      '1': 'critical',
      '2': 'high',
      '3': 'medium',
      '4': 'low',
      '5': 'low',
    };
    const severity = severityMap[splunkSeverity] || 'medium';

    // Generate incident number
    const incidentNumber = `INC-${Date.now().toString(36).toUpperCase()}`;

    // Build incident description with sanitized content
    const description = `
## Splunk Alert Triggered

**Alert Name:** ${alertName}
**App:** ${app}
**Owner:** ${owner}
**Search ID:** ${sid}
**Result Count:** ${resultCount}

### Search Query
\`\`\`
${searchQuery}
\`\`\`

### Trigger Details
- **Timestamp:** ${new Date().toISOString()}
${payload.trigger_time ? `- **Trigger Time:** ${sanitizeMarkdown(String(payload.trigger_time))}` : ''}
${payload.search_earliest_time ? `- **Search Range:** ${sanitizeMarkdown(String(payload.search_earliest_time))} to ${sanitizeMarkdown(String(payload.search_latest_time || ''))}` : ''}
    `.trim();

    // Create timeline entry
    const timeline = [
      {
        timestamp: new Date().toISOString(),
        action: 'Alert Received',
        description: `Splunk alert "${alertName}" triggered with ${resultCount} result(s)`,
        actor: 'Splunk Integration',
      },
    ];

    // Create artifacts from results (sanitized)
    const artifacts: string[] = [];
    if (sid) {
      artifacts.push(`splunk:search:${sid}`);
    }
    
    // Add first 5 result summaries as artifacts
    for (let i = 0; i < Math.min(results.length, 5); i++) {
      const r = results[i];
      if (r && typeof r === 'object') {
        if (r._raw && typeof r._raw === 'string') {
          artifacts.push(`log:${sanitizeMarkdown(r._raw.slice(0, 200))}`);
        } else if (r.host || r.source) {
          artifacts.push(`host:${sanitizeMarkdown(String(r.host || 'unknown').slice(0, 100))}|source:${sanitizeMarkdown(String(r.source || 'unknown').slice(0, 100))}`);
        }
      }
    }

    // Create safe tags
    const safeTags = ['splunk', 'auto-created', app].map(t => 
      sanitizeMarkdown(String(t).slice(0, 50))
    ).filter(Boolean);

    // Create the incident
    const { data: incident, error: incidentError } = await supabase
      .from('incidents')
      .insert({
        title: alertName,
        description,
        severity: severity as any,
        status: 'open',
        incident_number: incidentNumber,
        user_id: userId,
        workspace_id: workspaceId,
        timeline,
        artifacts,
        tags: safeTags,
      })
      .select()
      .single();

    if (incidentError) {
      console.error('Error creating incident:', incidentError);
      throw new Error('Failed to create incident');
    }

    console.log(`Created incident ${incidentNumber} from Splunk alert: ${alertName}`);

    // Try to find and link affected assets based on results (with sanitization)
    if (results.length > 0) {
      const hostnames = new Set<string>();

      for (const r of results) {
        if (r && typeof r === 'object') {
          // Extract and sanitize hostnames
          for (const field of ['host', 'dest']) {
            if (r[field] && typeof r[field] === 'string') {
              const sanitized = sanitizeForIlike(r[field].toLowerCase());
              if (sanitized.length >= 2) { // Minimum 2 chars to prevent overly broad matches
                hostnames.add(sanitized);
              }
            }
          }
        }
      }

      // Limit number of hostnames to prevent DoS
      const hostnamesToSearch = Array.from(hostnames).slice(0, 10);

      if (hostnamesToSearch.length > 0) {
        // Use safe parameterized queries by fetching assets and filtering in-memory
        const { data: workspaceAssets } = await supabase
          .from('assets')
          .select('id, hostname')
          .eq('workspace_id', workspaceId)
          .limit(1000);

        if (workspaceAssets && workspaceAssets.length > 0) {
          // Match assets safely in JavaScript
          const matchedAssets = workspaceAssets.filter(asset => {
            const assetHostname = asset.hostname?.toLowerCase() || '';
            return hostnamesToSearch.some(h => assetHostname.includes(h));
          });

          // Link assets to incident (limit to 20)
          if (matchedAssets.length > 0) {
            const assetLinks = matchedAssets.slice(0, 20).map(a => ({
              incident_id: incident.id,
              asset_id: a.id,
            }));

            await supabase.from('incident_assets').insert(assetLinks);
            console.log(`Linked ${assetLinks.length} assets to incident`);
          }
        }
      }
    }

    // Create a notification
    await supabase.from('notifications').insert({
      user_id: userId,
      workspace_id: workspaceId,
      title: `New Incident: ${alertName}`,
      message: `Splunk alert triggered - ${resultCount} result(s) found`,
      type: severity === 'critical' || severity === 'high' ? 'error' : 'warning',
      link: `/incidents?id=${incident.id}`,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      incident_id: incident.id,
      incident_number: incidentNumber,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in splunk-webhook:', error.message);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Webhook processing failed' // Generic error to avoid info leakage
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
