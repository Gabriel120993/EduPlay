import type { CorsOptions } from 'cors';
import { env } from './config/env';

/** Opciones CORS centralizadas (tests pueden mockear `../src/corsOptions` si hiciera falta). */
export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (env.nodeEnv === 'development') {
      if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
        callback(null, true);
        return;
      }
    }
    if (env.corsAllowedOrigins === '*') {
      callback(null, true);
      return;
    }
    const allowedList = env.corsAllowedOrigins
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    if (allowedList.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400,
};
