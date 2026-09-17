require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const app = express();

// 1. Trust proxy (Required for rate limiting behind Vercel reverse proxy)
app.set('trust proxy', 1);

// 2. Request body parser (with size safety limits to prevent payload attacks)
app.use(express.json({ limit: '10kb' }));

// 3. CORS Configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5500',
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser requests (Postman/cURL) or allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy: Origin not allowed.'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
};

app.use(cors(corsOptions));

// 4. Rate Limiting (Prevents spam flooding: max 5 submissions per 15 minutes per IP)
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many messages sent from this IP. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 5. Setup Nodemailer Transporter with SMTP connection pooling
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  pool: true,
  maxConnections: 3,
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 6. Contact Form POST Endpoint
app.post(
  '/api/contact',
  contactLimiter,
  [
    // Validation & Sanitization rules
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required.')
      .isLength({ max: 80 }).withMessage('Name must be under 80 characters.')
      .escape(),
    body('email')
      .optional({ checkFalsy: true })
      .trim()
      .isEmail().withMessage('Please provide a valid email address.')
      .normalizeEmail(),
    body('phone')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 30 }).withMessage('Phone number is too long.')
      .escape(),
    body('service')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 100 }).withMessage('Service name is too long.')
      .escape(),
    body('date')
      .optional({ checkFalsy: true })
      .trim()
      .escape(),
    body('subject')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 120 }).withMessage('Subject must be under 120 characters.')
      .escape(),
    body('message')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 2000 }).withMessage('Message must be under 2000 characters.')
      .escape(),
    // Honeypot field for bot detection (should stay empty)
    body('website_hp').custom((value) => {
      if (value) {
        throw new Error('Spam detected.');
      }
      return true;
    }),
  ],
  async (req, res) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed.',
        errors: errors.array().map((err) => ({ field: err.path, msg: err.msg })),
      });
    }

    const { name, email, phone, service, date, subject, message } = req.body;

    const emailSubject = subject
      ? `Contact Inquiry: ${subject}`
      : service
      ? `Appointment Booking: ${service} - ${name}`
      : `New Submission from ${name}`;

    // Mail options
    const mailOptions = {
      from: `"${name}" <${process.env.SMTP_USER}>`,
      replyTo: email ? `"${name}" <${email}>` : process.env.SMTP_USER,
      to: process.env.COMPANY_EMAIL,
      subject: emailSubject,
      text: `Name: ${name}\nPhone: ${phone || 'N/A'}\nEmail: ${email || 'N/A'}\nService: ${service || 'N/A'}\nDate: ${date || 'N/A'}\n\nMessage:\n${message || 'N/A'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">${emailSubject}</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr>
              <td style="padding: 8px 0; color: #7f8c8d; font-weight: bold; width: 140px;">Name:</td>
              <td style="padding: 8px 0; color: #2c3e50;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #7f8c8d; font-weight: bold;">Phone:</td>
              <td style="padding: 8px 0; color: #2c3e50;">${phone || 'Not provided'}</td>
            </tr>
            ${email ? `
            <tr>
              <td style="padding: 8px 0; color: #7f8c8d; font-weight: bold;">Email:</td>
              <td style="padding: 8px 0; color: #2c3e50;"><a href="mailto:${email}">${email}</a></td>
            </tr>` : ''}
            ${service ? `
            <tr>
              <td style="padding: 8px 0; color: #7f8c8d; font-weight: bold;">Service:</td>
              <td style="padding: 8px 0; color: #2c3e50;"><strong>${service}</strong></td>
            </tr>` : ''}
            ${date ? `
            <tr>
              <td style="padding: 8px 0; color: #7f8c8d; font-weight: bold;">Preferred Date:</td>
              <td style="padding: 8px 0; color: #2c3e50;">${date}</td>
            </tr>` : ''}
          </table>
          ${message ? `
          <div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-left: 4px solid #3498db; border-radius: 4px;">
            <strong style="color: #2c3e50;">Message:</strong>
            <p style="color: #34495e; white-space: pre-line; line-height: 1.6; margin-top: 8px;">${message}</p>
          </div>` : ''}
          <p style="font-size: 12px; color: #95a5a6; margin-top: 25px; border-top: 1px solid #eee; padding-top: 10px;">
            Submitted on ${new Date().toLocaleString()}
          </p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      return res.status(200).json({
        success: true,
        message: 'Your message has been sent successfully. We will get back to you soon!',
      });
    } catch (error) {
      console.error('SMTP Delivery Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send your message due to a mail server error. Please try again later.',
      });
    }
  }
);

// Fallback 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Local Development listener (Only starts server when run directly, not when imported by Vercel)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Backend server running locally on http://localhost:${PORT}`);
  });
}

// Export the Express app for Vercel Serverless Function
module.exports = app;