import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePlanDto } from './create-plan.dto';
import { IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePlanDto extends PartialType(
  OmitType(CreatePlanDto, ['items'] as const),
) {
  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsIn(['active', 'completed', 'paused', 'cancelled'])
  status?: string;
}
