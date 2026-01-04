import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Server, ShieldAlert, AlertTriangle, BookOpen, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";

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
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Search for "{query}"</p>
              <p className="text-sm">Press Enter to search</p>
            </div>
          ) : (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Recent Searches
              </h4>
              <div className="space-y-1">
                {recentSearches.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelect(item.path)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    {item.type === "asset" && <Server className="h-4 w-4 text-primary" />}
                    {item.type === "vulnerability" && <ShieldAlert className="h-4 w-4 text-destructive" />}
                    {item.type === "runbook" && <BookOpen className="h-4 w-4 text-success" />}
                    <span className="text-sm">{item.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground capitalize">{item.type}</span>
                  </button>
                ))}
              </div>
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
