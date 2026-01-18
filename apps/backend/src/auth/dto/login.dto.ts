import { IsEmail, IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password: string;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}
