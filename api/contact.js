const nodemailer = require('nodemailer');

// Helper: Sanitize string to prevent HTML/XSS injection
function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Helper: RFC 5322 compliant email validator
function isValidEmail(email) {
  if (typeof email !== 'string' || email.length > 254) return false;
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return regex.test(email);
}

// Helper: Phone validator
function isValidPhone(phone) {
  if (!phone) return true;
  const regex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/;
  return regex.test(phone);
}

module.exports = async (req, res) => {
  // CORS & Response Headers
  res.setHeader('Content-Type', 'application/json');
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Invalid Request Method -> 405 Method Not Allowed
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed',
      message: `HTTP method ${req.method} is not allowed. Use POST.`
    });
  }

  // 2. Empty or Malformed Request Body -> 400 Bad Request
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Request body must be a valid JSON object.'
    });
  }

  try {
    const raw = req.body;

    // 3. Honeypot check (anti-spam bot trap)
    if (raw.website_hp && raw.website_hp.trim() !== '') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Spam detected.'
      });
    }

    // 4. Extract and trim all input values (handles empty values)
    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
    const phone = typeof raw.phone === 'string' ? raw.phone.trim() : '';
    const service = typeof raw.service === 'string' ? raw.service.trim() : '';
    const date = typeof raw.date === 'string' ? raw.date.trim() : '';
    const subject = typeof raw.subject === 'string' ? raw.subject.trim() : '';
    const message = typeof raw.message === 'string' ? raw.message.trim() : '';

    // 5. Backend Field Validation Rules (collects all errors)
    const errors = [];

    // --- Name Validation ---
    if (!name) {
      errors.push({ field: 'name', message: 'Full name is required.' });
    } else if (name.length < 2) {
      errors.push({ field: 'name', message: 'Name must be at least 2 characters long.' });
    } else if (name.length > 80) {
      errors.push({ field: 'name', message: 'Name cannot exceed 80 characters.' });
    }

    // --- Email Validation ---
    if (email && !isValidEmail(email)) {
      errors.push({ field: 'email', message: 'Please provide a valid email address.' });
    }

    // --- Phone Validation ---
    if (!phone && !email) {
      errors.push({ field: 'phone', message: 'Please provide either a phone number or an email address.' });
    } else if (phone && !isValidPhone(phone)) {
      errors.push({ field: 'phone', message: 'Please provide a valid phone number (7 to 20 digits).' });
    }

    // --- Message / Service Validation ---
    if (!message && !service) {
      errors.push({ field: 'message', message: 'Please provide a message or select a service.' });
    } else if (message && message.length < 10) {
      errors.push({ field: 'message', message: 'Message must be at least 10 characters long.' });
    } else if (message && message.length > 3000) {
      errors.push({ field: 'message', message: 'Message cannot exceed 3,000 characters.' });
    }

    // --- Length guards for optional fields ---
    if (subject && subject.length > 120) {
      errors.push({ field: 'subject', message: 'Subject cannot exceed 120 characters.' });
    }
    if (service && service.length > 100) {
      errors.push({ field: 'service', message: 'Service name cannot exceed 100 characters.' });
    }

    // 6. Return 422 Unprocessable Entity if validation failed
    if (errors.length > 0) {
      return res.status(422).json({
        success: false,
        error: 'Unprocessable Entity',
        message: 'Validation failed. Please correct the highlighted errors.',
        errorCount: errors.length,
        errors: errors
      });
    }

    // 7. Data is clean & validated -> Proceed to SMTP
    const cleanData = {
      name: sanitizeText(name),
      email: email || null,
      phone: phone || null,
      service: sanitizeText(service) || null,
      date: sanitizeText(date) || null,
      subject: sanitizeText(subject) || (service ? `Appointment Booking: ${service}` : 'New Website Inquiry'),
      message: sanitizeText(message) || `Appointment requested for ${service} on ${date || 'N/A'}.`,
      receivedAt: new Date().toISOString()
    };

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      secure: process.env.SMTP_SECURE !== 'false',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">${cleanData.subject}</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 8px 0; color: #7f8c8d; font-weight: bold; width: 140px;">Name:</td>
            <td style="padding: 8px 0; color: #2c3e50;">${cleanData.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #7f8c8d; font-weight: bold;">Contact:</td>
            <td style="padding: 8px 0; color: #2c3e50;">${cleanData.phone || cleanData.email || 'N/A'}</td>
          </tr>
          ${cleanData.service ? `
          <tr>
            <td style="padding: 8px 0; color: #7f8c8d; font-weight: bold;">Service:</td>
            <td style="padding: 8px 0; color: #2c3e50;"><strong>${cleanData.service}</strong></td>
          </tr>` : ''}
          ${cleanData.date ? `
          <tr>
            <td style="padding: 8px 0; color: #7f8c8d; font-weight: bold;">Preferred Date:</td>
            <td style="padding: 8px 0; color: #2c3e50;">${cleanData.date}</td>
          </tr>` : ''}
        </table>
        <div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-left: 4px solid #3498db; border-radius: 4px;">
          <strong style="color: #2c3e50;">Message / Details:</strong>
          <p style="color: #34495e; white-space: pre-line; line-height: 1.6; margin-top: 8px;">${cleanData.message}</p>
        </div>
        <p style="font-size: 12px; color: #95a5a6; margin-top: 25px; border-top: 1px solid #eee; padding-top: 10px;">
          Received: ${cleanData.receivedAt}
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: `"${cleanData.name}" <${process.env.SMTP_USER}>`,
      replyTo: cleanData.email ? `"${cleanData.name}" <${cleanData.email}>` : process.env.SMTP_USER,
      to: process.env.COMPANY_EMAIL,
      subject: cleanData.subject,
      html: emailHtml,
    });

    // 8. Success Response -> 200 OK
    return res.status(200).json({
      success: true,
      message: 'Your message has been validated and sent successfully.',
      data: {
        name: cleanData.name,
        subject: cleanData.subject,
        timestamp: cleanData.receivedAt
      }
    });

  } catch (error) {
    // 9. Server Error -> 500 Internal Server Error (Never leak stack trace to user)
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to process request due to a server error. Please try again later.'
    });
  }
};
