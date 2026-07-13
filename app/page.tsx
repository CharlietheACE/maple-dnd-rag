import type { Metadata } from "next";
import { ChatExperience } from "./chat-experience";

export const metadata: Metadata = {
  title: "提问 · 艾尔达百科",
  description: "从《艾尔达之书》的检索证据中寻找答案，并逐条核验引用来源。",
};

export default function Home() {
  return <ChatExperience />;
}
