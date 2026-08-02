# 更新日志

本文档记录 Flomo Importer 插件的所有重要变更。
---

## [2.6.0] - 2026-08-01

### ✨ 新功能 / New Features

#### 📤 新增 Markdown 私有 API 推送
- **修正 YAML 时间格式**：修正了上传至 flomo 时的 YAML Frontmatter 时间格式问题，确保时间元数据准确。
- **优化按日期合并的 Thino 兼容**：针对现有的“按日期合并笔记”功能，将原有的成对 `%%flomo:slug%%` 标记转换为 HTML 注释，避免在阅读模式下显示干扰信息，完美适配 Thino 渲染。
- **隐藏聚合同步标记**：新增 CodeMirror 编辑器扩展，提供“隐藏聚合同步标记”开关（默认开启），在实时预览和源码模式下智能隐藏同步元数据标记，保持编辑器整洁。

#### 🎨 UI 重构与增强
- **全新的设置界面 (Settings UI)**：重新设计了插件设置界面，采用选项卡（Tabbed）布局，将复杂的配置项分组管理（如拉取通道、推送通道等），并提供内联配置选项，极大提升了易用性。
- **统一的操作模态框 (Ribbon Action Modal)**：引入了统一的带状（Ribbon）操作模态框，将 API 同步和 ZIP 文件导入等任务整合在一个集中的操作面板中，简化了用户操作流程。

### 🛠️ 适配新版 Flomo 界面与修复 / New Flomo UI Adaptation & Fixes
- **标签过滤 ZIP 导出流程更新**：适配新版 Flomo 搜索界面，改为通过“搜索”面包屑下拉菜单导出，并兼容新版确认弹窗（“仅导出当前搜索结果中的笔记”）。
- **全量 ZIP 导出流程更新**：适配新版设置界面，改为 用户名菜单 → 设置 → 导入导出 → 导出笔记 → 导出 的完整导航流程。
- **悬浮层点击加固**：新增 `safeClick` 兜底机制，普通点击被页面悬浮层拦截指针事件时自动改用 DOM 点击，搜索框聚焦也不再依赖指针点击，避免超时失败。
- **修复同步通道下拉空白**：统一“同步拉取通道”两个入口的选项键（`web` → `traditional`），加载时自动迁移存量旧值，杜绝下拉框空白。

---

## [2.5.0] - 2026-05-27

### 🚀 重大更新 / Major Updates

#### 🎯 双通道架构 — Flomo API 极速同步 + 传统 Playwright 兜底
**Dual-Channel Architecture — Flomo API Fast Sync + Traditional Playwright Fallback**

本版本实现了完整的双通道读写架构，在保留传统 Playwright/ZIP 导入通道的同时，新增基于 Flomo 私有 API 的极速同步能力。

**核心架构 / Core Architecture**:
- ✅ **拉取双通道 / Pull Dual-Channel**:
  - 通道一 / Channel 1: Playwright/ZIP 传统物理导入（兜底）/ Traditional physical import (fallback)
  - 通道二 / Channel 2: API 极速增量同步（主力）/ API fast incremental sync (primary)
  
- ✅ **推送双通道 / Push Dual-Channel**:
  - 通道一 / Channel 1: Bearer Token 私有接口推送（免费用户可用）/ Bearer Token private API push (free users)
  - 通道二 / Channel 2: Pro 会员 Webhook 推送 / Pro member Webhook push

