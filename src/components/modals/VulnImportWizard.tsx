import { useState, useCallback } from "react";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertTriangle,
  Loader2,
  Link2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { addDays } from "date-fns";
import { Database } from "@/integrations/supabase/types";

interface VulnImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

type WizardStep = "upload" | "mapping" | "preview" | "import";

interface ParsedRow {
  [key: string]: string;
}

interface ColumnMapping {
  title: string;
  cve_id: string;
  cvss_score: string;
  severity: string;
  description: string;
  solution: string;
  plugin_id: string;
  host_ip: string;
  hostname: string;
  source: string;
}

interface DeduplicatedVuln {
  key: string;
  title: string;
  cve_id: string | null;
  cvss_score: number | null;
  severity: string;
  description: string | null;
  solution: string | null;
  source: string;
  plugin_id: string;
  affected_hosts: Array<{ ip: string; hostname: string }>;
  isNew: boolean;
  existingId?: string;
  linkedAssets: string[];
  cvssInvalid?: boolean;
}

const SLA_DAYS: Record<string, number> = {
  critical: 7,
  high: 14,
  medium: 30,
  low: 90,
  informational: 180,
};

const NESSUS_PRESETS: Partial<ColumnMapping> = {
  title: "Name",
  cve_id: "CVE",
  cvss_score: "CVSS v3.0 Base Score",
  severity: "Risk",
  description: "Synopsis",
  solution: "Solution",
  plugin_id: "Plugin ID",
  host_ip: "Host",
  hostname: "DNS Name",
};

const QUALYS_PRESETS: Partial<ColumnMapping> = {
  title: "Title",
  cve_id: "CVE ID",
  cvss_score: "CVSS Base",
  severity: "Severity",
  description: "Threat",
  solution: "Solution",
  plugin_id: "QID",
  host_ip: "IP",
  hostname: "DNS",
};

