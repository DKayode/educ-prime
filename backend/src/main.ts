import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend access
  app.enableCors({
    origin: ['http://localhost', 'http://localhost:80', 'http://localhost:8080'],
    credentials: true,
  });
  
  // Enable validation globally with French error messages
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => {
      const messages = errors.map(error => {
        const constraints = error.constraints;
        if (constraints) {
          // Custom French messages for common validation errors
          if (constraints.isEnum) {
            if (error.property === 'role') {
              return `Le rôle doit être l'une des valeurs suivantes : admin, étudiant, professeur, autre`;
            }
            if (error.property === 'sexe') {
              return `Le sexe doit être l'une des valeurs suivantes : M, F, Autre`;
            }
            return constraints.isEnum;
          }
          if (constraints.isEmail) {
            return `L'email doit être une adresse email valide`;
          }
          if (constraints.minLength) {
            return `Le ${error.property} doit contenir au moins ${error.constraints.minLength} caractères`;
          }
          if (constraints.isString) {
            return `Le champ ${error.property} doit être une chaîne de caractères`;
          }
          return Object.values(constraints)[0];
        }
        return `Erreur de validation pour ${error.property}`;
      });
      
      return {
        statusCode: 400,
        message: messages,
        error: 'Bad Request'
      };
    }
  }));
  
  await app.listen(3000);
}
bootstrap();