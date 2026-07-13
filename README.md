# Erda Encyclopedia

Erda Book 的检索增强问答站点。生产路径使用阿里云百炼兼容接口：离线生成
server-only DashScope embedding 索引，请求时本地余弦检索，再由 `qwen-plus` 严格依据
检索证据生成带来源回答。UI、Retriever 与 NDJSON 契约保持 provider-neutral。

## Local validation

复制 `.env.example` 为 `.env.local` 并仅在可信服务端环境填入 `DASHSCOPE_*` 配置。
先运行 `npm run dashscope:index:dry-run` 检查 40 篇文档的分块计划；真实生成索引使用
`npm run dashscope:index`。运行 `npm run check` 完成类型检查、单元测试、生产构建与
客户端索引泄漏检查。
