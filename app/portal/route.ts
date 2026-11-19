import { NextResponse } from "next/server";
import { renderPortal } from "@/lib/portal/render";
import { readPublished } from "@/lib/portal/store";

export const dynamic = "force-dynamic";

function unpublishedPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>尚未发布 | LZK</title>
  <style>
    body { margin: 0; background: #f3f6f3; color: #141814; font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }
    main { width: min(40rem, calc(100% - 3rem)); margin: 4rem auto; }
    a { color: #006e00; }
  </style>
</head>
<body>
  <main>
    <h1>还没有发布过门户页</h1>
    <p><a href="/admin">打开编排台</a></p>
  </main>
</body>
</html>`;
}

export async function GET() {
  const doc = await readPublished();
  if (!doc) {
    return new NextResponse(unpublishedPage(), {
      status: 404,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-robots-tag": "noindex",
      },
    });
  }

  return new NextResponse(renderPortal(doc), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
