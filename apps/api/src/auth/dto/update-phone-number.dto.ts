import { IsString, Matches } from 'class-validator';

export class UpdatePhoneNumberDto {
  @IsString()
  @Matches(
    /^(?:\+62|62|0)8[0-9]{8,11}$/,
    {
      message:
        'Nomor WhatsApp harus menggunakan format Indonesia yang valid.',
    },
  )
  phoneNumber: string;
}