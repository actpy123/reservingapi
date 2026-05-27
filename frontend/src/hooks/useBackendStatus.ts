import { useEffect, useState } from "react";

export type BackendStatus = "checking" | "online" | "offline";

export function useBackendStatus(): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>("checking");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!mounted) return;
        setStatus("checking");
        // await ApiService.getAssumptions();
        if (!mounted) return;
        setStatus("online");
      } catch {
        if (!mounted) return;
        setStatus("offline");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return status;
}
