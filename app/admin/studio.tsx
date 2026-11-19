"use client";

import { useMemo, useState, type ReactNode } from "react";
import { publishAction, saveDraftAction } from "@/app/admin/actions";
import type { CaseItem, FieldDef, PortalDocument, Section, SeriesItem } from "@/lib/portal/types";

const SECTION_LABEL = {
  hero: "开头",
  series: "产品系列",
  cases: "应用案例",
  close: "结尾",
} as const;

function statusLabel(dirty: boolean, saved: PortalDocument) {
  if (dirty) return "还没保存";
  if (!saved.publishedAt || saved.updatedAt > saved.publishedAt) return "已保存，还没发布";
  return "已发布";
}

function sectionPreview(section: Section) {
  const title = section.title.trim();
  return title || "还没有标题";
}

export function Studio({ initial }: { initial: PortalDocument }) {
  const [doc, setDoc] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"" | "save" | "preview" | "publish">("");
  const dirty = useMemo(() => JSON.stringify(doc) !== JSON.stringify(saved), [doc, saved]);

  function patchSection(id: string, recipe: (section: Section) => Section) {
    setDoc((current) => ({
      ...current,
      sections: current.sections.map((section) => (section.id === id ? recipe(section) : section)),
    }));
  }

  function moveSection(index: number, direction: -1 | 1) {
    setDoc((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.sections.length) return current;
      const sections = current.sections.slice();
      const [item] = sections.splice(index, 1);
      sections.splice(target, 0, item);
      return { ...current, sections };
    });
  }

  async function persist(kind: "save" | "preview" | "publish") {
    const popup = kind === "save" ? null : window.open("", kind === "preview" ? "lzk-preview" : "lzk-portal");
    setBusy(kind);
    setNote("");
    const result = kind === "publish" ? await publishAction(doc) : await saveDraftAction(doc);
    setBusy("");
    if (!result.ok) {
      popup?.close();
      setNote(result.message);
      return;
    }
    setDoc(result.doc);
    setSaved(result.doc);
    if (kind === "publish") {
      const href = `/portal?v=${Date.now()}`;
      setNote("已发布。新打开的就是现在的页面。");
      if (popup) popup.location.href = href;
      return;
    }
    if (kind === "preview") {
      setNote("这是草稿。已经发布的页面还没变。");
      if (popup) popup.location.href = `/admin/preview?v=${Date.now()}`;
      return;
    }
    setNote("已保存。");
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void persist("save");
      }}
    >
      <header className="studio-bar">
        <div className="studio-bar-inner">
          <div>
            <p className="studio-kicker">LZK 门户</p>
            <p className="studio-status">
              {statusLabel(dirty, saved)}
              {saved.publishedAt ? (
                <>
                  {" · "}
                  <a href="/portal" target="_blank" rel="noreferrer">
                    打开发布页
                  </a>
                </>
              ) : null}
            </p>
          </div>
          <div className="studio-actions">
            <button className="btn text" type="submit" disabled={busy !== ""}>
              {busy === "save" ? "正在保存" : "保存"}
            </button>
            <button className="btn text" type="button" disabled={busy !== ""} onClick={() => void persist("preview")}>
              {busy === "preview" ? "正在打开" : "预览草稿"}
            </button>
            <button className="btn" type="button" disabled={busy !== ""} onClick={() => void persist("publish")}>
              {busy === "publish" ? "正在发布" : "发布页面"}
            </button>
          </div>
        </div>
        {note ? (
          <p className="studio-note bar-note" role="status">
            {note}
          </p>
        ) : null}
      </header>

      <main className="studio-body">
        <section className="step" id="copy">
          <h1>页面上的四段文字</h1>
          <p className="studio-lead">这四段就是首页。点「修改」改某一段，右边可以调整顺序。</p>
            <div className="outline">
              {doc.sections.map((section, index) => (
                <div className="outline-item" key={section.id} id={section.id}>
                  <details>
                    <summary>
                      <span className="outline-kind">{SECTION_LABEL[section.type]}</span>
                      <span className="outline-preview">{sectionPreview(section)}</span>
                      <span className="outline-edit">
                        <span className="when-shut">修改</span>
                        <span className="when-open">收起</span>
                      </span>
                    </summary>
                    <div className="outline-body">
                      <SectionFields
                        section={section}
                        fields={doc.fieldSchema.filter((field) => field.scope === section.type)}
                        onChange={(recipe) => patchSection(section.id, recipe)}
                      />
                    </div>
                  </details>
                  <div className="move">
                    <button type="button" onClick={() => moveSection(index, -1)} disabled={index === 0} aria-label={`上移${SECTION_LABEL[section.type]}`}>
                      上移
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(index, 1)}
                      disabled={index === doc.sections.length - 1}
                      aria-label={`下移${SECTION_LABEL[section.type]}`}
                    >
                      下移
                    </button>
                  </div>
                </div>
              ))}
            </div>
        </section>

        <details className="extra">
          <summary>改顶部导航或搜索结果</summary>
          <div className="extra-body">
            <section id="nav">
              <h2>顶部导航</h2>
              {doc.nav.map((link, index) => (
                <div className="pair" key={`${link.href}-${index}`}>
                  <Field
                    label={`名称 ${index + 1}`}
                    value={link.label}
                    onChange={(label) =>
                      setDoc((current) => ({
                        ...current,
                        nav: current.nav.map((item, itemIndex) => (itemIndex === index ? { ...item, label } : item)),
                      }))
                    }
                  />
                  <Field
                    label="链接"
                    value={link.href}
                    onChange={(href) =>
                      setDoc((current) => ({
                        ...current,
                        nav: current.nav.map((item, itemIndex) => (itemIndex === index ? { ...item, href } : item)),
                      }))
                    }
                  />
                </div>
              ))}
            </section>

            <section id="seo">
              <h2>搜索结果</h2>
              <Field
                label="标题"
                value={doc.seo.title}
                onChange={(title) => setDoc((current) => ({ ...current, seo: { ...current.seo, title } }))}
              />
              <Field
                label="摘要"
                value={doc.seo.description}
                rows={3}
                onChange={(description) =>
                  setDoc((current) => ({ ...current, seo: { ...current.seo, description } }))
                }
              />
            </section>

          </div>
        </details>
      </main>
    </form>
  );
}

