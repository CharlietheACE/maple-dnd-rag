"use client";

import { useRef, useState } from "react";
import { SAME_ORIGIN_SYNC_HEADER } from "@/src/rag/runtime-sync";

type BatchResult = { status: string; added?: number; replaced?: number; skipped?: number; processed?: number; nextCursor?: number; done?: boolean; total?: number; code?: string };
type Totals = { added: number; replaced: number; skipped: number; processed: number };

const initialTotals: Totals = { added: 0, replaced: 0, skipped: 0, processed: 0 };

async function requestBatch(cursor: number): Promise<BatchResult> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch("/api/admin/rag-sync", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-Erda-Sync": SAME_ORIGIN_SYNC_HEADER },
      body: JSON.stringify({ cursor }),
    });
    const result = await response.json() as BatchResult;
    if (response.ok) return result;
    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 1_000 * 2 ** attempt));
      continue;
    }
    throw new Error(result.code || result.status || `http_${response.status}`);
  }
  throw new Error("retry_exhausted");
}

export default function RagSyncAdminPage() {
  const [running, setRunning] = useState(false);
  const [totals, setTotals] = useState(initialTotals);
  const [cursor, setCursor] = useState(0);
  const [message, setMessage] = useState("尚未开始。此工具每次只处理一篇文档。");
  const stopped = useRef(false);

  const start = async () => {
    stopped.current = false;
    setRunning(true);
    setTotals(initialTotals);
    setCursor(0);
    setMessage("正在同步……");
    let nextCursor = 0;
    let aggregate = { ...initialTotals };
    try {
      while (!stopped.current) {
        const result = await requestBatch(nextCursor);
        aggregate = {
          added: aggregate.added + (result.added || 0),
          replaced: aggregate.replaced + (result.replaced || 0),
          skipped: aggregate.skipped + (result.skipped || 0),
          processed: aggregate.processed + (result.processed || 0),
        };
        setTotals(aggregate);
        nextCursor = result.nextCursor ?? nextCursor;
        setCursor(nextCursor);
        setMessage(`已处理 ${nextCursor} / ${result.total ?? 40}`);
        if (result.done) { setMessage(`同步完成：已处理 ${nextCursor} 篇。`); break; }
      }
      if (stopped.current) setMessage(`已在游标 ${nextCursor} 停止。`);
    } catch (error) {
      setMessage(`同步失败：${error instanceof Error ? error.message : "unknown_error"}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", padding: "clamp(24px, 6vw, 72px)", background: "#111c2b", color: "#f4ead5", fontFamily: "system-ui, sans-serif" }}>
      <section style={{ maxWidth: 760, margin: "0 auto", border: "1px solid #42566d", borderRadius: 20, padding: "clamp(24px, 5vw, 48px)", background: "#17263a" }}>
        <p style={{ color: "#7fd0c4", letterSpacing: ".12em", textTransform: "uppercase" }}>Temporary private operation</p>
        <h1 style={{ fontSize: "clamp(32px, 6vw, 56px)", margin: "12px 0" }}>艾尔达语料一次性同步</h1>
        <p style={{ lineHeight: 1.7, color: "#c9d3db" }}>仅在当前私有站点的已登录同源页面运行。每次请求处理一篇文档，页面会自动推进游标直到 40 篇完成。</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, margin: "28px 0" }}>
          {Object.entries({ 新增: totals.added, 替换: totals.replaced, 跳过: totals.skipped, 已处理: totals.processed }).map(([label, value]) => (
            <div key={label} style={{ borderRadius: 12, padding: 18, background: "#0e1927" }}><small style={{ color: "#94a7b9" }}>{label}</small><strong style={{ display: "block", fontSize: 30 }}>{value}</strong></div>
          ))}
        </div>
        <p role="status" aria-live="polite" style={{ minHeight: 28 }}>游标 {cursor} · {message}</p>
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button type="button" disabled={running} onClick={() => void start()} style={{ border: 0, borderRadius: 999, padding: "14px 24px", background: "#7fd0c4", color: "#0e1927", fontWeight: 700, cursor: running ? "not-allowed" : "pointer" }}>{running ? "同步中…" : "开始同步"}</button>
          <button type="button" disabled={!running} onClick={() => { stopped.current = true; }} style={{ border: "1px solid #64788c", borderRadius: 999, padding: "14px 24px", background: "transparent", color: "#f4ead5", cursor: running ? "pointer" : "not-allowed" }}>处理完当前篇后停止</button>
        </div>
      </section>
    </main>
  );
}
