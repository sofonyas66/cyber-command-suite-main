import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Json, Database } from "@/integrations/supabase/types";

// Helper to convert values to Json for Supabase columns
function toJson(value: TimelineEvent[] | ChecklistItem[]): Json {
  return value as unknown as Json;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// Helpers to safely parse JSON columns from database
function parseTimeline(json: Json | null | undefined): TimelineEvent[] {
  if (!Array.isArray(json)) return [];
  const out: TimelineEvent[] = [];
  for (const item of json) {
    if (!isRecord(item)) continue;
    out.push({
      timestamp: typeof item.timestamp === "string" ? item.timestamp : undefined,
      action: typeof item.action === "string" ? item.action : "",
      description: typeof item.description === "string" ? item.description : "",
      actor: typeof item.actor === "string" ? item.actor : undefined,
    });
  }
  return out;
}

function parseChecklist(json: Json | null | undefined): ChecklistItem[] {
  if (!Array.isArray(json)) return [];
  const out: ChecklistItem[] = [];
  for (const item of json) {
    if (!isRecord(item)) continue;
    out.push({
      text: typeof item.text === "string" ? item.text : "",
      completed: item.completed === true,
    });
  }
  return out;
}

const validStatuses = ["open", "investigating", "contained", "eradicated", "recovered", "closed"] as const;
type IncidentStatus = typeof validStatuses[number];

const statusOptions: { value: IncidentStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "contained", label: "Contained" },
  { value: "eradicated", label: "Eradicated" },
  { value: "recovered", label: "Recovered" },
  { value: "closed", label: "Closed" },
];

const validSeverities = ["low", "medium", "high", "critical"] as const;
type IncidentSeverity = typeof validSeverities[number];

