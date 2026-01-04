import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Copy,
  ExternalLink,
  Clock,
  User,
  Calendar,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

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

interface DetectionDetailPanelProps {
  detection: Detection | null;
  onClose: () => void;
}

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

export default function DetectionDetailPanel({
  detection,
  onClose,
}: DetectionDetailPanelProps) {
  const copyQuery = () => {
    if (detection) {
      navigator.clipboard.writeText(detection.query_text);
      toast.success("Query copied to clipboard");
    }
  };

  return (
    <Sheet open={!!detection} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {detection && (
          <>
            <SheetHeader className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <SheetTitle className="text-xl">{detection.name}</SheetTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="gap-1">
                      {getPlatformIcon(detection.platform)} {detection.platform}
                    </Badge>
                    <Badge className={getSeverityColor(detection.severity)}>
                      {detection.severity}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Enabled</span>
                  <Switch checked={detection.enabled} />
                </div>
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Query */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">Detection Query</h3>
                  <Button variant="ghost" size="sm" onClick={copyQuery}>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                  <code className="text-foreground whitespace-pre-wrap break-all">
                    {detection.query_text}
                  </code>
                </div>
              </div>

              <Separator />

              {/* MITRE ATT&CK */}
              <div>
                <h3 className="text-sm font-medium mb-3">MITRE ATT&CK Techniques</h3>
                <div className="flex flex-wrap gap-2">
                  {detection.mitre_techniques.map((tech) => (
                    <Badge
                      key={tech}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      {tech}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Data Sources */}
              <div>
                <h3 className="text-sm font-medium mb-3">Data Sources</h3>
                <div className="flex flex-wrap gap-2">
                  {detection.data_sources.map((source) => (
                    <Badge key={source} variant="outline">
                      {source}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs">Schedule</span>
                  </div>
                  <p className="font-mono text-sm">{detection.schedule}</p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs">FP Rate</span>
                  </div>
                  <p className="font-medium">{detection.false_positive_rate}%</p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Activity className="h-4 w-4" />
                    <span className="text-xs">Last Fired</span>
                  </div>
                  <p className="text-sm">
                    {detection.last_fired_at
                      ? new Date(detection.last_fired_at).toLocaleString()
                      : "Never"}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <User className="h-4 w-4" />
                    <span className="text-xs">Owner</span>
                  </div>
                  <p className="text-sm">{detection.owner}</p>
                </div>
              </div>

              {/* Notes */}
              {detection.notes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium mb-2">Notes</h3>
                    <p className="text-sm text-muted-foreground">{detection.notes}</p>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
