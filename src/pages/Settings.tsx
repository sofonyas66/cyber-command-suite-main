import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Palette,
  Link,
  Database,
  Shield,
  Bell,
  Download,
  Upload,
  Key,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/components/ThemeProvider";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import IntegrationsTab from "@/components/settings/IntegrationsTab";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="appearance">Theme</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProfileSection />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>Manage your security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                </div>
                <span title="Coming soon"><Button variant="outline" size="sm" disabled><Key className="h-4 w-4 mr-2" />Setup 2FA</Button></span>
              </div>
              <Separator />
              <ChangePasswordSection />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Theme
              </CardTitle>
              <CardDescription>Customize the appearance of your dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setTheme("light")}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    theme === "light" ? "border-primary" : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="h-20 rounded-md bg-white border mb-2" />
                  <p className="text-sm font-medium">Light</p>
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    theme === "dark" ? "border-primary" : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="h-20 rounded-md bg-slate-900 border mb-2" />
                  <p className="text-sm font-medium">Dark</p>
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    theme === "system" ? "border-primary" : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="h-20 rounded-md bg-gradient-to-r from-white to-slate-900 border mb-2" />
                  <p className="text-sm font-medium">System</p>
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>Configure notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Critical Alerts</p>
                  <p className="text-sm text-muted-foreground">Get notified for critical vulnerabilities</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Incident Updates</p>
                  <p className="text-sm text-muted-foreground">Receive updates on active incidents</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">SLA Reminders</p>
                  <p className="text-sm text-muted-foreground">Get reminded about upcoming SLA deadlines</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <IntegrationsTab />
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Management
              </CardTitle>
              <CardDescription>Import and export your data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">Export All Data</p>
                  <p className="text-sm text-muted-foreground">Download all your data as JSON</p>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">Import Data</p>
                  <p className="text-sm text-muted-foreground">Import from backup or migration</p>
                </div>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-lg text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                <div>
                  <p className="font-medium">Delete All Data</p>
                  <p className="text-sm text-muted-foreground">Permanently remove all your data</p>
                </div>
                <Button variant="destructive" size="sm">Delete All</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileSection() {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const [profile, setProfile] = useState({ full_name: "", role: "" });
  const [savedProfile, setSavedProfile] = useState({ full_name: "", role: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("profiles").select("full_name, role").eq("id", user.id).single().then(({ data }: any) => {
      if (data) { const loaded = { full_name: data.full_name || "", role: data.role || "" }; setProfile(loaded); setSavedProfile(loaded); }
    });
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: profile.full_name || null, role: profile.role || null }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message || String(error));
    else { toast.success("Profile updated"); setSavedProfile({ full_name: profile.full_name || "", role: profile.role || "" }); }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input id="fullName" value={profile.full_name} onChange={e => setProfile({ ...profile, full_name: e.target.value })} placeholder="Enter full name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={user?.email || ""} disabled />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Input id="role" value={profile.role} onChange={e => setProfile({ ...profile, role: e.target.value })} placeholder="Enter role" />
      </div>
      <div className="md:col-span-2 mt-2">
        <Button onClick={handleSave} disabled={saving || (profile.full_name === savedProfile.full_name && profile.role === savedProfile.role)}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

/* Round C Settings report:
Theme tab: real theme picker (light/dark/system), saves via useTheme, notifications switches are UI only (no backend).
Integrations tab: renders IntegrationsTab component (real sync configs).
Data tab: export/import buttons (UI only, no actual file handler implemented), Delete All button (destructive, not implemented).
*/

function ChangePasswordSection() {
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const handleChange = async () => {
    if (newPass.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (newPass !== confirmPass) { toast.error("Passwords do not match"); return; }
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) toast.error(error.message || String(error));
    else { toast.success("Password updated"); setNewPass(""); setConfirmPass(""); }
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div><p className="font-medium">Change Password</p><p className="text-sm text-muted-foreground">Update your password regularly</p></div>
        <Button variant="outline" size="sm" onClick={handleChange}>Change Password</Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input type="password" placeholder="New password (min 8)" value={newPass} onChange={e => setNewPass(e.target.value)} />
        <Input type="password" placeholder="Confirm password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
      </div>
    </div>
  );
}
