import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  // Updated CORS configuration to support dynamic local network testing (iPhone) with credentials
  app.enableCors({
    origin: (origin, callback) => {
      const isDevelopment =
        process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
      const frontendUrl = process.env.FRONTEND_URL;

      // 1. Allow mobile apps, Postman, or server-to-server requests (no origin header)
      if (!origin) {
        return callback(null, true);
      }

      // 2. In development, dynamically allow any origin (required for your iPhone's local network IP)
      if (isDevelopment) {
        return callback(null, true);
      }

      // 3. In production, strictly match against your environment variable
      if (frontendUrl === origin) {
        return callback(null, true);
      }

      // Reject unauthorized origins in production
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Accept,Authorization',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger exposes the full API schema — keep it out of production to avoid handing
  // an attacker a ready-made map of every route/DTO shape.
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('SPMS API')
      .setDescription('Smart Parking Reservation & Management System API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, swaggerDocument);
  }

  // Set host to '0.0.0.0' so the server binds to your local network, allowing your iPhone to access it
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${port}`);
}
void bootstrap();
