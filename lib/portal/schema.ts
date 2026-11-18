import { safeHref } from "@/lib/portal/html";
import type {
  CaseItem,
  CasesSection,
  CloseSection,
  FieldDef,
  FieldScope,
  HeroSection,
  Lang,
  NavLink,
  PortalDocument,
  Section,
  SeriesItem,
  SeriesSection,
} from "@/lib/portal/types";

function asRecord(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}格式不正确`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.replaceAll("\u0000", "").trim().slice(0, max);
}

function timestamp(value: unknown, fallback: string | null) {
  if (typeof value !== "string" || !value) return fallback;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return fallback;
  return new Date(time).toISOString();
}

function navLink(value: unknown): NavLink | null {
  const record = asRecord(value, "导航");
  const label = text(record.label, 40);
  if (!label) return null;
  return { label, href: safeHref(text(record.href, 200)) };
}

const SCOPES = new Set<FieldScope>(["hero", "series", "cases", "close"]);

function extras(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const next: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!/^[a-zA-Z][a-zA-Z0-9]{0,31}$/.test(key) || typeof item !== "string") continue;
    next[key] = item.replaceAll("\u0000", "").trim().slice(0, 200);
  }
  return next;
}

function fieldSchema(value: unknown): FieldDef[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("字段结构必须是数组");
  const used = new Set<string>();
  return value.slice(0, 16).map((item, index) => {
    const record = asRecord(item, `第 ${index + 1} 个字段`);
    const label = text(record.label, 16);
    const key = text(record.key, 32);
    const scope = record.scope;
    if (!label) throw new Error(`第 ${index + 1} 个字段缺少名称`);
    if (!SCOPES.has(scope as FieldScope)) {
      throw new Error(`「${label}」的位置只能是 hero、series、cases、close`);
    }
    if (!/^[a-zA-Z][a-zA-Z0-9]{0,31}$/.test(key)) {
      throw new Error(`「${label}」的 key 需要用英文字母开头`);
    }
    if (used.has(key)) throw new Error(`字段 key「${key}」重复了`);
    used.add(key);
    return {
      key,
      label,
      kind: record.kind === "longtext" ? "longtext" : "text",
      scope: scope as FieldScope,
    };
  });
}

function seriesItem(value: unknown): SeriesItem {
  const record = asRecord(value, "系列条目");
  return {
    name: text(record.name, 80),
    codes: text(record.codes, 120),
    summary: text(record.summary, 400),
    href: safeHref(text(record.href, 200)),
    extras: extras(record.extras),
  };
}

function caseItem(value: unknown): CaseItem {
  const record = asRecord(value, "工况条目");
  return {
    industry: text(record.industry, 40),
    title: text(record.title, 80),
    result: text(record.result, 400),
    href: safeHref(text(record.href, 200)),
    extras: extras(record.extras),
  };
}

function section(value: unknown, index: number): Section {
  const record = asRecord(value, "区块");
  const type = text(record.type, 20);
  const id = text(record.id, 40) || `${type || "block"}-${index + 1}`;

  if (type === "hero") {
    const hero: HeroSection = {
      id,
      type: "hero",
      kicker: text(record.kicker, 40),
      title: text(record.title, 120),
      lede: text(record.lede, 500),
      docNo: text(record.docNo, 40),
      revision: text(record.revision, 20),
      application: text(record.application, 80),
      primaryLabel: text(record.primaryLabel, 40),
      primaryHref: safeHref(text(record.primaryHref, 200)),
      secondaryLabel: text(record.secondaryLabel, 40),
      secondaryHref: safeHref(text(record.secondaryHref, 200)),
      extras: extras(record.extras),
    };
    return hero;
  }

  if (type === "series") {
    const items = Array.isArray(record.items) ? record.items.slice(0, 8).map(seriesItem) : [];
    const series: SeriesSection = {
      id,
      type: "series",
      title: text(record.title, 80),
      lede: text(record.lede, 300),
      items,
    };
    return series;
  }

  if (type === "cases") {
    const items = Array.isArray(record.items) ? record.items.slice(0, 8).map(caseItem) : [];
    const cases: CasesSection = {
      id,
      type: "cases",
      title: text(record.title, 80),
      lede: text(record.lede, 300),
      items,
    };
    return cases;
  }

  if (type === "close") {
    const close: CloseSection = {
      id,
      type: "close",
      kicker: text(record.kicker, 40),
      title: text(record.title, 120),
      lede: text(record.lede, 400),
      label: text(record.label, 40),
      href: safeHref(text(record.href, 200)),
      extras: extras(record.extras),
    };
    return close;
  }

  throw new Error(`不认识的区块类型：${type || "空"}`);
}

export function parsePortal(value: unknown): PortalDocument {
  const record = asRecord(value, "门户稿");
  const seo = asRecord(record.seo, "检索信息");
  if (!Array.isArray(record.nav) || !Array.isArray(record.sections)) {
    throw new Error("门户稿缺少导航或区块");
  }

  const lang: Lang = record.lang === "en" ? "en" : "zh";
  const nav = record.nav.slice(0, 8).map(navLink).filter((item): item is NavLink => item !== null);
  const sections = record.sections.slice(0, 12).map(section);
  const seen = new Set<string>();
  for (const block of sections) {
    if (seen.has(block.id)) block.id = `${block.id}-${seen.size + 1}`;
    seen.add(block.id);
  }

  return {
    lang,
    seo: {
      title: text(seo.title, 80),
      description: text(seo.description, 180),
    },
    nav,
    fieldSchema: fieldSchema(record.fieldSchema),
    sections,
    updatedAt: timestamp(record.updatedAt, new Date().toISOString()) ?? new Date().toISOString(),
    publishedAt: timestamp(record.publishedAt, null),
  };
}
