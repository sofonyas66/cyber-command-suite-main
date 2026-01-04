import { useEffect, useState } from "react";
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

interface AssetFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: any | null;
  onSaved?: () => void;
}

export default function AssetFormModal({ open, onOpenChange, asset = null, onSaved }: AssetFormModalProps) {
  const { activeWorkspace } = useWorkspace();
  const { user } = useAuth();

  const [form, setForm] = useState({
    hostname: "",
    ip_address: "",
    mac_address: "",
    os: "",
    asset_type: "server",
    owner: "",
    location: "",
    environment: "production",
    criticality: "medium",
    tags: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (asset) {
      setForm({
        hostname: asset.hostname || "",
        ip_address: asset.ip_address || "",
        mac_address: asset.mac_address || "",
        os: asset.os || "",
        asset_type: asset.asset_type || "server",
        owner: asset.owner || "",
        location: asset.location || "",
        environment: asset.environment || "production",
        criticality: asset.criticality || "medium",
        tags: Array.isArray(asset.tags) ? asset.tags.join(", ") : asset.tags || "",
        notes: asset.notes || "",
      });
    } else {
      setForm({
        hostname: "",
        ip_address: "",
        mac_address: "",
        os: "",
        asset_type: "server",
        owner: "",
        location: "",
        environment: "production",
        criticality: "medium",
        tags: "",
        notes: "",
      });
    }
  }, [asset, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        hostname: form.hostname,
        ip_address: form.ip_address || null,
        mac_address: form.mac_address || null,
        os: form.os || null,
        asset_type: form.asset_type,
        owner: form.owner || null,
        location: form.location || null,
        environment: form.environment,
        criticality: form.criticality,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        notes: form.notes || null,
      } as any;

      if (asset && asset.id) {
        const { error } = await supabase.from('assets').update(payload).eq('id', asset.id);
        if (error) throw error;
        toast.success('Asset updated');
      } else {
        if (!user) {
          toast.error('You must be signed in to create assets');
          setLoading(false);
          return;
        }
        if (activeWorkspace?.id) payload.workspace_id = activeWorkspace.id;
        payload.user_id = user.id;
        const { error } = await supabase.from('assets').insert([payload]);
        if (error) throw error;
        toast.success('Asset created');
      }

      onOpenChange(false);
      onSaved && onSaved();
    } catch (err: any) {
      console.error('Asset save failed', err);
      toast.error(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Asset</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hostname">Hostname *</Label>
              <Input
                id="hostname"
                placeholder="server-prod-01"
                value={form.hostname}
                onChange={(e) => setForm({ ...form, hostname: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ip">IP Address</Label>
              <Input
                id="ip"
                placeholder="10.0.1.10"
                value={form.ip_address}
                onChange={(e) => setForm({ ...form, ip_address: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mac">MAC Address</Label>
              <Input
                id="mac"
                placeholder="00:1A:2B:3C:4D:5E"
                value={form.mac_address}
                onChange={(e) => setForm({ ...form, mac_address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="os">Operating System</Label>
              <Input
                id="os"
                placeholder="Windows Server 2022"
                value={form.os}
                onChange={(e) => setForm({ ...form, os: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Asset Type</Label>
              <Select value={form.asset_type} onValueChange={(v) => setForm({ ...form, asset_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="server">Server</SelectItem>
                  <SelectItem value="workstation">Workstation</SelectItem>
                  <SelectItem value="firewall">Firewall</SelectItem>
                  <SelectItem value="router">Router</SelectItem>
                  <SelectItem value="switch">Switch</SelectItem>
                  <SelectItem value="appliance">Appliance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner">Owner</Label>
              <Input
                id="owner"
                placeholder="IT Infrastructure"
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="DC1 - Rack A3"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Environment</Label>
              <Select value={form.environment} onValueChange={(v) => setForm({ ...form, environment: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="testing">Testing</SelectItem>
                  <SelectItem value="dmz">DMZ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Criticality</Label>
              <Select value={form.criticality} onValueChange={(v) => setForm({ ...form, criticality: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              placeholder="web, nginx, frontend"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional information about this asset..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Asset</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