**新增核心模块 / New Core Modules** (`lib/flomo/api/`):
- `types.ts` — 类型定义（FlomoMemo, FlomoFile, SyncSession, SyncResult）
- `signer.ts` — MD5 签名算法（字典序 + Salt `dbbc3dd73364b4084c3a69346e0ce2b2`）
- `client.ts` — API 客户端（429 退避、AbortSignal、testConnection）
- `sync.ts` — 增量同步引擎（游标分页、去重、删除同步）
- `renderer.ts` — Markdown 渲染器（YAML frontmatter + HTML→MD）
- `downloader.ts` — 附件下载器（图片、音频、视频）
- `pusher.ts` — 推送服务（Token/Webhook/URL Scheme 三级降级）
- `sync-lock.ts` — 同步互斥锁（防并发）
- `quota.ts` — 配额防护（每日 100 条上限）
- `uid-index.ts` — 全 Vault slug 索引（基于 metadataCache）
- `error.ts` — 错误分类（auth/quota/network/unknown）
- `path-utils.ts` — 路径工具（强制 normalizePath）
- `backlink-index.ts` — 双链索引
- `backlink-rewriter.ts` — 双链重写器
- `date-format.ts` — 日期格式化
- `merge-writer.ts` — 合并写入器

**新增 UI 组件 / New UI Components**:
- `lib/ui/login_modal.ts` — WebView 自动劫持 Token 登录（桌面端）+ 手动输入（移动端）
- `lib/ui/push_modal.ts` — Ribbon 快速输入面板

**Settings 扩展 / Settings Extension**:
```typescript
interface MyPluginSettings {
  // 新增字段 / New fields
  pullChannel: "traditional" | "api";  // 拉取通道选择
  flomoApiToken: string;               // Bearer Token
  pushChannel: "token" | "webhook" | "urlscheme";
  webhookUrl: string;                  // Pro Webhook URL
  dailyPushCount: number;              // 每日推送计数
  lastPushDate: string;                // 上次推送日期
  autoSyncIntervalMinutes: number;     // 自动同步间隔（分钟）
  enableSyncDelete: boolean;           // 启用删除同步
  lastPullUpdatedAt: string;           // 上次拉取时间戳
  lastPullSlug: string;                // 上次拉取 slug
}
```

**技术亮点 / Technical Highlights**:
- 🎯 **增量同步**: 基于 `slug` 主键 + `updated_at` 时间戳的智能去重
  - Incremental sync: Smart deduplication based on `slug` primary key + `updated_at` timestamp
- 🎯 **游标分页**: 10 分钟容错缓冲 + 200 条/页自动翻页
  - Cursor pagination: 10-minute fault tolerance buffer + 200 items/page auto-pagination
- 🎯 **安全删除**: 回收站策略（`app.vault.trash`），可恢复
  - Safe deletion: Recycle bin strategy (`app.vault.trash`), recoverable
- 🎯 **配额防护**: 本地拦截 Webhook 每日 100 条上限
  - Quota protection: Local interception of Webhook daily 100-item limit
- 🎯 **三级降级**: Token → Webhook → URL Scheme 自动降级
  - Three-level fallback: Token → Webhook → URL Scheme automatic fallback
- 🎯 **零新增依赖**: 完全基于 Obsidian 内置 API + 现有依赖
  - Zero new dependencies: Fully based on Obsidian built-in API + existing dependencies

#### 🔧 模块加载器重构 — 解决 Playwright 加载失败问题
**Module Loader Refactoring — Fixed Playwright Loading Issues**

- **问题根源 / Root Cause**: Obsidian Electron 渲染进程劫持了原生 `require` 函数，导致常规的模块路径解析完全失效
  - Obsidian's Electron renderer process hijacks the native `require` function, causing conventional module path resolution to fail completely
  
- **解决方案 / Solution**: 借鉴 `get-to-obsidian` 项目的黑客级方案，创建统一模块加载器
  - Inspired by the `get-to-obsidian` project's advanced solution, created a unified module loader
  
- **核心机制 / Core Mechanism**:
  - 使用 `eval('require')` 绕过 TypeScript 静态分析 / Use `eval('require')` to bypass TypeScript static analysis
  - 构建多个候选绝对路径（开发目录、插件目录、全局安装路径）/ Build multiple candidate absolute paths (dev directory, plugin directory, global installation paths)
  - 使用绝对物理路径直接穿透 Obsidian 的 require 劫持 / Use absolute physical paths to directly penetrate Obsidian's require hijacking
  - 通过 esbuild `define` 在编译期注入开发路径 / Inject development path at compile time via esbuild `define`

