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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Shield,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toast } from "sonner";

const demoIncidents = [
  {
    id: "1",
    incident_number: "INC-2024-0042",
    title: "Suspicious Login Attempts from Unknown Location",
    severity: "high",
    status: "investigating",
    affected_assets: 3,
    opened_at: new Date(Date.now() - 1000 * 60 * 60 * 4),
    assigned_to: "Security Team",
  },
  {
    id: "2",
    incident_number: "INC-2024-0041",
    title: "Potential Data Exfiltration via DNS Tunneling",
    severity: "critical",
    status: "contained",
    affected_assets: 1,
    opened_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    assigned_to: "IR Team",
  },
  {
    id: "3",
    incident_number: "INC-2024-0040",
    title: "Phishing Campaign Targeting Finance Department",
    severity: "medium",
    status: "eradicated",
    affected_assets: 12,
    opened_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    assigned_to: "Security Team",
  },
  {
    id: "4",
    incident_number: "INC-2024-0039",
    title: "Unauthorized Software Installation",
    severity: "low",
    status: "closed",
    affected_assets: 1,
    opened_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
    assigned_to: "IT Support",
  },
  {
    id: "5",
    incident_number: "INC-2024-0038",
    title: "Ransomware Attempt Blocked by EDR",
    severity: "critical",
    status: "recovered",
    affected_assets: 5,
    opened_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
    assigned_to: "IR Team",
  },
];

const getSeverityBadge = (severity: string) => {
  const styles: Record<string, string> = {
    critical: "severity-critical",
    high: "severity-high",
    medium: "severity-medium",
    low: "severity-low",
  };
  return styles[severity] || "";
};

const getStatusConfig = (status: string) => {
  const config: Record<string, { color: string; icon: React.ElementType; label: string }> = {
    open: { color: "bg-destructive/10 text-destructive border-destructive/30", icon: AlertTriangle, label: "Open" },
    investigating: { color: "bg-warning/10 text-warning border-warning/30", icon: PlayCircle, label: "Investigating" },
    contained: { color: "bg-primary/10 text-primary border-primary/30", icon: Shield, label: "Contained" },
    eradicated: { color: "bg-chart-1/10 text-chart-1 border-chart-1/30", icon: XCircle, label: "Eradicated" },
    recovered: { color: "bg-success/10 text-success border-success/30", icon: CheckCircle2, label: "Recovered" },
    closed: { color: "bg-muted text-muted-foreground border-muted", icon: CheckCircle2, label: "Closed" },
  };
  return config[status] || config.open;
};

export default function Incidents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { activeWorkspace } = useWorkspace();

  const [incidents, setIncidents] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from('incidents')
        .select('id, incident_number, title, severity, status, affected_assets, opened_at, assigned_to')
        .order('opened_at', { ascending: false })
        .limit(1000);
      if (activeWorkspace?.id) q = q.eq('workspace_id', activeWorkspace.id as any);
      const { data, error } = await q;
      if (error) throw error;
      setIncidents(data || []);
    } catch (err: any) {
      console.error('Failed to load incidents', err);
      setError(err.message || String(err));
      toast.error('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [activeWorkspace?.id]);

  const sourceIncidents = incidents === null ? demoIncidents : incidents;

  const filteredIncidents = sourceIncidents.filter((incident) => {
    const matchesSearch =
      incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.incident_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === "all" || incident.severity === severityFilter;
    const matchesStatus = statusFilter === "all" || incident.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const activeIncidents = sourceIncidents.filter(
    (i) => !["closed", "recovered"].includes(i.status)
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Incidents</h1>
          <p className="text-muted-foreground">Track and manage security incidents</p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Incident
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeIncidents}</p>
              <p className="text-xs text-muted-foreground">Active Incidents</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <PlayCircle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {demoIncidents.filter((i) => i.status === "investigating").length}
              </p>
              <p className="text-xs text-muted-foreground">Investigating</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {demoIncidents.filter((i) => i.status === "closed").length}
              </p>
              <p className="text-xs text-muted-foreground">Closed (30d)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">4.2h</p>
              <p className="text-xs text-muted-foreground">Avg. Response Time</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search incidents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="contained">Contained</SelectItem>
                <SelectItem value="eradicated">Eradicated</SelectItem>
                <SelectItem value="recovered">Recovered</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {filteredIncidents.length} Incident{filteredIncidents.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="table-header">
                  <TableHead>Incident</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assets</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead>Assigned To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidents.map((incident) => {
                  const statusConfig = getStatusConfig(incident.status);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <TableRow key={incident.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <p className="font-mono text-xs text-muted-foreground">{incident.incident_number}</p>
                          <p className="font-medium">{incident.title}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${getSeverityBadge(incident.severity)}`}>
                          {incident.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${statusConfig.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {incident.affected_assets} asset{incident.affected_assets !== 1 ? "s" : ""}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(incident.opened_at, "MMM d, h:mm a")}
                      </TableCell>
                      <TableCell className="text-sm">{incident.assigned_to}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
