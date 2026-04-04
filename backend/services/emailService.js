const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Create transporter for sending emails
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});


const sendPasswordResetEmail = async (email, resetCode) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Code - ELEVATE Gym',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #333; color: white; padding: 20px; text-align: center; border-radius: 5px; }
              .content { padding: 20px; background-color: #f9f9f9; margin: 20px 0; border-radius: 5px; }
              .code-box { 
                background-color: #e8f4f8; 
                border: 2px solid #3498db; 
                padding: 20px; 
                text-align: center; 
                margin: 20px 0;
                border-radius: 5px;
              }
              .code { font-size: 32px; font-weight: bold; color: #3498db; letter-spacing: 5px; }
              .warning { color: #d9534f; font-size: 14px; margin-top: 15px; }
              .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>ELEVATE Gym</h1>
              </div>
              
              <div class="content">
                <h2>Password Reset Request</h2>
                <p>Hello,</p>
                <p>We received a request to reset your password for your ELEVATE Gym account. Use the verification code below to proceed with resetting your password.</p>
                
                <div class="code-box">
                  <p>Your verification code is:</p>
                  <div class="code">${resetCode}</div>
                </div>
                
                <p><strong>Important:</strong></p>
                <ul>
                  <li>This code will expire in 10 minutes</li>
                  <li>If you didn't request a password reset, please ignore this email</li>
                  <li>Never share this code with anyone</li>
                </ul>
                
                <p class="warning">&#x1F6A9; If you didn't request this, your account may be at risk. Please contact our support team immediately.</p>
              </div>
              
              <div class="footer">
                <p>&copy; 2026 ELEVATE Gym. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    logger.info('Password reset email sent successfully', { email });
    return true;
  } catch (error) {
    logger.error('Failed to send password reset email', { email, error: error.message });
    return false;
  }
};


module.exports = {
  sendPasswordResetEmail,
};
