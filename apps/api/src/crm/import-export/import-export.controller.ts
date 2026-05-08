import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ImportExportService } from './import-export.service';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('import-export')
@UseGuards(PermissionGuard)
@Controller('import-export')
export class ImportExportController {
  constructor(private readonly svc: ImportExportService) {}

  @RequiresPermission(PERMISSIONS.IMPORT_EXECUTE)
  @Post('preview')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  preview(@UploadedFile() file: Express.Multer.File) {
    return this.svc.parsePreview(file.buffer, file.mimetype);
  }

  @RequiresPermission(PERMISSIONS.IMPORT_EXECUTE)
  @Post('import/people')
  importPeople(
    @Body() body: { rows: Record<string, string>[]; mapping: Record<string, string>; fileName: string },
  ) {
    return this.svc.importPeople(body.rows, body.mapping, body.fileName);
  }

  @RequiresPermission(PERMISSIONS.EXPORT_EXECUTE)
  @Get('export/people')
  async exportPeople(
    @Query() q: { format?: string; search?: string; lifecycleStage?: string; isCompany?: string },
    @Res() res: Response,
  ) {
    const format = q.format === 'excel' ? 'excel' : 'csv';
    const result = await this.svc.exportPeople(
      {
        search: q.search,
        lifecycleStage: q.lifecycleStage,
        isCompany: q.isCompany === 'true' ? true : q.isCompany === 'false' ? false : undefined,
      },
      format,
    );
    res.set({
      'Content-Type': result.mimeType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    });
    res.send(result.buffer);
  }

  @RequiresPermission(PERMISSIONS.EXPORT_EXECUTE)
  @Get('export/deals')
  async exportDeals(
    @Query() q: { format?: string; search?: string; status?: string },
    @Res() res: Response,
  ) {
    const format = q.format === 'excel' ? 'excel' : 'csv';
    const result = await this.svc.exportDeals(
      { search: q.search, status: q.status },
      format,
    );
    res.set({
      'Content-Type': result.mimeType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    });
    res.send(result.buffer);
  }
}
