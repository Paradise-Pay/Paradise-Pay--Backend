## ParadisePay Auth Backend

Small Express + TypeScript service providing authentication endpoints (JWT) with MySQL storage and field-level AES-GCM encryption.

### Tech stack
- **Runtime**: Node.js + TypeScript
- **Web**: Express, express-async-errors
- **Auth**: jsonwebtoken (JWT)
- **DB**: MySQL (mysql2/promise)
- **Crypto**: Node `crypto` (AES-256-GCM)

### Prerequisites
- Node.js 18+
- MySQL 8+ (or compatible)

### Install
```bash
npm install
```

### Environment
Create a `.env` file in the project root:
```bash
# Server
PORT=4000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_db_password
DB_NAME=paradise_pay

# JWT
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
# Expiries accept strings like 15m, 30d, 1h
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=30d

# Field encryption (32 bytes hex for AES-256-GCM key)
ENCRYPTION_KEY=your_64_hex_chars_key
```

Generate a strong encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Database migration
Runs the SQL in `src/migrations/001_init.sql` (connects without selecting DB first):
```bash
npm run migrate
```

### Develop
```bash
npm run dev
```
Server starts on `http://localhost:4000` (or `PORT`). Health check: `GET /health`.

### Build & run
```bash
npm run build
npm start
```

### Scripts
- **dev**: start with hot-reload via nodemon/tsx
- **migrate**: apply initial SQL
- **build**: type-check and compile to `dist`
- **start**: run compiled server

### API (high-level)
- `GET /health` → `{ ok: true }`
- Auth routes are mounted at `/api/v1/auth` (see `src/routes/auth.route.ts` and controllers for details).

### Notes
- `ENCRYPTION_KEY` must be a 64-character hex string (32 random bytes) for AES-256-GCM.
- JWT expiries follow `jsonwebtoken` format (e.g., `15m`, `1h`, `30d`).


