import { Resend } from 'resend'

export async function sendVerificationEmail(params: {
  to: string
  name: string
  token: string
}) {
  const { to, name, token } = params
  const verifyUrl = `${process.env.NEXTAUTH_URL}/verify?token=${token}`
  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'Gramafin <onboarding@resend.dev>',
    to,
    subject: 'Verify your Gramafin account',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0f0f0e;">Hi ${name},</h2>
        <p style="color: #4a4945; font-size: 14px; line-height: 1.6;">
          Thanks for signing up for Gramafin. Confirm your email address to activate your account.
        </p>
        <p style="margin: 24px 0;">
          <a href="${verifyUrl}" style="background: #2563eb; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">
            Verify email
          </a>
        </p>
        <p style="color: #8a8880; font-size: 12px;">
          This link expires in 24 hours. If you didn't create this account, you can ignore this email.
        </p>
      </div>
    `,
  })
}