export function VulnImportWizard({ open, onOpenChange, onImportComplete }: VulnImportWizardProps) {
  const { activeWorkspace } = useWorkspace();
  const { user } = useAuth();
  
  const [step, setStep] = useState<WizardStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    title: "",
    cve_id: "",
    cvss_score: "",
    severity: "",
    description: "",
    solution: "",
    plugin_id: "",
    host_ip: "",
    hostname: "",
    source: "",
  });
  const [deduplicated, setDeduplicated] = useState<DeduplicatedVuln[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [scannerType, setScannerType] = useState<"nessus" | "qualys" | "custom">("custom");
  const [skipInformational, setSkipInformational] = useState(true);
  const [skipStats, setSkipStats] = useState({ noTitle: 0, informational: 0, hostMatched: 0, hostUnmatched: 0 });

  const resetWizard = () => {
    setStep("upload");
    setFile(null);
    setHeaders([]);
    setRows([]);
    setMapping({
      title: "",
      cve_id: "",
      cvss_score: "",
      severity: "",
      description: "",
      solution: "",
      plugin_id: "",
      host_ip: "",
      hostname: "",
      source: "",
    });
    setDeduplicated([]);
    setIsProcessing(false);
    setImportProgress(0);
    setScannerType("custom");
    setSkipStats({ noTitle: 0, informational: 0, hostMatched: 0, hostUnmatched: 0 });
  };

  const handleClose = () => {
    resetWizard();
    onOpenChange(false);
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setIsProcessing(true);

    try {
      const text = await uploadedFile.text();
      
      Papa.parse(text, {
        header: true,
        skipEmptyLines: "greedy",
        delimiter: "", // auto-detect
        complete: (results) => {
          const parsedHeaders = results.meta.fields?.map(h => h.trim()) || [];
          const parsedRows = results.data as ParsedRow[];
          
          setHeaders(parsedHeaders);
          setRows(parsedRows);

          // Auto-detect scanner type based on headers
          if (parsedHeaders.includes("Plugin ID") && parsedHeaders.includes("Risk")) {
            setScannerType("nessus");
            applyPreset("nessus", parsedHeaders);
          } else if (parsedHeaders.includes("QID") && parsedHeaders.includes("Severity")) {
            setScannerType("qualys");
            applyPreset("qualys", parsedHeaders);
          }

          toast.success(`Parsed ${parsedRows.length} rows, ${parsedHeaders.length} columns from CSV`);
          setIsProcessing(false);
        },
        error: (error) => {
          toast.error("Failed to parse CSV file: " + error.message);
          setIsProcessing(false);
        }
      });
    } catch (error) {
      toast.error("Failed to read CSV file");
      setIsProcessing(false);
    }
  }, []);

  const applyPreset = (type: "nessus" | "qualys", availableHeaders: string[]) => {
    const preset = type === "nessus" ? NESSUS_PRESETS : QUALYS_PRESETS;
    const newMapping = { ...mapping };

    (Object.keys(preset) as Array<keyof ColumnMapping>).forEach((field) => {
      const headerName = preset[field];
      if (headerName && availableHeaders.includes(headerName)) {
        newMapping[field] = headerName;
      }
    });

    setMapping(newMapping);
  };

  const isValidCVSS = (value: string): boolean => {
    if (!value || value.trim() === '') return true;
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0 && num <= 10 && value.match(/^\d+(\.\d)?$/) !== null;
  };

  const normalizeSeverity = (value: string): string => {
    const val = value.trim().toLowerCase();
    if (val === "critical" || val === "5") return "critical";
    if (val === "high" || val === "4") return "high";
    if (val === "medium" || val === "3") return "medium";
    if (val === "low" || val === "2") return "low";
    if (["none", "log", "info", "informational", "0", "1"].includes(val) || val.includes("info")) return "informational";
    return "informational"; // fallback to informational instead of medium
  };

  const extractCVEs = (text: string): string => {
    if (!text) return "";
    const matches = text.match(/CVE-\d{4}-\d{4,}/gi);
    if (!matches) return "";
    return Array.from(new Set(matches.map(c => c.toUpperCase()))).join(", ");
  };

  const processDeduplication = async () => {
    setIsProcessing(true);

    try {
      // Fetch existing vulnerabilities
      const { data: existingVulns } = await supabase
        .from("vulnerabilities")
        .select("id, title, cve_id, source")
        .eq("workspace_id", activeWorkspace?.id);

      // Fetch existing assets for linking
      const { data: existingAssets } = await supabase
        .from("assets")
        .select("id, ip_address, hostname")
        .eq("workspace_id", activeWorkspace?.id);

      const existingMap = new Map<string, { id: string; title: string }>();
      existingVulns?.forEach(v => {
        existingMap.set(v.title.toLowerCase(), { id: v.id, title: v.title });
      });

      const assetByIp = new Map<string, string>();
      const assetByHostname = new Map<string, string>();
      existingAssets?.forEach(a => {
        if (a.ip_address) assetByIp.set(String(a.ip_address).trim(), a.id);
        if (a.hostname) assetByHostname.set(a.hostname.trim().toLowerCase(), a.id);
      });

      const vulnMap = new Map<string, DeduplicatedVuln>();
      let noTitleCount = 0;
      let infoCount = 0;
      const matchedAssetIds = new Set<string>();
      const allAssetLinkAttempts = new Set<string>();

      rows.forEach(row => {
        const rawTitle = row[mapping.title] || "";
        const title = rawTitle.trim();
        if (!title) {
          noTitleCount++;
          return;
        }

        const severity = normalizeSeverity(row[mapping.severity] || "");
        if (skipInformational && severity === "informational") {
          infoCount++;
          return;
        }

        const pluginId = (row[mapping.plugin_id] || title).trim();
        const hostIp = (row[mapping.host_ip] || "").trim();
        const hostname = (row[mapping.hostname] || "").trim();
        
        const key = `${pluginId}-${title}`.toLowerCase();
        
        const cvssValue = row[mapping.cvss_score];
        const cvssValid = isValidCVSS(cvssValue);
        
        const assetId = (hostIp ? assetByIp.get(hostIp) : null) || (hostname ? assetByHostname.get(hostname.toLowerCase()) : null);
        
        if (hostIp || hostname) {
          allAssetLinkAttempts.add(`${hostIp}|${hostname}`);
          if (assetId) matchedAssetIds.add(`${hostIp}|${hostname}`);
        }

        if (vulnMap.has(key)) {
          const existing = vulnMap.get(key)!;
          const hostExists = existing.affected_hosts.some(
            h => h.ip === hostIp && h.hostname === hostname
          );
          if (!hostExists && (hostIp || hostname)) {
            existing.affected_hosts.push({ ip: hostIp, hostname });
            if (assetId && !existing.linkedAssets.includes(assetId)) {
              existing.linkedAssets.push(assetId);
            }
            if (!cvssValid) {
              existing.cvssInvalid = true;
            }
          }
        } else {
          const linkedAssets: string[] = [];
          if (assetId) linkedAssets.push(assetId);

          const existingVuln = existingMap.get(title.toLowerCase());
          const cve_id = extractCVEs(row[mapping.cve_id] || "");

          vulnMap.set(key, {
            key,
            title,
            cve_id,
            cvss_score: cvssValue && cvssValid ? parseFloat(cvssValue) : null,
            severity,
            description: row[mapping.description] || null,
            solution: row[mapping.solution] || null,
            source: row[mapping.source] || scannerType.charAt(0).toUpperCase() + scannerType.slice(1),
            plugin_id: pluginId,
            affected_hosts: hostIp || hostname ? [{ ip: hostIp, hostname }] : [],
            isNew: !existingVuln,
            existingId: existingVuln?.id,
            linkedAssets,
            cvssInvalid: !cvssValid && !!cvssValue,
          });
        }
      });

      setSkipStats({ 
        noTitle: noTitleCount, 
        informational: infoCount,
        hostMatched: matchedAssetIds.size,
        hostUnmatched: allAssetLinkAttempts.size - matchedAssetIds.size
      });
      setDeduplicated(Array.from(vulnMap.values()));
      setStep("preview");
    } catch (error) {
      console.error("Deduplication error:", error);
      toast.error("Failed to process vulnerabilities");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!activeWorkspace?.id || !user?.id) {
      toast.error("Workspace or user not found");
      return;
    }

    setIsProcessing(true);
    setStep("import");
    setImportProgress(0);

    const total = deduplicated.length;
    let processed = 0;
    let created = 0;
    let updated = 0;
    let errors = 0;

    try {
      for (const vuln of deduplicated) {
        try {
          if (vuln.isNew) {
            const slaDueDate = addDays(new Date(), SLA_DAYS[vuln.severity] || 30);
            
            const { data: newVuln, error } = await supabase
              .from("vulnerabilities")
              .insert({
                title: vuln.title,
                cve_id: vuln.cve_id,
                cvss_score: vuln.cvss_score,
                severity: vuln.severity as Database["public"]["Enums"]["vuln_severity"],
                description: vuln.description,
                solution: vuln.solution,
                source: vuln.source,
                status: "new",
                first_detected: new Date().toISOString(),
                sla_due_date: slaDueDate.toISOString().split("T")[0],
                user_id: user.id,
                workspace_id: activeWorkspace.id,
              })
              .select("id")
              .single();

            if (error) throw error;

            if (newVuln && vuln.linkedAssets.length > 0) {
              const assetLinks = vuln.linkedAssets.map(assetId => ({
                vulnerability_id: newVuln.id,
                asset_id: assetId,
              }));
              await supabase.from("vuln_assets").insert(assetLinks);
            }

            created++;
          } else if (vuln.existingId) {
            await supabase
              .from("vulnerabilities")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", vuln.existingId);

            if (vuln.linkedAssets.length > 0) {
              const { data: existingLinks } = await supabase
                .from("vuln_assets")
                .select("asset_id")
                .eq("vulnerability_id", vuln.existingId);

              const existingAssetIds = new Set(existingLinks?.map(l => l.asset_id) || []);
              const newAssetLinks = vuln.linkedAssets
                .filter(id => !existingAssetIds.has(id))
                .map(assetId => ({
                  vulnerability_id: vuln.existingId!,
                  asset_id: assetId,
                }));

              if (newAssetLinks.length > 0) {
                await supabase.from("vuln_assets").insert(newAssetLinks);
              }
            }

            updated++;
          }
        } catch (err) {
          errors++;
          console.error("Failed to import vulnerability:", vuln.title, err);
        }

        processed++;
        setImportProgress(Math.round((processed / total) * 100));
      }

      toast.success(`Import complete: ${created} created, ${updated} updated, ${errors} errors`);
      onImportComplete?.();
      handleClose();
    } catch (error) {
      toast.error("Import failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const newCount = deduplicated.filter(v => v.isNew).length;
  const updateCount = deduplicated.filter(v => !v.isNew).length;
  const linkedCount = deduplicated.filter(v => v.linkedAssets.length > 0).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Vulnerabilities from CSV
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-4 border-b">
          {(["upload", "mapping", "preview", "import"] as WizardStep[]).map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : ["mapping", "preview", "import"].indexOf(step) > ["upload", "mapping", "preview", "import"].indexOf(s)
                    ? "bg-success text-success-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {["mapping", "preview", "import"].indexOf(step) > i ? (
                  <Check className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 3 && (
                <div
                  className={`w-12 h-0.5 mx-1 ${
                    ["mapping", "preview", "import"].indexOf(step) > i ? "bg-success" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="p-6 space-y-6">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  Upload a CSV file from Nessus, Qualys, or any vulnerability scanner
                </p>
              </div>

              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  file ? "border-success bg-success/5" : "border-muted-foreground/25 hover:border-primary/50"
                }`}
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                  disabled={isProcessing}
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  {isProcessing ? (
                    <Loader2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-spin" />
                  ) : file ? (
                    <Check className="h-12 w-12 mx-auto mb-4 text-success" />
                  ) : (
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  )}
                  <p className="text-lg font-medium">
                    {file ? file.name : "Drop CSV file here or click to browse"}
                  </p>
                  {file && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {rows.length} rows · {headers.length} columns
                    </p>
                  )}
                </label>
              </div>

              {file && headers.length > 0 && (
                <div className="flex justify-end">
                  <Button onClick={() => setStep("mapping")}>
                    Continue to Column Mapping
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Mapping */}
          {step === "mapping" && (
            <div className="p-6 space-y-6 overflow-auto max-h-[60vh]">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">
                  Map CSV columns to vulnerability fields
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setScannerType("nessus");
                      applyPreset("nessus", headers);
                    }}
                    className={scannerType === "nessus" ? "border-primary" : ""}
                  >
                    Nessus
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setScannerType("qualys");
                      applyPreset("qualys", headers);
                    }}
                    className={scannerType === "qualys" ? "border-primary" : ""}
                  >
                    Qualys
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: "title", label: "Title *", required: true },
                  { key: "plugin_id", label: "Plugin ID *", required: true },
                  { key: "host_ip", label: "Host IP", required: false },
                  { key: "hostname", label: "Hostname", required: false },
                  { key: "cve_id", label: "CVE ID", required: false },
                  { key: "cvss_score", label: "CVSS Score", required: false },
                  { key: "severity", label: "Severity", required: false },
                  { key: "description", label: "Description", required: false },
                  { key: "solution", label: "Solution", required: false },
                  { key: "source", label: "Source", required: false },
                ].map(({ key, label, required }) => (
                  <div key={key} className="space-y-2">
                    <Label className={required ? "text-foreground" : "text-muted-foreground"}>
                      {label}
                    </Label>
                    <Select
                      value={mapping[key as keyof ColumnMapping] || ""}
                      onValueChange={(value) =>
                        setMapping((prev) => ({ ...prev, [key]: value === "_none_" ? "" : value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none_">-- Not Mapped --</SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="flex items-center space-x-2 pt-4">
                <Checkbox 
                  id="skip-info" 
                  checked={skipInformational} 
                  onCheckedChange={(checked) => setSkipInformational(!!checked)}
                />
                <Label htmlFor="skip-info" className="cursor-pointer">
                  Skip informational findings (Log, Info, etc.)
                </Label>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep("upload")}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={processDeduplication}
                  disabled={!mapping.title || !mapping.plugin_id || isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Process & Preview
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === "preview" && (
            <div className="p-6 space-y-4 overflow-hidden flex flex-col max-h-[60vh]">
              {/* Summary Stats */}
              <div className="flex gap-4 flex-wrap">
                <Badge variant="outline" className="px-3 py-1">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {deduplicated.length} unique vulnerabilities
                </Badge>
                <Badge variant="outline" className="bg-success/10 text-success border-success/30 px-3 py-1">
                  {newCount} new
                </Badge>
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 px-3 py-1">
                  {updateCount} to update
                </Badge>
                <Badge variant="outline" className="px-3 py-1">
                  <Link2 className="h-3 w-3 mr-1" />
                  {skipStats.hostMatched} hosts matched to assets, {skipStats.hostUnmatched} unmatched
                </Badge>
                {skipStats.noTitle > 0 && (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 px-3 py-1">
                    {skipStats.noTitle} rows skipped (no title)
                  </Badge>
                )}
                {skipStats.informational > 0 && (
                  <Badge variant="outline" className="bg-muted text-muted-foreground px-3 py-1">
                    {skipStats.informational} informational skipped
                  </Badge>
                )}
              </div>

              {/* Preview Table */}
              <ScrollArea className="flex-1 border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="table-header">
                      <TableHead>Status</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>CVE</TableHead>
                      <TableHead>CVSS</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Hosts</TableHead>
                      <TableHead>Assets</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deduplicated.slice(0, 100).map((vuln) => (
                      <TableRow key={vuln.key}>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              vuln.isNew
                                ? "bg-success/10 text-success border-success/30"
                                : "bg-warning/10 text-warning border-warning/30"
                            }
                          >
                            {vuln.isNew ? "New" : "Update"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate font-medium">
                          {vuln.title}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {vuln.cve_id || "-"}
                        </TableCell>
                        <TableCell>
                          {vuln.cvssInvalid ? (
                            <span className="text-destructive font-medium">Invalid</span>
                          ) : vuln.cvss_score !== null ? (
                            <span>{vuln.cvss_score.toFixed(1)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`severity-${vuln.severity} text-xs`}
                          >
                            {vuln.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>{vuln.affected_hosts.length}</TableCell>
                        <TableCell>
                          {vuln.linkedAssets.length > 0 ? (
                            <Badge variant="secondary" className="text-xs">
                              <Link2 className="h-3 w-3 mr-1" />
                              {vuln.linkedAssets.length}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {deduplicated.length > 100 && (
                  <p className="text-center text-sm text-muted-foreground py-2">
                    Showing first 100 of {deduplicated.length} vulnerabilities
                  </p>
                )}
              </ScrollArea>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep("mapping")}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleImport} disabled={deduplicated.length === 0 || deduplicated.some(v => v.cvssInvalid)}>
                  Import {deduplicated.length} Vulnerabilities (after skips)
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Import Progress */}
          {step === "import" && (
            <div className="p-6 space-y-6 flex flex-col items-center justify-center min-h-[300px]">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <div className="w-full max-w-md space-y-2">
                <Progress value={importProgress} className="h-2" />
                <p className="text-center text-muted-foreground">
                  Importing vulnerabilities... {importProgress}%
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}