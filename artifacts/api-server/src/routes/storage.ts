import { Readable } from "node:stream";
import { Router, type IRouter } from "express";
import { RequestDiagramUploadUrlBody, RequestDiagramUploadUrlResponse } from "@workspace/api-zod";
import { requireAdmin, requireAuth } from "../lib/auth";
import { ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const storage = new ObjectStorageService();

router.post("/storage/uploads/request-url", requireAdmin, async (req, res): Promise<void> => {
  const parsed = RequestDiagramUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const result = await storage.createDiagramUpload(parsed.data.contentType);
    res.json(RequestDiagramUploadUrlResponse.parse(result));
  } catch (error) {
    req.log.error({ err: error }, "Could not create diagram upload URL");
    res.status(500).json({ error: "Could not create diagram upload URL" });
  }
});

router.get("/storage/objects/*path", requireAuth, async (req, res): Promise<void> => {
  try {
    const pathParts = req.params.path;
    const objectPath = `/objects/uploads/${Array.isArray(pathParts) ? pathParts.join("/") : pathParts}`;
    const file = await storage.getDiagramFile(objectPath);
    const [metadata] = await file.getMetadata();
    res.setHeader("Content-Type", metadata.contentType ?? "application/octet-stream");
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (metadata.size) res.setHeader("Content-Length", String(metadata.size));
    Readable.from(file.createReadStream()).pipe(res);
  } catch (error) {
    if ((error as Error).message === "Diagram image not found") {
      res.status(404).json({ error: "Diagram image not found" });
      return;
    }
    req.log.error({ err: error }, "Could not serve diagram image");
    res.status(500).json({ error: "Could not serve diagram image" });
  }
});

export default router;
