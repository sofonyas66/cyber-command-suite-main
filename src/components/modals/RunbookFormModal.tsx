import { useEffect, useState } from "react";
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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { getErrorMessage } from "@/lib/errors";
import { Database } from "@/integrations/supabase/types";

interface Runbook {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  steps: Array<{ id: string; text: string; completed: boolean }>;
  commands: Array<{ label: string; cmd: string }>;
  tags: string[];
  use_count: number;
}

interface RunbookFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  runbook?: Runbook | null;
}

export default function RunbookFormModal({
  open,
  onOpenChange,
  onSaved,
  runbook = null,
}: RunbookFormModalProps) {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const isEditMode = !!runbook;
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [stepsText, setStepsText] = useState("");
  const [commandsText, setCommandsText] = useState("");

  useEffect(() => {
    if (runbook) {
      setTitle(runbook.title || "");
      setCategory(runbook.category || "");
      setDescription(runbook.description || "");
      setTags(Array.isArray(runbook.tags) ? runbook.tags.join(", ") : String(runbook.tags || ""));
      setStepsText(Array.isArray(runbook.steps)
        ? runbook.steps.map(s => s.text).join("\n")
        : "");
      setCommandsText(Array.isArray(runbook.commands)
        ? runbook.commands.map(c => `${c.label} | ${c.cmd}`).join("\n")
        : "");
    } else {
      setTitle("");
      setCategory("");
      setDescription("");
      setTags("");
      setStepsText("");
      setCommandsText("");
    }
  }, [runbook, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Create mode validation
    if (!isEditMode && !user) {
      toast.error("Sign in to create runbooks");
      return;
    }
    if (!isEditMode && !activeWorkspace?.id) {
      toast.error("No workspace selected");
      return;
    }
    setLoading(true);
    try {
      const steps = stepsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((text, idx) => ({ id: String(idx + 1), text, completed: false }));
      const commands = commandsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [label, ...rest] = line.split("|");
          return { label: label.trim() || "Command", cmd: rest.join("|").trim() || line };
        });

      const payload: Omit<Database["public"]["Tables"]["runbooks"]["Insert"], "user_id" | "workspace_id" | "use_count"> & {
        user_id: string;
        workspace_id: string;
        use_count: number;
      } = {
        user_id: user!.id,
        workspace_id: activeWorkspace!.id,
        use_count: 0,
        title,
        category: category || null,
        description: description || null,
        steps,
        commands: commands.length ? commands : [],
        tags: tags
          ? tags.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
      };

      let result;
      if (isEditMode && runbook?.id) {
        // Edit mode: never send user_id, workspace_id, or use_count
        const editPayload: Omit<Database["public"]["Tables"]["runbooks"]["Update"], "user_id" | "workspace_id" | "use_count"> = {
          title,
          category: category || null,
          description: description || null,
          steps,
          commands: commands.length ? commands : [],
          tags: tags
            ? tags.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
        };
        result = await supabase
          .from("runbooks")
          .update(editPayload)
          .eq("id", runbook.id)
          .select()
          .single();
      } else {
        // Create mode: include user_id, workspace_id, use_count
        result = await supabase
          .from("runbooks")
          .insert([payload])
          .select()
          .single();
      }

      const { data, error } = result;
      if (error) throw error;
      if (!data) throw new Error(isEditMode ? "Update failed or not permitted" : "Insert returned no row");
      toast.success(isEditMode ? "Runbook updated" : "Runbook created");
      onOpenChange(false);
      setTitle("");
      setCategory("");
      setDescription("");
      setTags("");
      setStepsText("");
      setCommandsText("");
      onSaved?.();
    } catch (err: unknown) {
      console.error(isEditMode ? "Update runbook failed" : "Create runbook failed", err);
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Runbook" : "Create Runbook"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="r-title">Title *</Label>
            <Input
              id="r-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Phishing Email Triage"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-cat">Category</Label>
            <Input
              id="r-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Email Security"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-desc">Description</Label>
            <Textarea
              id="r-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-steps">Steps (one per line)</Label>
            <Textarea
              id="r-steps"
              value={stepsText}
              onChange={(e) => setStepsText(e.target.value)}
              rows={4}
              placeholder="1. Collect email&#10;2. Check headers"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-cmds">Commands (label | command, one per line)</Label>
            <Textarea
              id="r-cmds"
              value={commandsText}
              onChange={(e) => setCommandsText(e.target.value)}
              rows={3}
              placeholder="Search mailbox | Search-Mailbox ..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-tags">Tags (comma-separated)</Label>
            <Input
              id="r-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="phishing, email"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEditMode ? "Update Runbook" : "Create Runbook"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}