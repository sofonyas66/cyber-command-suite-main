import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

export default function AuthPage() {
  const { user, signIn, signUp, loading } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});
  const [signupErrors, setSignupErrors] = useState<{ email?: string; password?: string }>({});
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ email: "", password: "", fullName: "" });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Inline validation
    const emailErr = (() => { try { emailSchema.parse(loginForm.email); return undefined } catch (e:any) { return e.errors?.[0]?.message } })();
    const passErr = (() => { try { passwordSchema.parse(loginForm.password); return undefined } catch (e:any) { return e.errors?.[0]?.message } })();
    setLoginErrors({ email: emailErr, password: passErr });
    if (emailErr || passErr) return;

    setIsLoading(true);
    const { error } = await signIn(loginForm.email, loginForm.password);
    setIsLoading(false);

    if (error) {
      setError(error.message);
      toast.error(error.message);
    } else {
      toast.success("Welcome back to SecNet Command Center!");
      navigate("/dashboard");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailErr = (() => { try { emailSchema.parse(signupForm.email); return undefined } catch (e:any) { return e.errors?.[0]?.message } })();
    const passErr = (() => { try { passwordSchema.parse(signupForm.password); return undefined } catch (e:any) { return e.errors?.[0]?.message } })();
    setSignupErrors({ email: emailErr, password: passErr });
    if (emailErr || passErr) return;

    setIsLoading(true);
    const { error } = await signUp(signupForm.email, signupForm.password, signupForm.fullName);
    setIsLoading(false);

    if (error) {
      if (error.message.includes("already registered")) {
        setError("This email is already registered. Please sign in instead.");
        toast.error("This email is already registered. Please sign in instead.");
      } else {
        setError(error.message);
        toast.error(error.message);
      }
    } else {
      toast.success("Account created! Please check your email to confirm.");
    }
  };

  // Password reset handler
  const handlePasswordReset = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    try {
      emailSchema.parse(resetEmail);
    } catch (err:any) {
      const msg = err.errors?.[0]?.message || 'Invalid email';
      setError(msg);
      return;
    }
    setResetLoading(true);
    const { sendPasswordReset } = useAuth();
    const { error: resetErr } = await sendPasswordReset(resetEmail);
    setResetLoading(false);
    if (resetErr) {
      setError(resetErr.message);
      toast.error(resetErr.message);
    } else {
      toast.success('Password reset email sent. Check your inbox.');
      setShowReset(false);
      setResetEmail('');
    }
  };

  // Resend / magic link
  const handleSendMagicLink = async (email: string) => {
    try {
      emailSchema.parse(email);
    } catch (err:any) {
      toast.error(err.errors?.[0]?.message || 'Invalid email');
      return;
    }
    const { sendMagicLink } = useAuth();
    const { error: mErr } = await sendMagicLink(email);
    if (mErr) {
      toast.error(mErr.message);
    } else {
      toast.success('Magic link sent — check your email.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      {/* Background glow effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Logo */}
      <div className="flex items-center gap-3 mb-8 z-10">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center glow">
          <Shield className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">SecNet</h1>
          <p className="text-sm text-muted-foreground">Command Center</p>
        </div>
      </div>

      {/* Auth Card */}
      <Card className="w-full max-w-md z-10 border-border/50 bg-card/80 backdrop-blur-sm">
        <Tabs defaultValue="login">
          <CardHeader className="pb-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <TabsContent value="login" className="mt-0">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="admin@secnet.local"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    required
                  />
                  {loginErrors.email && (
                    <p className="text-xs text-destructive mt-1">{loginErrors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    required
                  />
                  {loginErrors.password && (
                    <p className="text-xs text-destructive mt-1">{loginErrors.password}</p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <button type="button" className="text-sm text-primary underline" onClick={() => setShowReset(s => !s)}>
                    Forgot password?
                  </button>
                  <button type="button" className="text-sm text-primary underline" onClick={() => handleSendMagicLink(loginForm.email)}>
                    Send magic link
                  </button>
                </div>
                {showReset && (
                  <form onSubmit={handlePasswordReset} className="mt-3 space-y-2">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email for password reset</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="you@company.com"
                        value={resetEmail}
                        onChange={e => setResetEmail(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={resetLoading}>
                        {resetLoading ? 'Sending...' : 'Send reset email'}
                      </Button>
                      <Button variant="outline" onClick={() => setShowReset(false)}>Cancel</Button>
                    </div>
                  </form>
                )}
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-0">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Security Engineer"
                    value={signupForm.fullName}
                    onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="admin@secnet.local"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    required
                  />
                  {signupErrors.email && (
                    <p className="text-xs text-destructive mt-1">{signupErrors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    required
                  />
                  {signupErrors.password && (
                    <p className="text-xs text-destructive mt-1">{signupErrors.password}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                  </Button>
                </div>
                <div className="flex items-center justify-end mt-2">
                  <button type="button" className="text-sm text-primary underline" onClick={() => handleSendMagicLink(signupForm.email)}>
                    Send magic link
                  </button>
                </div>
              </form>
              <p className="text-xs text-muted-foreground text-center mt-4">
                By signing up, you agree to our Terms of Service and Privacy Policy.
              </p>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Footer */}
      <p className="text-xs text-muted-foreground mt-8 z-10">
        SecNet Command Center v1.0.0 • Cybersecurity Dashboard
      </p>
    </div>
  );
}
