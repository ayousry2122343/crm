import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../core/auth/jwt.guard';
import { EmailTrackingService } from './email-tracking.service';
import { Request, Response } from 'express';

const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

@ApiTags('tracking')
@Controller('track')
export class EmailTrackingController {
  constructor(private readonly svc: EmailTrackingService) {}

  @Public()
  @Get('open/:emailId')
  async trackOpen(
    @Param('emailId') emailId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.svc.recordOpen(emailId, req.ip, req.headers['user-agent']);
    res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' });
    res.send(TRANSPARENT_GIF);
  }

  @Public()
  @Get('click/:emailId')
  async trackClick(
    @Param('emailId') emailId: string,
    @Query('url') url: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!url) {
      res.status(400).send('Missing url parameter');
      return;
    }
    await this.svc.recordClick(emailId, url, req.ip, req.headers['user-agent']);
    res.redirect(302, url);
  }
}
