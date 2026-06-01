const nodemailer = require('nodemailer');

class NotificationConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotificationConfigError';
    this.statusCode = 503;
  }
}

const hasSmtpConfig = () => Boolean(
  process.env.SMTP_HOST &&
  process.env.SMTP_PORT &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS &&
  process.env.NOTIFICATION_FROM
);

const getTransporter = () => {
  if (!hasSmtpConfig()) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const sendEmail = async ({ to, subject, text, html, required = false }) => {
  if (!to) {
    return { channel: 'email', status: 'skipped', reason: 'missing_recipient' };
  }

  const transporter = getTransporter();
  if (!transporter) {
    if (required) {
      throw new NotificationConfigError('Email verification is not configured. Add SMTP settings in backend/.env.');
    }
    return { channel: 'email', target: to, status: 'skipped', reason: 'smtp_not_configured' };
  }

  const info = await transporter.sendMail({
    from: process.env.NOTIFICATION_FROM,
    to,
    subject,
    text,
    html
  });

  return {
    channel: 'email',
    target: to,
    status: 'sent',
    messageId: info.messageId,
    sentAt: new Date()
  };
};

const sendVerificationEmail = async ({ to, code, purpose }) => {
  const isLogin = purpose === 'login';
  const subject = isLogin ? 'Your PawCare login code' : 'Verify your PawCare account';
  const intro = isLogin
    ? 'Use this code to complete your PawCare sign in.'
    : 'Use this code to verify your PawCare account.';

  return sendEmail({
    to,
    required: true,
    subject,
    text: `${intro}\n\nCode: ${code}\n\nThis code will expire soon. If you did not request it, ignore this email.`,
    html: `<p>${intro}</p><p style="font-size:24px;font-weight:700;letter-spacing:4px">${code}</p><p>This code will expire soon. If you did not request it, ignore this email.</p>`
  });
};

const hasSmsConfig = () => Boolean(
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_FROM_NUMBER
);

const formatPhoneForSms = (phone) => {
  const value = String(phone || '').trim();
  if (!value) return '';
  if (value.startsWith('+')) return value;

  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length > 10 && !digits.startsWith('0')) return `+${digits}`;
  return '';
};

const sendSms = async ({ to, body }) => {
  const phone = formatPhoneForSms(to);
  if (!phone) {
    return { channel: 'sms', status: 'skipped', reason: 'invalid_or_missing_phone' };
  }

  if (!hasSmsConfig()) {
    return { channel: 'sms', target: phone, status: 'skipped', reason: 'twilio_not_configured' };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
  const params = new URLSearchParams({
    To: phone,
    From: process.env.TWILIO_FROM_NUMBER,
    Body: body
  });

  const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  const result = await response.json();
  if (!response.ok) {
    return {
      channel: 'sms',
      target: phone,
      status: 'failed',
      reason: result.message || 'twilio_request_failed'
    };
  }

  return {
    channel: 'sms',
    target: phone,
    status: 'sent',
    messageId: result.sid,
    sentAt: new Date()
  };
};

const buildAnimalMessage = ({ animal, reporter }) => {
  const coordinates = animal.location?.coordinates || [];
  const mapLink = coordinates.length === 2
    ? `https://www.google.com/maps?q=${coordinates[1]},${coordinates[0]}`
    : 'Location coordinates not available';
  const place = [
    animal.locationDetails?.district,
    animal.locationDetails?.state
  ].filter(Boolean).join(', ');

  return {
    subject: `PawCare animal help alert: ${animal.status}`,
    text: [
      `A PawCare user reported an animal that may need help.`,
      `Animal: ${animal.animalType}`,
      `Status: ${animal.status}`,
      `Urgency: ${animal.urgency}`,
      `Need: ${animal.assistanceType}`,
      `Details: ${animal.description}`,
      `Area: ${place || 'Not provided'}`,
      `Map: ${mapLink}`,
      reporter?.name ? `Reported by: ${reporter.name}` : null,
      reporter?.email ? `Reporter email: ${reporter.email}` : null,
      reporter?.phone ? `Reporter phone: ${reporter.phone}` : null
    ].filter(Boolean).join('\n')
  };
};

const notifyNgosAboutAnimal = async ({ ngos, animal, reporter }) => {
  const notifyLimit = Math.min(Number(process.env.NGO_NOTIFY_LIMIT || 10), 25);
  const selectedNgos = ngos.slice(0, notifyLimit);
  const message = buildAnimalMessage({ animal, reporter });
  const attempts = [];

  for (const ngo of selectedNgos) {
    try {
      const emailResult = await sendEmail({
        to: ngo.email,
        subject: message.subject,
        text: message.text
      });
      attempts.push({ ngoName: ngo.name, ...emailResult });
    } catch (error) {
      attempts.push({
        ngoName: ngo.name,
        channel: 'email',
        target: ngo.email,
        status: 'failed',
        reason: error.message
      });
    }

    try {
      const smsResult = await sendSms({
        to: ngo.contactNumber,
        body: `${message.subject}. ${animal.locationDetails?.district || ''} ${animal.locationDetails?.state || ''}. Check email or call reporter.`
      });
      attempts.push({ ngoName: ngo.name, ...smsResult });
    } catch (error) {
      attempts.push({
        ngoName: ngo.name,
        channel: 'sms',
        target: ngo.contactNumber,
        status: 'failed',
        reason: error.message
      });
    }
  }

  return {
    totalNgosMatched: ngos.length,
    totalNgosAttempted: selectedNgos.length,
    attempts
  };
};

module.exports = {
  NotificationConfigError,
  notifyNgosAboutAnimal,
  sendEmail,
  sendSms,
  sendVerificationEmail
};
