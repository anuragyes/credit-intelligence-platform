import { Router } from 'express';
import { loginHandler, signupHandler } from './authController.js';
import { validate } from '../../middleware/validate.js';
import { loginSchema, signupSchema } from './schema.js';
import { authRateLimiter } from '../../middleware/rateLimiter.js';

export const authRouter = Router();
authRouter.post('/signup', authRateLimiter, validate(signupSchema), signupHandler);
authRouter.post('/login', authRateLimiter, validate(loginSchema), loginHandler);
