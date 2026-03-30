# Stripe + QuickBooks Migration Guide

## Overview
Replace LemonSqueezy billing with Stripe Checkout + Stripe Billing (subscriptions). Connect Stripe to QuickBooks Online for automatic bookkeeping. Total code changes: 2 files (billing.js, webhooks.js) + 3 new env vars.

---

## Step 1: Stripe Account Setup (Alex — 15 min)

1. Go to https://dashboard.stripe.com/register
2. Sign up with alex@seoh.ca (or your SEO H business email)
3. Complete business verification:
   - Business type: Company/Sole proprietor
   - Business name: SEOh! / 00raiser (however the business is registered)
   - Country: Canada
   - Currency: CAD (or USD if you want international pricing)
4. Go to **Developers → API Keys**
   - Copy **Publishable key** (starts with `pk_live_`)
   - Copy **Secret key** (starts with `sk_live_`)
   - Store both — you'll need them for `.env`

### Create Products + Prices

In Stripe Dashboard → **Products**:

| Product | Price (monthly) | Notes |
|---------|----------------|-------|
| SEO Analytics — Starter | $59.99 CAD/mo | Recurring, monthly |
| SEO Analytics — Pro | $109.99 CAD/mo | Recurring, monthly |
| SEO Analytics — Agency | $399.99 CAD/mo | Recurring, monthly |

For each:
1. Click **+ Add Product**
2. Name: e.g. "SEO Analytics — Starter"
3. Pricing: Recurring → $59.99 → Monthly
4. Save
5. Copy the **Price ID** (starts with `price_`)

You'll have 3 Price IDs.

### Set Up Webhook

1. Go to **Developers → Webhooks**
2. Click **+ Add endpoint**
3. Endpoint URL: `https://analysis.seoh.ca/api/webhooks/stripe`
4. Events to send:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Save
6. Copy the **Webhook signing secret** (starts with `whsec_`)

### Update .env

Add these to `backend/.env`:

```env
# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_STARTER=price_xxxxx
STRIPE_PRICE_PRO=price_xxxxx
STRIPE_PRICE_AGENCY=price_xxxxx

# (Remove or comment out old LemonSqueezy vars)
# LEMON_STORE_SLUG=
# LEMON_WEBHOOK_SECRET=
# LEMON_VARIANT_STARTER=
# LEMON_VARIANT_PRO=
# LEMON_VARIANT_AGENCY=
```

---

## Step 2: Code Changes (Jarvis builds these)

### File 1: `backend/routes/billing.js` — Replace LemonSqueezy checkout with Stripe Checkout

- `GET /api/billing/checkout/:tier` → Creates Stripe Checkout Session → Returns checkout URL
- `GET /api/billing/portal` → Creates Stripe Customer Portal session → Returns portal URL
- `GET /api/billing/pricing` → Returns tier info (no change)

### File 2: `backend/routes/webhooks.js` — Replace LemonSqueezy webhooks with Stripe

- `POST /api/webhooks/stripe` → Receives Stripe events → Upgrades/downgrades agencies
- Same logic: subscription active → upgrade tier, subscription cancelled → downgrade to free
- Signature verification using `stripe.webhooks.constructEvent()`

### New dependency:
```bash
cd backend && npm install stripe
```

---

## Step 3: QuickBooks Online Connection (Alex — 10 min)

Stripe has a native QuickBooks integration:

1. Go to https://marketplace.stripe.com/apps/quickbooks
2. Click **Install**
3. Authorize with your QuickBooks Online account
4. Configure:
   - **Income account**: select your revenue account
   - **Sync mode**: Automatic
   - **What to sync**: Payments, refunds, fees

This means: every Stripe payment automatically creates an entry in QuickBooks. Subscriptions, one-time charges, refunds — all auto-synced. No Zapier. No manual export.

Alternatively, if you want more control:
- Use **QuickBooks Banking → Connect Account → Stripe** to link your Stripe payouts bank account
- Transactions appear as bank feeds in QuickBooks for manual categorization

---

## Step 4: Verify Everything Works

After code is deployed:

1. Register a test account on analysis.seoh.ca
2. Click Upgrade → Starter
3. Should redirect to Stripe Checkout (hosted page, SSL, card input)
4. Complete payment with Stripe test card: `4242 4242 4242 4242`
5. Webhook fires → agency tier upgrades
6. Check QuickBooks → payment should appear within minutes
7. Go to Customer Portal → should show active subscription with cancel/upgrade options

---

## Timeline

| Task | Who | Time |
|------|-----|------|
| Stripe account setup + products + webhook | Alex | 15 min |
| Code: replace billing.js + webhooks.js | Jarvis | 1-2 hours |
| npm install stripe on server | Alex (or Jarvis via SSH) | 2 min |
| Deploy updated code | Alex | 5 min (git pull + restart) |
| QuickBooks Stripe integration | Alex | 10 min |
| End-to-end test | Both | 15 min |

Total: ~2-3 hours including testing.

---

## Notes

- Stripe fees: 2.9% + 30¢ per transaction (Canada). Lower than LemonSqueezy's 5% + 50¢.
- Stripe handles all PCI compliance, card storage, retry logic for failed payments.
- Customer portal lets users upgrade/downgrade/cancel without you building UI.
- Tax collection: Stripe Tax can auto-calculate Canadian GST/PST if enabled.
