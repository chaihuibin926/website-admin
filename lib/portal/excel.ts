import { parsePortal } from "@/lib/portal/schema";
import type { FieldDef, PortalDocument, Section } from "@/lib/portal/types";

export type PortalSheet = {
  name: string;
  rows: string[][];
};

const HERO_FIELDS = [
  ["上方小字", "kicker"],
  ["用在哪里", "application"],
  ["标题", "title"],
  ["说明", "lede"],
  ["图号", "docNo"],
  ["版次", "revision"],
  ["主按钮", "primaryLabel"],
  ["主按钮链接", "primaryHref"],
  ["次按钮", "secondaryLabel"],
  ["次按钮链接", "secondaryHref"],
] as const;

const CLOSE_FIELDS = [
  ["上方小字", "kicker"],
  ["标题", "title"],
  ["说明", "lede"],
  ["按钮", "label"],
  ["链接", "href"],
] as const;

const SERIES_ITEM = ["名称", "型号", "说明", "链接"] as const;
const CASE_ITEM = ["行业", "标题", "结果", "链接"] as const;
const NAV_COLUMNS = ["名称", "链接"] as const;
const SEO_COLUMNS = ["标题", "摘要"] as const;
const SERIES_LEAD = ["系列标题", "系列说明"] as const;
const CASE_LEAD = ["案例标题", "案例说明"] as const;
const ITEM_LIMIT = 8;

function cell(row: string[] | undefined, index: number) {
  return String(row?.[index] ?? "")
    .replaceAll("\u0000", "")
    .trim();
}

function sheetRows(sheets: PortalSheet[], name: string) {
  const sheet = sheets.find((item) => item.name.trim() === name);
  if (!sheet) throw new Error(`表格里没有「${name}」。请用导出的 Excel 填写后再导入。`);
  return sheet.rows;
}

function extraHeaders(fields: FieldDef[], reserved: readonly string[]) {
  const taken = new Set<string>(reserved);
  return fields.map((field) => {
    const sameLabel = fields.filter((item) => item.label === field.label).length > 1;
    let header = sameLabel || taken.has(field.label) ? `${field.label}（${field.key}）` : field.label;
    if (taken.has(header)) header = `${header}-${field.key}`;
    taken.add(header);
    return header;
  });
}

