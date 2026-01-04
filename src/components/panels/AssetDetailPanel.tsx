import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Server,
  Monitor,
  Router,
  HardDrive,
  MapPin,
  User,
  Clock,
  Tag,
  Edit,
  ShieldAlert,
  Network,
  Plug,
  Globe,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";

interface AssetDetailPanelProps {
  asset: {
    id: string;
    hostname: string;
    ip_address: string;
    mac_address: string;
    os: string;
    asset_type: string;
    owner: string;
    location: string;
    environment: string;
    criticality: string;
    tags: string[] | string | null;
    last_seen?: Date | string | null;
    notes: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (asset: any) => void;
}

// No mock/demo data: prefer real asset fields; fall back to empty arrays.


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

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "up":
    case "open":
      return "bg-success/10 text-success border-success/30";
    case "down":
    case "closed":
      return "bg-destructive/10 text-destructive border-destructive/30";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export default function AssetDetailPanel({ asset, open, onOpenChange, onEdit }: AssetDetailPanelProps) {
  if (!asset) return null;

  const Icon = getAssetIcon(asset.asset_type);
  // Normalize tags to array
  const tagsArray: string[] = Array.isArray(asset.tags)
    ? asset.tags
    : typeof asset.tags === 'string' && asset.tags.length > 0
    ? asset.tags.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  // Safe last_seen formatting
  let lastSeenDisplay = null;
  try {
    if (asset.last_seen) {
      const d = asset.last_seen instanceof Date ? asset.last_seen : new Date(asset.last_seen as any);
      if (!isNaN(d.getTime())) lastSeenDisplay = formatDistanceToNow(d, { addSuffix: true });
    }
  } catch (e) {
    lastSeenDisplay = null;
  }

  const interfacesList = Array.isArray((asset as any).interfaces) ? (asset as any).interfaces : [];
  const portsList = Array.isArray((asset as any).ports) ? (asset as any).ports : [];

  const [vulnerabilities, setVulnerabilities] = useState<any[] | null>(null);
  const [vulnsLoading, setVulnsLoading] = useState(false);
  const [vulnsError, setVulnsError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const fetchVulns = async () => {
      if (!asset?.id) {
        setVulnerabilities(null);
        return;
      }
      setVulnsLoading(true);
      setVulnsError(null);
      try {
        // vulnerabilities are linked via vuln_assets join table
        // select the `vulnerabilities` relationship (PostgREST exposes the related table name)
        const { data, error } = await supabase
          .from('vuln_assets')
          .select('vulnerabilities(id, title, severity, status, created_at)')
          .eq('asset_id', asset.id)
          .limit(100);
        if (error) throw error;
        const vulns = (data || []).map((row: any) => row.vulnerabilities).filter(Boolean);
        if (mounted) setVulnerabilities(vulns);
      } catch (err: any) {
        console.error('Failed to load vulnerabilities for asset', err);
        if (mounted) setVulnsError(err.message || String(err));
      } finally {
        if (mounted) setVulnsLoading(false);
      }
    };

    fetchVulns();
    return () => { mounted = false };
  }, [asset?.id]);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-xl">{asset.hostname}</SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`text-xs ${getCriticalityColor(asset.criticality)}`}>
                  {asset.criticality}
                </Badge>
                <span className="text-sm text-muted-foreground capitalize">{asset.environment}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onEdit && onEdit(asset)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
              </Button>
              <Button size="sm" onClick={() => navigate(`/vulnerabilities?new_for_asset=${asset.id}`)}>
                <ShieldAlert className="h-4 w-4 mr-2" />
                Create Vulnerability
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* System Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Server className="h-4 w-4" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Operating System</p>
                <p className="text-sm">{asset.os}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Asset Type</p>
                <p className="text-sm capitalize">{asset.asset_type}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-sm">{asset.location}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Owner</p>
                <p className="text-sm">{asset.owner}</p>
              </div>
            </CardContent>
          </Card>

