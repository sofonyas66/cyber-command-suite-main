import { useState } from "react";
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
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

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
  timestamp: Date;
  notes?: string;
}

interface Change {
  id: string;
  change_number: string;
  change_type: ChangeType;
  title: string;
  description: string;
  risk_level: RiskLevel;
  impacted_assets: string[];
  impacted_networks: string[];
  planned_start: Date;
  planned_end: Date;
  rollback_plan: string;
  validation_steps: ValidationStep[];
  status: ChangeStatus;
  approver: string;
  evidence_links: string[];
  timeline: TimelineEvent[];
  created_at: Date;
}

// Demo data
const demoChanges: Change[] = [
  {
    id: "1",
    change_number: "CHG-00001",
    change_type: "Firewall",
    title: "Open port 443 for new web application",
    description: "Add firewall rule to allow HTTPS traffic from DMZ to internal web server cluster for the new customer portal application.",
    risk_level: "Medium",
    impacted_assets: ["web-server-01", "web-server-02", "lb-prod-01"],
    impacted_networks: ["DMZ", "Server VLAN"],
    planned_start: new Date(Date.now() + 86400000),
    planned_end: new Date(Date.now() + 90000000),
    rollback_plan: "Remove the newly added firewall rule and verify no traffic is passing through port 443 from DMZ.",
    validation_steps: [
      { id: "1", text: "Verify firewall rule is active", completed: false },
      { id: "2", text: "Test connectivity from DMZ to web servers", completed: false },
      { id: "3", text: "Verify SSL certificate is valid", completed: false },
      { id: "4", text: "Confirm no unauthorized access attempts", completed: false },
    ],
    status: "Approved",
    approver: "John Smith",
    evidence_links: ["https://jira.example.com/CHG-001"],
    timeline: [
      { id: "1", action: "Created", user: "Alice Johnson", timestamp: new Date(Date.now() - 172800000) },
      { id: "2", action: "Submitted for Review", user: "Alice Johnson", timestamp: new Date(Date.now() - 86400000) },
      { id: "3", action: "Approved", user: "John Smith", timestamp: new Date(Date.now() - 3600000), notes: "Approved after security review" },
    ],
    created_at: new Date(Date.now() - 172800000),
  },
{
  id: "2",
  change_number: "CHG-00002",
  change_type: "Routing",
  title: "Add static route for new branch office",
  description: "Configure static route on core router to direct traffic to the new Chicago branch office via VPN tunnel.",
  risk_level: "Low",
  impacted_assets: ["core-router-01"],
  impacted_networks: ["Corporate LAN", "Management"],
  planned_start: new Date(Date.now() + 172800000),
  planned_end: new Date(Date.now() + 180000000),
  rollback_plan: "Remove static route configuration and verify traffic flow returns to default path.",
  validation_steps: [
    { id: "1", text: "Verify route is in routing table", completed: false },
    { id: "2", text: "Test ping to branch office", completed: false },
    { id: "3", text: "Verify VPN tunnel is up", completed: false },
  ],
  status: "Review",
  approver: "",
  evidence_links: [],
  timeline: [
    { id: "1", action: "Created", user: "Bob Wilson", timestamp: new Date(Date.now() - 86400000) },
    { id: "2", action: "Submitted for Review", user: "Bob Wilson", timestamp: new Date(Date.now() - 43200000) },
  ],
  created_at: new Date(Date.now() - 86400000),
},
{
  id: "3",
  change_number: "CHG-00003",
  change_type: "VPN",
  title: "Update VPN encryption to AES-256",
  description: "Upgrade site-to-site VPN encryption from AES-128 to AES-256-GCM for enhanced security compliance.",
  risk_level: "High",
  impacted_assets: ["fw-primary", "fw-secondary", "vpn-concentrator"],
  impacted_networks: ["Corporate LAN", "DMZ", "Server VLAN"],
  planned_start: new Date(Date.now() - 86400000),
  planned_end: new Date(Date.now() - 82800000),
  rollback_plan: "Revert encryption settings to AES-128 and re-establish VPN tunnels.",
  validation_steps: [
    { id: "1", text: "Verify VPN tunnel is established", completed: true },
    { id: "2", text: "Confirm encryption is AES-256-GCM", completed: true },
    { id: "3", text: "Test data transfer speeds", completed: true },
    { id: "4", text: "Verify compliance scan passes", completed: false },
  ],
  status: "Verified",
  approver: "Sarah Chen",
  evidence_links: ["https://jira.example.com/CHG-003", "https://confluence.example.com/vpn-upgrade"],
  timeline: [
    { id: "1", action: "Created", user: "Mike Davis", timestamp: new Date(Date.now() - 604800000) },
    { id: "2", action: "Approved", user: "Sarah Chen", timestamp: new Date(Date.now() - 259200000) },
    { id: "3", action: "Implemented", user: "Mike Davis", timestamp: new Date(Date.now() - 86400000) },
    { id: "4", action: "Verification Started", user: "QA Team", timestamp: new Date(Date.now() - 43200000) },
  ],
  created_at: new Date(Date.now() - 604800000),
},
{
  id: "4",
  change_number: "CHG-00004",
  change_type: "DNS",
  title: "Add DNS record for new monitoring service",
  description: "Create A record for prometheus.internal.company.com pointing to monitoring server.",
  risk_level: "Low",
  impacted_assets: ["dns-primary", "dns-secondary"],
  impacted_networks: ["Management"],
  planned_start: new Date(Date.now() - 172800000),
  planned_end: new Date(Date.now() - 169200000),
  rollback_plan: "Remove the A record from DNS zones.",
  validation_steps: [
    { id: "1", text: "Verify DNS record resolves", completed: true },
    { id: "2", text: "Test access to monitoring UI", completed: true },
  ],
  status: "Closed",
  approver: "John Smith",
  evidence_links: [],
  timeline: [
    { id: "1", action: "Created", user: "Alice Johnson", timestamp: new Date(Date.now() - 259200000) },
    { id: "2", action: "Approved", user: "John Smith", timestamp: new Date(Date.now() - 216000000) },
    { id: "3", action: "Implemented", user: "Alice Johnson", timestamp: new Date(Date.now() - 172800000) },
    { id: "4", action: "Verified", user: "Alice Johnson", timestamp: new Date(Date.now() - 86400000) },
    { id: "5", action: "Closed", user: "Alice Johnson", timestamp: new Date(Date.now() - 43200000) },
  ],
  created_at: new Date(Date.now() - 259200000),
},
];

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

  const filteredChanges = demoChanges.filter((change) => {
    const matchesSearch = change.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    change.change_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || change.status === statusFilter;
    const matchesType = typeFilter === "all" || change.change_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const openChanges = demoChanges.filter(c => !["Closed", "Verified"].includes(c.status)).length;
  const pendingApproval = demoChanges.filter(c => c.status === "Review").length;
  const implementedToday = demoChanges.filter(c =>
  c.status === "Implemented" &&
  c.timeline.some(t => t.action === "Implemented" && new Date(t.timestamp).toDateString() === new Date().toDateString())
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
    <Button size="sm">
    <Plus className="h-4 w-4 mr-2" />
    New Change Request
    </Button>
    </div>

    {/* Stats Cards */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <Card className="card-hover">
    <CardContent className="p-4 flex items-center gap-3">
    <div className="p-2 rounded-lg bg-primary/10">
    <GitBranch className="h-5 w-5 text-primary" />
    </div>
    <div>
    <p className="text-2xl font-bold">{demoChanges.length}</p>
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
        {format(change.planned_start, "MMM d, yyyy")}
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
      <p className="text-sm">{format(selectedChange.planned_start, "PPpp")}</p>
      </div>
      <div>
      <p className="text-xs text-muted-foreground">Planned End</p>
      <p className="text-sm">{format(selectedChange.planned_end, "PPpp")}</p>
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
      <p className="text-xs text-muted-foreground">Impacted Assets</p>
      <div className="flex flex-wrap gap-1 mt-1">
      {selectedChange.impacted_assets.map((asset) => (
        <Badge key={asset} variant="secondary" className="text-xs">
        {asset}
        </Badge>
      ))}
      </div>
      </div>
      <div>
      <p className="text-xs text-muted-foreground">Impacted Networks</p>
      <div className="flex flex-wrap gap-1 mt-1">
      {selectedChange.impacted_networks.map((network) => (
        <Badge key={network} variant="outline" className="text-xs">
        {network}
        </Badge>
      ))}
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
      {selectedChange.validation_steps.map((step) => (
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
      {selectedChange.rollback_plan}
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
      {selectedChange.timeline.map((event, index) => (
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
        {formatDistanceToNow(event.timestamp, { addSuffix: true })}
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
      <Button variant="outline" onClick={() => setDetailOpen(false)}>
      Close
      </Button>
      {selectedChange.status === "Draft" && (
        <Button>Submit for Review</Button>
      )}
      {selectedChange.status === "Review" && (
        <Button className="bg-success hover:bg-success/90">Approve</Button>
      )}
      {selectedChange.status === "Approved" && (
        <Button>Mark as Implemented</Button>
      )}
      {selectedChange.status === "Implemented" && (
        <Button className="bg-success hover:bg-success/90">Verify</Button>
      )}
      </div>
      </div>
      </>
    )}
    </DialogContent>
    </Dialog>
    </div>
  );
}
