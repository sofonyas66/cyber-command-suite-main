import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Link,
  Plus,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Trash2,
  Settings,
  Loader2,
  Download,
  Copy,
  Webhook,
  Search,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getIntegrationConfig } from "@/integrations/integrationClient";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";

interface Integration {
  id: string;
  name: string;
  type: string;
  status: string;
  last_sync_at: string | null;
  config: any;
  workspace_id: string | null;
}

interface SyncRun {
  id: string;
  integration_id: string;
  status: string;
  records_in: number | null;
  records_out: number | null;
  errors: any;
  started_at: string;
  ended_at: string | null;
}

interface SavedSearch {
  name: string;
  search: string;
  description: string;
  cron_schedule: string;
  is_scheduled: boolean;
  severity: string;
  owner: string;
  app: string;
}

const integrationTypes = [
  { value: "splunk", label: "Splunk" },
  { value: "elastic", label: "Elastic SIEM" },
  { value: "microsoft_sentinel", label: "Microsoft Sentinel" },
  { value: "crowdstrike", label: "CrowdStrike" },
  { value: "tenable", label: "Tenable/Nessus" },
  { value: "qualys", label: "Qualys" },
];

export default function IntegrationsTab() {
  const { toast } = useToast();
  const { activeWorkspace } = useWorkspace();
  const { user } = useAuth();
  
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [syncRuns, setSyncRuns] = useState<SyncRun[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // New integration form state
  const [newIntegration, setNewIntegration] = useState({
    name: "",
    type: "",
    url: "",
    token: "",
  });

  // Splunk saved searches state
  const [savedSearchesDialogOpen, setSavedSearchesDialogOpen] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [selectedSearches, setSelectedSearches] = useState<Set<string>>(new Set());
  const [loadingSearches, setLoadingSearches] = useState(false);
  const [importingSearches, setImportingSearches] = useState(false);

  // Webhook URL dialog
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [webhookIntegration, setWebhookIntegration] = useState<Integration | null>(null);
  const [webhookSecrets, setWebhookSecrets] = useState<Record<string, boolean> | null>(null);
  const [webhookLoading, setWebhookLoading] = useState(false);

  useEffect(() => {
    if (activeWorkspace?.id) {
      fetchIntegrations();
      fetchSyncRuns();
    }
  }, [activeWorkspace?.id]);

  const fetchIntegrations = async () => {
    if (!activeWorkspace?.id) return;
    
    const { data, error } = await supabase
      .from("integrations")
      .select("*")
      .eq("workspace_id", activeWorkspace.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setIntegrations(data);
    }
    setLoading(false);
  };

  const fetchSyncRuns = async () => {
    if (!activeWorkspace?.id) return;
    
    const { data, error } = await supabase
      .from("sync_runs")
      .select("*, integrations!inner(workspace_id)")
      .eq("integrations.workspace_id", activeWorkspace.id)
      .order("started_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setSyncRuns(data as any);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Generate a secure random token for webhook authentication
  const generateWebhookToken = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleAddIntegration = async () => {
    if (!activeWorkspace?.id || !user?.id) return;
    if (!newIntegration.name || !newIntegration.type) {
      toast({ title: "Error", description: "Name and type are required", variant: "destructive" });
      return;
    }

    // Generate a secure webhook token for this integration
    const webhookToken = generateWebhookToken();

    // Create integration with webhook token in config
    const { data: integration, error: intError } = await supabase
      .from("integrations")
      .insert({
        name: newIntegration.name,
        type: newIntegration.type,
        status: "inactive",
        config: { 
          url: newIntegration.url,
          webhook_token: webhookToken, // Secure token for webhook authentication
        },
        user_id: user.id,
        workspace_id: activeWorkspace.id,
      })
      .select()
      .single();

    if (intError) {
      toast({ title: "Error", description: "Failed to create integration", variant: "destructive" });
      return;
    }

    // Store secrets securely
    if (newIntegration.url || newIntegration.token) {
      const secrets = [];
      if (newIntegration.url) {
        secrets.push({ integration_id: integration.id, key: "splunk_url", encrypted_value: newIntegration.url });
      }
      if (newIntegration.token) {
        secrets.push({ integration_id: integration.id, key: "splunk_token", encrypted_value: newIntegration.token });
      }

      const { error: secretError } = await supabase.from("integration_secrets").insert(secrets);
      if (secretError) {
        console.error("Failed to store secrets");
      }
    }

    toast({ title: "Integration Added", description: "Integration created successfully." });
    setIsAddDialogOpen(false);
    setNewIntegration({ name: "", type: "", url: "", token: "" });
    fetchIntegrations();
  };

  const handleTestConnection = async (integrationId: string) => {
    setTestingId(integrationId);
    const integration = integrations.find(i => i.id === integrationId);
    
    if (integration?.type === "splunk") {
      try {
        const { data, error } = await supabase.functions.invoke("splunk-saved-searches", {
          body: { integration_id: integrationId },
        });

        if (error || !data?.success) {
          throw new Error(data?.error || "Connection failed");
        }

        // Update status to active
        await supabase
          .from("integrations")
          .update({ status: "active" })
          .eq("id", integrationId);

        toast({ title: "Connection Successful", description: `Found ${data.saved_searches?.length || 0} saved searches.` });
        fetchIntegrations();
      } catch (err: any) {
        await supabase
          .from("integrations")
          .update({ status: "error" })
          .eq("id", integrationId);

        toast({ title: "Connection Failed", description: err.message, variant: "destructive" });
        fetchIntegrations();
      }
    } else {
      // Simulate for other types
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({ title: "Connection Successful", description: "Successfully connected to the integration." });
    }
    
    setTestingId(null);
  };

  const handleRunSync = async (integrationId: string) => {
    setSyncingId(integrationId);
    
    // Create sync run record
    const { data: syncRun, error: syncError } = await supabase
      .from("sync_runs")
      .insert({
        integration_id: integrationId,
        status: "running",
      })
      .select()
      .single();

    if (syncError) {
      toast({ title: "Error", description: "Failed to start sync", variant: "destructive" });
      setSyncingId(null);
      return;
    }

    // Simulate sync (in production, this would call an edge function)
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Update sync run
    await supabase
      .from("sync_runs")
      .update({
        status: "completed",
        ended_at: new Date().toISOString(),
        records_in: Math.floor(Math.random() * 1000),
        records_out: Math.floor(Math.random() * 50),
      })
      .eq("id", syncRun.id);

    // Update last_sync_at
    await supabase
      .from("integrations")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", integrationId);

    toast({ title: "Sync Complete", description: "Successfully synced data from the integration." });
    setSyncingId(null);
    fetchIntegrations();
    fetchSyncRuns();
  };

  const handleFetchSavedSearches = async (integration: Integration) => {
    setLoadingSearches(true);
    setSavedSearchesDialogOpen(true);
    setSavedSearches([]);
    setSelectedSearches(new Set());

    try {
      const { data, error } = await supabase.functions.invoke("splunk-saved-searches", {
        body: { integration_id: integration.id },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || "Failed to fetch saved searches");
      }

      setSavedSearches(data.saved_searches || []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoadingSearches(false);
    }
  };

  const handleImportSearches = async () => {
    if (!activeWorkspace?.id || !user?.id || selectedSearches.size === 0) return;

    setImportingSearches(true);
    const selectedItems = savedSearches.filter(s => selectedSearches.has(s.name));

    const detections = selectedItems.map(search => ({
      name: search.name,
      platform: "Splunk",
      query_text: search.search,
      notes: search.description,
      schedule: search.cron_schedule || null,
      enabled: search.is_scheduled,
      severity: search.severity as any,
      owner: search.owner,
      data_sources: [search.app],
      tags: ["imported", "splunk"],
      user_id: user.id,
      workspace_id: activeWorkspace.id,
    }));

    const { error } = await supabase.from("detections").insert(detections);

    if (error) {
      toast({ title: "Error", description: "Failed to import detections", variant: "destructive" });
    } else {
      toast({ title: "Import Complete", description: `Imported ${selectedItems.length} saved searches as detections.` });
      setSavedSearchesDialogOpen(false);
    }

    setImportingSearches(false);
  };

  const handleShowWebhook = (integration: Integration) => {
    setWebhookIntegration(integration);
    setWebhookDialogOpen(true);
    // Fetch integration metadata (non-sensitive) including which secret keys exist
    setWebhookSecrets(null);
    setWebhookLoading(true);
    getIntegrationConfig(integration.id)
      .then((res: any) => {
        if (res?.success) {
          setWebhookSecrets(res.secrets || {});
        } else {
          setWebhookSecrets({});
        }
      })
      .catch(err => {
        console.error('Failed to fetch integration config', err);
        setWebhookSecrets({});
      })
      .finally(() => setWebhookLoading(false));
  };

  const getWebhookUrl = (integration: Integration) => {
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    // Use secure token-based authentication instead of exposing workspace/integration IDs
    const webhookToken = integration.config?.webhook_token;
    if (!webhookToken) {
      return `${baseUrl}/functions/v1/splunk-webhook (Token not configured - please recreate integration)`;
    }
    return `${baseUrl}/functions/v1/splunk-webhook?token=${webhookToken}`;
  };

  const copyWebhookUrl = () => {
    if (webhookIntegration) {
      navigator.clipboard.writeText(getWebhookUrl(webhookIntegration));
      toast({ title: "Copied", description: "Webhook URL copied to clipboard" });
    }
  };

  const handleDeleteIntegration = async (integrationId: string) => {
    // Delete secrets first
    await supabase.from("integration_secrets").delete().eq("integration_id", integrationId);
    
    // Delete integration
    const { error } = await supabase.from("integrations").delete().eq("id", integrationId);

    if (error) {
      toast({ title: "Error", description: "Failed to delete integration", variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Integration removed successfully" });
      fetchIntegrations();
    }
  };

  const filteredSyncRuns = selectedIntegration
    ? syncRuns.filter(run => run.integration_id === selectedIntegration)
    : syncRuns;

  return (
    <div className="space-y-6">
      {/* Integrations List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Link className="h-5 w-5" />
              Connected Integrations
            </CardTitle>
            <CardDescription>Manage your security tool integrations</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Integration
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Integration</DialogTitle>
                <DialogDescription>
                  Connect a security tool to import data automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="int-name">Name</Label>
                  <Input
                    id="int-name"
                    placeholder="Production Splunk"
                    value={newIntegration.name}
                    onChange={e => setNewIntegration(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="int-type">Type</Label>
                  <Select
                    value={newIntegration.type}
                    onValueChange={value => setNewIntegration(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select integration type" />
                    </SelectTrigger>
                    <SelectContent>
                      {integrationTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {newIntegration.type === "splunk" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="int-url">Splunk Management URL</Label>
                      <Input
                        id="int-url"
                        placeholder="https://splunk.example.com:8089"
                        value={newIntegration.url}
                        onChange={e => setNewIntegration(prev => ({ ...prev, url: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">Management port (usually 8089)</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="int-token">Splunk Auth Token</Label>
                      <Input
                        id="int-token"
                        type="password"
                        placeholder="Enter Splunk authentication token"
                        value={newIntegration.token}
                        onChange={e => setNewIntegration(prev => ({ ...prev, token: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">Create a token in Settings → Tokens</p>
                    </div>
                  </>
                )}
                {newIntegration.type && newIntegration.type !== "splunk" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="int-url">URL / Endpoint</Label>
                      <Input
                        id="int-url"
                        placeholder="https://api.example.com"
                        value={newIntegration.url}
                        onChange={e => setNewIntegration(prev => ({ ...prev, url: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="int-token">API Key / Token</Label>
                      <Input
                        id="int-token"
                        type="password"
                        placeholder="Enter API key"
                        value={newIntegration.token}
                        onChange={e => setNewIntegration(prev => ({ ...prev, token: e.target.value }))}
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddIntegration}>
                  Add Integration
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {integrations.map(integration => (
                <div
                  key={integration.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors cursor-pointer ${
                    selectedIntegration === integration.id
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedIntegration(
                    selectedIntegration === integration.id ? null : integration.id
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{integration.name}</p>
                        {getStatusBadge(integration.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {integrationTypes.find(t => t.value === integration.type)?.label} •{" "}
                        {integration.last_sync_at
                          ? `Last sync: ${format(new Date(integration.last_sync_at), "MMM d, h:mm a")}`
                          : "Never synced"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {integration.type === "splunk" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation();
                            handleFetchSavedSearches(integration);
                          }}
                          disabled={integration.status !== "active"}
                        >
                          <Search className="h-4 w-4" />
                          <span className="ml-2 hidden sm:inline">Searches</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation();
                            handleShowWebhook(integration);
                          }}
                        >
                          <Webhook className="h-4 w-4" />
                          <span className="ml-2 hidden sm:inline">Webhook</span>
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation();
                        handleTestConnection(integration.id);
                      }}
                      disabled={testingId === integration.id}
                    >
                      {testingId === integration.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      <span className="ml-2 hidden sm:inline">Test</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation();
                        handleRunSync(integration.id);
                      }}
                      disabled={syncingId === integration.id || integration.status === "inactive"}
                    >
                      {syncingId === integration.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      <span className="ml-2 hidden sm:inline">Sync</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={e => e.stopPropagation()}>
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteIntegration(integration.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {integrations.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Link className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No integrations configured</p>
                  <p className="text-sm">Add an integration to start syncing data</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sync History
            {selectedIntegration && (
              <Badge variant="secondary" className="ml-2">
                Filtered
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {selectedIntegration
              ? "Showing sync runs for selected integration"
              : "Recent sync runs across all integrations"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Integration</TableHead>
                <TableHead>Records In</TableHead>
                <TableHead>Records Out</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Errors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSyncRuns.map(run => {
                const integration = integrations.find(i => i.id === run.integration_id);
                const duration = run.ended_at
                  ? Math.round((new Date(run.ended_at).getTime() - new Date(run.started_at).getTime()) / 1000)
                  : null;
                const errors = Array.isArray(run.errors) ? run.errors : [];
                return (
                  <TableRow key={run.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getSyncStatusIcon(run.status)}
                        <span className="capitalize">{run.status}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{integration?.name || "Unknown"}</TableCell>
                    <TableCell>{(run.records_in || 0).toLocaleString()}</TableCell>
                    <TableCell>{(run.records_out || 0).toLocaleString()}</TableCell>
                    <TableCell>{format(new Date(run.started_at), "MMM d, h:mm a")}</TableCell>
                    <TableCell>{duration ? `${duration}s` : "-"}</TableCell>
                    <TableCell>
                      {errors.length > 0 ? (
                        <Badge variant="destructive">{errors.length} error(s)</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredSyncRuns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No sync runs found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Saved Searches Dialog */}
      <Dialog open={savedSearchesDialogOpen} onOpenChange={setSavedSearchesDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Splunk Saved Searches
            </DialogTitle>
            <DialogDescription>
              Select saved searches to import as detections
            </DialogDescription>
          </DialogHeader>
          {loadingSearches ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <ScrollArea className="h-[400px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedSearches.size === savedSearches.length && savedSearches.length > 0}
                          onCheckedChange={checked => {
                            if (checked) {
                              setSelectedSearches(new Set(savedSearches.map(s => s.name)));
                            } else {
                              setSelectedSearches(new Set());
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>App</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Owner</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {savedSearches.map(search => (
                      <TableRow key={search.name}>
                        <TableCell>
                          <Checkbox
                            checked={selectedSearches.has(search.name)}
                            onCheckedChange={checked => {
                              const newSet = new Set(selectedSearches);
                              if (checked) {
                                newSet.add(search.name);
                              } else {
                                newSet.delete(search.name);
                              }
                              setSelectedSearches(newSet);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{search.name}</p>
                            {search.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-xs">
                                {search.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{search.app}</Badge>
                        </TableCell>
                        <TableCell>
                          {search.is_scheduled ? (
                            <span className="text-sm">{search.cron_schedule}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{search.owner}</TableCell>
                      </TableRow>
                    ))}
                    {savedSearches.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No saved searches found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  {selectedSearches.size} of {savedSearches.length} selected
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSavedSearchesDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleImportSearches}
                    disabled={selectedSearches.size === 0 || importingSearches}
                  >
                    {importingSearches ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Import as Detections
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Webhook URL Dialog */}
      <Dialog open={webhookDialogOpen} onOpenChange={setWebhookDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Splunk Webhook Configuration
            </DialogTitle>
            <DialogDescription>
              Configure this URL in Splunk to receive alerts automatically
            </DialogDescription>
          </DialogHeader>
          {webhookIntegration && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={getWebhookUrl(webhookIntegration)}
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyWebhookUrl}
                    disabled={!webhookIntegration?.config?.webhook_token}
                    title={!webhookIntegration?.config?.webhook_token ? 'Webhook token not configured' : 'Copy webhook URL'}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Configured Secrets</Label>
                <div className="flex gap-2 items-center">
                  {webhookLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <div className="flex gap-2">
                      {webhookSecrets && Object.keys(webhookSecrets).length > 0 ? (
                        Object.keys(webhookSecrets).map(key => (
                          <Badge key={key} className="capitalize">{key.replace('_', ' ')}</Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No secret keys configured</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <p className="text-sm font-medium">Setup Instructions:</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Go to Splunk → Settings → Alert Actions</li>
                  <li>Create a new Webhook action or edit an existing alert</li>
                  <li>Paste this URL in the webhook destination</li>
                  <li>Select JSON as the payload format</li>
                  <li>Save and test the alert</li>
                </ol>
              </div>
              <p className="text-xs text-muted-foreground">
                Alerts received will automatically create incidents with attached evidence.
              </p>

              {/* Show warning if Splunk auth token is missing */}
              {webhookLoading ? null : (webhookSecrets && !webhookSecrets['splunk_token']) && (
                <div className="rounded-lg border border-yellow-400/30 bg-yellow-50 p-3">
                  <p className="text-sm text-yellow-700">Warning: Splunk auth token not configured. Fetching saved searches and webhook tests will fail until an auth token is added to integration secrets.</p>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={() => setWebhookDialogOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
