import { Router } from "express";
import { login, loginChild, me, register } from "../controllers/auth.controller";
import { validateJwtMiddleware } from "../middlewares/auth.middleware";
import { authWriteLimiter, loginRegisterRateLimiter } from "../middlewares/rateLimit.middleware";

export const authRouter = Router();

authRouter.post("/register", loginRegisterRateLimiter, register);
authRouter.post("/login", loginRegisterRateLimiter, login);
authRouter.post("/login-child", authWriteLimiter, loginChild);
authRouter.get("/me", validateJwtMiddleware, me);
