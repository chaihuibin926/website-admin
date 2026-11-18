import { escapeHtml, safeHref } from "@/lib/portal/html";
import type { PortalDocument, Section } from "@/lib/portal/types";

const CHROME = {
  zh: {
    htmlLang: "zh-CN",
    drawing: "图号",
    revision: "版次",
    use: "用途",
    date: "日期",
    draft: "草稿",
    details: "规格",
    caseLink: "案例",
    generated: "本页由门户编排台生成",
    desk: "编排台",
    brand: "LZK 精密轴承",
  },
  en: {
    htmlLang: "en",
    drawing: "Drawing",
    revision: "Rev",
    use: "Use",
    date: "Date",
    draft: "Draft",
    details: "Details",
    caseLink: "Case",
    generated: "Generated from the portal desk",
    desk: "Desk",
    brand: "LZK Precision Bearings",
  },
} as const;

function stamp(iso: string | null, draft: string) {
  if (!iso) return draft;
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function factRows(doc: PortalDocument, scope: Section["type"], values: Record<string, string>) {
  return doc.fieldSchema
    .filter((field) => field.scope === scope && values[field.key])
    .map(
      (field) =>
        `<div><dt>${escapeHtml(field.label)}</dt><dd>${escapeHtml(values[field.key])}</dd></div>`,
    )
    .join("");
}

function facts(doc: PortalDocument, scope: Section["type"], values: Record<string, string> | undefined) {
  const rows = factRows(doc, scope, values ?? {});
  return rows ? `<dl class="facts">${rows}</dl>` : "";
}

function renderSection(section: Section, doc: PortalDocument) {
  const chrome = CHROME[doc.lang];
  if (section.type === "hero") {
    return `<section class="hero" id="${escapeHtml(section.id)}">
      <div class="hero-copy">
        <p class="kicker">${escapeHtml(section.kicker)}</p>
        <h1>${escapeHtml(section.title)}</h1>
        <p class="lede">${escapeHtml(section.lede)}</p>
        <p class="actions">
          <a class="btn" href="${escapeHtml(safeHref(section.primaryHref))}">${escapeHtml(section.primaryLabel)}</a>
          <a class="quiet" href="${escapeHtml(safeHref(section.secondaryHref))}">${escapeHtml(section.secondaryLabel)}</a>
        </p>
      </div>
      <aside class="plate" aria-label="${escapeHtml(chrome.drawing)}">
        <p><span>${escapeHtml(chrome.drawing)}</span><strong>${escapeHtml(section.docNo)}</strong></p>
        <p><span>${escapeHtml(chrome.revision)}</span><strong>${escapeHtml(section.revision)}</strong></p>
        <p><span>${escapeHtml(chrome.use)}</span><strong>${escapeHtml(section.application)}</strong></p>
        <p><span>${escapeHtml(chrome.date)}</span><strong>${escapeHtml(stamp(doc.publishedAt, chrome.draft))}</strong></p>
        ${doc.fieldSchema
          .filter((field) => field.scope === "hero" && section.extras[field.key])
          .map(
            (field) =>
              `<p><span>${escapeHtml(field.label)}</span><strong>${escapeHtml(section.extras[field.key])}</strong></p>`,
          )
          .join("")}
      </aside>
    </section>`;
  }

  if (section.type === "series") {
    const items = section.items
      .map(
        (item, index) => `<li>
          <span class="num">${String(index + 1).padStart(2, "0")}</span>
          <div>
            <h3>${escapeHtml(item.name)}</h3>
            <p class="codes">${escapeHtml(item.codes)}</p>
            <p class="summary">${escapeHtml(item.summary)}</p>
            ${facts(doc, "series", item.extras)}
          </div>
          <a class="more" href="${escapeHtml(safeHref(item.href))}">${escapeHtml(chrome.details)}</a>
        </li>`,
      )
      .join("");
    return `<section class="series" id="${escapeHtml(section.id)}">
      <header>
        <h2>${escapeHtml(section.title)}</h2>
        <p class="lede">${escapeHtml(section.lede)}</p>
      </header>
      <ol>${items}</ol>
    </section>`;
  }

  if (section.type === "cases") {
    const items = section.items
      .map(
        (item) => `<article>
          <p class="kicker">${escapeHtml(item.industry)}</p>
          <h3>${escapeHtml(item.title)}</h3>
          <p class="summary">${escapeHtml(item.result)}</p>
          ${facts(doc, "cases", item.extras)}
          <a class="more" href="${escapeHtml(safeHref(item.href))}">${escapeHtml(chrome.caseLink)}</a>
        </article>`,
      )
      .join("");
    return `<section class="cases" id="${escapeHtml(section.id)}">
      <header>
        <h2>${escapeHtml(section.title)}</h2>
        <p class="lede">${escapeHtml(section.lede)}</p>
      </header>
      <div class="case-list">${items}</div>
    </section>`;
  }

  return `<section class="close" id="${escapeHtml(section.id)}">
    <div class="close-inner">
      <p class="kicker">${escapeHtml(section.kicker)}</p>
      <h2>${escapeHtml(section.title)}</h2>
      <p class="lede">${escapeHtml(section.lede)}</p>
      ${facts(doc, "close", section.extras)}
      <a class="btn light" href="${escapeHtml(safeHref(section.href))}">${escapeHtml(section.label)}</a>
    </div>
  </section>`;
}

export function renderPortal(doc: PortalDocument) {
  const chrome = CHROME[doc.lang];
  const nav = doc.nav
    .map(
      (item) =>
        `<a href="${escapeHtml(safeHref(item.href))}">${escapeHtml(item.label)}</a>`,
    )
    .join("");
  const hero = doc.sections.find((section) => section.type === "hero");
  const docNo = hero?.type === "hero" ? hero.docNo : "LZ-PORTAL";
  const chunks: string[] = [];
  let open: string[] = [];
  const flush = () => {
    if (!open.length) return;
    chunks.push(`<div class="wrap">${open.join("")}</div>`);
    open = [];
  };
  for (const section of doc.sections) {
    if (section.type === "close") {
      flush();
      chunks.push(renderSection(section, doc));
    } else {
      open.push(renderSection(section, doc));
    }
  }
  flush();

  return `<!DOCTYPE html>
<html lang="${chrome.htmlLang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(doc.seo.title)}</title>
  <meta name="description" content="${escapeHtml(doc.seo.description)}" />
  <base href="/" />
  <meta name="generator" content="lzk-portal-desk" />
  <style>
    :root {
      --paper: #f3f6f3;
      --ink: #141814;
      --soft: #314036;
      --line: #d2ddd4;
      --green: #006e00;
      --pale: #f7faf7;
    }
    * { box-sizing: border-box; }
    html { color-scheme: light; }
    body {
      margin: 0;
      background: var(--paper);
      color: var(--ink);
      font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      font-size: 16px;
      line-height: 1.6;
    }
    body::before {
      content: "";
      display: block;
      height: 6px;
      background: var(--green);
    }
    h1, h2, h3, .brand, .num {
      font-family: "Palatino Linotype", Palatino, "Songti SC", "SimSun", serif;
      font-weight: 600;
    }
    a { color: inherit; }
    a:focus-visible, .btn:focus-visible {
      outline: 2px solid var(--green);
      outline-offset: 3px;
    }
    .wrap {
      width: min(1120px, calc(100% - clamp(28px, 6vw, 88px)));
      margin-inline: auto;
    }
    .top {
      display: flex;
      align-items: baseline;
      gap: 1.25rem 1.75rem;
      flex-wrap: wrap;
      padding: 1.35rem 0 1rem;
      border-bottom: 1px solid var(--line);
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 0.65rem;
      text-decoration: none;
      letter-spacing: 0.18em;
      font-size: 1.05rem;
    }
    .mark {
      width: 0.72rem;
      height: 0.72rem;
      background: var(--green);
      display: inline-block;
    }
    .nav {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem 1.2rem;
      margin-left: auto;
    }
    .nav a { text-decoration: none; }
    .nav a:hover { color: var(--green); }
    .docno {
      margin: 0;
      font-size: 0.75rem;
      letter-spacing: 0.14em;
      color: var(--soft);
    }
    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.7fr) minmax(220px, 0.75fr);
      gap: clamp(2rem, 6vw, 5.5rem);
      align-items: end;
      padding: clamp(3.2rem, 8vw, 6.5rem) 0 clamp(2.5rem, 5vw, 4rem);
    }
    .kicker {
      margin: 0;
      color: var(--green);
      font-size: 0.82rem;
      letter-spacing: 0.14em;
    }
    h1 {
      margin: 0.4rem 0 0;
      font-size: clamp(2.7rem, 6vw, 5rem);
      line-height: 1.02;
      letter-spacing: -0.03em;
      max-width: 9em;
    }
    h2 {
      margin: 0;
      font-size: clamp(2rem, 4vw, 3rem);
      line-height: 1.08;
      letter-spacing: -0.03em;
    }
    h3 { margin: 0; font-size: 1.55rem; line-height: 1.2; }
    .lede, .summary {
      white-space: pre-line;
      color: var(--soft);
    }
    .hero .lede {
      max-width: 38em;
      margin: 1.25rem 0 0;
      font-size: 1.05rem;
      line-height: 1.75;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1.1rem 1.4rem;
      margin: 1.8rem 0 0;
    }
    .btn {
      display: inline-block;
      background: var(--ink);
      color: #f4f7f4;
      text-decoration: none;
      padding: 0.85rem 1.1rem;
    }
    .btn.light { background: #f4f7f4; color: var(--ink); }
    .quiet {
      color: var(--green);
      text-underline-offset: 0.28em;
    }
    .plate {
      border: 1px solid var(--ink);
      background: var(--pale);
      padding: 0.3rem 1rem 0.2rem;
    }
    .plate p {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      margin: 0;
      padding: 0.8rem 0;
      border-bottom: 1px solid var(--line);
    }
    .plate p:last-child { border-bottom: 0; }
    .plate span { color: var(--soft); font-size: 0.82rem; }
    .plate strong { font-weight: 600; text-align: right; }
    .facts {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem 1.25rem;
      margin: 0.75rem 0 0;
    }
    .facts div { display: flex; gap: 0.4rem; }
    .facts dt { color: var(--soft); }
    .facts dd { margin: 0; }
    .close .facts { margin: 0 0 1.4rem; }
    .close .facts dt { color: #d5e3d6; }
    .series, .cases { padding-bottom: clamp(2rem, 5vw, 3.5rem); }
    .series header, .cases header { max-width: 40rem; margin-bottom: 1.5rem; }
    .series .lede, .cases .lede { margin: 0.7rem 0 0; }
    .series ol { list-style: none; margin: 0; padding: 0; }
    .series li {
      display: grid;
      grid-template-columns: 4.2rem minmax(0, 1fr) auto;
      gap: 1rem 1.5rem;
      align-items: start;
      border-top: 1px solid var(--line);
      padding: 1.45rem 0 1.35rem;
    }
    .num {
      font-size: 1.7rem;
      color: var(--green);
      line-height: 1;
    }
    .codes {
      margin: 0.3rem 0 0;
      letter-spacing: 0.04em;
      font-size: 0.92rem;
    }
    .summary { margin: 0.45rem 0 0; }
    .more {
      color: var(--green);
      text-decoration: none;
      border-bottom: 1px solid currentColor;
      padding-bottom: 0.05rem;
      align-self: end;
    }
    .case-list {
      display: grid;
      grid-template-columns: 1.35fr 1fr;
      border-top: 1px solid var(--line);
    }
    .case-list article {
      padding: 1.45rem 0 1.5rem;
      border-bottom: 1px solid var(--line);
    }
    .case-list article:first-child {
      grid-row: 1 / span 2;
      padding-right: 2rem;
      border-right: 1px solid var(--line);
    }
    .case-list article:not(:first-child) { padding-left: 1.6rem; }
    .case-list h3 { max-width: 12em; margin-top: 0.45rem; }
    .case-list .more { display: inline-block; margin-top: 1rem; }
    .close {
      background: var(--ink);
      color: #f4f7f4;
      margin-top: clamp(2.5rem, 6vw, 4.5rem);
    }
    .close-inner {
      width: min(1120px, calc(100% - clamp(28px, 6vw, 88px)));
      margin-inline: auto;
      padding: clamp(3rem, 7vw, 5.5rem) 0;
    }
    .close .kicker { color: #9dce9d; }
    .close h2 { max-width: 14em; margin-top: 0.45rem; }
    .close .lede { color: #d5e3d6; max-width: 36em; margin: 1rem 0 1.5rem; }
    .foot {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.5rem;
      justify-content: space-between;
      padding: 1.2rem 0 2rem;
      color: var(--soft);
      font-size: 0.88rem;
    }
    .foot p { margin: 0; }
    .foot a { color: var(--green); }
    @media (max-width: 800px) {
      .nav { margin-left: 0; }
      .hero, .case-list { grid-template-columns: 1fr; }
      .series li { grid-template-columns: 3rem minmax(0, 1fr); }
      .series li .more { grid-column: 2; justify-self: start; }
      .case-list article:first-child {
        grid-row: auto;
        padding-right: 0;
        border-right: 0;
      }
      .case-list article:not(:first-child) { padding-left: 0; }
      h1 { max-width: none; }
    }
    @media print {
      body::before { display: none; }
      .close { background: white; color: black; }
      .close .lede, .close .kicker { color: black; }
    }
  </style>
</head>
<body>
  <header class="top wrap">
    <a class="brand" href="index.html"><span class="mark" aria-hidden="true"></span>LZK</a>
    <nav class="nav" aria-label="导航">${nav}</nav>
    <p class="docno">${escapeHtml(docNo)}</p>
  </header>
  <main>${chunks.join("")}</main>
  <footer class="foot wrap">
    <p>${escapeHtml(chrome.brand)}</p>
    <p>${escapeHtml(chrome.generated)} · <a href="/admin">${escapeHtml(chrome.desk)}</a></p>
  </footer>
</body>
</html>
`;
}
