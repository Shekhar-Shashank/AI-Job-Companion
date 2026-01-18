import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  accessToken: string;
  expiresIn: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.usersService.create({
      email: registerDto.email,
      passwordHash: hashedPassword,
      fullName: registerDto.fullName,
    });

    const payload: JwtPayload = { sub: user.id, email: user.email };
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '7d';
    const accessToken = this.jwtService.sign(payload, { expiresIn });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      accessToken,
      expiresIn,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = { sub: user.id, email: user.email };
    // If rememberMe is true, use 18h expiry; otherwise use 1h
    const expiresIn = loginDto.rememberMe ? '18h' : '1h';
    const accessToken = this.jwtService.sign(payload, { expiresIn });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      accessToken,
      expiresIn,
    };
  }

  async validateUser(payload: JwtPayload) {
    return this.usersService.findById(payload.sub);
  }
}
