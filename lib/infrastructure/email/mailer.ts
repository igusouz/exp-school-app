import nodemailer from "nodemailer";

function parsePort(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const from = process.env.EMAIL_FROM ?? "no-reply@exp-school.local";

  if (process.env.SMTP_HOST) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parsePort(process.env.SMTP_PORT, 587),
      secure: process.env.SMTP_SECURE === "true",
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
    });

    await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
    });
    return;
  }

  const transporter = nodemailer.createTransport({ jsonTransport: true });
  const info = await transporter.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    text: params.text,
  });

  console.info("Email preview (jsonTransport):", info.message);
}
