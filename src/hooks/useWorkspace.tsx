import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type WorkspaceRole = 'owner' | 'admin' | 'analyst' | 'readonly';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (workspace: Workspace) => void;
  loading: boolean;
  userRole: WorkspaceRole | null;
  canEdit: boolean;
  canDelete: boolean;
  canManageMembers: boolean;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = async () => {
    if (!user) {
      setWorkspaces([]);
      setActiveWorkspaceState(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_user_workspaces', {
        _user_id: user.id
      });

      if (error) throw error;

      const mapped: Workspace[] = (data || []).map((w: any) => ({
        id: w.workspace_id,
        name: w.workspace_name,
        slug: w.workspace_slug,
        role: w.user_role as WorkspaceRole
      }));

      setWorkspaces(mapped);

      // Restore active workspace from localStorage or use first one
      const savedWorkspaceId = localStorage.getItem('activeWorkspaceId');
      const savedWorkspace = mapped.find(w => w.id === savedWorkspaceId);
      
      if (savedWorkspace) {
        setActiveWorkspaceState(savedWorkspace);
      } else if (mapped.length > 0) {
        setActiveWorkspaceState(mapped[0]);
        localStorage.setItem('activeWorkspaceId', mapped[0].id);
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, [user]);

  const setActiveWorkspace = (workspace: Workspace) => {
    setActiveWorkspaceState(workspace);
    localStorage.setItem('activeWorkspaceId', workspace.id);
  };

  const userRole = activeWorkspace?.role || null;
  
  // Permission helpers based on role hierarchy
  const canEdit = userRole ? ['owner', 'admin', 'analyst'].includes(userRole) : false;
  const canDelete = userRole ? ['owner', 'admin'].includes(userRole) : false;
  const canManageMembers = userRole ? ['owner', 'admin'].includes(userRole) : false;

  return (
    <WorkspaceContext.Provider 
      value={{ 
        workspaces, 
        activeWorkspace, 
        setActiveWorkspace, 
        loading,
        userRole,
        canEdit,
        canDelete,
        canManageMembers,
        refreshWorkspaces: fetchWorkspaces
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
