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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Radar,
  Activity,
  Shield,
  AlertTriangle,
  Copy,
} from "lucide-react";
import DetectionFormModal from "@/components/modals/DetectionFormModal";
import DetectionDetailPanel from "@/components/panels/DetectionDetailPanel";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";

interface Detection {
  id: string;
  name: string;
  platform: string;
  query_text: string;
  schedule: string;
  enabled: boolean;
  severity: string;
  mitre_techniques: string[];
  data_sources: string[];
  owner: string;
  notes: string;
  last_fired_at: string | null;
  false_positive_rate: number;
}

const demoDetections: Detection[] = [
  {
    id: "1",
    name: "Suspicious PowerShell Execution",
    platform: "Splunk",
    query_text: 'index=windows EventCode=4688 NewProcessName="*powershell.exe" | where CommandLine LIKE "%encoded%"',
    schedule: "*/5 * * * *",
    enabled: true,
    severity: "high",
    mitre_techniques: ["T1059.001", "T1086"],
    data_sources: ["Windows Event Logs", "Sysmon"],
    owner: "Security Team",
    notes: "Detects encoded PowerShell commands often used in malicious scripts",
    last_fired_at: "2024-12-18T14:30:00Z",
    false_positive_rate: 12.5,
  },
  {
    id: "2",
    name: "Brute Force Login Attempts",
    platform: "Elastic",
    query_text: 'event.action:"authentication_failure" | stats count by source.ip | where count > 10',
    schedule: "*/10 * * * *",
    enabled: true,
    severity: "medium",
    mitre_techniques: ["T1110.001"],
    data_sources: ["Authentication Logs"],
    owner: "SOC Analyst",
    notes: "Monitors for multiple failed login attempts from single IP",
    last_fired_at: "2024-12-19T08:15:00Z",
    false_positive_rate: 8.2,
  },
  {
    id: "3",
    name: "Lateral Movement Detection",
    platform: "Microsoft",
    query_text: "SecurityEvent | where EventID == 4648 | where TargetServerName != ComputerName",
    schedule: "0 * * * *",
    enabled: true,
    severity: "critical",
    mitre_techniques: ["T1021", "T1550"],
    data_sources: ["Windows Security Logs"],
    owner: "Threat Hunter",
    notes: "Identifies potential lateral movement using explicit credentials",
    last_fired_at: null,
    false_positive_rate: 5.0,
  },
  {
    id: "4",
    name: "Outbound C2 Communication",
    platform: "Splunk",
    query_text: 'index=firewall action=allowed dest_port IN (4444, 5555, 8443) | rare dest_ip',
    schedule: "*/15 * * * *",
    enabled: false,
    severity: "critical",
    mitre_techniques: ["T1071", "T1573"],
    data_sources: ["Firewall Logs", "Proxy Logs"],
    owner: "Security Team",
    notes: "Detects connections to known C2 ports",
    last_fired_at: "2024-12-15T22:00:00Z",
    false_positive_rate: 3.1,
  },
  {
    id: "5",
    name: "Privilege Escalation Attempt",
    platform: "Elastic",
    query_text: 'process.name:("sudo" OR "su") AND user.name:* NOT user.name:"root"',
    schedule: "*/5 * * * *",
    enabled: true,
    severity: "high",
    mitre_techniques: ["T1548", "T1068"],
    data_sources: ["Linux Audit Logs"],
    owner: "Linux Admin",
    notes: "Monitors privilege escalation commands",
    last_fired_at: "2024-12-19T10:45:00Z",
    false_positive_rate: 25.0,
  },
];

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical":
      return "severity-critical";
    case "high":
      return "severity-high";
    case "medium":
      return "severity-medium";
    case "low":
      return "severity-low";
    default:
      return "severity-info";
  }
};

const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case "Splunk":
      return "🔍";
    case "Elastic":
      return "⚡";
    case "Microsoft":
      return "🛡️";
    default:
      return "📊";
  }
};

