const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendMail({ to, subject, text, html }) {
  try {
    const mailOptions = {
      from: `"PACER" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      text, // plain text body
      html, // include HTML body here
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

module.exports = sendMail;
