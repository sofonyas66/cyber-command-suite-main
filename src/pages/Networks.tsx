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
import { Search, Plus, Network, Globe, Shield, Router, Building, Layers, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toast } from "sonner";

// Demo data
const demoSites = [
  { id: "1", name: "HQ - New York", address: "123 Main St, New York, NY", description: "Main headquarters", network_count: 3, asset_count: 89 },
  { id: "2", name: "DC - Virginia", address: "456 Data Center Dr, Ashburn, VA", description: "Primary data center", network_count: 5, asset_count: 124 },
  { id: "3", name: "Branch - Chicago", address: "789 Branch Ave, Chicago, IL", description: "Chicago branch office", network_count: 2, asset_count: 32 },
];

const demoNetworks = [
  { id: "1", name: "Corporate LAN", cidr: "10.0.0.0/16", vlan_id: 100, firewall_zone: "Internal", gateway: "10.0.0.1", description: "Main corporate network", asset_count: 89, site: "HQ - New York" },
  { id: "2", name: "Server VLAN", cidr: "10.0.1.0/24", vlan_id: 110, firewall_zone: "Servers", gateway: "10.0.1.1", description: "Production servers", asset_count: 24, site: "DC - Virginia" },
  { id: "3", name: "DMZ", cidr: "192.168.100.0/24", vlan_id: 200, firewall_zone: "DMZ", gateway: "192.168.100.1", description: "Demilitarized zone for public services", asset_count: 8, site: "DC - Virginia" },
  { id: "4", name: "Guest WiFi", cidr: "172.16.0.0/22", vlan_id: 300, firewall_zone: "Guest", gateway: "172.16.0.1", description: "Guest wireless network", asset_count: 0, site: "HQ - New York" },
  { id: "5", name: "Management", cidr: "10.255.0.0/24", vlan_id: 999, firewall_zone: "Management", gateway: "10.255.0.1", description: "Network device management", asset_count: 35, site: "DC - Virginia" },
];

const demoVlans = [
  { id: "1", vlan_id: 100, name: "Corporate", description: "Corporate workstations", network: "Corporate LAN", site: "HQ - New York", asset_count: 89 },
  { id: "2", vlan_id: 110, name: "Servers", description: "Production servers", network: "Server VLAN", site: "DC - Virginia", asset_count: 24 },
  { id: "3", vlan_id: 200, name: "DMZ", description: "Public-facing services", network: "DMZ", site: "DC - Virginia", asset_count: 8 },
  { id: "4", vlan_id: 300, name: "Guest", description: "Guest network", network: "Guest WiFi", site: "HQ - New York", asset_count: 0 },
  { id: "5", vlan_id: 999, name: "Mgmt", description: "Management network", network: "Management", site: "DC - Virginia", asset_count: 35 },
];

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
  const { activeWorkspace } = useWorkspace();

  const [sites, setSites] = useState<any[] | null>(null);
  const [networks, setNetworks] = useState<any[] | null>(null);
  const [vlans, setVlans] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      // Only query networks table; demoSites and demoVlans remain as fallback
      let netQuery = supabase.from('networks').select('id, name, cidr, vlan_id, firewall_zone, gateway, description, dns_servers, routing_notes, tags, created_at').limit(1000);
      if (activeWorkspace?.id) netQuery = netQuery.eq('workspace_id', activeWorkspace.id as any);
      const { data: nData, error: nErr } = await netQuery;
      if (nErr) throw nErr;
      setNetworks(nData || []);
      // leave sites/vlans as demo fallbacks by keeping them null
    } catch (err: any) {
      console.error('Failed to load networks data', err);
      setError(err.message || String(err));
      toast.error('Failed to load networks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [activeWorkspace?.id]);

  const sourceNetworks = networks === null ? demoNetworks : networks;
  const sourceVlans = vlans === null ? demoVlans : vlans;
  const sourceSites = sites === null ? demoSites : sites;

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
        <Button size="sm">
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
            <CardContent className="p-0">
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subnets Tab */}
        <TabsContent value="subnets" className="mt-4">
          <Card>
            <CardContent className="p-0">
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* VLANs Tab */}
        <TabsContent value="vlans" className="mt-4">
          <Card>
            <CardContent className="p-0">
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
    </div>
  );
}
