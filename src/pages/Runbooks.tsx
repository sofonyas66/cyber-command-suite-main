import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  BookOpen,
  Play,
  Copy,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Terminal,
  Clock,
  MoreHorizontal,
  Edit,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import RunbookFormModal from "@/components/modals/RunbookFormModal";
import ConfirmDeleteDialog from "@/components/modals/ConfirmDeleteDialog";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

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

export default function Runbooks() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>("1");
  const [stepStates, setStepStates] = useState<Record<string, Record<string, boolean>>>({});
  const { activeWorkspace, canDelete } = useWorkspace();
  const { user, loading: authLoading } = useAuth();

  const [runbooks, setRunbooks] = useState<Runbook[] | null>(null);
  const [runbookModalOpen, setRunbookModalOpen] = useState(false);
  const [editingRunbook, setEditingRunbook] = useState<Runbook | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [runbookToDelete, setRunbookToDelete] = useState<Runbook | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRunbooks = async () => {
    setLoading(true);
    setError(null);
    try {
      let q = supabase.from('runbooks').select('id, title, category, description, steps, commands, tags, last_used, use_count').limit(1000).order('created_at', { ascending: false });
      if (activeWorkspace?.id) q = q.eq('workspace_id', activeWorkspace.id as any);
      const { data, error } = await q;
      if (error) throw error;
      setRunbooks(data as unknown as Runbook[] || []);
    } catch (err: any) {
      console.error('Failed to load runbooks', err);
      setError(err.message || String(err));
      toast.error('Failed to load runbooks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRunbooks();
  }, [activeWorkspace?.id]);

  const sourceRunbooks = runbooks === null ? [] : runbooks;

  const filteredRunbooks = sourceRunbooks.filter(
    (runbook) =>
      runbook.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (runbook.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (runbook.tags || []).some((tag) => tag.includes(searchQuery.toLowerCase()))
  );

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    toast.success("Command copied to clipboard");
  };

  const toggleStep = (runbookId: string, stepId: string) => {
    setStepStates((prev) => ({
      ...prev,
      [runbookId]: {
        ...prev[runbookId],
        [stepId]: !prev[runbookId]?.[stepId],
      },
    }));
  };

  const getCompletedSteps = (runbookId: string, totalSteps: number) => {
    const runbookSteps = stepStates[runbookId] || {};
    return Object.values(runbookSteps).filter(Boolean).length;
  };

  const handleEdit = (runbook: Runbook) => {
    setEditingRunbook(runbook);
    if (authLoading) return;
    setRunbookModalOpen(true);
  };

  const handleDeleteClick = (runbook: Runbook) => {
    setRunbookToDelete(runbook);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!runbookToDelete) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase
        .from("runbooks")
        .delete()
        .eq("id", runbookToDelete.id)
        .select();

      if (error) {
        toast.error(getErrorMessage(error));
        return;
      }

      if (!data || data.length !== 1) {
        toast.error("Delete failed or not permitted");
        return;
      }

      toast.success("Runbook deleted");
      setRunbookToDelete(null);
      setDeleteDialogOpen(false);
      fetchRunbooks();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Runbooks</h1>
          <p className="text-muted-foreground">Standard operating procedures and playbooks</p>
        </div>
        <Button size="sm" onClick={() => setRunbookModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Runbook
        </Button>
      </div>

      <RunbookFormModal
        open={runbookModalOpen}
        onOpenChange={(open) => {
          setRunbookModalOpen(open);
          if (!open) setEditingRunbook(null);
        }}
        onSaved={fetchRunbooks}
        runbook={editingRunbook}
      />

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search runbooks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Runbooks Grid */}
      <div className="space-y-4">
        {filteredRunbooks.map((runbook) => {
          const isExpanded = expandedId === runbook.id;
          const completedSteps = getCompletedSteps(runbook.id, runbook.steps.length);
          const progress = (completedSteps / runbook.steps.length) * 100;

          return (
            <Card key={runbook.id} className="card-hover overflow-hidden">
              {/* Header */}
              <div
                className="p-4 cursor-pointer flex items-start gap-4"
                onClick={() => setExpandedId(isExpanded ? null : runbook.id)}
              >
                <div className="p-2 rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{runbook.title}</h3>
                    {runbook.category && (
                      <Badge variant="outline" className="text-xs">
                        {runbook.category}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{runbook.description}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex gap-1">
                      {runbook.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Play className="h-3 w-3" />
                      Used {runbook.use_count} times
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(runbook)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      {canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(runbook);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {completedSteps > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {completedSteps}/{runbook.steps.length}
                    </Badge>
                  )}
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-border animate-fade-in">
                  {/* Progress */}
                  {completedSteps > 0 && (
                    <div className="px-4 py-2 bg-muted/30">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{Math.round(progress)}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Steps */}
                  <div className="p-4">
                    <h4 className="text-sm font-medium mb-3">Steps</h4>
                    <div className="space-y-2">
                      {runbook.steps.map((step, index) => {
                        const isCompleted = stepStates[runbook.id]?.[step.id] || false;
                        return (
                          <div
                            key={step.id}
                            className={cn(
                              "flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                              isCompleted ? "bg-success/10" : "hover:bg-muted/50"
                            )}
                            onClick={() => toggleStep(runbook.id, step.id)}
                          >
                            <div
                              className={cn(
                                "h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                                isCompleted
                                  ? "bg-success border-success text-success-foreground"
                                  : "border-muted-foreground/30"
                              )}
                            >
                              {isCompleted && <CheckCircle2 className="h-3 w-3" />}
                            </div>
                            <span
                              className={cn(
                                "text-sm",
                                isCompleted && "line-through text-muted-foreground"
                              )}
                            >
                              {index + 1}. {step.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Commands */}
                  {runbook.commands.length > 0 && (
                    <div className="p-4 border-t border-border">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Terminal className="h-4 w-4" />
                        Quick Commands
                      </h4>
                      <div className="space-y-2">
                        {runbook.commands.filter(c => c.cmd).map((cmd, index) => {
                          const label = cmd.label && cmd.label.trim() && cmd.label !== cmd.cmd ? cmd.label : null;
                          return (
                            <div key={index} className="code-block flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                {label && <p className="text-xs text-muted-foreground mb-1">{label}</p>}
                                <code className="text-xs break-all">{cmd.cmd}</code>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyCommand(cmd.cmd);
                                }}
                                className="flex-shrink-0"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        }).filter(Boolean)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}

        {/* Empty State */}
        {filteredRunbooks.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium mb-1">No runbooks found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first runbook to standardize incident response
              </p>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Runbook
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setRunbookToDelete(null);
        }}
        title="Delete Runbook?"
        description="This permanently deletes the runbook. Nothing else is deleted."
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}