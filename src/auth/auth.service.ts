import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../users/schemas/user.schema';
import Redis from 'ioredis';
import { MailService } from '../mail/mail.service'
@Injectable()
export class AuthService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis:Redis,
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly mailService : MailService,
  ) {}

  // 1. REQUEST OTP
 async requestOtp(phoneNumber: string) {
  // 1️⃣ Check resend cooldown
  const cooldownKey = `otp_cooldown:${phoneNumber}`;
  const isCooling = await this.redis.get(cooldownKey);

  if (isCooling) {
    throw new BadRequestException(
      'Please wait before requesting a new OTP',
    );
  }

  // 2️⃣ Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // 3️⃣ Store OTP
  await this.redis.set(
    `otp:${phoneNumber}`,
    otp,
    'EX',
    300,
  );

  // 4️⃣ Reset attempts
  await this.redis.del(`otp_attempts:${phoneNumber}`);

  // 5️⃣ Set resend cooldown
  await this.redis.set(
    cooldownKey,
    '1',
    'EX',
    30,
  );

  console.log(`📲 OTP for ${phoneNumber}: ${otp}`);

  return {
    message: 'OTP sent successfully',
    cooldown: 30,
  };
}


  async verifyOtp(phoneNumber: string, otp: string) {
  const otpKey = `otp:${phoneNumber}`;
  const attemptsKey = `otp_attempts:${phoneNumber}`;

  const storedOtp = await this.redis.get(otpKey);

  if (!storedOtp) {
    throw new BadRequestException('OTP expired');
  }

  // ❌ Wrong OTP
  if (storedOtp !== otp) {
    const attempts = await this.redis.incr(attemptsKey);

    // ensure attempts expire with OTP
    if (attempts === 1) {
      await this.redis.expire(attemptsKey, 300);
    }

    if (attempts >= 3) {
      await this.redis.del(otpKey);
      throw new BadRequestException(
        'Too many incorrect attempts. OTP blocked.',
      );
    }

    throw new BadRequestException(
      `Invalid OTP. Attempts left: ${3 - attempts}`,
    );
  }

  // ✅ Correct OTP
  await this.redis.del(otpKey);
  await this.redis.del(attemptsKey);

  let user = await this.userModel.findOne({ phoneNumber });
  let isNewUser = false;

  if (!user) {
    user = await this.userModel.create({
      phoneNumber,
      isVerified: true,
    });
    isNewUser = true;
  }

  return {
    userId: String(user._id),
    isNewUser,
    roles:user.roles,
    message: 'Login successful',
  };
}
async sendEmailOtp(email:string){
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const otpKey = `email-otp:${email}`;
    const attemptsKey = `email-otp-attempts:${email}`;

    // Save OTP (5 minutes)
    await this.redis.set(otpKey, otp,"EX", 300);

    // Reset attempts
    await this.redis.set(attemptsKey, '0',"EX", 300);

    // Send email
    await this.mailService.sendOtpEmail(email, otp);

    return {
      message: 'OTP sent to email',
      expiresIn: 300,
    };
}
async verifyEmailOtp(email:string,otp:string){
    const otpKey = `email-otp:${email}`;
    const attemptsKey = `email-otp-attempts:${email}`;

    const savedOtp = await this.redis.get(otpKey);

    if (!savedOtp) {
      throw new BadRequestException('OTP expired or not found');
    }

    let attempts = Number(await this.redis.get(attemptsKey)) || 0;

    if (attempts >= 5) {
      await this.redis.del(otpKey);
      throw new BadRequestException('Too many attempts. OTP blocked.');
    }

    if (savedOtp !== otp) {
      attempts += 1;
      await this.redis.set(attemptsKey, attempts.toString(),"EX", 300);

      throw new BadRequestException(
        `Invalid OTP. Attempts left: ${5 - attempts}`,
      );
    }

    // SUCCESS
    await this.redis.del(otpKey);
    await this.redis.del(attemptsKey);

    return {
      message: 'Email verified successfully',
      verified: true,
    };
  }
}


