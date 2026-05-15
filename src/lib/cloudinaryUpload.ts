import type { UploadApiResponse } from 'cloudinary';
import { Readable } from 'node:stream';

import { env } from '../config/env';
import { cloudinary, configureCloudinary } from './cloudinaryClient';
import { moderationFromUploadResult } from './moderationFromCloudinary';

export type CloudinaryUploadResult = {
  url: string;
  resourceType: 'image' | 'video';
  publicId: string;
  moderationFlagged: boolean;
  moderationNote: string | null;
  raw: UploadApiResponse;
};

function resourceTypeFromMime(mimeType: string): 'image' | 'video' {
  return mimeType.startsWith('video/') ? 'video' : 'image';
}

/**
 * Sube un buffer a Cloudinary (carpeta por usuario).
 */
export async function uploadBufferToCloudinary(params: {
  buffer: Buffer;
  mimeType: string;
  userId: string;
}): Promise<CloudinaryUploadResult> {
  configureCloudinary();

  const resourceType = resourceTypeFromMime(params.mimeType);
  const folder = `${env.cloudinaryUploadFolder}/users/${params.userId}`;

  const uploadOptions: Record<string, unknown> = {
    folder,
    resource_type: resourceType === 'video' ? 'video' : 'image',
  };

  if (env.cloudinaryModeration.length > 0) {
    uploadOptions.moderation = env.cloudinaryModeration;
  }

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(uploadOptions, (err, callResult) => {
      if (err) {
        reject(err);
        return;
      }
      if (!callResult) {
        reject(new Error('Cloudinary no devolvió resultado.'));
        return;
      }
      resolve(callResult);
    });
    Readable.from(params.buffer).pipe(stream);
  });

  const url = result.secure_url?.trim();
  if (!url) {
    throw new Error('Cloudinary no devolvió secure_url.');
  }

  const mod = moderationFromUploadResult(result);
  const rt = result.resource_type === 'video' ? 'video' : 'image';

  return {
    url,
    resourceType: rt,
    publicId: result.public_id,
    moderationFlagged: mod.flagged,
    moderationNote: mod.note,
    raw: result,
  };
}
