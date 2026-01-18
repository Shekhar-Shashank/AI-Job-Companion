import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  IsIn,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateJobTargetsDto {
  @ApiPropertyOptional({ example: ['Senior Backend Engineer', 'Staff Engineer'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetRoles?: string[];

  @ApiPropertyOptional({ example: ['Google', 'Meta', 'Microsoft'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetCompanies?: string[];

  @ApiPropertyOptional({ example: ['Company X'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedCompanies?: string[];

  @ApiPropertyOptional({ example: 2500000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minSalary?: number;

  @ApiPropertyOptional({ example: 5000000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxSalary?: number;

  @ApiPropertyOptional({ example: 'INR' })
  @IsOptional()
  @IsString()
  salaryCurrency?: string;

  @ApiPropertyOptional({ example: ['Bangalore', 'Mumbai', 'Remote'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredLocations?: string[];

  @ApiPropertyOptional({ example: 'remote' })
  @IsOptional()
  @IsIn(['remote', 'hybrid', 'onsite', 'any'])
  remotePreference?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  noticePeriodDays?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minCompanySize?: number;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxCompanySize?: number;

  @ApiPropertyOptional({ example: ['Technology', 'FinTech'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredIndustries?: string[];
}
