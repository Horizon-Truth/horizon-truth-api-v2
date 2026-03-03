import { PartialType } from '@nestjs/swagger';
import { CreateReportTagDto } from './create-report-tag.dto';

export class UpdateReportTagDto extends PartialType(CreateReportTagDto) {}
