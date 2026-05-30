import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('SMTP ERROR:', error);
      } else {
        console.log('SMTP is ready to send emails');
      }
    });
  }


  async sendOtpEmail(email: string, otp: string) {
    try {
      console.log(process.env.SMTP_HOST);
      console.log(process.env.SMTP_PORT);
      console.log(process.env.SMTP_USER);
      console.log("PASS=", process.env.SMTP_PASS ? "FOUND" : "MISSING");
      await this.transporter.sendMail({
        from: `"Ride Sharing App" <${process.env.MAIL_FROM}>`,
        to: email,
        subject: 'Your Email Verification OTP',
        text: `Your OTP is ${otp}. It is valid for 5 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>Email Verification</h2>
            <p>Your OTP is:</p>
            <h1 style="letter-spacing: 4px;">${otp}</h1>
            <p>This OTP is valid for <b>5 minutes</b>.</p>
            <p>If you did not request this, please ignore.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('❌ EMAIL SEND ERROR:', error);
      throw new InternalServerErrorException('Failed to send OTP email');
    }
  }
}
