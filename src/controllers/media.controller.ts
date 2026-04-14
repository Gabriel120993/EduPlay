import type { Request, Response } from "express";

import { isCloudinaryConfigured } from "../config/env";
import { uploadBufferToCloudinary } from "../lib/cloudinaryUpload";
import { validateMediaBufferForUpload } from "../lib/mediaBufferSafety";
import { logError } from "../lib/logger";
import { prisma } from "../lib/prisma";

const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

export async function postMediaUpload(req: Request, res: Response): Promise<void> {
  const auth = req.auth;
  if (auth?.kind !== "child") {
    res.status(401).json({ error: "No autenticado." });
    return;
  }

  if (!isCloudinaryConfigured()) {
    res.status(503).json({
      error:
        "Subida de medios no configurada. Definí CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en el servidor.",
    });
    return;
  }

  const file = req.file;
  if (!file?.buffer?.length) {
    res.status(400).json({ error: "Falta el archivo en el campo multipart `file`." });
    return;
  }

  if (!ALLOWED_MIMES.has(file.mimetype)) {
    res.status(400).json({
      error: `Tipo no permitido (${file.mimetype}). Permitidos: ${[...ALLOWED_MIMES].join(", ")}.`,
    });
    return;
  }

  const bufferCheck = validateMediaBufferForUpload(file.buffer, file.mimetype);
  if (!bufferCheck.ok) {
    res.status(400).json({ error: bufferCheck.error });
    return;
  }

  const userId = auth.userId;

  try {
    const uploaded = await uploadBufferToCloudinary({
      buffer: file.buffer,
      mimeType: file.mimetype,
      userId,
    });

    let moderationFlagged = uploaded.moderationFlagged;
    let moderationNote = uploaded.moderationNote ?? null;
    if (bufferCheck.basicFlag && bufferCheck.basicNote) {
      moderationFlagged = true;
      moderationNote = [moderationNote, bufferCheck.basicNote].filter(Boolean).join("; ");
    }

    const row = await prisma.userMediaUpload.create({
      data: {
        userId,
        url: uploaded.url,
        resourceType: uploaded.resourceType,
        publicId: uploaded.publicId,
        moderationFlagged,
        moderationNote,
      },
      select: {
        id: true,
        url: true,
        resourceType: true,
        publicId: true,
        moderationFlagged: true,
        moderationNote: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      id: row.id,
      url: row.url,
      resourceType: row.resourceType,
      publicId: row.publicId,
      moderationFlagged: row.moderationFlagged,
      moderationNote: row.moderationNote,
      createdAt: row.createdAt.toISOString(),
    });
  } catch (err) {
    logError("media", err);
    res.status(500).json({ error: "Error al subir el archivo." });
  }
}
