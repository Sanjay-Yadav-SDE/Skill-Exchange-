# Skill Exchange

A full-stack peer-to-peer skill exchange application based on the supplied project presentation. Members can create a profile, list skills they can teach and want to learn, discover potential partners, request swaps, manage exchanges, leave reviews after completion, and join a WebRTC audio/video session.

## Stack

- **Client:** React, Vite, React Router, Lucide icons, responsive CSS
- **API:** Node.js, Express, Passport Local, Joi
- **Data:** MongoDB + Mongoose; Mongo-backed session storage
- **Real-time:** Socket.IO signaling + WebRTC
- **Security controls:** Passport Local Mongoose salted password hashing, HTTP-only session cookies, session regeneration at login, server-side Joi validation, rate limits on login/register, Helmet security headers, origin-restricted CORS, CSRF token checks for state-changing API calls, bounded request body sizes, authorization checks for exchanges and call signaling

## Requirements

- Node.js 20+ recommended
- MongoDB local instance or MongoDB Atlas URI
- Camera/microphone permissions for live calls

## Run locally

### 1. Configure the server

```bash
cd server
cp .env.example .env
```

Edit `.env` and set `MONGODB_URI` and a random `SESSION_SECRET` of at least 32 characters. Keep `.env` out of version control. For production, use HTTPS and set `COOKIE_SECURE=true`.

```bash
npm install
npm run seed
npm run dev
```

The API starts at `http://localhost:5000`.

### 2. Start the client in another terminal

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`.

Optional client environment variables (create `client/.env.local` if needed):

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## Demo accounts

The seed script creates demo members and sample exchanges. All seeded demo accounts use the password `DemoPass!2026`.

- `priya.demo@example.com`
- `rahul.demo@example.com`
- `ananya.demo@example.com`
- `kabir.demo@example.com`
- `meera.demo@example.com`
- `aman.demo@example.com`

**Demo-only credentials:** do not use them in a production deployment. The seed script is idempotent for demo accounts and sample exchanges.

## Main pages

- Landing page
- Registration / login
- Dashboard and profile editor
- Discover people and complementary skills
- Exchange request workflow
- Live call page using WebRTC

## Security notes before public deployment

This is a project MVP scaffold, not a security audit or production certification. Before deployment:

1. Use HTTPS, a strong unique secret, secure cookies, and a production-managed MongoDB account with least-privilege access and network restrictions.
2. Configure a TURN service for reliable WebRTC across restrictive NATs; the included STUN server alone will not connect every network. Add abuse controls and user reporting before allowing public calls.
3. Add automated tests, dependency scanning, audit logging, backups, account recovery, email verification, and monitoring.
4. Review deployment proxy settings and CORS/CSRF configuration for the exact production domains. Do not use wildcard origins with credentials.
5. Keep sensitive user fields out of API responses and never log passwords, session secrets, or tokens.
6. Use real demo-safe seed credentials only. Delete seed data before production and never grant admin rights from client-submitted input.
7. The current client provides a simple request and status workflow; a persistent chat, notifications, moderation tools, and richer review UI can be added as the next iteration.

## Project structure

```text
skill-exchange-app/
├── client/
│   ├── src/
│   │   ├── lib/api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   └── package.json
├── server/
│   ├── config/db.js
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/seed.js
│   ├── app.js
│   └── package.json
└── README.md
```
