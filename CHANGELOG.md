# Changelog

All notable changes to the Flomo Importer plugin will be documented in this file.

## [2.4.0] - 2026-02-22

### 🐛 Bug Fixes

#### 修复 Flomo 导出 403 Forbidden 错误
- **根因定位**: Flomo 服务器的 WAF (Web Application Firewall) 通过检测 User-Agent 中的 `HeadlessChrome` 字符串拦截 Playwright 无头浏览器
- **解决方案**: 在无头模式下自定义 User-Agent 为标准 Chrome UA，绕过 WAF 检测
- 导出过程恢复为真正的后台静默运行，无需弹出浏览器窗口

### ✨ New Features

#### 调试模式开关
- 在"实验性选项"中新增"开启调试模式"复选框，默认关闭
- **关闭时**: 后台静默运行，仅输出开始/完成两条日志
- **开启时**: 弹出可见浏览器窗口，输出每一步详细日志并自动保存关键步骤截图
- 错误截图始终保存，便于事后排查

### 🔧 Technical Improvements

#### 重构导出器日志系统
- 引入 `dbg()` 调试日志函数，由 `EXPORTER_DEBUG` 开关控制
- 抽取 `checkPageState()` / `debugScreenshot()` / `errorScreenshot()` 辅助方法，消除重复代码
- 增强错误检测：403 Forbidden / 登录页重定向 均有明确的错误提示

#### 新增测试脚本
- `tests/waf_bypass_test.js`: 验证 WAF 绕过方案是否有效
- `tests/ua_comparison.js`: 对比无头/有头模式下的 User-Agent 差异

## [2.0.0] - 2025-11-03

### ✨ Major Features

#### 🔇 Silent Background Sync
- **Headless browser mode**: Export process now runs silently in the background without opening visible browser windows
- Authentication still shows browser window for CAPTCHA/login when needed
- Significantly improves user experience during automatic sync operations

#### 📁 Simplified Attachment Structure
- **Flattened directory hierarchy**: Changed from complex 4-level to simple 2-level structure
  - Old: `flomo picture/file/2025-11-03/4852/filename.m4a`
  - New: `flomo attachment/2025-11-03/filename.m4a`
- Removed unnecessary `file/` directory layer
- Removed user ID directory layer (e.g., `4852/`)
- Renamed `flomo picture` to `flomo attachment` for clarity (supports all file types)
- Automatically handles attachment reference updates in memo markdown

#### ⚙️ Dynamic Path Configuration
- Attachment paths now respect the "Flomo Home" setting in plugin UI
- No more hardcoded paths - fully customizable based on user preferences
- Example: If Flomo Home is set to "10 flomo", attachments go to "10 flomo/flomo attachment/"

#### 🔄 Content Update Detection
- **Smart change detection**: Plugin now detects when memos are edited in Flomo
- Compares both timestamp AND content hash to identify updates
- Automatically re-imports updated memos without manual intervention
- Prevents duplicate imports while ensuring latest content is synced

#### 🗑️ Reset Sync History
- New "Reset Sync History" button in plugin settings UI
- Allows clearing all synced memo IDs to re-import entire Flomo database
- Useful when changing attachment paths or structure
- Shows confirmation dialog with clear warnings about file overwrites
- Displays current sync statistics (last sync time, synced memo count)

### 🐛 Bug Fixes

#### Fixed Attachment Reference Updates
- **Regex improvement**: Now correctly updates attachment references in memo content
- Previously only matched `![]()` with empty alt text
- Now matches `![any text]()` and preserves alt text
- Handles all attachment types (images, audio, video, etc.)

#### Fixed Variable Scope Issue
- Resolved compilation error in `copyAttachmentsRecursively()` method
- Moved `targetPath` variable declaration outside try-catch block for proper scoping

### 🔧 Technical Improvements

#### Refactored Attachment Copying
- New specialized method: `copyAttachmentsSkipUserIdDir()`
- Efficiently handles Flomo's 3-level export structure (date/userID/files)
- Flattens to 2-level vault structure (date/files)
- Skips empty directories to keep vault clean

#### Enhanced Incremental Sync Algorithm
- Improved memo ID generation for better uniqueness
- Format: `${timestamp}_${contentHash}_${occurrence}_${total}`
- Backward compatible with old ID formats from previous versions
- More reliable detection of duplicate vs. updated content

#### Better Debugging Support
- Enhanced console logging throughout sync process
- Shows attachment path decisions and file operations
- Helps troubleshoot sync issues

### 📝 Documentation
- Created comprehensive CLAUDE.md with project overview and architecture details
- Added deploy.sh script for easier local development workflow
- Improved inline code comments

### 🔄 Migration Notes

**If upgrading from 1.x to 2.0:**

1. **Attachment path has changed** - The plugin now uses `flomo attachment/` instead of `flomo picture/file/`
2. **You need to decide**: Keep old attachments or re-import?

   **Option A: Clean re-import (recommended)**
   - Click "Reset Sync History" button in plugin settings
   - Manually delete old folders:
     - `[Flomo Home]/memos/`
     - `[Flomo Home]/flomo picture/` (if exists)
   - Run sync again - all memos and attachments will be re-imported with new structure

   **Option B: Keep existing memos**
   - Just sync normally - only new memos will be imported
   - Old memos will keep old attachment paths
   - New memos will use new attachment paths
   - Mixed structure, but nothing breaks

3. **Content update detection**: If you edit a memo in Flomo after upgrading, it will be automatically detected and re-imported

### 🙏 Credits

This release includes significant improvements forked from [jia6y/flomo-to-obsidian](https://github.com/jia6y/flomo-to-obsidian).

Special thanks to the original author for creating this excellent plugin.

---

## [1.4.0] - Previous Releases

See git history for changes in versions 1.0.0 - 1.4.0.
