import { Link } from "@tanstack/react-router";
import { CalendarDays, MapPin, Store } from "lucide-react";
import { ksh, STATUS_LABELS, statusTone, type OrderStatus } from "@/lib/bridgette";

export type OrderRow = {
  id: string;
  order_number: number;
  status: string;
  fulfillment: string;
  address: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  total: number;
  estimated_total: number;
  payment_status: string;
  contact_name: string;
  created_at: string;
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusTone(status)}`}
    >
      {STATUS_LABELS[status as OrderStatus] ?? status}
    </span>
  );
}

export function OrderTicket({
  order,
  to,
  showCustomer = false,
}: {
  order: OrderRow;
  to: string;
  showCustomer?: boolean;
}) {
  const amount = Number(order.total) > 0 ? Number(order.total) : Number(order.estimated_total);

  return (
    <Link to={to} params={{ id: order.id }} className="block">
      <article className="ticket ticket-notch transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-3 p-4">
          <div>
            <p className="font-display text-lg leading-none">#{order.order_number}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {new Date(order.created_at).toLocaleDateString("en-KE", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {showCustomer && order.contact_name ? ` · ${order.contact_name}` : ""}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="ticket-perf mx-4" />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            {order.fulfillment === "pickup" ? (
              <>
                <MapPin className="size-3.5" /> {order.address || "Pickup"}
              </>
            ) : (
              <>
                <Store className="size-3.5" /> Drop-off at shop
              </>
            )}
          </span>
          {order.scheduled_date && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              {order.scheduled_date}
              {order.scheduled_time ? ` · ${order.scheduled_time}` : ""}
            </span>
          )}
          <span className="ml-auto font-semibold text-foreground">
            {ksh(amount)}
            <span
              className={`ml-2 font-medium ${
                order.payment_status === "paid" ? "text-success" : "text-muted-foreground"
              }`}
            >
              {order.payment_status === "paid" ? "Paid" : "Unpaid"}
            </span>
          </span>
        </div>
      </article>
    </Link>
  );
}
