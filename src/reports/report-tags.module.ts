import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportTag } from './entities/report-tag.entity';
import { ReportTagsService } from './report-tags.service';
import { ReportTagsController } from './report-tags.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ReportTag])],
  controllers: [ReportTagsController],
  providers: [ReportTagsService],
  exports: [ReportTagsService, TypeOrmModule],
})
export class ReportTagsModule {}
