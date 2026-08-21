import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { OrderTicket } from "@/components/OrderTicket";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/_authenticated/orders/")({
  head: () => ({
    meta: [
      { title: "My Orders — Bridgette Laundry" },
      { name: "description", content: "Track your active and past Bridgette Laundry orders." },
      { property: "og:title", content: "My Orders — Bridgette Laundry" },
      { property: "og:description", content: "Track your active and past laundry orders." },
    ],
  }),
  component: MyOrders,
});

function MyOrders() {
  const { user } = useSession();
  const { data, isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const active = (data ?? []).filter(
    (o) => !["delivered", "collected", "cancelled"].includes(o.status),
  );
  const past = (data ?? []).filter((o) =>
    ["delivered", "collected", "cancelled"].includes(o.status),
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">My Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">Freshness You Can Trust.</p>
        </div>
        <Link to="/orders/new">
          <Button>
            <Plus className="size-4" /> New Order
          </Button>
        </Link>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading orders…</p>}

      {!isLoading && (data ?? []).length === 0 && (
        <div className="ticket p-8 text-center">
          <p className="font-display text-lg">No orders yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Place your first order and we&apos;ll take it from there.
          </p>
          <Link to="/orders/new" className="mt-4 inline-block">
            <Button>Place an order</Button>
          </Link>
        </div>
      )}

      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Active
          </h2>
          {active.map((o) => (
            <OrderTicket key={o.id} order={o} to="/orders/$id" />
          ))}
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Past
          </h2>
          {past.map((o) => (
            <OrderTicket key={o.id} order={o} to="/orders/$id" />
          ))}
        </section>
      )}
    </div>
  );
}
