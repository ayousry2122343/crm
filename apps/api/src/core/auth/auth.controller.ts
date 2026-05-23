import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { SignUpDto } from './dto/sign-up.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';
import { ConfirmEmailDto } from './dto/confirm-email.dto';
import { Confirm2FADto, Verify2FADto, Disable2FADto } from './dto/setup-2fa.dto';
import { Public } from './jwt.guard';
import { CurrentUser } from './current-user.decorator';
import type { AuthenticatedUser } from './jwt.strategy';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly twoFactor: TwoFactorService,
    private readonly tenant: TenantContextService,
  ) {}

  @Public()
  @Post('sign-up')
  signUp(@Body() dto: SignUpDto) {
    return this.auth.signUp(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto);
  }

  @ApiBearerAuth()
  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @Public()
  @Post('request-password-reset')
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.auth.requestPasswordReset(dto.workspaceSlug, dto.email);
  }

  @Public()
  @Post('confirm-password-reset')
  confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
    return this.auth.confirmPasswordReset(dto.token, dto.newPassword);
  }

  @Public()
  @Post('confirm-email')
  confirmEmailVerification(@Body() dto: ConfirmEmailDto) {
    return this.auth.confirmEmailVerification(dto.token);
  }

  @Public()
  @Post('verify-2fa')
  verifyTwoFactor(@Body() dto: Verify2FADto) {
    return this.auth.verifyTwoFactor(dto.tempToken, dto.code);
  }

  @ApiBearerAuth()
  @Post('2fa/setup')
  setup2FA() {
    return this.twoFactor.setup();
  }

  @ApiBearerAuth()
  @Post('2fa/confirm')
  confirm2FA(@Body() dto: Confirm2FADto) {
    return this.twoFactor.confirm(dto.code);
  }

  @ApiBearerAuth()
  @Delete('2fa')
  disable2FA(@Body() dto: Disable2FADto) {
    return this.twoFactor.disable(dto.code);
  }

  @ApiBearerAuth()
  @Get('2fa/status')
  get2FAStatus() {
    const userId = this.tenant.getStore()?.userId;
    return this.twoFactor.isEnabled(userId!);
  }
}
