# Project Reference Summary

本文件总结了开发 `opencode-antigravity-auth-remix` 时参考的三个项目及关键逻辑基准，供后续维护和功能扩展参考。

## 1. 参考项目 1: opencode-antigravity-auth-1.2.8 (核心基底)
*   **核心优势**: 拥有最完善的 `AccountManager` 系统。
*   **技术要点**:
    *   **双账号/多账号轮询**: 支持 `AccountManager` 实例，能够自动处理多个 Google 账号的额度切换。
    *   **认证健壮性**: 实现了详细的 `Rate Limit Backoff`（速率限制退避）和会话恢复逻辑。
    *   **代码结构**: 定义了标准的插件接口 (`PluginResult`, `GetAuth`)，是本次 Remix 项目的架构基础。

## 2. 参考项目 2: opencode-google-antigravity-auth-0.2.12 (搜索工具)
*   **核心优势**: 实现了 `google_search` 和 `url_context` 工具。
*   **技术要点**:
    *   **工具接口**: 通过 `v1internal:generateContent` 调用 `gemini-2.0-flash-exp` 模型。
    *   **Session 管理**: 引入了 `AGENT_SESSION_ID` 概念，通过 URL 匹配提取 `sessionId` 以保持搜索上下文。
    *   **搜索增强**: 系统提示词 (`SEARCH_SYSTEM_INSTRUCTION`) 规定了搜索结果的格式化要求。

## 3. 参考项目 3: opencode-antigravity-auth (早期生图尝试)
*   **核心优势**: 引入了 `image_generation` 工具和 `sharp` 图像库。
*   **教训总结**:
    *   该项目早期在 Production 环境遇到 404，主要由于 User-Agent 版本较低以及端点映射不准确导致。
    *   证明了在 Opencode 环境下自动保存图片到 `imgs/` 目录并生成 `list.md` 索引的可行性。

## 4. 关键基准: Antigravity-Manager-3.3.17 (4K 逻辑真相)
*   **核心贡献**: 解决了 4K 高清生图的调用难题。
*   **技术内幕 (CRITICAL)**:
    *   **模型 ID 陷阱**: 客户端展示的模型 ID（如 `gemini-3-pro-image-16x9-4k`）仅为内部约定。**发送给 Google API 的模型 ID 必须始终是基础名 `gemini-3-pro-image`**。
    *   **Payload 构造**: 分辨率和画质必须放在 `generationConfig.imageConfig` 中，例如 `{ imageSize: "4K", aspectRatio: "16:9" }`。
    *   **环境策略**: 4K 生成目前在 **Production 端点** (`cloudcode-pa.googleapis.com`) 支持最稳，且必须配合最新版本的 **User-Agent** (`1.11.9`)。
    *   **回退逻辑**: 实现了 `[PROD -> DAILY -> AUTOPUSH]` 的 Fallback 机制，并将 **403 (License/Permission)** 纳入重试范围，以应对环境权限的不对称。

---
*Generated on 2026-01-08 for opencode-antigravity-auth-remix-1.0.0*
