import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";

interface Vlan {
  id: string;
  vlan_id: number;
  name: string;
  description?: string | null;
  site_id?: string | null;
  network_id?: string | null;
}

interface VlanFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  vlan?: Vlan | null;
}

export default function VlanFormModal({
  open,
  onOpenChange,
  onSaved,
  vlan,
}: VlanFormModalProps) {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [networks, setNetworks] = useState<{ id: string; name: string; cidr: string; site_id: string | null }[]>([]);
  const [form, setForm] = useState({
    vlan_id: "",
    name: "",
    description: "",
    site_id: "none",
    network_id: "none",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  useEffect(() => {
    if (open && activeWorkspace?.id) {
      fetchSitesAndNetworks();
    }
  }, [open, activeWorkspace?.id]);

  useEffect(() => {
    if (vlan) {
      setForm({
        vlan_id: vlan.vlan_id.toString(),
        name: vlan.name || "",
        description: vlan.description || "",
        site_id: vlan.site_id || "none",
        network_id: vlan.network_id || "none",
      });
    } else {
      setForm({
        vlan_id: "",
        name: "",
        description: "",
        site_id: "none",
        network_id: "none",
      });
    }
    setErrors({});
    setDuplicateWarning(null);
  }, [vlan, open]);

  const fetchSitesAndNetworks = async () => {
    const [{ data: sData }, { data: nData }] = await Promise.all([
      supabase.from("sites").select("id, name").eq("workspace_id", activeWorkspace?.id as string),
      supabase.from("networks").select("id, name, cidr, site_id").eq("workspace_id", activeWorkspace?.id as string),
    ]);
    if (sData) setSites(sData);
    if (nData) setNetworks(nData);
  };

  const filteredNetworks = networks.filter((n) =>
    form.site_id === "none" || n.site_id === form.site_id,
  );

  const validate = () => {
    const newErrors: Record<string, string> = {};

    const vid = parseInt(form.vlan_id, 10);
    if (isNaN(vid) || vid < 1 || vid > 4094 || vid.toString() !== form.vlan_id.trim()) {
      newErrors.vlan_id = "VLAN ID must be an integer between 1 and 4094";
    }

    if (!form.name.trim()) newErrors.name = "Name is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkDuplicate = async () => {
    const vid = parseInt(form.vlan_id, 10);
    let query = supabase
      .from("vlans")
      .select("id")
      .eq("workspace_id", activeWorkspace?.id as string)
      .eq("vlan_id", vid);

    if (form.site_id !== "none") {
      query = query.eq("site_id", form.site_id);
    } else {
      query = query.is("site_id", null);
    }

    if (vlan) {
      query = query.neq("id", vlan.id);
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
      const vid = parseInt(form.vlan_id, 10);
      setDuplicateWarning(
        `VLAN ID ${vid} is already in use at this ${form.site_id === "none" ? "unassigned location" : "site"}.`
      );
      return;
    }

    // Step 4: Otherwise (no duplicate, or duplicateWarning already set): insert
    if (!user) {
      toast.error("Sign in to manage VLANs");
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
        vlan_id: parseInt(form.vlan_id, 10),
        name: form.name.trim(),
        description: form.description.trim() || null,
        site_id: form.site_id === "none" ? null : form.site_id,
        network_id: form.network_id === "none" ? null : form.network_id,
        ...(vlan ? {} : { user_id: user.id }),
      };

      if (vlan) {
        const { data, error } = await supabase
          .from("vlans")
          .update(payload)
          .eq("id", vlan.id)
          .select()
          .single();

        if (error) throw error;
        if (!data) throw new Error("Update failed or not permitted");
        toast.success("VLAN updated successfully");
      } else {
        const { data, error } = await supabase
          .from("vlans")
          .insert([
            {
              ...payload,
              user_id: user.id,
              workspace_id: activeWorkspace.id,
            },
          ])
          .select();
        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Insert failed or not permitted");
        toast.success("VLAN created successfully");
      }

      onOpenChange(false);
      onSaved?.();
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      console.error("Save VLAN failed", err);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vlan ? "Edit VLAN" : "Add New VLAN"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vlan_id">VLAN ID *</Label>
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
              <Label htmlFor="name">VLAN Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., VoIP Traffic"
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="site_id">Site</Label>
            <Select
              value={form.site_id}
              onValueChange={(val) => {
                setForm({ ...form, site_id: val, network_id: "none" });
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
            <Label htmlFor="network_id">Linked Network (Subnet)</Label>
            <Select
              value={form.network_id}
              onValueChange={(val) => {
                setForm({ ...form, network_id: val });
                setDuplicateWarning(null);
              }}
            >
              <SelectTrigger id="network_id">
                <SelectValue placeholder="Select a network" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Network</SelectItem>
                {filteredNetworks.map((net) => (
                  <SelectItem key={net.id} value={net.id}>
                    {net.name} ({net.cidr})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description"
              rows={3}
            />
          </div>

          {duplicateWarning && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-sm text-warning font-medium">{duplicateWarning}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
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
              {vlan ? "Save Changes" : (duplicateWarning ? "Confirm & Create" : "Create VLAN")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}