- **支持的全局路径 / Supported Global Paths**:
  - **Windows**: `%APPDATA%\npm\node_modules`, `%ProgramFiles%\nodejs\node_modules`, NVM 路径
  - **macOS**: `/usr/local/lib/node_modules`, `/opt/homebrew/lib/node_modules`
  - **Linux**: `/usr/local/lib/node_modules`, `/usr/lib/node_modules`
  - **环境变量 / Environment Variables**: `NODE_PATH` 指定的路径

- **新增文件 / New Files**:
  - `lib/flomo/moduleLoader.ts` — 统一模块加载器，支持 `getPlaywright()`, `getFsExtra()`, `getPath()`, `getOs()`
  - 调试模式开关 `DEBUG_MODULE_LOADER` 可查看所有尝试的路径

- **改造文件 / Modified Files**:
  - `lib/flomo/auth.ts` — 使用 `getPlaywright()` 和 `getFsExtra()` 惰性加载
  - `lib/flomo/exporter.ts` — 使用 `getPlaywright()` 惰性加载
  - `lib/flomo/const.ts` — 使用 `getPath()` 和 `getOs()` 加载
  - `esbuild.config.mjs` — 添加 `define: { 'BUILD_DEV_DIR': JSON.stringify(process.cwd()) }`

### ✨ 新功能 / New Features

#### 🔐 WebView 自动劫持鉴权 / WebView Auto Token Hijacking
- **桌面端 / Desktop**: 内嵌 Electron `<webview>` 渲染 Flomo 登录页，自动劫持 `localStorage` 提取 Token
  - Embedded Electron `<webview>` renders Flomo login page, automatically hijacks `localStorage` to extract Token
- **移动端降级 / Mobile Fallback**: 手动输入 Token + 测试连接按钮
  - Manual Token input + test connection button
- **兜底入口 / Fallback Entry**: 桌面端同时提供折叠的手动输入面板
  - Desktop also provides collapsible manual input panel

#### 📡 API 增量拉取 / API Incremental Pull
- **MD5 签名**: 参数字典序排列 + Salt 拼接 + MD5 哈希
  - MD5 signature: Parameter dictionary order + Salt concatenation + MD5 hash
- **游标分页**: `latest_updated_at` - 600s + `latest_slug` 联合游标
  - Cursor pagination: `latest_updated_at` - 600s + `latest_slug` joint cursor
- **智能去重**: 本地 `Set<slug>` 去重 + 时间戳比较
  - Smart deduplication: Local `Set<slug>` deduplication + timestamp comparison
- **删除同步**: 检测 `deleted_at` 字段，安全移入回收站
  - Delete sync: Detect `deleted_at` field, safely move to recycle bin

#### 📤 双向推送 / Bidirectional Push
- **Token 推送**: 免费用户通过 Bearer Token 私有接口推送
  - Token push: Free users push via Bearer Token private API
- **Webhook 推送**: Pro 会员使用官方 Webhook（支持 Markdown 格式）
  - Webhook push: Pro members use official Webhook (supports Markdown format)
- **URL Scheme**: 移动端降级，唤醒 Flomo App
  - URL Scheme: Mobile fallback, wake up Flomo App
- **配额防护**: 本地拦截每日 100 条上限
  - Quota protection: Local interception of daily 100-item limit

#### 🎨 UI 增强 / UI Enhancements
- **通道切换器**: 主 UI 顶部显示拉取通道选择（传统/API）
  - Channel switcher: Main UI top displays pull channel selection (Traditional/API)
- **右键菜单**: 编辑器划词"发送到 Flomo"
  - Context menu: Editor selection "Send to Flomo"
- **Ribbon 面板**: 快速输入面板（文本 + 标签 + 发送）
  - Ribbon panel: Quick input panel (text + tags + send)
- **进度反馈**: 300ms 节流 + 详细统计（成功/更新/跳过/删除/失败）
  - Progress feedback: 300ms throttling + detailed statistics (success/update/skip/delete/fail)

