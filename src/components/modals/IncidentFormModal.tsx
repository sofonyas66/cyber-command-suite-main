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
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";

interface IncidentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export default function IncidentFormModal({
  open,
  onOpenChange,
  onSaved,
}: IncidentFormModalProps) {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    severity: "medium",
    status: "open",
    description: "",
    tags: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Sign in to create incidents");
      return;
    }
    if (!activeWorkspace?.id) {
      toast.error("No workspace selected");
      return;
    }
    setLoading(true);
    try {
      const incidentNumber =
        "INC-" + Date.now().toString(36).toUpperCase();
      const payload: any = {
        user_id: user.id,
        workspace_id: activeWorkspace.id,
        title: form.title,
        incident_number: incidentNumber,
        severity: form.severity,
        status: form.status,
        description: form.description || null,
        tags: form.tags
          ? form.tags
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        opened_at: new Date().toISOString(),
        timeline: [
          {
            timestamp: new Date().toISOString(),
            action: "Incident Created",
            description: form.description || "Incident created via form",
            actor: user.email || user.id,
          },
        ],
        artifacts: [],
        post_incident_checklist: [],
      };
      const { data, error } = await supabase
        .from("incidents")
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error("Insert returned no row");
      toast.success("Incident created");
      onOpenChange(false);
      setForm({ title: "", severity: "medium", status: "open", description: "", tags: "" });
      onSaved?.();
    } catch (err: any) {
      console.error("Create incident failed", err);
      toast.error(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Incident</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Suspicious login attempts"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select
                value={form.severity}
                onValueChange={(v) => setForm({ ...form, severity: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="contained">Contained</SelectItem>
                  <SelectItem value="eradicated">Eradicated</SelectItem>
                  <SelectItem value="recovered">Recovered</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="phishing, email, ir"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Create Incident"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
