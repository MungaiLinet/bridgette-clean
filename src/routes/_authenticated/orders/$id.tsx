import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Phone, MapPin, Store, CalendarDays, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/OrderTicket";
import { ksh, STATUS_LABELS, telHref, timelineFor, type OrderStatus } from "@/lib/bridgette";

export const Route = createFileRoute("/_authenticated/orders/$id")({
  head: () => ({
    meta: [
      { title: "Order details — Bridgette Laundry" },
      { name: "description", content: "See items, price, status and payment for your order." },
      { property: "og:title", content: "Order details — Bridgette Laundry" },
      { property: "og:description", content: "See items, price, status and payment." },
    ],
  }),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const [order, items, payments] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", id).order("created_at"),
        supabase.from("payments").select("*").eq("order_id", id).order("received_at"),
      ]);
      if (order.error) throw order.error;
      if (items.error) throw items.error;
      if (payments.error) throw payments.error;
      return { order: order.data, items: items.data, payments: payments.data };
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading order…</p>;
  if (!data?.order) return <p className="text-sm text-muted-foreground">Order not found.</p>;

  const order = data.order;
  const steps = timelineFor(order.fulfillment);
  const currentIndex = steps.indexOf(order.status as OrderStatus);
  const amount = Number(order.total) > 0 ? Number(order.total) : Number(order.estimated_total);

  return (
    <div className="space-y-6 pb-10">
      <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> My Orders
      </Link>

      <div className="ticket ticket-notch">
        <div className="flex items-start justify-between gap-3 p-5">
          <div>
            <h1 className="font-display text-2xl leading-none">Order #{order.order_number}</h1>
            <p className="mt-2 text-xs text-muted-foreground">
              Placed {new Date(order.created_at).toLocaleString("en-KE")}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="ticket-perf mx-5" />

        <div className="space-y-3 p-5">
          {steps.map((step, index) => {
            const done = currentIndex >= index && order.status !== "cancelled";
            return (
              <div key={step} className="flex items-center gap-3">
                <span
                  className={`flex size-6 items-center justify-center rounded-full border text-[10px] font-bold ${
                    done
                      ? "border-success bg-success text-success-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="size-3.5" /> : index + 1}
                </span>
                <span className={`text-sm ${done ? "font-medium" : "text-muted-foreground"}`}>
                  {STATUS_LABELS[step]}
                </span>
              </div>
            );
          })}
          {order.status === "cancelled" && (
            <p className="text-sm font-medium text-destructive">This order was cancelled.</p>
          )}
        </div>
      </div>

      {order.rider_phone && (
        <div className="ticket flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Your rider</p>
            <p className="font-display text-lg">{order.rider_name || "Assigned rider"}</p>
          </div>
          <a href={telHref(order.rider_phone)}>
            <Button>
              <Phone className="size-4" /> Call {order.rider_phone}
            </Button>
          </a>
        </div>
      )}

      <div className="ticket p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Items
        </h2>
        <ul className="mt-3 divide-y divide-border">
          {data.items.map((item) => {
            const qty = item.actual_quantity ?? item.estimated_quantity;
            return (
              <li key={item.id} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {item.service_name}
                    {item.tier_label ? ` · ${item.tier_label}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.pricing_type === "quote"
                      ? "Quote on request"
                      : `${qty} ${item.unit} × ${ksh(item.unit_price)}${
                          item.actual_quantity === null ? " (estimate)" : ""
                        }`}
                  </p>
                  {item.notes && <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p>}
                </div>
                <span className="text-sm font-semibold">
                  {item.pricing_type === "quote" ? "—" : ksh(item.line_total)}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="ticket-perf mt-3 flex items-center justify-between pt-3">
          <span className="text-sm text-muted-foreground">
            {Number(order.total) > 0 ? "Total" : "Estimated total"}
          </span>
          <span className="font-display text-xl">{ksh(amount)}</span>
        </div>
      </div>

      <div className="ticket space-y-3 p-5 text-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Details
        </h2>
        <p className="flex items-center gap-2">
          {order.fulfillment === "pickup" ? (
            <>
              <MapPin className="size-4 text-primary" /> Pickup — {order.address || "address on file"}
            </>
          ) : (
            <>
              <Store className="size-4 text-primary" /> Drop-off at the shop
            </>
          )}
        </p>
        {order.latitude && order.longitude && (
          <a
            className="ml-6 block text-xs text-primary hover:underline"
            href={`https://maps.google.com/?q=${order.latitude},${order.longitude}`}
            target="_blank"
            rel="noreferrer"
          >
            View GPS pin on map
          </a>
        )}
        {order.scheduled_date && (
          <p className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" /> {order.scheduled_date}
            {order.scheduled_time ? ` at ${order.scheduled_time}` : ""}
          </p>
        )}
        <p>
          Payment:{" "}
          <span className="font-medium capitalize">
            {order.payment_method === "mpesa" ? "M-Pesa" : "Cash"}
          </span>{" "}
          · pay {order.payment_timing} service ·{" "}
          <span
            className={order.payment_status === "paid" ? "font-semibold text-success" : "font-semibold"}
          >
            {order.payment_status === "paid" ? "Paid" : "Unpaid"}
          </span>
        </p>
        {order.payment_method === "mpesa" && order.payment_status !== "paid" && (
          <p className="text-xs text-muted-foreground">M-Pesa Buy Goods till: 5387296</p>
        )}
        {data.payments.map((p) => (
          <p key={p.id} className="text-xs text-muted-foreground">
            Received {ksh(p.amount)} via {p.method === "mpesa" ? "M-Pesa" : "cash"} on{" "}
            {new Date(p.received_at).toLocaleDateString("en-KE")}
            {p.reference ? ` · ref ${p.reference}` : ""}
          </p>
        ))}
        {order.notes && <p className="text-xs text-muted-foreground">Notes: {order.notes}</p>}
      </div>
    </div>
  );
}
