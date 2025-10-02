import swaggerJSDoc, { Options } from 'swagger-jsdoc';

const options: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ParadisePay API',
      version: '1.0.0',
      description: 'API documentation for ParadisePay authentication system',
    },
    servers: [
      {
        url: 'http://localhost:4000', // change for prod later
        description: 'Local dev server',
      },
    ],
  },
  // where to look for API docs (routes folder)
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
