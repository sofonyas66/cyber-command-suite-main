import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Server, ShieldAlert, AlertTriangle, BookOpen, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";

interface GlobalSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SearchCategory = "all" | "assets" | "vulnerabilities" | "incidents" | "runbooks" | "logs";

const categories: { key: SearchCategory; label: string; icon: React.ElementType }[] = [
  { key: "all", label: "All", icon: Search },
  { key: "assets", label: "Assets", icon: Server },
  { key: "vulnerabilities", label: "Vulnerabilities", icon: ShieldAlert },
  { key: "incidents", label: "Incidents", icon: AlertTriangle },
  { key: "runbooks", label: "Runbooks", icon: BookOpen },
  { key: "logs", label: "Logs", icon: FileSearch },
];

const recentSearches = [
  { type: "asset", name: "dc01.corp.local", path: "/assets" },
  { type: "vulnerability", name: "CVE-2024-1234", path: "/vulnerabilities" },
  { type: "runbook", name: "Phishing Triage", path: "/runbooks" },
];

export default function GlobalSearchModal({ open, onOpenChange }: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SearchCategory>("all");
  const navigate = useNavigate();

  const handleSelect = (path: string) => {
    navigate(path);
    onOpenChange(false);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center border-b border-border px-4">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search across all modules..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 text-base"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1 p-2 border-b border-border overflow-x-auto">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                  category === cat.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Results */}
        <div className="p-4 max-h-[400px] overflow-y-auto">
          {query ? (
            <RealSearchResults query={query} category={category} />
          ) : (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Recent Searches
              </h4>
              <RecentSearches onSelect={handleSelect} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">↑↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">↵</kbd>
            Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">ESC</kbd>
            Close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function sanitizeQuery(q: string): string {
  return q.replace(/[%,_\\(),]/g, "").trim();
}

function RealSearchResults({ query, category }: { query: string; category: SearchCategory }) {
  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [results, setResults] = useState<Record<string, any[]>>({ assets: [], vulnerabilities: [], incidents: [], runbooks: [], logs: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const clean = sanitizeQuery(query);
    if (clean.length < 2) { setResults({ assets: [], vulnerabilities: [], incidents: [], runbooks: [], logs: [] }); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const workspaceFilter = activeWorkspace?.id ? `workspace_id.eq.${activeWorkspace.id}` : "";
        const likePattern = `%${clean}%`;
        const fetchTable = async (table: string, fields: string) => {
          let queryBuilder = supabase.from(table).select(fields);
          if (workspaceFilter) queryBuilder = queryBuilder.eq("workspace_id", activeWorkspace!.id as any);
          // Search via or on text fields - simplified approach
          const { data } = await queryBuilder.or(`title.ilike.${likePattern},hostname.ilike.${likePattern},cve_id.ilike.${likePattern},incident_number.ilike.${likePattern}`).limit(5);
          return data || [];
        };
        const [assets, vulnerabilities, incidents, runbooks, logs] = await Promise.all([
          fetchTable("assets", "id, hostname, owner"),
          fetchTable("vulnerabilities", "id, title, cve_id"),
          fetchTable("incidents", "id, title, incident_number"),
          fetchTable("runbooks", "id, title"),
          fetchTable("log_snippets", "id, title"),
        ]);
        setResults({ assets, vulnerabilities, incidents, runbooks, logs: logs || [] });
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, category, activeWorkspace?.id]);

  const types: SearchCategory[] = ["assets", "vulnerabilities", "incidents", "runbooks", "logs"];
  if (category !== "all") types.splice(0, types.length);
  if (category !== "all") types.push(category);

  const handleSelect = (path: string, id?: string) => {
    navigate(path + (id ? `?v=${id}` : ""));
  };

  if (loading) return <p className="text-sm text-muted-foreground">Searching...</p>;
  const filteredResults = Object.entries(results).filter(([k]) => category === "all" || k === category);
  if (filteredResults.every(([_, v]) => v.length === 0)) return <p className="text-sm text-muted-foreground">No results found</p>;

  return (
    <div className="space-y-4">
      {filteredResults.map(([type, items]) => {
        if (items.length === 0) return null;
        const icons: Record<string, any> = { assets: Server, vulnerabilities: ShieldAlert, incidents: AlertTriangle, runbooks: BookOpen, logs: FileSearch };
        const Icon = icons[type];
        const paths: Record<string, string> = { assets: "/assets", vulnerabilities: "/vulnerabilities", incidents: "/incidents", runbooks: "/runbooks", logs: "/logs" };
        return (
          <div key={type}>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
              <Icon className="h-3 w-3" /> {type}
            </h4>
            <div className="space-y-1">
              {items.map((item: any) => (
                <button key={item.id} onClick={() => handleSelect(paths[type], item.id)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left">
                  <span className="text-sm truncate">{item.hostname || item.title || item.incident_number || item.name || item.id}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecentSearches({ onSelect }: { onSelect: (label: string, path?: string) => void }) {
  const [recents, setRecents] = useState<{ query: string; path: string }[]>([]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("searchRecents");
      if (stored) setRecents(JSON.parse(stored));
    } catch { setRecents([]); }
  }, []);
  if (!recents.length) return <p className="text-xs text-muted-foreground">No recent searches</p>;
  return (
    <div className="space-y-1">
      {recents.map((item, i) => (
        <button key={i} onClick={() => onSelect(item.query, item.path)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left">
          <span className="text-sm">{item.query}</span>
        </button>
      ))}
    </div>
  );
}
