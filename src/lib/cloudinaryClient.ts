import { v2 as cloudinary } from "cloudinary";

import { env, isCloudinaryConfigured } from "../config/env";

export { isCloudinaryConfigured };

export function configureCloudinary(): void {
  if (!isCloudinaryConfigured()) {
    return;
  }
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
    secure: true,
  });
}

export { cloudinary };
