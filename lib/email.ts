import { Resend } from 'resend'

export async function sendVerificationEmail(params: {
  to: string
  name: string
  token: string
}) {
  const { to, name, token } = params
  const siteUrl = process.env.NEXTAUTH_URL || ''
  const verifyUrl = `${siteUrl}/verify?token=${token}`
  const logoUrl = `${siteUrl}/logo-full.png`
  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'Gramafin <onboarding@resend.dev>',
    to,
    subject: 'Verify your Gramafin account',
    html: verificationEmailHtml({ name, verifyUrl, logoUrl }),
    text: verificationEmailText({ name, verifyUrl }),
  })
}

function verificationEmailHtml(params: { name: string; verifyUrl: string; logoUrl: string }): string {
  const { name, verifyUrl, logoUrl } = params
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
                <img src="${logoUrl}" alt="Gramafin" width="120" style="display:block; height:auto; border:0;" />
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px;">
                <h1 style="margin:0 0 12px 0; font-size:18px; line-height:1.4; color:#0f0f0e;">Verify your email</h1>
                <p style="margin:0; font-size:14px; line-height:1.6; color:#4a4945;">
                  Hi ${escapeHtml(name)}, thanks for signing up for Gramafin. Confirm your email address to activate your account and start tracking your finances.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:8px; background-color:#008037;">
                      <a href="${verifyUrl}" style="display:inline-block; padding:12px 28px; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none;">
                        Verify email
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 32px 32px; border-top:1px solid #f0efe9;">
                <p style="margin:20px 0 0 0; font-size:12px; line-height:1.6; color:#8a8880;">
                  This link expires in 24 hours. If the button doesn't work, copy and paste this URL into your browser:
                </p>
                <p style="margin:8px 0 0 0; font-size:12px; line-height:1.6; word-break:break-all;">
                  <a href="${verifyUrl}" style="color:#008037;">${verifyUrl}</a>
                </p>
              </td>
            </tr>
          </table>
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%;">
            <tr>
              <td style="padding:20px 8px; text-align:center;">
                <p style="margin:0; font-size:12px; color:#8a8880;">
                  If you didn't create a Gramafin account, you can safely ignore this email.
                </p>
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

function verificationEmailText(params: { name: string; verifyUrl: string }): string {
  const { name, verifyUrl } = params
  return [
    `Hi ${name},`,
    '',
    'Thanks for signing up for Gramafin. Confirm your email address to activate your account:',
    verifyUrl,
    '',
    'This link expires in 24 hours. If you didn\'t create this account, you can ignore this email.',
  ].join('\n')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
