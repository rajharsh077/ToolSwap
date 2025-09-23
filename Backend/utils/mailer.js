const nodemailer = require("nodemailer");
require('dotenv').config();
// Configure transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", // or your email SMTP
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASS, // App password if using Gmail
  },
});

// Function to send mail
const sendMail = async ({ to, subject, text, html }) => {
  try {
    await transporter.sendMail({
      from: `"ToolSwap" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log("Email sent to", to);
  } catch (err) {
    console.error("Error sending email:", err);
  }
};

module.exports = sendMail;
