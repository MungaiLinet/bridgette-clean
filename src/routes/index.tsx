import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Truck, Store, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/SiteFooter";
import { ksh } from "@/lib/bridgette";
import heroImage from "@/assets/hero-laundry.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bridgette Laundry — Freshness You Can Trust" },
      {
        name: "description",
        content:
          "Laundry pickup, delivery and drop-off in Juja Road, Muiri and Kimbo. Clothes, curtains, mats, shoes, duvets, carpets and house cleaning.",
      },
      { property: "og:title", content: "Bridgette Laundry — Freshness You Can Trust" },
      {
        property: "og:description",
        content:
          "Laundry pickup, delivery and drop-off in Juja Road, Muiri and Kimbo. Book a wash in minutes.",
      },
    ],
  }),
  component: Home,
});

function usePriceList() {
  return useQuery({
    queryKey: ["public-price-list"],
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
}

function priceText(
  service: { pricing_type: string; base_price: number | null; unit: string },
  tiers: { price: number }[],
) {
  if (service.pricing_type === "quote") return "Quote on request";
  if (service.pricing_type === "tier") {
    if (!tiers.length) return "By size";
    const prices = tiers.map((t) => Number(t.price));
    return `${ksh(Math.min(...prices))} – ${ksh(Math.max(...prices))}`;
  }
  if (service.pricing_type === "per_kg") return `${ksh(service.base_price)} / kg`;
  return `${ksh(service.base_price)} / ${service.unit}`;
}

function Home() {
  const { data } = usePriceList();

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4">
        <span className="font-display text-lg font-semibold">Bridgette Laundry</span>
        <Link to="/auth">
          <Button variant="ghost" size="sm">
            Sign in
          </Button>
        </Link>
      </header>

      <main className="mx-auto w-full max-w-5xl px-5">
        <section className="grid items-center gap-8 py-8 md:grid-cols-2 md:py-14">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="size-3.5" /> Juja Road · Muiri · Kimbo
            </p>
            <h1 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">
              Freshness You Can Trust.
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
              Bridgette Laundry washes, dries and folds for homes and businesses. We pick up from
              your door, or you drop off at the shop — then we bring everything back fresh, on time
              and neatly packed.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link to="/auth">
                <Button size="lg">
                  Get Started <ArrowRight className="size-4" />
                </Button>
              </Link>
              <span className="text-sm text-muted-foreground">Till 5387296 · 0706174676</span>
            </div>

            <div className="mt-8 flex flex-wrap gap-5 text-sm">
              <span className="inline-flex items-center gap-2">
                <Truck className="size-4 text-primary" /> Pickup &amp; delivery
              </span>
              <span className="inline-flex items-center gap-2">
                <Store className="size-4 text-primary" /> Shop drop-off
              </span>
            </div>
          </div>

          <div className="ticket overflow-hidden p-2">
            <img
              src={heroImage}
              alt="Freshly folded laundry stacked in woven baskets"
              width={1280}
              height={960}
              className="h-full w-full rounded-lg object-cover"
            />
          </div>
        </section>

        <section className="py-8">
          <h2 className="font-display text-2xl">Price list</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Clear rates, no surprises. Final totals are confirmed after weighing at the shop.
          </p>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {(data?.services ?? []).map((service) => {
              const tiers = (data?.tiers ?? []).filter((t) => t.service_id === service.id);
              return (
                <li key={service.id} className="ticket p-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="font-display text-lg">{service.name}</h3>
                    <span className="whitespace-nowrap text-sm font-semibold text-primary">
                      {priceText(service, tiers)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
                  {tiers.length > 0 && (
                    <div className="ticket-perf mt-3 pt-3">
                      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                        {tiers.map((t) => (
                          <div key={t.id} className="flex gap-1.5">
                            <dt>{t.label}</dt>
                            <dd className="font-semibold text-foreground">{ksh(t.price)}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="ticket ticket-notch my-10 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl">Ready for a fresh load?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create an account, place an order and track it from pending to delivered.
            </p>
          </div>
          <Link to="/auth">
            <Button size="lg">
              Get Started <ArrowRight className="size-4" />
            </Button>
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
