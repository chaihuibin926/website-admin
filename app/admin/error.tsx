"use client";

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="studio-fallback">
      <p className="studio-kicker">LZK 门户</p>
      <h1>这页没有打开</h1>
      <p>{error.message || "再试一次。"}</p>
      <button type="button" onClick={reset}>
        再试一次
      </button>
    </main>
  );
}
