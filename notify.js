const nodemailer = require("nodemailer");

let twilioClient = null;
function getTwilio(){
  if (twilioClient) return twilioClient;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  twilioClient = require("twilio")(sid, token);
  return twilioClient;
}

async function sendEmail({ to, subject, html }) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass || !to) {
    console.log("[notify] SMTP ayarı yok, email atlanıyor.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host, port,
    secure: port === 465,
    auth: { user, pass }
  });

  await transporter.sendMail({ from, to, subject, html });
  console.log("[notify] Email gönderildi:", to);
}

async function sendSms({ to, body }) {
  const client = getTwilio();
  const from = process.env.TWILIO_SMS_FROM;
  if (!client || !from || !to) {
    console.log("[notify] Twilio SMS ayarı yok, sms atlanıyor.");
    return;
  }
  await client.messages.create({ from, to, body });
  console.log("[notify] SMS gönderildi:", to);
}

async function sendWhatsApp({ to, body }) {
  const client = getTwilio();
  const from = process.env.TWILIO_WA_FROM;
  if (!client || !from || !to) {
    console.log("[notify] Twilio WhatsApp ayarı yok, wa atlanıyor.");
    return;
  }
  const waTo = to.startsWith("whatsapp:") ? to : `whatsapp:+${to.replace(/\D/g,"")}`;
  await client.messages.create({ from, to: waTo, body });
  console.log("[notify] WhatsApp gönderildi:", waTo);
}

module.exports = { sendEmail, sendSms, sendWhatsApp };
