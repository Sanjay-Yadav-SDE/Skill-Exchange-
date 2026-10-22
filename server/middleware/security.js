import crypto from 'node:crypto';
export function csrfToken(req, res) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  res.json({ csrfToken: req.session.csrfToken });
}
export function requireCsrf(req, res, next) {
  if (['GET','HEAD','OPTIONS'].includes(req.method)) return next();
  const token = req.get('x-csrf-token');
  if (!token || !req.session?.csrfToken || token.length !== req.session.csrfToken.length || !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(req.session.csrfToken))) {
    return res.status(403).json({ error: 'Invalid security token. Refresh and try again.' });
  }
  next();
}
export function requireAuth(req, res, next) {
  if (req.isAuthenticated?.()) return next();
  res.status(401).json({ error: 'Please sign in to continue.' });
}
