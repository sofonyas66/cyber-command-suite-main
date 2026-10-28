import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Server,
  Monitor,
  Router,
  HardDrive,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import AssetDetailPanel from "@/components/panels/AssetDetailPanel";
import AssetFormModal from "@/components/modals/AssetFormModal";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";

// Demo data

const getAssetIcon = (type: string) => {
  switch (type) {
    case "server":
      return Server;
    case "workstation":
      return Monitor;
    case "firewall":
    case "router":
    case "switch":
      return Router;
    default:
      return HardDrive;
  }
};

const getCriticalityColor = (criticality: string) => {
  switch (criticality) {
    case "critical":
      return "severity-critical";
    case "high":
      return "severity-high";
    case "medium":
      return "severity-medium";
    case "low":
      return "severity-low";
    default:
      return "";
  }
};

const getEnvironmentColor = (env: string) => {
  switch (env) {
    case "production":
      return "bg-destructive/10 text-destructive border-destructive/30";
    case "staging":
      return "bg-warning/10 text-warning border-warning/30";
    case "development":
      return "bg-primary/10 text-primary border-primary/30";
    case "testing":
      return "bg-success/10 text-success border-success/30";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export default function Assets() {
  const [searchQuery, setSearchQuery] = useState("");
  const [environmentFilter, setEnvironmentFilter] = useState<string>("all");
  const [criticalityFilter, setCriticalityFilter] = useState<string>("all");
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any | null>(null);
  const navigate = useNavigate();

  const { activeWorkspace } = useWorkspace();

  const [assets, setAssets] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch assets for the active workspace
  const fetchAssets = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      let query = supabase.from('assets').select('*').order('hostname', { ascending: true }).limit(1000);
      if (activeWorkspace?.id) query = query.eq('workspace_id', activeWorkspace.id);
      const { data, error } = await query;
      if (error) throw error;
      setAssets(data || []);
    } catch (err: any) {
      console.error('Failed to load assets', err);
      setLoadError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [activeWorkspace?.id]);

  // Use [] only before the first fetch (assets === null).
  // If `assets` is an empty array after a fetch, show the empty state instead
  // rather than falling back to demo data.
  const sourceAssets = assets === null ? [] : assets;

  const filteredAssets = sourceAssets.filter((asset) => {
    const matchesSearch =
      asset.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.ip_address.includes(searchQuery) ||
      asset.os.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEnv = environmentFilter === "all" || asset.environment === environmentFilter;
    const matchesCrit = criticalityFilter === "all" || asset.criticality === criticalityFilter;
    return matchesSearch && matchesEnv && matchesCrit;
  });

  const exportToCSV = () => {
    if (!filteredAssets.length) return;
    
    const headers = ["Hostname", "IP Address", "MAC Address", "OS", "Asset Type", "Owner", "Location", "Environment", "Criticality", "Last Seen"];
    const csvContent = [
      headers.join(","),
      ...filteredAssets.map(asset => [
        `"${asset.hostname || ''}"`,
        `"${asset.ip_address || ''}"`,
        `"${asset.mac_address || ''}"`,
        `"${asset.os || ''}"`,
        `"${asset.asset_type || ''}"`,
        `"${asset.owner || ''}"`,
        `"${asset.location || ''}"`,
        `"${asset.environment || ''}"`,
        `"${asset.criticality || ''}"`,
        `"${asset.last_seen || ''}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `assets_export_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Assets exported to CSV");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Assets</h1>
          <p className="text-muted-foreground">Manage your IT infrastructure inventory</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            setSearchQuery("");
            setEnvironmentFilter("all");
            setCriticalityFilter("all");
            toast.success("Filters cleared");
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset Filters
          </Button>
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by hostname, IP, or OS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Environments</SelectItem>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="testing">Testing</SelectItem>
              </SelectContent>
            </Select>
            <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Criticality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Criticality</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assets Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {filteredAssets.length} Asset{filteredAssets.length !== 1 ? "s" : ""}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="table-header">
                  <TableHead className="w-[250px]">Hostname</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>OS</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>Criticality</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <p>Loading assets…</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Server className="h-8 w-8 opacity-50" />
                        <p>No assets found</p>
                        <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add your first asset
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssets.map((asset) => {
                    const Icon = getAssetIcon(asset.asset_type);
                    // Safe last_seen parsing
                    let lastSeenDisplay = "-";
                    try {
                      if (asset.last_seen) {
                        const d = asset.last_seen instanceof Date ? asset.last_seen : new Date(asset.last_seen);
                        if (!isNaN(d.getTime())) lastSeenDisplay = format(d, "MMM d, h:mm a");
                      }
                    } catch (e) {
                      lastSeenDisplay = "-";
                    }

                    return (
                      <TableRow
                        key={asset.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setSelectedAsset(asset);
                          setDetailOpen(true);
                        }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-muted">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{asset.hostname}</p>
                              <p className="text-xs text-muted-foreground">{asset.owner}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{asset.ip_address}</TableCell>
                        <TableCell className="text-sm">{asset.os}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${getEnvironmentColor(asset.environment)}`}>
                            {asset.environment}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${getCriticalityColor(asset.criticality)}`}>
                            {asset.criticality}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{lastSeenDisplay}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { setSelectedAsset(asset); setDetailOpen(true); }}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setEditingAsset(asset); setFormOpen(true); }}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={async (e) => {
                                    e.stopPropagation();
                                    const ok = window.confirm('Delete asset "' + asset.hostname + '"?');
                                    if (!ok) return;
                                    try {
                                      const { error } = await supabase.from('assets').delete().eq('id', asset.id);
                                      if (error) throw error;
                                      toast.success('Asset deleted');
                                      fetchAssets();
                                    } catch (err: any) {
                                      console.error('Failed to delete asset', err);
                                      toast.error(err.message || String(err));
                                    }
                                  }}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Panel */}
      <AssetDetailPanel
        asset={selectedAsset}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={(a) => {
          setEditingAsset(a);
          setFormOpen(true);
          setDetailOpen(false);
        }}
      />

      {/* Form Modal */}
      <AssetFormModal
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingAsset(null);
        }}
        asset={editingAsset}
        onSaved={() => fetchAssets()}
      />
    </div>
  );
}
