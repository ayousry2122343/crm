import { NestFactory } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })
  );
  app.enableCors({ origin: true, credentials: true });

  const config = new DocumentBuilder()
    .setTitle('CRM API')
    .setDescription('Multi-tenant CRM REST API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document);

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}/api/v1`);
}
bootstrap();
