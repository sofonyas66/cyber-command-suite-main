import { useState } from "react";
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

const demoQueries = [
  {
    id: "1",
    title: "Failed SSH Logins",
    query: 'source="auth.log" "Failed password" | stats count by src_ip | sort -count',
    log_source: "Splunk",
    description: "Detect brute force SSH attempts",
    tags: ["ssh", "brute-force", "auth"],
    starred: true,
    last_used: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: "2",
    title: "Windows Event 4625",
    query: 'index=windows EventCode=4625 | table _time, Account_Name, Workstation_Name, Failure_Reason',
    log_source: "Splunk",
    description: "Failed Windows logon attempts",
    tags: ["windows", "auth", "4625"],
    starred: true,
    last_used: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  {
    id: "3",
    title: "Firewall Denies",
    query: 'action:blocked OR action:denied | stats count by src.ip, dst.port | sort -count | head 20',
    log_source: "ELK",
    description: "Top blocked connections",
    tags: ["firewall", "network"],
    starred: false,
    last_used: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
  },
  {
    id: "4",
    title: "PowerShell Execution",
    query: 'EventCode=4104 | regex ScriptBlockText="(?i)(invoke-|iex|downloadstring|webclient)"',
    log_source: "Splunk",
    description: "Suspicious PowerShell commands",
    tags: ["powershell", "hunting", "execution"],
    starred: false,
    last_used: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
  },
];

const demoSnippets = [
  {
    id: "1",
    title: "Suspicious Base64 Decode",
    content: `Dec 19 14:32:15 webserver-01 nginx: 10.0.2.45 - - [19/Dec/2024:14:32:15 +0000] "GET /api/exec?cmd=cG93ZXJzaGVsbCAtZW5jb2RlZGNvbW1hbmQgSUVY... HTTP/1.1" 200 1234`,
    notes: "Possible command injection attempt via base64 encoded payload",
    tags: ["injection", "suspicious"],
    created: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: "2",
    title: "Credential Dumping Alert",
    content: `2024-12-19T10:15:23.456Z LSASS.exe accessed by mimikatz.exe (PID: 4532)
Process: C:\\Users\\admin\\Desktop\\mimikatz.exe
User: CORP\\admin
Access: 0x1010`,
    notes: "Credential harvesting detected - IR required",
    tags: ["credential-theft", "incident"],
    created: new Date(Date.now() - 1000 * 60 * 60 * 4),
  },
];

export default function LogsQueries() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("queries");

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
          {demoQueries.map((query) => (
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
          {demoSnippets.map((snippet) => (
            <Card key={snippet.id} className="card-hover">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="font-medium">{snippet.title}</h3>
                    <div className="flex gap-1 mt-1">
                      {snippet.tags.map((tag) => (
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
              </CardContent>
            </Card>
          ))}

          {/* Empty state */}
          {demoSnippets.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <FileSearch className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-medium mb-1">No log snippets yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Save interesting log entries for reference and analysis
                </p>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Snippet
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
