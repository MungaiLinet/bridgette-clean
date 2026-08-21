# Bridgette Clean

Build a web app called Bridgette Laundry — a laundry pickup, delivery and drop-off service. "Freshness You Can Trust." Contact: 0706174676 / 0737070520. M-Pesa Buy Goods till: 5387296. Service area: Juja Road, Muiri & Kimbo.

Public homepage (no login needed): hero section with the tagline, short description of the service, a price list (Laundry 50/kg, Curtains 70/kg, Mats 50 flat, Shoes 50/pair, Duvets 200–500 by size, Carpets 200–700 by size, House Cleaning — quote on request), a "Get Started" button, and the contact details in the footer.

Auth: Supabase email/phone + password login. Every account has a role: customer or staff. After login, send people to the right dashboard based on their role.

Customer dashboard:

New Order: add multiple items to one order (mix is fine) — laundry and curtains priced by kg, mats and shoes flat rate, duvets and carpets by size tier, house cleaning as a "request a quote" option

Choose pickup (address text and/or drop a GPS pin) or drop-off at the shop, plus a preferred date and time

Choose to pay before or after service, cash or M-Pesa

My Orders: list of past and active orders with status

Order detail: items, price, status timeline (Pending → Received → Washing → Ready → Delivered/Collected), payment status, and once a rider is assigned, their phone number as a tap-to-call button

Staff dashboard:

Today's orders and a full orders queue, filterable by status

Open an order to enter actual weight (for kg-based items) or confirm size (for duvets/carpets), auto-calculate the total, adjust if needed

Update order status, assign a rider, mark payment as received (cash or M-Pesa)

Inventory: list of shop supplies (item name, quantity, unit, reorder level), low-stock flag

Pricing: edit service prices and duvet/carpet size tiers

Sales overview: revenue today, this week, this month, order counts by status

Design: clean, warm, minimal, mobile-first — most people will use this on a phone. Paper background #F7F5F0, ink text #14232B, teal accent #2D7D8C, amber accent #E8A33D, mint #4C9A6A for success states, clay #C4523A for alerts/low stock. Fraunces for headings, Inter for body text. Style order cards like a perforated laundry claim ticket. Simple top nav, no clutter, generous white space.

Database: use Supabase for auth and data — customers, staff, services, service price tiers, orders, order items, payments, inventory, and a single business_settings row for shop details.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/22875c4f-72bf-408e-865f-e1f4dee03017).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