### 🔧 技术改进 / Technical Improvements

#### 共享 Turndown 配置 / Shared Turndown Configuration
- 从 `core.ts` 抽取 `createFlomoTurndown()` 为共享函数
  - Extracted `createFlomoTurndown()` from `core.ts` as shared function
- API 通道和传统通道使用相同的 HTML→Markdown 转换规则
  - API channel and traditional channel use the same HTML→Markdown conversion rules
- 保留高亮（`<mark>` → `==`）、段落、列表等格式
  - Preserve highlights (`<mark>` → `==`), paragraphs, lists, etc.

#### 路径归一化强制约束 / Path Normalization Enforcement
- 所有 Vault 路径必须经过 `obsidian.normalizePath()` 处理
  - All Vault paths must be processed through `obsidian.normalizePath()`
- 防止 Windows 反斜杠与移动端正斜杠混乱
  - Prevent Windows backslash and mobile forward slash confusion
- 确保 WikiLinks `![[]]` 在所有平台正常工作
  - Ensure WikiLinks `![[]]` work properly on all platforms

#### 定时器重配模式 / Timer Reconfiguration Mode
- 修改同步间隔时先 `clearInterval` 旧句柄再注册新句柄
  - Clear old interval handle before registering new one when modifying sync interval
- 避免定时器叠加导致的并发同步
  - Avoid concurrent sync caused by timer stacking
- 使用 `Plugin.registerInterval()` 托管生命周期
  - Use `Plugin.registerInterval()` to manage lifecycle

#### 错误分类与友好提示 / Error Classification and Friendly Prompts
- `classifyError()` 自动识别错误类型（auth/quota/network/unknown）
  - `classifyError()` automatically identifies error types (auth/quota/network/unknown)
- 针对性提示：Token 失效、配额耗尽、网络错误等
  - Targeted prompts: Token expired, quota exhausted, network error, etc.
- 429 指数退避：最多 5 次，单次最大 30 秒
  - 429 exponential backoff: Maximum 5 times, single maximum 30 seconds

### ✨ 新功能 / New Features (Module Loader)

#### 惰性加载策略 / Lazy Loading Strategy
- Playwright 仅在桌面端实际调用导出/认证方法时才加载
  - Playwright is only loaded when export/authentication methods are actually called on desktop
- 移动端永不触发 Node.js 模块加载，确保兼容性
  - Mobile devices never trigger Node.js module loading, ensuring compatibility

#### 跨平台路径搜索 / Cross-Platform Path Search
- 自动适配 Windows、macOS、Linux 的不同全局安装路径
  - Automatically adapts to different global installation paths on Windows, macOS, and Linux
- 支持 nvm-windows、Homebrew、系统级 Node.js 安装
  - Supports nvm-windows, Homebrew, and system-level Node.js installations

#### 编译期路径注入 / Compile-Time Path Injection
- 开发路径在编译时固化为常量，运行时自适应搜寻
  - Development path is solidified as a constant at compile time, adaptive search at runtime
- 消除了源码中的硬编码绝对路径，提升可移植性
  - Eliminated hardcoded absolute paths in source code, improving portability

### 🐛 Bug 修复 / Bug Fixes

- ✅ 修复 `Cannot find module 'playwright'` 错误
  - Fixed `Cannot find module 'playwright'` error
- ✅ 修复 Obsidian 渲染进程 require 劫持导致的模块解析失败
  - Fixed module resolution failure caused by Obsidian renderer process require hijacking
- ✅ 修复跨盘符路径搜索失败（Windows）
  - Fixed cross-drive path search failure (Windows)

### 📝 文档更新 / Documentation Updates

- 新增 `get_to_obsidian_packaging_experience.md` — 详细记录了 Obsidian 跨端插件打包与沙盒 require 穿透的工程经验
  - Added `get_to_obsidian_packaging_experience.md` — Detailed engineering experience on Obsidian cross-platform plugin packaging and sandbox require penetration

### 🔍 调试支持 / Debugging Support

