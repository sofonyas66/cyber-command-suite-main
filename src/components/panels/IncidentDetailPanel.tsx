import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle, PlayCircle, Shield, XCircle, CheckCircle2, Clock, User, FileText
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";

const statusOptions = [
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "contained", label: "Contained" },
  { value: "eradicated", label: "Eradicated" },
  { value: "recovered", label: "Recovered" },
  { value: "closed", label: "Closed" },
];

export default function IncidentDetailPanel({
  incident,
  onClose,
  onUpdate,
}: {
  incident: any | null;
  onClose: () => void;
  onUpdate?: () => void;
}) {
  const { activeWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    if (!incident?.id) return;
    setLoadingAssets(true);
    supabase
      .from("incident_assets")
      .select("assets(id, hostname, ip_address)")
      .eq("incident_id", incident.id)
      .then(({ data }: any) => {
        const list = (data || []).map((r: any) => r.assets).filter(Boolean);
        setAssets(list);
      })
    supabase.from("incident_assets")
      .select("assets(id, hostname, ip_address)")
  }, [incident?.id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!incident || !user) return;
    setStatusUpdating(true);
    try {
      const payload: any = { status: newStatus };
      if (newStatus === "closed") payload.closed_at = new Date().toISOString();
      else if (newStatus === "open" || newStatus === "investigating") payload.closed_at = null;
      const { error } = await supabase
        .from("incidents")
        .update(payload)
        .eq("id", incident.id)
        .eq("workspace_id", activeWorkspace?.id as any);
      if (error) throw error;
      toast.success(`Status updated to ${statusOptions.find(s => s.value === newStatus)?.label}`);
      onUpdate?.();
    } catch (err: any) {
      toast.error(err.message || String(err));
    } finally {
      setStatusUpdating(false);
    }
  };

  const addTimelineNote = async () => {
    if (!noteText.trim() || !incident || !user) return;
    try {
      const timeline = Array.isArray(incident.timeline) ? [...incident.timeline] : [];
      timeline.push({
        timestamp: new Date().toISOString(),
        action: "Note",
        description: noteText.trim(),
        actor: user.email || user.id,
      });
      const { error } = await supabase
        .from("incidents")
        .update({ timeline })
        .eq("id", incident.id)
        .eq("workspace_id", activeWorkspace?.id as any);
      if (error) throw error;
      toast.success("Timeline note added");
      setNoteText("");
      onUpdate?.();
    } catch (err: any) {
      toast.error(err.message || String(err));
    }
  };

  const handleEditField = async (field: string, value: string) => {
    if (!incident || !user) return;
    try {
      const { error } = await supabase
        .from("incidents")
        .update({ [field]: value || null })
        .eq("id", incident.id)
        .eq("workspace_id", activeWorkspace?.id as any);
      if (error) throw error;
      toast.success("Updated");
      onUpdate?.();
    } catch (err: any) {
      toast.error(err.message || String(err));
    }
  };

  return (
    <Sheet open={!!incident} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {incident && (
          <>
            <SheetHeader className="pb-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-xl leading-tight">{incident.title}</SheetTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs font-mono">{incident.incident_number}</Badge>
                    <Badge variant="outline" className={`text-xs ${
                      incident.severity === "critical" ? "severity-critical" :
                      incident.severity === "high" ? "severity-high" :
                      incident.severity === "low" ? "severity-low" : ""
                    }`}>{incident.severity}</Badge>
                  </div>
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-6">
              {/* Status + Date */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">Status:</p>
                  <Select value={incident.status} onValueChange={handleStatusChange} disabled={statusUpdating}>
                    <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-xs text-muted-foreground">
                  Opened: {incident.opened_at ? format(new Date(incident.opened_at), "MMM d, yyyy h:mm a") : "—"}
                </div>
                {incident.closed_at && (
                  <div className="text-xs text-muted-foreground">Closed: {format(new Date(incident.closed_at), "MMM d, yyyy h:mm a")}</div>
                )}
              </div>

              {/* Description */}
              <div>
                <h3 className="font-medium mb-1">Description</h3>
                <p className="text-sm text-muted-foreground">{incident.description || "No description provided."}</p>
              </div>

              {/* Tags */}
              {Array.isArray(incident.tags) && incident.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {incident.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              )}

              {/* Linked Assets */}
              <div>
                <h3 className="text-sm font-medium mb-2">Linked Assets</h3>
                {loadingAssets ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : assets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None linked</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {assets.map((a: any) => (
                      <div key={a.id} className="p-2 rounded-md border bg-muted/30 text-sm">
                        <p className="font-medium">{a.hostname || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{a.ip_address || "—"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Root Cause */}
              <div>
                <h3 className="text-sm font-medium mb-2">Root Cause</h3>
                <Textarea
                  defaultValue={incident.root_cause || ""}
                  rows={3}
                  placeholder="Enter root cause analysis..."
                  onBlur={(e) => handleEditField("root_cause", e.target.value)}
                />
              </div>

              {/* Lessons Learned */}
              <div>
                <h3 className="text-sm font-medium mb-2">Lessons Learned</h3>
                <Textarea
                  defaultValue={incident.lessons_learned || ""}
                  rows={3}
                  placeholder="Enter lessons learned..."
                  onBlur={(e) => handleEditField("lessons_learned", e.target.value)}
                />
              </div>

              {/* Post-Incident Checklist */}
              <div>
                <h3 className="text-sm font-medium mb-2">Post-Incident Checklist</h3>
                {Array.isArray(incident.post_incident_checklist) && incident.post_incident_checklist.length > 0 ? (
                  <div className="space-y-2">
                    {(incident.post_incident_checklist as any[]).map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <div className={`h-4 w-4 rounded border ${item.completed ? "bg-success border-success" : "border-muted-foreground/30"}`} />
                        <span className={item.completed ? "line-through text-muted-foreground" : ""}>{item.text || item}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No checklist items</p>
                )}
              </div>

              {/* Timeline */}
              <div>
                <h3 className="text-sm font-medium mb-2">Timeline</h3>
                <div className="space-y-3">
                  {(Array.isArray(incident.timeline) ? incident.timeline : []).map((event: any, idx: number) => (
                    <div key={idx} className="flex gap-3 text-sm">
                      <div className="flex flex-col items-center pt-0.5">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        {idx < (incident.timeline?.length || 0) - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{event.action}</span>
                          <span className="text-xs text-muted-foreground">{event.timestamp ? format(new Date(event.timestamp), "MMM d, h:mm a") : "—"}</span>
                        </div>
                        <p className="text-muted-foreground">{event.description}</p>
                        {event.actor && <p className="text-xs text-muted-foreground">{event.actor}</p>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a timeline note..."
                    rows={2}
                    className="flex-1"
                  />
                  <Button onClick={addTimelineNote} size="sm" disabled={!noteText.trim()}>Add Note</Button>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
