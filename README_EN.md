# Flomo Importer

##### ☕️ Import Flomo Memos to Obsidian Notes

> **Version 2.6.0** - Enhanced fork from [jia6y/flomo-to-obsidian](https://github.com/jia6y/flomo-to-obsidian) with major improvements

- Original Discussion: [Discussion](https://github.com/jia6y/flomo-to-obsidian/discussions)

<br />

<img width="500" alt="image" src="https://github.com/jia6y/flomo-to-obsidian/assets/1456952/bbbf6658-b93e-4b81-b087-0dd8687958ad">

<br/>
<br/>

<img width="550" alt="image" src="https://github.com/jia6y/flomo-to-obsidian/assets/1456952/14059ed5-6ae8-4d39-bbfc-a651e29b3a53">

<br />
<br />

## 🎉 What's New in Version 2.6.0

### 📤 New Markdown Private API Push
- **Fixed YAML Time Format**: Corrected the YAML time format when pushing to Flomo.
- **Optimized Thino Compatibility**: For the "Merge Memos by Date" feature, converted markers into HTML comments.
- **Hide Aggregate Sync Markers**: Added a CodeMirror extension (enabled by default) to smartly hide sync metadata markers.

### 🎨 UI Refactoring & Enhancements
- **Redesigned Settings UI**: Adopted a tabbed layout for settings to group complex configurations.
- **Unified Action Panel**: Introduced a ribbon action modal integrating API sync and ZIP import tasks.

### 🛠️ New Flomo UI Adaptation
- **Tag-Filtered ZIP Export**: Adapted to the new search UI — export via the "Search" breadcrumb dropdown and the new confirmation dialog.
- **Full ZIP Export**: Adapted to the new settings navigation (user menu → Settings → Import/Export → Export Memos).
- **Click Hardening**: Automatically falls back to DOM clicks when overlay layers intercept pointer events, making exports more reliable.
- **Fixed Blank Sync Channel Dropdown**: Unified pull-channel option keys and auto-migrated legacy values.

---

## 🎉 What's New in Version 2.5

### 🎯 Dual-Channel Architecture — API Fast Sync + Traditional Playwright Fallback

**Major Architecture Upgrade**: This version adds Flomo private API-based fast sync capabilities while preserving the traditional Playwright/ZIP import, implementing a true dual-channel read/write architecture.

#### 📥 Pull Dual-Channel (Flomo → Obsidian)

**Channel 1: Traditional Playwright/ZIP Physical Import (Fallback)**
- Uses browser automation to export complete HTML backup
- Suitable for first-time import or safe fallback when API fails
- Supports offline ZIP file manual import

**Channel 2: API Fast Incremental Sync (Primary)** ⭐
- Incremental pull based on Flomo private API
- Smart deduplication: Only syncs new or updated memos
- Cursor pagination: Automatically handles large numbers of memos
- Delete sync: Detects remote deletion, safely moves to local recycle bin
- Attachment download: Automatically downloads images, audio, video

**Core Features**:
- ✅ **MD5 Signature Authentication**: Reverse-engineered Flomo web signature algorithm
- ✅ **Incremental Sync**: Based on `slug` primary key + `updated_at` timestamp
- ✅ **Cursor Pagination**: 10-minute fault tolerance buffer + 200 items/page auto-pagination
- ✅ **Safe Deletion**: Recycle bin strategy, recoverable
- ✅ **YAML Frontmatter**: Includes slug, created, modified, source, tags

#### 📤 Push Dual-Channel (Obsidian → Flomo)

**Channel 1: Bearer Token Private API Push (Free Users)**
- Uses hijacked Token to directly call Flomo private API
- No Pro membership required for push
- Supports Markdown format (bold, lists, etc.)

**Channel 2: Pro Member Webhook Push (Official API)** ⭐
- Uses Flomo official Webhook API
- Stable and reliable, officially supported
- Supports `content_type: "markdown"` format
- Local quota protection: Daily 100-item limit interception

**Channel 3: URL Scheme Fallback (Mobile)**
- Wakes up Flomo App to fill in content
- Suitable for offline or unconfigured Token scenarios
- Supports image URL array (up to 9 images)

**Interaction Methods**:
- 🖱️ Editor context menu "Send to Flomo"
- 🎨 Ribbon quick input panel
- ⌨️ Command palette shortcuts

#### 🔐 WebView Auto Token Hijacking

**Desktop**:
- Embedded Electron `<webview>` renders Flomo login page
- Automatically hijacks `localStorage` to extract Bearer Token
- No manual copy-paste, one-click authentication

**Mobile Fallback**:
- Manual Token input text box
- "Test Connection" button to verify validity
- Displays user nickname to confirm successful connection

**Fallback Entry**:
- Desktop also provides collapsible manual input panel
- Suitable for webview loading failure or Flomo site redesign scenarios

### 🔧 Module Loader Refactoring — Fixed Playwright Loading Issues

**Background**:
- Obsidian's Electron renderer process hijacks the native `require` function
- Conventional `module.paths` modifications are completely ineffective
- Plugin cannot find `node_modules/playwright`, throwing `Cannot find module 'playwright'` error

**Solution**:
- ✅ Inspired by the `get-to-obsidian` project's advanced approach
- ✅ Created unified module loader (`lib/flomo/moduleLoader.ts`)
- ✅ Uses absolute physical paths to directly penetrate Obsidian's require hijacking
- ✅ Supports multiple installation methods: project local, plugin directory, system global

**Supported Installation Paths**:
- **Development Directory**: `E:\GitHub\flomo-to-obsidian\node_modules\playwright`
- **Plugin Directory**: `{Vault}/.obsidian/plugins/flomo-importer/node_modules\playwright`
- **Windows Global**: `%APPDATA%\npm\node_modules\playwright`
- **macOS Global**: `/usr/local/lib/node_modules/playwright`
- **Linux Global**: `/usr/local/lib/node_modules/playwright`
- **Homebrew**: `/opt/homebrew/lib/node_modules/playwright`
- **Environment Variable**: Paths specified by `NODE_PATH`

**Technical Highlights**:
- 🎯 Compile-time path injection via esbuild `define`
- 🎯 Runtime adaptive search across multiple candidate paths
- 🎯 Lazy loading: Playwright only loads when actually used on desktop
- 🎯 Zero impact on mobile: Never triggers Node.js module loading

**Debug Support**:
```typescript
// Set in lib/flomo/moduleLoader.ts
const DEBUG_MODULE_LOADER = true;  // View all attempted paths
```

### 📦 Installation Methods

**Method 1: Local Project Installation (Recommended)**
```bash
npm install
npx playwright@1.43.1 install
```

**Method 2: Global Installation (Now Supported)**
```bash
npm install -g playwright@1.43.1
npx playwright install
```

**Method 3: Using Deployment Script**
```bash
npm run build
./deploy.sh  # Automatically copies playwright to plugin directory
```

---

## 🎉 Version 2.4 Features

### 🛡️ WAF Bypass & Background Sync
- **Smart WAF Bypass**: Defeats Flomo's new anti-bot "403 Forbidden" detection by spoofing standard Chrome User-Agents
- **True Silent Sync**: Export process runs completely in the background without opening visible browser windows
- **Debug Mode**: Toggle visible browser windows and verbose logging in settings when troubleshooting is needed

### 🏷️ Tag-Based Filtering
- **Selective Sync**: Choose to sync only memos containing specific tags (e.g., `#Work #Important`)
- Ignores other memos, keeping your Obsidian vault focused and clean

### 📁 Simplified Attachment Structure
- **Old**: `flomo picture/file/2025-11-03/4852/filename.m4a` ❌
- **New**: `flomo attachment/2025-11-03/filename.m4a` ✅
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

## All Features

- ✅ `Auto Sync On Startup` & `Hourly Auto Sync` & `Manual Sync`
- ✅ **NEW: Tag-Based Filtering (Sync only specific tags)**
- ✅ **NEW: Smart WAF Bypass for Background Sync**
- ✅ **NEW: Debug Mode for Troubleshooting**
- ✅ **NEW: Smart content update detection**
- ✅ **NEW: Simplified attachment structure**
- ✅ **NEW: Reset sync history button**
- ✅ **NEW: Module loader refactoring (Global installation support)**
- ✅ Customize target import location
- ✅ Support highlight mark
- ✅ Optional: Create `Flomo Canvas` (with content | file link)
- ✅ Optional: Create `Flomo Moments`
- ✅ Experimental: Support Bi-directional Links in memos
- ✅ Experimental: Merge Memos by date

<br />

## Features in Detail

This plugin offers several ways to import and manage your Flomo notes within Obsidian:

### Multiple Sync Methods

- **Auto Sync On Startup**: Enable this in settings to automatically sync when Obsidian starts
- **Hourly Auto Sync**: Enable this in settings for automatic background sync every hour
- **Manual Sync**:
  - **Auto Export & Import**: Click the "Sync Now" button in the plugin UI. This uses Playwright to log in to Flomo, export your notes as HTML, and import them
  - **Manual Import**: Export your notes as HTML (`flomo_backup.zip`) from the Flomo website yourself, then select the zip file in the plugin UI to import

### Incremental Sync
The core feature. The plugin intelligently identifies and imports only *new* memos since the last sync, preventing duplicates. It remembers which memos have been imported.

### Customizable Import Location
Specify the target folder in your Obsidian vault for imported Flomo notes (`Flomo Target`) and a subfolder for individual memos (`Memo Target`).

### Highlight Support
Correctly converts Flomo's `<mark>` tags to Obsidian's `==highlight==` syntax.

### Obsidian Integrations

- **Flomo Canvas**: Optionally generates an Obsidian Canvas file visualizing your memos, either linking to the memo files or embedding the content directly
- **Flomo Moments**: Optionally generates a `Flomo Moments.md` file that embeds links to all imported memo files, providing a chronological overview

### Experimental Features

- **Bi-directional Link Support**: Attempts to preserve `[[wiki-links]]` within your memo content during import
- **Merge Memos by Date**: Option to merge all memos from the same day into a single Obsidian note, separated by `---`

<br />

## Codebase Structure

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
    moduleLoader.ts # Unified module loader (New in v2.5)
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

## Synchronization Logic Explained

Understanding how synchronization works, especially incrementally:

1. **Trigger**: Sync can be triggered automatically (on startup, hourly timer via `main.ts`) or manually (clicking "Sync Now" in `main_ui.ts` or using the "Sync Flomo Now" command)

2. **Export (Auto Sync/Sync Now Button)**:
   - The `FlomoExporter` utilizes Playwright (a browser automation tool) to:
     - Log in to your Flomo account (using credentials potentially stored securely)
     - Navigate to the export page
     - Download the full backup as an HTML file (saved to a location defined in `const.ts`, e.g., `DOWNLOAD_FILE`)

3. **Import Entry Point**:
   - The `FlomoImporter` class is instantiated
   - The `importFlomoFile` method is called, passing the path to the downloaded HTML file (`DOWNLOAD_FILE`)

4. **Data Reading & Parsing**:
   - `FlomoImporter` reads the HTML file content
   - It calls `FlomoCore`'s constructor, passing the HTML data and the list of already synced memo IDs (`syncedMemoIds`) loaded from the plugin's saved settings (`this.settings.syncedMemoIds`)

5. **Core Processing & Incremental Identification (`FlomoCore`)**:
   - The constructor parses the HTML structure
   - The `loadMemos` method iterates through each memo element (`<div class="memo">`)
   - **Crucially for Incremental Sync**: For *each* memo found in the HTML, a unique `memoId` is generated. This ID is based on a combination of:
     - The memo's exact timestamp
     - A hash of its content (title, body, attachments)
     - A counter for memos with the *exact same timestamp* (to differentiate them)
     - An overall sequential counter
   - This generated `memoId` is compared against the `syncedMemoIds` list received from the settings
   - **If the ID is NOT in the list**: It's considered a **new memo**. Its `memoId` is added to the *instance's* `syncedMemoIds` list, `newMemosCount` is incremented, and the memo's data is added to the `memos` array to be processed
   - **If the ID IS in the list**: It's skipped

6. **Write to Obsidian (`FlomoImporter.importFlomoFile`)**:
   - The method receives the processed data from `FlomoCore`, including the list of *only the newly identified* memos
   - It groups these new memos by date
   - Based on the "Merge Memos by Date" setting, it writes the content of each new memo (or merged content) to the appropriate file path within the specified `Flomo Target` and `Memo Target` folders in your vault
   - It potentially calls `generateMoments` and `generateCanvas` if enabled

7. **State Saving (`main.ts`)**:
   - After `importFlomoFile` completes, the plugin calls `saveSettings()`
   - This saves the updated `syncedMemoIds` list (which now includes the IDs of the newly imported memos) and the current `lastSyncTime` back into Obsidian's persistent storage for this plugin. This ensures the *next* sync knows about these newly added memos

8. **Notification**: A notice is displayed indicating how many memos were found and how many were newly imported

This detailed ID generation and checking process is the key to reliable incremental synchronization, ensuring only new content is added to your Obsidian vault.

<br />

## Development & Modification Guide

### Development Environment Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Install Playwright (required): `npx playwright@1.43.1 install`

### Modifying Templates and Formats
If you need to modify the format or template of imported notes:
- Edit `lib/flomo/importer.ts` - Responsible for converting Flomo notes to Obsidian format
- Edit `lib/obIntegration/moments.ts` - Modify how the Moments feature displays
- Edit `lib/obIntegration/canvas.ts` - Modify Canvas display format

### Modifying UI
- UI-related modifications are mainly in the `lib/ui/` directory
- Style modifications can be made in the `styles.css` file

### Building the Project
- Development mode (live compilation): `npm run dev`
- Production build: `npm run build`
- The built file is `main.js`

### Version Management
- Version update: `npm run version`
- Version information is defined in `manifest.json` and `versions.json`

### Deploy to Vault
```bash
# Edit VAULT_PATH in deploy.sh
./deploy.sh
```

<br />

## First Time Usage Guide

### Install Dependencies
- **Playwright (REQUIRED)**: `npx playwright@1.43.1 install`
- (This plugin is pre-built with version 1.43.1)

### Install and Enable Plugin
- Install `Flomo Importer` and enable it

  <img width="225" alt="image" src="https://github.com/jia6y/flomo-to-obsidian/assets/1456952/88cff082-e33f-4671-ba24-7059c6bbce88">

- Use the command `Open Flomo Importer`, or use `Import Button`

  <img width="230" alt="image" src="https://github.com/jia6y/flomo-to-obsidian/assets/1456952/28a31eaa-921d-49cb-a633-984d06550792">

### Auto Sync
- Click on "Auto Sync"

  <img width="350" alt="image" src="https://github.com/jia6y/flomo-to-obsidian/assets/1456952/71af02c3-9c14-4eec-b56f-d6207178ccd5">

- Authentication is required if it's the first time syncing or the current sign-in has expired

  <img width="350" alt="image" src="https://github.com/jia6y/flomo-to-obsidian/assets/1456952/7754586a-e9e2-40b7-93c1-0dbcc0631a1e">

- Exporting & Importing

  <img width="300" alt="image" src="https://github.com/jia6y/flomo-to-obsidian/assets/1456952/24910880-6201-497f-8359-191e476a5bed">

### Manual Sync

#### 📦 Export from Flomo
- Go to `Account Details`
- Select `Export All (as HTML)`

  <img width="350" alt="image" src="https://github.com/jia6y/flomo-to-obsidian/assets/1456952/b6222501-b0e7-45f4-8acb-6b489c9b1fc0">

- Click on `Start to export`

#### 🎯 Import to Obsidian

- Choose flomo.zip to Import. The `Flomo & Memo Home` is where to store your memos

- A Notice pops up when the import is completed

- Checkout **Flomo Moments** and **Flomo Canvas** 🌅

  <img width="252" alt="image" src="https://github.com/jia6y/flomo-to-obsidian/assets/1456952/b1bd2399-87f1-4d60-80cf-111bbce8fe68">

### 📤 Pushing to Flomo (Private API)
1. In the plugin settings under the **Push Configuration** tab, enter your Bearer Token or Webhook URL.
2. Click the **Flomo icon (Ribbon)** on the left sidebar to open the unified action panel.
3. Switch to the "Push" tab in the modal, type your Markdown-supported note and tags, and send it directly to Flomo.
4. Alternatively, select text in your editor, **right-click**, and choose "Send to Flomo".

<br />

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

**Note**: Content update detection works automatically. If you edit a memo in Flomo after upgrading, it will be detected and re-imported.

<br />

## Plugin Settings

Version 2.6.0 introduces a brand new **Tabbed Settings UI**, categorized into logical groups:

- **General & Storage**: Configure auto-sync intervals and tag-based selective sync.
- **Sync Pull**: Configure target folders for Flomo memos, and toggle Incremental Sync or Delete Sync.
- **Push Configuration**: Set up your Bearer Token or Webhook for the Markdown private API push, and configure daily limits.
- **Experimental & Advanced**: 
  - **Merge Memos by Date** and its **Thino Compatibility Mode**
  - **Hide Aggregate Sync Markers** (enabled by default to hide internal anchors)
  - **Canvas & Moments** generation options
  - **Debug Mode** for troubleshooting and **Reset Sync History** to clear states.

<br />

## Troubleshooting

### Playwright Loading Failed

If you encounter `Cannot find module 'playwright'` error:

1. **Check Installation**:
   ```bash
   # Project local
   npm list playwright
   
   # Global
   npm list -g playwright
   ```

2. **View Search Paths**:
   - Set `DEBUG_MODULE_LOADER = true` in `lib/flomo/moduleLoader.ts`
   - Rebuild: `npm run build`
   - Check console output for all attempted paths

3. **Recommended Solutions**:
   ```bash
   # Solution 1: Local project installation
   cd /path/to/flomo-to-obsidian
   npm install
   npx playwright install
   
   # Solution 2: Use deployment script
   ./deploy.sh  # Automatically copies to plugin directory
   
   # Solution 3: Global installation (now supported)
   npm install -g playwright@1.43.1
   npx playwright install
   ```

### 403 Forbidden Error

- Make sure "Debug Mode" is enabled in settings to see detailed errors
- Check if your Flomo account is working normally
- Try manually logging into the Flomo website to confirm account status

### Attachment Path Issues

- Ensure all paths are normalized using `obsidian.normalizePath()`
- Check if `Flomo Target` setting is correct
- Use "Reset Sync History" to re-import

<br />

## Credits

This project is based on [jia6y/flomo-to-obsidian](https://github.com/jia6y/flomo-to-obsidian) with significant enhancements.

Special thanks to:
- Original author jia6y for creating this excellent plugin
- [get-to-obsidian](https://github.com/your-repo/get-to-obsidian) project for the module loader solution inspiration

<br />

## License

MIT License - See LICENSE file for details

<br />

## Contributing

Issues and Pull Requests are welcome!

---

English Version | **[中文版本](README.md)**
