import { parsePortal } from "@/lib/portal/schema";
import type { PortalDocument } from "@/lib/portal/types";

type Theme = {
  name: string;
  enName: string;
  application: string;
  enApplication: string;
  keys: string[];
};

const THEMES: Theme[] = [
  {
    name: "机床",
    enName: "Machine tools",
    application: "机床主轴与转台",
    enApplication: "spindles and rotary tables",
    keys: ["机床", "主轴", "加工中心", "转台", "磨床"],
  },
  {
    name: "半导体设备",
    enName: "Semiconductor tools",
    application: "晶圆搬运与精密平台",
    enApplication: "wafer handling and precision stages",
    keys: ["半导体", "晶圆", "光刻", "搬运"],
  },
  {
    name: "医疗影像",
    enName: "Medical imaging",
    application: "医疗影像机架",
    enApplication: "imaging gantries",
    keys: ["医疗", "CT", "影像", "放疗", "牙科"],
  },
  {
    name: "工业机器人",
    enName: "Robot joints",
    application: "机器人关节",
    enApplication: "robot joints",
    keys: ["机器人", "关节", "谐波"],
  },
  {
    name: "薄壁轴承",
    enName: "Thin-section bearings",
    application: "截面受限的旋转部位",
    enApplication: "rotating positions with a limited section",
    keys: ["薄壁"],
  },
  {
    name: "交叉滚子轴承",
    enName: "Crossed roller bearings",
    application: "同时承受轴向与径向载荷的部位",
    enApplication: "positions that take axial and radial load together",
    keys: ["交叉滚子", "交叉"],
  },
];

const NAME_EN: Record<string, string> = {
  深沟球轴承: "Deep Groove Ball Bearings",
  交叉滚子轴承: "Crossed Roller Bearings",
  薄壁轴承: "Thin-Section Bearings",
  非标与替代: "Custom Replacement",
};

const INDUSTRY_EN: Record<string, string> = {
  机床: "Machine tools",
  半导体: "Semiconductor",
  医疗影像: "Medical imaging",
};

const CASE_TITLE_EN: Record<string, string> = {
  转台的轴向和径向一起收: "Axial and radial load in one slewing ring",
  搬运模组里的薄壁截面: "A thin section inside the transfer module",
  机架载荷下的非标替代: "A custom replacement for the gantry load",
};

const LABEL_EN: Record<string, string> = {
  联系工程师: "Talk to an engineer",
  查看轴承系列: "View the series",
  发送工况: "Send a duty cycle",
  产品: "Products",
  案例: "Cases",
  检测: "Inspection",
  公司: "Company",
  联系: "Contact",
  系列: "Series",
  工况: "Applications",
  选型: "Selection",
};

const LABEL_ZH: Record<string, string> = Object.fromEntries([
  ...Object.entries(NAME_EN).map(([zh, en]) => [en, zh]),
  ...Object.entries(INDUSTRY_EN).map(([zh, en]) => [en, zh]),
  ...Object.entries(CASE_TITLE_EN).map(([zh, en]) => [en, zh]),
  ...Object.entries(LABEL_EN).map(([zh, en]) => [en, zh]),
]);

function firstIndex(brief: string, keys: string[]) {
  const indexes = keys.map((key) => brief.indexOf(key)).filter((index) => index >= 0);
  return indexes.length ? Math.min(...indexes) : -1;
}