- 设置 `DEBUG_MODULE_LOADER = true` 可在控制台查看所有候选路径的尝试过程
  - Set `DEBUG_MODULE_LOADER = true` to view all candidate path attempts in the console
- 成功加载时显示实际使用的路径
  - Display the actual path used when successfully loaded

### ⚠️ 重要提示 / Important Notes

- **推荐安装方式 / Recommended Installation**: 
  - 项目本地安装（通过 `npm install`）/ Local project installation (via `npm install`)
  - 或使用 `deploy.sh` 脚本复制到插件目录 / Or use `deploy.sh` script to copy to plugin directory
  
- **全局安装支持 / Global Installation Support**:
  - 现在支持 `npm install -g playwright` 全局安装
  - Now supports `npm install -g playwright` global installation
  - 模块加载器会自动搜索并找到全局安装的 playwright
  - Module loader will automatically search and find globally installed playwright

---

## [2.4.0] - 2026-02-22

### 🐛 Bug 修复 / Bug Fixes

#### 修复 Flomo 导出 403 Forbidden 错误
**Fixed Flomo Export 403 Forbidden Error**

- **根因定位 / Root Cause**: Flomo 服务器的 WAF (Web Application Firewall) 通过检测 User-Agent 中的 `HeadlessChrome` 字符串拦截 Playwright 无头浏览器
  - Flomo server's WAF (Web Application Firewall) blocks Playwright headless browser by detecting `HeadlessChrome` string in User-Agent
  
- **解决方案 / Solution**: 在无头模式下自定义 User-Agent 为标准 Chrome UA，绕过 WAF 检测
  - Customize User-Agent to standard Chrome UA in headless mode to bypass WAF detection
  
- 导出过程恢复为真正的后台静默运行，无需弹出浏览器窗口
  - Export process restored to true background silent operation without opening browser windows

### ✨ 新功能 / New Features

#### 调试模式开关 / Debug Mode Toggle
- 在"实验性选项"中新增"开启调试模式"复选框，默认关闭
  - Added "Enable Debug Mode" checkbox in "Experimental Options", disabled by default
- **关闭时 / When Disabled**: 后台静默运行，仅输出开始/完成两条日志
  - Background silent operation, only outputs start/complete logs
- **开启时 / When Enabled**: 弹出可见浏览器窗口，输出每一步详细日志并自动保存关键步骤截图
  - Opens visible browser window, outputs detailed logs for each step and automatically saves screenshots of key steps
- 错误截图始终保存，便于事后排查
  - Error screenshots are always saved for post-mortem analysis

### 🔧 技术改进 / Technical Improvements

#### 重构导出器日志系统 / Refactored Exporter Logging System
- 引入 `dbg()` 调试日志函数，由 `EXPORTER_DEBUG` 开关控制
  - Introduced `dbg()` debug logging function, controlled by `EXPORTER_DEBUG` switch
- 抽取 `checkPageState()` / `debugScreenshot()` / `errorScreenshot()` 辅助方法，消除重复代码
  - Extracted `checkPageState()` / `debugScreenshot()` / `errorScreenshot()` helper methods, eliminating duplicate code
- 增强错误检测：403 Forbidden / 登录页重定向 均有明确的错误提示
  - Enhanced error detection: 403 Forbidden / login page redirect both have clear error messages

#### 新增测试脚本 / New Test Scripts
- `tests/waf_bypass_test.js`: 验证 WAF 绕过方案是否有效
  - Verify if WAF bypass solution is effective
- `tests/ua_comparison.js`: 对比无头/有头模式下的 User-Agent 差异
  - Compare User-Agent differences between headless/headed modes

---

## [2.0.0] - 2025-11-03

### ✨ 主要功能 / Major Features

#### 🔇 静默后台同步 / Silent Background Sync
- **无头浏览器模式 / Headless Browser Mode**: 导出过程现在在后台静默运行，无需打开可见的浏览器窗口
  - Export process now runs silently in the background without opening visible browser windows
