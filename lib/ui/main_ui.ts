import { App, Modal, Setting, Notice, ButtonComponent } from 'obsidian';

import { createExpOpt } from './common';
import { AuthUI } from './auth_ui';
import { FlomoImporter } from '../flomo/importer';
import { FlomoExporter } from '../flomo/exporter';
import type FlomoImporterPlugin from '../../main';

import * as path from 'path';
import * as fs from 'fs-extra';

import { AUTH_FILE, DOWNLOAD_FILE, FLOMO_CACHE_LOC } from '../flomo/const'

export class MainUI extends Modal {

    plugin: FlomoImporterPlugin;
    rawPath: string;
    selectedFile: File | null = null;

    constructor(app: App, plugin: FlomoImporterPlugin) {
        super(app);
        this.plugin = plugin;
        this.rawPath = "";
        this.selectedFile = null;
    }

    async onSync(btn: ButtonComponent): Promise<void> {
        const isAuthFileExist = await fs.exists(AUTH_FILE)
        try {
            if (isAuthFileExist) {
                btn.setDisabled(true);
                btn.setButtonText("正在从 Flomo 导出...");

                // 获取标签过滤配置
                const filterTags = this.plugin.settings.filterByTags
                    ? (this.plugin.settings.syncTags || [])
                    : [];

                const exportResult = await (new FlomoExporter(!!this.plugin.settings.debugMode).export(filterTags));

                btn.setDisabled(false);
                if (exportResult[0] == true) {
                    this.rawPath = DOWNLOAD_FILE;
                    btn.setButtonText("正在导入...");
                    await this.onSubmit();
                    btn.setButtonText("自动同步 🤗");
                } else {
                    throw new Error(exportResult[1]);
                }
            } else {
                const authUI: Modal = new AuthUI(this.app, this.plugin);
                authUI.open();
            }
        } catch (err) {
            console.log(err);
            btn.setButtonText("自动同步 🤗");
            new Notice(`Flomo 同步失败:\n${err}`);
        }
    }

