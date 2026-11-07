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
  MoreVertical,
  Trash2,
} from "lucide-react";
import { differenceInDays } from "date-fns";
import { VulnImportWizard } from "@/components/modals/VulnImportWizard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ConfirmDeleteDialog from "@/components/modals/ConfirmDeleteDialog";
import { getErrorMessage } from "@/lib/errors";
import { Database } from "@/integrations/supabase/types";

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

interface Vulnerability {
  id: string;
  title: string;
  cve_id: string | null;
  cvss_score: number | null;
  severity: Database["public"]["Enums"]["vuln_severity"];
  status: Database["public"]["Enums"]["vuln_status"];
  description: string | null;
  created_at: string | null;
  sla_due_date: string | null;
  source: string | null;
}

export default function Vulnerabilities() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForAsset, setCreateForAsset] = useState<string | null>(null);
  const [focusedVulnId, setFocusedVulnId] = useState<string | null>(null);
  const [editVuln, setEditVuln] = useState<Database["public"]["Tables"]["vulnerabilities"]["Row"] | null>(null);
  const [deleteVuln, setDeleteVuln] = useState<Vulnerability | null>(null);
  const [deleteCounts, setDeleteCounts] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [vulnsLoading, setVulnsLoading] = useState(false);
  const { activeWorkspace, canDelete } = useWorkspace();

  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[] | null>(null);
  const [vulnsError, setVulnsError] = useState<string | null>(null);

  const fetchVulns = async () => {
    setVulnsLoading(true);
    setVulnsError(null);
    try {
      let q = supabase
        .from('vulnerabilities')
        .select('id, title, cve_id, cvss_score, severity, status, description, created_at, sla_due_date, source')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (activeWorkspace?.id) q = q.eq('workspace_id', activeWorkspace.id);
      const { data, error } = await q;
      if (error) throw error;
      setVulnerabilities(data || []);
    } catch (err: unknown) {
      console.error('Failed to load vulnerabilities', err);
      setVulnsError(err instanceof Error ? err.message : String(err));
      toast.error(`Failed to load vulnerabilities: ${err instanceof Error ? err.message : String(err)}`);
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

  const handleDelete = async () => {
    if (!deleteVuln) return;

    setDeleting(true);
    try {
      // Fetch vuln_assets count
      const { count: vulnAssetsCount, error: countErr } = await supabase
        .from('vuln_assets')
        .select('*', { count: 'exact', head: true })
        .eq('vulnerability_id', deleteVuln.id);

      if (countErr) {
        setDeleteCounts(null);
      } else {
        setDeleteCounts(vulnAssetsCount);
      }

      const { data, error } = await supabase
        .from('vulnerabilities')
        .delete()
        .eq('id', deleteVuln.id)
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        toast.error("Delete failed or not permitted");
        return;
      }

      toast.success('Vulnerability deleted');
      setDeleteVuln(null);
      fetchVulns();
    } catch (err: unknown) {
      console.error('Delete vuln failed', err);
      toast.error(getErrorMessage(err) || "Delete failed or not permitted");
    } finally {
      setDeleting(false);
    }
  };

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
          <Button size="sm" onClick={() => { setCreateForAsset(null); setEditVuln(null); setCreateOpen(true); }}>
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
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
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
                <SelectItem value="false_positive">False Positive</SelectItem>
              </SelectContent>
            </Select>
            {canDelete && (
              <Button variant="ghost" size="sm" onClick={() => toast.info("Bulk delete not implemented")}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {vulnsError && (
        <Card>
          <CardContent className="p-4">
            <p className="text-destructive">{vulnsError}</p>
          </CardContent>
        </Card>
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
                {/* TODO: affected_assets count from vuln_assets join table (follow-up) */}
                <TableHead>SLA Due</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="w-[50px]"></TableHead>
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <span className="text-muted-foreground text-sm">{vuln.source || "—"}</span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={async () => {
                              const { data, error } = await supabase.from('vulnerabilities').select('*').eq('id', vuln.id).maybeSingle();
                              if (error || !data) {
                                toast.error(getErrorMessage(error) || 'Failed to load vulnerability');
                                return;
                              }
                              setEditVuln(data);
                              setCreateOpen(true);
                            }}>
                            Edit
                          </DropdownMenuItem>
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={async () => {
                                  setDeleteVuln(vuln);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <VulnFormModal
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) setEditVuln(null);
        }}
        initialAssetId={createForAsset}
        onSaved={() => { fetchVulns(); }}
        vulnerability={editVuln}
      />

      <ConfirmDeleteDialog
        open={!!deleteVuln}
        onOpenChange={(o) => { if (!o) setDeleteVuln(null); }}
        title="Delete Vulnerability"
        description={deleteVuln ? (deleteCounts !== null
          ? `This permanently deletes ${deleteVuln.title}. ${deleteCounts} asset links will be removed. The assets themselves are not deleted.`
          : `This permanently deletes ${deleteVuln.title}. Asset links will be removed. The assets themselves are not deleted.`
        ) : undefined}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}