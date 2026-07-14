"use client";

import { FormEvent, KeyboardEvent, useRef, useState } from "react";
import type { ChatErrorCode, ChatStreamEvent, RetrievedSource } from "@/src/contracts/rag";
import { buildChatHistory } from "./chat-history";
import { parseChatStream } from "./ndjson";

type PublicSource = Omit<RetrievedSource, "text">;
type Exchange = {
  id: number;
  question: string;
  answer: string;
  sources: PublicSource[];
  status: "streaming" | "done" | "error";
  error?: { code: ChatErrorCode | "NETWORK_ERROR"; message: string };
};

const EXAMPLES = [
  "枫叶山丘有哪些值得留意的地点？",
  "请介绍艾尔达世界的创世传说。",
  "冒险者第一次远行前需要知道什么？",
];

const ERROR_COPY: Record<ChatErrorCode | "NETWORK_ERROR", { title: string; detail: string }> = {
  BAD_REQUEST: { title: "这个问题暂时无法提交", detail: "请检查内容，并将问题控制在 2,000 字以内。" },
  NOT_CONFIGURED: { title: "百科尚未完成配置", detail: "服务端知识库尚未连接，请稍后再来。" },
  NO_EVIDENCE: { title: "《艾尔达之书》没有给出足够依据", detail: "可以换一个说法，或把问题缩小到具体人物、地点或事件。" },
  RATE_LIMITED: { title: "提问的人有点多", detail: "请求已受到限流，请稍等片刻再试。" },
  UPSTREAM_TIMEOUT: { title: "查阅用时过长", detail: "知识检索超时了，请重试一次。" },
  UPSTREAM_ERROR: { title: "知识服务暂时失联", detail: "上游服务出现异常，你的问题没有丢失，可以稍后重试。" },
  NETWORK_ERROR: { title: "无法连接到百科", detail: "请检查网络后重试。" },
};

function sourceLabel(path: string) {
  return path.split(/[\\/]/).filter(Boolean).at(-1)?.replace(/\.md$/i, "") ?? path;
}

