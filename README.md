# Meta Pixel + Conversions API for Shopify (no-code deploy)

Browser events run through a Shopify custom pixel; server events run on **your**
Vercel. Both share an `event_id`, so Meta counts each conversion once while
getting signal from both. Purchases are confirmed server-side from Shopify's
order webhook — the part ad blockers can't stop.

```
Shopify storefront + checkout          Your Vercel                    Meta
────────────────────────────           ───────────                    ────
custom web pixel  ── fbq ─────────────────────────────────────────────▶ Pixel
       │  same event_id                                                   │
       └── POST /api/collect ──▶ hash + enrich ──▶ CAPI ─────────────────▶ CAPI
                                                                          │
order paid ──▶ Shopify webhook ──▶ /api/orders-paid ──▶ CAPI Purchase ──▶ dedupe
                                                        (purchase_<id>)
```

## Who does what
- **You do** (can't be delegated): get your Meta access token; deploy to Vercel
  (click + paste, no command line); paste the web pixel into Customer Events
  (a 2-min copy-paste — Shopify has no API for this, so nobody can do it for you).
- **Claude can do for you** (via the Shopify connection, you approve the popup):
  create the `orders/paid` webhook pointing at your Vercel URL, once it exists.

---

## Part A — Get your Meta token (5 min, you)
1. **Events Manager** → your dataset (Pixel) → copy the **Pixel ID**.
2. Same screen → **Settings → Conversions API → Generate access token**. Copy it
   somewhere safe. This is a secret — don't paste it into chat.
3. **Test Events** tab → copy the **test event code** (for checking it works).

## Part B — Deploy the server to Vercel (10 min, you, no command line)
1. Make a free **GitHub** account if you don't have one. Create a new repository
   (e.g. `meta-capi`), click **uploading an existing file**, and drag in this
   whole folder (the `api` folder, `package.json`, everything). Commit.
2. Make a free **Vercel** account, click **Add New → Project**, and **Import**
   that GitHub repo. Click **Deploy**. You'll get a URL like
   `https://meta-capi.vercel.app`.
3. In Vercel → your project → **Settings → Environment Variables**, add the
   values from `.env.example`: `META_PIXEL_ID`, `META_ACCESS_TOKEN`,
   `META_API_VERSION`, `ALLOWED_ORIGIN` (your store URL). Leave
   `SHOPIFY_WEBHOOK_SECRET` blank for now. **Redeploy** so they take effect.
4. Send me your Vercel URL. That's all I need to finish the Shopify side.

## Part C — Shopify side
1. **You:** in `shopify-web-pixel.js`, set `META_PIXEL_ID` and `COLLECT`
   (your `.../api/collect` URL). Then Shopify admin → Settings → Customer events
   → **Add custom pixel**, paste the whole file, **Save**, set Permission =
   Required, **Connect**. (2 minutes.)
2. **Claude:** I create the `orders/paid` webhook pointing at
   `.../api/orders-paid` through the Shopify connection (you'll get a confirm
   popup).
3. **You:** Shopify shows the webhook's **signing secret** — paste it into Vercel
   as `SHOPIFY_WEBHOOK_SECRET` and redeploy. Purchases are now verified +
   server-sent.

## Part D — Check it (you)
1. Put the test code in Vercel's `META_TEST_EVENT_CODE`, redeploy, open
   **Events Manager → Test Events**, browse your store. You should see events from
   **both** Browser and Server.
2. Do a test order → confirm **one** Purchase, deduped (not two). If you see two,
   the IDs aren't matching — tell me and I'll check.
3. **Settings → Event Match Quality** should climb as email/phone flow in.
4. Remove the test code for production.

## Notes (US)
- Honor CCPA/CPRA opt-outs: California opt-out visitors should send
  `{ optOut: true }` (the server already skips those). I can wire your consent
  banner to it.
- Never send Meta prohibited data (health, financial account numbers, gov IDs) —
  it can get your dataset restricted.
- `fbp`/`fbc` are never hashed; email/phone/name always are (the server does it).

## The one thing Shopify limits
Checkout/Purchase browser events must go through Shopify's sandbox — no way
around it on Shopify. But the server Purchase (Part C, step 2) is fully yours and
unblockable, so you lose nothing that matters.
