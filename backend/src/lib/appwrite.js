import { Client, Storage, ID, Permission, Role } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { env } from "../env.js";

/**
 * Appwrite avatar storage — server-side only (API key never leaves the API).
 * Files are created with public read so <img> tags can load them directly;
 * writes always go through POST /users/me/avatar with a session + Zod/file
 * guards in front.
 */

export function isAvatarStorageConfigured() {
  return !!(
    env.APPWRITE_ENDPOINT &&
    env.APPWRITE_PROJECT_ID &&
    env.APPWRITE_BUCKET_AVATARS &&
    env.APPWRITE_API_KEY
  );
}

function storage() {
  const client = new Client()
    .setEndpoint(env.APPWRITE_ENDPOINT)
    .setProject(env.APPWRITE_PROJECT_ID)
    .setKey(env.APPWRITE_API_KEY);
  return new Storage(client);
}

/** Public view URL for an avatar file (bucket/file must be world-readable). */
export function avatarFileUrl(fileId) {
  return `${env.APPWRITE_ENDPOINT}/storage/buckets/${env.APPWRITE_BUCKET_AVATARS}/files/${fileId}/view?project=${env.APPWRITE_PROJECT_ID}`;
}

const EXT_BY_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Uploads a validated avatar buffer. Returns { fileId, url }. */
export async function uploadAvatar(buffer, mimeType, userId) {
  const ext = EXT_BY_MIME[mimeType] ?? "jpg";
  const file = await storage().createFile({
    bucketId: env.APPWRITE_BUCKET_AVATARS,
    fileId: ID.unique(),
    file: InputFile.fromBuffer(buffer, `avatar-${userId}.${ext}`),
    permissions: [Permission.read(Role.any())],
  });
  return { fileId: file.$id, url: avatarFileUrl(file.$id) };
}

/** Best-effort cleanup of a replaced avatar — never throws. */
export async function deleteAvatarFile(fileId) {
  if (!fileId) return;
  try {
    await storage().deleteFile({
      bucketId: env.APPWRITE_BUCKET_AVATARS,
      fileId,
    });
  } catch (err) {
    console.error(`[storage] cleanup failed for ${fileId}:`, err?.message ?? err);
  }
}