export function ChatExperience() {
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextId = useRef(1);
  const pending = useRef(false);

  const updateExchange = (id: number, update: (item: Exchange) => Exchange) => {
    setExchanges((items) => items.map((item) => (item.id === id ? update(item) : item)));
  };

  const ask = async (rawQuestion: string) => {
    const text = rawQuestion.trim();
    if (!text || pending.current) return;
    pending.current = true;
    const id = nextId.current++;
    const history = buildChatHistory(exchanges);

    setQuestion("");
    setIsSubmitting(true);
    setExchanges((items) => [...items, { id, question: text, answer: "", sources: [], status: "streaming" }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
        body: JSON.stringify({ question: text, history }),
      });
      if (!response.body) throw new Error(`HTTP ${response.status}`);

      let receivedEvent = false;
      for await (const event of parseChatStream(response.body)) {
        receivedEvent = true;
        updateExchange(id, (item) => applyEvent(item, event));
      }
      if (!response.ok && !receivedEvent) {
        const code = response.status === 429 ? "RATE_LIMITED" : response.status === 504 ? "UPSTREAM_TIMEOUT" : "UPSTREAM_ERROR";
        updateExchange(id, (item) => ({ ...item, status: "error", error: { code, message: ERROR_COPY[code].title } }));
        return;
      }
      updateExchange(id, (item) => item.status === "streaming" ? { ...item, status: "done" } : item);
    } catch {
      updateExchange(id, (item) => ({
        ...item,
        status: "error",
        error: { code: "NETWORK_ERROR", message: ERROR_COPY.NETWORK_ERROR.title },
      }));
    } finally {
      pending.current = false;
      setIsSubmitting(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void ask(question);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const latest = exchanges.at(-1);
  return (
    <main className="app-shell">
      <header className="site-header" aria-label="站点标题">
        <a className="brand" href="#top" aria-label="艾尔达百科首页">
          <span className="brand-mark" aria-hidden="true">E</span>
          <span><strong>艾尔达百科</strong><small>ERDA ENCYCLOPEDIA</small></span>
        </a>
        <div className="source-policy"><span aria-hidden="true" />唯一知识来源 ·《艾尔达之书》</div>
      </header>

      <section className="hero" id="top">
        <p className="eyebrow">THE ARCHIVE OF ERDA · 艾尔达档案馆</p>
        <h1>循着篇章，<br /><em>寻找答案。</em></h1>
        <p className="lede">这里不会借用传闻补全空白。每一则回答都从《艾尔达之书》中检索，并附上可以核验的来源。</p>

        <form className="ask-box" onSubmit={onSubmit} aria-label="向艾尔达百科提问">
          <label htmlFor="question">你想从艾尔达世界了解什么？</label>
          <textarea
            id="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={onKeyDown}
            maxLength={2000}
            rows={3}
            placeholder="例如：枫叶山丘流传着怎样的故事？"
            disabled={isSubmitting}
          />
          <div className="ask-actions">
            <span>{question.length.toLocaleString("zh-CN")} / 2,000 · Shift + Enter 换行</span>
            <button type="submit" disabled={isSubmitting || !question.trim()}>
              {isSubmitting ? "正在查阅" : "查阅百科"}<span aria-hidden="true">→</span>
            </button>
          </div>
        </form>

        {exchanges.length === 0 && (
          <div className="examples" aria-labelledby="examples-title">
            <p id="examples-title">从这些问题开始</p>
            <div>{EXAMPLES.map((example, index) => (
              <button key={example} type="button" onClick={() => void ask(example)} disabled={isSubmitting}>
                <span>0{index + 1}</span>{example}
              </button>
            ))}</div>
          </div>
        )}
      </section>

      {exchanges.length > 0 && (
        <section className="conversation" aria-label="问答记录" aria-live="polite">
          {exchanges.map((exchange) => <ExchangeCard key={exchange.id} exchange={exchange} onRetry={() => void ask(exchange.question)} />)}
          {latest?.status !== "streaming" && (
            <button className="new-question" type="button" onClick={() => document.getElementById("question")?.focus()}>继续提问 ↑</button>
          )}
        </section>
      )}

      <footer><span>ERDA BOOK · GROUNDED KNOWLEDGE</span><p>答案仅依据检索到的原文证据生成。若证据不足，百科会明确说明。</p></footer>
    </main>
  );
}

function applyEvent(item: Exchange, event: ChatStreamEvent): Exchange {
  switch (event.type) {
    case "answer.delta": return { ...item, answer: item.answer + event.delta };
    case "sources": return { ...item, sources: event.sources };
    case "answer.done": return { ...item, status: "done" };
    case "error": return { ...item, status: "error", error: { code: event.code, message: event.message } };
  }
}

function ExchangeCard({ exchange, onRetry }: { exchange: Exchange; onRetry: () => void }) {
  const error = exchange.error ? ERROR_COPY[exchange.error.code] : null;
  return (
    <article className="exchange">
      <div className="question-line"><span>你的提问</span><h2>{exchange.question}</h2></div>
      <div className="answer-panel">
        <div className="answer-heading"><span className="answer-sigil" aria-hidden="true">✦</span><div><strong>百科答复</strong><small>基于检索证据</small></div></div>
        {exchange.status === "streaming" && !exchange.answer && <div className="reading"><span /><span /><span />正在翻阅《艾尔达之书》…</div>}
        {exchange.answer && <div className="answer-copy">{exchange.answer}</div>}
        {error && (
          <div className="error-state" role="alert">
            <strong>{error.title}</strong><p>{error.detail}</p>
            {exchange.error?.message && exchange.error.message !== error.title && <small>{exchange.error.message}</small>}
            <button type="button" onClick={onRetry}>重新查阅</button>
          </div>
        )}
        {exchange.status === "done" && !exchange.answer && !exchange.error && (
          <div className="error-state" role="status"><strong>这次没有生成答复</strong><p>请换一种说法后重试。</p></div>
        )}
      </div>
      {exchange.sources.length > 0 && (
        <div className="sources" aria-label="引用来源">
          <div className="sources-heading"><h3>引用来源</h3><span>{exchange.sources.length} 篇原始文档</span></div>
          <div className="source-grid">{exchange.sources.map((source, index) => (
            <article className="source-card" key={source.id}>
              <span className="source-number">{String(index + 1).padStart(2, "0")}</span>
              <div><p>{source.category}</p><h4>{source.title || sourceLabel(source.path)}</h4><code>{source.path}</code></div>
              {source.score !== null && <span className="score" aria-label={`相关度 ${Math.round(source.score * 100)}%`}>{Math.round(source.score * 100)}%</span>}
            </article>
          ))}</div>
        </div>
      )}
    </article>
  );
}