function headerOf(row: string[]) {
  const cells = row.map((value) => String(value ?? "").trim());
  while (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
  return cells;
}

function readTable(rows: string[][], columns: string[], name: string) {
  const start = rows.findIndex((row) => headerOf(row).join("\0") === columns.join("\0"));
  if (start < 0) {
    throw new Error(`「${name}」的第一行表头需要是：${columns.join("、")}。请重新导出后再填写。`);
  }
  const body: string[][] = [];
  for (const row of rows.slice(start + 1)) {
    const values = columns.map((_, index) => cell(row, index));
    if (values.every((value) => value === "")) continue;
    body.push(values);
  }
  return body;
}

function readSingle(rows: string[][], columns: string[], name: string) {
  const body = readTable(rows, columns, name);
  if (body.length === 0) throw new Error(`「${name}」要在表头下面留一行内容。`);
  if (body.length > 1) throw new Error(`「${name}」只填写一行。`);
  return body[0];
}

function blankRows(count: number, width: number) {
  return Array.from({ length: count }, () => Array.from({ length: width }, () => ""));
}

function sectionBy<T extends Section["type"]>(doc: PortalDocument, type: T) {
  return doc.sections.find((section) => section.type === type) as Extract<Section, { type: T }> | undefined;
}

function requireSection<T extends Section["type"]>(doc: PortalDocument, type: T, name: string) {
  const section = sectionBy(doc, type);
  if (!section) throw new Error(`当前页面没有「${name}」，这份表格对不上。`);
  return section;
}

function readGrouped(rows: string[][], columns: string[], name: string, leadCount: number) {
  const body = readTable(rows, columns, name);
  let title = "";
  let lede = "";
  const items: string[][] = [];
  for (const row of body) {
    if (!title && row[0]) title = row[0];
    if (!lede && row[1]) lede = row[1];
    const item = row.slice(leadCount);
    if (item.every((value) => value === "")) continue;
    items.push(item);
  }
  if (items.length > ITEM_LIMIT) throw new Error(`「${name}」最多 ${ITEM_LIMIT} 行。`);
  return { title, lede, items };
}

export function exportPortalSheets(doc: PortalDocument): PortalSheet[] {
  const hero = requireSection(doc, "hero", "开头");
  const series = requireSection(doc, "series", "产品系列");
  const cases = requireSection(doc, "cases", "应用案例");
  const close = requireSection(doc, "close", "结尾");
  const heroFields = doc.fieldSchema.filter((field) => field.scope === "hero");
  const closeFields = doc.fieldSchema.filter((field) => field.scope === "close");
  const seriesFields = doc.fieldSchema.filter((field) => field.scope === "series");
  const caseFields = doc.fieldSchema.filter((field) => field.scope === "cases");
  const heroHeaders = [...HERO_FIELDS.map(([label]) => label), ...extraHeaders(heroFields, HERO_FIELDS.map(([label]) => label))];
  const closeHeaders = [...CLOSE_FIELDS.map(([label]) => label), ...extraHeaders(closeFields, CLOSE_FIELDS.map(([label]) => label))];
  const seriesHeaders = [...SERIES_LEAD, ...SERIES_ITEM, ...extraHeaders(seriesFields, [...SERIES_LEAD, ...SERIES_ITEM])];
  const caseHeaders = [...CASE_LEAD, ...CASE_ITEM, ...extraHeaders(caseFields, [...CASE_LEAD, ...CASE_ITEM])];

  const seriesData = (series.items.length ? series.items : [null]).map((item, index) => [
    index === 0 ? series.title : "",
    index === 0 ? series.lede : "",
    item?.name ?? "",
    item?.codes ?? "",
    item?.summary ?? "",
    item?.href ?? "",
    ...seriesFields.map((field) => item?.extras[field.key] ?? ""),
  ]);
  const caseData = (cases.items.length ? cases.items : [null]).map((item, index) => [
    index === 0 ? cases.title : "",
    index === 0 ? cases.lede : "",
    item?.industry ?? "",
    item?.title ?? "",
    item?.result ?? "",
    item?.href ?? "",
    ...caseFields.map((field) => item?.extras[field.key] ?? ""),
  ]);

  return [
    {
      name: "开头",
      rows: [
        heroHeaders,
        [
          ...HERO_FIELDS.map(([, key]) => hero[key]),
          ...heroFields.map((field) => hero.extras[field.key] ?? ""),
        ],
      ],
    },
    {
      name: "产品系列",
      rows: [seriesHeaders, ...seriesData, ...blankRows(Math.max(0, ITEM_LIMIT - seriesData.length), seriesHeaders.length)],
    },
    {
      name: "应用案例",
      rows: [caseHeaders, ...caseData, ...blankRows(Math.max(0, ITEM_LIMIT - caseData.length), caseHeaders.length)],
    },
    {
      name: "结尾",
      rows: [
        closeHeaders,
        [
          ...CLOSE_FIELDS.map(([, key]) => close[key]),
          ...closeFields.map((field) => close.extras[field.key] ?? ""),
        ],
      ],
    },
    {
      name: "导航",
      rows: [
        [...NAV_COLUMNS],
        ...doc.nav.map((link) => [link.label, link.href]),
        ...blankRows(Math.max(0, ITEM_LIMIT - doc.nav.length), NAV_COLUMNS.length),
      ],
    },
    {
      name: "搜索结果",
      rows: [[...SEO_COLUMNS], [doc.seo.title, doc.seo.description]],
    },
  ];
}

export function importPortalSheets(current: PortalDocument, sheets: PortalSheet[]) {
  const hero = requireSection(current, "hero", "开头");
  const series = requireSection(current, "series", "产品系列");
  const cases = requireSection(current, "cases", "应用案例");
  const close = requireSection(current, "close", "结尾");
  const heroFields = current.fieldSchema.filter((field) => field.scope === "hero");
  const seriesFields = current.fieldSchema.filter((field) => field.scope === "series");
  const caseFields = current.fieldSchema.filter((field) => field.scope === "cases");
  const closeFields = current.fieldSchema.filter((field) => field.scope === "close");
  const heroHeaders = [...HERO_FIELDS.map(([label]) => label), ...extraHeaders(heroFields, HERO_FIELDS.map(([label]) => label))];
  const closeHeaders = [...CLOSE_FIELDS.map(([label]) => label), ...extraHeaders(closeFields, CLOSE_FIELDS.map(([label]) => label))];
  const seriesHeaders = [...SERIES_LEAD, ...SERIES_ITEM, ...extraHeaders(seriesFields, [...SERIES_LEAD, ...SERIES_ITEM])];
  const caseHeaders = [...CASE_LEAD, ...CASE_ITEM, ...extraHeaders(caseFields, [...CASE_LEAD, ...CASE_ITEM])];

  const heroRow = readSingle(sheetRows(sheets, "开头"), heroHeaders, "开头");
  const closeRow = readSingle(sheetRows(sheets, "结尾"), closeHeaders, "结尾");
  const seoRow = readSingle(sheetRows(sheets, "搜索结果"), [...SEO_COLUMNS], "搜索结果");
  const seriesTable = readGrouped(sheetRows(sheets, "产品系列"), seriesHeaders, "产品系列", SERIES_LEAD.length);
  const caseTable = readGrouped(sheetRows(sheets, "应用案例"), caseHeaders, "应用案例", CASE_LEAD.length);
  const navRows = readTable(sheetRows(sheets, "导航"), [...NAV_COLUMNS], "导航");
  if (navRows.length > ITEM_LIMIT) throw new Error(`「导航」最多 ${ITEM_LIMIT} 行。`);

  const nextHero = { ...hero, extras: { ...hero.extras } };
  HERO_FIELDS.forEach(([, key], index) => {
    nextHero[key] = heroRow[index] ?? "";
  });
  heroFields.forEach((field, index) => {
    nextHero.extras[field.key] = heroRow[HERO_FIELDS.length + index] ?? "";
  });

  const nextClose = { ...close, extras: { ...close.extras } };
  CLOSE_FIELDS.forEach(([, key], index) => {
    nextClose[key] = closeRow[index] ?? "";
  });
  closeFields.forEach((field, index) => {
    nextClose.extras[field.key] = closeRow[CLOSE_FIELDS.length + index] ?? "";
  });

  const nextSeries = {
    ...series,
    title: seriesTable.title,
    lede: seriesTable.lede,
    items: seriesTable.items.map((row) => ({
      name: row[0] ?? "",
      codes: row[1] ?? "",
      summary: row[2] ?? "",
      href: row[3] ?? "",
      extras: Object.fromEntries(seriesFields.map((field, index) => [field.key, row[SERIES_ITEM.length + index] ?? ""])),
    })),
  };

  const nextCases = {
    ...cases,
    title: caseTable.title,
    lede: caseTable.lede,
    items: caseTable.items.map((row) => ({
      industry: row[0] ?? "",
      title: row[1] ?? "",
      result: row[2] ?? "",
      href: row[3] ?? "",
      extras: Object.fromEntries(caseFields.map((field, index) => [field.key, row[CASE_ITEM.length + index] ?? ""])),
    })),
  };

  const sections = current.sections.map((section) => {
    if (section.id === hero.id) return nextHero;
    if (section.id === series.id) return nextSeries;
    if (section.id === cases.id) return nextCases;
    if (section.id === close.id) return nextClose;
    return section;
  });

  return parsePortal({
    ...current,
    seo: {
      title: seoRow[0] ?? "",
      description: seoRow[1] ?? "",
    },
    nav: navRows.map((row) => ({ label: row[0] ?? "", href: row[1] ?? "" })),
    sections,
  });
}