export default function Detections() {
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [selectedDetection, setSelectedDetection] = useState<Detection | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { activeWorkspace } = useWorkspace();

  const [detections, setDetections] = useState<Detection[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetections = async () => {
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from('detections')
        .select('id, name, platform, query_text, schedule, enabled, severity, mitre_techniques, data_sources, owner, notes, last_fired_at, false_positive_rate')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (activeWorkspace?.id) q = q.eq('workspace_id', activeWorkspace.id as any);
      const { data, error } = await q;
      if (error) throw error;
      setDetections((data as any) || []);
    } catch (err: any) {
      console.error('Failed to load detections', err);
      setError(err.message || String(err));
      toast.error('Failed to load detections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetections();
  }, [activeWorkspace?.id]);

  const sourceDetections = detections === null ? demoDetections : detections;

  const filteredDetections = sourceDetections.filter((detection) => {
    const matchesSearch =
      detection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      detection.query_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      detection.mitre_techniques.some((t) =>
        t.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesPlatform =
      platformFilter === "all" || detection.platform === platformFilter;
    const matchesSeverity =
      severityFilter === "all" || detection.severity === severityFilter;
    return matchesSearch && matchesPlatform && matchesSeverity;
  });

  const toggleEnabled = async (id: string) => {
    // optimistic update for UI
    if (detections === null) {
      setDetections((prev: any) =>
        (prev || demoDetections).map((d: any) => (d.id === id ? { ...d, enabled: !d.enabled } : d))
      );
      toast.success("Detection status updated");
      return;
    }

    const prev = detections;
    setDetections((prevList) =>
      prevList?.map((d) => (d.id === id ? { ...d, enabled: !d.enabled } : d)) || []
    );

    try {
      const target = prev.find((p) => p.id === id);
      const newEnabled = !target?.enabled;
      const { error } = await supabase.from('detections').update({ enabled: newEnabled }).eq('id', id);
      if (error) throw error;
      toast.success('Detection status updated');
    } catch (err: any) {
      console.error('Failed to update detection', err);
      setDetections(prev);
      toast.error('Failed to update detection');
    }
  };

  const copyQuery = (query: string) => {
    navigator.clipboard.writeText(query);
    toast.success("Query copied to clipboard");
  };

  const stats = {
    total: sourceDetections.length,
    enabled: sourceDetections.filter((d) => d.enabled).length,
    critical: sourceDetections.filter((d) => d.severity === "critical").length,
    uniqueTechniques: [...new Set(sourceDetections.flatMap((d) => d.mitre_techniques))].length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Detections</h1>
          <p className="text-muted-foreground">
            Manage SIEM detection rules and analytics
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Detection
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Detections</p>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-primary/10">
                <Radar className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Rules</p>
                <p className="text-3xl font-bold mt-1">{stats.enabled}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-success/10">
                <Activity className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical Rules</p>
                <p className="text-3xl font-bold mt-1">{stats.critical}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">MITRE Techniques</p>
                <p className="text-3xl font-bold mt-1">{stats.uniqueTechniques}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-chart-1/10">
                <Shield className="h-5 w-5 text-chart-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search detections, queries, MITRE techniques..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="Splunk">Splunk</SelectItem>
                <SelectItem value="Elastic">Elastic</SelectItem>
                <SelectItem value="Microsoft">Microsoft</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Detections Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            Detection Rules ({filteredDetections.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Platform</TableHead>
                <TableHead className="hidden lg:table-cell">MITRE</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead className="hidden xl:table-cell">FP Rate</TableHead>
                <TableHead className="hidden lg:table-cell">Last Fired</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDetections.map((detection) => (
                <TableRow
                  key={detection.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedDetection(detection)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={detection.enabled}
                      onCheckedChange={() => toggleEnabled(detection.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{detection.name}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate max-w-[300px]">
                        {detection.query_text}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className="gap-1">
                      <span>{getPlatformIcon(detection.platform)}</span>
                      {detection.platform}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {detection.mitre_techniques.slice(0, 2).map((tech) => (
                        <Badge key={tech} variant="secondary" className="text-xs">
                          {tech}
                        </Badge>
                      ))}
                      {detection.mitre_techniques.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{detection.mitre_techniques.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getSeverityColor(detection.severity)}>
                      {detection.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <span
                      className={`text-sm ${
                        detection.false_positive_rate > 20
                          ? "text-warning"
                          : detection.false_positive_rate > 10
                          ? "text-muted-foreground"
                          : "text-success"
                      }`}
                    >
                      {detection.false_positive_rate}%
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {detection.last_fired_at
                      ? new Date(detection.last_fired_at).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setSelectedDetection(detection)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => copyQuery(detection.query_text)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Query
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredDetections.length === 0 && (
            <div className="text-center py-12">
              <Radar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No detections found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsFormOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add your first detection
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Panel */}
      <DetectionDetailPanel
        detection={selectedDetection}
        onClose={() => setSelectedDetection(null)}
      />

      {/* Form Modal */}
      <DetectionFormModal open={isFormOpen} onOpenChange={setIsFormOpen} />
    </div>
  );
}
