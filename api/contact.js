const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { name, phone, service, date, email, message } = req.body || {};

  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'Name and phone number are required.' });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const emailSubject = service
    ? `Appointment Booking: ${service} - ${name}`
    : `New Contact Request from ${name}`;

  const mailOptions = {
    from: `"${name}" <${process.env.SMTP_USER}>`,
    replyTo: email ? `"${name}" <${email}>` : process.env.SMTP_USER,
    to: process.env.COMPANY_EMAIL,
    subject: emailSubject,
    text: `Name: ${name}\nPhone: ${phone}\nService: ${service || 'N/A'}\nPreferred Date: ${date || 'N/A'}\nEmail: ${email || 'N/A'}\nMessage: ${message || 'N/A'}`,
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
            <td style="padding: 8px 0; color: #2c3e50;">${phone}</td>
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
    return res.status(200).json({ success: true, message: 'Your message has been sent successfully. We will get back to you soon!' });
  } catch (error) {
    console.error('SMTP Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send email. Please try again later.' });
  }
};
