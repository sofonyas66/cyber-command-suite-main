import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Server, ShieldAlert, AlertTriangle, BookOpen, Network, FileSearch, Radar } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuickAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const quickActions = [
  {
    icon: Server,
    label: "Asset",
    description: "Add a new device, server, or network equipment",
    path: "/assets",
    color: "text-primary",
  },
  {
    icon: Network,
    label: "Network",
    description: "Define a new subnet or VLAN",
    path: "/networks",
    color: "text-chart-2",
  },
  {
    icon: ShieldAlert,
    label: "Vulnerability",
    description: "Log a new security finding",
    path: "/vulnerabilities",
    color: "text-destructive",
  },
  {
    icon: Radar,
    label: "Detection",
    description: "Create a new detection rule",
    path: "/detections",
    color: "text-chart-1",
  },
  {
    icon: AlertTriangle,
    label: "Incident",
    description: "Create a new incident record",
    path: "/incidents",
    color: "text-warning",
  },
  {
    icon: BookOpen,
    label: "Runbook",
    description: "Create a new playbook or procedure",
    path: "/runbooks",
    color: "text-success",
  },
  {
    icon: FileSearch,
    label: "Log Query",
    description: "Save a new log query or snippet",
    path: "/logs",
    color: "text-chart-4",
  },
];

export default function QuickAddModal({ open, onOpenChange }: QuickAddModalProps) {
  const navigate = useNavigate();

  const handleSelect = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Quick Add</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-2 hover:border-primary/50 transition-all"
                onClick={() => handleSelect(action.path)}
              >
                <div className={`p-2 rounded-lg bg-muted ${action.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">{action.label}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {action.description}
                  </p>
                </div>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
