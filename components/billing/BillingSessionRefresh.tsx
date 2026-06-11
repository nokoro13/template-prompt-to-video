"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Forces a Clerk session token refresh after checkout so `has({ plan })`
 * catches up without waiting for the ~60s automatic refresh cycle.
 */
export function BillingSessionRefresh() {
  const { isLoaded, userId, getToken } = useAuth();
  const router = useRouter();
  const refreshed = useRef(false);

  useEffect(() => {
    if (!isLoaded || !userId || refreshed.current) {
      return;
    }

    refreshed.current = true;

    void (async () => {
      try {
        await getToken({ skipCache: true });
      } finally {
        router.refresh();
      }
    })();
  }, [getToken, isLoaded, router, userId]);

  return null;
}
