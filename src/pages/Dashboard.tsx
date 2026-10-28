import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ShieldAlert,
  Server,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Activity,
  Calendar,
  ArrowRight,
  ExternalLink,
  Radar,
  Shield,
  Search,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { format, subWeeks, startOfWeek, endOfWeek, differenceInDays } from "date-fns";

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical":
      return "severity-critical";
    case "high":
      return "severity-high";
    case "medium":
      return "severity-medium";
    case "low":
      return "severity-low";
    default:
      return "severity-info";
  }
};

export default function Dashboard() {
  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();

  const [openVulns, setOpenVulns] = useState<number | null>(null);
  const [activeIncidents, setActiveIncidents] = useState<number | null>(null);
  const [assetsCount, setAssetsCount] = useState<number | null>(null);
  const [activeDetectionsCount, setActiveDetectionsCount] = useState<number | null>(null);
  const [detectionStatsState, setDetectionStatsState] = useState<any | null>(null);
  const [mitreDistState, setMitreDistState] = useState<any[] | null>(null);
  const [recentAlertsState, setRecentAlertsState] = useState<any[] | null>(null);
  const [vulnTrendState, setVulnTrendState] = useState<any[] | null>(null);
  const [vulnBySeverityState, setVulnBySeverityState] = useState<any[] | null>(null);
  const [upcomingTasksState, setUpcomingTasksState] = useState<any[] | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);

  useEffect(() => {
    const workspaceFilter = (q: any) => (activeWorkspace?.id ? q.eq('workspace_id', activeWorkspace.id) : q);

    async function fetchDashboard() {
      try {
        // KPI counts
        const vulnQ = workspaceFilter(supabase.from('vulnerabilities').select('id', { count: 'exact' })).neq('status', 'mitigated');
        const incQ = workspaceFilter(supabase.from('incidents').select('id', { count: 'exact' })).neq('status', 'closed');
        const assetsQ = workspaceFilter(supabase.from('assets').select('id', { count: 'exact' }));
        const detQ = workspaceFilter(supabase.from('detections').select('id', { count: 'exact' })).eq('enabled', true);

        const [vulnsRes, incRes, assetsRes, detRes] = await Promise.all([vulnQ, incQ, assetsQ, detQ]);

        setOpenVulns(vulnsRes.count ?? 0);
        setActiveIncidents(incRes.count ?? 0);
        setAssetsCount(assetsRes.count ?? 0);
        setActiveDetectionsCount(detRes.count ?? 0);

        // Detection stats: total, enabled, techniques
        const detAllRes = await workspaceFilter(supabase.from('detections').select('id, enabled, mitre_techniques').limit(1000));
        const totalDet = detAllRes.data?.length ?? 0;
        const enabledDet = detAllRes.data?.filter((d: any) => d.enabled).length ?? 0;

        // count techniques
        const techniqueCounts: Record<string, number> = {};
        (detAllRes.data || []).forEach((d: any) => {
          (d.mitre_techniques || []).forEach((t: string) => {
            techniqueCounts[t] = (techniqueCounts[t] || 0) + 1;
          });
        });

        const mitreArr = Object.keys(techniqueCounts).map(k => ({ technique: k, count: techniqueCounts[k], name: k }));
        mitreArr.sort((a, b) => b.count - a.count);

        // TODO: needs real "fired in last 7 days" query using detections.last_fired_at
        setDetectionStatsState({ total: totalDet, enabled: enabledDet, triggered: 0, techniques: mitreArr.length });
        setMitreDistState(mitreArr.slice(0, 5));

        // Recent alerts (incidents)
        let incQuery = supabase.from('incidents').select('id, title, severity, opened_at, created_at').order('created_at', { ascending: false }).limit(10);
        if (activeWorkspace?.id) incQuery = incQuery.eq('workspace_id', activeWorkspace.id);
        const { data: recentInc } = await incQuery;
        setRecentAlertsState((recentInc || []).map((i: any) => {
          let timeDisplay = "-";
          const rawTime = i.created_at || i.opened_at;
          if (rawTime) {
            const d = new Date(rawTime);
            if (!isNaN(d.getTime())) timeDisplay = format(d, "MMM d, h:mm a");
          }
          return {
            id: i.id,
            title: i.title,
            severity: i.severity,
            asset: '-',
            time: timeDisplay,
          };
        }));

        // 1. Vulnerability Trend: last 6 weekly buckets
        let vulnTrendQuery = workspaceFilter(supabase.from('vulnerabilities').select('first_detected, updated_at, status').limit(2000));
        const { data: vulnTrendData } = await vulnTrendQuery;

        const now = new Date();
        const weeks = [5, 4, 3, 2, 1, 0].map((weeksAgo) => {
          const target = subWeeks(now, weeksAgo);
          const start = startOfWeek(target);
          const end = endOfWeek(target);
          return {
            label: format(start, "MMM d"),
            start,
            end,
            new: 0,
            resolved: 0,
          };
        });

        (vulnTrendData || []).forEach((v: any) => {
          if (v.first_detected) {
            const d = new Date(v.first_detected);
            if (!isNaN(d.getTime())) {
              const bucket = weeks.find((w) => d >= w.start && d <= w.end);
              if (bucket) bucket.new += 1;
            }
          }
          if (v.status === 'mitigated' && v.updated_at) {
            const d = new Date(v.updated_at);
            if (!isNaN(d.getTime())) {
              const bucket = weeks.find((w) => d >= w.start && d <= w.end);
              if (bucket) bucket.resolved += 1;
            }
          }
        });

        setVulnTrendState(weeks.map((w) => ({ date: w.label, new: w.new, resolved: w.resolved })));

        // 2. Vulnerability By Severity: group by severity where status != 'mitigated'
        let vulnSevQuery = workspaceFilter(supabase.from('vulnerabilities').select('severity').neq('status', 'mitigated').limit(2000));
        const { data: vulnSevData } = await vulnSevQuery;

        const sevCounts = { critical: 0, high: 0, medium: 0, low: 0 };
        (vulnSevData || []).forEach((v: any) => {
          const s = (v.severity || '').toLowerCase();
          if (s in sevCounts) {
            sevCounts[s as keyof typeof sevCounts] += 1;
          }
        });

        setVulnBySeverityState([
          { name: "Critical", value: sevCounts.critical, color: "hsl(var(--destructive))" },
          { name: "High", value: sevCounts.high, color: "hsl(25, 95%, 53%)" },
          { name: "Medium", value: sevCounts.medium, color: "hsl(38, 92%, 50%)" },
          { name: "Low", value: sevCounts.low, color: "hsl(var(--success))" },
        ]);

        // 3. Upcoming Tasks: where status != 'completed' order by due_date asc limit 4
        let tasksQuery = workspaceFilter(supabase.from('tasks').select('id, title, due_date, priority').neq('status', 'completed').order('due_date', { ascending: true }).limit(4));
        const { data: tasksData } = await tasksQuery;

        setUpcomingTasksState((tasksData || []).map((t: any) => {
          let dueStr = "No due date";
          if (t.due_date) {
            const d = new Date(t.due_date);
            if (!isNaN(d.getTime())) {
              const diff = differenceInDays(d, new Date());
              if (diff === 0) dueStr = "Today";
              else if (diff === 1) dueStr = "Tomorrow";
              else dueStr = format(d, "MMM d");
            }
          }
          return {
            id: t.id,
            title: t.title,
            due: dueStr,
            priority: t.priority || "medium",
          };
        }));

        // Last scan text from most recent sync_runs.started_at across workspace integrations
        let lastScanStr = "No syncs yet";
        let integrationIds: string[] = [];
        if (activeWorkspace?.id) {
          const { data: ints } = await supabase.from('integrations').select('id').eq('workspace_id', activeWorkspace.id);
          integrationIds = (ints || []).map((i) => i.id);
        } else {
          const { data: ints } = await supabase.from('integrations').select('id');
          integrationIds = (ints || []).map((i) => i.id);
        }

        if (integrationIds.length > 0) {
          const { data: syncs } = await supabase
            .from('sync_runs')
            .select('started_at')
            .in('integration_id', integrationIds)
            .order('started_at', { ascending: false })
            .limit(1);

          if (syncs && syncs.length > 0 && syncs[0].started_at) {
            const d = new Date(syncs[0].started_at);
            if (!isNaN(d.getTime())) {
              lastScanStr = format(d, "MMM d, h:mm a");
            }
          }
        }
        setLastScan(lastScanStr);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      }
    }

    fetchDashboard();
  }, [activeWorkspace?.id]);

  // Build display values using fetched state with fallbacks to static mocks
  const kpiLabels = [
    { title: "Open Vulnerabilities", icon: ShieldAlert, color: "text-destructive", bgColor: "bg-destructive/10", trend: "down" },
    { title: "Active Incidents", icon: AlertTriangle, color: "text-warning", bgColor: "bg-warning/10", trend: "up" },
    { title: "Assets Monitored", icon: Server, color: "text-primary", bgColor: "bg-primary/10", trend: "up" },
    { title: "Active Detections", icon: Radar, color: "text-chart-1", bgColor: "bg-chart-1/10", trend: "up" },
  ];

  const kpis = [
    { ...kpiLabels[0], value: openVulns === null ? "—" : String(openVulns ?? "—") },
    { ...kpiLabels[1], value: activeIncidents === null ? "—" : String(activeIncidents ?? "—") },
    { ...kpiLabels[2], value: assetsCount === null ? "—" : String(assetsCount ?? "—") },
    { ...kpiLabels[3], value: activeDetectionsCount === null ? "—" : String(activeDetectionsCount ?? "—") },
  ];

  const detectionStatsDisplay = detectionStatsState ?? { total: 0, enabled: 0, triggered: 0, techniques: 0 };
  const sourceMitreDistribution = mitreDistState === null ? [] : mitreDistState;
  const sourceRecentAlerts = recentAlertsState === null ? [] : recentAlertsState;
  const sourceVulnTrend = vulnTrendState === null ? [] : vulnTrendState;
  const sourceVulnBySeverity = vulnBySeverityState === null ? [] : vulnBySeverityState;
  const sourceUpcomingTasks = upcomingTasksState === null ? [] : upcomingTasksState;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back. Here's your security posture overview.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{lastScan === null ? "Loading sync info..." : lastScan === "No syncs yet" ? "No syncs yet" : `Last scan: ${lastScan}`}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title} className="card-hover">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{kpi.title}</p>
                    <p className="text-3xl font-bold mt-1">{kpi.value}</p>
                    <div className="flex items-center gap-1 mt-2">
                    </div>
                  </div>
                  <div className={`p-2.5 rounded-lg ${kpi.bgColor}`}>
                    <Icon className={`h-5 w-5 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vulnerability Trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Vulnerability Trend</CardTitle>
            <CardDescription>New vs resolved vulnerabilities over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sourceVulnTrend}>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="new"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="resolved"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-destructive" />
                <span className="text-xs text-muted-foreground">New</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-success" />
                <span className="text-xs text-muted-foreground">Resolved</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Severity Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">By Severity</CardTitle>
            <CardDescription>Open vulnerabilities breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              {sourceVulnBySeverity.every((s: any) => s.value === 0) ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                  <Shield className="h-8 w-8 opacity-40" />
                  <p className="text-sm">No open vulnerabilities</p>
                </div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceVulnBySeverity}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {sourceVulnBySeverity.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {sourceVulnBySeverity.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                  <span className="text-xs font-medium ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detections & MITRE Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Detection Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Radar className="h-5 w-5 text-chart-1" />
              Detection Coverage
            </CardTitle>
            <CardDescription>Active detection rules overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{detectionStatsDisplay.total}</p>
                  <p className="text-xs text-muted-foreground">Total Rules</p>
                </div>
                <div className="p-3 rounded-lg bg-success/10">
                  <p className="text-2xl font-bold text-success">{detectionStatsDisplay.enabled}</p>
                  <p className="text-xs text-muted-foreground">Enabled</p>
                </div>
                <div className="p-3 rounded-lg bg-warning/10">
                  <p className="text-2xl font-bold text-warning">{detectionStatsDisplay.triggered}</p>
                  <p className="text-xs text-muted-foreground">Triggered (7d)</p>
                </div>
                <div className="p-3 rounded-lg bg-chart-1/10">
                  <p className="text-2xl font-bold text-chart-1">{detectionStatsDisplay.techniques}</p>
                  <p className="text-xs text-muted-foreground">MITRE Techniques</p>
                </div>
            </div>
          </CardContent>
        </Card>

        {/* MITRE Techniques */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Top MITRE ATT&CK Techniques
            </CardTitle>
            <CardDescription>Detection coverage by technique</CardDescription>
          </CardHeader>
          <CardContent>
            {sourceMitreDistribution.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                <Shield className="h-8 w-8 opacity-40" />
                <p className="text-sm">No detection rules yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sourceMitreDistribution.map((item) => (
                  <div key={item.technique} className="flex items-center gap-3">
                    <Badge variant="secondary" className="font-mono text-xs min-w-[60px] justify-center">
                      {item.technique}
                    </Badge>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">{item.name}</span>
                        <span className="text-sm font-medium">{item.count} rules</span>
                      </div>
                      <Progress value={(item.count / 5) * 100} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Alerts</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/incidents")}>
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {sourceRecentAlerts.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                <AlertTriangle className="h-8 w-8 opacity-40" />
                <p className="text-sm">No recent incidents</p>
              </div>
            ) : (
              sourceRecentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className={`status-badge ${getSeverityColor(alert.severity)}`}>
                    {alert.severity}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{alert.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Server className="h-3 w-3" />
                      <span className="truncate">{alert.asset}</span>
                      <span>•</span>
                      <Clock className="h-3 w-3" />
                      <span>{alert.time}</span>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Upcoming Tasks</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/settings")}>
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {sourceUpcomingTasks.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="h-8 w-8 opacity-40" />
                <p className="text-sm">No upcoming tasks</p>
              </div>
            ) : (
              sourceUpcomingTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <input type="checkbox" className="h-4 w-4 rounded border-border" readOnly />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${getSeverityColor(task.priority)}`}
                      >
                        {task.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground">Due: {task.due}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Bar removed: Uptime and MTTR have no real data source in the schema and displaying fake metrics is misleading */}
    </div>
  );
}