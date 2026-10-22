import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import authRoutes from './routes/auth.js';
import peopleRoutes from './routes/people.js';
import { csrfToken, requireCsrf } from './middleware/security.js';

const app = express();
const server = http.createServer(app);
const isProd = process.env.NODE_ENV === 'production';
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters.');
app.set('trust proxy', isProd ? 1 : false);
app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], imgSrc: ["'self'", 'data:', 'https:'], styleSrc: ["'self'", "'unsafe-inline'"], scriptSrc: ["'self'"], connectSrc: ["'self'", 'ws:', 'wss:'] } } }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use(session({ name: 'skill.sid', secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false, rolling: true, store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI, collectionName: 'sessions', ttl: 60*60*8, autoRemove: 'native' }), cookie: { httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: 'lax', maxAge: 1000*60*60*8 } }));
app.use(passport.initialize()); app.use(passport.session());
passport.use(new LocalStrategy({ usernameField: 'email', passwordField: 'password' }, (email, password, done) => User.authenticate()(email.toLowerCase(), password, (err,user,info) => done(err,user,info))));
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => { try { done(null, await User.findById(id)); } catch(e) { done(e); } });
const authLimiter = rateLimit({ windowMs: 15*60*1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Please wait and try again.' } });
app.use('/api/auth/login', authLimiter); app.use('/api/auth/register', authLimiter);
app.get('/api/csrf-token', csrfToken);
app.use('/api', requireCsrf);
app.use('/api/auth', authRoutes); app.use('/api/people', peopleRoutes);
app.get('/api/health', (_req,res)=>res.json({ status:'ok', service:'Skill Exchange API' }));
app.use((req,res)=>res.status(404).json({ error:'Route not found.' }));
app.use((err,req,res,_next)=>{ console.error(err); if (res.headersSent) return; res.status(err.status || 500).json({ error: isProd ? 'Something went wrong. Please try again.' : (err.message || 'Internal server error.') }); });

const io = new Server(server, { cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true } });
io.use((socket,next)=>{ sessionMiddlewareForSocket(socket, next); });
function sessionMiddlewareForSocket(socket,next) {
  const cookie = socket.request.headers.cookie || '';
  // Socket.IO calls share the HTTP session cookie; require an authenticated session.
  const sid = cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('skill.sid='));
  if (!sid) return next(new Error('Authentication required'));
  const raw = decodeURIComponent(sid.slice('skill.sid='.length));
  const signature = raw.split('.')[1];
  if (!signature) return next(new Error('Authentication required'));
  // Use the session store lookup by the signed cookie ID through express-session's parser.
  import('cookie').then(({ parse }) => {
    const signed = parse(cookie)['skill.sid'];
    import('cookie-signature').then(({ default: signatureLib }) => {
      const id = signatureLib.unsign(signed.slice(2), process.env.SESSION_SECRET);
      if (!id) return next(new Error('Authentication required'));
      const store = sessionStore;
      store.get(id, async (err, sess) => {
        if (err || !sess?.passport?.user) return next(new Error('Authentication required'));
        socket.data.userId = String(sess.passport.user); next();
      });
    }).catch(next);
  }).catch(next);
}
const sessionStore = MongoStore.create({ mongoUrl: process.env.MONGODB_URI, collectionName: 'sessions', ttl: 60*60*8 });
io.on('connection', socket => {
  socket.on('call:join', async ({ exchangeId } = {}) => {
    try {
      const { default: Exchange } = await import('./models/Exchange.js');
      const ex = await Exchange.findById(exchangeId);
      if (!ex || ex.status !== 'accepted' || ![String(ex.requester),String(ex.recipient)].includes(socket.data.userId)) return socket.emit('call:error', { message: 'You are not authorized for this call.' });
      socket.join(`exchange:${exchangeId}`); socket.to(`exchange:${exchangeId}`).emit('call:peer-joined', { userId: socket.data.userId });
    } catch { socket.emit('call:error', { message: 'Could not join call.' }); }
  });
  for (const event of ['call:offer','call:answer','call:ice']) socket.on(event, async ({ exchangeId, payload } = {}) => {
    try {
      const { default: Exchange } = await import('./models/Exchange.js');
      const ex = await Exchange.findById(exchangeId);
      if (!ex || ex.status !== 'accepted' || ![String(ex.requester),String(ex.recipient)].includes(socket.data.userId) || !socket.rooms.has(`exchange:${exchangeId}`)) return;
      socket.to(`exchange:${exchangeId}`).emit(event, { payload, from: socket.data.userId });
    } catch { /* invalid signaling payloads are ignored */ }
  });
  socket.on('call:leave', ({ exchangeId } = {}) => { if (exchangeId) { socket.leave(`exchange:${exchangeId}`); socket.to(`exchange:${exchangeId}`).emit('call:peer-left'); } });
});
const port = Number(process.env.PORT || 5000);
connectDB().then(()=>server.listen(port,()=>console.log(`Skill Exchange API listening on ${port}`))).catch(err=>{ console.error('Startup failed:',err.message); process.exit(1); });
