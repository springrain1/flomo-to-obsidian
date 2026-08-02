# Changelog

All notable changes to the Flomo Importer plugin will be documented in this file.

---

## [2.6.0] - 2026-08-01

### ✨ New Features

#### 📤 New Markdown Private API Push
- **Fixed YAML Time Format**: Corrected the YAML Frontmatter time format when pushing to Flomo to ensure accurate time metadata.
- **Optimized Thino Compatibility for Merged Memos**: For the existing "Merge Memos by Date" feature, converted the paired `%%flomo:slug%%` markers into HTML comments, preventing them from cluttering the reading view and ensuring perfect Thino rendering compatibility.
- **Hide Aggregate Sync Markers**: Added a CodeMirror editor extension with a "Hide aggregate sync markers" toggle (enabled by default) to smartly hide sync metadata markers in the editor.

#### 🎨 UI Refactoring & Enhancements
- **Redesigned Settings UI**: Completely redesigned the plugin settings interface using a tabbed layout. Grouped complex configurations and provided inline options, greatly improving readability.
- **Unified Ribbon Action Modal**: Introduced a unified ribbon action modal that integrates tasks like API sync and ZIP file import into a centralized action panel.

### 🛠️ New Flomo UI Adaptation & Fixes
- **Updated Tag-Filtered ZIP Export Flow**: Adapted to the new Flomo search UI — export via the "Search" breadcrumb dropdown menu, and compatible with the new confirmation dialog ("Only export memos in current search results").
- **Updated Full ZIP Export Flow**: Adapted to the new settings UI via user menu → Settings → Import/Export → Export Memos → Export.
- **Click Interception Hardening**: Added a `safeClick` fallback that falls back to DOM clicks when overlay layers intercept pointer events; search box focus no longer depends on pointer clicks.
- **Fixed Blank Sync Channel Dropdown**: Unified the pull-channel option keys (`web` → `traditional`) across both entry points and auto-migrates legacy stored values.

---

## [2.5.0] - 2026-05-27

### 🚀 Major Updates

#### 🎯 Dual-Channel Architecture — Flomo API Fast Sync + Traditional Playwright Fallback

This version implements a complete dual-channel read/write architecture, adding Flomo private API-based fast sync capabilities while preserving the traditional Playwright/ZIP import channel.

**Core Architecture**:
- ✅ **Pull Dual-Channel**:
  - Channel 1: Playwright/ZIP traditional physical import (fallback)
  - Channel 2: API fast incremental sync (primary)
  
- ✅ **Push Dual-Channel**:
  - Channel 1: Bearer Token private API push (free users)
  - Channel 2: Pro member Webhook push

**New Core Modules** (`lib/flomo/api/`):
- `types.ts` — Type definitions (FlomoMemo, FlomoFile, SyncSession, SyncResult)
- `signer.ts` — MD5 signature algorithm (dictionary order + Salt `dbbc3dd73364b4084c3a69346e0ce2b2`)
- `client.ts` — API client (429 backoff, AbortSignal, testConnection)
- `sync.ts` — Incremental sync engine (cursor pagination, deduplication, delete sync)
- `renderer.ts` — Markdown renderer (YAML frontmatter + HTML→MD)
- `downloader.ts` — Attachment downloader (images, audio, video)
- `pusher.ts` — Push service (Token/Webhook/URL Scheme three-level fallback)
- `sync-lock.ts` — Sync mutex lock (prevent concurrency)
- `quota.ts` — Quota protection (daily 100-item limit)
- `uid-index.ts` — Full Vault slug index (based on metadataCache)
- `error.ts` — Error classification (auth/quota/network/unknown)
- `path-utils.ts` — Path utilities (force normalizePath)
- `backlink-index.ts` — Backlink index
- `backlink-rewriter.ts` — Backlink rewriter
- `date-format.ts` — Date formatting
- `merge-writer.ts` — Merge writer

**New UI Components**:
- `lib/ui/login_modal.ts` — WebView auto Token hijacking login (desktop) + manual input (mobile)
- `lib/ui/push_modal.ts` — Ribbon quick input panel

