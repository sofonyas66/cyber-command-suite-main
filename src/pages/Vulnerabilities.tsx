import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import VulnFormModal from "@/components/modals/VulnFormModal";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toast } from "sonner";
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
  Upload,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import { differenceInDays } from "date-fns";
import { VulnImportWizard } from "@/components/modals/VulnImportWizard";

const demoVulnerabilities = [
  {
    id: "1",
    title: "Remote Code Execution in Log4j",
    cve_id: "CVE-2021-44228",
    cvss_score: 10.0,
    severity: "critical",
    status: "in_progress",
    affected_assets: 5,
    first_detected: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    sla_due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
    source: "Nessus",
  },
  {
    id: "2",
    title: "SQL Injection in Login Form",
    cve_id: null,
    cvss_score: 9.8,
    severity: "critical",
    status: "new",
    affected_assets: 2,
    first_detected: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
    sla_due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
    source: "Pentest",
  },
  {
    id: "3",
    title: "OpenSSL Heartbleed Vulnerability",
    cve_id: "CVE-2014-0160",
    cvss_score: 7.5,
    severity: "high",
    status: "mitigated",
    affected_assets: 0,
    first_detected: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    sla_due_date: null,
    source: "Qualys",
  },
  {
    id: "4",
    title: "Missing Security Headers",
    cve_id: null,
    cvss_score: 5.3,
    severity: "medium",
    status: "triage",
    affected_assets: 12,
    first_detected: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    sla_due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
    source: "Burp Suite",
  },
  {
    id: "5",
    title: "Outdated jQuery Version",
    cve_id: "CVE-2020-11023",
    cvss_score: 6.1,
    severity: "medium",
    status: "accepted",
    affected_assets: 8,
    first_detected: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60),
    sla_due_date: null,
    source: "Dependency Scan",
  },
  {
    id: "6",
    title: "TLS 1.0 Still Enabled",
    cve_id: null,
    cvss_score: 3.7,
    severity: "low",
    status: "new",
    affected_assets: 3,
    first_detected: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    sla_due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    source: "SSL Labs",
  },
];

const getSeverityBadge = (severity: string) => {
  const styles: Record<string, string> = {
    critical: "severity-critical",
    high: "severity-high",
    medium: "severity-medium",
    low: "severity-low",
    informational: "severity-info",
  };
  return styles[severity] || "";
};

const getStatusBadge = (status: string) => {
  const config: Record<string, { color: string; icon: React.ElementType }> = {
    new: { color: "bg-primary/10 text-primary border-primary/30", icon: AlertTriangle },
    triage: { color: "bg-warning/10 text-warning border-warning/30", icon: Clock },
    in_progress: { color: "bg-chart-1/10 text-chart-1 border-chart-1/30", icon: Clock },
    mitigated: { color: "bg-success/10 text-success border-success/30", icon: CheckCircle2 },
    accepted: { color: "bg-muted text-muted-foreground border-muted", icon: CheckCircle2 },
    false_positive: { color: "bg-muted text-muted-foreground border-muted", icon: CheckCircle2 },
  };
  return config[status] || config.new;
};