    async onSubmit(): Promise<void> {
        // 检查是否选择了文件
        if (!this.rawPath && !this.selectedFile) {
            new Notice("请先选择 flomo_export.zip 文件");
            return;
        }

        // 如果没有直接路径但有文件对象，先保存到临时目录
        if (!this.rawPath && this.selectedFile) {
            try {
                const tempPath = path.join(FLOMO_CACHE_LOC, 'manual_import.zip');
                await fs.mkdirp(FLOMO_CACHE_LOC);

                // 读取文件内容并保存
                const arrayBuffer = await this.selectedFile.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                await fs.writeFile(tempPath, buffer);

                this.rawPath = tempPath;
                console.log("文件已保存到临时目录:", tempPath);
            } catch (err: any) {
                console.error("保存临时文件失败:", err);
                new Notice("保存临时文件失败: " + err.message);
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

            const flomo = await (new FlomoImporter(this.app, config)).import();

            // 保存新同步的备忘录ID（首行去重模式也会保存成功写入的 memo ID）
            if (flomo.syncedMemoIds && flomo.syncedMemoIds.length > 0) {
                this.plugin.settings.syncedMemoIds = flomo.syncedMemoIds;
                await this.plugin.saveSettings();
            }

            new Notice(`🎉 导入完成\n共 ${flomo.memos.length} 条笔记，新增 ${flomo.newMemosCount || 0} 条`)
            this.rawPath = "";
            this.selectedFile = null;

        } catch (err) {
            this.rawPath = "";
            this.selectedFile = null;
            console.log(err);
            new Notice(`Flomo 导入失败:\n${err}`);
        }
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h3", { text: "Flomo 导入器" });

        const fileLocContol: HTMLInputElement = contentEl.createEl("input", { type: "file", cls: "uploadbox" })
        fileLocContol.setAttr("accept", ".zip");
        fileLocContol.onchange = (ev) => {
            const files = (ev.currentTarget as HTMLInputElement).files;
            if (files && files.length > 0) {
                const file = files[0] as any;
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

        new Setting(contentEl)
            .setName('Flomo 主目录')
            .setDesc('设置 Flomo 笔记的存储位置')
            .addText(text => text
                .setPlaceholder('flomo')
                .setValue(this.plugin.settings.flomoTarget)
                .onChange(async (value) => {
                    this.plugin.settings.flomoTarget = value;
                }));

        new Setting(contentEl)
            .setName('笔记子目录')
            .setDesc('笔记存储路径: Flomo主目录 / 笔记子目录')
            .addText((text) => text
                .setPlaceholder('memos')
                .setValue(this.plugin.settings.memoTarget)
                .onChange(async (value) => {
                    this.plugin.settings.memoTarget = value;
                }));

        new Setting(contentEl)
            .setName('Moments 视图')
            .setDesc('设置 Moments 生成方式')
            .addDropdown((drp) => {
                drp.addOption("copy_with_link", "生成 Moments")
                    .addOption("skip", "跳过")
                    .setValue(this.plugin.settings.optionsMoments)
                    .onChange(async (value) => {
                        this.plugin.settings.optionsMoments = value;
                    })
            })

        new Setting(contentEl)
            .setName('Canvas 画布')
            .setDesc('设置 Canvas 生成方式')
            .addDropdown((drp) => {
                drp.addOption("copy_with_link", "生成画布（链接）")
                    .addOption("copy_with_content", "生成画布（含内容）")
                    .addOption("skip", "跳过")
                    .setValue(this.plugin.settings.optionsCanvas)
                    .onChange(async (value) => {
                        this.plugin.settings.optionsCanvas = value;
                    })
            });

        const canvsOptionBlock: HTMLDivElement = contentEl.createEl("div", { cls: "canvasOptionBlock" });

        const canvsOptionLabelL: HTMLLabelElement = canvsOptionBlock.createEl("label");
        const canvsOptionLabelM: HTMLLabelElement = canvsOptionBlock.createEl("label");
        const canvsOptionLabelS: HTMLLabelElement = canvsOptionBlock.createEl("label");

        const canvsSizeL: HTMLInputElement = canvsOptionLabelL.createEl("input", { type: "radio", cls: "ckbox" });
        canvsOptionLabelL.createEl("small", { text: "大" });
        const canvsSizeM: HTMLInputElement = canvsOptionLabelM.createEl("input", { type: "radio", cls: "ckbox" });
        canvsOptionLabelM.createEl("small", { text: "中" });
        const canvsSizeS: HTMLInputElement = canvsOptionLabelS.createEl("input", { type: "radio", cls: "ckbox" });
        canvsOptionLabelS.createEl("small", { text: "小" });

        canvsSizeL.name = "canvas_opt";
        canvsSizeM.name = "canvas_opt";
        canvsSizeS.name = "canvas_opt";

        switch (this.plugin.settings.canvasSize) {
            case "L":
                canvsSizeL.checked = true;
                break
            case "M":
                canvsSizeM.checked = true;
                break
            case "S":
                canvsSizeS.checked = true;
                break
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

        new Setting(contentEl).setName('实验性选项').setDesc('高级设置')

        const allowBiLink = createExpOpt(contentEl, "转换双向链接，例如: [[abc]]")

        allowBiLink.checked = this.plugin.settings.expOptionAllowbilink;
        allowBiLink.onchange = (ev) => {
            this.plugin.settings.expOptionAllowbilink = (ev.currentTarget as HTMLInputElement).checked;
        };

        const debugModeOpt = createExpOpt(contentEl, "开启调试模式（记录详细日志并保存运行截图）")
        debugModeOpt.checked = !!this.plugin.settings.debugMode;
        debugModeOpt.onchange = (ev) => {
            this.plugin.settings.debugMode = (ev.currentTarget as HTMLInputElement).checked;
        };

        // 按日期合并选项容器（Thino 模式下隐藏，因为 Thino 强制按日期合并）
        const mergeByDateContainer = contentEl.createEl("div", { cls: "merge-by-date-container" });
        mergeByDateContainer.style.display = this.plugin.settings.thinoCompatible ? "none" : "block";

        const mergeByDate = createExpOpt(mergeByDateContainer, "按日期合并笔记")

        mergeByDate.checked = this.plugin.settings.mergeByDate;
        mergeByDate.onchange = (ev) => {
            this.plugin.settings.mergeByDate = (ev.currentTarget as HTMLInputElement).checked;
        };

        new Setting(contentEl).setName('自动同步选项').setDesc('配置自动同步行为')

        const autoSyncOnStartup = createExpOpt(contentEl, "Obsidian 启动时自动同步")

        autoSyncOnStartup.checked = this.plugin.settings.autoSyncOnStartup;
        autoSyncOnStartup.onchange = (ev) => {
            this.plugin.settings.autoSyncOnStartup = (ev.currentTarget as HTMLInputElement).checked;
        };

        const autoSyncInterval = createExpOpt(contentEl, "每小时自动同步")

        autoSyncInterval.checked = this.plugin.settings.autoSyncInterval;
        autoSyncInterval.onchange = (ev) => {
            this.plugin.settings.autoSyncInterval = (ev.currentTarget as HTMLInputElement).checked;
            if ((ev.currentTarget as HTMLInputElement).checked) {
                (this.plugin as any).startAutoSync();
            } else {
                (this.plugin as any).stopAutoSync();
            }
        };

        // 标签过滤选项
        new Setting(contentEl).setName('标签过滤').setDesc('只同步包含指定标签的笔记')

        const filterByTags = createExpOpt(contentEl, "启用标签过滤")
        filterByTags.checked = this.plugin.settings.filterByTags;

        // 标签输入框容器
        const tagInputContainer = contentEl.createEl("div", { cls: "tag-input-container" });
        tagInputContainer.style.display = this.plugin.settings.filterByTags ? "block" : "none";
        tagInputContainer.style.marginLeft = "20px";
        tagInputContainer.style.marginBottom = "10px";

        new Setting(tagInputContainer)
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
            this.plugin.settings.filterByTags = (ev.currentTarget as HTMLInputElement).checked;
            tagInputContainer.style.display = this.plugin.settings.filterByTags ? "block" : "none";
        };

        // Thino/Memos 兼容模式
        new Setting(contentEl).setName('Thino 兼容').setDesc('导出为 Thino/Memos 插件可识别的格式')

        const thinoCompatible = createExpOpt(contentEl, "启用 Thino 兼容模式（- HH:mm 格式）")
        thinoCompatible.checked = this.plugin.settings.thinoCompatible;

        // Thino 设置容器（根据开关状态显示/隐藏）
        const thinoContainer = contentEl.createEl("div", { cls: "thino-container" });
        thinoContainer.style.marginLeft = "20px";
        thinoContainer.style.marginBottom = "10px";
        thinoContainer.style.display = this.plugin.settings.thinoCompatible ? "block" : "none";

        new Setting(thinoContainer)
            .setName('文件名前缀')
            .setDesc('设置为空则使用纯日期文件名（如 2025-01-01.md）')
            .addText(text => text
                .setPlaceholder('')
                .setValue(this.plugin.settings.filenamePrefix || '')
                .onChange(async (value) => {
                    this.plugin.settings.filenamePrefix = value;
                }));

        new Setting(thinoContainer)
            .setName('日期格式')
            .setDesc('留空则从日记核心插件获取，如 YYYY-MM-DD 或 YYYY_MM_DD')
            .addText(text => text
                .setPlaceholder('YYYY-MM-DD')
                .setValue(this.plugin.settings.dateFormat || '')
                .onChange(async (value) => {
                    this.plugin.settings.dateFormat = value;
                }));

        new Setting(thinoContainer)
            .setName('插入标题')
            .setDesc('在指定标题下插入内容，留空则追加到文件末尾。如: # Flomo')
            .addText(text => text
                .setPlaceholder('# 标题')
                .setValue(this.plugin.settings.thinoInsertHeading || '')
                .onChange(async (value) => {
                    this.plugin.settings.thinoInsertHeading = value;
                }));

        new Setting(thinoContainer)
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
            this.plugin.settings.thinoCompatible = (ev.currentTarget as HTMLInputElement).checked;
            thinoContainer.style.display = (ev.currentTarget as HTMLInputElement).checked ? "block" : "none";
            // Thino 模式下隐藏"按日期合并"选项（Thino 强制按日期合并）
            mergeByDateContainer.style.display = (ev.currentTarget as HTMLInputElement).checked ? "none" : "block";
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
        new Setting(contentEl)
            .setName('重置同步记录')
            .setDesc('清除所有同步记录，下次同步将重新导入所有笔记')
            .addButton((btn) => {
                btn.setButtonText("重置同步记录")
                    .setWarning()
                    .onClick(async () => {
                        const flomoTarget = this.plugin.settings.flomoTarget || "flomo";
                        const memoTarget = this.plugin.settings.memoTarget || "memos";
                        const confirmed = confirm(
                            `确定要重置同步记录吗？\n\n` +
                            `这将清除 ${this.plugin.settings.syncedMemoIds?.length || 0} 条同步记录。\n` +
                            `下次同步将重新导入所有 Flomo 笔记。\n\n` +
                            `⚠️ 重要提示：再次同步前，建议先删除：\n` +
                            `1. 旧的笔记目录: ${flomoTarget}/${memoTarget}/\n` +
                            `2. 旧的附件目录（如有变更）\n\n` +
                            `否则现有文件将被覆盖！`
                        );
                        if (confirmed) {
                            this.plugin.settings.syncedMemoIds = [];
                            this.plugin.settings.lastSyncTime = 0;
                            await this.plugin.saveSettings();
                            new Notice(
                                `同步记录已重置\n\n` +
                                `⚠️ 请在下次同步前删除旧目录:\n` +
                                `- ${flomoTarget}/${memoTarget}/\n` +
                                `- ${flomoTarget}/flomo attachment/`,
                                10000
                            );
                            this.close();
                            this.open();
                        }
                    })
            });

        new Setting(contentEl)
            .addButton((btn) => {
                btn.setButtonText("取消")
                    .setCta()
                    .onClick(async () => {
                        await this.plugin.saveSettings();
                        this.close();
                    })
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
                            new Notice("请先选择文件")
                        }
                    })
            })
            .addButton((btn) => {
                btn.setButtonText("自动同步 🤗")
                    .setCta()
                    .onClick(async () => {
                        await this.plugin.saveSettings();
                        await this.onSync(btn);
                    })
            });
    }

    onClose() {
        this.rawPath = "";
        this.selectedFile = null;
        const { contentEl } = this;
        contentEl.empty();
    }
}
