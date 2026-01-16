# Antigravity + Gemini CLI OAuth Plugin for Opencode (Enhanced Fork)

[English](#english) | [简体中文](#简体中文)

<a name="english"></a>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **This is an enhanced fork** that merges the best features from multiple excellent projects:
>
> | Feature                                                                        | Source                                                                                                    |
> | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
> | Dual Quota System, Multi-Account Rotation, Session Recovery, Thinking Recovery | [NoeFabris/opencode-antigravity-auth](https://github.com/NoeFabris/opencode-antigravity-auth)             |
> | `google_search` Tool (Enhanced with Citations)                                 | [shekohex/opencode-google-antigravity-auth](https://github.com/shekohex/opencode-google-antigravity-auth) |
> | `generate_image` Tool (Native Implementation + Img2Img)                        | Ported from [Antigravity Manager](https://github.com/lbjlaq/Antigravity-Manager) logic                    |
> | `count_tokens` Tool                                                            | Native Implementation                                                                                     |
> | `thoughtSignature` logic (Tool-loop recovery)                                  | [znlsl/Antigravity2Api](https://github.com/znlsl/Antigravity2Api#)                                        |
>
> **Status:** Version 1.3.3 - Added Image-to-Image (Image Variation) support for `generate_image`.

---

Enable Opencode to authenticate against **Antigravity** (Google's IDE) via OAuth so you can use Antigravity rate limits and access models like `gemini-3-pro-high` and `claude-opus-4-5-thinking` with your Google credentials.

## What you get

- **Google OAuth sign-in** with automatic token refresh via `opencode auth login`
- **Dual Quota System** - Access both Antigravity quota (Claude, Gemini 3) and Gemini CLI quota from a single plugin
- **Multi-Account Rotation** - Add multiple Google accounts; automatically rotates when one is rate-limited
- **Real-time SSE streaming** including thinking blocks and incremental output
- **Extended Thinking** - Native support for Claude thinking budgets and Gemini 3 thinking levels
- **Auto Recovery** - Automatic session recovery from Claude tool_result_missing errors
- **Plugin Compatible** - Works alongside other OpenCode plugins (opencodesync, etc.)
- **generate_image Tool** - AI image generation with text-to-image, image-to-image (multi-image fusion), auto-save, and 4K support
- **google_search Tool** - High-quality web search with structural citations and URL analysis.
- **count_tokens Tool** - Count tokens for any text using specified models.

## Installation

### For Humans

**Option A: Let an LLM do it**

Paste this into any LLM agent (Claude Code, OpenCode, Cursor, etc.):

```
Install the opencode-antigravity-auth-remix plugin and add the Antigravity model definitions to ~/.config/opencode/opencode.json by following: https://raw.githubusercontent.com/Darkstarrd-dev/opencode-antigravity-auth/main/README.md
```

**Option B: Manual setup**

1. **Add the plugin to your config** (`~/.config/opencode/opencode.json`):

   ```json
   {
     "plugin": ["opencode-antigravity-auth-remix@1.3.2"]
   }
   ```

2. **Authenticate:**

   ```bash
   opencode auth login
   ```

3. **Add models** - Copy the complete configuration below to your `~/.config/opencode/opencode.json`:

4. **Use it:**

   ```bash
   opencode run "Hello" --model=google/antigravity-claude-sonnet-4-5-thinking-high
   ```

## Available Models

### Antigravity Quota

Models with `antigravity-` prefix use **Antigravity quota** (Claude + Gemini 3):

| # | Model                                       | Variants                       | Description                    |
|---| ------------------------------------------- | ------------------------------ | ------------------------------ |
| 01| `google/antigravity-gemini-3-pro`           | `-low`, `-high`                | Gemini 3 Pro with thinking     |
| 02| `google/antigravity-gemini-3-flash`         | `-minimal`, `-low`, `-medium`, `-high` | Gemini 3 Flash with thinking   |
| 03| `google/antigravity-claude-opus-4-5-thinking`   | `-low`, `-medium`, `-high` | Claude Opus 4.5 with thinking  |
| 04| `google/antigravity-claude-sonnet-4-5-thinking` | `-low`, `-medium`, `-high` | Claude Sonnet 4.5 with thinking|
| 05| `google/antigravity-claude-sonnet-4-5`      | -                              | Claude Sonnet 4.5 (no thinking)|

### Gemini CLI Quota

Models without `antigravity-` prefix use **Gemini CLI quota**:

| # | Model                           | Variants                              | Description                    |
|---| ------------------------------- | ------------------------------------- | ------------------------------ |
| 06| `google/gemini-3-pro-preview`   | `-low`, `-medium`, `-high`            | Gemini 3 Pro (CLI quota)       |
| 07| `google/gemini-3-flash-preview` | `-minimal`, `-low`, `-medium`, `-high`| Gemini 3 Flash (CLI quota)     |
| 08| `google/gemini-2.5-pro`         | -                                     | Gemini 2.5 Pro                 |
| 09| `google/gemini-2.5-flash`       | -                                     | Gemini 2.5 Flash               |
| 10| `google/gemini-2.5-flash-lite`  | -                                     | Gemini 2.5 Flash Lite          |

## Complete Configuration

Copy this to `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-antigravity-auth-remix@1.3.2"],
  "provider": {
    "google": {
      "models": {
        "antigravity-gemini-3-pro": {
          "id": "antigravity-gemini-3-pro",
          "name": "#01 Gemini 3 Pro (Antigravity)",
          "reasoning": true,
          "limit": { "context": 1048576, "output": 65535 },
          "cost": { "input": 0, "output": 0 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "low": { "options": { "thinkingConfig": { "thinkingLevel": "low", "includeThoughts": true } } },
            "high": { "options": { "thinkingConfig": { "thinkingLevel": "high", "includeThoughts": true } } }
          }
        },
        "antigravity-gemini-3-flash": {
          "id": "antigravity-gemini-3-flash",
          "name": "#02 Gemini 3 Flash (Antigravity)",
          "reasoning": true,
          "limit": { "context": 1048576, "output": 65536 },
          "cost": { "input": 0, "output": 0 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "minimal": { "options": { "thinkingConfig": { "thinkingLevel": "minimal", "includeThoughts": true } } },
            "low": { "options": { "thinkingConfig": { "thinkingLevel": "low", "includeThoughts": true } } },
            "medium": { "options": { "thinkingConfig": { "thinkingLevel": "medium", "includeThoughts": true } } },
            "high": { "options": { "thinkingConfig": { "thinkingLevel": "high", "includeThoughts": true } } }
          }
        },
        "antigravity-claude-opus-4-5-thinking": {
          "id": "antigravity-claude-opus-4-5-thinking",
          "name": "#03 Claude Opus 4.5 Thinking (Antigravity)",
          "reasoning": true,
          "limit": { "context": 200000, "output": 64000 },
          "cost": { "input": 0, "output": 0 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "low": { "options": { "thinkingConfig": { "thinkingBudget": 8192, "includeThoughts": true } } },
            "medium": { "options": { "thinkingConfig": { "thinkingBudget": 16384, "includeThoughts": true } } },
            "high": { "options": { "thinkingConfig": { "thinkingBudget": 32768, "includeThoughts": true } } }
          }
        },
        "antigravity-claude-sonnet-4-5-thinking": {
          "id": "antigravity-claude-sonnet-4-5-thinking",
          "name": "#04 Claude Sonnet 4.5 Thinking (Antigravity)",
          "reasoning": true,
          "limit": { "context": 200000, "output": 64000 },
          "cost": { "input": 0, "output": 0 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "low": { "options": { "thinkingConfig": { "thinkingBudget": 8192, "includeThoughts": true } } },
            "medium": { "options": { "thinkingConfig": { "thinkingBudget": 16384, "includeThoughts": true } } },
            "high": { "options": { "thinkingConfig": { "thinkingBudget": 32768, "includeThoughts": true } } }
          }
        },
        "antigravity-claude-sonnet-4-5": {
          "id": "antigravity-claude-sonnet-4-5",
          "name": "#05 Claude Sonnet 4.5 (Antigravity)",
          "reasoning": false,
          "limit": { "context": 200000, "output": 64000 },
          "cost": { "input": 0, "output": 0 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "gemini-3-pro-preview": {
          "id": "gemini-3-pro-preview",
          "name": "#06 Gemini 3 Pro (CLI)",
          "reasoning": true,
          "limit": { "context": 1000000, "output": 64000 },
          "cost": { "input": 0, "output": 0 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "low": { "options": { "thinkingConfig": { "thinkingLevel": "low", "includeThoughts": true } } },
            "medium": { "options": { "thinkingConfig": { "thinkingLevel": "medium", "includeThoughts": true } } },
            "high": { "options": { "thinkingConfig": { "thinkingLevel": "high", "includeThoughts": true } } }
          }
        },
        "gemini-3-flash-preview": {
          "id": "gemini-3-flash-preview",
          "name": "#07 Gemini 3 Flash (CLI)",
          "reasoning": true,
          "limit": { "context": 1048576, "output": 65536 },
          "cost": { "input": 0, "output": 0 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "minimal": { "options": { "thinkingConfig": { "thinkingLevel": "minimal", "includeThoughts": true } } },
            "low": { "options": { "thinkingConfig": { "thinkingLevel": "low", "includeThoughts": true } } },
            "medium": { "options": { "thinkingConfig": { "thinkingLevel": "medium", "includeThoughts": true } } },
            "high": { "options": { "thinkingConfig": { "thinkingLevel": "high", "includeThoughts": true } } }
          }
        },
        "gemini-2.5-pro": {
          "id": "gemini-2.5-pro",
          "name": "#08 Gemini 2.5 Pro (CLI)",
          "reasoning": true,
          "limit": { "context": 1048576, "output": 65536 },
          "cost": { "input": 0, "output": 0 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "gemini-2.5-flash": {
          "id": "gemini-2.5-flash",
          "name": "#09 Gemini 2.5 Flash (CLI)",
          "reasoning": false,
          "limit": { "context": 1048576, "output": 65536 },
          "cost": { "input": 0, "output": 0 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "gemini-2.5-flash-lite": {
          "id": "gemini-2.5-flash-lite",
          "name": "#10 Gemini 2.5 Flash Lite (CLI)",
          "reasoning": false,
          "limit": { "context": 1048576, "output": 65536 },
          "cost": { "input": 0, "output": 0 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        }
      }
    }
  }
}
```

### Usage Examples

```bash
# Antigravity quota models
opencode run "Hello" --model=google/antigravity-claude-sonnet-4-5-thinking-high
opencode run "Hello" --model=google/antigravity-gemini-3-pro-high

# Gemini CLI quota models
opencode run "Hello" --model=google/gemini-3-pro-preview-high
opencode run "Hello" --model=google/gemini-2.5-flash
```

## Built-in Tools

### generate_image

AI image generation with automatic file saving and WebP conversion. Uses `gemini-3-pro-image`.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt` | string | Yes | - | Image description |
| `aspect_ratio` | string | No | "1:1" | Aspect ratio |
| `quality` | string | No | "standard" | Image quality (hd = 4K) |
| `imagePaths` | string[] | No | [] | List of reference image paths for Image-to-Image generation (max 10) |

**Supported aspect ratios:** `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `21:9`

**Features:**
- **Text-to-Image**: Generate images from scratch using prompts
- **Image-to-Image**: Provide reference images for style transfer, editing, or fusion
- **Auto-save**: Saves to `{project}/imgs/` directory
- **WebP**: Generates optimized WebP version (75% quality) alongside original
- **4K Support**: High-definition output via dynamic model configuration

#### Image-to-Image Guide

To use Image-to-Image generation, provide the absolute local paths of your reference images in the `imagePaths` parameter.

**Scenario 1: Style Transfer**
- **Prompt**: "Turn this photo into a cyberpunk style illustration"
- **imagePaths**: `["/path/to/your/photo.jpg"]`

**Scenario 2: Multi-Image Fusion**
- **Prompt**: "Combine the cat from the first image and the dog from the second image playing together in a park"
- **imagePaths**: `["/path/to/cat.jpg", "/path/to/dog.png"]`

**Notes**:
- Paths must be absolute local file system paths.
- Supports JPG, PNG, WebP.
- Maximum 10 reference images.

### google_search

High-quality web search and URL analysis with structural citations.

### count_tokens

Count the number of tokens in a given text string.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `text` | string | Yes | - | The text to count tokens for |
| `model` | string | No | "gemini-2.5-flash" | The model to use for counting |

## License

MIT

---

<a name="简体中文"></a>

# Antigravity + Gemini CLI OAuth Opencode 插件 (增强分支)

[English](#english) | [简体中文](#简体中文)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **这是一个增强分支**，融合了多个优秀项目的核心功能：
>
> | 功能                                                                        | 来源                                                                                                    |
> | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
> | 双配额系统、多账号轮换、会话恢复、思考过程恢复 | [NoeFabris/opencode-antigravity-auth](https://github.com/NoeFabris/opencode-antigravity-auth)             |
> | `google_search` 工具 (支持结构化引用)                                            | [shekohex/opencode-google-antigravity-auth](https://github.com/shekohex/opencode-google-antigravity-auth) |
> | `generate_image` 工具 (原生实现 + 图生图)                                  | 移植自 [Antigravity Manager](https://github.com/lbjlaq/Antigravity-Manager) 逻辑                                                                    |
> | `count_tokens` 工具                                                            | 原生实现                                                                                     |
> | `thoughtSignature` 逻辑 (工具调用签名恢复)                                  | [znlsl/Antigravity2Api](https://github.com/znlsl/Antigravity2Api#)                                        |
>
> **状态:** 版本 1.3.1 - 为 `generate_image` 新增了图生图 (Image-to-Image/Image Variation) 支持。

---

使 Opencode 能够通过 OAuth 验证 **Antigravity** (Google 的 IDE)，从而让你可以使用 Google 凭据访问 Antigravity 配额并使用 `gemini-3-pro-high` 和 `claude-opus-4-5-thinking` 等模型。

## 核心功能

- **Google OAuth 登录** - 通过 `opencode auth login` 自动刷新令牌
- **双配额系统** - 单个插件即可访问 Antigravity 配额 (Claude, Gemini 3) 和 Gemini CLI 配额
- **多账号轮换** - 支持添加多个 Google 账号；当某个账号触发频率限制时自动切换
- **实时 SSE 流式传输** - 包括思考块 (Thinking blocks) 和增量输出
- **扩展思考能力** - 原生支持 Claude 思考预算和 Gemini 3 思考等级
- **自动恢复** - 自动处理 Claude 的 `tool_result_missing` 错误并恢复会话
- **插件兼容性** - 可与其他 OpenCode 插件 (如 opencodesync 等) 同时运行
- **generate_image 工具** - AI 图像生成，支持文生图、图生图 (多图融合)、自动保存、WebP 转换和 4K 输出
- **google_search 工具** - 高质量网页搜索，支持结构化引用和 URL 分析。
- **count_tokens 工具** - 统计指定文本在特定模型下的 Token 消耗。

## 安装步骤

### 智能助手安装 (推荐)

将以下指令发送给任何 LLM 助手 (Claude Code, OpenCode, Cursor 等):

```
参考 https://raw.githubusercontent.com/Darkstarrd-dev/opencode-antigravity-auth/main/README.md 安装 opencode-antigravity-auth-remix 插件，并将 Antigravity 模型定义添加到 ~/.config/opencode/opencode.json。
```

### 手动安装

1. **在配置中添加插件** (`~/.config/opencode/opencode.json`):

   ```json
   {
     "plugin": ["opencode-antigravity-auth-remix@1.3.2"]
   }
   ```

2. **身份验证:**

   ```bash
   opencode auth login
   ```

3. **添加模型定义** - 将下方的完整配置复制到你的 `~/.config/opencode/opencode.json`。

4. **开始使用:**

   ```bash
   opencode run "你好" --model=google/antigravity-claude-sonnet-4-5-thinking-high
   ```

## 可用模型

### Antigravity 配额 (Antigravity Quota)

带有 `antigravity-` 前缀的模型使用 **Antigravity 配额** (包含 Claude 和 Gemini 3):

| # | 模型                                       | 变体 (Variants)                       | 描述                    |
|---| ------------------------------------------- | ------------------------------ | ------------------------------ |
| 01| `google/antigravity-gemini-3-pro`           | `-low`, `-high`                | Gemini 3 Pro (带思考过程)     |
| 02| `google/antigravity-gemini-3-flash`         | `-minimal`, `-low`, `-medium`, `-high` | Gemini 3 Flash (带思考过程)   |
| 03| `google/antigravity-claude-opus-4-5-thinking`   | `-low`, `-medium`, `-high` | Claude Opus 4.5 (带思考预算)  |
| 04| `google/antigravity-claude-sonnet-4-5-thinking` | `-low`, `-medium`, `-high` | Claude Sonnet 4.5 (带思考预算)|
| 05| `google/antigravity-claude-sonnet-4-5`      | -                              | Claude Sonnet 4.5 (普通模式)|

### Gemini CLI 配额 (Gemini CLI Quota)

不带 `antigravity-` 前缀的模型使用 **Gemini CLI 配额**:

| # | 模型                           | 变体 (Variants)                              | 描述                    |
|---| ------------------------------- | ------------------------------------- | ------------------------------ |
| 06| `google/gemini-3-pro-preview`   | `-low`, `-medium`, `-high`            | Gemini 3 Pro (CLI 配额)       |
| 07| `google/gemini-3-flash-preview` | `-minimal`, `-low`, `-medium`, `-high`| Gemini 3 Flash (CLI 配额)     |
| 08| `google/gemini-2.5-pro`         | -                                     | Gemini 2.5 Pro                 |
| 09| `google/gemini-2.5-flash`       | -                                     | Gemini 2.5 Flash               |
| 10| `google/gemini-2.5-flash-lite`  | -                                     | Gemini 2.5 Flash Lite          |

## 完整配置示例

将以下内容复制到 `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-antigravity-auth-remix@1.3.2"],
  "provider": {
    "google": {
      "models": {
        "antigravity-gemini-3-pro": {
          "id": "antigravity-gemini-3-pro",
          "name": "#01 Gemini 3 Pro (Antigravity)",
          "reasoning": true,
          "limit": { "context": 1048576, "output": 65535 },
          "cost": { "input": 0, "output": 0 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "low": { "options": { "thinkingConfig": { "thinkingLevel": "low", "includeThoughts": true } } },
            "high": { "options": { "thinkingConfig": { "thinkingLevel": "high", "includeThoughts": true } } }
          }
        },
        "antigravity-gemini-3-flash": {
          "id": "antigravity-gemini-3-flash",
          "name": "#02 Gemini 3 Flash (Antigravity)",
          "reasoning": true,
          "limit": { "context": 1048576, "output": 65536 },
          "cost": { "input": 0, "output": 0 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "minimal": { "options": { "thinkingConfig": { "thinkingLevel": "minimal", "includeThoughts": true } } },
            "low": { "options": { "thinkingConfig": { "thinkingLevel": "low", "includeThoughts": true } } },
            "medium": { "options": { "thinkingConfig": { "thinkingLevel": "medium", "includeThoughts": true } } },
            "high": { "options": { "thinkingConfig": { "thinkingLevel": "high", "includeThoughts": true } } }
          }
        },
        "antigravity-claude-opus-4-5-thinking": {
          "id": "antigravity-claude-opus-4-5-thinking",
          "name": "#03 Claude Opus 4.5 Thinking (Antigravity)",
          "reasoning": true,
          "limit": { "context": 200000, "output": 64000 },
          "cost": { "input": 0, "output": 0 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "low": { "options": { "thinkingConfig": { "thinkingBudget": 8192, "includeThoughts": true } } },
            "medium": { "options": { "thinkingConfig": { "thinkingBudget": 16384, "includeThoughts": true } } },
            "high": { "options": { "thinkingConfig": { "thinkingBudget": 32768, "includeThoughts": true } } }
          }
        },
        "antigravity-claude-sonnet-4-5-thinking": {
          "id": "antigravity-claude-sonnet-4-5-thinking",
          "name": "#04 Claude Sonnet 4.5 Thinking (Antigravity)",
          "reasoning": true,
          "limit": { "context": 200000, "output": 64000 },
          "cost": { "input": 0, "output": 0 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "low": { "options": { "thinkingConfig": { "thinkingBudget": 8192, "includeThoughts": true } } },
            "medium": { "options": { "thinkingConfig": { "thinkingBudget": 16384, "includeThoughts": true } } },
            "high": { "options": { "thinkingConfig": { "thinkingBudget": 32768, "includeThoughts": true } } }
          }
        },
        "antigravity-claude-sonnet-4-5": {
          "id": "antigravity-claude-sonnet-4-5",
          "name": "#05 Claude Sonnet 4.5 (Antigravity)",
          "reasoning": false,
          "limit": { "context": 200000, "output": 64000 },
          "cost": { "input": 0, "output": 0 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "gemini-3-pro-preview": {
          "id": "gemini-3-pro-preview",
          "name": "#06 Gemini 3 Pro (CLI)",
          "reasoning": true,
          "limit": { "context": 1000000, "output": 64000 },
          "cost": { "input": 0, "output": 0 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "low": { "options": { "thinkingConfig": { "thinkingLevel": "low", "includeThoughts": true } } },
            "medium": { "options": { "thinkingConfig": { "thinkingLevel": "medium", "includeThoughts": true } } },
            "high": { "options": { "thinkingConfig": { "thinkingLevel": "high", "includeThoughts": true } } }
          }
        },
        "gemini-3-flash-preview": {
          "id": "gemini-3-flash-preview",
          "name": "#07 Gemini 3 Flash (CLI)",
          "reasoning": true,
          "limit": { "context": 1048576, "output": 65536 },
          "cost": { "input": 0, "output": 0 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] },
          "variants": {
            "minimal": { "options": { "thinkingConfig": { "thinkingLevel": "minimal", "includeThoughts": true } } },
            "low": { "options": { "thinkingConfig": { "thinkingLevel": "low", "includeThoughts": true } } },
            "medium": { "options": { "thinkingConfig": { "thinkingLevel": "medium", "includeThoughts": true } } },
            "high": { "options": { "thinkingConfig": { "thinkingLevel": "high", "includeThoughts": true } } }
          }
        },
        "gemini-2.5-pro": {
          "id": "gemini-2.5-pro",
          "name": "#08 Gemini 2.5 Pro (CLI)",
          "reasoning": true,
          "limit": { "context": 1048576, "output": 65536 },
          "cost": { "input": 0, "output": 0 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "gemini-2.5-flash": {
          "id": "gemini-2.5-flash",
          "name": "#09 Gemini 2.5 Flash (CLI)",
          "reasoning": false,
          "limit": { "context": 1048576, "output": 65536 },
          "cost": { "input": 0, "output": 0 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "gemini-2.5-flash-lite": {
          "id": "gemini-2.5-flash-lite",
          "name": "#10 Gemini 2.5 Flash Lite (CLI)",
          "reasoning": false,
          "limit": { "context": 1048576, "output": 65536 },
          "cost": { "input": 0, "output": 0 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        }
      }
    }
  }
}
```

## 使用示例

```bash
# 使用 Antigravity 配额模型
opencode run "你好" --model=google/antigravity-claude-sonnet-4-5-thinking-high
opencode run "你好" --model=google/antigravity-gemini-3-pro-high

# 使用 Gemini CLI 配额模型
opencode run "你好" --model=google/gemini-3-pro-preview-high
opencode run "你好" --model=google/gemini-2.5-flash
```

## 内置工具

### generate_image (生图工具)

基于 `gemini-3-pro-image` 实现的 AI 图像生成工具，支持自动保存和 WebP 格式转换。

| 参数 | 类型 | 是否必填 | 默认值 | 描述 |
|-----------|------|----------|---------|-------------|
| `prompt` | string | 是 | - | 图像描述词 |
| `aspect_ratio` | string | 否 | "1:1" | 纵横比 |
| `quality` | string | 否 | "standard" | 图像质量 (hd = 4K) |
| `imagePaths` | string[] | 否 | [] | 图生图参考图片路径列表 (最多10张) |

**支持的纵横比:** `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `21:9`

**主要特性:**
- **文生图**: 通过提示词生成图片
- **图生图**: 提供参考图片进行风格迁移、编辑或融合
- **自动保存**: 保存至项目目录下的 `{project}/imgs/`
- **WebP**: 同时生成 WebP 版本 (75% 质量) 以节省空间
- **高清支持**: 支持动态配置 4K (HD) 高清输出

#### 图生图 (Image-to-Image) 使用指南

要使用图生图功能，只需在调用工具时通过 `imagePaths` 参数提供参考图片的本地绝对路径。

**示例场景 1：风格迁移**
- **Prompt**: "Turn this photo into a cyberpunk style illustration"
- **imagePaths**: `["/path/to/your/photo.jpg"]`

**示例场景 2：多图融合**
- **Prompt**: "Combine the cat from the first image and the dog from the second image playing together in a park"
- **imagePaths**: `["/path/to/cat.jpg", "/path/to/dog.png"]`

**注意**:
- 图片路径必须是本地文件系统的绝对路径。
- 支持 JPG, PNG, WebP 格式。
- 最多支持 10 张参考图片。

### google_search (搜索工具)

高质量网页搜索和 URL 分析，支持结构化引用来源。

### count_tokens (Token 统计工具)

统计指定文本在特定模型下的 Token 消耗。

| 参数 | 类型 | 是否必填 | 默认值 | 描述 |
|-----------|------|----------|---------|-------------|
| `text` | string | 是 | - | 需要统计的文本 |
| `model` | string | 否 | "gemini-2.5-flash" | 统计所使用的模型 |

## 开源协议

MIT
