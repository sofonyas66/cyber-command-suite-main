import { useEffect, useState } from "react";
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
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";

const kpiData = [
  {
    title: "Open Vulnerabilities",
    value: "47",
    change: "-12%",
    trend: "down",
    icon: ShieldAlert,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
  {
    title: "Active Incidents",
    value: "3",
    change: "+1",
    trend: "up",
    icon: AlertTriangle,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    title: "Assets Monitored",
    value: "156",
    change: "+8",
    trend: "up",
    icon: Server,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    title: "Active Detections",
    value: "24",
    change: "+3",
    trend: "up",
    icon: Radar,
    color: "text-chart-1",
    bgColor: "bg-chart-1/10",
  },
];

const detectionStats = {
  total: 28,
  enabled: 24,
  triggered: 12,
  techniques: 15,
};

const mitreDistribution = [
  { technique: "T1059", count: 5, name: "Command & Scripting" },
  { technique: "T1110", count: 4, name: "Brute Force" },
  { technique: "T1021", count: 3, name: "Remote Services" },
  { technique: "T1548", count: 3, name: "Privilege Escalation" },
  { technique: "T1071", count: 2, name: "Application Layer Protocol" },
];

const vulnBySeverity = [
  { name: "Critical", value: 5, color: "hsl(var(--destructive))" },
  { name: "High", value: 12, color: "hsl(25, 95%, 53%)" },
  { name: "Medium", value: 18, color: "hsl(38, 92%, 50%)" },
  { name: "Low", value: 12, color: "hsl(var(--success))" },
];

const vulnTrend = [
  { date: "Dec 1", new: 8, resolved: 5 },
  { date: "Dec 5", new: 12, resolved: 10 },
  { date: "Dec 9", new: 6, resolved: 8 },
  { date: "Dec 13", new: 15, resolved: 12 },
  { date: "Dec 17", new: 9, resolved: 14 },
  { date: "Dec 19", new: 7, resolved: 11 },
];

const recentAlerts = [
  {
    id: 1,
    title: "Critical RCE vulnerability detected",
    severity: "critical",
    asset: "dc01.corp.local",
    time: "15 min ago",
  },
  {
    id: 2,
    title: "Unusual login pattern detected",
    severity: "high",
    asset: "vpn-gateway-01",
    time: "1 hour ago",
  },
  {
    id: 3,
    title: "SSL certificate expiring soon",
    severity: "medium",
    asset: "webserver-prod-02",
    time: "3 hours ago",
  },
  {
    id: 4,
    title: "Firewall rule audit required",
    severity: "low",
    asset: "fw-edge-01",
    time: "5 hours ago",
  },
];

const upcomingTasks = [
  { id: 1, title: "Review Q4 incident reports", due: "Today", priority: "high" },
  { id: 2, title: "Update VPN runbook", due: "Tomorrow", priority: "medium" },
  { id: 3, title: "Patch Windows servers", due: "Dec 22", priority: "critical" },
  { id: 4, title: "Security awareness training", due: "Dec 25", priority: "low" },
];

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

  const [openVulns, setOpenVulns] = useState<number | null>(null);
  const [activeIncidents, setActiveIncidents] = useState<number | null>(null);
  const [assetsCount, setAssetsCount] = useState<number | null>(null);
  const [activeDetectionsCount, setActiveDetectionsCount] = useState<number | null>(null);
  const [detectionStatsState, setDetectionStatsState] = useState<any | null>(null);
  const [mitreDistState, setMitreDistState] = useState<any[] | null>(null);
  const [recentAlertsState, setRecentAlertsState] = useState<any[] | null>(null);

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

        setDetectionStatsState({ total: totalDet, enabled: enabledDet, triggered: 0, techniques: mitreArr.length });
        setMitreDistState(mitreArr.slice(0, 5));

        // Recent alerts (incidents)
        let incQuery = supabase.from('incidents').select('id, title, severity, opened_at, created_at').order('created_at', { ascending: false }).limit(10);
        if (activeWorkspace?.id) incQuery = incQuery.eq('workspace_id', activeWorkspace.id as any);
        const { data: recentInc } = await incQuery;
        setRecentAlertsState((recentInc || []).map((i: any) => ({ id: i.id, title: i.title, severity: i.severity, asset: '-', time: i.created_at || i.opened_at })));
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      }
    }

    fetchDashboard();
  }, [activeWorkspace?.id]);

  // Build display values using fetched state with fallbacks to static mocks
  const kpis = [
    {
      ...kpiData[0],
      value: openVulns !== null ? String(openVulns) : kpiData[0].value,
    },
    {
      ...kpiData[1],
      value: activeIncidents !== null ? String(activeIncidents) : kpiData[1].value,
    },
    {
      ...kpiData[2],
      value: assetsCount !== null ? String(assetsCount) : kpiData[2].value,
    },
    {
      ...kpiData[3],
      value: activeDetectionsCount !== null ? String(activeDetectionsCount) : kpiData[3].value,
    },
  ];

  const detectionStatsDisplay = detectionStatsState ?? detectionStats;
  const mitreDistributionDisplay = mitreDistState && mitreDistState.length > 0 ? mitreDistState : mitreDistribution;
  const recentAlertsDisplay = recentAlertsState && recentAlertsState.length > 0 ? recentAlertsState : recentAlerts;

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
          <span>Last scan: Today at 09:45 AM</span>
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
                      <TrendingUp
                        className={`h-3 w-3 ${kpi.trend === "down" ? "text-success rotate-180" : "text-muted-foreground"}`}
                      />
                      <span className={`text-xs ${kpi.trend === "down" ? "text-success" : "text-muted-foreground"}`}>
                        {kpi.change} from last week
                      </span>
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
                <LineChart data={vulnTrend}>
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
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={vulnBySeverity}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {vulnBySeverity.map((entry, index) => (
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
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {vulnBySeverity.map((item) => (
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
            <div className="space-y-3">
              {mitreDistributionDisplay.map((item) => (
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
              <Button variant="ghost" size="sm" className="text-xs">
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAlertsDisplay.map((alert) => (
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
            ))}
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Upcoming Tasks</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs">
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <input type="checkbox" className="h-4 w-4 rounded border-border" />
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
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Activity className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">99.7%</p>
              <p className="text-xs text-muted-foreground">Uptime (30d)</p>
            </div>
            <div className="text-center">
              <ShieldAlert className="h-5 w-5 mx-auto text-destructive mb-1" />
              <p className="text-2xl font-bold">2.4d</p>
              <p className="text-xs text-muted-foreground">Avg. MTTR</p>
            </div>
            <div className="text-center">
              <CheckCircle2 className="h-5 w-5 mx-auto text-success mb-1" />
              <p className="text-2xl font-bold">127</p>
              <p className="text-xs text-muted-foreground">Vulns Fixed (MTD)</p>
            </div>
            <div className="text-center">
              <Clock className="h-5 w-5 mx-auto text-warning mb-1" />
              <p className="text-2xl font-bold">5</p>
              <p className="text-xs text-muted-foreground">SLA Breaches</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
