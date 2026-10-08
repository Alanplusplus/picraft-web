"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api-client";
import { getFingerprint } from "@/lib/fingerprint";
import type { Account } from "@/lib/types";

interface SessionValue {
  account: Account | null;
  ready: boolean;
  error: string | null;
  setAccount: (account: Account) => void;
  refresh: () => Promise<Account | null>;
}

const SessionContext = createContext<SessionValue | null>(null);

/** Runs `task` when the browser is idle (or after a short delay where that API is missing) and returns a cancel function. */
function whenIdle(task: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(task, { timeout: 2000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(task, 800);
  return () => window.clearTimeout(id);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applySession = useCallback((res: Awaited<ReturnType<typeof api.session>>) => {
    if (res.code === 200 && res.data) {
      setAccount(res.data.account);
      setError(null);
      return res.data.account;
    }
    setError(res.message);
    return null;
  }, []);

  const refresh = useCallback(
    async () => applySession(await api.session(await getFingerprint())),
    [applySession],
  );

  useEffect(() => {
    let active = true;
    // Wait until the browser is idle so identifying the device never competes with painting the page.
    const cancel = whenIdle(() => {
      getFingerprint()
        .then(api.session)
        .then((res) => {
          if (!active) return;
          applySession(res);
          setReady(true);
        });
    });
    return () => {
      active = false;
      cancel();
    };
  }, [applySession]);

  const value = useMemo(
    () => ({ account, ready, error, setAccount, refresh }),
    [account, ready, error, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
