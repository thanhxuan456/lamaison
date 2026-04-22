import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";

const API = import.meta.env.VITE_API_URL ?? "";

export interface MyRole {
  role: "superadmin" | "admin" | "manager" | "staff" | "affiliate" | "vip" | "guest";
  branchId: number | null;
  isSuper: boolean;
}

export const ADMIN_ROLES = new Set(["superadmin", "admin", "manager", "staff"]);

async function fetchMyRole(): Promise<MyRole> {
  const r = await fetch(`${API}/api/me/role`, { credentials: "include" });
  if (!r.ok) throw new Error("role-fetch-failed");
  return r.json();
}

/**
 * Hook tra ve vai tro + chi nhanh duoc phan cong cua user dang dang nhap.
 * Dung cho AdminGuard va branch-lock o Navbar.
 */
export function useMyRole() {
  const { isSignedIn, isLoaded } = useAuth();
  return useQuery({
    queryKey: ["me", "role"],
    queryFn: fetchMyRole,
    enabled: isLoaded && !!isSignedIn,
    staleTime: 60_000,
  });
}

export function isAdminRole(role?: string | null): boolean {
  return !!role && ADMIN_ROLES.has(role);
}
