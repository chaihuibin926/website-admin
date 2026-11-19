import fs from "node:fs/promises";
import path from "node:path";
import { parsePortal } from "@/lib/portal/schema";
import type { PortalDocument } from "@/lib/portal/types";

const portalPath = path.join(process.cwd(), "content", "portal.json");
const publishedPath = path.join(process.cwd(), "content", "published.json");

function missingFile(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}

async function readDocument(filePath: string, label: string) {
  const raw = await fs.readFile(filePath, "utf8");
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`${label} 不是有效的 JSON`);
  }
  return parsePortal(data);
}

async function writeJson(filePath: string, doc: PortalDocument) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
}

export async function readPortal() {
  return readDocument(portalPath, "content/portal.json");
}

export async function readPublished() {
  try {
    return await readDocument(publishedPath, "content/published.json");
  } catch (error) {
    if (missingFile(error)) return null;
    throw error;
  }
}

export async function savePortal(doc: PortalDocument) {
  const clean = parsePortal(doc);
  let publishedAt = clean.publishedAt;
  try {
    publishedAt = (await readPortal()).publishedAt;
  } catch {
    publishedAt = clean.publishedAt;
  }
  const next = { ...clean, publishedAt, updatedAt: new Date().toISOString() };
  await writeJson(portalPath, next);
  return next;
}

export async function publishPortal(doc: PortalDocument) {
  const clean = parsePortal(doc);
  const now = new Date().toISOString();
  const next = { ...clean, publishedAt: now, updatedAt: now };
  await writeJson(publishedPath, next);
  await writeJson(portalPath, next);
  return next;
}
