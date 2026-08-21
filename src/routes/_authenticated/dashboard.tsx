import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRole } from "@/hooks/useSession";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardRedirect,
});

function DashboardRedirect() {
  const { role, loading } = useRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !role) return;
    navigate({ to: role === "staff" ? "/staff" : "/orders", replace: true });
  }, [role, loading, navigate]);

  return <p className="py-16 text-center text-sm text-muted-foreground">Loading your dashboard…</p>;
}
