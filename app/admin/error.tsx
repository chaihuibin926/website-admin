"use client";

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="studio-fallback">
      <p className="studio-kicker">门户编排</p>
      <h1>稿打不开</h1>
      <p>{error.message || "读取 content/portal.json 时出错。"}</p>
      <button type="button" onClick={reset}>
        再试一次
      </button>
    </main>
  );
}
