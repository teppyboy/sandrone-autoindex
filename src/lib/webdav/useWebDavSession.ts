import { useCallback, useEffect, useRef, useState } from "react";

import {
  clearStoredWebDavAuth,
  createBasicAuthorization,
  persistWebDavAuth,
  readStoredWebDavAuth,
} from "@/lib/webdav/auth";
import {
  detectWebDavServerSupport,
  probeWriteSupport,
  verifyWebDavCredentials,
} from "@/lib/webdav/client";
import type {
  WebDavCapabilityState,
  WebDavProbeResult,
  WebDavServerSupportState,
  WebDavSessionStatus,
} from "@/lib/webdav/types";

interface SignInArgs {
  username: string;
  password: string;
  remember: boolean;
}

function mapProbeResult(result: WebDavProbeResult): {
  capability: WebDavCapabilityState;
  message: string | null;
} {
  if (result.kind === "available") {
    return { capability: "available", message: result.message };
  }

  if (result.kind === "forbidden") {
    return { capability: "forbidden", message: result.message };
  }

  if (result.kind === "unsupported") {
    return { capability: "unsupported", message: result.message };
  }

  return { capability: "unknown", message: result.message };
}

export function useWebDavSession() {
  const [storedAuth] = useState(() => readStoredWebDavAuth());
  const [sessionStatus, setSessionStatus] = useState<WebDavSessionStatus>(
    storedAuth ? "verifying" : "signed_out",
  );
  const [username, setUsername] = useState<string | null>(
    storedAuth?.username ?? null,
  );
  const [authorization, setAuthorization] = useState<string | null>(null);
  const [remember, setRemember] = useState(storedAuth?.storage === "local");
  const [serverSupport, setServerSupport] =
    useState<WebDavServerSupportState>("checking");
  const initialCapability = storedAuth ? "checking" : "unknown";
  const [capability, setCapability] =
    useState<WebDavCapabilityState>(initialCapability);
  const [message, setMessage] = useState<string | null>(
    storedAuth
      ? "Checking saved WebDAV credentials for this directory..."
      : null,
  );
  const [error, setError] = useState<string | null>(null);
  const authorizationRef = useRef<string | null>(
    storedAuth?.authorization ?? null,
  );

  const resetSession = useCallback((nextError: string | null = null) => {
    clearStoredWebDavAuth();
    setSessionStatus("signed_out");
    setUsername(null);
    setAuthorization(null);
    authorizationRef.current = null;
    setRemember(false);
    setCapability("unknown");
    setMessage(null);
    setError(nextError);
  }, []);

  const applyCapabilityResult = useCallback((result: WebDavProbeResult) => {
    const mapped = mapProbeResult(result);
    setCapability(mapped.capability);
    setMessage(mapped.message);
  }, []);

  const applyAuthenticatedSession = useCallback(
    ({
      username,
      authorization,
      remember,
      persist,
    }: {
      username: string;
      authorization: string;
      remember: boolean;
      persist: boolean;
    }) => {
      if (persist) {
        persistWebDavAuth(
          {
            username,
            authorization,
          },
          remember,
        );
      }

      setSessionStatus("authenticated");
      setUsername(username);
      setAuthorization(authorization);
      authorizationRef.current = authorization;
      setRemember(remember);
      setError(null);
    },
    [],
  );

  const refreshCapability = useCallback(
    async (authHeader?: string | null) => {
      const activeAuthorization = authHeader ?? authorizationRef.current;
      if (!activeAuthorization) return false;

      setCapability("checking");
      setMessage("Checking upload support for this directory...");
      setError(null);

      const result = await probeWriteSupport(activeAuthorization);
      if (result.kind === "unauthorized") {
        resetSession(
          "The sign-in check passed, but this directory rejected the same credentials. Check your nginx auth settings and sign in again.",
        );
        return false;
      }

      applyCapabilityResult(result);
      return true;
    },
    [applyCapabilityResult, resetSession],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        const result = await detectWebDavServerSupport();
        setServerSupport(result.state);
      })();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!storedAuth) return;

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        setSessionStatus("verifying");
        setCapability("checking");
        setMessage("Checking saved WebDAV credentials for this directory...");
        setError(null);

        const verification = await verifyWebDavCredentials(
          storedAuth.authorization,
        );
        if (verification.kind !== "valid") {
          const nextError =
            verification.kind === "unauthorized"
              ? "Saved WebDAV credentials were rejected. Sign in again to continue uploading."
              : `${verification.message} Sign in again to continue uploading.`;

          resetSession(nextError);
          return;
        }

        const capabilityOk = await refreshCapability(storedAuth.authorization);
        if (!capabilityOk) {
          return;
        }

        applyAuthenticatedSession({
          username: storedAuth.username,
          authorization: storedAuth.authorization,
          remember: storedAuth.storage === "local",
          persist: false,
        });
      })();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [applyAuthenticatedSession, refreshCapability, resetSession, storedAuth]);

  const signIn = useCallback(
    async ({ username, password, remember }: SignInArgs): Promise<boolean> => {
      const nextUsername = username.trim();

      if (!nextUsername || !password) {
        setError("Enter both a username and password.");
        return false;
      }

      const nextAuthorization = createBasicAuthorization(
        nextUsername,
        password,
      );

      setSessionStatus("authenticating");
      setCapability("checking");
      setMessage("Verifying your WebDAV credentials...");
      setError(null);

      const verification = await verifyWebDavCredentials(nextAuthorization);
      if (verification.kind !== "valid") {
        resetSession(verification.message);
        return false;
      }

      const capabilityOk = await refreshCapability(nextAuthorization);
      if (!capabilityOk) {
        return false;
      }

      applyAuthenticatedSession({
        username: nextUsername,
        authorization: nextAuthorization,
        remember,
        persist: true,
      });

      return true;
    },
    [applyAuthenticatedSession, refreshCapability, resetSession],
  );

  const signOut = useCallback(() => {
    resetSession();
  }, [resetSession]);

  const handleWriteFailure = useCallback(
    (status: number) => {
      if (status === 401) {
        resetSession(
          "Your WebDAV credentials were rejected. Sign in again to continue uploading.",
        );
        return;
      }

      if (status === 403) {
        setCapability("forbidden");
        setMessage("Signed in, but uploads are not allowed in this directory.");
        return;
      }

      if (status === 405 || status === 501) {
        setCapability("unsupported");
        setMessage(
          "This server does not expose WebDAV uploads for the current directory.",
        );
      }
    },
    [resetSession],
  );

  const markWriteSuccess = useCallback(() => {
    setCapability("available");
    setMessage(null);
    setError(null);
  }, []);

  return {
    sessionStatus,
    username,
    authorization,
    remember,
    serverSupport,
    capability,
    message,
    error,
    isAuthenticated:
      sessionStatus === "authenticated" &&
      Boolean(username) &&
      Boolean(authorization),
    signIn,
    signOut,
    refreshCapability,
    handleWriteFailure,
    markWriteSuccess,
  };
}
