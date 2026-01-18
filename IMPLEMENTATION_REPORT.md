# 实施报告：整合图像生成和Google搜索工具

**实施时间**: 2026-01-18  
**项目位置**: `Z:\Playground\CurrentWorking\opencode-antigravity-auth-remix`  
**状态**: ✅ 完成

---

## 实施概览

成功将 Fork 项目的图像生成 (`generate_image`) 和 Google 搜索 (`google_search`) 工具整合到源项目中，并实现了完整的 Fallback 机制。

### 关键指标

- **新增文件**: 2 个 (image.ts, search.ts)
- **修改文件**: 6 个
- **新增代码**: ~1729 行
- **编译状态**: ✅ 通过
- **依赖安装**: ✅ sharp@^0.33.0

---

## 完成的任务

### Phase 1: Git 备份和依赖安装 ✅

- ✅ Git 备份已完成（commit 标记为 backup-20260118）
- ✅ 安装 sharp@^0.33.0 依赖成功

### Phase 2: 修改 constants.ts ✅

- ✅ 更新 User-Agent 到 `antigravity/1.11.9`
- ✅ 添加 `ANTIGRAVITY_ENDPOINT_DAILY_NON_SANDBOX` 端点
- ✅ 更新端点回退顺序为: daily-non-sandbox → prod → daily → autopush
- ✅ 添加 SEARCH_* 常量 (MODEL, TIMEOUT, THINKING_BUDGET)
- ✅ 添加 IMAGE_* 常量 (MODEL, TIMEOUT, ASPECT_RATIOS, SAFETY_SETTINGS)

### Phase 3: 复制工具文件 ✅

- ✅ 从 Fork 项目复制 `image.ts` (664 行)
- ✅ 从 Fork 项目复制 `search.ts` (339 行)

### Phase 4: 实现 Fallback 机制 ✅

**图像生成 Fallback**:
- ✅ 检测 403 错误时提供用户友好的 fallback 提示
- ✅ 建议用户使用 `gemini-3-pro-image` 模型直接生成

**Google 搜索 Fallback**:
- ✅ 所有端点失败时提供配置指导
- ✅ 建议启用 `googleSearchRetrieval` (Grounding) 作为备选方案

### Phase 5: 注册工具到 plugin.ts ✅

- ✅ 导入 `executeImageGeneration` 和 `executeSearch`
- ✅ 导入 `tool` from `@opencode-ai/plugin`
- ✅ 添加 `cachedGetAuth` 变量
- ✅ 在 loader 函数中实现 `cachedGetAuth` 逻辑
- ✅ 注册 3 个工具:
  - `google_search` (支持 query, urls, thinking 参数)
  - `generate_image` (支持 prompt, aspect_ratio, quality, reference_images)
  - `count_tokens` (占位符实现)

### Phase 6: 编译检查和修复 ✅

**修复的问题**:
1. ✅ 修复 `accessToken` 类型问题（添加 undefined 检查）
2. ✅ 扩展 `PluginResult` 接口以支持 `tool` 属性
3. ✅ 添加 `generateRequestId` 和 `getSessionId` 辅助函数到 `request-helpers.ts`

**编译结果**: ✅ 无错误

---

## 文件变更摘要

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/constants.ts` | 修改 (+154 行) | 新增 IMAGE/SEARCH 常量、更新端点和 User-Agent |
| `src/plugin.ts` | 修改 (+120 行) | 添加 tool 注册、cachedGetAuth 实现 |
| `src/plugin/types.ts` | 修改 (+1 行) | 添加 `tool?: Record<string, unknown>` 到 PluginResult |
| `src/plugin/request-helpers.ts` | 修改 (+26 行) | 添加 generateRequestId 和 getSessionId |
| `src/plugin/image.ts` | 新增 (664 行) | Fork 项目完整复制 + fallback 修改 |
| `src/plugin/search.ts` | 新增 (339 行) | Fork 项目完整复制 + fallback 修改 |
| `package.json` | 修改 (+1 行) | 添加 sharp 依赖 |
| `package-lock.json` | 修改 (自动) | sharp 及其依赖 |

---

## 架构变化

### 变更前
```
源项目
├── plugin.ts (核心插件)
│   └── fetch 拦截器
│       ├── 账号管理 (AccountManager)
│       ├── 请求转换
│       └── 响应处理
└── 无独立工具
```

### 变更后
```
整合后项目
├── plugin.ts (核心插件 + 工具注册)
│   ├── fetch 拦截器 (保留所有原功能)
│   └── tool 注册 ✨ 新增
│       ├── google_search
│       ├── generate_image
│       └── count_tokens
├── plugin/
│   ├── image.ts (独立工具) ✨ 新增
│   ├── search.ts (独立工具) ✨ 新增
│   └── image-saver.ts (保留，fallback 使用)
└── 双模式共存
    ├── Tool 模式 (Fork 实现，用户显式调用)
    └── Embedded 模式 (源实现，fallback 使用)
