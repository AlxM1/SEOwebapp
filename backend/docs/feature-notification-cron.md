# Feature Notification Cron — Integration Guide

## Endpoint

```
POST /api/admin-saas/notify-feature-update
Header: x-admin-token: <ADMIN_TOKEN from .env>
Content-Type: application/json
```

## Payload

```json
{
  "agency_id": 42,
  "feature_ids": ["aeo", "monitor"],
  "tier": "pro"
}
```

### Valid `feature_ids` values

| Key          | Feature Name       |
|--------------|--------------------|
| `aeo`        | AEO Scoring        |
| `geo`        | GEO Scoring        |
| `crawl`      | Site Crawl         |
| `pdf`        | PDF Reports        |
| `bulk`       | Bulk Analysis      |
| `compare`    | URL Comparison     |
| `monitor`    | Site Monitoring    |
| `sitecrawl`  | Full Site Crawl    |
| `performance`| Performance Check  |

## Response

**Success (200):**
```json
{
  "ok": true,
  "notification_id": 7,
  "agency": { "id": 42, "name": "Pacific Agency", "email": "hello@pacific.ca" },
  "email_sent": true,
  "message_id": "re_abc123",
  "message": "Feature notification sent successfully"
}
```

**Email queued but delivery failed (207):**
```json
{
  "ok": false,
  "notification_id": 8,
  "email_sent": false,
  "email_error": "Resend API error 401: ...",
  "message": "Notification logged but email delivery failed — check transport config"
}
```

## Wiring into cron.yml

Add this job to trigger notifications when a tier upgrade fires:

```yaml
- name: notify-feature-update
  schedule: "0 9 * * *"          # daily at 09:00 — or trigger on demand
  command: |
    curl -s -X POST https://analysis.seoh.ca/api/admin-saas/notify-feature-update \
      -H "x-admin-token: ${ADMIN_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{
        "agency_id": {{ agency_id }},
        "feature_ids": {{ feature_ids_json }},
        "tier": "{{ tier }}"
      }'
```

### Bulk notification (all agencies on a tier)

```bash
#!/bin/bash
# notify-tier.sh <tier> <feature_ids_json>
# Example: ./notify-tier.sh pro '["monitor","bulk"]'

TIER=$1
FEATURE_IDS=$2
BASE_URL="https://analysis.seoh.ca"

AGENCIES=$(curl -s -H "x-admin-token: $ADMIN_TOKEN" \
  "$BASE_URL/api/admin-saas/agencies" | jq -r '.[] | select(.tier == "'$TIER'" and .active == true) | .id')

for ID in $AGENCIES; do
  curl -s -X POST "$BASE_URL/api/admin-saas/notify-feature-update" \
    -H "x-admin-token: $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"agency_id\": $ID, \"feature_ids\": $FEATURE_IDS, \"tier\": \"$TIER\"}"
  echo "Notified agency $ID"
  sleep 0.5   # brief pause to avoid hammering email provider
done
```

## Email Transport Setup

Add to `.env` (choose one):

```bash
# Option 1: Resend (preferred)
RESEND_API_KEY=re_...
EMAIL_FROM=SEOh! <noreply@seoh.ca>

# Option 2: SMTP (nodemailer fallback)
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@seoh.ca
SMTP_PASS=yourpassword
EMAIL_FROM=SEOh! <you@seoh.ca>
```

Without either, emails are console-logged (no delivery) — safe for development.

## Checking notification log

```sql
SELECT fn.id, a.name, a.email, fn.tier, fn.feature_ids,
       fn.email_sent, fn.email_error, fn.created_at
FROM feature_notifications fn
JOIN agencies a ON a.id = fn.agency_id
ORDER BY fn.created_at DESC
LIMIT 20;
```
