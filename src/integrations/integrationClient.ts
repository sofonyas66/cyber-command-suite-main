import { supabase } from '@/integrations/supabase/client';

export async function getIntegrationConfig(integrationId: string) {
  const { data, error } = await supabase.functions.invoke('get-integration-config', {
    body: { integration_id: integrationId },
  });

  if (error) {
    throw error;
  }

  return data;
}
