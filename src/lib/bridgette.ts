export const ORDER_STATUSES = [
  "pending",
  "received",
  "washing",
  "ready",
  "delivered",
  "collected",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  received: "Received",
  washing: "Washing",
  ready: "Ready",
  delivered: "Delivered",
  collected: "Collected",
  cancelled: "Cancelled",
};

export const TIMELINE: OrderStatus[] = ["pending", "received", "washing", "ready"];

export function timelineFor(fulfillment: string): OrderStatus[] {
  return [...TIMELINE, fulfillment === "pickup" ? "delivered" : "collected"];
}

export function ksh(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return `KSh ${n.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

export function statusTone(status: string): string {
  switch (status) {
    case "delivered":
    case "collected":
      return "bg-success/15 text-success border-success/30";
    case "cancelled":
      return "bg-destructive/15 text-destructive border-destructive/30";
    case "ready":
      return "bg-accent/25 text-accent-foreground border-accent/40";
    case "pending":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-primary/12 text-primary border-primary/30";
  }
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/\s+/g, "")}`;
}
