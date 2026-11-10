import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LookupUidDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  url!: string;
}
