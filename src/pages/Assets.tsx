import { useEffect, useState } from "react";
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
} from "lucide-react";
import { format } from "date-fns";
import AssetDetailPanel from "@/components/panels/AssetDetailPanel";
import AssetFormModal from "@/components/modals/AssetFormModal";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";

// Demo data
const demoAssets = [
  {
    id: "1",
    hostname: "dc01.corp.local",
    ip_address: "10.0.1.10",
    mac_address: "00:1A:2B:3C:4D:5E",
    os: "Windows Server 2022",
    asset_type: "server",
    owner: "IT Infrastructure",
    location: "DC1 - Rack A3",
    environment: "production",
    criticality: "critical",
    tags: ["domain-controller", "active-directory"],
    last_seen: new Date(),
    notes: "Primary domain controller",
  },
  {
    id: "2",
    hostname: "webserver-prod-01",
    ip_address: "10.0.2.20",
    mac_address: "00:1A:2B:3C:4D:5F",
    os: "Ubuntu 22.04 LTS",
    asset_type: "server",
    owner: "DevOps",
    location: "DC1 - Rack B2",
    environment: "production",
    criticality: "high",
    tags: ["web", "nginx", "frontend"],
    last_seen: new Date(),
    notes: "Primary web server",
  },
  {
    id: "3",
    hostname: "fw-edge-01",
    ip_address: "10.0.0.1",
    mac_address: "00:1A:2B:3C:4D:60",
    os: "Palo Alto PAN-OS 11.0",
    asset_type: "firewall",
    owner: "Network Security",
    location: "DC1 - Rack A1",
    environment: "production",
    criticality: "critical",
    tags: ["firewall", "perimeter", "ngfw"],
    last_seen: new Date(),
    notes: "Edge firewall",
  },
  {
    id: "4",
    hostname: "db-prod-mysql-01",
    ip_address: "10.0.3.30",
    mac_address: "00:1A:2B:3C:4D:61",
    os: "Ubuntu 22.04 LTS",
    asset_type: "server",
    owner: "DBA Team",
    location: "DC1 - Rack C1",
    environment: "production",
    criticality: "critical",
    tags: ["database", "mysql", "primary"],
    last_seen: new Date(),
    notes: "Primary MySQL database",
  },
  {
    id: "5",
    hostname: "dev-workstation-001",
    ip_address: "10.10.1.50",
    mac_address: "00:1A:2B:3C:4D:62",
    os: "macOS Sonoma 14.2",
    asset_type: "workstation",
    owner: "John Smith",
    location: "Office - Floor 3",
    environment: "development",
    criticality: "low",
    tags: ["developer", "macos"],
    last_seen: new Date(Date.now() - 1000 * 60 * 60 * 2),
    notes: "Developer workstation",
  },
  {
    id: "6",
    hostname: "vpn-gateway-01",
    ip_address: "10.0.0.5",
    mac_address: "00:1A:2B:3C:4D:63",
    os: "OpenVPN Access Server",
    asset_type: "appliance",
    owner: "Network Security",
    location: "DC1 - Rack A2",
    environment: "production",
    criticality: "high",
    tags: ["vpn", "remote-access"],
    last_seen: new Date(),
    notes: "Corporate VPN gateway",
  },
];

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
  const [selectedAsset, setSelectedAsset] = useState<typeof demoAssets[0] | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any | null>(null);

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
      if (activeWorkspace?.id) query = query.eq('workspace_id', activeWorkspace.id as any);
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

  // Use demoAssets only before the first fetch (assets === null).
  // If `assets` is an empty array after a fetch, show the empty state instead
  // rather than falling back to demo data.
  const sourceAssets = assets === null ? demoAssets : assets;

  const filteredAssets = sourceAssets.filter((asset) => {
    const matchesSearch =
      asset.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.ip_address.includes(searchQuery) ||
      asset.os.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEnv = environmentFilter === "all" || asset.environment === environmentFilter;
    const matchesCrit = criticalityFilter === "all" || asset.criticality === criticalityFilter;
    return matchesSearch && matchesEnv && matchesCrit;
  });

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
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
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
