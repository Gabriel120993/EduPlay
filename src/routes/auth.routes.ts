import { Router } from "express";
import {
  login,
  loginChild,
  loginMinorWithCode,
  me,
  register,
  registerMinor,
  registerParent,
} from "../controllers/auth.controller";
import { validateJwtMiddleware } from "../middlewares/auth.middleware";
import { authWriteLimiter, loginRegisterRateLimiter } from "../middlewares/rateLimit.middleware";
import { requireParent } from "../middlewares/rbac.middleware";

export const authRouter = Router();

authRouter.post("/register", loginRegisterRateLimiter, register);
authRouter.post("/register/parent", loginRegisterRateLimiter, registerParent);
authRouter.post("/register/minor", validateJwtMiddleware, requireParent, authWriteLimiter, registerMinor);
authRouter.post("/login", loginRegisterRateLimiter, login);
authRouter.post("/login-child", authWriteLimiter, loginChild);
authRouter.post("/minor/login-with-code", authWriteLimiter, loginMinorWithCode);
authRouter.get("/me", validateJwtMiddleware, me);