function joinZh(parts: string[]) {
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]}与${parts[1]}`;
  return `${parts.slice(0, -1).join("、")}与${parts[parts.length - 1]}`;
}

function translate(value: string, english: boolean) {
  if (english) return LABEL_EN[value] ?? NAME_EN[value] ?? INDUSTRY_EN[value] ?? CASE_TITLE_EN[value] ?? value;
  return LABEL_ZH[value] ?? value;
}

function userSentence(brief: string) {
  const skip = /简短|克制|精炼|少字|英文|英语|English|技术|参数|语气|面向|突出|强调|改成|写成|围绕/;
  const line = brief
    .split(/\n|。|！|？/)
    .map((part) => part.trim())
    .find((part) => part.length >= 12 && !skip.test(part));
  return line ? line.slice(0, 180) : "";
}

function seriesSummary(name: string, focus: string, focusEn: string, english: boolean, short: boolean) {
  const kind = /深沟|Deep Groove/i.test(name)
    ? "deep"
    : /交叉|Crossed/i.test(name)
      ? "crossed"
      : /薄壁|Thin/i.test(name)
        ? "thin"
        : /非标|替代|Custom/i.test(name)
          ? "custom"
          : "other";

  if (english) {
    if (short) {
      if (kind === "deep") return `Support points for ${focusEn}.`;
      if (kind === "crossed") return `Axial and radial load together, for ${focusEn}.`;
      if (kind === "thin") return `Limited section, for ${focusEn}.`;
      if (kind === "custom") return `A drawing-matched replacement for ${focusEn}.`;
      return `Selected for ${focusEn}.`;
    }
    if (kind === "deep") {
      return `Deep groove ball bearings for the support points in ${focusEn}. Speed and load pick the series; the codes stay as published.`;
    }
    if (kind === "crossed") {
      return `Crossed roller bearings where ${focusEn} must carry axial and radial load in one ring.`;
    }
    if (kind === "thin") {
      return `Thin-section bearings where ${focusEn} has little radial room and still needs rotational accuracy.`;
    }
    if (kind === "custom") {
      return `Custom replacements for ${focusEn}, matched to the current drawing, material and preload.`;
    }
    return `Specified around the load and envelope of ${focusEn}.`;
  }

  if (short) {
    if (kind === "deep") return "支承位。系列按转速和载荷选，型号不改。";
    if (kind === "crossed") return "同一套圈承受轴向和径向载荷。";
    if (kind === "thin") return "截面受限时仍用薄壁系列。";
    if (kind === "custom") return "按现有图纸做替代。";
    return "按载荷和安装空间选型。";
  }
  if (kind === "deep") return `深沟球轴承用在${focus}的支承位。转速和载荷决定系列，型号本身不改。`;
  if (kind === "crossed") return `交叉滚子轴承用在${focus}里，由同一套圈承受轴向和径向载荷。`;
  if (kind === "thin") return `薄壁轴承用在${focus}里截面受限、又要保持旋转精度的位置。`;
  if (kind === "custom") return `非标与替代按${focus}的现有图纸对齐接口、材料和预紧。`;
  return `${name}按${focus}的载荷和安装空间选型。`;
}

export function draftFromBrief(doc: PortalDocument, brief: string) {
  const text = brief.replace(/<[^>]*>/g, "").replaceAll("\u0000", "").trim();
  if (text.length < 2) {
    throw new Error("先写两点以上的要点，再起草。");
  }

  const english = /英文|英语|English/i.test(text);
  const short = /简短|克制|精炼|少字|短一些/.test(text);
  const technical = /技术|参数|游隙|预紧|精度/.test(text);
  const themes = THEMES.map((theme) => ({ theme, at: firstIndex(text, theme.keys) }))
    .filter((item) => item.at >= 0)
    .sort((a, b) => a.at - b.at)
    .slice(0, 2)
    .map((item) => item.theme);

  const focus = themes[0]?.application ?? "关键旋转部位";
  const focusEn = themes[0]?.enApplication ?? "critical rotating positions";
  const shortName = themes.length ? joinZh(themes.map((theme) => theme.name)) : "关键部位";
  const sentence = userSentence(text);

  const next = structuredClone(doc);
  next.lang = english ? "en" : "zh";

  const hero = next.sections.find((item) => item.type === "hero");
  if (hero?.type === "hero") {
    hero.kicker = english ? (themes[0]?.enName ?? "Precision bearings") : (themes[0]?.name ?? "精密轴承");
    hero.application = english ? focusEn : focus;
    hero.primaryLabel = translate(hero.primaryLabel, english);
    hero.secondaryLabel = translate(hero.secondaryLabel, english);
    if (english) {
      hero.title = short
        ? `Bearings for ${themes[0]?.enName.toLowerCase() ?? "critical rotation"}`
        : `Precision bearings for ${focusEn}`;
      hero.lede = short
        ? `Bearings and drawing-matched replacements for ${focusEn}.`
        : `LZK supplies precision bearings for ${focusEn}. Standard series are ready to select. Custom parts follow the current drawing.`;
    } else if (sentence && !short) {
      hero.title = themes.length ? `为${shortName}准备的精密轴承` : "按要点编排的精密轴承";
      hero.lede = /[。！？.]$/.test(sentence) ? sentence : `${sentence}。`;
    } else {
      hero.title = short ? `${shortName}用精密轴承` : `为${shortName}准备的精密轴承`;
      hero.lede = short
        ? `为${focus}提供精密轴承，也按图纸做替代。`
        : `LZK 为${focus}提供精密轴承。标准系列可以直接选型，非标件按现有图纸对齐接口、预紧和材料。`;
    }
    if (technical && !short && !/预紧|preload/i.test(hero.lede)) {
      hero.lede += english
        ? " Clearance, preload and material stay tied to the duty cycle."
        : "游隙、预紧和材料按工况确定。";
    }
  }

  const series = next.sections.find((item) => item.type === "series");
  if (series?.type === "series") {
    series.title = translate(series.title, english);
    series.lede = english
      ? `Four families cover the usual choices for ${focusEn}. The series codes stay as published.`
      : short
        ? `${focus}里最常选的四类。型号不改。`
        : `下面四类覆盖${focus}里最常见的选型。型号保持原样，点进去仍是现有产品页。`;
    for (const item of series.items) {
      const sourceName = translate(item.name, false);
      item.name = english ? (NAME_EN[sourceName] ?? NAME_EN[item.name] ?? item.name) : sourceName;
      item.summary = seriesSummary(item.name, focus, focusEn, english, short);
    }
  }

  const cases = next.sections.find((item) => item.type === "cases");
  if (cases?.type === "cases") {
    cases.title = translate(cases.title, english);
    cases.lede = english
      ? `Rotating positions already engineered around ${focusEn}.`
      : `${focus}里已经做过的几类旋转部位。`;
    for (const item of cases.items) {
      const sourceIndustry = translate(item.industry, false);
      const sourceTitle = translate(item.title, false);
      item.industry = english
        ? (INDUSTRY_EN[sourceIndustry] ?? INDUSTRY_EN[item.industry] ?? item.industry)
        : sourceIndustry;
      item.title = english
        ? (CASE_TITLE_EN[sourceTitle] ?? CASE_TITLE_EN[item.title] ?? item.title)
        : sourceTitle;
      item.result = english
        ? short
          ? `${item.industry}, sized for ${focusEn}.`
          : `${item.industry} keeps the existing mounting interface and is sized for ${focusEn}.`
        : short
          ? `${item.industry}，按${focus}确定游隙与预紧。`
          : `${item.industry}沿用现有安装接口，按${focus}的载荷和空间确定游隙与预紧。`;
    }
  }

  const close = next.sections.find((item) => item.type === "close");
  if (close?.type === "close") {
    close.kicker = translate(close.kicker, english);
    close.label = translate(close.label, english);
    close.title = english
      ? short
        ? `Talk about ${focusEn}`
        : `Send the duty cycle for ${focusEn}`
      : short
        ? `谈${focus}`
        : `把${focus}的工况发给我们`;
    close.lede = english
      ? "A drawing, speed and load are enough to start. We reply with a series or a custom replacement."
      : "图纸、转速和载荷就够开始。我们按系列或非标替代回复。";
  }

  for (const link of next.nav) {
    link.label = translate(link.label, english);
  }

  const seoTitle = hero?.type === "hero" ? hero.title : next.seo.title;
  const seoLede = hero?.type === "hero" ? hero.lede : next.seo.description;
  next.seo = {
    title: `${seoTitle} | LZK`.slice(0, 80),
    description: seoLede.slice(0, 180),
  };

  const qualifiers = [
    themes.length ? `围绕${shortName}` : "按你写的要点",
    english ? "改成英文" : "",
    short ? "把句子收短" : "",
    technical ? "补上精度相关的说法" : "",
  ].filter(Boolean);

  return {
    doc: parsePortal(next),
    note: `已${qualifiers.join("，")}。链接、图号和区块顺序没有改。`,
  };
}
