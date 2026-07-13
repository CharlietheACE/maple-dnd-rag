# Erda Encyclopedia

Erda Book 的检索增强问答站点。当前 foundation 只提供 Sites/vinext 脚手架、共享契约、服务端环境校验、mock Retriever 与基础测试；真实检索、最终界面、评测和部署由后续 workstream 完成。

## Local validation

复制 `.env.example` 为 `.env.local` 并仅在服务端填入 `OPENAI_API_KEY` 与 `OPENAI_VECTOR_STORE_ID`。运行 `npm run check` 完成类型检查、单元测试和生产构建。
