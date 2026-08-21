import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Crosshair, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ksh } from "@/lib/bridgette";

export const Route = createFileRoute("/_authenticated/orders/new")({
  head: () => ({
    meta: [
      { title: "New Order — Bridgette Laundry" },
      {
        name: "description",
        content: "Book a laundry pickup or shop drop-off with Bridgette Laundry.",
      },
      { property: "og:title", content: "New Order — Bridgette Laundry" },
      { property: "og:description", content: "Book a laundry pickup or shop drop-off." },
    ],
  }),
  component: NewOrder,
});

type Draft = { key: string; serviceId: string; tierId: string; quantity: string; notes: string };

function NewOrder() {
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<Draft[]>([]);
  const [fulfillment, setFulfillment] = useState("pickup");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [paymentTiming, setPaymentTiming] = useState("after");
  const [paymentMethod, setPaymentMethod] = useState("mpesa");
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["price-list"],
    queryFn: async () => {
      const [services, tiers] = await Promise.all([
        supabase.from("services").select("*").eq("active", true).order("sort_order"),
        supabase.from("service_tiers").select("*").order("sort_order"),
      ]);
      if (services.error) throw services.error;
      if (tiers.error) throw tiers.error;
      return { services: services.data, tiers: tiers.data };
    },
  });

  const services = data?.services ?? [];
  const tiers = data?.tiers ?? [];

  function addItem() {
    const first = services[0];
    if (!first) return;
    setItems((prev) => [
      ...prev,
      { key: crypto.randomUUID(), serviceId: first.id, tierId: "", quantity: "1", notes: "" },
    ]);
  }

  function patch(key: string, changes: Partial<Draft>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...changes } : i)));
  }

  const priced = useMemo(
    () =>
      items.map((item) => {
        const service = services.find((s) => s.id === item.serviceId);
        const tier = tiers.find((t) => t.id === item.tierId);
        const qty = Number(item.quantity) || 0;
        const unitPrice =
          service?.pricing_type === "tier"
            ? Number(tier?.price ?? 0)
            : Number(service?.base_price ?? 0);
        const isQuote = service?.pricing_type === "quote";
        return { item, service, tier, qty, unitPrice, total: isQuote ? 0 : unitPrice * qty, isQuote };
      }),
    [items, services, tiers],
  );

  const estimate = priced.reduce((sum, p) => sum + p.total, 0);
  const hasQuote = priced.some((p) => p.isQuote);

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Location is not available on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success("GPS pin attached to this order.");
      },
      () => toast.error("Could not get your location. You can type the address instead."),
    );
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    if (items.length === 0) {
      toast.error("Add at least one item to your order.");
      return;
    }
    for (const p of priced) {
      if (p.service?.pricing_type === "tier" && !p.tier) {
        toast.error(`Choose a size for ${p.service.name}.`);
        return;
      }
    }

    const form = new FormData(e.currentTarget);
    setBusy(true);

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        customer_id: user.id,
        contact_name: String(form.get("contact_name") ?? ""),
        contact_phone: String(form.get("contact_phone") ?? ""),
        fulfillment: fulfillment as "pickup" | "dropoff",
        address: fulfillment === "pickup" ? String(form.get("address") ?? "") : null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        scheduled_date: String(form.get("scheduled_date") ?? "") || null,
        scheduled_time: String(form.get("scheduled_time") ?? "") || null,
        payment_timing: paymentTiming as "before" | "after",
        payment_method: paymentMethod as "cash" | "mpesa",
        estimated_total: estimate,
        notes: String(form.get("notes") ?? "") || null,
      })
      .select()
      .single();

    if (error || !order) {
      setBusy(false);
      toast.error(error?.message ?? "Could not create the order.");
      return;
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      priced.map((p) => ({
        order_id: order.id,
        service_id: p.service!.id,
        service_name: p.service!.name,
        pricing_type: p.service!.pricing_type,
        tier_id: p.tier?.id ?? null,
        tier_label: p.tier?.label ?? null,
        unit: p.service!.unit,
        estimated_quantity: p.qty,
        unit_price: p.unitPrice,
        line_total: p.total,
        notes: p.item.notes || null,
      })),
    );

    setBusy(false);
    if (itemsError) {
      toast.error(itemsError.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["my-orders"] });
    toast.success("Order placed. We'll confirm shortly.");
    navigate({ to: "/orders/$id", params: { id: order.id } });
  }

  return (
    <form onSubmit={submit} className="space-y-8 pb-10">
      <div>
        <h1 className="font-display text-2xl">New Order</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mix as many services as you like in one order.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Items
          </h2>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="size-4" /> Add item
          </Button>
        </div>

        {items.length === 0 && (
          <div className="ticket stub-stripe p-6 text-center text-sm text-muted-foreground">
            No items yet — tap &ldquo;Add item&rdquo; to start.
          </div>
        )}

        {priced.map(({ item, service, qty, unitPrice, total, isQuote }) => {
          const serviceTiers = tiers.filter((t) => t.service_id === item.serviceId);
          return (
            <div key={item.key} className="ticket space-y-3 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Service</Label>
                  <Select
                    value={item.serviceId}
                    onValueChange={(v) => patch(item.key, { serviceId: v, tierId: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {service?.pricing_type === "tier" ? (
                  <div className="space-y-1.5">
                    <Label>Size</Label>
                    <Select
                      value={item.tierId}
                      onValueChange={(v) => patch(item.key, { tierId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose size" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceTiers.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.label} — {ksh(t.price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  !isQuote && (
                    <div className="space-y-1.5">
                      <Label>
                        {service?.pricing_type === "per_kg"
                          ? "Estimated weight (kg)"
                          : `Quantity (${service?.unit ?? "item"})`}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step={service?.pricing_type === "per_kg" ? "0.5" : "1"}
                        value={item.quantity}
                        onChange={(e) => patch(item.key, { quantity: e.target.value })}
                      />
                    </div>
                  )
                )}

                {service?.pricing_type === "tier" && (
                  <div className="space-y-1.5">
                    <Label>How many?</Label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(e) => patch(item.key, { quantity: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <Input
                placeholder="Notes (optional) — e.g. white shirts, handle with care"
                value={item.notes}
                onChange={(e) => patch(item.key, { notes: e.target.value })}
              />

              <div className="ticket-perf flex items-center justify-between pt-3 text-sm">
                <span className="text-muted-foreground">
                  {isQuote
                    ? "Quote on request — we'll confirm the price"
                    : `${qty} × ${ksh(unitPrice)}`}
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-semibold">{isQuote ? "—" : ksh(total)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setItems((prev) => prev.filter((i) => i.key !== item.key))}
                    aria-label="Remove item"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="ticket space-y-4 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Collection
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="contact_name">Your name</Label>
            <Input id="contact_name" name="contact_name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact_phone">Phone</Label>
            <Input id="contact_phone" name="contact_phone" type="tel" required />
          </div>
        </div>

        <div className="flex gap-2">
          {[
            { value: "pickup", label: "Pickup from me" },
            { value: "dropoff", label: "Drop off at shop" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFulfillment(option.value)}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                fulfillment === option.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {fulfillment === "pickup" && (
          <div className="space-y-2">
            <div className="space-y-1.5">
              <Label htmlFor="address">Pickup address</Label>
              <Textarea
                id="address"
                name="address"
                rows={2}
                placeholder="House / estate, street, landmark — Juja Road, Muiri or Kimbo"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" size="sm" onClick={useMyLocation}>
                <Crosshair className="size-4" /> Drop a GPS pin
              </Button>
              {coords && (
                <span className="text-xs text-success">
                  Pin saved: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="scheduled_date">Preferred date</Label>
            <Input id="scheduled_date" name="scheduled_date" type="date" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="scheduled_time">Preferred time</Label>
            <Input id="scheduled_time" name="scheduled_time" type="time" required />
          </div>
        </div>
      </section>

      <section className="ticket space-y-4 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Payment
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>When</Label>
            <Select value={paymentTiming} onValueChange={setPaymentTiming}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="before">Pay before service</SelectItem>
                <SelectItem value="after">Pay after service</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>How</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mpesa">M-Pesa (Till 5387296)</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Order notes</Label>
          <Textarea id="notes" name="notes" rows={2} placeholder="Anything else we should know?" />
        </div>
      </section>

      <div className="ticket ticket-notch flex items-center justify-between gap-4 p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Estimated total</p>
          <p className="font-display text-2xl">{ksh(estimate)}</p>
          {hasQuote && (
            <p className="text-xs text-muted-foreground">House cleaning quoted separately.</p>
          )}
        </div>
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? "Placing…" : "Place order"}
        </Button>
      </div>
    </form>
  );
}
