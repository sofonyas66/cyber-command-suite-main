import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";

interface ChangeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export default function ChangeFormModal({ open, onOpenChange, onSaved }: ChangeFormModalProps) {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    change_type: "Firewall",
    title: "",
    description: "",
    risk_level: "Medium",
    planned_start: "",
    planned_end: "",
    rollback_plan: "",
    validation_steps: "",
    approver: "",
    evidence_links: "",
  });
  const [dateError, setDateError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Sign in to create change requests"); return; }
    if (!activeWorkspace?.id) { toast.error("No workspace selected"); return; }
    if (!form.change_type || !form.title.trim()) { toast.error("Change type and title are required"); return; }
    if (form.planned_start && form.planned_end) {
      const s = new Date(form.planned_start).getTime();
      const en = new Date(form.planned_end).getTime();
      if (en <= s) { setDateError("End must be after start"); return; }
    }
    setDateError("");
    setLoading(true);
    try {
      const payload: any = {
        user_id: user.id,
        workspace_id: activeWorkspace.id,
        change_type: form.change_type,
        title: form.title.trim(),
        description: form.description.trim() || null,
        risk_level: form.risk_level,
        status: "Draft",
        rollback_plan: form.rollback_plan.trim() || null,
        approver: form.approver.trim() || null,
        planned_start: form.planned_start ? new Date(form.planned_start).toISOString() : null,
        planned_end: form.planned_end ? new Date(form.planned_end).toISOString() : null,
        validation_steps: form.validation_steps
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .map((text, idx) => ({ id: String(idx + 1), text, completed: false })),
        evidence_links: form.evidence_links
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0),
        timeline: [{
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
          action: "Created",
          user: user.email || user.id,
          timestamp: new Date().toISOString(),
        }],
      };
      const links = payload.evidence_links as string[];
      for (const link of links) {
        if (!link.startsWith("http://") && !link.startsWith("https://")) {
          toast.error("Evidence links must start with http:// or https://");
          setLoading(false);
          return;
        }
      }
      const { error } = await supabase.from("changes").insert([payload]);
      if (error) throw error;
      toast.success("Change request created");
      onOpenChange(false);
      setForm({ change_type: "Firewall", title: "", description: "", risk_level: "Medium", planned_start: "", planned_end: "", rollback_plan: "", validation_steps: "", approver: "", evidence_links: "" });
      onSaved?.();
    } catch (err: any) {
      console.error("Create change failed", err);
      toast.error(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Change Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Change Type *</Label>
              <Select value={form.change_type} onValueChange={(v) => setForm({ ...form, change_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Firewall">Firewall</SelectItem>
                  <SelectItem value="ACL">ACL</SelectItem>
                  <SelectItem value="Routing">Routing</SelectItem>
                  <SelectItem value="VPN">VPN</SelectItem>
                  <SelectItem value="Switch">Switch</SelectItem>
                  <SelectItem value="DNS">DNS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="risk">Risk Level</Label>
              <Select value={form.risk_level} onValueChange={(v) => setForm({ ...form, risk_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Add firewall rule for HTTPS" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start">Planned Start</Label>
              <Input id="start" type="datetime-local" value={form.planned_start} onChange={(e) => setForm({ ...form, planned_start: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">Planned End</Label>
              <Input id="end" type="datetime-local" value={form.planned_end} onChange={(e) => setForm({ ...form, planned_end: e.target.value })} />
            </div>
          </div>
          {dateError && <p className="text-xs text-destructive">{dateError}</p>}
          <div className="space-y-2">
            <Label htmlFor="rollback">Rollback Plan</Label>
            <Textarea id="rollback" value={form.rollback_plan} onChange={(e) => setForm({ ...form, rollback_plan: e.target.value })} rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="validation">Validation Checklist (one per line)</Label>
            <Textarea id="validation" value={form.validation_steps} onChange={(e) => setForm({ ...form, validation_steps: e.target.value })} rows={3} placeholder="Verify firewall rule is active&#10;Test connectivity from DMZ" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="approver">Approver</Label>
            <Input id="approver" value={form.approver} onChange={(e) => setForm({ ...form, approver: e.target.value })} placeholder="Name or email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="evidence">Evidence Links (one URL per line)</Label>
            <Textarea id="evidence" value={form.evidence_links} onChange={(e) => setForm({ ...form, evidence_links: e.target.value })} rows={3} placeholder="https://jira.example.com/CHG-001" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Change Request"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
