import compression from 'compression';
import cors from 'cors';
import express from 'express';
import { corsOptions } from './corsOptions';
import { env } from './config/env';
import { APP_TAGLINE } from './lib/brand';
import { securityHeadersMiddleware } from './middlewares/helmet.middleware';
import { achievementRouter } from './routes/achievement.routes';
import { authRouter } from './routes/auth.routes';
import { friendRouter } from './routes/friend.routes';
import { gameResultRouter } from './routes/gameResult.routes';
import { leaderboardRouter } from './routes/leaderboard.routes';
import { requireAuth } from './middlewares/auth.middleware';
import { requireApprovedChildAccount } from './middlewares/childAccountApproved.middleware';
import { errorHandlerMiddleware, notFoundHandler } from './middlewares/errorHandler.middleware';
import {
  apiGeneralLimiter,
  authenticatedUserRateLimiter,
} from './middlewares/rateLimit.middleware';
import { requestLoggerMiddleware } from './middlewares/requestLogger.middleware';
import { postRouter } from './routes/post.routes';
import { reactionRouter } from './routes/reaction.routes';
import { userAchievementRouter } from './routes/userAchievement.routes';
import { apiRouter } from './routes';
import { serveImageProxy } from './controllers/imageProxy.controller';

export function createApp() {
  const app = express();

  if (env.trustProxy) {
    app.set('trust proxy', 1);
  }

  app.use(securityHeadersMiddleware);
  app.use(cors(corsOptions));
  app.use(compression());
  app.use(express.json({ limit: '512kb' }));
  app.use(requestLoggerMiddleware);

  app.get('/', (_req, res) => {
    res.json({
      message: 'EduPlay API',
      tagline: APP_TAGLINE,
      docs:
        env.isProduction || process.env.NODE_ENV === 'test' ? '/api/health' : '/api/docs',
    });
  });

  if (!env.isProduction && process.env.NODE_ENV !== 'test') {
    // Carga diferida: swagger-ui-express es devDependency (no va en imagen Docker prod).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const swaggerUi = require('swagger-ui-express') as typeof import('swagger-ui-express');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { openApiDocument } = require('./lib/swagger') as typeof import('./lib/swagger');
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  }

  /**
   * Proxy/caché de imágenes (público, sin auth) para que `<img>` pueda cargarlas
   * sin token. Se sirve con el mismo origen del API: evita CORS / referer / 429 de CDNs.
   *
   * IMPORTANTE: se registra ANTES del `apiGeneralLimiter` porque las imágenes son
   * estáticas, cacheables y un único feed puede pedir docenas a la vez (no debe
   * consumir el rate-limit general de la API).
   */
  app.get('/api/image-proxy/:asset', serveImageProxy);

  /** Mismo limitador por IP en prefijos usados por la app (comparten contador `api:<ip>`). */
  app.use('/api', apiGeneralLimiter);
  app.use('/friends', apiGeneralLimiter);
  app.use('/posts', apiGeneralLimiter);
  app.use('/reactions', apiGeneralLimiter);
  app.use('/game-results', apiGeneralLimiter);
  app.use('/leaderboard', apiGeneralLimiter);
  app.use('/achievements', apiGeneralLimiter);
  app.use('/user-achievements', apiGeneralLimiter);

  app.use('/auth', authRouter);
  app.use(requireAuth);
  app.use(requireApprovedChildAccount);
  app.use(authenticatedUserRateLimiter);

  app.use('/achievements', achievementRouter);
  app.use('/friends', friendRouter);
  app.use('/game-results', gameResultRouter);
  app.use('/leaderboard', leaderboardRouter);
  app.use('/posts', postRouter);
  app.use('/reactions', reactionRouter);
  app.use('/user-achievements', userAchievementRouter);
  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandlerMiddleware);

  return app;
}
