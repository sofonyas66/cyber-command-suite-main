import { Check, ChevronsUpDown, Building2, Plus, Shield, Eye, Users, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { useWorkspace, WorkspaceRole } from "@/hooks/useWorkspace";
import { Badge } from "@/components/ui/badge";

const roleIcons: Record<WorkspaceRole, React.ReactNode> = {
  owner: <Crown className="h-3 w-3" />,
  admin: <Shield className="h-3 w-3" />,
  analyst: <Users className="h-3 w-3" />,
  readonly: <Eye className="h-3 w-3" />,
};

const roleColors: Record<WorkspaceRole, string> = {
  owner: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  admin: "bg-primary/20 text-primary border-primary/30",
  analyst: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  readonly: "bg-muted text-muted-foreground border-border",
};

export function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const { workspaces, activeWorkspace, setActiveWorkspace, loading } = useWorkspace();

  if (loading) {
    return (
      <Button variant="outline" className="w-[200px] justify-between" disabled>
        <span className="text-muted-foreground">Loading...</span>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between bg-sidebar-accent/50 border-sidebar-border hover:bg-sidebar-accent"
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">
              {activeWorkspace?.name || "Select workspace"}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search workspaces..." />
          <CommandList>
            <CommandEmpty>No workspace found.</CommandEmpty>
            <CommandGroup heading="Your Workspaces">
              {workspaces.map((workspace) => (
                <CommandItem
                  key={workspace.id}
                  value={workspace.name}
                  onSelect={() => {
                    setActiveWorkspace(workspace);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Check
                      className={cn(
                        "h-4 w-4",
                        activeWorkspace?.id === workspace.id
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{workspace.name}</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs capitalize flex items-center gap-1", roleColors[workspace.role])}
                  >
                    {roleIcons[workspace.role]}
                    {workspace.role}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  // TODO: Open create workspace modal
                  setOpen(false);
                }}
                className="text-muted-foreground"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Workspace
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
