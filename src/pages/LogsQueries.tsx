import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Plus,
  FileSearch,
  Copy,
  Star,
  Clock,
  Tag,
  Terminal,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";


// TODO: no saved_queries table exists yet, this is placeholder-only

export default function LogsQueries() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("queries");
  const { activeWorkspace } = useWorkspace();

  const [snippets, setSnippets] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSnippets = async () => {
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from('log_snippets')
        .select('id, title, content, description, log_source, query, tags, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (activeWorkspace?.id) q = q.eq('workspace_id', activeWorkspace.id as any);
      const { data, error } = await q;
      if (error) throw error;
      setSnippets(data || []);
    } catch (err: any) {
      console.error('Failed to load log snippets', err);
      setError(err.message || String(err));
      toast.error('Failed to load log snippets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnippets();
  }, [activeWorkspace?.id]);

  const sourceSnippets = snippets === null ? [] : snippets;

  const filteredQueries = [].filter((query) => {
    const matchesSearch =
      query.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      query.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
      query.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const filteredSnippets = sourceSnippets.filter((snippet) => {
    const matchesSearch =
      snippet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      snippet.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      snippet.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Logs & Queries</h1>
          <p className="text-muted-foreground">Save and manage SIEM queries and log snippets</p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add New
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="queries">
            <Terminal className="h-4 w-4 mr-2" />
            Saved Queries
          </TabsTrigger>
          <TabsTrigger value="snippets">
            <FileSearch className="h-4 w-4 mr-2" />
            Log Snippets
          </TabsTrigger>
        </TabsList>

        {/* Search */}
        <div className="relative max-w-md mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search queries and snippets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Saved Queries */}
        <TabsContent value="queries" className="space-y-4">
          {filteredQueries.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Terminal className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-medium mb-1">No saved queries yet</h3>
                <p className="text-sm text-muted-foreground">Queries will appear here once saved to the database.</p>
              </CardContent>
            </Card>
          )}
          {filteredQueries.map((query) => (
            <Card key={query.id} className="card-hover">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{query.title}</h3>
                      {query.starred && <Star className="h-4 w-4 text-warning fill-warning" />}
                      <Badge variant="outline" className="text-xs">
                        {query.log_source}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{query.description}</p>
                    <div className="code-block">
                      <code className="text-xs">{query.query}</code>
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex gap-1">
                        {query.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last used {Math.floor((Date.now() - query.last_used.getTime()) / (1000 * 60 * 60))}h ago
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(query.query)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Log Snippets */}
        <TabsContent value="snippets" className="space-y-4">
          {filteredSnippets.map((snippet) => (
            <Card key={snippet.id} className="card-hover">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="font-medium">{snippet.title}</h3>
                    <div className="flex gap-1 mt-1">
                      {snippet.tags?.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(snippet.content)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <div className="code-block mb-3">
                  <pre className="text-xs whitespace-pre-wrap">{snippet.content}</pre>
                </div>
                {snippet.notes && (
                  <p className="text-sm text-muted-foreground bg-muted/30 rounded-md p-2">
                    <strong>Notes:</strong> {snippet.notes}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex gap-1">
                    {snippet.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {snippet.created_at
                      ? new Date(snippet.created_at).toLocaleDateString()
                      : "Unknown date"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Empty state */}
          {filteredSnippets.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <FileSearch className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-medium mb-1">No log snippets found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {snippets === null
                    ? "Loading..."
                    : "Save interesting log entries for reference and analysis"}
                </p>
                {snippets !== null && snippets.length === 0 && (
                  <Button size="sm" onClick={() => setActiveTab("queries")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Snippet
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}