**Settings Extension**:
```typescript
interface MyPluginSettings {
  // New fields
  pullChannel: "traditional" | "api";  // Pull channel selection
  flomoApiToken: string;               // Bearer Token
  pushChannel: "token" | "webhook" | "urlscheme";
  webhookUrl: string;                  // Pro Webhook URL
  dailyPushCount: number;              // Daily push count
  lastPushDate: string;                // Last push date
  autoSyncIntervalMinutes: number;     // Auto sync interval (minutes)
  enableSyncDelete: boolean;           // Enable delete sync
  lastPullUpdatedAt: string;           // Last pull timestamp
  lastPullSlug: string;                // Last pull slug
  enableBacklinks: boolean;            // Enable backlinks
  backlinkLinkStyle: 'wikilink' | 'markdown';
}
```

**Technical Highlights**:
- 🎯 **Incremental Sync**: Smart deduplication based on `slug` primary key + `updated_at` timestamp
- 🎯 **Cursor Pagination**: 10-minute fault tolerance buffer + 200 items/page auto-pagination
- 🎯 **Safe Deletion**: Recycle bin strategy (`app.vault.trash`), recoverable
- 🎯 **Quota Protection**: Local interception of Webhook daily 100-item limit
- 🎯 **Three-Level Fallback**: Token → Webhook → URL Scheme automatic fallback
- 🎯 **Zero New Dependencies**: Fully based on Obsidian built-in API + existing dependencies

#### 🔧 Module Loader Refactoring — Fixed Playwright Loading Issues

- **Root Cause**: Obsidian's Electron renderer process hijacks the native `require` function, causing conventional module path resolution to fail completely
  
- **Solution**: Inspired by the `get-to-obsidian` project's advanced approach, created a unified module loader
  
- **Core Mechanism**:
  - Use `eval('require')` to bypass TypeScript static analysis
  - Build multiple candidate absolute paths (dev directory, plugin directory, global installation paths)
  - Use absolute physical paths to directly penetrate Obsidian's require hijacking
  - Inject development path at compile time via esbuild `define`

- **Supported Global Paths**:
  - **Windows**: `%APPDATA%\npm\node_modules`, `%ProgramFiles%\nodejs\node_modules`, NVM paths
  - **macOS**: `/usr/local/lib/node_modules`, `/opt/homebrew/lib/node_modules`
  - **Linux**: `/usr/local/lib/node_modules`, `/usr/lib/node_modules`
  - **Environment Variables**: Paths specified by `NODE_PATH`

- **New Files**:
  - `lib/flomo/moduleLoader.ts` — Unified module loader, supports `getPlaywright()`, `getFsExtra()`, `getPath()`, `getOs()`
  - Debug mode switch `DEBUG_MODULE_LOADER` to view all attempted paths

- **Modified Files**:
  - `lib/flomo/auth.ts` — Use `getPlaywright()` and `getFsExtra()` for lazy loading
  - `lib/flomo/exporter.ts` — Use `getPlaywright()` for lazy loading
  - `lib/flomo/const.ts` — Use `getPath()` and `getOs()` for loading
  - `esbuild.config.mjs` — Add `define: { 'BUILD_DEV_DIR': JSON.stringify(process.cwd()) }`

### ✨ New Features

#### 🔐 WebView Auto Token Hijacking
- **Desktop**: Embedded Electron `<webview>` renders Flomo login page, automatically hijacks `localStorage` to extract Token
- **Mobile Fallback**: Manual Token input + test connection button
- **Fallback Entry**: Desktop also provides collapsible manual input panel

#### 📡 API Incremental Pull
- **MD5 Signature**: Parameter dictionary order + Salt concatenation + MD5 hash
- **Cursor Pagination**: `latest_updated_at` - 600s + `latest_slug` joint cursor
- **Smart Deduplication**: Local `Set<slug>` deduplication + timestamp comparison
- **Delete Sync**: Detect `deleted_at` field, safely move to recycle bin

#### 📤 Bidirectional Push
- **Token Push**: Free users push via Bearer Token private API
- **Webhook Push**: Pro members use official Webhook (supports Markdown format)
- **URL Scheme**: Mobile fallback, wake up Flomo App
- **Quota Protection**: Local interception of daily 100-item limit

#### 🎨 UI Enhancements
- **Channel Switcher**: Main UI top displays pull channel selection (Traditional/API)
- **Context Menu**: Editor selection "Send to Flomo"
- **Ribbon Panel**: Quick input panel (text + tags + send)
- **Progress Feedback**: 300ms throttling + detailed statistics (success/update/skip/delete/fail)

