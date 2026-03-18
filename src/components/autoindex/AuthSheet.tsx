import { LoaderCircle, LogOut, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { Checkbox, CheckboxLabel } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/lib/useIsMobile";
import { cn } from "@/lib/utils";
import type {
  WebDavCapabilityState,
  WebDavSessionStatus,
} from "@/lib/webdav/types";

interface AuthSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionStatus: WebDavSessionStatus;
  username: string | null;
  remember: boolean;
  capability: WebDavCapabilityState;
  message: string | null;
  error: string | null;
  onSignIn: (values: {
    username: string;
    password: string;
    remember: boolean;
  }) => Promise<boolean>;
  onSignOut: () => void;
}

export function AuthSheet({
  open,
  onOpenChange,
  sessionStatus,
  username,
  remember,
  capability,
  message,
  error,
  onSignIn,
  onSignOut,
}: AuthSheetProps) {
  const isMobile = useIsMobile();
  const [usernameValue, setUsernameValue] = useState(username ?? "");
  const [passwordValue, setPasswordValue] = useState("");
  const [rememberValue, setRememberValue] = useState(remember);
  const isBusy =
    sessionStatus === "authenticating" || sessionStatus === "verifying";

  useEffect(() => {
    if (!open) return;
    setUsernameValue(username ?? "");
    setRememberValue(remember);
    setPasswordValue("");
  }, [open, username, remember]);

  const capabilityLabel =
    capability === "available"
      ? "Full access available"
      : capability === "forbidden"
        ? "Read-only here"
        : capability === "unsupported"
          ? "WebDAV unavailable"
          : capability === "checking"
            ? "Checking server"
            : "Write access unknown";

  const submitLabel =
    sessionStatus === "verifying"
      ? "Checking saved sign-in..."
      : sessionStatus === "authenticating"
        ? "Signing in..."
        : "Sign in";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          isMobile
            ? "max-h-[85dvh] overflow-y-auto rounded-t-2xl"
            : "w-96 sm:max-w-96",
        )}
      >
        {isMobile && (
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1.5 w-10 rounded-full bg-muted-foreground/20" />
          </div>
        )}

        <SheetHeader>
          <SheetTitle>WebDAV Sign In</SheetTitle>
          <SheetDescription>
            Sign in to manage files directly from the browser.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-4">
          {sessionStatus === "authenticated" && username ? (
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                  <ShieldCheck className="size-4" />
                </span>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-sm font-medium text-foreground">
                    Signed in as {username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {capabilityLabel}
                  </p>
                  {message && (
                    <p className="text-xs text-muted-foreground">{message}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <form
              className="space-y-3"
              onSubmit={async (event) => {
                event.preventDefault();
                const success = await onSignIn({
                  username: usernameValue,
                  password: passwordValue,
                  remember: rememberValue,
                });

                if (success) {
                  setPasswordValue("");
                  onOpenChange(false);
                }
              }}
            >
              <div className="space-y-1.5">
                <CheckboxLabel
                  htmlFor="webdav-username"
                  className="block text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Username
                </CheckboxLabel>
                <Input
                  id="webdav-username"
                  autoComplete="username"
                  value={usernameValue}
                  onChange={(event) => setUsernameValue(event.target.value)}
                  placeholder="Enter your username"
                  className="h-10 bg-muted/40"
                  disabled={isBusy}
                />
              </div>

              <div className="space-y-1.5">
                <CheckboxLabel
                  htmlFor="webdav-password"
                  className="block text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Password
                </CheckboxLabel>
                <Input
                  id="webdav-password"
                  type="password"
                  autoComplete="current-password"
                  value={passwordValue}
                  onChange={(event) => setPasswordValue(event.target.value)}
                  placeholder="Enter your password"
                  className="h-10 bg-muted/40"
                  disabled={isBusy}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="webdav-remember"
                  checked={rememberValue}
                  onCheckedChange={(checked) =>
                    setRememberValue(checked === true)
                  }
                  disabled={isBusy}
                />
                <CheckboxLabel
                  htmlFor="webdav-remember"
                  className="font-medium"
                >
                  Remember me
                </CheckboxLabel>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {message && !error && (
                <p className="text-sm text-muted-foreground">{message}</p>
              )}

              <SheetFooter className="mt-1 px-0 pb-0">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={isBusy}
                >
                  {isBusy && <LoaderCircle className="size-4 animate-spin" />}
                  {submitLabel}
                </Button>
              </SheetFooter>
            </form>
          )}

          {sessionStatus === "authenticated" && (
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={onSignOut}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