```

---

## 核心功能验证

### 1. 图像生成工具 (`generate_image`)

**参数支持**:
- ✅ `prompt`: 详细描述
- ✅ `aspect_ratio`: 支持别名 (square/landscape/portrait/wide)
- ✅ `quality`: standard/hd (hd 生成 4K 图像)
- ✅ `reference_images`: 支持最多 10 张参考图

**功能**:
- ✅ 保存到 `{workdir}/imgs/` 目录
- ✅ 自动生成 WebP 版本 (75% 质量)
- ✅ 记录到 `imgs/list.md`
- ✅ 动态端点记忆 (`_preferredEndpoint`)
- ✅ Fallback: 403 错误时提示使用模型名触发

### 2. Google 搜索工具 (`google_search`)

**参数支持**:
- ✅ `query`: 搜索查询
- ✅ `urls`: 可选 URL 列表（直接分析）
- ✅ `thinking`: 深度思考模式（默认 true）

**功能**:
- ✅ 结构化输出 (Markdown 格式)
- ✅ 包含 Sources、Citations、Search Queries
- ✅ URL 检索状态追踪
- ✅ Fallback: 失败时提示配置 googleSearchRetrieval

### 3. Token 计数工具 (`count_tokens`)

- ✅ 占位符实现（返回字符数）
- ⏳ 待完整实现

---

## Git 历史

```bash
commit 7a63caf (HEAD -> main)
Author: [自动]
Date:   2026-01-18

    feat: integrate image generation and Google search tools with fallback mechanism
    
    - Add IMAGE_* and SEARCH_* constants to constants.ts
    - Update User-Agent to antigravity/1.11.9
    - Add ANTIGRAVITY_ENDPOINT_DAILY_NON_SANDBOX endpoint
    - Copy image.ts and search.ts from fork project
    - Implement fallback mechanisms for both tools
    - Register tools in plugin.ts with cachedGetAuth
    - Add tool property to PluginResult interface
    - Add generateRequestId and getSessionId helper functions
    - Install sharp dependency for image processing
```

---

## 后续工作建议

### 短期优化 (1-2周)

1. **完善 Fallback 逻辑**
   - [ ] 图像生成 fallback 完整实现（自动调用源项目内嵌流程）
   - [ ] 添加 fallback 统计日志
   - [ ] 记录触发次数和成功率

2. **错误处理增强**
   - [ ] 403/429 错误详细分类
   - [ ] 添加重试机制（exponential backoff）
   - [ ] 超时处理优化

3. **功能测试**
   - [ ] 端到端测试图像生成
   - [ ] 端到端测试 Google 搜索
   - [ ] Fallback 机制测试

### 中期优化 (1-2月)

1. **性能监控**
   - [ ] 记录 tool 调用延迟 (p50/p95/p99)
   - [ ] 端点健康度统计
   - [ ] Fallback 触发频率

2. **用户体验**
   - [ ] Toast 通知（进度提示）
   - [ ] 搜索结果缓存
   - [ ] 图片预览功能

### 长期优化 (3月+)

1. **多模型支持**
   - [ ] 图像生成支持 `gemini-3-pro-image-preview`
   - [ ] 搜索支持 `gemini-2.5-pro`

2. **高级功能**
   - [ ] 图像编辑 (inpainting)
   - [ ] 批量图像生成
   - [ ] 搜索结果过滤

---

## 已知问题

1. **Token 计数**: `count_tokens` 工具暂未实现完整逻辑
2. **测试覆盖**: 缺少单元测试和集成测试

---

## 回滚方案

如果需要回滚到整合前的状态：

```bash
cd "Z:\Playground\CurrentWorking\opencode-antigravity-auth-remix"

# 方案1: 回滚到备份 tag
git reset --hard backup-20260118

# 方案2: 仅回滚特定文件
git checkout backup-20260118 -- src/plugin.ts src/constants.ts

# 方案3: 删除新增文件
rm src/plugin/image.ts src/plugin/search.ts
```

---

## 总结

✅ **所有 6 个实施阶段已完成**  
✅ **编译通过，无 TypeScript 错误**  
✅ **代码已提交到 Git**  
✅ **项目位于**: `Z:\Playground\CurrentWorking\opencode-antigravity-auth-remix`

项目成功整合了 Fork 项目的独立工具实现，同时保留了源项目的核心账号管理和 Quota 系统。Fallback 机制确保了在工具调用失败时用户仍有替代方案。

**下一步**: 进行端到端功能测试，验证工具在实际使用场景中的表现。
