import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./admin.css";

export const metadata: Metadata = {
  title: "门户编排 | LZK",
  description: "用区块稿起草并发布 LZK 门户静态页。",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="studio-root">{children}</div>;
}