          {/* Interfaces Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Plug className="h-4 w-4" />
                Network Interfaces
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="table-header">
                    <TableHead className="text-xs">Interface</TableHead>
                    <TableHead className="text-xs">IP Address</TableHead>
                    <TableHead className="text-xs">MAC Address</TableHead>
                    <TableHead className="text-xs">VLAN</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interfacesList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                        No network interfaces available for this asset
                      </TableCell>
                    </TableRow>
                  ) : (
                    interfacesList.map((iface: any) => (
                      <TableRow key={iface.id}>
                        <TableCell className="font-mono text-xs">{iface.name}</TableCell>
                        <TableCell className="font-mono text-xs">{iface.ip_address}</TableCell>
                        <TableCell className="font-mono text-xs">{iface.mac_address}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{iface.vlan}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${getStatusColor(iface.status)}`}>
                            {iface.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Ports & Services Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Ports & Services
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="table-header">
                    <TableHead className="text-xs">Port</TableHead>
                    <TableHead className="text-xs">Protocol</TableHead>
                    <TableHead className="text-xs">Service</TableHead>
                    <TableHead className="text-xs">Version</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Last Seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {portsList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                        No open ports or services recorded for this asset
                      </TableCell>
                    </TableRow>
                  ) : (
                    portsList.map((ps: any) => {
                    let psLastSeen = '';
                    try {
                      if (ps.last_seen) {
                        const d = ps.last_seen instanceof Date ? ps.last_seen : new Date(ps.last_seen);
                        if (!isNaN(d.getTime())) psLastSeen = formatDistanceToNow(d, { addSuffix: true });
                      }
                    } catch (e) {
                      psLastSeen = '';
                    }
                    return (
                      <TableRow key={ps.id}>
                        <TableCell className="font-mono text-xs">{ps.port}</TableCell>
                        <TableCell className="font-mono text-xs uppercase">{ps.protocol}</TableCell>
                        <TableCell className="text-xs">{ps.service}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{ps.version}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${getStatusColor(ps.status)}`}>
                            {ps.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{psLastSeen}</TableCell>
                      </TableRow>
                    );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Tags */}
          <div>
            <p className="text-sm font-medium flex items-center gap-2 mb-2">
              <Tag className="h-4 w-4" />
              Tags
            </p>
            <div className="flex flex-wrap gap-2">
              {tagsArray.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Notes */}
          {asset.notes && (
            <div>
              <p className="text-sm font-medium mb-2">Notes</p>
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                {asset.notes}
              </p>
            </div>
          )}

          <Separator />

          {/* Related Vulnerabilities */}
          <div>
            <p className="text-sm font-medium flex items-center gap-2 mb-3">
              <ShieldAlert className="h-4 w-4" />
              Related Vulnerabilities
            </p>
            <div>
              {vulnsLoading ? (
                <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Loading vulnerabilities…
                </div>
              ) : vulnsError ? (
                <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-4">{vulnsError}</div>
              ) : (vulnerabilities && vulnerabilities.length > 0) ? (
                <Table>
                  <TableHeader>
                    <TableRow className="table-header">
                      <TableHead className="text-xs">ID</TableHead>
                      <TableHead className="text-xs">Title</TableHead>
                      <TableHead className="text-xs">Severity</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Reported</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vulnerabilities.map((v) => {
                      let reported = '';
                      try {
                        if (v.created_at) {
                          const d = v.created_at instanceof Date ? v.created_at : new Date(v.created_at);
                          if (!isNaN(d.getTime())) reported = formatDistanceToNow(d, { addSuffix: true });
                        }
                      } catch (e) {
                        reported = '';
                      }
                      return (
                        <TableRow key={v.id}>
                          <TableCell className="font-mono text-xs">{v.id}</TableCell>
                              <TableCell className="text-sm">
                                <Link to={`/vulnerabilities?v=${v.id}`} className="text-primary underline">{v.title}</Link>
                              </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${getCriticalityColor(v.severity)}`}>
                              {v.severity}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{v.status}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{reported}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4 text-center">
                  No vulnerabilities linked to this asset
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
