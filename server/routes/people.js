import { Router } from 'express';
import Joi from 'joi';
import User from '../models/User.js';
import Exchange from '../models/Exchange.js';
import Review from '../models/Review.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/security.js';
const router = Router();
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const search = String(req.query.q || '').trim().slice(0, 60);
    const category = String(req.query.category || '').trim().slice(0, 40);
    const filter = { _id: { $ne: req.user._id } };
    if (search) filter.$or = [{ name: { $regex: escapeRegex(search), $options: 'i' } }, { 'teachSkills.name': { $regex: escapeRegex(search), $options: 'i' } }, { 'learnSkills.name': { $regex: escapeRegex(search), $options: 'i' } }];
    if (category) filter['teachSkills.category'] = category;
    const people = await User.find(filter).select('name email bio location avatar teachSkills learnSkills createdAt').limit(60).lean();
    res.json({ people: people.map(p => ({ ...p, email: undefined, matchScore: score(req.user, p) })).sort((a,b) => b.matchScore-a.matchScore) });
  } catch (e) { next(e); }
});
router.get('/dashboard', requireAuth, async (req, res, next) => {
  try {
    const [exchanges, reviews] = await Promise.all([
      Exchange.find({ $or: [{ requester: req.user._id }, { recipient: req.user._id }] }).populate('requester','name avatar').populate('recipient','name avatar').sort({ createdAt: -1 }).limit(30).lean(),
      Review.find({ reviewee: req.user._id }).lean()
    ]);
    res.json({ exchanges, stats: { active: exchanges.filter(x => x.status === 'accepted').length, pending: exchanges.filter(x => x.status === 'pending').length, completed: exchanges.filter(x => x.status === 'completed').length, rating: reviews.length ? (reviews.reduce((a,r)=>a+r.rating,0)/reviews.length).toFixed(1) : null, reviews: reviews.length } });
  } catch (e) { next(e); }
});
const exchangeSchema = Joi.object({ recipient: Joi.string().hex().length(24).required(), offerSkill: Joi.string().trim().min(1).max(60).required(), requestSkill: Joi.string().trim().min(1).max(60).required(), message: Joi.string().trim().max(500).allow('') });
router.post('/exchanges', requireAuth, validate(exchangeSchema), async (req, res, next) => {
  try {
    if (String(req.user._id) === req.body.recipient) return res.status(400).json({ error: 'You cannot request an exchange with yourself.' });
    const recipient = await User.findById(req.body.recipient);
    if (!recipient) return res.status(404).json({ error: 'Member not found.' });
    const exchange = await Exchange.create({ ...req.body, requester: req.user._id, recipient: recipient._id });
    res.status(201).json({ exchange });
  } catch (e) { next(e); }
});
router.patch('/exchanges/:id/status', requireAuth, validate(Joi.object({ status: Joi.string().valid('accepted','declined','completed').required() })), async (req, res, next) => {
  try {
    const exchange = await Exchange.findById(req.params.id);
    if (!exchange) return res.status(404).json({ error: 'Exchange not found.' });
    const uid = String(req.user._id);
    if (![String(exchange.requester), String(exchange.recipient)].includes(uid)) return res.status(403).json({ error: 'Not allowed to update this exchange.' });
    if (req.body.status === 'accepted' || req.body.status === 'declined') {
      if (String(exchange.recipient) !== uid || exchange.status !== 'pending') return res.status(403).json({ error: 'Only the recipient can respond to a pending request.' });
    } else if (exchange.status !== 'accepted') return res.status(400).json({ error: 'Only accepted exchanges can be completed.' });
    exchange.status = req.body.status; await exchange.save(); res.json({ exchange });
  } catch (e) { next(e); }
});
router.post('/reviews', requireAuth, validate(Joi.object({ exchange: Joi.string().hex().length(24).required(), rating: Joi.number().integer().min(1).max(5).required(), comment: Joi.string().trim().max(500).allow('') })), async (req,res,next) => {
  try {
    const ex = await Exchange.findById(req.body.exchange);
    if (!ex || ex.status !== 'completed') return res.status(400).json({ error: 'Reviews are available after a completed exchange.' });
    const uid = String(req.user._id);
    if (![String(ex.requester),String(ex.recipient)].includes(uid)) return res.status(403).json({ error: 'You are not part of this exchange.' });
    const reviewee = String(ex.requester) === uid ? ex.recipient : ex.requester;
    const review = await Review.create({ ...req.body, reviewer: req.user._id, reviewee }); res.status(201).json({ review });
  } catch(e) { if (e.code === 11000) return res.status(409).json({ error: 'You have already reviewed this exchange.' }); next(e); }
});
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function score(me, other) {
  const iTeach = new Set((me.teachSkills||[]).map(s=>s.name.toLowerCase()));
  const iLearn = new Set((me.learnSkills||[]).map(s=>s.name.toLowerCase()));
  const theyTeach = new Set((other.teachSkills||[]).map(s=>s.name.toLowerCase()));
  const theyLearn = new Set((other.learnSkills||[]).map(s=>s.name.toLowerCase()));
  let n=0; for(const s of iTeach) if(theyLearn.has(s)) n++; for(const s of iLearn) if(theyTeach.has(s)) n++; return n;
}
export default router;
