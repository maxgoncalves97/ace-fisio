import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth, isAdmin } from "@/src/context/AuthContext";

// Redirect helper: ensures the current user matches the expected area.
export function useGuard(expected: "admin" | "patient") {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const admin = isAdmin(user);
    if (expected === "admin" && !admin) {
      router.replace("/patient/dashboard");
    } else if (expected === "patient" && admin) {
      router.replace("/admin/dashboard");
    }
  }, [user, loading, expected, router]);

  const ready = !loading && !!user && (expected === "admin" ? isAdmin(user) : !isAdmin(user));
  return { user, ready };
}
