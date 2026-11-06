import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface Subnet {
  id: string;
  name: string;
  cidr: string;
  site_id?: string | null;
  vlan_id?: number | null;
  firewall_zone?: string | null;
  gateway?: string | null;
  dns_servers?: string[] | null;
  description?: string | null;
  routing_notes?: string | null;
  tags?: string[] | null;
}

interface SubnetFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  existingZones?: string[];
  subnet?: Subnet | null;
}

export default function SubnetFormModal({
  open,
  onOpenChange,
  onSaved,
  existingZones = [],
  subnet,
}: SubnetFormModalProps) {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    name: "",
    cidr: "",
    site_id: "none",
    vlan_id: "",
    firewall_zone: "Internal",
    gateway: "",
    dns_servers: "",
    description: "",
    routing_notes: "",
    tags: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  useEffect(() => {
    if (open && activeWorkspace?.id) {
      fetchSites();
    }
  }, [open, activeWorkspace?.id]);

  useEffect(() => {
    if (subnet) {
      setForm({
        name: subnet.name || "",
        cidr: subnet.cidr || "",
        site_id: subnet.site_id || "none",
        vlan_id: subnet.vlan_id?.toString() || "",
        firewall_zone: subnet.firewall_zone || "Internal",
        gateway: subnet.gateway || "",
        dns_servers: subnet.dns_servers?.join(", ") || "",
        description: subnet.description || "",
        routing_notes: subnet.routing_notes || "",
        tags: subnet.tags?.join(", ") || "",
      });
    } else {
      setForm({
        name: "",
        cidr: "",
        site_id: "none",
        vlan_id: "",
        firewall_zone: "Internal",
        gateway: "",
        dns_servers: "",
        description: "",
        routing_notes: "",
        tags: "",
      });
    }
    setErrors({});
    setDuplicateWarning(null);
  }, [subnet, open]);

  const fetchSites = async () => {
    const { data, error } = await supabase
      .from("sites")
      .select("id, name")
      .eq("workspace_id", activeWorkspace?.id as string);
    if (!error && data) {
      setSites(data);
    }
  };

  const isValidIPv4 = (ip: string) => {
    const parts = ip.split(".");
    if (parts.length !== 4) return false;
    return parts.every((part) => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255 && num.toString() === part;
    });
  };

  const isValidCIDR = (cidr: string) => {
    const parts = cidr.split("/");
    if (parts.length !== 2) return false;
    const [ip, prefix] = parts;
    if (!isValidIPv4(ip)) return false;
    const p = parseInt(prefix, 10);
    return !isNaN(p) && p >= 0 && p <= 32 && p.toString() === prefix;
  };

  const ipToLong = (ip: string) => {
    return ip.split(".").reduce((acc, part) => (acc << 8) + parseInt(part, 10), 0) >>> 0;
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) newErrors.name = "Name is required";

    if (!form.cidr.trim()) {
      newErrors.cidr = "CIDR is required";
    } else if (!isValidCIDR(form.cidr.trim())) {
      newErrors.cidr = "Invalid IPv4 CIDR (e.g., 10.0.0.0/24)";
    }

    if (form.gateway.trim() && !isValidIPv4(form.gateway.trim())) {
      newErrors.gateway = "Invalid IPv4 address";
    } else if (form.gateway.trim() && form.cidr.trim() && isValidCIDR(form.cidr.trim())) {
      const [networkPart, prefixStr] = form.cidr.trim().split("/");
      const prefix = parseInt(prefixStr, 10);
      const gatewayLong = ipToLong(form.gateway.trim());
      const mask = (prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0);
      const networkLong = (ipToLong(networkPart) & mask) >>> 0;

      if ((gatewayLong & mask) >>> 0 !== networkLong) {
        newErrors.gateway = "Gateway must be within the CIDR range";
      } else if (prefix <= 30) {
        const broadcastLong = (networkLong | (~mask & 0xffffffff)) >>> 0;
        if (gatewayLong === networkLong) {
          newErrors.gateway = "Gateway cannot be the network address";
        } else if (gatewayLong === broadcastLong) {
          newErrors.gateway = "Gateway cannot be the broadcast address";
        }
      }
    }

    if (form.dns_servers.trim()) {
      const dns = form.dns_servers.split(",").map((s) => s.trim()).filter(Boolean);
      for (const d of dns) {
        if (!isValidIPv4(d)) {
          newErrors.dns_servers = `Invalid DNS server IP: ${d}`;
          break;
        }
      }
    }

    if (form.vlan_id.trim()) {
      const vlan = parseInt(form.vlan_id, 10);
      if (isNaN(vlan) || vlan < 1 || vlan > 4094 || vlan.toString() !== form.vlan_id.trim()) {
        newErrors.vlan_id = "VLAN ID must be an integer between 1 and 4094";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkDuplicate = async () => {
    let query = supabase
      .from("networks")
      .select("id")
      .eq("workspace_id", activeWorkspace?.id as string)
      .eq("cidr", form.cidr.trim());

    if (subnet) {
      query = query.neq("id", subnet.id);
    }

    const { data } = await query.limit(1);
    return data && data.length > 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Step 1: Run validation. If errors, set them and return.
    const hasErrors = !validate();
    if (hasErrors) return;

    // Step 2: Query for duplicate
    const isDuplicate = await checkDuplicate();

    // Step 3: If duplicate exists AND duplicateWarning is null: show warning and return
    if (isDuplicate && !duplicateWarning) {
      setDuplicateWarning("A subnet with this CIDR already exists in this workspace.");
      return;
    }

    // Step 4: Otherwise (no duplicate, or duplicateWarning already set): insert
    if (!user) {
      toast.error("Sign in to manage subnets");
      return;
    }
    if (!activeWorkspace?.id) {
      toast.error("No workspace selected");
      return;
    }

    setLoading(true);
    setDuplicateWarning(null);
    try {
      const payload = {
        name: form.name.trim(),
        cidr: form.cidr.trim(),
        site_id: form.site_id === "none" ? null : form.site_id,
        vlan_id: form.vlan_id.trim() ? parseInt(form.vlan_id, 10) : null,
        firewall_zone: form.firewall_zone,
        gateway: form.gateway.trim() || null,
        dns_servers: form.dns_servers.split(",").map((s) => s.trim()).filter(Boolean),
        description: form.description.trim() || null,
        routing_notes: form.routing_notes.trim() || null,
        tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
      };

      if (subnet) {
        const { data, error } = await supabase
          .from("networks")
          .update(payload)
          .eq("id", subnet.id)
          .select()
          .single();

        if (error) throw error;
        if (!data) throw new Error("Update failed or not permitted");
        toast.success("Subnet updated successfully");
      } else {
        const { error } = await supabase.from("networks").insert([{
          ...payload,
          user_id: user.id,
          workspace_id: activeWorkspace.id,
        }]);
        if (error) throw error;
        toast.success("Subnet created successfully");
      }

      onOpenChange(false);
      onSaved?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Save subnet failed", err);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{subnet ? "Edit Subnet" : "Add New Subnet"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Subnet Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Management Network"
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cidr">CIDR *</Label>
              <Input
                id="cidr"
                value={form.cidr}
                onChange={(e) => {
                  setForm({ ...form, cidr: e.target.value });
                  setDuplicateWarning(null);
                }}
                placeholder="e.g., 10.0.0.0/24"
                className={errors.cidr ? "border-destructive" : ""}
              />
              {errors.cidr && <p className="text-xs text-destructive">{errors.cidr}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="site_id">Site</Label>
              <Select
                value={form.site_id}
                onValueChange={(val) => {
                  setForm({ ...form, site_id: val });
                  setDuplicateWarning(null);
                }}
              >
                <SelectTrigger id="site_id">
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Site</SelectItem>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vlan_id">VLAN ID</Label>
              <Input
                id="vlan_id"
                value={form.vlan_id}
                onChange={(e) => {
                  setForm({ ...form, vlan_id: e.target.value });
                  setDuplicateWarning(null);
                }}
                placeholder="1-4094"
                className={errors.vlan_id ? "border-destructive" : ""}
              />
              {errors.vlan_id && <p className="text-xs text-destructive">{errors.vlan_id}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="firewall_zone">Firewall Zone</Label>
              <Select
                value={form.firewall_zone}
                onValueChange={(val) => setForm({ ...form, firewall_zone: val })}
              >
                <SelectTrigger id="firewall_zone">
                  <SelectValue placeholder="Select zone" />
                </SelectTrigger>
                <SelectContent>
                  {existingZones.length > 0 ? (
                    existingZones.map((zone) => (
                      <SelectItem key={zone} value={zone}>
                        {zone}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="Internal">Internal</SelectItem>
                      <SelectItem value="DMZ">DMZ</SelectItem>
                      <SelectItem value="Guest">Guest</SelectItem>
                      <SelectItem value="Management">Management</SelectItem>
                      <SelectItem value="Servers">Servers</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gateway">Gateway</Label>
              <Input
                id="gateway"
                value={form.gateway}
                onChange={(e) => setForm({ ...form, gateway: e.target.value })}
                placeholder="e.g., 10.0.0.1"
                className={errors.gateway ? "border-destructive" : ""}
              />
              {errors.gateway && <p className="text-xs text-destructive">{errors.gateway}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dns_servers">DNS Servers (comma-separated)</Label>
            <Input
              id="dns_servers"
              value={form.dns_servers}
              onChange={(e) => setForm({ ...form, dns_servers: e.target.value })}
              placeholder="e.g., 8.8.8.8, 8.8.4.4"
              className={errors.dns_servers ? "border-destructive" : ""}
            />
            {errors.dns_servers && <p className="text-xs text-destructive">{errors.dns_servers}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="routing_notes">Routing Notes</Label>
            <Textarea
              id="routing_notes"
              value={form.routing_notes}
              onChange={(e) => setForm({ ...form, routing_notes: e.target.value })}
              placeholder="Internal routing details..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="e.g., production, critical"
            />
          </div>

          {duplicateWarning && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-sm text-warning font-medium">{duplicateWarning}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {subnet ? "Save Changes" : (duplicateWarning ? "Confirm & Create" : "Create Subnet")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}