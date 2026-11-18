"use client";

import { useMemo, useState, type ReactNode } from "react";
import { publishAction, saveDraftAction } from "@/app/admin/actions";
import { draftFromBrief } from "@/lib/portal/draft";
import { applyFieldSchema, parseFieldSchema, proposeFields } from "@/lib/portal/fields";
import type { CaseItem, FieldDef, PortalDocument, Section, SeriesItem } from "@/lib/portal/types";

const SECTION_LABEL = {
  hero: "首屏",
  series: "系列",
  cases: "工况",
  close: "收尾",
} as const;

function statusLabel(dirty: boolean, saved: PortalDocument) {
  if (dirty) return "有未保存的修改";
  if (!saved.publishedAt) return "已保存，尚未发布";
  if (saved.updatedAt > saved.publishedAt) return "有未发布的修改";
  return "已发布";
}

function formatStamp(iso: string | null) {
  if (!iso) return "还没有发布过";
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function Studio({ initial }: { initial: PortalDocument }) {
  const [doc, setDoc] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [brief, setBrief] = useState("面向半导体晶圆搬运，突出薄壁轴承和旋转精度。");
  const [fieldBrief, setFieldBrief] = useState("增加认证、最高转速和额定载荷");
  const [fieldJson, setFieldJson] = useState(() => JSON.stringify(initial.fieldSchema, null, 2));
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

  function onDraft() {
    try {
      const result = draftFromBrief(doc, brief);
      setDoc(result.doc);
      setNote(result.note);
    } catch (error) {
      setNote(error instanceof Error ? error.message : "起草没有完成");
    }
  }

  function onProposeFields() {
    try {
      const result = proposeFields(doc, fieldBrief);
      setDoc(result.doc);
      setFieldJson(JSON.stringify(result.doc.fieldSchema, null, 2));
      setNote(result.note);
    } catch (error) {
      setNote(error instanceof Error ? error.message : "字段没有生成");
    }
  }

  function onApplyFields() {
    try {
      const fields = parseFieldSchema(JSON.parse(fieldJson) as unknown);
      const next = applyFieldSchema(doc, fields);
      setDoc(next);
      setFieldJson(JSON.stringify(next.fieldSchema, null, 2));
      setNote("已按这份字段 JSON 补上输入框。发布后，有内容的字段会出现在静态页上。");
    } catch (error) {
      setNote(error instanceof Error ? error.message : "这份 JSON 不能用");
    }
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
      setNote("已写成 public/portal.html。打开的就是这张静态页。");
      if (popup) popup.location.href = href;
      return;
    }
    if (kind === "preview") {
      setNote("预览的是刚刚保存的稿，还没有覆盖已发布的静态页。");
      if (popup) popup.location.href = `/admin/preview?v=${Date.now()}`;
      return;
    }
    setNote("草稿已写入 content/portal.json。");
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
            <p className="studio-kicker">LZK 门户编排</p>
            <p className="studio-status">{statusLabel(dirty, saved)}</p>
          </div>
          <div className="studio-actions">
            <button className="btn text" type="submit" disabled={busy !== ""}>
              {busy === "save" ? "正在保存" : "保存草稿"}
            </button>
            <button className="btn line" type="button" disabled={busy !== ""} onClick={() => void persist("preview")}>
              {busy === "preview" ? "正在打开" : "预览"}
            </button>
            <button className="btn" type="button" disabled={busy !== ""} onClick={() => void persist("publish")}>
              {busy === "publish" ? "正在发布" : "发布静态页"}
            </button>
          </div>
        </div>
      </header>

      <div className="studio-body">
        <nav className="studio-index" aria-label="稿件目录">
          <a href="#brief">要点</a>
          <a href="#fields">字段</a>
          {doc.sections.map((section, index) => (
            <a key={section.id} href={`#${section.id}`}>
              {String(index + 1).padStart(2, "0")} {SECTION_LABEL[section.type]}
            </a>
          ))}
          <a href="#nav">导航</a>
          <a href="#seo">检索</a>
          <p className="studio-index-note">
            演示稿存在本机，没有登录。
            <a href="/admin/preview" target="_blank" rel="noreferrer">
              预览已保存的稿
            </a>
            <a href="/portal">打开已发布的门户</a>
            <span>上次发布 {formatStamp(saved.publishedAt)}</span>
          </p>
        </nav>

        <main className="studio-sheet">
          <section className="block brief" id="brief">
            <div className="block-head">
              <h1>用要点起草首页</h1>
            </div>
            <p className="studio-lead">
              写下行业、语气或语言。起草只改文案，链接、图号和区块顺序保持不动。字段结构在下一块单独生成。满意后发布，生成
              public/portal.html。
            </p>
            <label className="field" htmlFor="brief-input">
              <span>要点</span>
              <textarea
                id="brief-input"
                rows={4}
                value={brief}
                maxLength={800}
                onChange={(event) => setBrief(event.target.value)}
              />
            </label>
            <div className="brief-row">
              <button className="btn green" type="button" onClick={onDraft} disabled={busy !== ""}>
                按要点起草
              </button>
              <p>试试「改成英文，面向机床转台」。</p>
            </div>
            {note ? (
              <p className="studio-note" role="status">
                {note}
              </p>
            ) : null}
          </section>

          <section className="block" id="fields">
            <div className="block-head">
              <h2>字段结构</h2>
            </div>
            <p className="studio-lead">
              说出要增加的字段。这里会先写出字段 JSON，再按 JSON 给对应区块补上输入框。版式仍是现有的首屏、系列、工况和收尾。
            </p>
            <label className="field" htmlFor="field-brief">
              <span>要增加的字段</span>
              <input
                id="field-brief"
                value={fieldBrief}
                maxLength={200}
                onChange={(event) => setFieldBrief(event.target.value)}
              />
            </label>
            <div className="brief-row">
              <button className="btn green" type="button" onClick={onProposeFields} disabled={busy !== ""}>
                生成字段 JSON
              </button>
              <button className="btn line" type="button" onClick={onApplyFields} disabled={busy !== ""}>
                应用这份 JSON
              </button>
            </div>
            <label className="field" htmlFor="field-json">
              <span>字段 JSON</span>
              <textarea
                id="field-json"
                className="code"
                rows={Math.max(6, doc.fieldSchema.length * 6 || 6)}
                value={fieldJson}
                spellCheck={false}
                onChange={(event) => setFieldJson(event.target.value)}
              />
            </label>
          </section>

          {doc.sections.map((section, index) => (
            <section className="block" id={section.id} key={section.id}>
              <div className="block-head">
                <h2>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {SECTION_LABEL[section.type]}
                </h2>
                <div className="move">
                  <button type="button" onClick={() => moveSection(index, -1)} disabled={index === 0}>
                    上移
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(index, 1)}
                    disabled={index === doc.sections.length - 1}
                  >
                    下移
                  </button>
                </div>
              </div>
              <SectionFields
                section={section}
                fields={doc.fieldSchema.filter((field) => field.scope === section.type)}
                onChange={(recipe) => patchSection(section.id, recipe)}
              />
            </section>
          ))}

          <section className="block" id="nav">
            <div className="block-head">
              <h2>导航</h2>
            </div>
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

          <section className="block" id="seo">
            <div className="block-head">
              <h2>检索标题</h2>
            </div>
            <Field
              label="标题"
              value={doc.seo.title}
              onChange={(title) => setDoc((current) => ({ ...current, seo: { ...current.seo, title } }))}
            />
            <Field
              label="描述"
              value={doc.seo.description}
              rows={3}
              onChange={(description) =>
                setDoc((current) => ({ ...current, seo: { ...current.seo, description } }))
              }
            />
          </section>
        </main>
      </div>
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
          <Field label="眉题" value={section.kicker} onChange={(kicker) => onChange((current) => ({ ...current, kicker }) as Section)} />
          <Field
            label="用途"
            value={section.application}
            onChange={(application) => onChange((current) => ({ ...current, application }) as Section)}
          />
        </div>
        <Field label="标题" value={section.title} onChange={(title) => onChange((current) => ({ ...current, title }) as Section)} />
        <Field label="导语" value={section.lede} rows={4} onChange={(lede) => onChange((current) => ({ ...current, lede }) as Section)} />
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
        <Field label="导语" value={section.lede} rows={3} onChange={(lede) => onChange((current) => ({ ...current, lede }) as Section)} />
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
        <Field label="导语" value={section.lede} rows={3} onChange={(lede) => onChange((current) => ({ ...current, lede }) as Section)} />
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
      <Field label="眉题" value={section.kicker} onChange={(kicker) => onChange((current) => ({ ...current, kicker }) as Section)} />
      <Field label="标题" value={section.title} onChange={(title) => onChange((current) => ({ ...current, title }) as Section)} />
      <Field label="导语" value={section.lede} rows={3} onChange={(lede) => onChange((current) => ({ ...current, lede }) as Section)} />
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
