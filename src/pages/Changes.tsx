import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Plus,
  GitBranch,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Network,
  Router,
  Globe,
  Lock,
  Server,
  ArrowRight,
  Calendar,
  User,
  ExternalLink,
  RotateCcw,
  XCircle,
  Loader2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import ChangeFormModal from "@/components/modals/ChangeFormModal";

type ChangeType = "Firewall" | "ACL" | "Routing" | "VPN" | "Switch" | "DNS";
type ChangeStatus = "Draft" | "Review" | "Approved" | "Implemented" | "Verified" | "Closed";
type RiskLevel = "Low" | "Medium" | "High" | "Critical";

interface ValidationStep {
  id: string;
  text: string;
  completed: boolean;
}

interface TimelineEvent {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  notes?: string;
  from?: string;
  to?: string;
}

interface Change {
  id: string;
  change_number: string;
  change_type: ChangeType;
  title: string;
  description: string;
  risk_level: RiskLevel;
  impacted_asset_ids: string[];
  impacted_network_ids: string[];
  planned_start: string;
  planned_end: string;
  rollback_plan: string;
  validation_steps: ValidationStep[];
  status: ChangeStatus;
  approver: string;
  evidence_links: string[];
  timeline: TimelineEvent[];
  created_at: string;
}

const getTypeIcon = (type: ChangeType) => {
  switch (type) {
    case "Firewall": return Shield;
    case "ACL": return Lock;
    case "Routing": return Router;
    case "VPN": return Lock;
    case "Switch": return Network;
    case "DNS": return Globe;
    default: return Server;
  }
};

const getStatusColor = (status: ChangeStatus) => {
  switch (status) {
    case "Draft": return "bg-muted text-muted-foreground";
    case "Review": return "bg-warning/10 text-warning border-warning/30";
    case "Approved": return "bg-primary/10 text-primary border-primary/30";
    case "Implemented": return "bg-info/10 text-info border-info/30";
    case "Verified": return "bg-success/10 text-success border-success/30";
    case "Closed": return "bg-muted text-muted-foreground";
    default: return "";
  }
};

const getRiskColor = (risk: RiskLevel) => {
  switch (risk) {
    case "Critical": return "severity-critical";
    case "High": return "severity-high";
    case "Medium": return "severity-medium";
    case "Low": return "severity-low";
    default: return "";
  }
};

const statusOrder: ChangeStatus[] = ["Draft", "Review", "Approved", "Implemented", "Verified", "Closed"];

