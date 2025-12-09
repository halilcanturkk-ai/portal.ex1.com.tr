const nodemailer = require("nodemailer");

// SEND EMAIL
async function sendEmail({ to, subject, html }) {
  try {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;

    if (!host || !user || !pass || !to) {
      console.log("[Mail] Email ayarları eksik, gönderilemedi.");
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });

    await transporter.sendMail({ from, to, subject, html });

    console.log("[Mail] Gönderildi →", to);
  } catch (err) {
    console.log("[Mail] HATA:", err);
  }
}

module.exports = { sendEmail };
