import { IsOptional, IsString } from 'class-validator';

export class IndustryInfoDTO {
  @IsString()
  @IsOptional()
  macro?: string;

  @IsString()
  @IsOptional()
  sector?: string;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsOptional()
  basicIndustry?: string;
}