export default function Changes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedChange, setSelectedChange] = useState<Change | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [changeModalOpen, setChangeModalOpen] = useState(false);
  const [sendBackReason, setSendBackReason] = useState("");
  const [showSendBackDialog, setShowSendBackDialog] = useState(false);
  const { activeWorkspace } = useWorkspace();
  const { user } = useAuth();

  const [changes, setChanges] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transitionLoading, setTransitionLoading] = useState<string | null>(null);

  const fetchChanges = async () => {
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from('changes')
        .select('id, change_number, change_type, title, description, risk_level, impacted_asset_ids, impacted_network_ids, planned_start, planned_end, rollback_plan, status, approver, evidence_links, validation_steps, timeline, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (activeWorkspace?.id) q = q.eq('workspace_id', activeWorkspace.id as any);
      const { data, error } = await q;
      if (error) throw error;
      setChanges(data || []);
    } catch (err: any) {
      console.error('Failed to load changes', err);
      setError(err.message || String(err));
      toast.error('Failed to load changes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChanges();
  }, [activeWorkspace?.id]);

  const transitionChange = async (change: Change, nextStatus: ChangeStatus, options?: { notes?: string }) => {
    if (!user || !activeWorkspace?.id) {
      toast.error('User not authenticated or no workspace selected');
      return;
    }
    setTransitionLoading(change.id);
    try {
      const fromStatus = change.status;
      const timeline = Array.isArray(change.timeline) ? [...change.timeline] : [];
      const newEvent: TimelineEvent = {
        id: crypto.randomUUID(),
        action: nextStatus,
        from: fromStatus,
        to: nextStatus,
        user: user.email || user.id,
        timestamp: new Date().toISOString(),
        notes: options?.notes,
      };
      timeline.push(newEvent);

      const updatePayload: any = {
        status: nextStatus,
        timeline,
      };
      if (nextStatus === 'Approved') {
        updatePayload.approver = user.email || user.id;
        updatePayload.approved_at = new Date().toISOString();
      } else if (nextStatus === 'Implemented') {
        updatePayload.implemented_at = new Date().toISOString();
      } else if (nextStatus === 'Verified') {
        updatePayload.verified_at = new Date().toISOString();
      } else if (nextStatus === 'Closed') {
        updatePayload.closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('changes')
        .update(updatePayload)
        .eq('id', change.id)
        .eq('workspace_id', activeWorkspace.id);
      if (error) throw error;

      toast.success(`Change status updated to ${nextStatus}`);
      await fetchChanges();
      const updated = changes?.find(c => c.id === change.id);
      if (updated) setSelectedChange(updated);
    } catch (err: any) {
      console.error('Transition failed', err);
      toast.error(err.message || String(err));
    } finally {
      setTransitionLoading(null);
    }
  };

  const handleSendBack = () => {
    if (!sendBackReason.trim()) return;
    if (selectedChange) {
      transitionChange(selectedChange, 'Draft', { notes: `Sent back from Review: ${sendBackReason}` });
      setSendBackReason('');
      setShowSendBackDialog(false);
    }
  };

  const sourceChanges = changes === null ? [] : changes;

  const filteredChanges = sourceChanges.filter((change) => {
    const matchesSearch = change.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    change.change_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || change.status === statusFilter;
    const matchesType = typeFilter === "all" || change.change_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const openChanges = sourceChanges.filter(c => !["Closed", "Verified"].includes(c.status)).length;
  const pendingApproval = sourceChanges.filter(c => c.status === "Review").length;
  const implementedToday = sourceChanges.filter(c =>
  c.status === "Implemented" &&
  c.timeline?.some(t => t.action === "Implemented" && new Date(t.timestamp).toDateString() === new Date().toDateString())
  ).length;

  const getCompletedSteps = (steps: ValidationStep[]) => steps.filter(s => s.completed).length;
  const getStatusIndex = (status: ChangeStatus) => statusOrder.indexOf(status);

  return (
    <div className="space-y-6">
    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
    <h1 className="text-2xl font-bold">Change Control</h1>
    <p className="text-muted-foreground">Network and security change management workflow</p>
    </div>
    <Button size="sm" onClick={() => setChangeModalOpen(true)}>
    <Plus className="h-4 w-4 mr-2" />
    New Change Request
    </Button>
    {/* TODO: wire up ChangeFormModal (doesn't exist yet) */}
    </div>

    {/* Stats Cards */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <Card className="card-hover">
    <CardContent className="p-4 flex items-center gap-3">
    <div className="p-2 rounded-lg bg-primary/10">
    <GitBranch className="h-5 w-5 text-primary" />
    </div>
    <div>
    <p className="text-2xl font-bold">{sourceChanges.length}</p>
    <p className="text-xs text-muted-foreground">Total Changes</p>
    </div>
    </CardContent>
    </Card>
    <Card className="card-hover">
    <CardContent className="p-4 flex items-center gap-3">
    <div className="p-2 rounded-lg bg-warning/10">
    <Clock className="h-5 w-5 text-warning" />
    </div>
    <div>
    <p className="text-2xl font-bold">{openChanges}</p>
    <p className="text-xs text-muted-foreground">Open Changes</p>
    </div>
    </CardContent>
    </Card>
    <Card className="card-hover">
    <CardContent className="p-4 flex items-center gap-3">
    <div className="p-2 rounded-lg bg-info/10">
    <AlertCircle className="h-5 w-5 text-info" />
    </div>
    <div>
    <p className="text-2xl font-bold">{pendingApproval}</p>
    <p className="text-xs text-muted-foreground">Pending Approval</p>
    </div>
    </CardContent>
    </Card>
    <Card className="card-hover">
    <CardContent className="p-4 flex items-center gap-3">
    <div className="p-2 rounded-lg bg-success/10">
    <CheckCircle2 className="h-5 w-5 text-success" />
    </div>
    <div>
    <p className="text-2xl font-bold">{implementedToday}</p>
    <p className="text-xs text-muted-foreground">Implemented Today</p>
    </div>
    </CardContent>
    </Card>
    </div>

    {/* Filters */}
    <div className="flex flex-col sm:flex-row gap-4">
    <div className="relative flex-1 max-w-md">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
    placeholder="Search changes..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="pl-10"
    />
    </div>
    <Select value={statusFilter} onValueChange={setStatusFilter}>
    <SelectTrigger className="w-[150px]">
    <SelectValue placeholder="Status" />
    </SelectTrigger>
    <SelectContent>
    <SelectItem value="all">All Status</SelectItem>
    {statusOrder.map((status) => (
      <SelectItem key={status} value={status}>{status}</SelectItem>
    ))}
    </SelectContent>
    </Select>
    <Select value={typeFilter} onValueChange={setTypeFilter}>
    <SelectTrigger className="w-[150px]">
    <SelectValue placeholder="Type" />
    </SelectTrigger>
    <SelectContent>
    <SelectItem value="all">All Types</SelectItem>
    <SelectItem value="Firewall">Firewall</SelectItem>
    <SelectItem value="ACL">ACL</SelectItem>
    <SelectItem value="Routing">Routing</SelectItem>
    <SelectItem value="VPN">VPN</SelectItem>
    <SelectItem value="Switch">Switch</SelectItem>
    <SelectItem value="DNS">DNS</SelectItem>
    </SelectContent>
    </Select>
    </div>

    {/* Changes Table */}
    {filteredChanges.length === 0 && !loading && (
      <div className="py-12 text-center text-muted-foreground">
        <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">No change requests yet</p>
        <p className="text-sm">Create your first change request using the New Change Request button.</p>
      </div>
    )}
    {filteredChanges.length > 0 && (
    <Card>
    <CardContent className="p-0">
    <Table>
    <TableHeader>
    <TableRow className="table-header">
    <TableHead>Change</TableHead>
    <TableHead>Type</TableHead>
    <TableHead>Risk</TableHead>
    <TableHead>Status</TableHead>
    <TableHead>Planned Date</TableHead>
    <TableHead>Validation</TableHead>
    </TableRow>
    </TableHeader>
    <TableBody>
    {filteredChanges.map((change) => {
      const TypeIcon = getTypeIcon(change.change_type);
      const completedSteps = getCompletedSteps(change.validation_steps);
      const totalSteps = change.validation_steps.length;
      const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

      return (
        <TableRow
        key={change.id}
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => { setSelectedChange(change); setDetailOpen(true); }}
        >
        <TableCell>
        <div>
        <p className="font-mono text-xs text-muted-foreground">{change.change_number}</p>
        <p className="font-medium">{change.title}</p>
        </div>
        </TableCell>
        <TableCell>
        <div className="flex items-center gap-2">
        <TypeIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{change.change_type}</span>
        </div>
        </TableCell>
        <TableCell>
        <Badge variant="outline" className={`text-xs ${getRiskColor(change.risk_level)}`}>
        {change.risk_level}
        </Badge>
        </TableCell>
        <TableCell>
        <Badge variant="outline" className={`text-xs ${getStatusColor(change.status)}`}>
        {change.status}
        </Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {change.planned_start ? format(new Date(change.planned_start), "MMM d, yyyy") : "Not scheduled"}
          </div>
        </TableCell>
        <TableCell>
        <div className="flex items-center gap-2">
        <Progress value={progress} className="h-2 w-16" />
        <span className="text-xs text-muted-foreground">
        {completedSteps}/{totalSteps}
        </span>
        </div>
        </TableCell>
        </TableRow>
      );
    })}
    </TableBody>
    </Table>
    </CardContent>
    </Card>
    )}

    {/* Change Detail Dialog */}
    <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
    {selectedChange && (
      <>
      <DialogHeader>
      <div className="flex items-start gap-4">
      <div className="p-3 rounded-xl bg-primary/10">
      {(() => {
        const TypeIcon = getTypeIcon(selectedChange.change_type);
        return <TypeIcon className="h-6 w-6 text-primary" />;
      })()}
      </div>
      <div className="flex-1">
      <p className="font-mono text-xs text-muted-foreground">{selectedChange.change_number}</p>
      <DialogTitle className="text-xl">{selectedChange.title}</DialogTitle>
      <div className="flex items-center gap-2 mt-2">
      <Badge variant="outline" className={`text-xs ${getStatusColor(selectedChange.status)}`}>
      {selectedChange.status}
      </Badge>
      <Badge variant="outline" className={`text-xs ${getRiskColor(selectedChange.risk_level)}`}>
      {selectedChange.risk_level} Risk
      </Badge>
      <Badge variant="secondary" className="text-xs">
      {selectedChange.change_type}
      </Badge>
      </div>
      </div>
      </div>
      </DialogHeader>

      <div className="space-y-6 mt-4">
      {/* Workflow Progress */}
      <div>
      <p className="text-sm font-medium mb-3">Workflow Progress</p>
      <div className="flex items-center gap-1">
      {statusOrder.map((status, index) => {
        const currentIndex = getStatusIndex(selectedChange.status);
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={status} className="flex items-center flex-1">
          <div className={`
            flex items-center justify-center h-8 w-8 rounded-full text-xs font-medium
            ${isCompleted ? "bg-success text-success-foreground" :
              isCurrent ? "bg-primary text-primary-foreground" :
              "bg-muted text-muted-foreground"}
              `}>
              {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
              </div>
              {index < statusOrder.length - 1 && (
                <div className={`flex-1 h-1 mx-1 rounded ${
                  isCompleted ? "bg-success" : "bg-muted"
                }`} />
              )}
              </div>
        );
      })}
      </div>
      <div className="flex justify-between mt-1">
      {statusOrder.map((status) => (
        <p key={status} className="text-[10px] text-muted-foreground text-center flex-1">
        {status}
        </p>
      ))}
      </div>
      </div>

      <Separator />

      {/* Description */}
      <div>
      <p className="text-sm font-medium mb-2">Description</p>
      <p className="text-sm text-muted-foreground">{selectedChange.description}</p>
      </div>

      {/* Schedule & Impact */}
      <div className="grid grid-cols-2 gap-4">
      <Card>
      <CardHeader className="pb-2">
      <CardTitle className="text-sm flex items-center gap-2">
      <Calendar className="h-4 w-4" />
      Schedule
      </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
      <div>
      <p className="text-xs text-muted-foreground">Planned Start</p>
      <p className="text-sm">{selectedChange.planned_start ? format(new Date(selectedChange.planned_start), "PPpp") : "Not scheduled"}</p>
      </div>
      <div>
      <p className="text-xs text-muted-foreground">Planned End</p>
      <p className="text-sm">{selectedChange.planned_end ? format(new Date(selectedChange.planned_end), "PPpp") : "Not scheduled"}</p>
      </div>
      {selectedChange.approver && (
        <div>
        <p className="text-xs text-muted-foreground">Approver</p>
        <p className="text-sm">{selectedChange.approver}</p>
        </div>
      )}
      </CardContent>
      </Card>

      <Card>
      <CardHeader className="pb-2">
      <CardTitle className="text-sm flex items-center gap-2">
      <Network className="h-4 w-4" />
      Impact
      </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
      <div>
      <p className="text-xs text-muted-foreground">Impacted Asset IDs</p>
      <div className="flex flex-wrap gap-1 mt-1">
        {(selectedChange.impacted_asset_ids || []).length === 0 ? <span className="text-xs text-muted-foreground">None</span> : selectedChange.impacted_asset_ids?.map((asset) => (
        <Badge key={asset} variant="secondary" className="text-xs">
        {asset.slice(0, 8)}...
        </Badge>
      ))}
      </div>
      </div>
      <div>
      <p className="text-xs text-muted-foreground">Impacted Network IDs</p>
      <div className="flex flex-wrap gap-1 mt-1">
      {(selectedChange.impacted_network_ids || []).length === 0 ? <span className="text-xs text-muted-foreground italic">None</span> : selectedChange.impacted_network_ids.map((network) => (<Badge key={network} variant="outline" className="text-xs">{network.slice(0, 8)}...</Badge>))}
      </div>
      </div>
      </CardContent>
      </Card>
      </div>

      {/* Validation Checklist */}
      <Card>
      <CardHeader className="pb-2">
      <CardTitle className="text-sm flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4" />
      Validation Checklist
      </CardTitle>
      </CardHeader>
      <CardContent>
      <div className="space-y-2">
        {(selectedChange.validation_steps || []).length === 0 ? <p className="text-xs text-muted-foreground italic">None</p> : selectedChange.validation_steps.map((step) => (
        <div key={step.id} className="flex items-center gap-3">
        <Checkbox checked={step.completed} disabled />
        <span className={`text-sm ${step.completed ? "line-through text-muted-foreground" : ""}`}>
        {step.text}
        </span>
        </div>
      ))}
      </div>
      </CardContent>
      </Card>

      {/* Rollback Plan */}
      <div>
      <p className="text-sm font-medium mb-2 flex items-center gap-2">
      <AlertCircle className="h-4 w-4 text-warning" />
      Rollback Plan
      </p>
      <p className="text-sm text-muted-foreground bg-warning/5 border border-warning/20 rounded-lg p-3">
      {selectedChange.rollback_plan ? selectedChange.rollback_plan : "No rollback plan provided"}
      </p>
      </div>

      {/* Timeline */}
      <Card>
      <CardHeader className="pb-2">
      <CardTitle className="text-sm flex items-center gap-2">
      <Clock className="h-4 w-4" />
      Timeline
      </CardTitle>
      </CardHeader>
      <CardContent>
      <div className="space-y-4">
        {(selectedChange.timeline || []).length === 0 ? <p className="text-xs text-muted-foreground italic">No timeline events yet</p> : selectedChange.timeline.map((event, index) => (
      <div key={event.id} className="flex gap-4">
      <div className="flex flex-col items-center">
      <div className="h-3 w-3 rounded-full bg-primary" />
      {index < selectedChange.timeline.length - 1 && (
        <div className="w-0.5 flex-1 bg-border mt-1" />
      )}
      </div>
      <div className="flex-1 pb-4">
      <div className="flex items-center gap-2">
      <p className="text-sm font-medium">{event.action}</p>
      <span className="text-xs text-muted-foreground">
      {event.timestamp ? formatDistanceToNow(new Date(event.timestamp), { addSuffix: true }) : "—"}
      </span>
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
      <User className="h-3 w-3" />
      {event.user}
      </p>
      {event.notes && (
        <p className="text-xs text-muted-foreground mt-1 italic">{event.notes}</p>
      )}
      </div>
      </div>
      ))}
      </div>
      </CardContent>
      </Card>

      {/* Evidence Links */}
      {selectedChange.evidence_links.length > 0 && (
        <div>
        <p className="text-sm font-medium mb-2 flex items-center gap-2">
        <ExternalLink className="h-4 w-4" />
        Evidence Links
        </p>
        <div className="space-y-1">
        {selectedChange.evidence_links.map((link, index) => (
          <a
          key={index}
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline flex items-center gap-1"
          >
          {link}
          <ExternalLink className="h-3 w-3" />
          </a>
        ))}
        </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={() => setDetailOpen(false)} disabled={transitionLoading === selectedChange.id}>
      Close
      </Button>
      {selectedChange.status === "Draft" && (
        <Button
          onClick={() => transitionChange(selectedChange, "Review")}
          disabled={transitionLoading === selectedChange.id}
        >
          {transitionLoading === selectedChange.id ? (
            <> <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving... </>
          ) : (
            "Submit for Review"
          )}
        </Button>
      )}
      {selectedChange.status === "Review" && (
        <>
          <Button
            onClick={() => setShowSendBackDialog(true)}
            variant="outline"
            disabled={transitionLoading === selectedChange.id}
          >
            Send back to Draft
          </Button>
          <Button
            onClick={() => transitionChange(selectedChange, "Approved")}
            disabled={transitionLoading === selectedChange.id}
            className="bg-success hover:bg-success/90"
          >
            {transitionLoading === selectedChange.id ? (
              <> <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving... </>
            ) : (
              "Approve"
            )}
          </Button>
        </>
      )}
      {selectedChange.status === "Approved" && (
        <Button
          onClick={() => transitionChange(selectedChange, "Implemented")}
          disabled={transitionLoading === selectedChange.id}
        >
          {transitionLoading === selectedChange.id ? (
            <> <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving... </>
          ) : (
            "Mark as Implemented"
          )}
        </Button>
      )}
      {selectedChange.status === "Implemented" && (
        <Button
          onClick={() => transitionChange(selectedChange, "Verified")}
          disabled={transitionLoading === selectedChange.id}
          className="bg-success hover:bg-success/90"
        >
          {transitionLoading === selectedChange.id ? (
            <> <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving... </>
          ) : (
            "Verify"
          )}
        </Button>
      )}
      {selectedChange.status === "Verified" && (
        <Button
          onClick={() => transitionChange(selectedChange, "Closed")}
          disabled={transitionLoading === selectedChange.id}
        >
          {transitionLoading === selectedChange.id ? (
            <> <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving... </>
          ) : (
            "Close"
          )}
        </Button>
      )}
      </div>
      </div>
      </>
    )}
    </DialogContent>
    </Dialog>

    {showSendBackDialog && (
      <Dialog open={showSendBackDialog} onOpenChange={setShowSendBackDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Back to Draft</DialogTitle>
            <DialogDescription>Provide a reason for sending this change back to Draft.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="sendBackReason">Reason *</Label>
              <Textarea
                id="sendBackReason"
                value={sendBackReason}
                onChange={(e) => setSendBackReason(e.target.value)}
                rows={3}
                placeholder="Explain why this change should be sent back..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setSendBackReason(''); setShowSendBackDialog(false); }} disabled={transitionLoading === selectedChange?.id}>
                Cancel
              </Button>
              <Button onClick={handleSendBack} disabled={transitionLoading === selectedChange?.id || !sendBackReason.trim()}>
                {transitionLoading === selectedChange?.id ? (<> <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving... </>) : ("Send Back")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )}

    <ChangeFormModal open={changeModalOpen} onOpenChange={setChangeModalOpen} onSaved={fetchChanges} />
    </div>
  );
}

