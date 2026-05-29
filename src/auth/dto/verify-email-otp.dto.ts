import { IsEmail, IsNotEmpty, Length, Matches } from 'class-validator';

export class VerifyEmailOtpDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsNotEmpty({ message: 'OTP is required' })
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  @Matches(/^\d+$/, { message: 'OTP must be numeric' })
  otp: string;
}
