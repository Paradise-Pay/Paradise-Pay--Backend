import express from 'express';
import 'express-async-errors';
import dotenv from 'dotenv';
dotenv.config();
import bodyParser from 'body-parser';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import authRoute from './routes/auth.route.js'

const app = express();
app.use(bodyParser.json());

// auth routes
app.use('/api/v1/auth', authRoute);

// swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/health', (_, res) => res.json({ ok: true }));

const port = +(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`Server listening on ${port}`));
