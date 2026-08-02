# Flomo Importer

##### ☕️ 将 Flomo 笔记导入 Obsidian

> **Version 2.6.0** - 增强版分支，源自 [jia6y/flomo-to-obsidian](https://github.com/jia6y/flomo-to-obsidian)，包含重大改进

- 原始讨论 / Original Discussion: [Discussion](https://github.com/jia6y/flomo-to-obsidian/discussions)

<br />

<img width="500" alt="image" src="https://github.com/jia6y/flomo-to-obsidian/assets/1456952/bbbf6658-b93e-4b81-b087-0dd8687958ad">

<br/>
<br/>

<img width="550" alt="image" src="https://github.com/jia6y/flomo-to-obsidian/assets/1456952/14059ed5-6ae8-4d39-bbfc-a651e29b3a53">

<br />
<br />

## 🎉 Version 2.6.0 新特性

### 📤 新增 Markdown 私有 API 推送
- **修正 YAML 时间格式**：修正上传至 flomo 时的 YAML Frontmatter 时间格式。
- **优化按日期合并的 Thino 兼容**：针对“按日期合并笔记”功能，将标记转换为 HTML 注释。
- **隐藏聚合同步标记**：新增 CodeMirror 扩展（默认开启），智能隐藏同步元数据标记。

### 🎨 界面与体验重构
- **全新选项卡设置界面**：采用选项卡（Tabbed）布局，将复杂配置分组管理。
- **统一的操作面板**：引入带状（Ribbon）操作模态框，整合 API 同步和 ZIP 导入任务。

### 🛠️ 适配新版 Flomo 界面
- **ZIP 标签过滤导出**：适配新版搜索界面，通过“搜索”面包屑下拉菜单导出，兼容新版确认弹窗。
- **ZIP 全量导出**：适配新版设置页导航（用户名 → 设置 → 导入导出 → 导出笔记）。
- **点击加固**：悬浮层拦截指针事件时自动改用 DOM 点击，导出更稳定。
- **修复同步通道下拉空白**：统一通道选项键并自动迁移旧配置。

---

## 🎉 Version 2.5 新特性

### 🔧 模块加载器重构 — 彻底解决 Playwright 加载失败

**问题背景**：
- Obsidian 的 Electron 渲染进程劫持了原生 `require` 函数
- 导致常规的 `module.paths` 修改完全失效
- 插件无法找到 `node_modules/playwright`，报错 `Cannot find module 'playwright'`

**解决方案**：
- ✅ 借鉴 `get-to-obsidian` 项目的黑客级方案
- ✅ 创建统一模块加载器 (`lib/flomo/moduleLoader.ts`)
- ✅ 使用绝对物理路径直接穿透 Obsidian 的 require 劫持
- ✅ 支持多种安装方式：项目本地、插件目录、系统全局

**支持的安装路径**：
- **开发目录**: `E:\GitHub\flomo-to-obsidian\node_modules\playwright`
- **插件目录**: `{Vault}/.obsidian/plugins/flomo-importer/node_modules\playwright`
- **Windows 全局**: `%APPDATA%\npm\node_modules\playwright`
- **macOS 全局**: `/usr/local/lib/node_modules/playwright`
- **Linux 全局**: `/usr/local/lib/node_modules/playwright`
- **Homebrew**: `/opt/homebrew/lib/node_modules/playwright`
- **环境变量**: `NODE_PATH` 指定的路径

**技术亮点**：
- 🎯 编译期通过 esbuild `define` 注入开发路径
- 🎯 运行期自适应搜寻多个候选路径
- 🎯 惰性加载：仅在桌面端实际使用时才加载 Playwright
- 🎯 移动端零影响：永不触发 Node.js 模块加载

**调试支持**：
```typescript
// 在 lib/flomo/moduleLoader.ts 中设置
const DEBUG_MODULE_LOADER = true;  // 查看所有尝试的路径
```

### 📦 安装方式

**方式一：项目本地安装（推荐）**
```bash
npm install
npx playwright@1.43.1 install
```

**方式二：全局安装（现已支持）**
```bash
npm install -g playwright@1.43.1
npx playwright install
```

**方式三：使用部署脚本**
```bash
npm run build
./deploy.sh  # 自动复制 playwright 到插件目录
```

---

## 🎉 Version 2.5 新特性

### 🎯 双通道架构 — API 极速同步 + 传统 Playwright 兜底

**重大架构升级**：本版本在保留传统 Playwright/ZIP 导入的同时，新增基于 Flomo 私有 API 的极速同步能力，实现真正的双通道读写架构。

#### 📥 拉取双通道（Flomo → Obsidian）

**通道一：传统 Playwright/ZIP 物理导入（兜底）**
- 使用浏览器自动化导出完整 HTML 备份
- 适合首次导入或 API 失效时的安全降级
- 支持离线 ZIP 文件手动导入

**通道二：API 极速增量同步（主力）** ⭐
- 基于 Flomo 私有 API 的增量拉取
- 智能去重：仅同步新增或更新的笔记
- 游标分页：自动处理大量笔记
- 删除同步：检测远端删除，本地安全移入回收站
- 附件下载：自动下载图片、音频、视频

**核心特性**：
- ✅ **MD5 签名认证**：逆向 Flomo Web 端签名算法
- ✅ **增量同步**：基于 `slug` 主键 + `updated_at` 时间戳
- ✅ **游标分页**：10 分钟容错缓冲 + 200 条/页自动翻页
- ✅ **安全删除**：回收站策略，可恢复
- ✅ **YAML Frontmatter**：包含 slug、created、modified、source、tags

#### 📤 推送双通道（Obsidian → Flomo）

**通道一：Bearer Token 私有接口推送（免费用户可用）**
- 使用劫持的 Token 直接调用 Flomo 私有 API
- 无需 Pro 会员即可推送
- 支持 Markdown 格式（加粗、列表等）

**通道二：Pro 会员 Webhook 推送（官方接口）** ⭐
- 使用 Flomo 官方 Webhook API
- 稳定可靠，官方支持
- 支持 `content_type: "markdown"` 格式
- 本地配额防护：每日 100 条上限拦截

**通道三：URL Scheme 降级（移动端）**
- 唤醒 Flomo App 填入内容
- 适合无网环境或未配置 Token 场景
- 支持图片 URL 数组（最多 9 张）

**交互方式**：
- 🖱️ 编辑器右键划词"发送到 Flomo"
- 🎨 Ribbon 快速输入面板
- ⌨️ 命令面板快捷命令

#### 🔐 WebView 自动劫持鉴权

**桌面端**：
- 内嵌 Electron `<webview>` 渲染 Flomo 登录页
- 自动劫持 `localStorage` 提取 Bearer Token
- 无需手动复制粘贴，一键完成鉴权

**移动端降级**：
- 手动输入 Token 文本框
- "测试连接"按钮验证有效性
- 显示用户昵称确认连接成功

**兜底入口**：
- 桌面端同时提供折叠的手动输入面板
- 适用于 webview 加载失败或 Flomo 站点改版场景

### 🔧 模块加载器重构 — 彻底解决 Playwright 加载失败

**问题背景**：
- Obsidian 的 Electron 渲染进程劫持了原生 `require` 函数
- 导致常规的 `module.paths` 修改完全失效
- 插件无法找到 `node_modules/playwright`，报错 `Cannot find module 'playwright'`

**解决方案**：
- ✅ 借鉴 `get-to-obsidian` 项目的黑客级方案
- ✅ 创建统一模块加载器 (`lib/flomo/moduleLoader.ts`)
- ✅ 使用绝对物理路径直接穿透 Obsidian 的 require 劫持
- ✅ 支持多种安装方式：项目本地、插件目录、系统全局

**支持的安装路径**：
- **开发目录**: `E:\GitHub\flomo-to-obsidian\node_modules\playwright`
- **插件目录**: `{Vault}/.obsidian/plugins/flomo-importer/node_modules\playwright`
- **Windows 全局**: `%APPDATA%\npm\node_modules\playwright`
- **macOS 全局**: `/usr/local/lib/node_modules/playwright`
- **Linux 全局**: `/usr/local/lib/node_modules/playwright`
- **Homebrew**: `/opt/homebrew/lib/node_modules/playwright`
- **环境变量**: `NODE_PATH` 指定的路径

**技术亮点**：
- 🎯 编译期通过 esbuild `define` 注入开发路径
- 🎯 运行期自适应搜寻多个候选路径
- 🎯 惰性加载：仅在桌面端实际使用时才加载 Playwright
- 🎯 移动端零影响：永不触发 Node.js 模块加载

**调试支持**：
```typescript
// 在 lib/flomo/moduleLoader.ts 中设置
const DEBUG_MODULE_LOADER = true;  // 查看所有尝试的路径
```

### 📦 安装方式

### 🛡️ WAF 绕过与后台同步
- **智能 WAF 绕过**: 通过伪装标准 Chrome User-Agent 击败 Flomo 的新反机器人"403 Forbidden"检测
- **真正的静默同步**: 导出过程完全在后台运行，无需打开可见的浏览器窗口
- **调试模式**: 在设置中切换可见浏览器窗口和详细日志记录，便于故障排查

### 🏷️ 基于标签的过滤
- **选择性同步**: 选择仅同步包含特定标签的笔记（例如 `#工作 #重要`）
- 忽略其他笔记，保持您的 Obsidian vault 专注和整洁

### 📁 简化的附件结构
- **旧**: `flomo picture/file/2025-11-03/4852/filename.m4a` ❌
- **新**: `flomo attachment/2025-11-03/filename.m4a` ✅
- 更清晰、更扁平的目录结构
- 支持所有附件类型（图片、音频、视频）

### 🔄 智能内容更新检测
- 自动检测您在 Flomo 中编辑的笔记
- 无需手动干预即可重新导入更新的内容
- 无重复，只有最新版本

### 🗑️ 重置同步历史
- 设置中新增按钮以清除同步历史
- 在更改附件路径或重新导入时很有用
- 显示同步统计信息（上次同步时间、笔记数量）

### ⚙️ 动态路径配置
- 附件路径现在遵循您的"Flomo Home"设置
- 完全可根据您的偏好自定义

<br />

## 所有功能

### 🔄 同步功能
- ✅ `启动时自动同步` & `每小时自动同步` & `手动同步`
- ✅ **新增: 双通道架构（API 极速同步 + 传统 Playwright 兜底）**
- ✅ **新增: API 增量拉取（基于 slug + updated_at）**
- ✅ **新增: 删除同步（安全回收站策略）**
- ✅ **新增: 游标分页（10 分钟容错 + 200 条/页）**
- ✅ **新增: WebView 自动劫持 Token 鉴权**
- ✅ **新增: 基于标签的过滤（仅同步特定标签）**
- ✅ **新增: 智能 WAF 绕过以实现后台同步**
- ✅ **新增: 智能内容更新检测**

### 📤 推送功能
- ✅ **新增: Bearer Token 私有接口推送（免费用户）**
- ✅ **新增: Pro 会员 Webhook 推送（官方接口）**
- ✅ **新增: URL Scheme 移动端降级**
- ✅ **新增: 编辑器右键划词"发送到 Flomo"**
- ✅ **新增: Ribbon 快速输入面板**
- ✅ **新增: 配额防护（每日 100 条上限）**

### 🛠️ 技术增强
- ✅ **新增: 模块加载器重构（支持全局安装）**
- ✅ **新增: 路径归一化强制约束（跨平台兼容）**
- ✅ **新增: 定时器重配模式（避免并发）**
- ✅ **新增: 错误分类与友好提示**
- ✅ **新增: 429 指数退避（最多 5 次）**
- ✅ **新增: 同步互斥锁（防并发）**
- ✅ **新增: 进度反馈（300ms 节流）**

### 📁 文件管理
- ✅ **新增: 简化的附件结构**
- ✅ **新增: 重置同步历史按钮**
- ✅ 自定义目标导入位置
- ✅ 支持高亮标记
- ✅ 可选: 创建 `Flomo Canvas`（包含内容 | 文件链接）
- ✅ 可选: 创建 `Flomo Moments`

### 🧪 实验性功能
- ✅ 实验性: 支持笔记中的双向链接
- ✅ 实验性: 按日期合并笔记
- ✅ **新增: 用于故障排查的调试模式**

<br />

## 功能详解

此插件提供多种方式在 Obsidian 中导入和管理您的 Flomo 笔记：

### 多种同步方式

- **启动时自动同步**: 在设置中启用此选项，Obsidian 启动时自动同步
- **每小时自动同步**: 在设置中启用此选项，每小时自动后台同步
- **手动同步**:
  - **自动导出与导入**: 在插件 UI 中点击"立即同步"按钮。这使用 Playwright 登录 Flomo，导出您的笔记为 HTML，并导入它们
  - **手动导入**: 从 Flomo 网站自己导出笔记为 HTML（`flomo_backup.zip`），然后在插件 UI 中选择 zip 文件进行导入

### 增量同步
核心功能。插件智能识别并仅导入自上次同步以来的*新*笔记，防止重复。它会记住哪些笔记已被导入。

### 自定义导入位置
在 Obsidian vault 中指定导入 Flomo 笔记的目标文件夹（`Flomo Target`）和单个笔记的子文件夹（`Memo Target`）。

### 支持高亮标记
正确将 Flomo 的 `<mark>` 标签转换为 Obsidian 的 `==高亮==` 语法。

### Obsidian 集成

- **Flomo Canvas**: 可选生成 Obsidian Canvas 文件，可视化您的笔记，链接到笔记文件或直接嵌入内容
- **Flomo Moments**: 可选生成 `Flomo Moments.md` 文件，嵌入所有导入笔记文件的链接，提供按时间顺序的概览

### 实验性功能

- **双向链接支持**: 尝试在导入期间保留笔记内容中的 `[[wiki-links]]`
- **按日期合并笔记**: 选项将同一天的所有笔记合并到单个 Obsidian 笔记中，用 `---` 分隔

<br />

## 代码库结构

项目组织如下：

```
esbuild.config.mjs  # esbuild 的构建配置（将 TS 编译为 JS）
main.ts             # 插件入口点：加载设置、添加命令/图标、初始化 UI 和自动同步
manifest.json       # 插件元数据（名称、版本、作者等）
package.json        # 项目依赖和 npm 脚本（build、dev、version）
styles.css          # 插件 UI 的自定义 CSS 样式
versions.json       # 版本历史（由 BRAT 使用）
lib/                # 核心逻辑目录
  flomo/            # Flomo 特定功能
    auth.ts         # 处理认证逻辑（可能使用 Playwright）
    const.ts        # 定义常量（如缓存路径、文件名）
    core.ts         # 核心数据处理：解析 HTML、识别笔记、生成增量同步的 ID
    exporter.ts     # 处理从 Flomo 导出数据（使用 Playwright）
    importer.ts     # 处理导入数据到 Obsidian：读取文件、使用 FlomoCore、写入笔记
    moduleLoader.ts # 统一模块加载器（v2.5 新增）
  obIntegration/    # Obsidian 特定集成
    canvas.ts       # 生成 Flomo Canvas 文件的逻辑
    moments.ts      # 生成 Flomo Moments 文件的逻辑
  ui/               # 用户界面组件
    auth_ui.ts      # Flomo 认证的 UI 模态框
    common.ts       # 共享的 UI 辅助函数或组件
    main_ui.ts      # 主插件设置和操作 UI 模态框
    manualsync_ui.ts# 手动 zip 文件导入的 UI 部分/模态框
    message_ui.ts   # 显示消息/通知的 UI 组件
node_modules/       # 已安装的 npm 依赖
```

<br/>

## 同步逻辑详解

了解同步如何工作，特别是增量同步：

1. **触发**: 同步可以自动触发（启动时、每小时定时器通过 `main.ts`）或手动触发（在 `main_ui.ts` 中点击"立即同步"或使用"立即同步 Flomo"命令）

2. **导出（自动同步/立即同步按钮）**:
   - `FlomoExporter` 利用 Playwright（浏览器自动化工具）来：
     - 登录您的 Flomo 账户（使用可能安全存储的凭据）
     - 导航到导出页面
     - 下载完整备份为 HTML 文件（保存到 `const.ts` 中定义的位置，例如 `DOWNLOAD_FILE`）

3. **导入入口点**:
   - 实例化 `FlomoImporter` 类
   - 调用 `importFlomoFile` 方法，传递下载的 HTML 文件路径（`DOWNLOAD_FILE`）

4. **数据读取与解析**:
   - `FlomoImporter` 读取 HTML 文件内容
   - 它调用 `FlomoCore` 的构造函数，传递 HTML 数据和从插件保存的设置加载的已同步笔记 ID 列表（`this.settings.syncedMemoIds`）

5. **核心处理与增量识别（`FlomoCore`）**:
   - 构造函数解析 HTML 结构
   - `loadMemos` 方法遍历每个笔记元素（`<div class="memo">`）
   - **增量同步的关键**: 对于 HTML 中找到的*每个*笔记，生成一个唯一的 `memoId`。此 ID 基于以下组合：
     - 笔记的确切时间戳
     - 其内容的哈希（标题、正文、附件）
     - 具有*完全相同时间戳*的笔记的计数器（以区分它们）
     - 总体顺序计数器
   - 将此生成的 `memoId` 与从设置接收的 `syncedMemoIds` 列表进行比较
   - **如果 ID 不在列表中**: 它被视为**新笔记**。其 `memoId` 被添加到*实例的* `syncedMemoIds` 列表中，`newMemosCount` 递增，笔记的数据被添加到 `memos` 数组以进行处理
   - **如果 ID 在列表中**: 它被跳过

6. **写入 Obsidian（`FlomoImporter.importFlomoFile`）**:
   - 该方法从 `FlomoCore` 接收处理后的数据，包括*仅新识别的*笔记列表
   - 它按日期对这些新笔记进行分组
   - 根据"按日期合并笔记"设置，它将每个新笔记的内容（或合并的内容）写入 vault 中指定的 `Flomo Target` 和 `Memo Target` 文件夹内的适当文件路径
   - 如果启用，它可能会调用 `generateMoments` 和 `generateCanvas`

7. **状态保存（`main.ts`）**:
   - `importFlomoFile` 完成后，插件调用 `saveSettings()`
   - 这将更新的 `syncedMemoIds` 列表（现在包括新导入笔记的 ID）和当前的 `lastSyncTime` 保存回 Obsidian 的此插件的持久存储中。这确保*下一次*同步知道这些新添加的笔记

8. **通知**: 显示一个通知，指示找到了多少笔记以及新导入了多少笔记

这个详细的 ID 生成和检查过程是可靠增量同步的关键，确保只有新内容被添加到您的 Obsidian vault。

<br />

## 开发与修改指南

### 开发环境设置
1. 克隆仓库
2. 安装依赖：`npm install`
3. 安装 Playwright（必需）：`npx playwright@1.43.1 install`

### 修改模板和格式
如果需要修改导入的笔记格式或模板:
- 编辑 `lib/flomo/importer.ts` - 负责将 Flomo 笔记转换为 Obsidian 格式
- 编辑 `lib/obIntegration/moments.ts` - 修改 Moments 功能的显示方式
- 编辑 `lib/obIntegration/canvas.ts` - 修改 Canvas 展示格式

### 修改 UI
- UI 相关的修改主要集中在 `lib/ui/` 目录下
- 样式修改可以在 `styles.css` 文件中进行

### 构建项目
- 开发模式（实时编译）: `npm run dev`
- 生产构建: `npm run build`
- 构建后的文件为 `main.js`

### 版本管理
- 版本更新: `npm run version`
- 版本信息在 `manifest.json` 和 `versions.json` 中定义

### 部署到 Vault
```bash
# 编辑 deploy.sh 中的 VAULT_PATH
./deploy.sh
```

<br />

## 首次使用指南

### 安装依赖
- **Playwright（必需）**: `npx playwright@1.43.1 install`
- （此插件使用 1.43.1 版本预构建）

### 安装并启用插件
- 安装 `Flomo Importer` 并启用它

  <img width="225" alt="image" src="https://github.com/jia6y/flomo-to-obsidian/assets/1456952/88cff082-e33f-4671-ba24-7059c6bbce88">

- 使用命令 `Open Flomo Importer`，或使用 `Import Button`

  <img width="230" alt="image" src="https://github.com/jia6y/flomo-to-obsidian/assets/1456952/28a31eaa-921d-49cb-a633-984d06550792">

### 自动同步
- 点击"Auto Sync"

  <img width="350" alt="image" src="https://github.com/jia6y/flomo-to-obsidian/assets/1456952/71af02c3-9c14-4eec-b56f-d6207178ccd5">

- 如果是首次同步或当前登录已过期，需要进行身份验证

  <img width="350" alt="image" src="https://github.com/jia6y/flomo-to-obsidian/assets/1456952/7754586a-e9e2-40b7-93c1-0dbcc0631a1e">

- 导出与导入

  <img width="300" alt="image" src="https://github.com/jia6y/flomo-to-obsidian/assets/1456952/24910880-6201-497f-8359-191e476a5bed">

### 手动同步

#### 📦 从 Flomo 导出
- 进入 `账户详情`
- 选择 `导出全部（HTML 格式）`

  <img width="350" alt="image" src="https://github.com/jia6y/flomo-to-obsidian/assets/1456952/b6222501-b0e7-45f4-8acb-6b489c9b1fc0">

- 点击 `开始导出`

#### 🎯 导入到 Obsidian

- 选择 flomo.zip 进行导入。`Flomo & Memo Home` 是存储笔记的位置

- 导入完成时会弹出通知

- 查看 **Flomo Moments** 和 **Flomo Canvas** 🌅

  <img width="252" alt="image" src="https://github.com/jia6y/flomo-to-obsidian/assets/1456952/b1bd2399-87f1-4d60-80cf-111bbce8fe68">

### 📤 推送到 Flomo (私有 API)
1. 在插件设置的**推送配置**面板中，输入您的 Bearer Token 或 Webhook URL。
2. 点击 Obsidian 左侧侧边栏的 **Flomo 图标 (Ribbon)**，打开统一操作面板。
3. 在弹出窗口中切换至“推送”选项卡，输入支持 Markdown 的笔记内容及标签，一键发送至 Flomo。
4. 此外，您也可以在文档中选中文本，通过**右键菜单**选择“发送到 Flomo”。

<br />

## 🔄 从 1.x 版本升级到 2.0

如果您从旧版本升级，附件路径结构已更改。您有两个选项：

### 选项 A：全新重新导入（推荐）

1. 打开 Flomo Importer 设置
2. 点击 **"重置同步历史"** 按钮
3. 手动删除 vault 中的这些旧文件夹：
   - `[Flomo Home]/memos/`（例如 `flomo/memos/` 或 `10 flomo/memos/`）
   - `[Flomo Home]/flomo picture/`（如果存在）
4. 再次运行同步
5. 所有笔记和附件将使用新的、更清晰的结构重新导入

### 选项 B：保留现有笔记

1. 正常同步即可
2. 只有新笔记会使用新的附件结构导入
3. 旧笔记保留其旧的附件路径
4. 结果：混合结构，但不会出问题

**注意**: 内容更新检测自动工作。如果您在升级后在 Flomo 中编辑笔记，它将被检测并重新导入。

<br />

## 插件设置

2.6.0 版本引入了全新的**选项卡式设置界面**，包含以下主要分类：

- **通用存储**: 设置自动同步开关、频率，以及选择性同步的“标签过滤”。
- **拉取同步**: 配置 Flomo 笔记的导入目标文件夹（Target），以及是否开启“增量同步”和“检测删除同步”。
- **推送配置**: 配置 Markdown 私有 API 推送所需的 Bearer Token 或 Webhook，并可限制每日最大推送量。
- **实验性与高级**: 
  - **按日期合并笔记**及配套的**Thino 兼容模式**
  - **隐藏聚合同步标记**（默认开启，隐藏合并时的内部锚点）
  - **Canvas & Moments** 生成选项
  - 用于故障排查的**调试模式**和清除状态的**重置同步历史**

<br />

## 故障排查

### Playwright 加载失败

如果遇到 `Cannot find module 'playwright'` 错误：

1. **检查安装**:
   ```bash
   # 项目本地
   npm list playwright
   
   # 全局
   npm list -g playwright
   ```

2. **查看搜索路径**:
   - 在 `lib/flomo/moduleLoader.ts` 中设置 `DEBUG_MODULE_LOADER = true`
   - 重新编译：`npm run build`
   - 查看控制台输出的所有尝试路径

3. **推荐解决方案**:
   ```bash
   # 方案一：项目本地安装
   cd /path/to/flomo-to-obsidian
   npm install
   npx playwright install
   
   # 方案二：使用部署脚本
   ./deploy.sh  # 自动复制到插件目录
   
   # 方案三：全局安装（现已支持）
   npm install -g playwright@1.43.1
   npx playwright install
   ```

### 403 Forbidden 错误

- 确保在设置中启用了"调试模式"以查看详细错误
- 检查 Flomo 账户是否正常
- 尝试手动登录 Flomo 网站确认账户状态

### 附件路径问题

- 确保所有路径使用 `obsidian.normalizePath()` 归一化
- 检查 `Flomo Target` 设置是否正确
- 使用"重置同步历史"重新导入

<br />

## 致谢

此项目基于 [jia6y/flomo-to-obsidian](https://github.com/jia6y/flomo-to-obsidian) 进行了重大增强。

特别感谢：
- 原作者 jia6y 创建了这个优秀的插件
- [get-to-obsidian](https://github.com/your-repo/get-to-obsidian) 项目提供的模块加载器方案启发

<br />

## 许可证

MIT License - 详见 LICENSE 文件

<br />

## 贡献

欢迎提交 Issue 和 Pull Request！

---

**[English Version](README_EN.md)** | 中文版本
