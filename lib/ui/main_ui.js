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
exports.MainUI = exports.ConfirmResetModal = void 0;
const obsidian_1 = require("obsidian");
const common_1 = require("./common");
const auth_ui_1 = require("./auth_ui");
const importer_1 = require("../flomo/importer");
const exporter_1 = require("../flomo/exporter");
const fs = __importStar(require("fs-extra"));
const const_1 = require("../flomo/const");
const path = window.require ? window.require('path') : null;
class ConfirmResetModal extends obsidian_1.Modal {
    message;
    onConfirm;
    constructor(app, message, onConfirm) {
        super(app);
        this.message = message;
        this.onConfirm = onConfirm;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h3', { text: '确认重置' });
        const lines = this.message.split('\n');
        for (const line of lines) {
            if (line.trim()) {
                contentEl.createEl('p', { text: line });
            }
        }
        new obsidian_1.Setting(contentEl)
            .addButton(btn => btn
            .setButtonText('取消')
            .onClick(() => this.close()))
            .addButton(btn => btn
            .setButtonText('确定重置')
            .setWarning()
            .onClick(() => {
            this.close();
            this.onConfirm();
        }));
    }
    onClose() {
        this.contentEl.empty();
    }
}
exports.ConfirmResetModal = ConfirmResetModal;
class MainUI extends obsidian_1.Modal {
    plugin;
    rawPath;
    selectedFile = null;
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
        this.rawPath = "";
        this.selectedFile = null;
    }
    async onSync(btn) {
        const isAuthFileExist = await fs.exists(const_1.AUTH_FILE);
        try {
            if (isAuthFileExist) {
                btn.setDisabled(true);
                btn.setButtonText("正在从 Flomo 导出...");
                // 获取标签过滤配置
                const filterTags = this.plugin.settings.filterByTags
                    ? (this.plugin.settings.syncTags || [])
                    : [];
                const exportResult = await (new exporter_1.FlomoExporter(!!this.plugin.settings.debugMode).export(filterTags));
                btn.setDisabled(false);
                if (exportResult[0] == true) {
                    this.rawPath = const_1.DOWNLOAD_FILE;
                    btn.setButtonText("正在导入...");
                    await this.onSubmit();
                    btn.setButtonText("自动同步 🤗");
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
            btn.setButtonText("自动同步 🤗");
            new obsidian_1.Notice(`Flomo 同步失败:\n${err}`);
        }
    }
    async onSubmit() {
        // 检查是否选择了文件
        if (!this.rawPath && !this.selectedFile) {
            new obsidian_1.Notice("请先选择 flomo_export.zip 文件");
            return;
        }
        // 如果没有直接路径但有文件对象，先保存到临时目录
        if (!this.rawPath && this.selectedFile) {
            try {
                const tempPath = path.join(const_1.FLOMO_CACHE_LOC, 'manual_import.zip');
                await fs.mkdirp(const_1.FLOMO_CACHE_LOC);
                // 读取文件内容并保存
                const arrayBuffer = await this.selectedFile.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                await fs.writeFile(tempPath, buffer);
                this.rawPath = tempPath;
                console.log("文件已保存到临时目录:", tempPath);
            }
            catch (err) {
                console.error("保存临时文件失败:", err);
                new obsidian_1.Notice("保存临时文件失败: " + err.message);
                return;
            }
        }
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
            // 保存新同步的备忘录ID（首行去重模式也会保存成功写入的 memo ID）
            if (flomo.syncedMemoIds && flomo.syncedMemoIds.length > 0) {
                this.plugin.settings.syncedMemoIds = flomo.syncedMemoIds;
                await this.plugin.saveSettings();
            }
            new obsidian_1.Notice(`🎉 导入完成\n共 ${flomo.memos.length} 条笔记，新增 ${flomo.newMemosCount || 0} 条`);
            this.rawPath = "";
            this.selectedFile = null;
        }
        catch (err) {
            this.rawPath = "";
            this.selectedFile = null;
            console.log(err);
            new obsidian_1.Notice(`Flomo 导入失败:\n${err}`);
        }
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h3", { text: "Flomo 导入器" });
        const fileLocContol = contentEl.createEl("input", { type: "file", cls: "uploadbox" });
        fileLocContol.setAttr("accept", ".zip");
        fileLocContol.onchange = (ev) => {
            const files = ev.currentTarget.files;
            if (files && files.length > 0) {
                const file = files[0];
                // 优先使用 Electron 的 path 属性
                this.rawPath = file.path || "";
                // 同时保存 File 对象作为备用
                this.selectedFile = files[0];
                console.log("选择的文件:", file.name, "路径:", this.rawPath);
                if (!this.rawPath) {
                    console.log("将使用 FileReader 方式读取文件");
                }
            }
        };
        contentEl.createEl("br");
        new obsidian_1.Setting(contentEl)
            .setName('Flomo 主目录')
            .setDesc('设置 Flomo 笔记的存储位置')
            .addText(text => text
            .setPlaceholder('flomo')
            .setValue(this.plugin.settings.flomoTarget)
            .onChange(async (value) => {
            this.plugin.settings.flomoTarget = value;
        }));
        new obsidian_1.Setting(contentEl)
            .setName('笔记子目录')
            .setDesc('笔记存储路径: Flomo主目录 / 笔记子目录')
            .addText((text) => text
            .setPlaceholder('memos')
            .setValue(this.plugin.settings.memoTarget)
            .onChange(async (value) => {
            this.plugin.settings.memoTarget = value;
        }));
        new obsidian_1.Setting(contentEl)
            .setName('Moments 视图')
            .setDesc('设置 Moments 生成方式')
            .addDropdown((drp) => {
            drp.addOption("copy_with_link", "生成 Moments")
                .addOption("skip", "跳过")
                .setValue(this.plugin.settings.optionsMoments)
                .onChange(async (value) => {
                this.plugin.settings.optionsMoments = value;
            });
        });
        new obsidian_1.Setting(contentEl)
            .setName('Canvas 画布')
            .setDesc('设置 Canvas 生成方式')
            .addDropdown((drp) => {
            drp.addOption("copy_with_link", "生成画布（链接）")
                .addOption("copy_with_content", "生成画布（含内容）")
                .addOption("skip", "跳过")
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
        canvsOptionLabelL.createEl("small", { text: "大" });
        const canvsSizeM = canvsOptionLabelM.createEl("input", { type: "radio", cls: "ckbox" });
        canvsOptionLabelM.createEl("small", { text: "中" });
        const canvsSizeS = canvsOptionLabelS.createEl("input", { type: "radio", cls: "ckbox" });
        canvsOptionLabelS.createEl("small", { text: "小" });
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
        canvsSizeL.onchange = () => {
            this.plugin.settings.canvasSize = "L";
        };
        canvsSizeM.onchange = () => {
            this.plugin.settings.canvasSize = "M";
        };
        canvsSizeS.onchange = () => {
            this.plugin.settings.canvasSize = "S";
        };
        new obsidian_1.Setting(contentEl).setName('实验性选项').setDesc('高级设置');
        const allowBiLink = (0, common_1.createExpOpt)(contentEl, "转换双向链接，例如: [[abc]]");
        allowBiLink.checked = this.plugin.settings.expOptionAllowbilink;
        allowBiLink.onchange = (ev) => {
            this.plugin.settings.expOptionAllowbilink = ev.currentTarget.checked;
        };
        const debugModeOpt = (0, common_1.createExpOpt)(contentEl, "开启调试模式（记录详细日志并保存运行截图）");
        debugModeOpt.checked = !!this.plugin.settings.debugMode;
        debugModeOpt.onchange = (ev) => {
            this.plugin.settings.debugMode = ev.currentTarget.checked;
        };
        // 按日期合并选项容器（Thino 模式下隐藏，因为 Thino 强制按日期合并）
        const mergeByDateContainer = contentEl.createEl("div", { cls: "merge-by-date-container" });
        mergeByDateContainer.toggleClass("flomo-hidden", !!this.plugin.settings.thinoCompatible);
        const mergeByDate = (0, common_1.createExpOpt)(mergeByDateContainer, "按日期合并笔记");
        mergeByDate.checked = this.plugin.settings.mergeByDate;
        mergeByDate.onchange = (ev) => {
            this.plugin.settings.mergeByDate = ev.currentTarget.checked;
        };
        new obsidian_1.Setting(contentEl).setName('自动同步选项').setDesc('配置自动同步行为');
        const autoSyncOnStartup = (0, common_1.createExpOpt)(contentEl, "Obsidian 启动时自动同步");
        autoSyncOnStartup.checked = this.plugin.settings.autoSyncOnStartup;
        autoSyncOnStartup.onchange = (ev) => {
            this.plugin.settings.autoSyncOnStartup = ev.currentTarget.checked;
        };
        const autoSyncInterval = (0, common_1.createExpOpt)(contentEl, "每小时自动同步");
        autoSyncInterval.checked = this.plugin.settings.autoSyncInterval;
        autoSyncInterval.onchange = (ev) => {
            this.plugin.settings.autoSyncInterval = ev.currentTarget.checked;
            if (ev.currentTarget.checked) {
                this.plugin.startAutoSync();
            }
            else {
                this.plugin.stopAutoSync();
            }
        };
        // 标签过滤选项
        new obsidian_1.Setting(contentEl).setName('标签过滤').setDesc('只同步包含指定标签的笔记');
        const filterByTags = (0, common_1.createExpOpt)(contentEl, "启用标签过滤");
        filterByTags.checked = this.plugin.settings.filterByTags;
        // 标签输入框容器
        const tagInputContainer = contentEl.createEl("div", { cls: "tag-input-container flomo-sub-container" });
        tagInputContainer.toggleClass("flomo-hidden", !this.plugin.settings.filterByTags);
        new obsidian_1.Setting(tagInputContainer)
            .setName('同步标签')
            .setDesc('输入要同步的标签，用空格分隔。例如: #工作 #重要')
            .addText(text => text
            .setPlaceholder('#标签1 #标签2')
            .setValue((this.plugin.settings.syncTags || []).join(' '))
            .onChange(async (value) => {
            // 按空格分隔标签
            const tags = value.split(/\s+/)
                .map(t => t.trim())
                .filter(t => t.length > 0);
            this.plugin.settings.syncTags = tags;
        }));
        filterByTags.onchange = (ev) => {
            const checked = ev.currentTarget.checked;
            this.plugin.settings.filterByTags = checked;
            tagInputContainer.toggleClass("flomo-hidden", !checked);
        };
        // Thino/Memos 兼容模式
        new obsidian_1.Setting(contentEl).setName('Thino 兼容').setDesc('导出为 Thino/Memos 插件可识别的格式');
        const thinoCompatible = (0, common_1.createExpOpt)(contentEl, "启用 Thino 兼容模式（- HH:mm 格式）");
        thinoCompatible.checked = this.plugin.settings.thinoCompatible;
        // Thino 设置容器（根据开关状态显示/隐藏）
        const thinoContainer = contentEl.createEl("div", { cls: "thino-container flomo-sub-container" });
        thinoContainer.toggleClass("flomo-hidden", !this.plugin.settings.thinoCompatible);
        new obsidian_1.Setting(thinoContainer)
            .setName('文件名前缀')
            .setDesc('设置为空则使用纯日期文件名（如 2025-01-01.md）')
            .addText(text => text
            .setPlaceholder('')
            .setValue(this.plugin.settings.filenamePrefix || '')
            .onChange(async (value) => {
            this.plugin.settings.filenamePrefix = value;
        }));
        new obsidian_1.Setting(thinoContainer)
            .setName('日期格式')
            .setDesc('留空则从日记核心插件获取，如 YYYY-MM-DD 或 YYYY_MM_DD')
            .addText(text => text
            .setPlaceholder('YYYY-MM-DD')
            .setValue(this.plugin.settings.dateFormat || '')
            .onChange(async (value) => {
            this.plugin.settings.dateFormat = value;
        }));
        new obsidian_1.Setting(thinoContainer)
            .setName('插入标题')
            .setDesc('在指定标题下插入内容，留空则追加到文件末尾。如: # Flomo')
            .addText(text => text
            .setPlaceholder('# 标题')
            .setValue(this.plugin.settings.thinoInsertHeading || '')
            .onChange(async (value) => {
            this.plugin.settings.thinoInsertHeading = value;
        }));
        new obsidian_1.Setting(thinoContainer)
            .setName('增量同步模式')
            .setDesc('首行去重：基于内容首行判断是否重复；原始机制：基于同步记录判断')
            .addDropdown(dropdown => dropdown
            .addOption('firstLine', '首行去重（推荐）')
            .addOption('original', '原始机制')
            .setValue(this.plugin.settings.thinoSyncMode || 'firstLine')
            .onChange(async (value) => {
            this.plugin.settings.thinoSyncMode = value;
        }));
        thinoCompatible.onchange = (ev) => {
            const checked = ev.currentTarget.checked;
            this.plugin.settings.thinoCompatible = checked;
            thinoContainer.toggleClass("flomo-hidden", !checked);
            // Thino 模式下隐藏"按日期合并"选项（Thino 强制按日期合并）
            mergeByDateContainer.toggleClass("flomo-hidden", checked);
        };
        // 显示上次同步时间和同步记录数
        if (this.plugin.settings.lastSyncTime) {
            const lastSyncDate = new Date(this.plugin.settings.lastSyncTime);
            const syncedCount = this.plugin.settings.syncedMemoIds?.length || 0;
            contentEl.createEl("div", {
                text: `上次同步: ${lastSyncDate.toLocaleString()}`,
                cls: "last-sync-time"
            });
            contentEl.createEl("div", {
                text: `已同步笔记: ${syncedCount} 条`,
                cls: "synced-count"
            });
        }
        // 添加重置同步记录按钮
        new obsidian_1.Setting(contentEl)
            .setName('重置同步记录')
            .setDesc('清除所有同步记录，下次同步将重新导入所有笔记')
            .addButton((btn) => {
            btn.setButtonText("重置同步记录")
                .setWarning()
                .onClick(() => {
                const flomoTarget = this.plugin.settings.flomoTarget || "flomo";
                const memoTarget = this.plugin.settings.memoTarget || "memos";
                const msg = `确定要重置同步记录吗？\n` +
                    `这将清除 ${this.plugin.settings.syncedMemoIds?.length || 0} 条同步记录。\n` +
                    `下次同步将重新导入所有 Flomo 笔记。\n` +
                    `⚠️ 重要提示：再次同步前，建议先删除旧笔记与附件目录，否则文件将被覆盖！`;
                new ConfirmResetModal(this.app, msg, async () => {
                    this.plugin.settings.syncedMemoIds = [];
                    this.plugin.settings.lastSyncTime = 0;
                    await this.plugin.saveSettings();
                    new obsidian_1.Notice(`同步记录已重置\n\n` +
                        `⚠️ 请在下次同步前删除旧目录:\n` +
                        `- ${flomoTarget}/${memoTarget}/\n` +
                        `- ${flomoTarget}/flomo attachment/`, 10000);
                    this.close();
                    this.open();
                }).open();
            });
        });
        new obsidian_1.Setting(contentEl)
            .addButton((btn) => {
            btn.setButtonText("取消")
                .setCta()
                .onClick(async () => {
                await this.plugin.saveSettings();
                this.close();
            });
        })
            .addButton((btn) => {
            btn.setButtonText("手动导入")
                .setCta()
                .onClick(async () => {
                if (this.rawPath != "" || this.selectedFile) {
                    await this.plugin.saveSettings();
                    await this.onSubmit();
                    this.close();
                }
                else {
                    new obsidian_1.Notice("请先选择文件");
                }
            });
        })
            .addButton((btn) => {
            btn.setButtonText("自动同步 🤗")
                .setCta()
                .onClick(async () => {
                await this.plugin.saveSettings();
                await this.onSync(btn);
            });
        });
    }
    onClose() {
        this.rawPath = "";
        this.selectedFile = null;
        const { contentEl } = this;
        contentEl.empty();
    }
}
exports.MainUI = MainUI;
