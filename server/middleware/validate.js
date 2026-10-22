export const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true, convert: true });
  if (error) return res.status(400).json({ error: 'Please check the submitted fields.', details: error.details.map(d => d.message) });
  req.body = value; next();
};
