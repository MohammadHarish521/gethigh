import { useCallback, useState } from "react";
import { useAuth } from "../hooks/useAuth";

export function useAuthGate() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const requireAuth = useCallback(() => {
    if (user) return true;
    setOpen(true);
    return false;
  }, [user]);

  return {
    user,
    authOpen: open,
    setAuthOpen: setOpen,
    requireAuth,
  };
}
