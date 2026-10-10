import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";

interface DetectionFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export default function DetectionFormModal({
  open,
  onOpenChange,
  onSaved,
}: DetectionFormModalProps) {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    platform: "Splunk",
    query_text: "",
    schedule: "*/5 * * * *",
    enabled: true,
    severity: "medium",
    mitre_techniques: "",
    data_sources: "",
    owner: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Sign in to create detections");
      return;
    }
    if (!activeWorkspace?.id) {
      toast.error("No workspace selected");
      return;
    }
    setLoading(true);
    try {
      const payload: any = {
        user_id: user.id,
        workspace_id: activeWorkspace.id,
        name: formData.name,
        platform: formData.platform,
        query_text: formData.query_text || null,
        schedule: formData.schedule || null,
        enabled: formData.enabled,
        severity: formData.severity,
        mitre_techniques: formData.mitre_techniques
          ? formData.mitre_techniques
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        data_sources: formData.data_sources
          ? formData.data_sources
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        owner: formData.owner || null,
        notes: formData.notes || null,
        tags: [],
      };
      const { data, error } = await supabase
        .from("detections")
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error("Insert returned no row");
      toast.success("Detection created");
      onOpenChange(false);
      setFormData({
        name: "",
        platform: "Splunk",
        query_text: "",
        schedule: "*/5 * * * *",
        enabled: true,
        severity: "medium",
        mitre_techniques: "",
        data_sources: "",
        owner: "",
        notes: "",
      });
      onSaved?.();
    } catch (err: any) {
      console.error("Create detection failed", err);
      toast.error(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Detection Rule</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Detection Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Suspicious PowerShell Execution"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform">Platform *</Label>
              <Select
                value={formData.platform}
                onValueChange={(value) =>
                  setFormData({ ...formData, platform: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Splunk">🔍 Splunk</SelectItem>
                  <SelectItem value="Elastic">⚡ Elastic</SelectItem>
                  <SelectItem value="Microsoft">🛡️ Microsoft Sentinel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="query">Query Text *</Label>
            <Textarea
              id="query"
              value={formData.query_text}
              onChange={(e) =>
                setFormData({ ...formData, query_text: e.target.value })
              }
              placeholder="Enter your detection query..."
              className="font-mono min-h-[120px]"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select
                value={formData.severity}
                onValueChange={(value) =>
                  setFormData({ ...formData, severity: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="informational">Informational</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule">Schedule (Cron)</Label>
              <Input
                id="schedule"
                value={formData.schedule}
                onChange={(e) =>
                  setFormData({ ...formData, schedule: e.target.value })
                }
                placeholder="*/5 * * * *"
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner">Owner</Label>
              <Input
                id="owner"
                value={formData.owner}
                onChange={(e) =>
                  setFormData({ ...formData, owner: e.target.value })
                }
                placeholder="Team or individual"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mitre">MITRE Techniques (comma-separated)</Label>
              <Input
                id="mitre"
                value={formData.mitre_techniques}
                onChange={(e) =>
                  setFormData({ ...formData, mitre_techniques: e.target.value })
                }
                placeholder="T1059.001, T1086"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sources">Data Sources (comma-separated)</Label>
              <Input
                id="sources"
                value={formData.data_sources}
                onChange={(e) =>
                  setFormData({ ...formData, data_sources: e.target.value })
                }
                placeholder="Windows Event Logs, Sysmon"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Additional notes or context..."
              className="min-h-[80px]"
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-2">
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, enabled: checked })
                }
              />
              <Label htmlFor="enabled">Enable detection</Label>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Create Detection"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
