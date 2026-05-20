import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, Length } from 'class-validator';

export class ChangePinDto {
  @ApiProperty({ example: '0000' })
  @IsNumberString()
  @Length(4, 6)
  currentPin!: string;

  @ApiProperty({ example: '2222' })
  @IsNumberString()
  @Length(4, 6)
  newPin!: string;
}
