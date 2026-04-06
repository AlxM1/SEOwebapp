/**
 * Feature Notification Email Template
 * 
 * Payload: { agency_id, feature_id, feature_name, feature_description, access_date }
 * 
 * Usage:
 *   const { buildFeatureNotificationEmail, sendFeatureNotification } = require('./feature-notification');
 *   await sendFeatureNotification(pool, notifier, {
 *     agency_id: 42,
 *     feature_id: 'aeo_score',
 *     feature_name: 'AEO Score',
 *     feature_description: 'Answer Engine Optimization score...',
 *     access_date: '2026-04-06',
 *   });
 * 
 * Wire into cron or admin trigger — no cron built here per spec.
 */

/**
 * Build email HTML for a feature access notification.
 * @param {object} payload
 * @param {string} payload.agency_name
 * @param {string} payload.feature_id
 * @param {string} payload.feature_name
 * @param {string} payload.feature_description
 * @param {string} payload.access_date
 * @param {string} payload.endpoint
 * @param {string} payload.curl_example
 * @returns {{ subject: string, html: string, text: string }}
 */
function buildFeatureNotificationEmail({ agency_name, feature_name, feature_description, access_date, endpoint, curl_example }) {
  const subject = `New feature unlocked: ${feature_name}`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#14b8a6;padding:30px 40px;">
          <h1 style="color:#ffffff;margin:0;font-size:22px;">New Feature Unlocked</h1>
          <p style="color:#ccfbf1;margin:8px 0 0;">SEO H Analysis Platform</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="color:#374151;font-size:16px;">Hi ${agency_name || 'there'},</p>
          <p style="color:#374151;font-size:15px;line-height:1.6;">
            Your account now has access to a new feature:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin:20px 0;">
            <tr><td style="padding:24px;">
              <h2 style="color:#111827;margin:0 0 8px;font-size:20px;">${feature_name}</h2>
              <p style="color:#6b7280;margin:0 0 12px;font-size:14px;">Available from ${access_date}</p>
              <p style="color:#374151;margin:0;font-size:15px;line-height:1.6;">${feature_description}</p>
            </td></tr>
          </table>
          <p style="color:#374151;font-size:14px;font-weight:600;margin-bottom:8px;">Endpoint</p>
          <code style="display:block;background:#1e293b;color:#e2e8f0;padding:12px 16px;border-radius:4px;font-size:13px;word-break:break-all;">${endpoint}</code>
          ${curl_example ? `
          <p style="color:#374151;font-size:14px;font-weight:600;margin:20px 0 8px;">Quick Start</p>
          <pre style="background:#1e293b;color:#e2e8f0;padding:16px;border-radius:4px;font-size:12px;overflow-x:auto;white-space:pre-wrap;">${curl_example}</pre>` : ''}
          <p style="margin-top:32px;">
            <a href="https://app.seoh.ca/docs" style="background:#14b8a6;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">View Full Documentation</a>
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">
            SEO H · <a href="https://app.seoh.ca" style="color:#14b8a6;">app.seoh.ca</a> · 
            <a href="https://app.seoh.ca/account" style="color:#14b8a6;">Manage account</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `New Feature Unlocked: ${feature_name}

Hi ${agency_name || 'there'},

Your account now has access to: ${feature_name}
Available from: ${access_date}

${feature_description}

Endpoint: ${endpoint}

${curl_example ? `Quick Start:\n${curl_example}\n` : ''}
View documentation: https://app.seoh.ca/docs
Manage your account: https://app.seoh.ca/account

— SEO H Platform`;

  return { subject, html, text };
}

/**
 * Send a feature notification email to a specific agency.
 * Requires a nodemailer transporter instance (or compatible notifier).
 * 
 * @param {object} pool - pg Pool instance
 * @param {object} transporter - nodemailer transporter
 * @param {object} payload - { agency_id, feature_id, feature_name, feature_description, access_date }
 */
async function sendFeatureNotification(pool, transporter, payload) {
  const { agency_id, feature_id, feature_name, feature_description, access_date } = payload;

  // Look up agency email
  const { rows } = await pool.query(
    'SELECT name, email FROM agencies WHERE id = $1 AND active = true',
    [agency_id]
  );
  if (!rows.length) throw new Error(`Agency ${agency_id} not found or inactive`);

  const { ALL_FEATURES } = require('./features');
  const feature = ALL_FEATURES.find(f => f.id === feature_id);

  const emailData = buildFeatureNotificationEmail({
    agency_name: rows[0].name,
    feature_name,
    feature_description,
    access_date,
    endpoint: feature?.endpoint || 'See documentation',
    curl_example: feature?.curl_example || null,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@seoh.ca',
    to: rows[0].email,
    subject: emailData.subject,
    html: emailData.html,
    text: emailData.text,
  });

  // Log the notification to feature_changelog
  await pool.query(
    `INSERT INTO feature_changelog (feature_id, tier, action, action_date, description, created_by)
     SELECT $1, a.tier, 'added', $2, $3, 'email-notification'
     FROM agencies a WHERE a.id = $4`,
    [feature_id, access_date, `Email notification sent to ${rows[0].email}`, agency_id]
  );

  return { sent: true, to: rows[0].email };
}

module.exports = { buildFeatureNotificationEmail, sendFeatureNotification };
