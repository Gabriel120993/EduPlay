import { PostType, Visibility, type Post, type Prisma } from '@prisma/client';
import { formatAchievementUnlockPostContent } from '../lib/achievementPost';
import { prisma } from '../lib/prisma';

const MAX_SOCIAL_NOTIFICATIONS_PER_DAY = 10;

export type AutoPostEvent =
  | {
      type: 'GAME_RESULT';
      userId: string;
      gameName: string;
      score: number;
      gameResultId?: string;
      playGameSessionId?: string;
    }
  | {
      type: 'ACHIEVEMENT_UNLOCKED';
      userId: string;
      achievementName: string;
      description: string;
      badgeIcon: string;
      rarity: import('@prisma/client').AchievementRarity;
      userAchievementId: string;
    }
  | {
      type: 'LEVEL_UP';
      userId: string;
      level: number;
      unlockedContent?: string;
    }
  | {
      type: 'DAILY_STREAK';
      userId: string;
      streakDays: number;
    }
  | {
      type: 'CONTENT_COMPLETED';
      userId: string;
      contentTitle: string;
    }
  | {
      type: 'FRIEND_MILESTONE';
      userId: string;
      friendName: string;
      daysTogether: number;
      gamesTogether: number;
    }
  | {
      type: 'CHALLENGE';
      userId: string;
      challengeId: string;
      description: string;
    }
  | {
      type: 'GROUP_REWARD';
      userId: string;
      challengeId: string;
      rewardCoins: number;
    };

export async function generateAutoPost(
  event: AutoPostEvent,
  tx?: Prisma.TransactionClient,
): Promise<Post> {
  const db = tx ?? prisma;

  switch (event.type) {
    case 'GAME_RESULT': {
      const emojis = ['🎮', '🏆', '⭐', '🔥', '🎯'];
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      return db.post.create({
        data: {
          userId: event.userId,
          type: PostType.GAME_RESULT,
          content: `${emoji} ¡Acabo de jugar ${event.gameName} y obtuve ${event.score} puntos! ¿Quién me supera?`,
          gameResultId: event.gameResultId,
          playGameSessionId: event.playGameSessionId,
          visibility: Visibility.FRIENDS,
        },
      });
    }
    case 'ACHIEVEMENT_UNLOCKED':
      return db.post.create({
        data: {
          userId: event.userId,
          type: PostType.ACHIEVEMENT,
          content: `🏅 ${formatAchievementUnlockPostContent(
            event.achievementName,
            event.badgeIcon,
            event.rarity,
          )} ${event.description}`,
          userAchievementId: event.userAchievementId,
          visibility: Visibility.FRIENDS,
        },
      });
    case 'LEVEL_UP':
      return db.post.create({
        data: {
          userId: event.userId,
          type: PostType.LEVEL_UP,
          content: `🆙 ¡Subí al nivel ${event.level}!${
            event.unlockedContent ? ` Ahora tengo acceso a ${event.unlockedContent}.` : ''
          }`,
          visibility: Visibility.FRIENDS,
        },
      });
    case 'DAILY_STREAK': {
      const fire = '🔥'.repeat(Math.min(event.streakDays, 10));
      return db.post.create({
        data: {
          userId: event.userId,
          type: PostType.DAILY_STREAK,
          content: `${fire} ¡${event.streakDays} días seguidos jugando en EduPlay! Mi racha más larga.`,
          visibility: Visibility.FRIENDS,
        },
      });
    }
    case 'CONTENT_COMPLETED':
      return db.post.create({
        data: {
          userId: event.userId,
          type: PostType.CONTENT_COMPLETED,
          content: `📚 Terminé "${event.contentTitle}" en la biblioteca. ¡Recomendado!`,
          visibility: Visibility.FRIENDS,
        },
      });
    case 'FRIEND_MILESTONE':
      return db.post.create({
        data: {
          userId: event.userId,
          type: PostType.FRIEND_MILESTONE,
          content: `🤝 ¡${event.friendName} y yo llevamos ${event.daysTogether} días como amigos en EduPlay! Hemos jugado ${event.gamesTogether} partidas juntos.`,
          visibility: Visibility.FRIENDS,
        },
      });
    case 'CHALLENGE':
      return db.post.create({
        data: {
          userId: event.userId,
          type: PostType.CHALLENGE,
          content: `🎯 Nuevo desafío grupal: ${event.description}`,
          socialGroupChallengeId: event.challengeId,
          visibility: Visibility.FRIENDS,
        },
      });
    case 'GROUP_REWARD':
      return db.post.create({
        data: {
          userId: event.userId,
          type: PostType.GROUP_REWARD,
          content: `🎁 ¡Todos completamos el desafío! Cada uno ganó ${event.rewardCoins} monedas.`,
          visibility: Visibility.FRIENDS,
        },
      });
    default:
      throw new Error('Evento de post automático no soportado.');
  }
}

export async function createSocialNotification(
  userId: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const count = await prisma.appNotification.count({
    where: { userId, createdAt: { gte: startOfDay } },
  });
  if (count >= MAX_SOCIAL_NOTIFICATIONS_PER_DAY) return;

  await prisma.appNotification.create({
    data: {
      userId,
      type: 'SOCIAL',
      title,
      body,
      data: data as object,
    },
  });
}
