import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function sendOtpEmail(to: string, code: string, purpose: 'verify' | 'reset' | 'login-2fa') {
  const subject =
    purpose === 'verify'
      ? 'Verify your email'
      : purpose === 'reset'
        ? 'Reset your password'
        : 'Your sign-in code';

  const heading =
    purpose === 'verify'
      ? 'Confirm your email address'
      : purpose === 'reset'
        ? 'Reset your password'
        : 'Two-factor sign-in code';

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color:#1470cb; margin-bottom: 8px;">${heading}</h2>
        <p style="color:#444; font-size:15px;">Use the code below. It expires in 10 minutes.</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; background:#f4f4f5; padding: 16px 24px; border-radius: 8px; text-align:center; margin: 20px 0;">
          ${code}
        </div>
        <p style="color:#888; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

export async function sendLoginAlertEmail(to: string, device: string, location: string, ip: string) {
  await getTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: 'New sign-in to your account',
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color:#1470cb;">New sign-in detected</h2>
        <p style="color:#444; font-size:15px;">A new sign-in to your account was just made.</p>
        <ul style="color:#444; font-size: 14px;">
          <li><strong>Device:</strong> ${device}</li>
          <li><strong>Location:</strong> ${location}</li>
          <li><strong>IP address:</strong> ${ip}</li>
        </ul>
        <p style="color:#888; font-size: 13px;">If this wasn't you, change your password immediately and review your active sessions.</p>
      </div>
    `,
  });
}
