import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OrderTicket } from "@/components/OrderTicket";
import { ORDER_STATUSES, STATUS_LABELS } from "@/lib/bridgette";

export const Route = createFileRoute("/_authenticated/staff/")({
  head: () => ({
    meta: [
      { title: "Orders queue — Bridgette Laundry Staff" },
      { name: "description", content: "Today's orders and the full Bridgette Laundry queue." },
      { property: "og:title", content: "Orders queue — Bridgette Laundry Staff" },
      { property: "og:description", content: "Today's orders and the full queue." },
    ],
  }),
  component: StaffQueue,
});

function StaffQueue() {
  const [filter, setFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["staff-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const orders = data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const todays = orders.filter(
    (o) => o.scheduled_date === today || o.created_at.slice(0, 10) === today,
  );
  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="font-display text-2xl">Orders queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {orders.length} total · {todays.length} today
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Today
        </h2>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && todays.length === 0 && (
          <p className="ticket p-5 text-sm text-muted-foreground">Nothing scheduled for today.</p>
        )}
        {todays.map((o) => (
          <OrderTicket key={o.id} order={o} to="/staff/orders/$id" showCustomer />
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            All orders
          </h2>
          {["all", ...ORDER_STATUSES].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                filter === status
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {status === "all"
                ? "All"
                : STATUS_LABELS[status as (typeof ORDER_STATUSES)[number]]}
            </button>
          ))}
        </div>

        {filtered.length === 0 && !isLoading && (
          <p className="ticket p-5 text-sm text-muted-foreground">No orders with this status.</p>
        )}
        {filtered.map((o) => (
          <OrderTicket key={o.id} order={o} to="/staff/orders/$id" showCustomer />
        ))}
      </section>
    </div>
  );
}
