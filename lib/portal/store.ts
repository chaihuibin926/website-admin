import fs from "node:fs/promises";
import path from "node:path";
import { renderPortal } from "@/lib/portal/render";
import { parsePortal } from "@/lib/portal/schema";
import type { PortalDocument } from "@/lib/portal/types";

const portalPath = path.join(process.cwd(), "content", "portal.json");
const publicPath = path.join(process.cwd(), "public", "portal.html");

export async function readPortal() {
  const raw = await fs.readFile(portalPath, "utf8");
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("content/portal.json 不是有效的 JSON");
  }
  return parsePortal(data);
}

async function writeJson(doc: PortalDocument) {
  await fs.mkdir(path.dirname(portalPath), { recursive: true });
  await fs.writeFile(portalPath, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
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
  await writeJson(next);
  return next;
}

export async function publishPortal(doc: PortalDocument) {
  const clean = parsePortal(doc);
  const now = new Date().toISOString();
  const next = { ...clean, publishedAt: now, updatedAt: now };
  await writeJson(next);
  await fs.writeFile(publicPath, renderPortal(next), "utf8");
  return next;
}
