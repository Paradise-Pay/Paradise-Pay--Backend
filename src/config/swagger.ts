import swaggerJSDoc, { Options } from 'swagger-jsdoc';

const options: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ParadisePay API',
      version: '1.0.0',
      description: 'API documentation for ParadisePay - Digital Payment and  Event Ticketing System',
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Local dev server',
      },
      {
        url: 'https://api.getparadisepay.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  // where to look for API docs (routes and controllers folders)
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
