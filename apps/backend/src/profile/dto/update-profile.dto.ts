import { IsString, IsOptional, IsUrl, MaxLength, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((o) => o.linkedinUrl !== '' && o.linkedinUrl !== null)
  @IsUrl()
  linkedinUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((o) => o.githubUrl !== '' && o.githubUrl !== null)
  @IsUrl()
  githubUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((o) => o.portfolioUrl !== '' && o.portfolioUrl !== null)
  @IsUrl()
  portfolioUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  bio?: string;
}
