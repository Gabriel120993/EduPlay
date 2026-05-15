import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export async function findEducationalContentsForList(
  where: Prisma.EducationalContentWhereInput,
  pagination?: { skip: number; take: number },
) {
  return prisma.educationalContent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { heroImageAsset: true },
    ...(pagination ? { skip: pagination.skip, take: pagination.take } : {}),
  });
}
