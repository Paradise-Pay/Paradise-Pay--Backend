import express from 'express';
import 'express-async-errors';
import dotenv from 'dotenv';
import cors from 'cors';
dotenv.config();
import bodyParser from 'body-parser';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import authRoute from './routes/auth.route.js'
import eventRoute from './routes/event.route.js'
import ticketRoute from './routes/ticket.route.js'
import integrationRoute from './routes/integration.route.js'

const app = express();
app.use(cors({
  origin: ["http://localhost:3000", "https://paradise-pay-webapp-production.up.railway.app"],
  credentials: true,
}));

app.use(bodyParser.json());

// auth routes
app.use('/api/v1/auth', authRoute);

// event routes
app.use('/api/v1/events', eventRoute);

// ticket routes
app.use('/api/v1/tickets', ticketRoute);

// integration routes
app.use('/api/v1/integrations', integrationRoute);

// swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// root route — redirect to API docs
app.get('/', (_, res) => res.redirect('/api-docs'));

app.get('/health', (_, res) => res.json({ ok: true }));

const port = +(process.env.PORT ?? 4000);
const server = app.listen(port, () => console.log(`Server listening on ${port}`));

server.on('error', (err: any) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Kill the process using it or set a different PORT.`);
    console.error('On Windows: run `netstat -ano | findstr :'+port+'` then `taskkill /PID <pid> /F`.');
    process.exit(1);
  }
  console.error('Server error', err);
  process.exit(1);
});
