import { Module } from '@nestjs/common';
import { ValidationService } from './validation.service';
import { ValidationRunner } from './validation-runner';
import { ValidationController } from './validation.controller';

@Module({
  providers: [ValidationService, ValidationRunner],
  controllers: [ValidationController],
  exports: [ValidationService, ValidationRunner],
})
export class ValidationModule {}
