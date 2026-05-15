import { Router } from 'express';
import {
  login,
  loginChild,
  loginMinorWithCode,
  me,
  register,
  registerMinor,
  registerParent,
} from '../controllers/auth.controller';
import {
  postForgotPassword,
  postLogout,
  postRefresh,
  postResetPassword,
} from '../controllers/authSession.controller';
import { validateJwtMiddleware } from '../middlewares/auth.middleware';
import { authWriteLimiter, strictLimiter } from '../middlewares/rateLimit.middleware';
import { requireParent } from '../middlewares/rbac.middleware';

export const authRouter = Router();

authRouter.post('/register', strictLimiter, register);
authRouter.post('/register/parent', strictLimiter, registerParent);
authRouter.post(
  '/register/minor',
  validateJwtMiddleware,
  requireParent,
  authWriteLimiter,
  registerMinor,
);
authRouter.post('/login', strictLimiter, login);
authRouter.post('/login-child', authWriteLimiter, loginChild);
authRouter.post('/login/minor-code', authWriteLimiter, loginMinorWithCode);
authRouter.post('/minor/login-with-code', authWriteLimiter, loginMinorWithCode);
authRouter.post('/forgot-password', strictLimiter, postForgotPassword);
authRouter.post('/reset-password', strictLimiter, postResetPassword);
authRouter.post('/logout', validateJwtMiddleware, postLogout);
authRouter.post('/refresh', validateJwtMiddleware, postRefresh);
authRouter.get('/me', validateJwtMiddleware, me);