#### 🔗 Backlink Rewriting
- **Auto Rewrite**: Converts Flomo URL references (`https://v.flomoapp.com/mine/?memo_id=XXX`) to Obsidian internal links
- **Link Style**: Supports Wikilink `[[path|text]]` and Markdown `[text](path.md)` formats
- **Zero IO**: Reuses metadata cache index, no additional file reads

### 🔧 Technical Improvements

#### Shared Turndown Configuration
- Extracted `createFlomoTurndown()` from `core.ts` as shared function
- API channel and traditional channel use the same HTML→Markdown conversion rules
- Preserve highlights (`<mark>` → `==`), paragraphs, lists, etc.

#### Path Normalization Enforcement
- All Vault paths must be processed through `obsidian.normalizePath()`
- Prevent Windows backslash and mobile forward slash confusion
- Ensure WikiLinks `![[]]` work properly on all platforms

#### Timer Reconfiguration Mode
- Clear old interval handle before registering new one when modifying sync interval
- Avoid concurrent sync caused by timer stacking
- Use `Plugin.registerInterval()` to manage lifecycle

#### Error Classification and Friendly Prompts
- `classifyError()` automatically identifies error types (auth/quota/network/unknown)
- Targeted prompts: Token expired, quota exhausted, network error, etc.
- 429 exponential backoff: Maximum 5 times, single maximum 30 seconds

### 🐛 Bug Fixes

- ✅ Fixed `Cannot find module 'playwright'` error
- ✅ Fixed module resolution failure caused by Obsidian renderer process require hijacking
- ✅ Fixed cross-drive path search failure (Windows)
- ✅ Fixed export button selector (no longer depends on dynamic hash class)
- ✅ Fixed confirm button selector (supports multiple dialog types)

### 📝 Documentation Updates

- Added `get_to_obsidian_packaging_experience.md` — Detailed engineering experience on Obsidian cross-platform plugin packaging and sandbox require penetration

### 🔍 Debugging Support

- Set `DEBUG_MODULE_LOADER = true` to view all candidate path attempts in the console
- Display the actual path used when successfully loaded

### ⚠️ Important Notes

- **Recommended Installation**: 
  - Local project installation (via `npm install`)
  - Or use `deploy.sh` script to copy to plugin directory
  
- **Global Installation Support**:
  - Now supports `npm install -g playwright` global installation
  - Module loader will automatically search and find globally installed playwright

---

## [2.4.0] - 2026-02-22

### 🐛 Bug Fixes

#### Fixed Flomo Export 403 Forbidden Error

- **Root Cause**: Flomo server's WAF (Web Application Firewall) blocks Playwright headless browser by detecting `HeadlessChrome` string in User-Agent
  
- **Solution**: Customize User-Agent to standard Chrome UA in headless mode to bypass WAF detection
  
- Export process restored to true background silent operation without opening browser windows

### ✨ New Features

#### Debug Mode Toggle
- Added "Enable Debug Mode" checkbox in "Experimental Options", disabled by default
- **When Disabled**: Background silent operation, only outputs start/complete logs
- **When Enabled**: Opens visible browser window, outputs detailed logs for each step and automatically saves screenshots of key steps
- Error screenshots are always saved for post-mortem analysis

### 🔧 Technical Improvements

#### Refactored Exporter Logging System
- Introduced `dbg()` debug logging function, controlled by `EXPORTER_DEBUG` switch
- Extracted `checkPageState()` / `debugScreenshot()` / `errorScreenshot()` helper methods, eliminating duplicate code
- Enhanced error detection: 403 Forbidden / login page redirect both have clear error messages

#### New Test Scripts
- `tests/waf_bypass_test.js`: Verify if WAF bypass solution is effective
- `tests/ua_comparison.js`: Compare User-Agent differences between headless/headed modes

---

## [2.0.0] - 2025-11-03

### ✨ Major Features

#### 🔇 Silent Background Sync
- **Headless Browser Mode**: Export process now runs silently in the background without opening visible browser windows
- Authentication still shows browser window for CAPTCHA/login when needed
- Significantly improves user experience during automatic sync operations

#### 📁 Simplified Attachment Structure
- **Flattened Directory Hierarchy**: Changed from complex 4-level to simple 2-level structure
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
- **Smart Change Detection**: Plugin now detects when memos are edited in Flomo
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
- **Regex Improvement**: Now correctly updates attachment references in memo content
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
