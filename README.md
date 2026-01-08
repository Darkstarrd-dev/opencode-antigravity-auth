# Antigravity + Gemini CLI OAuth Plugin for Opencode (Enhanced Fork)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **This is an enhanced fork** that merges the best features from multiple excellent projects:
>
> | Feature                                                                        | Source                                                                                                    |
> | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
> | Dual Quota System, Multi-Account Rotation, Session Recovery, Thinking Recovery | [NoeFabris/opencode-antigravity-auth](https://github.com/NoeFabris/opencode-antigravity-auth)             |
> | `google_search` Tool (Experimental)                                            | [shekohex/opencode-google-antigravity-auth](https://github.com/shekohex/opencode-google-antigravity-auth) |
> | `generate_image` Tool (Native Implementation)                                  | Ported from Antigravity Manager logic                                                                    |
>
> **Status:** Version 1.1.0 - Stable Image Gen, Dual Channel (CLI/Anti), Search Tool (WIP/Disabled)

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
- **generate_image Tool** - AI image generation with auto-save, WebP conversion, and 4K support (Stability varies)
- **google_search Tool** - (WIP) Built-in web search. Currently returning "Preview access required" errors.

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
     "plugin": ["opencode-antigravity-auth-remix@1.0.9"]
   }
   ```

2. **Authenticate:**

   ```bash
   opencode auth login
   ```

3. **Add models** (see [Available Models](#available-models) for full list):

   ```json
   {
     "plugin": ["opencode-antigravity-auth-remix@1.0.9"],
     "provider": {
       "google": {
         "models": {
           "antigravity-claude-sonnet-4-5": {
             "name": "Claude Sonnet 4.5 (Antigravity)",
             "limit": { "context": 200000, "output": 64000 },
             "modalities": {
               "input": ["text", "image", "pdf"],
               "output": ["text"]
             }
           }
         }
       }
     }
   }
   ```

4. **Use it:**

   ```bash
   opencode run "Hello" --model=google/antigravity-claude-sonnet-4-5
   ```

## Available Models

### Antigravity Quota

Models with `antigravity-` prefix use Antigravity quota:

| Model                                                  | Description                       |
| ------------------------------------------------------ | --------------------------------- |
| `google/antigravity-gemini-3-flash`                    | Gemini 3 Flash (minimal thinking) |
| `google/antigravity-gemini-3-pro-low`                  | Gemini 3 Pro with low thinking    |
| `google/antigravity-gemini-3-pro-high`                 | Gemini 3 Pro with high thinking   |
| `google/antigravity-claude-sonnet-4-5`                 | Claude Sonnet 4.5 (no thinking)   |
| `google/antigravity-claude-sonnet-4-5-thinking-low`    | Sonnet with 8K thinking budget    |
| `google/antigravity-claude-sonnet-4-5-thinking-medium` | Sonnet with 16K thinking budget   |
| `google/antigravity-claude-sonnet-4-5-thinking-high`   | Sonnet with 32K thinking budget   |
| `google/antigravity-claude-opus-4-5-thinking-low`      | Opus with 8K thinking budget      |
| `google/antigravity-claude-opus-4-5-thinking-medium`   | Opus with 16K thinking budget     |
| `google/antigravity-claude-opus-4-5-thinking-high`     | Opus with 32K thinking budget     |

### Gemini CLI Quota

Models with `-preview` suffix use Gemini CLI quota:

| Model                           | Description              |
| ------------------------------- | ------------------------ |
| `google/gemini-2.5-flash`       | Gemini 2.5 Flash         |
| `google/gemini-2.5-pro`         | Gemini 2.5 Pro           |
| `google/gemini-3-flash-preview` | Gemini 3 Flash (preview) |
| `google/gemini-3-pro-preview`   | Gemini 3 Pro (preview)   |

## Built-in Tools

### generate_image

AI image generation with automatic file saving and WebP conversion. Uses `gemini-3-pro-image`.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt` | string | Yes | - | Image description |
| `aspect_ratio` | string | No | "1:1" | Aspect ratio |
| `quality` | string | No | "standard" | Image quality (hd = 4K) |

**Supported aspect ratios:** `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `21:9`

**Features:**
- Auto-saves to `{project}/imgs/` directory
- Generates WebP version (75% quality) alongside original
- 4K support via dynamic model configuration

### google_search (WIP)

Web search and URL analysis. Currently experimental and may return "Preview access required" errors due to API restrictions.

## License

MIT
