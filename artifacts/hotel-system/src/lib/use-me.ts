import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser, useAuth } from "@clerk/react";
import { getBranchContext, clearBranchContext } from "./branch-context";

const API = import.meta.env.VITE_API_URL ?? "";

export interface MeProfile {
  user: {
    id: number;
    clerkUserId: string;
    email: string;
    name: string | null;
    role: string;
    signupHotelId: number | null;
    signupHotelSlug: string | null;
    lastLoginHotelId: number | null;
    lastLoginHotelSlug: string | null;
    lastLoginAt: string | null;
  } | null;
  signupHotel: { id: number; slug: string; name: string; city: string; location: string } | null;
  lastLoginHotel: { id: number; slug: string; name: string; city: string; location: string } | null;
}

async function fetchMe(): Promise<MeProfile> {
  const res = await fetch(`${API}/api/me`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load profile");
  return res.json();
}

export function useMe() {
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    enabled: !!isSignedIn,
    staleTime: 30_000,
  });
}

/**
 * Tu dong sync chi nhanh user vua dang nhap (nam trong localStorage).
 * Chay 1 lan moi khi user chuyen tu signed-out -> signed-in.
 */
export function useSyncBranchOnSignIn() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const qc = useQueryClient();
  // Theo doi tinh trang sync. Chi danh dau "da xong" KHI POST thanh cong
  // — neu fail (mang hong, 5xx), lan render sau se thu lai chu khong block vinh vien.
  const syncStatusRef = useRef<{ userId: string; status: "pending" | "done" } | null>(null);
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    const cur = syncStatusRef.current;
    if (cur && cur.userId === user.id && cur.status === "done") return;
    if (cur && cur.userId === user.id && cur.status === "pending") return; // tranh double-fire trong 1 frame
    if (attemptsRef.current >= 5) return; // bounded retry de tranh loop vo han khi 4xx persistent

    const ctx = getBranchContext();
    const slug = ctx?.slug;
    if (!slug) return;

    const email = user.primaryEmailAddress?.emailAddress ?? "";
    const name = user.fullName ?? user.firstName ?? null;
    if (!email) return;

    syncStatusRef.current = { userId: user.id, status: "pending" };
    attemptsRef.current += 1;

    fetch(`${API}/api/me/branch`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, email, name }),
    })
      .then(r => {
        if (r.ok) {
          syncStatusRef.current = { userId: user.id, status: "done" };
          clearBranchContext();
          qc.invalidateQueries({ queryKey: ["me"] });
        } else {
          // Reset de useEffect tiep theo (vd: window focus, navigation) co the thu lai
          syncStatusRef.current = null;
        }
      })
      .catch(() => { syncStatusRef.current = null; });
  }, [isLoaded, isSignedIn, user, qc]);
}
