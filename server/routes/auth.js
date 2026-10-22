import { Router } from 'express';
import Joi from 'joi';
import passport from 'passport';
import User from '../models/User.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/security.js';
const router = Router();
const registerSchema = Joi.object({ name: Joi.string().trim().min(2).max(80).required(), email: Joi.string().email().max(254).required(), password: Joi.string().min(10).max(128).required(), location: Joi.string().trim().max(100).allow('') });
const loginSchema = Joi.object({ email: Joi.string().email().max(254).required(), password: Joi.string().min(1).max(128).required() });
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase();
    if (await User.exists({ email })) return res.status(409).json({ error: 'An account with this email already exists.' });
    const user = new User({ name: req.body.name, email, username: email, location: req.body.location || '' });
    await User.register(user, req.body.password);
    req.login(user, err => { if (err) return next(err); req.session.regenerate(regErr => { if (regErr) return next(regErr); req.login(user, loginErr => { if (loginErr) return next(loginErr); req.session.save(saveErr => { if (saveErr) return next(saveErr); res.status(201).json({ user: user.toJSON() }); }); }); }); });
  } catch (err) { next(err); }
});
router.post('/login', validate(loginSchema), (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info?.message || 'Invalid email or password.' });
    req.session.regenerate(regErr => {
      if (regErr) return next(regErr);
      req.login(user, loginErr => { if (loginErr) return next(loginErr); req.session.csrfToken = undefined; req.session.save(saveErr => { if (saveErr) return next(saveErr); res.json({ user: user.toJSON() }); }); });
    });
  })(req, res, next);
});
router.post('/logout', requireAuth, (req, res, next) => req.logout(err => { if (err) return next(err); req.session.destroy(err2 => { if (err2) return next(err2); res.clearCookie('skill.sid'); res.json({ ok: true }); }); }));
router.get('/me', (req, res) => res.json({ user: req.user ? req.user.toJSON() : null }));
router.patch('/profile', requireAuth, validate(Joi.object({ name: Joi.string().trim().min(2).max(80), bio: Joi.string().trim().max(500).allow(''), location: Joi.string().trim().max(100).allow(''), teachSkills: Joi.array().items(Joi.object({ name: Joi.string().trim().min(1).max(60).required(), category: Joi.string().trim().max(40).allow(''), level: Joi.string().valid('Beginner','Intermediate','Advanced') })).max(30), learnSkills: Joi.array().items(Joi.object({ name: Joi.string().trim().min(1).max(60).required(), category: Joi.string().trim().max(40).allow(''), level: Joi.string().valid('Beginner','Intermediate','Advanced') })).max(30) }).min(1)), async (req, res, next) => {
  try { Object.assign(req.user, req.body); await req.user.save(); res.json({ user: req.user.toJSON() }); } catch (e) { next(e); }
});
export default router;
