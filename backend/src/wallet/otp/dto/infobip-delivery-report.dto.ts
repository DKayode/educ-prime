import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InfobipDeliveryReportStatusDto {
  @ApiPropertyOptional({ example: 3 })
  groupId?: number;

  @ApiPropertyOptional({ example: 'DELIVERED' })
  groupName?: string;

  @ApiPropertyOptional({ example: 5 })
  id?: number;

  @ApiPropertyOptional({ example: 'DELIVERED_TO_HANDSET' })
  name?: string;

  @ApiPropertyOptional({ example: 'Message delivered to handset' })
  description?: string;
}

export class InfobipDeliveryReportErrorDto {
  @ApiPropertyOptional({ example: 0 })
  groupId?: number;

  @ApiPropertyOptional({ example: 'OK' })
  groupName?: string;

  @ApiPropertyOptional({ example: 0 })
  id?: number;

  @ApiPropertyOptional({ example: 'NO_ERROR' })
  name?: string;

  @ApiPropertyOptional({ example: 'No Error' })
  description?: string;
}

export class InfobipDeliveryReportResultDto {
  @ApiProperty({ example: '35770713228903571979' })
  messageId: string;

  @ApiPropertyOptional({ example: '2290197000000' })
  to?: string;

  @ApiPropertyOptional({ example: '2026-07-02T10:45:10.000+0000' })
  doneAt?: string;

  @ApiPropertyOptional({ type: InfobipDeliveryReportStatusDto })
  status?: InfobipDeliveryReportStatusDto;

  @ApiPropertyOptional({ type: InfobipDeliveryReportErrorDto })
  error?: InfobipDeliveryReportErrorDto;

  @ApiPropertyOptional({ example: '{"kind":"WITHDRAWAL_OTP","withdrawalRequestId":"..."}' })
  callbackData?: string;
}

export class InfobipDeliveryReportDto {
  @ApiProperty({ type: [InfobipDeliveryReportResultDto] })
  results: InfobipDeliveryReportResultDto[];
}
