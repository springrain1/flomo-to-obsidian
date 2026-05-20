"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MainUI = void 0;
const obsidian_1 = require("obsidian");
const common_1 = require("./common");
const auth_ui_1 = require("./auth_ui");
const importer_1 = require("../flomo/importer");
const exporter_1 = require("../flomo/exporter");
const fs = __importStar(require("fs-extra"));
const const_1 = require("../flomo/const");
class MainUI extends obsidian_1.Modal {
    plugin;
    rawPath;
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
        this.rawPath = "";
    }
    async onSync(btn) {
        const isAuthFileExist = await fs.exists(const_1.AUTH_FILE);
        try {
            if (isAuthFileExist) {
                btn.setDisabled(true);
                btn.setButtonText("Exporting from Flomo ...");
                const exportResult = await (new exporter_1.FlomoExporter().export());
                btn.setDisabled(false);
                if (exportResult[0] == true) {
                    this.rawPath = const_1.DOWNLOAD_FILE;
                    btn.setButtonText("Importing...");
                    await this.onSubmit();
                    btn.setButtonText("Auto Sync 🤗");
                }
                else {
                    throw new Error(exportResult[1]);
                }
            }
            else {
                const authUI = new auth_ui_1.AuthUI(this.app, this.plugin);
                authUI.open();
            }
        }
        catch (err) {
            console.log(err);
            btn.setButtonText("Auto Sync 🤗");
            new obsidian_1.Notice(`Flomo Sync Error. Details:\n${err}`);
        }
    }
    async onSubmit() {
        const targetMemoLocation = this.plugin.settings.flomoTarget + "/" +
            this.plugin.settings.memoTarget;
        const res = await this.app.vault.adapter.exists(targetMemoLocation);
        if (!res) {
            console.debug(`DEBUG: creating memo root -> ${targetMemoLocation}`);
            await this.app.vault.adapter.mkdir(`${targetMemoLocation}`);
        }
        try {
            const config = this.plugin.settings;
            config["rawDir"] = this.rawPath;
            // 将已同步的备忘录ID传递给导入器，用于增量同步
            config["syncedMemoIds"] = this.plugin.settings.syncedMemoIds || [];
            const flomo = await (new importer_1.FlomoImporter(this.app, config)).import();
            // 保存新同步的备忘录ID
            if (flomo.syncedMemoIds && flomo.syncedMemoIds.length > 0) {
                this.plugin.settings.syncedMemoIds = flomo.syncedMemoIds;
                await this.plugin.saveSettings();
            }
            new obsidian_1.Notice(`🎉 Import Completed.\nTotal: ${flomo.memos.length} memos, New: ${flomo.newMemosCount || 0} memos`);
            this.rawPath = "";
        }
        catch (err) {
            this.rawPath = "";
            console.log(err);
            new obsidian_1.Notice(`Flomo Importer Error. Details:\n${err}`);
        }
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h3", { text: "Flomo Importer" });
        const fileLocContol = contentEl.createEl("input", { type: "file", cls: "uploadbox" });
        fileLocContol.setAttr("accept", ".zip");
        fileLocContol.onchange = (ev) => {
            this.rawPath = ev.currentTarget.files[0]["path"];
            console.log(this.rawPath);
        };
        contentEl.createEl("br");
        new obsidian_1.Setting(contentEl)
            .setName('Flomo Home')
            .setDesc('set the flomo home location')
            .addText(text => text
            .setPlaceholder('flomo')
            .setValue(this.plugin.settings.flomoTarget)
            .onChange(async (value) => {
            this.plugin.settings.flomoTarget = value;
        }));
        new obsidian_1.Setting(contentEl)
            .setName('Memo Home')
            .setDesc('your memos are at: FlomoHome / MemoHome')
            .addText((text) => text
            .setPlaceholder('memos')
            .setValue(this.plugin.settings.memoTarget)
            .onChange(async (value) => {
            this.plugin.settings.memoTarget = value;
        }));
        new obsidian_1.Setting(contentEl)
            .setName('Moments')
            .setDesc('set moments style: flow(default) | skip')
            .addDropdown((drp) => {
            drp.addOption("copy_with_link", "Generate Moments")
                .addOption("skip", "Skip Moments")
                .setValue(this.plugin.settings.optionsMoments)
                .onChange(async (value) => {
                this.plugin.settings.optionsMoments = value;
            });
        });
        new obsidian_1.Setting(contentEl)
            .setName('Canvas')
            .setDesc('set canvas options: link | content(default) | skip')
            .addDropdown((drp) => {
            drp.addOption("copy_with_link", "Generate Canvas")
                .addOption("copy_with_content", "Generate Canvas (with content)")
                .addOption("skip", "Skip Canvas")
                .setValue(this.plugin.settings.optionsCanvas)
                .onChange(async (value) => {
                this.plugin.settings.optionsCanvas = value;
            });
        });
        const canvsOptionBlock = contentEl.createEl("div", { cls: "canvasOptionBlock" });
        const canvsOptionLabelL = canvsOptionBlock.createEl("label");
        const canvsOptionLabelM = canvsOptionBlock.createEl("label");
        const canvsOptionLabelS = canvsOptionBlock.createEl("label");
        const canvsSizeL = canvsOptionLabelL.createEl("input", { type: "radio", cls: "ckbox" });
        canvsOptionLabelL.createEl("small", { text: "large" });
        const canvsSizeM = canvsOptionLabelM.createEl("input", { type: "radio", cls: "ckbox" });
        canvsOptionLabelM.createEl("small", { text: "medium" });
        const canvsSizeS = canvsOptionLabelS.createEl("input", { type: "radio", cls: "ckbox" });
        canvsOptionLabelS.createEl("small", { text: "small" });
        canvsSizeL.name = "canvas_opt";
        canvsSizeM.name = "canvas_opt";
        canvsSizeS.name = "canvas_opt";
        switch (this.plugin.settings.canvasSize) {
            case "L":
                canvsSizeL.checked = true;
                break;
            case "M":
                canvsSizeM.checked = true;
                break;
            case "S":
                canvsSizeS.checked = true;
                break;
        }
        canvsSizeL.onchange = (ev) => {
            this.plugin.settings.canvasSize = "L";
        };
        canvsSizeM.onchange = (ev) => {
            this.plugin.settings.canvasSize = "M";
        };
        canvsSizeS.onchange = (ev) => {
            this.plugin.settings.canvasSize = "S";
        };
        new obsidian_1.Setting(contentEl).setName('Experimental Options').setDesc('set experimental options');
        const allowBiLink = (0, common_1.createExpOpt)(contentEl, "Convert bidirectonal link. example: [[abc]]");
        allowBiLink.checked = this.plugin.settings.expOptionAllowbilink;
        allowBiLink.onchange = (ev) => {
            this.plugin.settings.expOptionAllowbilink = ev.currentTarget.checked;
        };
        const mergeByDate = (0, common_1.createExpOpt)(contentEl, "Merge memos by date");
        mergeByDate.checked = this.plugin.settings.mergeByDate;
        mergeByDate.onchange = (ev) => {
            this.plugin.settings.mergeByDate = ev.currentTarget.checked;
        };
        new obsidian_1.Setting(contentEl).setName('Auto Sync Options').setDesc('set auto sync options');
        const autoSyncOnStartup = (0, common_1.createExpOpt)(contentEl, "Auto sync when Obsidian starts");
        autoSyncOnStartup.checked = this.plugin.settings.autoSyncOnStartup;
        autoSyncOnStartup.onchange = (ev) => {
            this.plugin.settings.autoSyncOnStartup = ev.currentTarget.checked;
        };
        const autoSyncInterval = (0, common_1.createExpOpt)(contentEl, "Auto sync every hour");
        autoSyncInterval.checked = this.plugin.settings.autoSyncInterval;
        autoSyncInterval.onchange = (ev) => {
            this.plugin.settings.autoSyncInterval = ev.currentTarget.checked;
            if (ev.currentTarget.checked) {
                // 如果启用了每小时同步，立即开始定时任务
                this.plugin.startAutoSync();
            }
            else {
                // 如果禁用了每小时同步，停止定时任务
                this.plugin.stopAutoSync();
            }
        };
        // 标签过滤选项
        new obsidian_1.Setting(contentEl).setName('Tag Filter').setDesc('Only sync memos with specific tags');
        const filterByTags = (0, common_1.createExpOpt)(contentEl, "Enable tag filter (only sync memos with specified tags)");
        filterByTags.checked = this.plugin.settings.filterByTags;
        // 标签输入框容器
        const tagInputContainer = contentEl.createEl("div", { cls: "tag-input-container" });
        tagInputContainer.style.display = this.plugin.settings.filterByTags ? "block" : "none";
        tagInputContainer.style.marginLeft = "20px";
        tagInputContainer.style.marginBottom = "10px";
        new obsidian_1.Setting(tagInputContainer)
            .setName('Tags to sync')
            .setDesc('Enter tags separated by comma. Example: #work, #important, #daily')
            .addText(text => text
            .setPlaceholder('#tag1, #tag2')
            .setValue((this.plugin.settings.syncTags || []).join(', '))
            .onChange(async (value) => {
            // 解析标签，支持带或不带 # 前缀
            const tags = value.split(',')
                .map(t => t.trim())
                .filter(t => t.length > 0);
            this.plugin.settings.syncTags = tags;
        }));
        filterByTags.onchange = (ev) => {
            this.plugin.settings.filterByTags = ev.currentTarget.checked;
            tagInputContainer.style.display = this.plugin.settings.filterByTags ? "block" : "none";
        };
        // 显示上次同步时间和同步记录数
        if (this.plugin.settings.lastSyncTime) {
            const lastSyncDate = new Date(this.plugin.settings.lastSyncTime);
            const syncedCount = this.plugin.settings.syncedMemoIds?.length || 0;
            contentEl.createEl("div", {
                text: `Last sync: ${lastSyncDate.toLocaleString()}`,
                cls: "last-sync-time"
            });
            contentEl.createEl("div", {
                text: `Synced memos: ${syncedCount}`,
                cls: "synced-count"
            });
        }
        // 添加重置同步记录按钮
        new obsidian_1.Setting(contentEl)
            .setName('Reset Sync History')
            .setDesc('Clear all synced memo IDs to re-import all memos (useful after changing attachment paths)')
            .addButton((btn) => {
            btn.setButtonText("Reset Sync History")
                .setWarning()
                .onClick(async () => {
                const flomoTarget = this.plugin.settings.flomoTarget || "flomo";
                const memoTarget = this.plugin.settings.memoTarget || "memos";
                const confirmed = confirm(`Are you sure you want to reset sync history?\n\n` +
                    `This will clear ${this.plugin.settings.syncedMemoIds?.length || 0} synced memo records.\n` +
                    `Next sync will re-import all memos from Flomo.\n\n` +
                    `⚠️  IMPORTANT: Before syncing again, you should:\n` +
                    `1. Delete the old memos folder: ${flomoTarget}/${memoTarget}/\n` +
                    `2. Delete the old attachments folder if path changed\n\n` +
                    `Otherwise, existing files will be OVERWRITTEN!`);
                if (confirmed) {
                    this.plugin.settings.syncedMemoIds = [];
                    this.plugin.settings.lastSyncTime = 0;
                    await this.plugin.saveSettings();
                    new obsidian_1.Notice(`Sync history has been reset.\n\n` +
                        `⚠️  Remember to delete old folders before next sync:\n` +
                        `- ${flomoTarget}/${memoTarget}/\n` +
                        `- ${flomoTarget}/flomo picture/ (if exists)`, 10000);
                    this.close();
                    this.open(); // 重新打开以刷新显示
                }
            });
        });
        new obsidian_1.Setting(contentEl)
            .addButton((btn) => {
            btn.setButtonText("Cancel")
                .setCta()
                .onClick(async () => {
                await this.plugin.saveSettings();
                this.close();
            });
        })
            .addButton((btn) => {
            btn.setButtonText("Import")
                .setCta()
                .onClick(async () => {
                if (this.rawPath != "") {
                    await this.plugin.saveSettings();
                    await this.onSubmit();
                    //const manualSyncUI: Modal = new ManualSyncUI(this.app, this.plugin);
                    //manualSyncUI.open();
                    this.close();
                }
                else {
                    new obsidian_1.Notice("No File Selected.");
                }
            });
        })
            .addButton((btn) => {
            btn.setButtonText("Auto Sync 🤗")
                .setCta()
                .onClick(async () => {
                await this.plugin.saveSettings();
                await this.onSync(btn);
                //this.close();
            });
        });
    }
    onClose() {
        this.rawPath = "";
        const { contentEl } = this;
        contentEl.empty();
    }
}
exports.MainUI = MainUI;
