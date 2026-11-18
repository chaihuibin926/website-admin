import { NextResponse } from "next/server";
import { renderPortal } from "@/lib/portal/render";
import { readPortal } from "@/lib/portal/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const doc = await readPortal();
  return new NextResponse(renderPortal(doc), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}
