import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { CountryConfigService } from './config/country-config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend access
  app.enableCors({
    origin: process.env.NODE_ENV === 'production'
      ? true 
      : ['http://localhost', 'http://localhost:80', 'http://localhost:8080', 'http://localhost:5173'],
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

  // Configuration Swagger
  const countryConfig = app.get(CountryConfigService);
  const configuredCountries = countryConfig.getCountries();

  const config = new DocumentBuilder()
    .setTitle('API Edukia')
    .setDescription(
      'API multi-pays. Toutes les requêtes acceptent un paramètre de requête `country` ' +
      '(slug du pays cible). En son absence, le backend utilise `benin` par défaut. ' +
      `Pays configurés: ${configuredCountries.join(', ') || 'aucun'}.`,
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addGlobalParameters({
      name: 'country',
      in: 'query',
      required: false,
      description:
        'Slug du pays cible. Détermine la base de données utilisée pour la requête. ' +
        "Si omis, le backend utilise 'benin' par défaut.",
      schema: {
        type: 'string',
        ...(configuredCountries.length > 0 ? { enum: configuredCountries } : {}),
        default: 'benin',
        example: 'benin',
      },
    })
    .addTag('countries')
    .addTag('Auth')
    .addTag('utilisateurs')
    .addTag('categories')
    .addTag('parcours')
    .addTag('commentaires')
    .addTag('likes')
    .addTag('favoris')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // The /countries endpoint is the bootstrap endpoint: clients call it
  // *to discover* which countries exist, so showing a country selector
  // on it would be circular. Strip the global param from that operation.
  const countriesPath = document.paths?.['/countries'];
  if (countriesPath?.get?.parameters) {
    countriesPath.get.parameters = countriesPath.get.parameters.filter(
      (p: any) => p.name !== 'country',
    );
  }

  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT || 3000);
}
bootstrap();