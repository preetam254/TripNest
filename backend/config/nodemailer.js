import nodemailer from 'nodemailer';

const createTransporter = async () => {
  // If credentials are provided in env, use them
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Fallback to Ethereal Mail for testing/development
  const testAccount = await nodemailer.createTestAccount();
  console.log('Nodemailer: Using Ethereal test account credentials.');
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
};

export const sendMail = async ({ to, subject, text, html }) => {
  try {
    const transporter = await createTransporter();
    const info = await transporter.sendMail({
      from: `"TripNest Support" <${process.env.EMAIL_FROM || 'support@tripnest.com'}>`,
      to,
      subject,
      text,
      html,
    });

    console.log(`Email sent: ${info.messageId}`);
    
    // If using ethereal, output url
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`Preview Email URL: ${previewUrl}`);
    }
    return info;
  } catch (error) {
    console.error(`Error sending email: ${error.message}`);
    return null;
  }
};
