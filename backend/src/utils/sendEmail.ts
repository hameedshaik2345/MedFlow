import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const host = process.env.EMAIL_HOST || "smtp-relay.brevo.com";
const port = parseInt(process.env.EMAIL_PORT || "587");
const user = (process.env.BREVO_LOGIN || process.env.BREVO_EMAIL || process.env.EMAIL_USER || "").trim();
const pass = (process.env.BREVO_SMTP_KEY || process.env.EMAIL_PASS || "").trim();

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465, // true for 465, false for other ports
  auth: {
    user,
    pass,
  },
  tls: {
    rejectUnauthorized: false
  }
});
export const sendEmail = async (email: string, otp: string, subjectLine?: string, titleText?: string) => {
  try {
    const finalSubject = subjectLine || "ParaNode Email Verification OTP";
    const finalTitleText = titleText || "Verify Your Email Address";
    const mailOptions = {
      from: `"ParaNode" <${process.env.SENDER_EMAIL || "main@paranode.in"}>`,
      to: email,
      subject: finalSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #4F46E5; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">ParaNode Registration</h1>
          </div>
          <div style="padding: 30px; background-color: #ffffff;">
            <h2 style="color: #333333; margin-top: 0;">${finalTitleText}</h2>
            <p style="color: #555555; line-height: 1.5;">Thank you for your request. Please use the following One-Time Password (OTP) to proceed:</p>
            <div style="background-color: #f4f4f5; border-radius: 6px; padding: 15px; margin: 25px 0; text-align: center;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #4F46E5;">${otp}</span>
            </div>
            <p style="color: #555555; line-height: 1.5; font-size: 14px;">This OTP is valid for 5-10 minutes. Do not share this code with anyone.</p>
          </div>
          <div style="background-color: #f9fafb; padding: 15px; text-align: center; border-top: 1px solid #eeeeee;">
            <p style="color: #888888; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} ParaNode. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

export const sendCustomEmail = async (email: string, subject: string, htmlMessage: string) => {
  try {
    const mailOptions = {
      from: `"ParaNode" <${process.env.SENDER_EMAIL || "main@paranode.in"}>`,
      to: email,
      subject: subject,
      html: htmlMessage,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Custom email sent: " + info.response);
    return true;
  } catch (error) {
    console.error("Error sending custom email:", error);
    return false;
  }
};
