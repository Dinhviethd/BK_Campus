"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOTP = exports.sendOTPEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
const sendOTPEmail = async (email, otp) => {
    const mailOptions = {
        from: `"BK Campus" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Mã xác nhận đặt lại mật khẩu',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; text-align: center;">Đặt lại mật khẩu</h2>
        <p style="color: #666; font-size: 16px;">Xin chào,</p>
        <p style="color: #666; font-size: 16px;">Bạn đã yêu cầu đặt lại mật khẩu. Dưới đây là mã OTP của bạn:</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; color: #4A90E2; letter-spacing: 8px;">${otp}</span>
        </div>
        <p style="color: #666; font-size: 14px;">Mã này sẽ hết hạn sau <strong>5 phút</strong>.</p>
        <p style="color: #666; font-size: 14px;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      </div>
    `,
    };
    await transporter.sendMail(mailOptions);
};
exports.sendOTPEmail = sendOTPEmail;
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
exports.generateOTP = generateOTP;
