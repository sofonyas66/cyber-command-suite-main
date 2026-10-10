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
  RefreshCw,
} from "lucide-react";
import { differenceInDays } from "date-fns";
import { VulnImportWizard } from "@/components/modals/VulnImportWizard";


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
      toast.error(`Failed to load vulnerabilities: ${err.message || String(err)}`);
      setVulnerabilities([]);
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
  }, [searchParams, activeWorkspace?.id]);

  const sourceVulns = vulnerabilities === null ? [] : vulnerabilities || [];

  const filteredVulns = sourceVulns.filter((vuln) => {
    const matchesSearch =
      vuln.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vuln.cve_id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === "all" || vuln.severity === severityFilter;
    const matchesStatus = statusFilter === "all" || vuln.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const stats = {
    critical: sourceVulns.filter((v) => v.severity === "critical" && v.status !== "mitigated").length,
    high: sourceVulns.filter((v) => v.severity === "high" && v.status !== "mitigated").length,
    medium: sourceVulns.filter((v) => v.severity === "medium" && v.status !== "mitigated").length,
    low: sourceVulns.filter((v) => v.severity === "low" && v.status !== "mitigated").length,
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
            fetchVulns();
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
          {vulnsError && !vulnsLoading && (
            <div className="p-6 text-center">
              <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
              <p className="text-destructive font-medium mb-2">Failed to load vulnerabilities</p>
              <p className="text-sm text-muted-foreground mb-4">{vulnsError}</p>
              <Button onClick={fetchVulns} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          )}
          {!vulnsError && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="table-header">
                    <TableHead className="w-[300px]">Vulnerability</TableHead>
                    <TableHead>CVSS</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    {/* TODO: Assets column removed for now; asset counts must come from a count of vuln_assets join table (follow-up) */}
                    <TableHead>SLA Due</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVulns.map((vuln) => {
                    const statusConfig = getStatusBadge(vuln.status);
                    const StatusIcon = statusConfig.icon;
                    const parsedDueDate = vuln.sla_due_date ? new Date(vuln.sla_due_date) : null;
                    const daysUntilDue = parsedDueDate && !isNaN(parsedDueDate.getTime())
                      ? differenceInDays(parsedDueDate, new Date())
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
                          <span className="font-mono font-medium">
                            {vuln.cvss_score != null ? vuln.cvss_score.toFixed(1) : "—"}
                          </span>
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
                        {/* TODO: affected_assets count from vuln_assets join table (follow-up) */}
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
          )}
        </CardContent>
      </Card>
      <VulnFormModal open={createOpen} onOpenChange={(o) => setCreateOpen(o)} initialAssetId={createForAsset} onSaved={() => { fetchVulns(); }} />
    </div>
  );
}