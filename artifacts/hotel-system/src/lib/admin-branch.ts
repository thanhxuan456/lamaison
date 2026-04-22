import { useEffect, useState, useCallback } from "react";
import { useListHotels } from "@workspace/api-client-react";

const KEY = "admin_active_branch_id";
const EVENT = "admin-branch-change";

const ADMIN_ROLES = new Set(["superadmin", "admin", "manager", "staff"]);
const ADMIN_EMAIL = "tthanhxuan456@gmail.com";

export function isStaffUser(role?: string | null, email?: string | null): boolean {
  if (email && email === ADMIN_EMAIL) return true;
  if (role && ADMIN_ROLES.has(role)) return true;
  return false;
}

function parseStoredId(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function useAdminBranch() {
  const { data: hotels } = useListHotels();
  const [activeId, setActiveId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    return parseStoredId(localStorage.getItem(KEY));
  });

  useEffect(() => {
    const handler = () => {
      setActiveId(parseStoredId(localStorage.getItem(KEY)));
    };
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const setActive = useCallback((id: number | null) => {
    if (id == null) {
      localStorage.removeItem(KEY);
    } else {
      localStorage.setItem(KEY, String(id));
    }
    setActiveId(id);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const branch = hotels?.find((h) => h.id === activeId) ?? null;

  return { hotels: hotels ?? [], branch, activeId, setActive };
}
