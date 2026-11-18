import { parsePortal } from "@/lib/portal/schema";
import type { FieldDef, FieldScope, PortalDocument } from "@/lib/portal/types";

type CatalogItem = {
  key: string;
  label: string;
  scope: FieldScope;
  keywords: string[];
  heroValue?: string;
  closeValue?: string;
  seriesValue?: Record<string, string>;
  caseValue?: string;
};

const CATALOG: CatalogItem[] = [
  {
    key: "certification",
    label: "认证",
    scope: "hero",
    keywords: ["认证", "证书", "ISO"],
    heroValue: "ISO 9001 · IATF 16949",
  },
  {
    key: "precision",
    label: "旋转精度",
    scope: "hero",
    keywords: ["精度", "旋转精度", "P5", "P4"],
    heroValue: "P5 / P4，按工况选定",
  },
  {
    key: "maxSpeed",
    label: "最高转速",
    scope: "series",
    keywords: ["转速", "最高转速"],
    seriesValue: {
      深沟球轴承: "12000 r/min",
      交叉滚子轴承: "300 r/min",
      薄壁轴承: "5000 r/min",
      非标与替代: "按图纸",
    },
  },
  {
    key: "ratedLoad",
    label: "额定载荷",
    scope: "series",
    keywords: ["载荷", "额定载荷"],
    seriesValue: {
      深沟球轴承: "按孔径选型",
      交叉滚子轴承: "轴向与径向同时承受",
      薄壁轴承: "轻载、高精度",
      非标与替代: "按载荷核算",
    },
  },
  {
    key: "clearance",
    label: "游隙",
    scope: "series",
    keywords: ["游隙"],
    seriesValue: {
      深沟球轴承: "C0 / C3",
      交叉滚子轴承: "预紧可选",
      薄壁轴承: "小游隙",
      非标与替代: "按图纸",
    },
  },
  {
    key: "material",
    label: "材料",
    scope: "series",
    keywords: ["材料", "钢材", "GCr15"],
    seriesValue: {
      深沟球轴承: "GCr15",
      交叉滚子轴承: "GCr15",
      薄壁轴承: "GCr15 / 不锈钢",
      非标与替代: "按工况更换",
    },
  },
  {
    key: "temperature",
    label: "工作温度",
    scope: "series",
    keywords: ["温度"],
    seriesValue: {
      深沟球轴承: "-30°C 至 120°C",
      交叉滚子轴承: "-20°C 至 80°C",
      薄壁轴承: "-30°C 至 120°C",
      非标与替代: "按润滑方案",
    },
  },
  {
    key: "lubrication",
    label: "润滑",
    scope: "series",
    keywords: ["润滑", "油脂"],
    seriesValue: {
      深沟球轴承: "脂润滑",
      交叉滚子轴承: "脂润滑",
      薄壁轴承: "脂润滑 / 油润滑",
      非标与替代: "按转速选定",
    },
  },
  {
    key: "leadTime",
    label: "交期",
    scope: "close",
    keywords: ["交货", "交期"],
    closeValue: "常规系列按库存，非标按图纸排期",
  },
  {
    key: "warranty",
    label: "质保",
    scope: "close",
    keywords: ["质保", "保修"],
    closeValue: "按合同约定",
  },
];

const SCOPES = new Set<FieldScope>(["hero", "series", "cases", "close"]);

function sample(field: CatalogItem | undefined, key: string, name: string) {
  if (!field) return "待填写";
  if (field.seriesValue) return field.seriesValue[name] ?? "按工况确定";
  if (field.caseValue) return field.caseValue;
  return field.heroValue ?? field.closeValue ?? "待填写";
}

function requestedLabels(brief: string) {
  const quoted = [...brief.matchAll(/「([^」]{1,16})」/g)].map((match) => match[1].trim());
  const tails = brief.split(/增加|加上|新增|字段[:：]/).slice(1);
  const pieces = tails
    .join("、")
    .split(/[、,，/]|和|与|以及/)
    .map((part) => part.replace(/[。！？\s]/g, ""))
    .filter((part) => part.length >= 2 && part.length <= 12);
  return [...new Set([...quoted, ...pieces])];
}

function matchCatalog(label: string) {
  return CATALOG.find((item) => item.keywords.some((keyword) => label.includes(keyword) || keyword.includes(label)));
}

export function parseFieldSchema(value: unknown): FieldDef[] {
  if (!Array.isArray(value)) throw new Error("字段 JSON 必须是数组");
  const used = new Set<string>();
  return value.slice(0, 16).map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`第 ${index + 1} 个字段不是对象`);
    }
    const record = item as Record<string, unknown>;
    const label = typeof record.label === "string" ? record.label.trim().slice(0, 16) : "";
    const scope = record.scope;
    const key = typeof record.key === "string" ? record.key.trim() : "";
    if (!label) throw new Error(`第 ${index + 1} 个字段缺少 label`);
    if (!SCOPES.has(scope as FieldScope)) {
      throw new Error(`「${label}」的 scope 只能是 hero、series、cases、close`);
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

export function applyFieldSchema(doc: PortalDocument, fields: FieldDef[]) {
  const clean = parseFieldSchema(fields);
  const next = structuredClone(doc);
  next.fieldSchema = clean;
  const catalog = new Map(CATALOG.map((item) => [item.key, item]));

  for (const section of next.sections) {
    const scoped = clean.filter((field) => field.scope === section.type);
    if (section.type === "hero" || section.type === "close") {
      const extras: Record<string, string> = {};
      for (const field of scoped) {
        const current = section.extras?.[field.key];
        extras[field.key] = current || sample(catalog.get(field.key), field.key, "");
      }
      section.extras = extras;
    }
    if (section.type === "series") {
      section.items = section.items.map((item) => {
        const extras: Record<string, string> = {};
        for (const field of scoped) {
          extras[field.key] = item.extras?.[field.key] || sample(catalog.get(field.key), field.key, item.name);
        }
        return { ...item, extras };
      });
    }
    if (section.type === "cases") {
      section.items = section.items.map((item) => {
        const extras: Record<string, string> = {};
        for (const field of scoped) {
          extras[field.key] = item.extras?.[field.key] || sample(catalog.get(field.key), field.key, item.industry);
        }
        return { ...item, extras };
      });
    }
  }

  return parsePortal(next);
}

export function proposeFields(doc: PortalDocument, brief: string) {
  const text = brief.replace(/<[^>]*>/g, "").trim();
  const labels = requestedLabels(text);
  if (text.length < 2 || labels.length === 0) {
    throw new Error("写明要增加的字段，例如「增加认证、最高转速和额定载荷」。");
  }

  const used = new Set(doc.fieldSchema.map((field) => field.key));
  const added: FieldDef[] = [];
  let customCount = used.size;

  for (const label of labels) {
    const known = matchCatalog(label);
    const key = known?.key ?? `extra${customCount + 1}`;
    if (used.has(key)) continue;
    used.add(key);
    if (!known) customCount += 1;
    added.push({
      key,
      label: known?.label ?? label,
      kind: "text",
      scope: known?.scope ?? "hero",
    });
  }

  if (added.length === 0) throw new Error("这些字段已经在结构里。");
  return {
    doc: applyFieldSchema(doc, [...doc.fieldSchema, ...added]),
    note: `已生成字段 JSON：${added.map((field) => `${field.label}（${field.scope}）`).join("、")}。对应输入框已经出现，发布后会画进静态页。`,
  };
}
