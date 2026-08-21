import { Phone, Smartphone, MapPin } from "lucide-react";
import { telHref } from "@/lib/bridgette";

const PHONES = ["0706174676", "0737070520"];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-card">
      <div className="mx-auto w-full max-w-5xl px-5 py-10">
        <h2 className="font-display text-xl">Bridgette Laundry</h2>
        <p className="mt-1 text-sm text-muted-foreground">Freshness You Can Trust.</p>

        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Call or WhatsApp
            </p>
            <div className="mt-2 flex flex-col gap-1">
              {PHONES.map((p) => (
                <a
                  key={p}
                  href={telHref(p)}
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  <Phone className="size-4" /> {p}
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              M-Pesa Buy Goods
            </p>
            <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium">
              <Smartphone className="size-4 text-primary" /> Till 5387296
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Service area
            </p>
            <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium">
              <MapPin className="size-4 text-primary" /> Juja Road, Muiri &amp; Kimbo
            </p>
          </div>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Bridgette Laundry. Pickup, delivery &amp; drop-off.
        </p>
      </div>
    </footer>
  );
}
