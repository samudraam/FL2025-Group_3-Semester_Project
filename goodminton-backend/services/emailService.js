const nodemailer = require("nodemailer");

/**
 * Create email transporter (using Ethereal Email for testing)
 */
const createTransporter = async () => {
  // For test environment, use Ethereal Email
  if (process.env.NODE_ENV === "development") {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  // Production environment uses real email service
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Send OTP code email for authentication
 * @param {string} email - Recipient email address
 * @param {string} otp - 6-digit OTP code
 */
const sendOTPEmail = async (email, otp) => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: '"Goodminton" <noreply@goodminton.com>',
      to: email,
      subject: "Your Goodminton OTP",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
                    max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2E8B57; margin: 0;">goodminton</h1>
          </div>
          
          <div style="background: linear-gradient(90deg,rgba(2, 92, 36, 1) 0%, rgba(60, 191, 109, 1) 50%, rgba(248, 196, 107, 1) 100%); 
                      padding: 40px; border-radius: 12px; text-align: center;">
            <h2 style="color: white; margin: 0 0 20px 0; font-size: 24px;">
              Your Login Code
            </h2>
            <div style="background: white; padding: 24px; border-radius: 8px; 
                        margin: 20px auto; display: inline-block;">
              <div style="font-size: 48px; font-weight: bold; letter-spacing: 12px; 
                          color: #025C24; font-family: 'Courier New', monospace;">
                ${otp}
              </div>
            </div>
            <p style="color: white; margin: 20px 0 0 0; font-size: 14px;">
              Enter this code in the app to sign in
            </p>
          </div>
          
          <div style="margin-top: 30px; padding: 20px; background: #f7fafc; 
                      border-radius: 8px; border-left: 4px solid #F8C46B;">
            <p style="margin: 0 0 10px 0; color: #2d3748; font-size: 14px;">
              <strong>This code will expire in <span style="color: #3CBF6D;"> 15 minutes</span></strong>
            </p>
            <p style="margin: 0; color: #718096; font-size: 13px;">
              If you didn't request this code, please ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; 
                      border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; font-size: 12px; margin: 0;">
              Goodminton - Connect, Play, Compete
            </p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    if (process.env.NODE_ENV === "development") {
      console.log(
        "📧 OTP Email Preview URL:",
        nodemailer.getTestMessageUrl(info)
      );
      console.log("🔑 OTP Code:", otp);
    }

    return true;
  } catch (error) {
    console.error("Email sending error:", error);
    throw new Error("Failed to send email");
  }
};

module.exports = { sendOTPEmail };