export default function Vulnerabilities() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForAsset, setCreateForAsset] = useState<string | null>(null);
  const [focusedVulnId, setFocusedVulnId] = useState<string | null>(null);
  const { activeWorkspace } = useWorkspace();

  const [vulnerabilities, setVulnerabilities] = useState<any[] | null>(null);
  const [vulnsLoading, setVulnsLoading] = useState(false);
  const [vulnsError, setVulnsError] = useState<string | null>(null);

  const fetchVulns = async () => {
    setVulnsLoading(true);
    setVulnsError(null);
    try {
      let q = supabase
        .from('vulnerabilities')
        .select('id, title, cve_id, cvss_score, severity, status, created_at, sla_due_date, source')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (activeWorkspace?.id) q = q.eq('workspace_id', activeWorkspace.id as any);
      const { data, error } = await q;
      if (error) throw error;
      setVulnerabilities(data || []);
    } catch (err: any) {
      console.error('Failed to load vulnerabilities', err);
      setVulnsError(err.message || String(err));
      toast.error('Failed to load vulnerabilities');
    } finally {
      setVulnsLoading(false);
    }
  };

  useEffect(() => {
    const v = searchParams.get('v');
    const newFor = searchParams.get('new_for_asset');
    if (v) setFocusedVulnId(v);
    if (newFor) {
      setCreateForAsset(newFor);
      setCreateOpen(true);
    }
    // initial load
    fetchVulns();
  }, [searchParams]);

  const sourceVulns = vulnerabilities === null ? demoVulnerabilities : vulnerabilities;

  const filteredVulns = sourceVulns.filter((vuln) => {
    const matchesSearch =
      vuln.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vuln.cve_id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === "all" || vuln.severity === severityFilter;
    const matchesStatus = statusFilter === "all" || vuln.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const stats = {
    critical: demoVulnerabilities.filter((v) => v.severity === "critical" && v.status !== "mitigated").length,
    high: demoVulnerabilities.filter((v) => v.severity === "high" && v.status !== "mitigated").length,
    medium: demoVulnerabilities.filter((v) => v.severity === "medium" && v.status !== "mitigated").length,
    low: demoVulnerabilities.filter((v) => v.severity === "low" && v.status !== "mitigated").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Vulnerabilities</h1>
          <p className="text-muted-foreground">Track and manage security findings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportWizardOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button size="sm" onClick={() => { setCreateForAsset(null); setCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Finding
          </Button>
        </div>

        <VulnImportWizard
          open={importWizardOpen}
          onOpenChange={setImportWizardOpen}
          onImportComplete={() => {
            // TODO: Refresh vulnerabilities list
          }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover border-l-4 border-l-destructive">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-destructive">{stats.critical}</p>
                <p className="text-sm text-muted-foreground">Critical</p>
              </div>
              <ShieldAlert className="h-8 w-8 text-destructive/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover border-l-4" style={{ borderLeftColor: "hsl(25, 95%, 53%)" }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold" style={{ color: "hsl(25, 95%, 53%)" }}>{stats.high}</p>
                <p className="text-sm text-muted-foreground">High</p>
              </div>
              <ShieldAlert className="h-8 w-8 opacity-30" style={{ color: "hsl(25, 95%, 53%)" }} />
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover border-l-4 border-l-warning">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-warning">{stats.medium}</p>
                <p className="text-sm text-muted-foreground">Medium</p>
              </div>
              <ShieldAlert className="h-8 w-8 text-warning/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover border-l-4 border-l-success">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-success">{stats.low}</p>
                <p className="text-sm text-muted-foreground">Low</p>
              </div>
              <ShieldAlert className="h-8 w-8 text-success/30" />
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
                placeholder="Search by title or CVE..."
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
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="triage">Triage</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="mitigated">Mitigated</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {filteredVulns.length} Vulnerabilit{filteredVulns.length !== 1 ? "ies" : "y"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="table-header">
                  <TableHead className="w-[300px]">Vulnerability</TableHead>
                  <TableHead>CVSS</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assets</TableHead>
                  <TableHead>SLA Due</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVulns.map((vuln) => {
                  const statusConfig = getStatusBadge(vuln.status);
                  const StatusIcon = statusConfig.icon;
                  const daysUntilDue = vuln.sla_due_date
                    ? differenceInDays(vuln.sla_due_date, new Date())
                    : null;

                  const isFocused = focusedVulnId === String(vuln.id);
                  return (
                    <TableRow key={vuln.id} className={"cursor-pointer " + (isFocused ? 'ring-2 ring-primary/40 bg-primary/5' : 'hover:bg-muted/50')}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{vuln.title}</p>
                          {vuln.cve_id && (
                            <a
                              href={`https://nvd.nist.gov/vuln/detail/${vuln.cve_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {vuln.cve_id}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-medium">{vuln.cvss_score.toFixed(1)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${getSeverityBadge(vuln.severity)}`}>
                          {vuln.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${statusConfig.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {vuln.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {vuln.affected_assets} asset{vuln.affected_assets !== 1 ? "s" : ""}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {daysUntilDue !== null ? (
                          <span
                            className={`text-sm ${
                              daysUntilDue < 0
                                ? "text-destructive font-medium"
                                : daysUntilDue <= 3
                                ? "text-warning"
                                : "text-muted-foreground"
                            }`}
                          >
                            {daysUntilDue < 0
                              ? `${Math.abs(daysUntilDue)}d overdue`
                              : daysUntilDue === 0
                              ? "Today"
                              : `${daysUntilDue}d`}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{vuln.source}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <VulnFormModal open={createOpen} onOpenChange={(o) => setCreateOpen(o)} initialAssetId={createForAsset} onSaved={() => { /* TODO: refresh list */ }} />
    </div>
  );
}
