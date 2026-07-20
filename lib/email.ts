import { Resend } from 'resend'

function siteUrl(): string {
  return process.env.NEXTAUTH_URL || ''
}

function logoUrl(): string {
  return `${siteUrl()}/logo-full.png`
}

function fromAddress(): string {
  return process.env.EMAIL_FROM || 'Gramafin <onboarding@resend.dev>'
}

async function send(params: { to: string; subject: string; html: string; text: string }) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({ from: fromAddress(), to: params.to, subject: params.subject, html: params.html, text: params.text })
}

export async function sendVerificationEmail(params: { to: string; name: string; token: string }) {
  const { to, name, token } = params
  const verifyUrl = `${siteUrl()}/verify?token=${token}`

  const cardContentHtml = [
    headingBlock('Verify your email', `Hi ${escapeHtml(name)}, thanks for signing up for Gramafin. Confirm your email address to activate your account and start tracking your finances.`),
    buttonBlock(verifyUrl, 'Verify email'),
    fallbackLinkBlock(verifyUrl, "This link expires in 24 hours. If the button doesn't work, copy and paste this URL into your browser:"),
  ].join('')

  await send({
    to,
    subject: 'Verify your Gramafin account',
    html: emailLayout({
      cardContentHtml,
      footerText: "If you didn't create a Gramafin account, you can safely ignore this email.",
    }),
    text: [
      `Hi ${name},`,
      '',
      'Thanks for signing up for Gramafin. Confirm your email address to activate your account:',
      verifyUrl,
      '',
      "This link expires in 24 hours. If you didn't create this account, you can ignore this email.",
    ].join('\n'),
  })
}

export async function sendPasswordResetEmail(params: { to: string; name: string; token: string }) {
  const { to, name, token } = params
  const resetUrl = `${siteUrl()}/reset-password?token=${token}`

  const cardContentHtml = [
    headingBlock('Reset your password', `Hi ${escapeHtml(name)}, we received a request to reset the password for your Gramafin account. Click below to choose a new one.`),
    buttonBlock(resetUrl, 'Reset password'),
    fallbackLinkBlock(resetUrl, "This link expires in 1 hour. If the button doesn't work, copy and paste this URL into your browser:"),
  ].join('')

  await send({
    to,
    subject: 'Reset your Gramafin password',
    html: emailLayout({
      cardContentHtml,
      footerText: "If you didn't request a password reset, you can safely ignore this email — your password won't change.",
    }),
    text: [
      `Hi ${name},`,
      '',
      'We received a request to reset the password for your Gramafin account. Reset it here:',
      resetUrl,
      '',
      "This link expires in 1 hour. If you didn't request this, you can ignore this email.",
    ].join('\n'),
  })
}

export async function sendPasswordChangedEmail(params: { to: string; name: string; changedAt: string }) {
  const { to, name, changedAt } = params

  const cardContentHtml = [
    headingBlock('Your password was changed', `Hi ${escapeHtml(name)}, this confirms the password for your Gramafin account (${escapeHtml(to)}) was changed on ${escapeHtml(changedAt)}.`),
    noteBlock("If this was you, no action is needed. If you didn't make this change, reset your password right away from the login page."),
  ].join('')

  await send({
    to,
    subject: 'Your Gramafin password was changed',
    html: emailLayout({
      cardContentHtml,
      footerText: 'This is a security notification — no action is needed if this was you.',
    }),
    text: [
      `Hi ${name},`,
      '',
      `This confirms the password for your Gramafin account (${to}) was changed on ${changedAt}.`,
      '',
      "If this was you, no action is needed. If you didn't make this change, reset your password right away from the login page.",
    ].join('\n'),
  })
}

export async function sendReferralInviteEmail(params: { to: string; inviterName: string; referralUrl: string }) {
  const { to, inviterName, referralUrl } = params

  const cardContentHtml = [
    headingBlock(
      `${escapeHtml(inviterName)} invited you to Gramafin`,
      `Gramafin is a personal finance app for tracking net worth, expenses, budgets, and investments in PKR. ${escapeHtml(inviterName)} thought you'd find it useful.`
    ),
    buttonBlock(referralUrl, 'Create your account'),
    fallbackLinkBlock(referralUrl, "If the button doesn't work, copy and paste this URL into your browser:"),
  ].join('')

  await send({
    to,
    subject: `${inviterName} invited you to Gramafin`,
    html: emailLayout({
      cardContentHtml,
      footerText: "If you weren't expecting this, you can safely ignore this email.",
    }),
    text: [
      `${inviterName} invited you to Gramafin.`,
      '',
      'Gramafin is a personal finance app for tracking net worth, expenses, budgets, and investments in PKR.',
      '',
      'Create your account:',
      referralUrl,
      '',
      "If you weren't expecting this, you can safely ignore this email.",
    ].join('\n'),
  })
}

function emailLayout(params: { cardContentHtml: string; footerText: string }): string {
  const { cardContentHtml, footerText } = params
  return `
<!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; background-color:#f8f7f4; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f7f4;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; background-color:#ffffff; border-radius:12px; border:1px solid #eeeeee;">
            <tr>
              <td style="padding:32px 32px 24px 32px;">
                <img src="${logoUrl()}" alt="Gramafin" width="120" style="display:block; height:auto; border:0;" />
              </td>
            </tr>
            ${cardContentHtml}
          </table>
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%;">
            <tr>
              <td style="padding:20px 8px; text-align:center;">
                <p style="margin:0; font-size:12px; color:#8a8880;">${footerText}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim()
}

function headingBlock(title: string, message: string): string {
  return `<tr><td style="padding:0 32px;">
    <h1 style="margin:0 0 12px 0; font-size:18px; line-height:1.4; color:#0f0f0e;">${title}</h1>
    <p style="margin:0; font-size:14px; line-height:1.6; color:#4a4945;">${message}</p>
  </td></tr>`
}

function buttonBlock(url: string, label: string): string {
  return `<tr><td style="padding:24px 32px 32px 32px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="border-radius:8px; background-color:#008037;">
        <a href="${url}" style="display:inline-block; padding:12px 28px; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none;">${label}</a>
      </td>
    </tr></table>
  </td></tr>`
}

function fallbackLinkBlock(url: string, note: string): string {
  return `<tr><td style="padding:20px 32px 32px 32px; border-top:1px solid #f0efe9;">
    <p style="margin:20px 0 0 0; font-size:12px; line-height:1.6; color:#8a8880;">${note}</p>
    <p style="margin:8px 0 0 0; font-size:12px; line-height:1.6; word-break:break-all;">
      <a href="${url}" style="color:#008037;">${url}</a>
    </p>
  </td></tr>`
}

function noteBlock(text: string): string {
  return `<tr><td style="padding:20px 32px 32px 32px; border-top:1px solid #f0efe9;">
    <p style="margin:0; font-size:12px; line-height:1.6; color:#8a8880;">${text}</p>
  </td></tr>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