function SectionFields({
  section,
  fields,
  onChange,
}: {
  section: Section;
  fields: FieldDef[];
  onChange: (recipe: (section: Section) => Section) => void;
}) {
  if (section.type === "hero") {
    return (
      <>
        <div className="pair">
          <Field label="上方小字" value={section.kicker} onChange={(kicker) => onChange((current) => ({ ...current, kicker }) as Section)} />
          <Field
            label="用在哪里"
            value={section.application}
            onChange={(application) => onChange((current) => ({ ...current, application }) as Section)}
          />
        </div>
        <Field label="标题" value={section.title} onChange={(title) => onChange((current) => ({ ...current, title }) as Section)} />
        <Field label="说明" value={section.lede} rows={4} onChange={(lede) => onChange((current) => ({ ...current, lede }) as Section)} />
        <div className="pair">
          <Field label="图号" value={section.docNo} onChange={(docNo) => onChange((current) => ({ ...current, docNo }) as Section)} />
          <Field
            label="版次"
            value={section.revision}
            onChange={(revision) => onChange((current) => ({ ...current, revision }) as Section)}
          />
        </div>
        <div className="pair">
          <Field
            label="主按钮"
            value={section.primaryLabel}
            onChange={(primaryLabel) => onChange((current) => ({ ...current, primaryLabel }) as Section)}
          />
          <Field
            label="主按钮链接"
            value={section.primaryHref}
            onChange={(primaryHref) => onChange((current) => ({ ...current, primaryHref }) as Section)}
          />
        </div>
        <div className="pair">
          <Field
            label="次按钮"
            value={section.secondaryLabel}
            onChange={(secondaryLabel) => onChange((current) => ({ ...current, secondaryLabel }) as Section)}
          />
          <Field
            label="次按钮链接"
            value={section.secondaryHref}
            onChange={(secondaryHref) => onChange((current) => ({ ...current, secondaryHref }) as Section)}
          />
        </div>
        <ExtraFields
          fields={fields}
          values={section.extras}
          onChange={(key, value) =>
            onChange((current) =>
              current.type === "hero" ? { ...current, extras: { ...current.extras, [key]: value } } : current,
            )
          }
        />
      </>
    );
  }

  if (section.type === "series") {
    return (
      <>
        <Field label="标题" value={section.title} onChange={(title) => onChange((current) => ({ ...current, title }) as Section)} />
        <Field label="说明" value={section.lede} rows={3} onChange={(lede) => onChange((current) => ({ ...current, lede }) as Section)} />
        {section.items.map((item, index) => (
          <Item key={`${item.href}-${index}`} title={item.name || `系列 ${index + 1}`}>
            <Field label="名称" value={item.name} onChange={(name) => updateSeries(onChange, index, { name })} />
            <Field label="型号" value={item.codes} onChange={(codes) => updateSeries(onChange, index, { codes })} />
            <Field
              label="说明"
              value={item.summary}
              rows={3}
              onChange={(summary) => updateSeries(onChange, index, { summary })}
            />
            <Field label="链接" value={item.href} onChange={(href) => updateSeries(onChange, index, { href })} />
            <ExtraFields
              fields={fields}
              values={item.extras}
              onChange={(key, value) => updateSeries(onChange, index, { extras: { ...item.extras, [key]: value } })}
            />
          </Item>
        ))}
      </>
    );
  }

  if (section.type === "cases") {
    return (
      <>
        <Field label="标题" value={section.title} onChange={(title) => onChange((current) => ({ ...current, title }) as Section)} />
        <Field label="说明" value={section.lede} rows={3} onChange={(lede) => onChange((current) => ({ ...current, lede }) as Section)} />
        {section.items.map((item, index) => (
          <Item key={`${item.href}-${index}`} title={item.industry || `工况 ${index + 1}`}>
            <div className="pair">
              <Field
                label="行业"
                value={item.industry}
                onChange={(industry) => updateCase(onChange, index, { industry })}
              />
              <Field label="链接" value={item.href} onChange={(href) => updateCase(onChange, index, { href })} />
            </div>
            <Field label="标题" value={item.title} onChange={(title) => updateCase(onChange, index, { title })} />
            <Field
              label="结果"
              value={item.result}
              rows={3}
              onChange={(result) => updateCase(onChange, index, { result })}
            />
            <ExtraFields
              fields={fields}
              values={item.extras}
              onChange={(key, value) => updateCase(onChange, index, { extras: { ...item.extras, [key]: value } })}
            />
          </Item>
        ))}
      </>
    );
  }

  return (
    <>
      <Field label="上方小字" value={section.kicker} onChange={(kicker) => onChange((current) => ({ ...current, kicker }) as Section)} />
      <Field label="标题" value={section.title} onChange={(title) => onChange((current) => ({ ...current, title }) as Section)} />
      <Field label="说明" value={section.lede} rows={3} onChange={(lede) => onChange((current) => ({ ...current, lede }) as Section)} />
      <div className="pair">
        <Field label="按钮" value={section.label} onChange={(label) => onChange((current) => ({ ...current, label }) as Section)} />
        <Field label="链接" value={section.href} onChange={(href) => onChange((current) => ({ ...current, href }) as Section)} />
      </div>
      <ExtraFields
        fields={fields}
        values={section.extras}
        onChange={(key, value) =>
          onChange((current) =>
            current.type === "close" ? { ...current, extras: { ...current.extras, [key]: value } } : current,
          )
        }
      />
    </>
  );
}

function ExtraFields({
  fields,
  values,
  onChange,
}: {
  fields: FieldDef[];
  values: Record<string, string> | undefined;
  onChange: (key: string, value: string) => void;
}) {
  if (!fields.length) return null;
  return (
    <>
      {fields.map((field) => (
        <Field
          key={field.key}
          label={field.label}
          value={values?.[field.key] ?? ""}
          rows={field.kind === "longtext" ? 3 : undefined}
          onChange={(value) => onChange(field.key, value)}
        />
      ))}
    </>
  );
}

function updateSeries(
  onChange: (recipe: (section: Section) => Section) => void,
  index: number,
  patch: Partial<SeriesItem>,
) {
  onChange((current) => {
    if (current.type !== "series") return current;
    return {
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    };
  });
}

function updateCase(
  onChange: (recipe: (section: Section) => Section) => void,
  index: number,
  patch: Partial<CaseItem>,
) {
  onChange((current) => {
    if (current.type !== "cases") return current;
    return {
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    };
  });
}

function Item({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="item">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {rows ? (
        <textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}
