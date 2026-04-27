'use server'

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Voltura Power Group <estimates@volturapower.energy>'

// ─── Estimate link ───────────────────────────────────────────────────────────

export async function sendEstimateEmail({
  to,
  customerName,
  estimateId,
  total,
}: {
  to: string
  customerName: string
  estimateId: string
  total: number
}) {
  const link = `${process.env.NEXT_PUBLIC_APP_URL}/estimates/${estimateId}/view`
  const firstName = customerName.split(' ')[0]
  const formattedTotal = `$${total.toLocaleString()}`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a1628;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1628;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;">
        <!-- Header -->
        <tr><td style="padding-bottom:24px;">
          <p style="margin:0;color:#f5c842;font-size:22px;font-weight:900;letter-spacing:4px;">VOLTURA</p>
          <p style="margin:4px 0 0;color:#64748b;font-size:12px;">Power Group · Colorado Springs, CO · License #3001608</p>
        </td></tr>
        <!-- Card -->
        <tr><td style="background:#0f2040;border-radius:16px;padding:28px;">
          <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;">Hi ${firstName},</p>
          <p style="margin:0 0 20px;color:#f1f5f9;font-size:15px;line-height:1.5;">
            Your estimate from Voltura Power Group is ready to review. Tap the button below to view your options, ask questions, or approve the work.
          </p>
          <!-- Total -->
          <table width="100%" style="background:#0a1628;border-radius:12px;margin-bottom:20px;">
            <tr>
              <td style="padding:16px 20px;">
                <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Estimate Total</p>
                <p style="margin:4px 0 0;color:#f5c842;font-size:28px;font-weight:800;">${formattedTotal}</p>
              </td>
            </tr>
          </table>
          <!-- CTA -->
          <a href="${link}" style="display:block;background:#f5c842;color:#0a1628;text-align:center;padding:14px;border-radius:12px;font-weight:800;font-size:15px;text-decoration:none;">
            View &amp; Approve Estimate →
          </a>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 0 0;text-align:center;">
          <p style="margin:0;color:#334155;font-size:12px;">Questions? Reply to this email or call (719) 555-0100</p>
          <p style="margin:6px 0 0;color:#1e3a5f;font-size:11px;">Voltura Power Group · volturapower.energy</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Your Estimate from Voltura Power Group — ${formattedTotal}`,
    html,
  })

  if (error) throw new Error(error.message)
}

// ─── Invoice link ─────────────────────────────────────────────────────────────

export async function sendInvoiceEmail({
  to,
  customerName,
  invoiceId,
  total,
  balance,
}: {
  to: string
  customerName: string
  invoiceId: string
  total: number
  balance: number
}) {
  const link = `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${invoiceId}/view`
  const firstName = customerName.split(' ')[0]
  const formattedBalance = `$${balance.toLocaleString()}`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a1628;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1628;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;">
        <tr><td style="padding-bottom:24px;">
          <p style="margin:0;color:#f5c842;font-size:22px;font-weight:900;letter-spacing:4px;">VOLTURA</p>
          <p style="margin:4px 0 0;color:#64748b;font-size:12px;">Power Group · Colorado Springs, CO · License #3001608</p>
        </td></tr>
        <tr><td style="background:#0f2040;border-radius:16px;padding:28px;">
          <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;">Hi ${firstName},</p>
          <p style="margin:0 0 20px;color:#f1f5f9;font-size:15px;line-height:1.5;">
            Thank you for choosing Voltura Power Group! Your invoice is ready. View and pay online using the link below.
          </p>
          <table width="100%" style="background:#0a1628;border-radius:12px;margin-bottom:20px;">
            <tr>
              <td style="padding:16px 20px;">
                <p style="margin:0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Balance Due</p>
                <p style="margin:4px 0 0;color:#f5c842;font-size:28px;font-weight:800;">${formattedBalance}</p>
              </td>
            </tr>
          </table>
          <a href="${link}" style="display:block;background:#f5c842;color:#0a1628;text-align:center;padding:14px;border-radius:12px;font-weight:800;font-size:15px;text-decoration:none;">
            View Invoice →
          </a>
        </td></tr>
        <tr><td style="padding:20px 0 0;text-align:center;">
          <p style="margin:0;color:#334155;font-size:12px;">Payment accepted via Zelle, check, or cash · (719) 555-0100</p>
          <p style="margin:6px 0 0;color:#1e3a5f;font-size:11px;">Voltura Power Group · volturapower.energy</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Invoice from Voltura Power Group — ${formattedBalance} Due`,
    html,
  })

  if (error) throw new Error(error.message)
}
