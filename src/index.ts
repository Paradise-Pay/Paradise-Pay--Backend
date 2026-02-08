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
import comingSoonRoute from './routes/coming-soon.route.js'
import googleAuthRoute from './routes/google-auth.route.js'
import bundleRoute from './routes/bundle.route.js'
import financeRoute from './routes/finance.route.js'
import adminRoute from './routes/admin.route.js'
import promoCodeRoute from './routes/promo-code.route.js'
import supportRoute from './routes/support.route.js'
import statisticsRoute from './routes/statistics.route.js'
import deletionRequestRoute from './routes/deletion-request.route.js'
import mfaRoute from './routes/mfa.route.js'
import bulkEmailRoute from './routes/bulk-email.route.js'

const app = express();
const allowedOrigins = [
  'http://localhost:3000',
  'https://getparadisepay.com',
  'https://www.getparadisepay.com',
  'https://comings.getparadisepay.com',
  'https://www.comings.getparadisepay.com',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept'
  ],
}));

// 🔑 THIS LINE FIXES THE PREFLIGHT ISSUE
app.options('*', cors());

app.use(bodyParser.json());

// auth routes
app.use('/api/v1/auth', authRoute);

// event routes
app.use('/api/v1/events', eventRoute);

// ticket routes
app.use('/api/v1/tickets', ticketRoute);

// integration routes
app.use('/api/v1/integrations', integrationRoute);

// coming soon routes
app.use('/api/v1/coming-soon', comingSoonRoute);

// google auth routes
app.use('/api/v1/auth', googleAuthRoute);

// bundle routes
app.use('/api/v1/bundles', bundleRoute);

// finance routes
app.use('/api/v1/finance', financeRoute);

// admin routes
app.use('/api/v1/admin', adminRoute);

// promo code routes
app.use('/api/v1/promo-codes', promoCodeRoute);

// support routes
app.use('/api/v1/support', supportRoute);

// statistics routes
app.use('/api/v1/statistics', statisticsRoute);

// deletion request routes
app.use('/api/v1/deletion-requests', deletionRequestRoute);

// MFA routes
app.use('/api/v1/mfa', mfaRoute);

// bulk email routes
app.use('/api/v1/bulk-email', bulkEmailRoute);

// swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// root route — redirect to API docs
app.get('/', (_, res) => res.redirect('/api-docs'));

app.get('/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT;

if (!PORT) {
  console.error('❌ PORT is not defined');
  process.exit(1);
}

const server = app.listen(Number(PORT), () => {
  console.log(`✅ Server running on port ${PORT}`);
});


server.on('error', (err: any) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Kill the process using it or set a different PORT.`);
    console.error('On Windows: run `netstat -ano | findstr :'+PORT+'` then `taskkill /PID <pid> /F`.');
    process.exit(1);
  }
  console.error('Server error', err);
  process.exit(1);
});
