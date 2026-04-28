import { RequestHandler } from 'express';

export const validateApiKey: RequestHandler = function (req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.API_KEY || 'supersecreta123';

  if (apiKey !== expectedKey) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
};