- 认证时仍会显示浏览器窗口以处理验证码/登录
  - Authentication still shows browser window for CAPTCHA/login when needed
- 显著改善自动同步操作期间的用户体验
  - Significantly improves user experience during automatic sync operations

#### 📁 简化的附件结构 / Simplified Attachment Structure
- **扁平化目录层次 / Flattened Directory Hierarchy**: 从复杂的 4 级结构改为简单的 2 级结构
  - Changed from complex 4-level to simple 2-level structure
  - 旧 / Old: `flomo picture/file/2025-11-03/4852/filename.m4a`
  - 新 / New: `flomo attachment/2025-11-03/filename.m4a`
- 移除不必要的 `file/` 目录层 / Removed unnecessary `file/` directory layer
- 移除用户 ID 目录层（如 `4852/`）/ Removed user ID directory layer (e.g., `4852/`)
- 重命名 `flomo picture` 为 `flomo attachment` 以更清晰（支持所有文件类型）
  - Renamed `flomo picture` to `flomo attachment` for clarity (supports all file types)
- 自动处理笔记 markdown 中的附件引用更新
  - Automatically handles attachment reference updates in memo markdown

#### ⚙️ 动态路径配置 / Dynamic Path Configuration
- 附件路径现在遵循插件 UI 中的"Flomo Home"设置
  - Attachment paths now respect the "Flomo Home" setting in plugin UI
- 不再有硬编码路径 - 完全可根据用户偏好自定义
  - No more hardcoded paths - fully customizable based on user preferences
- 示例 / Example: 如果 Flomo Home 设置为 "10 flomo"，附件将存储到 "10 flomo/flomo attachment/"
  - If Flomo Home is set to "10 flomo", attachments go to "10 flomo/flomo attachment/"

#### 🔄 内容更新检测 / Content Update Detection
- **智能变更检测 / Smart Change Detection**: 插件现在可以检测笔记在 Flomo 中的编辑
  - Plugin now detects when memos are edited in Flomo
- 比较时间戳和内容哈希以识别更新
  - Compares both timestamp AND content hash to identify updates
- 自动重新导入更新的笔记，无需手动干预
  - Automatically re-imports updated memos without manual intervention
- 防止重复导入，同时确保同步最新内容
  - Prevents duplicate imports while ensuring latest content is synced

#### 🗑️ 重置同步历史 / Reset Sync History
- 插件设置 UI 中新增"重置同步历史"按钮
  - New "Reset Sync History" button in plugin settings UI
- 允许清除所有已同步的笔记 ID 以重新导入整个 Flomo 数据库
  - Allows clearing all synced memo IDs to re-import entire Flomo database
- 在更改附件路径或结构时很有用
  - Useful when changing attachment paths or structure
- 显示确认对话框，清楚警告文件覆盖
  - Shows confirmation dialog with clear warnings about file overwrites
- 显示当前同步统计信息（上次同步时间、已同步笔记数）
  - Displays current sync statistics (last sync time, synced memo count)

### 🐛 Bug 修复 / Bug Fixes

#### 修复附件引用更新 / Fixed Attachment Reference Updates
- **正则表达式改进 / Regex Improvement**: 现在正确更新笔记内容中的附件引用
  - Now correctly updates attachment references in memo content
- 之前只匹配空 alt 文本的 `![]()`
  - Previously only matched `![]()` with empty alt text
- 现在匹配 `![任意文本]()` 并保留 alt 文本
  - Now matches `![any text]()` and preserves alt text
- 处理所有附件类型（图片、音频、视频等）
  - Handles all attachment types (images, audio, video, etc.)

#### 修复变量作用域问题 / Fixed Variable Scope Issue
- 解决 `copyAttachmentsRecursively()` 方法中的编译错误
  - Resolved compilation error in `copyAttachmentsRecursively()` method
- 将 `targetPath` 变量声明移到 try-catch 块外以确保正确的作用域
  - Moved `targetPath` variable declaration outside try-catch block for proper scoping

### 🔧 技术改进 / Technical Improvements

