import type { Request, Response } from 'express';
import { ContentReportStatus, UserStatus } from '@prisma/client';
import { z } from 'zod';
import { logError } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { formatZodError } from '../lib/validation/schemas';

const userStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
});

const contentBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  content: z.string().trim().max(50000).optional(),
  category: z.string().trim().max(80).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
});

/** GET /api/admin/users */
export async function adminListUsers(req: Request, res: Response): Promise<void> {
  try {
    const take = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const rows = await prisma.user.findMany({
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        type: true,
        status: true,
        parentId: true,
        createdAt: true,
      },
    });
    res.json({ users: rows });
  } catch (e) {
    logError('admin.listUsers', e);
    res.status(500).json({ error: 'Error al listar usuarios.' });
  }
}

/** PUT /api/admin/users/:userId/status */
export async function adminPutUserStatus(req: Request, res: Response): Promise<void> {
  const userId = req.params.userId?.trim();
  if (!userId) {
    res.status(400).json({ error: 'userId inválido.' });
    return;
  }

  const parsed = userStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  try {
    const u = await prisma.user.update({
      where: { id: userId },
      data: { status: parsed.data.status },
      select: { id: true, status: true },
    });
    res.json({ user: u });
  } catch (e) {
    logError('admin.putUserStatus', e);
    res.status(500).json({ error: 'Error al actualizar estado.' });
  }
}

/** GET /api/admin/content */
export async function adminListContent(req: Request, res: Response): Promise<void> {
  try {
    const rows = await prisma.educationalContent.findMany({
      take: 100,
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ contents: rows });
  } catch (e) {
    logError('admin.listContent', e);
    res.status(500).json({ error: 'Error al listar contenido.' });
  }
}

/** POST /api/admin/content */
export async function adminCreateContent(req: Request, res: Response): Promise<void> {
  const parsed = contentBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  try {
    const row = await prisma.educationalContent.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description ?? '',
        content: parsed.data.content ?? '',
        category: parsed.data.category ?? 'general',
        difficulty: (parsed.data.difficulty ?? 'MEDIUM') as never,
        published: true,
      },
    });
    res.status(201).json({ content: row });
  } catch (e) {
    logError('admin.createContent', e);
    res.status(500).json({ error: 'Error al crear contenido.' });
  }
}

/** PUT /api/admin/content/:contentId */
export async function adminUpdateContent(req: Request, res: Response): Promise<void> {
  const contentId = req.params.contentId?.trim();
  if (!contentId) {
    res.status(400).json({ error: 'contentId inválido.' });
    return;
  }

  const parsed = contentBodySchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  try {
    const row = await prisma.educationalContent.update({
      where: { id: contentId },
      data: {
        ...(parsed.data.title != null ? { title: parsed.data.title } : {}),
        ...(parsed.data.description != null ? { description: parsed.data.description } : {}),
        ...(parsed.data.content != null ? { content: parsed.data.content } : {}),
        ...(parsed.data.category != null ? { category: parsed.data.category } : {}),
        ...(parsed.data.difficulty != null ? { difficulty: parsed.data.difficulty as never } : {}),
      },
    });
    res.json({ content: row });
  } catch (e) {
    logError('admin.updateContent', e);
    res.status(500).json({ error: 'Error al actualizar contenido.' });
  }
}

/** DELETE /api/admin/content/:contentId */
export async function adminDeleteContent(req: Request, res: Response): Promise<void> {
  const contentId = req.params.contentId?.trim();
  if (!contentId) {
    res.status(400).json({ error: 'contentId inválido.' });
    return;
  }

  try {
    await prisma.educationalContent.delete({ where: { id: contentId } });
    res.status(204).send();
  } catch (e) {
    logError('admin.deleteContent', e);
    res.status(500).json({ error: 'Error al eliminar contenido.' });
  }
}

/** GET /api/admin/reports */
export async function adminListReports(_req: Request, res: Response): Promise<void> {
  try {
    const rows = await prisma.contentReport.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ reports: rows });
  } catch (e) {
    logError('admin.listReports', e);
    res.status(500).json({ error: 'Error al listar reportes.' });
  }
}

const resolveSchema = z.object({
  status: z.nativeEnum(ContentReportStatus),
  resolutionNote: z.string().trim().max(500).optional(),
});

/** PUT /api/admin/reports/:reportId/resolve */
export async function adminResolveReport(req: Request, res: Response): Promise<void> {
  const reportId = req.params.reportId?.trim();
  if (!reportId) {
    res.status(400).json({ error: 'reportId inválido.' });
    return;
  }

  const parsed = resolveSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  try {
    const row = await prisma.contentReport.update({
      where: { id: reportId },
      data: {
        status: parsed.data.status,
        resolutionNote: parsed.data.resolutionNote,
        reviewedAt: new Date(),
      },
    });
    res.json({ report: row });
  } catch (e) {
    logError('admin.resolveReport', e);
    res.status(500).json({ error: 'Error al resolver reporte.' });
  }
}

/** GET /api/admin/stats */
export async function adminStats(_req: Request, res: Response): Promise<void> {
  try {
    const [users, minors, parents, contents, reportsOpen] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { type: 'minor' } }),
      prisma.parent.count(),
      prisma.educationalContent.count(),
      prisma.contentReport.count({ where: { status: ContentReportStatus.OPEN } }),
    ]);
    res.json({
      stats: {
        usersTotal: users,
        minors,
        parentsTable: parents,
        educationalContents: contents,
        openReports: reportsOpen,
      },
    });
  } catch (e) {
    logError('admin.stats', e);
    res.status(500).json({ error: 'Error al obtener estadísticas.' });
  }
}
