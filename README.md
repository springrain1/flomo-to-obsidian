# Flomo Importer Enhanced

##### ☕️ Make Flomo Memos to Obsidian Notes.

> **Version 2.4.4** - Enhanced fork from [jia6y/flomo-to-obsidian](https://github.com/jia6y/flomo-to-obsidian) with major improvements

**Author:** springrain | 公众号: 及时春雨  
**GitHub:** [https://github.com/springrain1](https://github.com/springrain1)

- Original Discussion: [Discussion](https://github.com/jia6y/flomo-to-obsidian/discussions)
<br />

<img width="500" alt="image" src="https://github.com/jia6y/flomo-to-obsidian/assets/1456952/bbbf6658-b93e-4b81-b087-0dd8687958ad">


<br/>
<br/>

<img width="550" alt="image" src="https://github.com/jia6y/flomo-to-obsidian/assets/1456952/14059ed5-6ae8-4d39-bbfc-a651e29b3a53">


<br />
<br />

## 🎉 What's New in Version 2.4

### �️ WAF Bypass & Background Sync
- **Smart WAF Bypass**: Defeats Flomo's new anti-bot "403 Forbidden" detection by spoofing standard Chrome User-Agents
- **True Silent Sync**: Export process runs completely in the background without opening visible browser windows
- **Debug Mode**: Toggle visible browser windows and verbose logging in settings when troubleshooting is needed

### 🏷️ Tag-Based Filtering
- **Selective Sync**: Choose to sync only memos containing specific tags (e.g., `#Work #Important`)
- Ignores other memos, keeping your Obsidian vault focused and clean

### 📁 Simplified Attachment Structure
- **Old:** `flomo picture/file/2025-11-03/4852/filename.m4a` ❌
- **New:** `flomo attachment/2025-11-03/filename.m4a` ✅
- Cleaner, flatter directory structure
- All attachment types supported (images, audio, video)

### 🔄 Smart Content Update Detection
- Automatically detects when you edit memos in Flomo
- Re-imports updated content without manual intervention
- No duplicates, just the latest version

### 🗑️ Reset Sync History
- New button in settings to clear sync history
- Useful when changing attachment paths or re-importing
- Shows sync statistics (last sync time, memo count)

### ⚙️ Dynamic Path Configuration
- Attachment paths now respect your "Flomo Home" setting
- Fully customizable based on your preferences

<br />

### All Features
- ✅ `Auto Sync On Startup` & `Hourly Auto Sync` & `Adhoc Sync`
- ✅ **NEW: Tag-Based Filtering (Sync only specific tags)**
- ✅ **NEW: Smart WAF Bypass for Background Sync**
- ✅ **NEW: Debug Mode for Troubleshooting**
- ✅ **NEW: Smart content update detection**
- ✅ **NEW: Simplified attachment structure**
- ✅ **NEW: Reset sync history button**
- ✅ Customize target import location
- ✅ Support highlight mark
- ✅ Optional: Create `Flomo Canvas` (with content | file link)
- ✅ Optional: Create `Flomo Moments`
- ✅ Experimental: Support Bi-directional Links in memos
- ✅ Experimental: Merge Memos by date

<br />

## 功能详解 (Features in Detail)

This plugin offers several ways to import and manage your Flomo notes within Obsidian:

- **多种同步方式 (Multiple Sync Methods):**
  - **启动时自动同步 (Auto Sync On Startup):** Enable this in settings to automatically sync when Obsidian starts.
  - **每小时自动同步 (Hourly Auto Sync):** Enable this in settings for automatic background sync every hour.
  - **手动同步 (Adhoc Sync / Manual Sync):**
    - **自动导出与导入 (Auto Export & Import):** Click the "Sync Now" button in the plugin UI. This uses Playwright to log in to Flomo, export your notes as HTML, and import them.
    - **手动导入 (Manual Import):** Export your notes as HTML (`flomo_backup.zip`) from the Flomo website yourself, then select the zip file in the plugin UI to import.
- **增量同步 (Incremental Sync):** The core feature. The plugin intelligently identifies and imports only *new* memos since the last sync, preventing duplicates. It remembers which memos have been imported.
- **自定义导入位置 (Customizable Import Location):** Specify the target folder in your Obsidian vault for imported Flomo notes (`Flomo Target`) and a subfolder for individual memos (`Memo Target`).
- **支持高亮标记 (Highlight Support):** Correctly converts Flomo's `<mark>` tags to Obsidian's `==highlight==` syntax.
- **Obsidian 集成 (Obsidian Integrations):**
  - **Flomo Canvas:** Optionally generates an Obsidian Canvas file visualizing your memos, either linking to the memo files or embedding the content directly.
  - **Flomo Moments:** Optionally generates a `Flomo Moments.md` file that embeds links to all imported memo files, providing a chronological overview.
- **实验性功能 (Experimental Features):**
  - **双向链接支持 (Bi-directional Link Support):** Attempts to preserve `[[wiki-links]]` within your memo content during import.
  - **按日期合并笔记 (Merge Memos by Date):** Option to merge all memos from the same day into a single Obsidian note, separated by `---`.

<br />

## 代码库结构 (Codebase Structure)

The project is organized as follows:

```
esbuild.config.mjs  # Build configuration for esbuild (compiles TS to JS)
main.ts             # Plugin entry point: loads settings, adds commands/icons, initializes UI and auto-sync
manifest.json       # Plugin metadata (name, version, author, etc.)
package.json        # Project dependencies and npm scripts (build, dev, version)
styles.css          # Custom CSS styles for the plugin UI
versions.json       # Version history (used by BRAT)
lib/                # Core logic directory
  flomo/            # Flomo-specific functionalities
    auth.ts         # Handles authentication logic (likely using Playwright)
    const.ts        # Defines constants (like cache paths, filenames)
    core.ts         # Core data processing: parses HTML, identifies memos, generates IDs for incremental sync
    exporter.ts     # Handles exporting data from Flomo (using Playwright)
    importer.ts     # Handles importing data into Obsidian: reads files, uses FlomoCore, writes notes
  obIntegration/    # Obsidian-specific integrations
    canvas.ts       # Logic for generating the Flomo Canvas file
    moments.ts      # Logic for generating the Flomo Moments file
  ui/               # User Interface components
    auth_ui.ts      # UI modal for Flomo authentication
    common.ts       # Shared UI helper functions or components
    main_ui.ts      # Main plugin settings and action UI modal
    manualsync_ui.ts# UI section/modal for manual zip file import
    message_ui.ts   # UI components for displaying messages/notices
node_modules/       # Installed npm dependencies
```

<br/>

## 同步逻辑详解 (Synchronization Logic Explained)

Understanding how synchronization works, especially incrementally:

1.  **触发 (Trigger):** Sync can be triggered automatically (on startup, hourly timer via `main.ts`) or manually (clicking "Sync Now" in `main_ui.ts` or using the "Sync Flomo Now" command).
2.  **导出 (Export - Auto Sync/Sync Now Button):**
    *   The `FlomoExporter` utilizes Playwright (a browser automation tool) to:
        *   Log in to your Flomo account (using credentials potentially stored securely).
        *   Navigate to the export page.
        *   Download the full backup as an HTML file (saved to a location defined in `const.ts`, e.g., `DOWNLOAD_FILE`).
3.  **导入入口 (Import Entry Point):**
    *   The `FlomoImporter` class is instantiated.
    *   The `importFlomoFile` method is called, passing the path to the downloaded HTML file (`DOWNLOAD_FILE`).
4.  **数据读取与解析 (Data Reading & Parsing):**
    *   `FlomoImporter` reads the HTML file content.
    *   It calls `FlomoCore`'s constructor, passing the HTML data and the list of already synced memo IDs (`syncedMemoIds`) loaded from the plugin's saved settings (`this.settings.syncedMemoIds`).
5.  **核心处理与增量识别 (`FlomoCore`):**
    *   The constructor parses the HTML structure.
    *   The `loadMemos` method iterates through each memo element (`<div class="memo">`).
    *   **Crucially for Incremental Sync:** For *each* memo found in the HTML, a unique `memoId` is generated. This ID is based on a combination of:
        *   The memo's exact timestamp.
        *   A hash of its content (title, body, attachments).
        *   A counter for memos with the *exact same timestamp* (to differentiate them).
        *   An overall sequential counter.
    *   This generated `memoId` is compared against the `syncedMemoIds` list received from the settings.
    *   **If the ID is NOT in the list:** It's considered a **new memo**. Its `memoId` is added to the *instance's* `syncedMemoIds` list, `newMemosCount` is incremented, and the memo's data is added to the `memos` array to be processed.
    *   **If the ID IS in the list:** It's skipped.
6.  **写入 Obsidian (`FlomoImporter.importFlomoFile`):**
    *   The method receives the processed data from `FlomoCore`, including the list of *only the newly identified* memos.
    *   It groups these new memos by date.
    *   Based on the "Merge Memos by Date" setting, it writes the content of each new memo (or merged content) to the appropriate file path within the specified `Flomo Target` and `Memo Target` folders in your vault.
    *   It potentially calls `generateMoments` and `generateCanvas` if enabled.
7.  **状态保存 (State Saving - `main.ts`):**
    *   After `importFlomoFile` completes, the plugin calls `saveSettings()`.
    *   This saves the updated `syncedMemoIds` list (which now includes the IDs of the newly imported memos) and the current `lastSyncTime` back into Obsidian's persistent storage for this plugin. This ensures the *next* sync knows about these newly added memos.
8.  **通知 (Notification):** A notice is displayed indicating how many memos were found and how many were newly imported.

This detailed ID generation and checking process is the key to reliable incremental synchronization, ensuring only new content is added to your Obsidian vault.

<br />

## 开发与修改指南

### 开发环境设置
1. 克隆仓库
2. 安装依赖：`npm install`
3. 安装Playwright (必需)：`npx playwright@1.43.1 install`

### 修改模板和格式
如果需要修改导入的笔记格式或模板:
- 编辑 `lib/flomo/importer.ts` - 负责将Flomo笔记转换为Obsidian格式
- 编辑 `lib/obIntegration/moments.ts` - 修改Moments功能的显示方式
- 编辑 `lib/obIntegration/canvas.ts` - 修改Canvas展示格式

### 修改UI
- UI相关的修改主要集中在 `lib/ui/` 目录下
- 样式修改可以在 `styles.css` 文件中进行

### 构建项目
- 开发模式 (实时编译): `npm run dev`
- 生产构建: `npm run build`
- 构建后的文件为 `main.js`

### 版本管理
- 版本更新: `npm run version`
- 版本信息在 `manifest.json` 和 `versions.json` 中定义

<br />

### First time to use it?

#### Install Dependency
  - **Playwright (MUST HAVE) :** `npx playwright@1.43.1 install`
  - (this plugin was pre-built with version 1.43.1)

#### Install And Enable the plugin
  - Install `Flomo Importer` and enable it.

    <img width="225" alt="image" src="https://github.com/jia6y/flomo-to-obsidian/assets/1456952/88cff082-e33f-4671-ba24-7059c6bbce88">
  
  - Use the command `Open Flomo Importer`, or use `Import Button`
    
    <img width="230" alt="image" src="https://github.com/jia6y/flomo-to-obsidian/assets/1456952/28a31eaa-921d-49cb-a633-984d06550792">

#### Auto Sync
  - Click on "Auto Sync"

    <img width="350" alt="image" src="https://github.com/jia6y/flomo-to-obsidian/assets/1456952/71af02c3-9c14-4eec-b56f-d6207178ccd5">

  - Authentication is required if the first time syncs or the current sign-in expires.

    <img width="350" alt="image" src="https://github.com/jia6y/flomo-to-obsidian/assets/1456952/7754586a-e9e2-40b7-93c1-0dbcc0631a1e">

  - Exporting & Importing

    <img width="300" alt="image" src="https://github.com/jia6y/flomo-to-obsidian/assets/1456952/24910880-6201-497f-8359-191e476a5bed">



#### Adhoc Sync

###### 📦 **Export from Flomo**
  - Go to `Account Details` 
  - Select `Export All (as HTML)`
    
    <img width="350" alt="image" src="https://github.com/jia6y/flomo-to-obsidian/assets/1456952/b6222501-b0e7-45f4-8acb-6b489c9b1fc0">

  - Click on `Start to export`

###### 🎯 **Import to Obsidian**

  - Choose flomo.zip to Import. The `Flomo & Memo Home` is where to store your memos.

  - A Notice pops up when the import is completed.
    
  - Checkout **Flmomo Moments** and **Flomo Canvas** 🌅

    <img width="252" alt="image" src="https://github.com/jia6y/flomo-to-obsidian/assets/1456952/b1bd2399-87f1-4d60-80cf-111bbce8fe68">

## 🔄 Upgrading from Version 1.x to 2.0

If you're upgrading from an older version, the attachment path structure has changed. You have two options:

### Option A: Clean Re-import (Recommended)

1. Open Flomo Importer settings
2. Click the **"Reset Sync History"** button
3. Manually delete these old folders in your vault:
   - `[Flomo Home]/memos/` (e.g., `flomo/memos/` or `10 flomo/memos/`)
   - `[Flomo Home]/flomo picture/` (if exists)
4. Run sync again
5. All memos and attachments will be re-imported with the new, cleaner structure

### Option B: Keep Existing Memos

1. Just sync normally
2. Only new memos will be imported with the new attachment structure
3. Old memos keep their old attachment paths
4. Result: Mixed structure, but nothing breaks

**Note:** Content update detection works automatically. If you edit a memo in Flomo after upgrading, it will be detected and re-imported.

<br />

## Plugin Settings

You can customize the following options in the plugin settings page:

- **Auto Sync On Startup**: Automatically sync when Obsidian is launched.
- **Auto Sync Interval**: Automatically sync every hour.
- **Incremental Sync**: Skip already imported memos and only import new ones.
- **Merge Memos by Date**: Merge multiple memos from the same day into a single file.
- **Flomo Target**: Folder in Obsidian vault to store Flomo memos (default: `flomo`).
- **Memo Target**: Subfolder under Flomo folder to store individual memos (default: `memos`).
- **Canvas & Moments Options**: Select display options for Flomo Canvas and Moments.
- **Reset Sync History**: Clear all synced memo IDs to re-import all memos (useful after changing paths).






