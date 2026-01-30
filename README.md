# Antigravity + Gemini CLI OAuth Plugin for Opencode (Enhanced Fork)

[English](#english) | [简体中文](#简体中文)

<a name="english"></a>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **This is an enhanced fork** based on the excellent work of **NoeFabris**:
>
> | Feature                                                                        | Source                                                                                                    |
> | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
> | Dual Quota System, Multi-Account Rotation, Session Recovery, Thinking Recovery | [NoeFabris/opencode-antigravity-auth](https://github.com/NoeFabris/opencode-antigravity-auth)             |
> | `generate_image` Tool (Native Implementation + Img2Img)                        | Native Implementation                                                                                     |
>
> **Status:** Version 1.4.2 - Aligned endpoint headers and metadata with reference implementation.

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

<details open>
<summary><b>⚠️ Terms of Service Warning — Read Before Installing</b></summary>

> [!CAUTION]
> Using this plugin may violate Google's Terms of Service. A small number of users have reported their Google accounts being **banned** or **shadow-banned** (restricted access without explicit notification).
>
> **High-risk scenarios:**
> - 🚨 **Fresh Google accounts** have a very high chance of getting banned
> - 🚨 **New accounts with Pro/Ultra subscriptions** are frequently flagged and banned
>
> **By using this plugin, you acknowledge:**
> - This is an unofficial tool not endorsed by Google
> - Your account may be suspended or permanently banned
> - You assume all risks associated with using this plugin
>
> **Recommendation:** Use an established Google account that you don't rely on for critical services. Avoid creating new accounts specifically for this plugin.

</details>

---

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
     "plugin": ["opencode-antigravity-auth-remix@1.4.2"]
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
   "plugin": ["opencode-antigravity-auth-remix@1.4.2"],
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
| `reference_images` | string[] | No | [] | List of reference image paths for Image-to-Image generation (max 10) |

**Supported aspect ratios:** `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `21:9`

**Features:**
- **Text-to-Image**: Generate images from scratch using prompts
- **Image-to-Image**: Provide reference images for style transfer, editing, or fusion
- **Auto-save**: Saves to `{project}/imgs/` directory
- **WebP**: Generates optimized WebP version (75% quality) alongside original
- **4K Support**: High-definition output via dynamic model configuration

#### Image-to-Image Guide

To use Image-to-Image generation, provide the absolute local paths of your reference images in the `reference_images` parameter.

**Scenario 1: Style Transfer**
- **Prompt**: "Turn this photo into a cyberpunk style illustration"
- **reference_images**: `["/path/to/your/photo.jpg"]`

**Scenario 2: Multi-Image Fusion**
- **Prompt**: "Combine the cat from the first image and the dog from the second image playing together in a park"
- **reference_images**: `["/path/to/cat.jpg", "/path/to/dog.png"]`

**Notes**:
- Paths must be absolute local file system paths.
- Supports JPG, PNG, WebP.
- Maximum 10 reference images.

**Account management options (via `opencode auth login`):**
- **Check quotas** — View remaining API quota for each account
- **Manage accounts** — Enable/disable specific accounts for rotation

For details on load balancing, dual quota pools, and account storage, see [docs/MULTI-ACCOUNT.md](docs/MULTI-ACCOUNT.md).

## License

MIT

---

<a name="简体中文"></a>

# Antigravity + Gemini CLI OAuth Opencode 插件 (增强分支)

[English](#english) | [简体中文](#简体中文)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **这是一个增强分支**，完全基于 **NoeFabris** 的优秀项目：
>
> | 功能                                                                        | 来源                                                                                                    |
> | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
> | 双配额系统、多账号轮换、会话恢复、思考过程恢复 | [NoeFabris/opencode-antigravity-auth](https://github.com/NoeFabris/opencode-antigravity-auth)             |
> | `generate_image` 工具 (原生实现 + 图生图)                                  | 原生实现                                                                                     |
>
> **状态:** 版本 1.4.2 - 对齐了端点请求头和元数据实现。

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
     "plugin": ["opencode-antigravity-auth-remix@1.4.2"]
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
   "plugin": ["opencode-antigravity-auth-remix@1.4.2"],
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

### Gemini 3 Models 400 Error ("Unknown name 'parameters'")

**Error:**
```
Invalid JSON payload received. Unknown name "parameters" at 'request.tools[0]'
```

**Causes:**
- Tool schema incompatibility with Gemini's strict protobuf validation
- MCP servers with malformed schemas
- Plugin version regression

**Solutions:**
1. **Update to latest beta:**
   ```json
   { "plugin": ["opencode-antigravity-auth@beta"] }
   ```

2. **Disable MCP servers** one-by-one to find the problematic one

3. **Add npm override:**
   ```json
   { "provider": { "google": { "npm": "@ai-sdk/google" } } }
   ```

---

### MCP Servers Causing Errors

Some MCP servers have schemas incompatible with Antigravity's strict JSON format.

**Common symptom:**
```bash
Invalid function name must start with a letter or underscore
```

Sometimes it shows up as:
```bash
GenerateContentRequest.tools[0].function_declarations[12].name: Invalid function name must start with a letter or underscore
```

This usually means an MCP tool name starts with a number (for example, a 1mcp key like `1mcp_*`). Rename the MCP key to start with a letter (e.g., `gw`) or disable that MCP entry for Antigravity models.

**Diagnosis:**
1. Disable all MCP servers in your config
2. Enable one-by-one until error reappears
3. Report the specific MCP in a [GitHub issue](https://github.com/NoeFabris/opencode-antigravity-auth/issues)

---

### "All Accounts Rate-Limited" (But Quota Available)

**Cause:** Cascade bug in `clearExpiredRateLimits()` in hybrid mode (fixed in recent beta).

**Solutions:**
1. Update to latest beta version
2. If persists, delete accounts file and re-authenticate
3. Try switching `account_selection_strategy` to `"sticky"` in `antigravity.json`

---

### Session Recovery

If you encounter errors during a session:
1. Type `continue` to trigger the recovery mechanism
2. If blocked, use `/undo` to revert to pre-error state
3. Retry the operation

---

### Using with Oh-My-OpenCode

**Important:** Disable the built-in Google auth to prevent conflicts:

```json
// ~/.config/opencode/oh-my-opencode.json
{
  "google_auth": false,
  "agents": {
    "frontend-ui-ux-engineer": { "model": "google/antigravity-gemini-3-pro" },
    "document-writer": { "model": "google/antigravity-gemini-3-flash" }
  }
}
```

---

### Infinite `.tmp` Files Created

**Cause:** When account is rate-limited and plugin retries infinitely, it creates many temp files.

**Workaround:**
1. Stop OpenCode
2. Clean up: `rm ~/.config/opencode/*.tmp`
3. Add more accounts or wait for rate limit to expire

---

### OAuth Callback Issues

<details>
<summary><b>Safari OAuth Callback Fails (macOS)</b></summary>

**Symptoms:**
- "fail to authorize" after successful Google login
- Safari shows "Safari can't open the page"

**Cause:** Safari's "HTTPS-Only Mode" blocks `http://localhost` callback.

**Solutions:**

1. **Use Chrome or Firefox** (easiest):
   Copy the OAuth URL and paste into a different browser.

2. **Disable HTTPS-Only Mode temporarily:**
   - Safari > Settings (⌘,) > Privacy
   - Uncheck "Enable HTTPS-Only Mode"
   - Run `opencode auth login`
   - Re-enable after authentication

</details>

<details>
<summary><b>Port Conflict (Address Already in Use)</b></summary>

**macOS / Linux:**
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
| `reference_images` | string[] | 否 | [] | 图生图参考图片路径列表 (最多10张) |

**支持的纵横比:** `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `21:9`

**主要特性:**
- **文生图**: 通过提示词生成图片
- **图生图**: 提供参考图片进行风格迁移、编辑或融合
- **自动保存**: 保存至项目目录下的 `{project}/imgs/`
- **WebP**: 同时生成 WebP 版本 (75% 质量) 以节省空间
- **高清支持**: 支持动态配置 4K (HD) 高清输出

#### 图生图 (Image-to-Image) 使用指南

要使用图生图功能，只需在调用工具时通过 `reference_images` 参数提供参考图片的本地绝对路径。

**示例场景 1：风格迁移**
- **Prompt**: "Turn this photo into a cyberpunk style illustration"
- **reference_images**: `["/path/to/your/photo.jpg"]`

**示例场景 2：多图融合**
- **Prompt**: "Combine the cat from the first image and the dog from the second image playing together in a park"
- **reference_images**: `["/path/to/cat.jpg", "/path/to/dog.png"]`

**注意**:
- 图片路径必须是本地文件系统的绝对路径。
- 支持 JPG, PNG, WebP 格式。
- 最多支持 10 张参考图片。

## 开源协议

MIT

---

### Migrating Accounts Between Machines

When copying `antigravity-accounts.json` to a new machine:
1. Ensure the plugin is installed: `"plugin": ["opencode-antigravity-auth@beta"]`
2. Copy `~/.config/opencode/antigravity-accounts.json`
3. If you get "API key missing" error, the refresh token may be invalid — re-authenticate

## Known Plugin Interactions
For details on load balancing, dual quota pools, and account storage, see [docs/MULTI-ACCOUNT.md](docs/MULTI-ACCOUNT.md).

---

## Plugin Compatibility

### @tarquinen/opencode-dcp

DCP creates synthetic assistant messages that lack thinking blocks. **List this plugin BEFORE DCP:**

```json
{
  "plugin": [
    "opencode-antigravity-auth@latest",
    "@tarquinen/opencode-dcp@latest"
  ]
}
```

### oh-my-opencode

Disable built-in auth and override agent models in `oh-my-opencode.json`:

```json
{
  "google_auth": false,
  "agents": {
    "frontend-ui-ux-engineer": { "model": "google/antigravity-gemini-3-pro" },
    "document-writer": { "model": "google/antigravity-gemini-3-flash" },
    "multimodal-looker": { "model": "google/antigravity-gemini-3-flash" }
  }
}
```

> **Tip:** When spawning parallel subagents, enable `pid_offset_enabled: true` in `antigravity.json` to distribute sessions across accounts.

### Plugins you don't need

- **gemini-auth plugins** — Not needed. This plugin handles all Google OAuth.

---

## Configuration

Create `~/.config/opencode/antigravity.json` for optional settings:

```json
{
  "$schema": "https://raw.githubusercontent.com/NoeFabris/opencode-antigravity-auth/main/assets/antigravity.schema.json"
}
```

Most users don't need to configure anything — defaults work well.

### Model Behavior

| Option | Default | What it does |
|--------|---------|--------------
| `keep_thinking` | `false` | Preserve Claude's thinking across turns. **Warning:** enabling may degrade model stability. |
| `session_recovery` | `true` | Auto-recover from tool errors |
| `web_search.default_mode` | `"off"` | Gemini Google Search: `"auto"` or `"off"` |

### Account Rotation

| Your Setup | Recommended Config |
|------------|-------------------|
| **1 account** | `"account_selection_strategy": "sticky"` |
| **2-5 accounts** | Default (`"hybrid"`) works great |
| **5+ accounts** | `"account_selection_strategy": "round-robin"` |
| **Parallel agents** | Add `"pid_offset_enabled": true` |

### Rate Limit Scheduling

Control how the plugin handles rate limits:

| Option | Default | What it does |
|--------|---------|--------------|
| `scheduling_mode` | `"cache_first"` | `"cache_first"` = wait for same account (preserves prompt cache), `"balance"` = switch immediately, `"performance_first"` = round-robin |
| `max_cache_first_wait_seconds` | `60` | Max seconds to wait in cache_first mode before switching accounts |
| `failure_ttl_seconds` | `3600` | Reset failure count after this many seconds (prevents old failures from permanently penalizing accounts) |

**When to use each mode:**
- **cache_first** (default): Best for long conversations. Waits for the same account to recover, preserving your prompt cache.
- **balance**: Best for quick tasks. Switches accounts immediately when rate-limited for maximum availability.
- **performance_first**: Best for many short requests. Distributes load evenly across all accounts.

### App Behavior

| Option | Default | What it does |
|--------|---------|--------------|
| `quiet_mode` | `false` | Hide toast notifications |
| `debug` | `false` | Enable debug logging |
| `auto_update` | `true` | Auto-update plugin |

For all options, see [docs/CONFIGURATION.md](docs/CONFIGURATION.md).

**Environment variables:**
```bash
OPENCODE_ANTIGRAVITY_DEBUG=1 opencode   # Enable debug logging
OPENCODE_ANTIGRAVITY_DEBUG=2 opencode   # Verbose logging
```

---

## Troubleshooting

See the full [Troubleshooting Guide](docs/TROUBLESHOOTING.md) for solutions to common issues including:

- Auth problems and token refresh
- "Model not found" errors
- Session recovery
- Gemini CLI permission errors
- Safari OAuth issues
- Plugin compatibility
- Migration guides

---

## Documentation

- [Configuration](docs/CONFIGURATION.md) — All configuration options
- [Multi-Account](docs/MULTI-ACCOUNT.md) — Load balancing, dual quota pools, account storage
- [Model Variants](docs/MODEL-VARIANTS.md) — Thinking budgets and variant system
- [Troubleshooting](docs/TROUBLESHOOTING.md) — Common issues and fixes
- [Architecture](docs/ARCHITECTURE.md) — How the plugin works
- [API Spec](docs/ANTIGRAVITY_API_SPEC.md) — Antigravity API reference

---

## Support

If this plugin helps you, consider supporting its maintenance:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/S6S81QBOIR)

---

## Credits

- [opencode-gemini-auth](https://github.com/jenslys/opencode-gemini-auth) by [@jenslys](https://github.com/jenslys)
- [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI)

## License

MIT License. See [LICENSE](LICENSE) for details.

<details>
<summary><b>Legal</b></summary>

### Intended Use

- Personal / internal development only
- Respect internal quotas and data handling policies
- Not for production services or bypassing intended limits

### Warning

By using this plugin, you acknowledge:

- **Terms of Service risk** — This approach may violate ToS of AI model providers
- **Account risk** — Providers may suspend or ban accounts
- **No guarantees** — APIs may change without notice
- **Assumption of risk** — You assume all legal, financial, and technical risks

### Disclaimer

- Not affiliated with Google. This is an independent open-source project.
- "Antigravity", "Gemini", "Google Cloud", and "Google" are trademarks of Google LLC.

</details>
