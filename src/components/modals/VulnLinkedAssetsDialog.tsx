import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { getErrorMessage } from "@/lib/errors";

interface Asset {
  id: string;
  hostname: string;
  ip_address: string | null;
}

interface LinkedAsset {
  asset_id: string;
  assets: Asset | null;
}

interface VulnLinkedAssetsDialogProps {
  vulnerability: { id: string; title: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

export default function VulnLinkedAssetsDialog({
  vulnerability,
  open,
  onOpenChange,
  onChanged,
}: VulnLinkedAssetsDialogProps) {
  const { activeWorkspace } = useWorkspace();
  const [linkedAssets, setLinkedAssets] = useState<Asset[]>([]);
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAvailable, setLoadingAvailable] = useState(false);

  const fetchAssets = async () => {
    if (!vulnerability?.id || !activeWorkspace?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vuln_assets")
        .select("asset_id, assets(id, hostname, ip_address)")
        .eq("vulnerability_id", vulnerability.id);

      if (error) throw error;

      const assets = (data || [])
        .map((la: LinkedAsset) => la.assets)
        .filter((a): a is Asset => a !== null)
        .map(a => ({ ...a, ip_address: a.ip_address == null ? null : String(a.ip_address) }));
      
      setLinkedAssets(assets);
    } catch (err) {
      toast.error(`Failed to load linked assets: ${getErrorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailable = async () => {
    if (!activeWorkspace?.id) return;
    setLoadingAvailable(true);
    try {
      const { data, error } = await supabase
        .from("assets")
        .select("id, hostname, ip_address")
        .eq("workspace_id", activeWorkspace.id)
        .order("hostname")
        .limit(500);

      if (error) throw error;

      const linkedIds = new Set(linkedAssets.map(a => a.id));
      const filtered = (data || [])
        .map(a => ({ ...a, ip_address: a.ip_address == null ? null : String(a.ip_address) }))
        .filter(a => !linkedIds.has(a.id));
      
      setAvailableAssets(filtered);
    } catch (err) {
      console.error("Error fetching available assets:", err);
    } finally {
      setLoadingAvailable(false);
    }
  };

  useEffect(() => {
    if (open && vulnerability) {
      fetchAssets();
    }
  }, [open, vulnerability?.id]);

  useEffect(() => {
    if (open) {
      fetchAvailable();
    }
  }, [open, linkedAssets]);

  const handleUnlink = async (assetId: string) => {
    if (!vulnerability) return;
    try {
      const { data, error } = await supabase
        .from("vuln_assets")
        .delete()
        .eq("vulnerability_id", vulnerability.id)
        .eq("asset_id", assetId)
        .select();

      if (error) {
        toast.error(getErrorMessage(error));
        return;
      }

      if (!data || data.length !== 1) {
        toast.error("Unlink failed or not permitted");
        return;
      }

      setLinkedAssets(prev => prev.filter(a => a.id !== assetId));
      toast.success("Asset unlinked");
      onChanged?.();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleLink = async (assetId: string) => {
    if (!vulnerability) return;
    try {
      const { data, error } = await supabase
        .from("vuln_assets")
        .insert([{ vulnerability_id: vulnerability.id, asset_id: assetId }])
        .select();

      if (error) {
        if (error.code === "23505") {
          toast.error("Already linked");
        } else {
          toast.error(getErrorMessage(error));
        }
        return;
      }

      if (!data || data.length !== 1) {
        toast.error("Link failed");
        return;
      }

      toast.success("Asset linked");
      onChanged?.();
      fetchAssets();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Affected assets</DialogTitle>
          <DialogDescription>{vulnerability?.title}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          {loading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : linkedAssets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No linked assets</p>
          ) : (
            <div className="space-y-2">
              {linkedAssets.map(a => (
                <div key={a.id} className="flex items-center justify-between p-2 rounded-md border text-sm">
                  <div>
                    <p className="font-medium">{a.hostname}</p>
                    <p className="text-xs text-muted-foreground">{a.ip_address || "—"}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleUnlink(a.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2">
            <Select onValueChange={handleLink} disabled={loadingAvailable}>
              <SelectTrigger>
                <SelectValue placeholder={loadingAvailable ? "Loading..." : "Add asset..."} />
              </SelectTrigger>
              <SelectContent>
                {availableAssets.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.hostname} ({a.ip_address || "—"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
