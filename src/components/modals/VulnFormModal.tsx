import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface VulnFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialAssetId?: string | null;
  onSaved?: () => void;
}

export default function VulnFormModal({ open, onOpenChange, initialAssetId = null, onSaved }: VulnFormModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    cve_id: "",
    cvss_score: "",
    severity: "medium",
    status: "new",
    description: "",
  });

  useEffect(() => {
    if (!open) {
      setForm({ title: "", cve_id: "", cvss_score: "", severity: "medium", status: "new", description: "" });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Sign in to create vulnerabilities');
      return;
    }
    setLoading(true);
    try {
      const payload: any = {
        user_id: user.id,
        title: form.title,
        cve_id: form.cve_id || null,
        cvss_score: form.cvss_score ? parseFloat(form.cvss_score) : null,
        severity: form.severity,
        status: form.status,
        description: form.description || null,
      };
      const { data, error } = await supabase.from('vulnerabilities').insert([payload]);
      if (error) throw error;
      const created = (data && data[0]) || null;
      if (created && initialAssetId) {
        const { error: linkErr } = await supabase.from('vuln_assets').insert([{ vulnerability_id: created.id, asset_id: initialAssetId }]);
        if (linkErr) throw linkErr;
      }
      toast.success('Vulnerability created');
      onOpenChange(false);
      onSaved && onSaved();
    } catch (err: any) {
      console.error('Create vuln failed', err);
      toast.error(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Vulnerability</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CVE ID</Label>
              <Input value={form.cve_id} onChange={(e) => setForm({ ...form, cve_id: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>CVSS</Label>
              <Input value={form.cvss_score} onChange={(e) => setForm({ ...form, cvss_score: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Severity</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
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
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="triage">Triage</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="mitigated">Mitigated</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