const severityOptions: { value: IncidentSeverity; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

interface Asset {
  id: string;
  hostname: string | null;
  ip_address: string | null;
}

interface ChecklistItem {
  text: string;
  completed: boolean;
}

interface TimelineEvent {
  timestamp?: string;
  action: string;
  description: string;
  actor?: string;
}

interface IncidentDetailPanelProps {
  incident: {
    id: string;
    title: string;
    incident_number: string;
    severity: string;
    status: string;
    opened_at?: string | null;
    closed_at?: string | null;
    description?: string | null;
    root_cause?: string | null;
    lessons_learned?: string | null;
    tags?: string[] | null;
    post_incident_checklist?: unknown;
    timeline?: unknown;
  } | null;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function IncidentDetailPanel({
  incident,
  onClose,
  onUpdate,
}: IncidentDetailPanelProps) {
  const { user } = useAuth();

  // Full fetched incident record state & loading state
  const [loadingIncident, setLoadingIncident] = useState(false);

  // Controlled form state for Title, Severity, Root Cause, Lessons Learned, Description, Tags
  const [formData, setFormData] = useState<{
    title: string;
    severity: IncidentSeverity | "";
    description: string;
    tags: string;
    root_cause: string;
    lessons_learned: string;
  }>({
    title: incident?.title || "",
    severity: validSeverities.find((s) => s === incident?.severity) || "",
    description: "",
    tags: "",
    root_cause: "",
    lessons_learned: "",
  });
  const [baseline, setBaseline] = useState<{
    title: string;
    severity: string;
  }>({
    title: incident?.title || "",
    severity: incident?.severity || "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Status updating state
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Assets state
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);

  // Timeline state
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [noteText, setNoteText] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Checklist state
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [isAddingChecklistItem, setIsAddingChecklistItem] = useState(false);

  // Fetch full incident by ID whenever panel opens or incident ID changes
  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!incident?.id) {
        setFormData({
          title: "",
          severity: "",
          description: "",
          tags: "",
          root_cause: "",
          lessons_learned: "",
        });
        setTimeline([]);
        setChecklist([]);
        setIsDirty(false);
        return;
      }

      setLoadingIncident(true);

      try {
        const { data, error } = await supabase
          .from("incidents")
          .select("*")
          .eq("id", incident.id)
          .maybeSingle();

        if (!isMounted) return;

        if (error) {
          console.error("Error fetching incident details:", error);
          toast.error(`Failed to load incident details: ${error.message}`);
          return;
        }

        const fullRecord = data;

        // Populate controlled inputs
        setFormData({
          title: fullRecord?.title || "",
          severity: validSeverities.find((s) => s === fullRecord?.severity) || "",
          description: fullRecord?.description || "",
          tags: Array.isArray(fullRecord?.tags) ? fullRecord.tags.join(", ") : "",
          root_cause: fullRecord?.root_cause || "",
          lessons_learned: fullRecord?.lessons_learned || "",
        });
        setBaseline({
          title: fullRecord?.title || "",
          severity: fullRecord?.severity || "",
        });
        setIsDirty(false);

        // Populate timeline and checklist using helpers
        setTimeline(parseTimeline(fullRecord?.timeline));
        setChecklist(parseChecklist(fullRecord?.post_incident_checklist));
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Exception fetching incident details:", err);
        toast.error(`Failed to load incident details: ${msg}`);
      } finally {
        if (isMounted) setLoadingIncident(false);
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [incident?.id]);

  // Fetch linked assets
  useEffect(() => {
    if (!incident?.id) {
      setAssets([]);
      setAssetError(null);
      setLoadingAssets(false);
      return;
    }

    setLoadingAssets(true);
    setAssetError(null);

    (async () => {
      try {
        const { data, error } = await supabase
          .from("incident_assets")
          .select("assets(id, hostname, ip_address)")
          .eq("incident_id", incident.id);

        if (error) {
          console.error("Supabase error fetching incident_assets:", error);
          setAssetError(error.message || "Failed to load linked assets");
        } else {
          const list: Asset[] = (data || [])
            .map((r: Record<string, unknown>) => r.assets as Asset | null)
            .filter((a): a is Asset => a !== null);
          setAssets(list);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Exception fetching incident_assets:", err);
        setAssetError(msg);
      } finally {
        setLoadingAssets(false);
      }
    })();
  }, [incident?.id]);

  const handleFieldChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!incident || !user) return;
    if (!formData.title.trim()) {
      toast.error("Title cannot be empty");
      return;
    }
    setIsSaving(true);
    try {
      const formattedTags = formData.tags
        ? formData.tags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const payload: Database["public"]["Tables"]["incidents"]["Update"] = {
        title: formData.title.trim(),
        severity: formData.severity || null,
        description: formData.description || null,
        tags: formattedTags,
        root_cause: formData.root_cause || null,
        lessons_learned: formData.lessons_learned || null,
      };

      // Check if title or severity changed to add timeline entry
      let currentTimeline = [...timeline];
      let timelineChanged = false;

      if (baseline.title !== formData.title.trim()) {
        currentTimeline.push({
          timestamp: new Date().toISOString(),
          action: "Title Change",
          description: `Title changed from "${baseline.title}" to "${formData.title.trim()}"`,
          actor: user.email || user.id,
        });
        timelineChanged = true;
      }

      if (baseline.severity !== formData.severity) {
        currentTimeline.push({
          timestamp: new Date().toISOString(),
          action: "Severity Change",
          description: `Severity changed from ${baseline.severity} to ${formData.severity}`,
          actor: user.email || user.id,
        });
        timelineChanged = true;
      }

      if (timelineChanged) {
        payload.timeline = toJson(currentTimeline);
      }

      const { data, error } = await supabase
        .from("incidents")
        .update(payload)
        .eq("id", incident.id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("No rows were updated (permission denied or record missing).");

      // Update local state matching saved data
      setFormData({
        title: data.title,
        severity: validSeverities.find((s) => s === data.severity) || "",
        description: data.description || "",
        tags: Array.isArray(data.tags) ? data.tags.join(", ") : "",
        root_cause: data.root_cause || "",
        lessons_learned: data.lessons_learned || "",
      });

      setBaseline({
        title: data.title,
        severity: data.severity || "",
      });

      if (data.timeline) {
        setTimeline(parseTimeline(data.timeline));
      }

      toast.success("Incident details saved");
      setIsDirty(false);
      onUpdate?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to save: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: IncidentStatus) => {
    if (!incident || !user) return;
    setStatusUpdating(true);
    try {
      const payload: Database["public"]["Tables"]["incidents"]["Update"] = { status: newStatus };
      if (newStatus === "closed") payload.closed_at = new Date().toISOString();
      else if (newStatus === "open" || newStatus === "investigating") payload.closed_at = null;

      const { data, error } = await supabase
        .from("incidents")
        .update(payload)
        .eq("id", incident.id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Status update failed: No rows were updated.");

      setBaseline((prev) => ({ ...prev, severity: data.severity || "" }));
      toast.success(`Status updated to ${statusOptions.find((s) => s.value === newStatus)?.label}`);
      onUpdate?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to update status: ${msg}`);
    } finally {
      setStatusUpdating(false);
    }
  };

  const addTimelineNote = async () => {
    if (!noteText.trim() || !incident || !user) return;
    setIsAddingNote(true);
    try {
      const newNote: TimelineEvent = {
        timestamp: new Date().toISOString(),
        action: "Note",
        description: noteText.trim(),
        actor: user.email || user.id,
      };
      const updatedTimeline = [...timeline, newNote];

      const { data, error } = await supabase
        .from("incidents")
        .update({ timeline: toJson(updatedTimeline) })
        .eq("id", incident.id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Failed to add note: No rows were updated.");

      setTimeline(parseTimeline(data.timeline as Json | null));
      setNoteText("");
      toast.success("Timeline note added");
      onUpdate?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to add note: ${msg}`);
    } finally {
      setIsAddingNote(false);
    }
  };

  const toggleChecklistItem = async (index: number) => {
    if (!incident) return;
    const updated = checklist.map((item, idx) =>
      idx === index ? { ...item, completed: !item.completed } : item
    );
    try {
      const { data, error } = await supabase
        .from("incidents")
        .update({ post_incident_checklist: toJson(updated) })
        .eq("id", incident.id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Failed to update checklist: No rows were updated.");

      setChecklist(parseChecklist(data.post_incident_checklist as Json | null));

      onUpdate?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to update checklist item: ${msg}`);
    }
  };

  const addChecklistItem = async () => {
    if (!newChecklistItem.trim() || !incident) return;
    setIsAddingChecklistItem(true);
    try {
      const newItem: ChecklistItem = {
        text: newChecklistItem.trim(),
        completed: false,
      };
      const updated = [...checklist, newItem];

      const { data, error } = await supabase
        .from("incidents")
        .update({ post_incident_checklist: toJson(updated) })
        .eq("id", incident.id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Failed to add checklist item: No rows were updated.");

      setChecklist(parseChecklist(data.post_incident_checklist as Json | null));

      setNewChecklistItem("");
      toast.success("Checklist item added");
      onUpdate?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to add checklist item: ${msg}`);
    } finally {
      setIsAddingChecklistItem(false);
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
                  <Input
                    value={formData.title}
                    onChange={(e) => handleFieldChange("title", e.target.value)}
                    className="text-xl font-semibold bg-transparent border-none p-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground"
                    placeholder="Incident Title"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs font-mono">{incident.incident_number}</Badge>
                    <Select
                      value={formData.severity}
                      onValueChange={(val) => handleFieldChange("severity", val)}
                    >
                      <SelectTrigger className="h-6 text-[10px] uppercase w-auto border-none p-0 gap-1 focus:ring-0">
                        <Badge variant="outline" className={`text-xs ${
                          formData.severity === "critical" ? "severity-critical" :
                          formData.severity === "high" ? "severity-high" :
                          formData.severity === "low" ? "severity-low" : ""
                        }`}>
                          <SelectValue />
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {severityOptions.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </SheetHeader>

            {loadingIncident ? (
              <div className="flex flex-col items-center justify-center p-12 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading incident details...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Status + Date */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">Status:</p>
                    <Select 
                      value={incident.status} 
                      onValueChange={(val) => {
                        const status = validStatuses.find((s) => s === val);
                        if (status) {
                          handleStatusChange(status);
                        }
                      }} 
                      disabled={statusUpdating}
                    >
                      <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Opened: {incident.opened_at ? format(new Date(incident.opened_at), "MMM d, yyyy h:mm a") : "—"}
                  </div>
                  {incident.closed_at && (
                    <div className="text-xs text-muted-foreground">
                      Closed: {format(new Date(incident.closed_at), "MMM d, yyyy h:mm a")}
                    </div>
                  )}
                </div>

                {/* Save Button Bar */}
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSave} disabled={!isDirty || isSaving} size="sm">
                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-sm font-medium mb-1">Description</h3>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => handleFieldChange("description", e.target.value)}
                    placeholder="Enter incident description..."
                    rows={3}
                  />
                </div>

                {/* Tags */}
                <div>
                  <h3 className="text-sm font-medium mb-1">Tags (comma-separated)</h3>
                  <Input
                    value={formData.tags}
                    onChange={(e) => handleFieldChange("tags", e.target.value)}
                    placeholder="e.g., phishing, email, ir"
                  />
                </div>

                {/* Linked Assets */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Linked Assets</h3>
                  {loadingAssets ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : assetError ? (
                    <p className="text-sm text-destructive">Error loading linked assets: {assetError}</p>
                  ) : assets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No linked assets</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {assets.map((a) => (
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
                    value={formData.root_cause}
                    onChange={(e) => handleFieldChange("root_cause", e.target.value)}
                    rows={3}
                    placeholder="Enter root cause analysis..."
                  />
                </div>

                {/* Lessons Learned */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Lessons Learned</h3>
                  <Textarea
                    value={formData.lessons_learned}
                    onChange={(e) => handleFieldChange("lessons_learned", e.target.value)}
                    rows={3}
                    placeholder="Enter lessons learned..."
                  />
                </div>

                {/* Post-Incident Checklist */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Post-Incident Checklist</h3>
                  {checklist.length === 0 ? (
                    <p className="text-sm text-muted-foreground mb-3">No checklist items</p>
                  ) : (
                    <div className="space-y-2 mb-3">
                      {checklist.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            id={`checklist-item-${idx}`}
                            checked={item.completed}
                            onCheckedChange={() => toggleChecklistItem(idx)}
                          />
                          <label
                            htmlFor={`checklist-item-${idx}`}
                            className={`cursor-pointer ${
                              item.completed ? "line-through text-muted-foreground" : ""
                            }`}
                          >
                            {item.text}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      placeholder="Add checklist item..."
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addChecklistItem();
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={addChecklistItem}
                      disabled={!newChecklistItem.trim() || isAddingChecklistItem}
                    >
                      {isAddingChecklistItem ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Timeline</h3>
                  <div className="space-y-3">
                    {timeline.map((event, idx) => (
                      <div key={idx} className="flex gap-3 text-sm">
                        <div className="flex flex-col items-center pt-0.5">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                          {idx < timeline.length - 1 && (
                            <div className="w-0.5 flex-1 bg-border mt-1" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{event.action}</span>
                            <span className="text-xs text-muted-foreground">
                              {event.timestamp
                                ? format(new Date(event.timestamp), "MMM d, h:mm a")
                                : "—"}
                            </span>
                          </div>
                          <p className="text-muted-foreground">{event.description}</p>
                          {event.actor && (
                            <p className="text-xs text-muted-foreground">{event.actor}</p>
                          )}
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
                    <Button
                      onClick={addTimelineNote}
                      size="sm"
                      disabled={!noteText.trim() || isAddingNote}
                    >
                      {isAddingNote ? "Adding..." : "Add Note"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
