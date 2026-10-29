import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Network, Globe, Shield, Router, Building, Layers, MapPin, RefreshCw, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toast } from "sonner";
import SiteFormModal from "@/components/modals/SiteFormModal";

// Demo data



const getZoneColor = (zone: string) => {
  switch (zone.toLowerCase()) {
    case "internal":
      return "bg-success/10 text-success border-success/30";
    case "dmz":
      return "bg-warning/10 text-warning border-warning/30";
    case "guest":
      return "bg-muted text-muted-foreground border-muted";
    case "management":
      return "bg-primary/10 text-primary border-primary/30";
    case "servers":
      return "bg-destructive/10 text-destructive border-destructive/30";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export default function Networks() {
  const [searchQuery, setSearchQuery] = useState("");
  const [siteFilter, setSiteFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("subnets");
  const [siteModalOpen, setSiteModalOpen] = useState(false);
  const { activeWorkspace } = useWorkspace();

  const [sites, setSites] = useState<any[] | null>(null);
  const [networks, setNetworks] = useState<any[] | null>(null);
  const [vlans, setVlans] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [sitesError, setSitesError] = useState<string | null>(null);
  const [networksError, setNetworksError] = useState<string | null>(null);
  const [vlansError, setVlansError] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setSitesError(null);
    setNetworksError(null);
    setVlansError(null);
    try {
      // Fetch sites
      let sitesQuery = supabase.from('sites').select('id, name, address, description, created_at').limit(1000);
      if (activeWorkspace?.id) sitesQuery = sitesQuery.eq('workspace_id', activeWorkspace.id as any);
      const { data: sData, error: sErr } = await sitesQuery;
      if (sErr) throw sErr;
      setSites(sData || []);
    } catch (err: any) {
      console.error('Failed to load sites', err);
      setSitesError(err.message || String(err));
      toast.error(`Failed to load sites: ${err.message || String(err)}`);
      setSites([]);
    }

    try {
      // Fetch networks
      let netQuery = supabase.from('networks').select('id, name, cidr, vlan_id, firewall_zone, gateway, description, dns_servers, routing_notes, tags, created_at, site_id').limit(1000);
      if (activeWorkspace?.id) netQuery = netQuery.eq('workspace_id', activeWorkspace.id as any);
      const { data: nData, error: nErr } = await netQuery;
      if (nErr) throw nErr;
      setNetworks(nData || []);
    } catch (err: any) {
      console.error('Failed to load networks', err);
      setNetworksError(err.message || String(err));
      toast.error(`Failed to load networks: ${err.message || String(err)}`);
      setNetworks([]);
    }

    try {
      // Fetch vlans
      let vlanQuery = supabase.from('vlans').select('id, vlan_id, name, description, network_id, site_id, created_at').limit(1000);
      if (activeWorkspace?.id) vlanQuery = vlanQuery.eq('workspace_id', activeWorkspace.id as any);
      const { data: vData, error: vErr } = await vlanQuery;
      if (vErr) throw vErr;
      setVlans(vData || []);
    } catch (err: any) {
      console.error('Failed to load vlans', err);
      setVlansError(err.message || String(err));
      toast.error(`Failed to load VLANs: ${err.message || String(err)}`);
      setVlans([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, [activeWorkspace?.id]);

  const sourceNetworks = networks === null ? [] : networks || [];
  const sourceVlans = vlans === null ? [] : vlans || [];
  const sourceSites = sites === null ? [] : sites || [];

  const filteredNetworks = sourceNetworks.filter((network) => {
    const matchesSearch = network.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      network.cidr.includes(searchQuery) ||
      network.firewall_zone.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSite = siteFilter === "all" || network.site === siteFilter;
    const matchesZone = zoneFilter === "all" || network.firewall_zone.toLowerCase() === zoneFilter.toLowerCase();
    return matchesSearch && matchesSite && matchesZone;
  });

  const filteredVlans = sourceVlans.filter((vlan) => {
    const matchesSearch = vlan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vlan.vlan_id.toString().includes(searchQuery);
    const matchesSite = siteFilter === "all" || vlan.site === siteFilter;
    return matchesSearch && matchesSite;
  });

  const filteredSites = sourceSites.filter((site) =>
    site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    site.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const uniqueZones = [...new Set(sourceNetworks.map((n: any) => n.firewall_zone))];
  const uniqueSites = [...new Set(sourceSites.map((s: any) => s.name))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Networks</h1>
          <p className="text-muted-foreground">Manage sites, subnets, VLANs, and network topology</p>
        </div>
        <Button size="sm" disabled title="Coming soon">
          <Plus className="h-4 w-4 mr-2" />
          Add Network
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{sourceSites.length}</p>
              <p className="text-xs text-muted-foreground">Sites</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <Network className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{sourceNetworks.length}</p>
              <p className="text-xs text-muted-foreground">Subnets</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <Layers className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{sourceVlans.length}</p>
              <p className="text-xs text-muted-foreground">VLANs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <Shield className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{uniqueZones.length}</p>
              <p className="text-xs text-muted-foreground">Firewall Zones</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search networks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={siteFilter} onValueChange={setSiteFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by site" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sites</SelectItem>
            {uniqueSites.map((site) => (
              <SelectItem key={site} value={site}>{site}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={zoneFilter} onValueChange={setZoneFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by zone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            {uniqueZones.map((zone) => (
              <SelectItem key={zone} value={zone}>{zone}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sites" className="gap-2">
            <Building className="h-4 w-4" />
            Sites
          </TabsTrigger>
          <TabsTrigger value="subnets" className="gap-2">
            <Network className="h-4 w-4" />
            Subnets
          </TabsTrigger>
          <TabsTrigger value="vlans" className="gap-2">
            <Layers className="h-4 w-4" />
            VLANs
          </TabsTrigger>
        </TabsList>

        {/* Sites Tab */}
        <TabsContent value="sites" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-0">
              <CardTitle className="text-lg">Sites</CardTitle>
              <Button size="sm" onClick={() => setSiteModalOpen(true)} disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                Add Site
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {sitesError && !loading && (
                <div className="p-6 text-center">
                  <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
                  <p className="text-destructive font-medium mb-2">Failed to load sites</p>
                  <p className="text-sm text-muted-foreground mb-4">{sitesError}</p>
                  <Button onClick={fetchAll} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              )}
              {!sitesError && (
                filteredSites.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="table-header">
                        <TableHead>Site Name</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Networks</TableHead>
                        <TableHead>Assets</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSites.map((site) => (
                        <TableRow key={site.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Building className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{site.name}</p>
                                <p className="text-xs text-muted-foreground">{site.description}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {site.address}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{site.network_count} networks</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{site.asset_count} assets</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-12 text-center">
                    <Building className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-lg font-medium text-muted-foreground mb-2">No sites yet</p>
                    <p className="text-sm text-muted-foreground mb-6">
                      Create your first site to organize networks and assets by physical location.
                    </p>
                    <Button onClick={() => setSiteModalOpen(true)} disabled={loading}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add your first site
                    </Button>
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subnets Tab */}
        <TabsContent value="subnets" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {networksError && !loading && (
                <div className="p-6 text-center">
                  <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
                  <p className="text-destructive font-medium mb-2">Failed to load networks</p>
                  <p className="text-sm text-muted-foreground mb-4">{networksError}</p>
                  <Button onClick={fetchAll} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              )}
              {!networksError && (
                <Table>
                  <TableHeader>
                    <TableRow className="table-header">
                      <TableHead>Network Name</TableHead>
                      <TableHead>CIDR</TableHead>
                      <TableHead>VLAN ID</TableHead>
                      <TableHead>Firewall Zone</TableHead>
                      <TableHead>Site</TableHead>
                      <TableHead>Assets</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNetworks.map((network) => (
                      <TableRow key={network.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <div>
                            <p className="font-medium">{network.name}</p>
                            <p className="text-xs text-muted-foreground">{network.description}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{network.cidr}</TableCell>
                        <TableCell className="font-mono text-sm">{network.vlan_id}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${getZoneColor(network.firewall_zone)}`}>
                            {network.firewall_zone}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{network.site}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {network.asset_count} assets
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* VLANs Tab */}
        <TabsContent value="vlans" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {vlansError && !loading && (
                <div className="p-6 text-center">
                  <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
                  <p className="text-destructive font-medium mb-2">Failed to load VLANs</p>
                  <p className="text-sm text-muted-foreground mb-4">{vlansError}</p>
                  <Button onClick={fetchAll} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              )}
              {!vlansError && (
                <Table>
                  <TableHeader>
                    <TableRow className="table-header">
                      <TableHead>VLAN ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Network</TableHead>
                      <TableHead>Site</TableHead>
                      <TableHead>Assets</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVlans.map((vlan) => (
                      <TableRow key={vlan.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            VLAN {vlan.vlan_id}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{vlan.name}</p>
                            <p className="text-xs text-muted-foreground">{vlan.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{vlan.network}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{vlan.site}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {vlan.asset_count} assets
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Network Map Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Network Topology</CardTitle>
          <CardDescription>Visual representation of your network infrastructure</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center border-2 border-dashed border-border">
            <div className="text-center text-muted-foreground">
              <Network className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Interactive Network Map</p>
              <p className="text-sm">Coming soon - visual topology based on your assets and subnets</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <SiteFormModal
        open={siteModalOpen}
        onOpenChange={setSiteModalOpen}
        onSaved={fetchAll}
      />
    </div>
  );
}