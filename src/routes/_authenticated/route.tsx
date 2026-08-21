import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { TopNav } from "@/components/TopNav";
import { useRole } from "@/hooks/useSession";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

const CUSTOMER_NAV = [
  { to: "/orders", label: "My Orders" },
  { to: "/orders/new", label: "New Order" },
];

const STAFF_NAV = [
  { to: "/staff", label: "Queue" },
  { to: "/staff/inventory", label: "Inventory" },
  { to: "/staff/pricing", label: "Pricing" },
  { to: "/staff/sales", label: "Sales" },
];

function AuthenticatedLayout() {
  const { isStaff } = useRole();

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav items={isStaff ? STAFF_NAV : CUSTOMER_NAV} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-6">
        <Outlet />
      </main>
    </div>
  );
}
