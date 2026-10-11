import { randomUUID } from "node:crypto";
import { Storage, type File } from "@google-cloud/storage";

const SIDECAR = "http://127.0.0.1:1106";

const storage = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${SIDECAR}/token`,
    type: "external_account",
    credential_source: {
      url: `${SIDECAR}/credential`,
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

const imageExtensions: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

function getPrivateLocation() {
  const configured = process.env.PRIVATE_OBJECT_DIR;
  if (!configured) throw new Error("Private object storage is not configured");
  const [bucketName, ...prefix] = configured.replace(/^\/+/, "").split("/");
  if (!bucketName) throw new Error("Private object storage bucket is invalid");
  return { bucketName, prefix: prefix.filter(Boolean).join("/") };
}

export class ObjectStorageService {
  async createDiagramUpload(contentType: string) {
    const extension = imageExtensions[contentType];
    if (!extension) throw new Error("Unsupported diagram image type");
    const { bucketName, prefix } = getPrivateLocation();
    const filename = `${randomUUID()}.${extension}`;
    const objectName = [prefix, "uploads", filename].filter(Boolean).join("/");
    const response = await fetch(`${SIDECAR}/object-storage/signed-object-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bucket_name: bucketName,
        object_name: objectName,
        method: "PUT",
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Could not create signed upload URL (${response.status})`);
    const { signed_url: uploadURL } = await response.json() as { signed_url: string };
    return { uploadURL, objectPath: `/objects/uploads/${filename}` };
  }

  async getDiagramFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/uploads/")) throw new Error("Invalid diagram path");
    const filename = objectPath.slice("/objects/uploads/".length);
    if (!/^[a-zA-Z0-9-]+\.(png|jpg|webp|gif)$/.test(filename)) throw new Error("Invalid diagram filename");
    const { bucketName, prefix } = getPrivateLocation();
    const objectName = [prefix, "uploads", filename].filter(Boolean).join("/");
    const file = storage.bucket(bucketName).file(objectName);
    const [exists] = await file.exists();
    if (!exists) throw new Error("Diagram image not found");
    return file;
  }
}
