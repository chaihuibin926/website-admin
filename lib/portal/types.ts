export type Lang = "zh" | "en";

export type FieldScope = "hero" | "series" | "cases" | "close";

export type FieldDef = {
  key: string;
  label: string;
  kind: "text" | "longtext";
  scope: FieldScope;
};

export type NavLink = {
  label: string;
  href: string;
};

export type HeroSection = {
  id: string;
  type: "hero";
  kicker: string;
  title: string;
  lede: string;
  docNo: string;
  revision: string;
  application: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  extras: Record<string, string>;
};

export type SeriesItem = {
  name: string;
  codes: string;
  summary: string;
  href: string;
  extras: Record<string, string>;
};

export type SeriesSection = {
  id: string;
  type: "series";
  title: string;
  lede: string;
  items: SeriesItem[];
};

export type CaseItem = {
  industry: string;
  title: string;
  result: string;
  href: string;
  extras: Record<string, string>;
};

export type CasesSection = {
  id: string;
  type: "cases";
  title: string;
  lede: string;
  items: CaseItem[];
};

export type CloseSection = {
  id: string;
  type: "close";
  kicker: string;
  title: string;
  lede: string;
  label: string;
  href: string;
  extras: Record<string, string>;
};

export type Section = HeroSection | SeriesSection | CasesSection | CloseSection;

export type PortalDocument = {
  lang: Lang;
  seo: {
    title: string;
    description: string;
  };
  nav: NavLink[];
  fieldSchema: FieldDef[];
  sections: Section[];
  updatedAt: string;
  publishedAt: string | null;
};
