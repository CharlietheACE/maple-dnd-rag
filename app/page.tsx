import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Erda Encyclopedia",
  description: "基于 Erda Book 证据回答问题的知识应用。",
};

export default function Home() {
  return <main><h1>Erda Encyclopedia</h1><p>站点基础已就绪，界面由 site-ui workstream 实现。</p></main>;
}