#### 重构附件复制 / Refactored Attachment Copying
- 新的专用方法：`copyAttachmentsSkipUserIdDir()`
  - New specialized method: `copyAttachmentsSkipUserIdDir()`
- 高效处理 Flomo 的 3 级导出结构（日期/用户ID/文件）
  - Efficiently handles Flomo's 3-level export structure (date/userID/files)
- 扁平化为 2 级 vault 结构（日期/文件）
  - Flattens to 2-level vault structure (date/files)
- 跳过空目录以保持 vault 整洁
  - Skips empty directories to keep vault clean

#### 增强的增量同步算法 / Enhanced Incremental Sync Algorithm
- 改进的笔记 ID 生成以获得更好的唯一性
  - Improved memo ID generation for better uniqueness
- 格式 / Format: `${timestamp}_${contentHash}_${occurrence}_${total}`
- 向后兼容旧版本的 ID 格式
  - Backward compatible with old ID formats from previous versions
- 更可靠地检测重复与更新内容
  - More reliable detection of duplicate vs. updated content

#### 更好的调试支持 / Better Debugging Support
- 在整个同步过程中增强控制台日志记录
  - Enhanced console logging throughout sync process
- 显示附件路径决策和文件操作
  - Shows attachment path decisions and file operations
- 帮助排查同步问题
  - Helps troubleshoot sync issues

### 📝 文档 / Documentation
- 创建了包含项目概述和架构细节的综合 CLAUDE.md
  - Created comprehensive CLAUDE.md with project overview and architecture details
- 添加了 deploy.sh 脚本以简化本地开发工作流程
  - Added deploy.sh script for easier local development workflow
- 改进了内联代码注释
  - Improved inline code comments

### 🔄 迁移说明 / Migration Notes

**如果从 1.x 升级到 2.0 / If upgrading from 1.x to 2.0:**

1. **附件路径已更改 / Attachment path has changed** - 插件现在使用 `flomo attachment/` 而不是 `flomo picture/file/`
   - The plugin now uses `flomo attachment/` instead of `flomo picture/file/`

2. **您需要决定 / You need to decide**: 保留旧附件还是重新导入？
   - Keep old attachments or re-import?

   **选项 A：全新重新导入（推荐）/ Option A: Clean re-import (recommended)**
   - 在插件设置中点击"重置同步历史"按钮
     - Click "Reset Sync History" button in plugin settings
   - 手动删除旧文件夹 / Manually delete old folders:
     - `[Flomo Home]/memos/`
     - `[Flomo Home]/flomo picture/`（如果存在 / if exists）
   - 再次运行同步 - 所有笔记和附件将使用新结构重新导入
     - Run sync again - all memos and attachments will be re-imported with new structure

   **选项 B：保留现有笔记 / Option B: Keep existing memos**
   - 正常同步即可 - 只有新笔记会被导入
     - Just sync normally - only new memos will be imported
   - 旧笔记将保留旧的附件路径
     - Old memos will keep old attachment paths
   - 新笔记将使用新的附件路径
     - New memos will use new attachment paths
   - 混合结构，但不会出问题
     - Mixed structure, but nothing breaks

3. **内容更新检测 / Content update detection**: 如果您在升级后在 Flomo 中编辑笔记，它将被自动检测并重新导入
   - If you edit a memo in Flomo after upgrading, it will be automatically detected and re-imported

### 🙏 致谢 / Credits

此版本包含从 [jia6y/flomo-to-obsidian](https://github.com/jia6y/flomo-to-obsidian) 分叉的重大改进。

This release includes significant improvements forked from [jia6y/flomo-to-obsidian](https://github.com/jia6y/flomo-to-obsidian).

特别感谢原作者创建了这个优秀的插件。

Special thanks to the original author for creating this excellent plugin.

---

## [1.4.0] - 之前的版本 / Previous Releases

有关 1.0.0 - 1.4.0 版本的更改，请参阅 git 历史记录。

See git history for changes in versions 1.0.0 - 1.4.0.
