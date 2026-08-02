import { addIcon, Plugin, Modal, Notice, ButtonComponent } from 'obsidian';
import { MainUI } from './lib/ui/main_ui';
import { FlomoImporter } from './lib/flomo/importer';
import * as fs from 'fs-extra';
import { AUTH_FILE, DOWNLOAD_FILE } from './lib/flomo/const';


interface FlomoImporterSettings {
	flomoTarget: string,
	memoTarget: string,
	optionsMoments: string,
	optionsCanvas: string,
	expOptionAllowbilink: boolean,
	canvasSize: string,
	mergeByDate: boolean,
	autoSyncOnStartup: boolean,
	autoSyncInterval: boolean,
	lastSyncTime: number,
	syncedMemoIds: string[],
	filterByTags: boolean,
	syncTags: string[],
	// Thino 兼容设置
	thinoCompatible: boolean,
	filenamePrefix: string,
	dateFormat: string,           // 日期格式，留空则从日记插件获取
	thinoInsertHeading: string,   // 指定标题，留空则追加到末尾
	thinoSyncMode: string,        // 增量同步模式：firstLine(首行去重) 或 original(原始机制)
	debugMode: boolean            // 调试模式开关
}

const DEFAULT_SETTINGS: FlomoImporterSettings = {
	flomoTarget: 'flomo',
	memoTarget: 'memos',
	optionsMoments: "copy_with_link",
	optionsCanvas: "copy_with_content",
	expOptionAllowbilink: true,
	canvasSize: 'M',
	mergeByDate: false,           // 原始默认：不按日期合并
	autoSyncOnStartup: false,
	autoSyncInterval: false,
	lastSyncTime: 0,
	syncedMemoIds: [],
	filterByTags: false,
	syncTags: [],
	thinoCompatible: false,
	filenamePrefix: 'memo@',      // 原始默认前缀
	dateFormat: '',               // 留空从日记插件获取
	thinoInsertHeading: '',
	thinoSyncMode: 'firstLine',   // 默认首行去重
	debugMode: false
}

export default class FlomoImporterPlugin extends Plugin {
	declare settings: FlomoImporterSettings;
	mainUI: MainUI;
	syncIntervalId: number | null = null;

	async onload() {
		await this.loadSettings();
		this.mainUI = new MainUI(this.app, this);

		addIcon("target", `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-target"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`);
		const ribbonIconEl = this.addRibbonIcon('target', 'Flomo Importer', (evt: MouseEvent) => {
			this.mainUI.open();
		});

		ribbonIconEl.addClass('flomo-importer-ribbon-class');

		// Flomo Importer Command
		this.addCommand({
			id: 'open-flomo-importer',
			name: 'Open Flomo Importer',
			callback: () => {
				this.mainUI.open();
			},
		});

		// 添加手动触发同步的命令
		this.addCommand({
			id: 'sync-flomo-now',
			name: 'Sync Flomo Now',
			callback: async () => {
				await this.syncFlomo();
			},
		});

		// 启动时自动同步
		if (this.settings.autoSyncOnStartup) {
			// 等待 2 秒让 Obsidian 完全加载
			window.setTimeout(() => {
				void this.syncFlomo();
			}, 2000);
		}

		// 设置定时同步
		if (this.settings.autoSyncInterval) {
			this.startAutoSync();
		}
	}


	onunload() {
		// 清除定时器
		if (this.syncIntervalId !== null) {
			window.clearInterval(this.syncIntervalId);
			this.syncIntervalId = null;
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// 开始自动同步
	startAutoSync() {
		// 清除现有的定时器
		if (this.syncIntervalId !== null) {
			window.clearInterval(this.syncIntervalId);
		}

		// 设置每小时同步一次 (3600000ms = 1小时)
		this.syncIntervalId = window.setInterval(() => {
			void this.syncFlomo();
		}, 3600000);
	}

	// 停止自动同步
	stopAutoSync() {
		if (this.syncIntervalId !== null) {
			window.clearInterval(this.syncIntervalId);
			this.syncIntervalId = null;
		}
	}

	// 同步 Flomo 数据
	async syncFlomo() {
		try {
			// 使用 mainUI 的 onSync 方法进行同步
			const syncBtn = new ButtonComponent(createDiv());
			await this.mainUI.onSync(syncBtn);

			// 更新最后同步时间
			this.settings.lastSyncTime = Date.now();
			await this.saveSettings();
		} catch (error) {
			console.error("Auto sync failed:", error);
			new Notice("Flomo auto sync failed: " + error.message);
		}
	}

	// 执行自动同步
	private async runAutoSync(): Promise<void> {
		if (!this.settings.autoSyncOnStartup && !this.settings.autoSyncInterval) {
			return; // 如果两个自动同步选项都关闭，直接返回
		}

		try {
			console.log("开始自动同步 Flomo 数据...");
			const isAuthFileExist = await fs.exists(AUTH_FILE);

			if (!isAuthFileExist) {
				console.log("未找到认证文件，无法自动同步");
				return;
			}

			// 检查下载文件是否存在
			if (!await fs.exists(DOWNLOAD_FILE)) {
				console.log("未找到下载文件，等待先手动同步一次");
				new Notice("Flomo: 请先手动同步一次，以便自动同步功能正常工作");
				return;
			}

			// 创建导入器
			const importer = new FlomoImporter(this.app, this.settings);

			// 执行导入
			const result = await importer.importFlomoFile(DOWNLOAD_FILE, this.settings.mergeByDate);

			// 保存更新后的设置
			await this.saveSettings();

			// 显示结果通知
			if (result.newCount > 0) {
				new Notice(`Flomo 自动同步完成: 发现 ${result.count} 条备忘录，新增 ${result.newCount} 条`);
			} else if (result.count > 0) {
				new Notice(`Flomo 自动同步完成: 全部 ${result.count} 条备忘录已是最新`);
			} else {
				new Notice(`Flomo 自动同步完成: 未发现任何备忘录`);
			}

			// 更新最后同步时间显示（如果UI界面打开的话）
			if (this.mainUI) {
				const lastSyncTimeStr = new Date(this.settings.lastSyncTime).toLocaleString();
				const syncStatusEl = this.mainUI.contentEl.querySelector('.last-sync-time');
				if (syncStatusEl) {
					syncStatusEl.textContent = `上次同步: ${lastSyncTimeStr}`;
				}
			}

			console.log(`自动同步完成: 总共 ${result.count} 条备忘录, 新增 ${result.newCount} 条`);
		} catch (error) {
			console.error("自动同步失败:", error);
			new Notice(`Flomo 自动同步失败: ${error.message}`);
		}
	}
}