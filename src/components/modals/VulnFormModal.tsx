import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { getErrorMessage } from "@/lib/errors";
import { Database } from "@/integrations/supabase/types";

type Severity = Database["public"]["Enums"]["vuln_severity"];
type Status = Database["public"]["Enums"]["vuln_status"];

interface VulnFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialAssetId?: string | null;
  onSaved?: () => void;
  vulnerability?: Database["public"]["Tables"]["vulnerabilities"]["Row"] | null;
}

const isValidCVSS = (value: string): boolean => {
  if (!value || value.trim() === '') return true; // allow empty/null
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0 && num <= 10 && value.match(/^\d+(\.\d)?$/) !== null; // max 1 decimal place
};

const validateCVEs = (value: string): { valid: boolean; normalized?: string } => {
    if (!value || value.trim() === '') return { valid: true, normalized: '' };
    const cves = value.split(/[, ]+/).filter(Boolean);
    const valid = cves.every(cve => /^CVE-\d{4}-\d{4,}$/i.test(cve));
    if (!valid) return { valid: false };
    const normalized = cves.map(cve => cve.toUpperCase()).join(", ");
    return { valid: true, normalized };
  };

export default function VulnFormModal({ open, onOpenChange, initialAssetId = null, onSaved, vulnerability = null }: VulnFormModalProps) {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const isEditMode = !!vulnerability;
  const [loading, setLoading] = useState(false);
  const [cvssError, setCvssError] = useState<string | null>(null);
  const [cveError, setCveError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [cveId, setCveId] = useState("");
  const [cvssScore, setCvssScore] = useState("");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [status, setStatus] = useState<Status>("new");
  const [description, setDescription] = useState("");
  const [solution, setSolution] = useState("");
  const [remediationSteps, setRemediationSteps] = useState("");
  const [source, setSource] = useState("");
  const [slaDueDate, setSlaDueDate] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (!open) {
      setTitle("");
      setCveId("");
      setCvssScore("");
      setSeverity("medium");
      setStatus("new");
      setDescription("");
      setSolution("");
      setRemediationSteps("");
      setSource("");
      setSlaDueDate("");
      setTags("");
      setCvssError(null);
    }
    if (vulnerability) {
      setTitle(vulnerability.title || "");
      setCveId(vulnerability.cve_id || "");
      setCvssScore(vulnerability.cvss_score != null ? String(vulnerability.cvss_score) : "");
      setSeverity(vulnerability.severity || "medium");
      setStatus(vulnerability.status || "new");
      setDescription(vulnerability.description || "");
      setSolution(vulnerability.solution || "");
      setRemediationSteps(vulnerability.remediation_steps || "");
      setSource(vulnerability.source || "");
      setSlaDueDate(vulnerability.sla_due_date || "");
      setTags(Array.isArray(vulnerability.tags) ? vulnerability.tags.join(", ") : "");
    }
  }, [open, vulnerability]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditMode && !user) {
      toast.error('Sign in to create vulnerabilities');
      return;
    }
    if (!isEditMode && !activeWorkspace?.id) {
      toast.error('No workspace selected');
      return;
    }

    // Validate CVE before submit
    const cveValidation = validateCVEs(cveId);
    if (!cveValidation.valid) {
      setCveError('Invalid CVE ID format. Use CVE-YYYY-NNNN...');
      return;
    }
    setCveError(null);
    const normalizedCveId = cveValidation.normalized;

    // Validate CVSS before submit
    if (!isValidCVSS(cvssScore)) {
      setCveError(null);
      setCvssError('CVSS must be between 0.0 and 10.0 with max 1 decimal place');
      return;
    }
    setCvssError(null);

    setLoading(true);
    try {
      if (isEditMode && vulnerability) {
        // Edit mode: never send user_id or workspace_id
        const editPayload: Database["public"]["Tables"]["vulnerabilities"]["Update"] = {
          title,
          cve_id: normalizedCveId || null,
          cvss_score: cvssScore ? parseFloat(cvssScore) : null,
          severity,
          status,
          description: description || null,
          solution: solution || null,
          remediation_steps: remediationSteps || null,
          source: source || null,
          sla_due_date: slaDueDate || null,
          tags: tags ? tags.split(",").map((s) => s.trim()).filter(Boolean) : [],
        };

        const { data, error } = await supabase
          .from('vulnerabilities')
          .update(editPayload)
          .eq('id', vulnerability.id)
          .select()
          .single();

        if (error) throw error;
        if (!data) {
          toast.error(getErrorMessage(error) || "Update failed or not permitted");
          return;
        }

        toast.success('Vulnerability updated');
        onOpenChange(false);
        setTitle("");
        setCveId("");
        setCvssScore("");
        setSeverity("medium");
        setStatus("new");
        setDescription("");
        setSolution("");
        setRemediationSteps("");
        setSource("");
        setSlaDueDate("");
        setTags("");
        onSaved && onSaved();
      } else {
        // Create mode - only send the original fields
        const payload: Database["public"]["Tables"]["vulnerabilities"]["Insert"] = {
          user_id: user!.id,
          workspace_id: activeWorkspace!.id,
          title,
          cve_id: normalizedCveId || null,
          cvss_score: cvssScore ? parseFloat(cvssScore) : null,
          severity,
          status,
          description: description || null,
        };

        const { data, error } = await supabase.from('vulnerabilities').insert([payload]).select().single();
        if (error) throw error;
        const created = data;

        if (created && initialAssetId) {
          const { error: linkErr } = await supabase.from('vuln_assets').insert([{ vulnerability_id: created.id, asset_id: initialAssetId }]);
          if (linkErr) throw linkErr;
        }

        toast.success('Vulnerability created');
        onOpenChange(false);
        setTitle("");
        setCveId("");
        setCvssScore("");
        setSeverity("medium");
        setStatus("new");
        setDescription("");
        setSolution("");
        setRemediationSteps("");
        setSource("");
        setSlaDueDate("");
        setTags("");
        onSaved && onSaved();
      }
    } catch (err: unknown) {
      console.error(isEditMode ? 'Update vuln failed' : 'Create vuln failed', err);
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Vulnerability" : "Create Vulnerability"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CVE ID</Label>
              <Input
                value={cveId}
                onChange={(e) => {
                  const val = e.target.value;
                  setCveId(val);
                  if (val && !validateCVEs(val).valid) {
                    setCveError('Invalid CVE ID format');
                  } else {
                    setCveError(null);
                  }
                }}
              />
              {cveError && (
                <p className="text-sm text-destructive" role="alert">{cveError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>CVSS</Label>
              <Input
                value={cvssScore}
                onChange={(e) => {
                  const val = e.target.value;
                  setCvssScore(val);
                  if (!isValidCVSS(val)) {
                    setCvssError('CVSS must be between 0.0 and 10.0 with max 1 decimal place');
                  } else {
                    setCvssError(null);
                  }
                }}
                placeholder="0.0 - 10.0"
                aria-invalid={cvssError ? 'true' : 'false'}
              />
              {cvssError && (
                <p className="text-sm text-destructive" role="alert">{cvssError}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Severity</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as Severity)}>
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
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="triage">Triage</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="mitigated">Mitigated</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="false_positive">False Positive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </div>

          <div className="space-y-2">
            <Label>Solution</Label>
            <Textarea value={solution} onChange={(e) => setSolution(e.target.value)} rows={2} placeholder="How to remediate..." />
          </div>

          <div className="space-y-2">
            <Label>Remediation Steps</Label>
            <Textarea value={remediationSteps} onChange={(e) => setRemediationSteps(e.target.value)} rows={2} placeholder="Step-by-step actions..." />
          </div>

          <div className="space-y-2">
            <Label>Source</Label>
            <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g., Nessus, Qualys" />
          </div>

          <div className="space-y-2">
            <Label>SLA Due Date</Label>
            <Input type="date" value={slaDueDate} onChange={(e) => setSlaDueDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Tags (comma-separated)</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g., OWASP, PCI-DSS" />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : isEditMode ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}