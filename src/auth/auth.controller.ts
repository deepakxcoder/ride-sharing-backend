import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RequestEmailOtpDto } from './dto/request-email-otp.deto';
import { VerifyEmailOtpDto } from './dto/verify-email-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login-signup')
  async loginSignup(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto.phoneNumber);

  }

  @Post('verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.phoneNumber, dto.otp);
  }

  @Post('email/send-otp')
  sendEmailOtp(@Body() dto: RequestEmailOtpDto) {
    return this.authService.sendEmailOtp(dto.email);
  }

  // ✅ VERIFY EMAIL OTP
  @Post('email/verify-otp')
  verifyEmailOtp(@Body() dto: VerifyEmailOtpDto) {
    return this.authService.verifyEmailOtp(dto.email, dto.otp);
  }
}
