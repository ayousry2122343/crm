import { Module } from '@nestjs/common';
import { CustomFieldService } from './custom-field.service';
import { CustomFieldController } from './custom-field.controller';

@Module({
  providers: [CustomFieldService],
  controllers: [CustomFieldController],
  exports: [CustomFieldService],
})
export class CustomFieldModule {}
