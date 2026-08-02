import * as fs from 'fs-extra';

import { App, normalizePath } from 'obsidian';
import decompress from 'decompress';
import * as parse5 from "parse5"

const path = (window as any).require ? (window as any).require('path') : null;

import { FlomoCore } from './core';
import { generateMoments } from '../obIntegration/moments';
import { generateCanvas } from '../obIntegration/canvas';

import { FLOMO_CACHE_LOC } from './const'
//const FLOMO_CACHE_LOC = path.join(os.homedir(), "/.flomo/cache/");


export class FlomoImporter {
    private config: Record<string, any>;
    private app: App;

    constructor(app: App, config: Record<string, any>) {
        this.config = config;
        this.app = app;
    }

    private async sanitize(path: string): Promise<string> {
        const flomoData = await fs.readFile(path, "utf8");
        const document = parse5.parse(flomoData);
        return parse5.serialize(document);
    }

    // 获取日记插件的日期格式
    private getDailyNoteDateFormat(): string {
        // 优先使用用户配置的格式
        if (this.config["dateFormat"]) {
            return this.config["dateFormat"];
        }
        
        // 尝试从 Obsidian 日记核心插件获取
        try {
            const dailyNotesPlugin = (this.app as any).internalPlugins?.getPluginById?.('daily-notes');
            if (dailyNotesPlugin?.instance?.options?.format) {
                return dailyNotesPlugin.instance.options.format;
            }
        } catch (e) {
            console.debug('无法获取日记插件配置:', e);
        }
        
        // 默认格式
        return 'YYYY-MM-DD';
    }

    // 格式化日期
    private formatDate(dateStr: string): string {
        const format = this.getDailyNoteDateFormat();
        // dateStr 格式: 2025-01-12
        const [year, month, day] = dateStr.split('-');
        
        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day);
    }

    private async importMemos(flomo: FlomoCore): Promise<FlomoCore> {
        const allowBilink: boolean = this.config["expOptionAllowbilink"];
        const thinoCompatible: boolean = this.config["thinoCompatible"] || false;
        const flomoTarget: string = this.config["flomoTarget"] || 'flomo';
        const memoTarget: string = this.config["memoTarget"] || 'memos';
        const mergeByDate: boolean = thinoCompatible ? true : (this.config["mergeByDate"] || false);
        
        // Thino 模式：使用自定义前缀（可为空）；原始模式：使用 memo@ 前缀
        const filenamePrefix: string = thinoCompatible 
            ? (this.config["filenamePrefix"] || '') 
            : 'memo@';
        const thinoInsertHeading: string = thinoCompatible ? (this.config["thinoInsertHeading"] || '') : '';
        // Thino 增量同步模式：firstLine(首行去重) 或 original(原始机制)
        const thinoSyncMode: string = this.config["thinoSyncMode"] || 'firstLine';

        // 按日期分组 memos
        const memosByDate: Record<string, { contents: string[], memos: Record<string, string>[] }> = {};

        for (const memo of flomo.memos) {
            const date = memo["date"]; // 2025-01-12 格式
            
            let content = memo["content"];
            
            // 处理高亮标记
            content = content.replaceAll("FLOMOIMPORTERHIGHLIGHTMARKPLACEHOLDER", "==");
            
            // 处理双向链接
            if (allowBilink) {
                content = content.replace(/\\\[\\\[/g, "[[").replace(/\\\]\\\]/g, "]]");
            }

            if (!memosByDate[date]) {
                memosByDate[date] = { contents: [], memos: [] };
            }
            memosByDate[date].contents.push(content);
            memosByDate[date].memos.push(memo);
        }

        // Thino 模式：直接放在 flomoTarget 下（忽略 memoTarget）
        // 原始模式：三层结构 flomoTarget/memoTarget/日期/文件
        const memoDir = thinoCompatible
            ? normalizePath(flomoTarget)
            : normalizePath(`${flomoTarget}/${memoTarget}`);
        await this.app.vault.adapter.mkdir(memoDir);

        for (const date in memosByDate) {
            const dateData = memosByDate[date];
            const separator = thinoCompatible ? "\n" : "\n\n---\n\n";

            if (thinoCompatible) {
                // ===== Thino 兼容模式：直接放在 memoDir 下，按日期合并 =====
                const formattedDate = this.formatDate(date);
                const fileName = filenamePrefix ? `${filenamePrefix}${formattedDate}.md` : `${formattedDate}.md`;
                const filePath = normalizePath(`${memoDir}/${fileName}`);
                
                const fileExists = await this.app.vault.adapter.exists(filePath);
                const newContent = dateData.contents.join(separator);
                
                if (thinoSyncMode === 'firstLine' && fileExists) {
                    // ===== 首行去重模式：基于内容首行判断是否重复 =====
                    const existingContent = await this.app.vault.adapter.read(filePath);
                    
                    // 过滤并记录成功添加的内容和对应的 memo
                    const indicesToAdd: number[] = [];
                    dateData.contents.forEach((content, idx) => {
                        const firstLine = content.split('\n')[0].trim();
                        if (!existingContent.includes(firstLine)) {
                            indicesToAdd.push(idx);
                        }
                    });
                    
                    if (indicesToAdd.length === 0) {
                        console.debug(`文件 ${fileName} 中所有内容已存在，跳过`);
                        if (!(filePath in flomo.files)) {
                            flomo.files[filePath] = [];
                        }
                        continue;
                    }
                    
                    // 只添加不重复的内容
                    const contentsToAdd = indicesToAdd.map(idx => dateData.contents[idx]);
                    const filteredContent = contentsToAdd.join(separator);
                    
                    if (thinoInsertHeading) {
                        await this.insertUnderHeading(filePath, thinoInsertHeading, filteredContent, separator);
                    } else {
                        // Thino 模式：条目之间不需要空行，直接换行拼接
                        const trimmedExisting = existingContent.trimEnd();
                        await this.app.vault.adapter.write(filePath, trimmedExisting + separator + filteredContent);
                    }
                    
                    // 将成功写入的 memo ID 添加到 syncedMemoIds
                    indicesToAdd.forEach(idx => {
                        const memo = dateData.memos[idx];
                        if (memo["id"] && !flomo.syncedMemoIds.includes(memo["id"])) {
                            flomo.syncedMemoIds.push(memo["id"]);
                        }
                    });
                } else {
                    // ===== 原始机制模式或新文件：直接写入 =====
                    if (fileExists && thinoInsertHeading) {
                        await this.insertUnderHeading(filePath, thinoInsertHeading, newContent, separator);
                    } else if (fileExists) {
                        // Thino 模式：条目之间不需要空行，直接换行拼接
                        const existingContent = await this.app.vault.adapter.read(filePath);
                        const trimmedExisting = existingContent.trimEnd();
                        await this.app.vault.adapter.write(filePath, trimmedExisting + separator + newContent);
                    } else {
                        if (thinoInsertHeading) {
                            await this.app.vault.adapter.write(filePath, `${thinoInsertHeading}\n${newContent}`);
                        } else {
                            await this.app.vault.adapter.write(filePath, newContent);
                        }
                    }
                    
                    // 首行去重模式下新文件，也需要记录成功写入的 memo ID
                    if (thinoSyncMode === 'firstLine') {
                        dateData.memos.forEach(memo => {
                            if (memo["id"] && !flomo.syncedMemoIds.includes(memo["id"])) {
                                flomo.syncedMemoIds.push(memo["id"]);
                            }
                        });
                    }
                }

                if (!(filePath in flomo.files)) {
                    flomo.files[filePath] = [];
                }
                flomo.files[filePath].push(...dateData.contents);

            } else {
                // ===== 原始模式：三层结构 flomoTarget/memoTarget/日期/文件 =====
                const dateDir = normalizePath(`${memoDir}/${date}`);
                await this.app.vault.adapter.mkdir(dateDir);

                if (mergeByDate) {
                    // 按日期合并：一天一个文件 memo@2025-01-12.md
                    const fileName = `${filenamePrefix}${date}.md`;
                    const filePath = normalizePath(`${dateDir}/${fileName}`);
                    const newContent = dateData.contents.join(separator);

                    const fileExists = await this.app.vault.adapter.exists(filePath);
                    if (fileExists) {
                        const existingContent = await this.app.vault.adapter.read(filePath);
                        await this.app.vault.adapter.write(filePath, existingContent + separator + newContent);
                    } else {
                        await this.app.vault.adapter.write(filePath, newContent);
                    }

                    if (!(filePath in flomo.files)) {
                        flomo.files[filePath] = [];
                    }
                    flomo.files[filePath].push(...dateData.contents);

                } else {
                    // 不按日期合并：每条 memo 一个文件 memo@title_序号.md
                    for (let idx = 0; idx < dateData.memos.length; idx++) {
                        const memo = dateData.memos[idx];
                        const content = dateData.contents[idx];
                        const fileName = `${filenamePrefix}${memo["title"]}_${dateData.memos.length - idx}.md`;
                        const filePath = normalizePath(`${dateDir}/${fileName}`);

                        await this.app.vault.adapter.write(filePath, content);

                        if (!(filePath in flomo.files)) {
                            flomo.files[filePath] = [];
                        }
                        flomo.files[filePath].push(content);
                    }
                }
            }
        }

        return flomo;
    }

    // 在指定标题下插入内容
    private async insertUnderHeading(filePath: string, heading: string, newContent: string, separator: string): Promise<void> {
        const existingContent = await this.app.vault.adapter.read(filePath);
        const lines = existingContent.split('\n');
        
        // 查找标题位置
        const headingIndex = lines.findIndex(line => line.trim() === heading.trim());
        
        if (headingIndex === -1) {
            // 标题不存在，在文件末尾添加标题和内容
            const updatedContent = existingContent + '\n\n' + heading + '\n\n' + newContent;
            await this.app.vault.adapter.write(filePath, updatedContent);
        } else {
            // 找到下一个同级或更高级标题的位置
            const headingLevel = (heading.match(/^#+/) || [''])[0].length;
            let insertIndex = lines.length;
            
            for (let i = headingIndex + 1; i < lines.length; i++) {
                const lineHeadingMatch = lines[i].match(/^(#+)\s/);
                if (lineHeadingMatch && lineHeadingMatch[1].length <= headingLevel) {
                    insertIndex = i;
                    break;
                }
            }
            
            // 在标题下方插入内容（在下一个标题之前）
            // 找到标题后第一个非空行的位置
            let contentStartIndex = headingIndex + 1;
            while (contentStartIndex < insertIndex && lines[contentStartIndex].trim() === '') {
                contentStartIndex++;
            }
            
            // 如果标题下已有内容，追加到现有内容后
            if (contentStartIndex < insertIndex) {
                // 在现有内容后追加（Thino 模式不需要空行分隔）
                if (separator.trim()) {
                    // 原始模式：有分隔符（如 ---）
                    lines.splice(insertIndex, 0, separator.trim(), newContent);
                } else {
                    // Thino 模式：separator 是 \n，直接追加内容（不插入空字符串）
                    lines.splice(insertIndex, 0, newContent);
                }
            } else {
                // 标题下没有内容，直接插入（不插入空字符串）
                lines.splice(headingIndex + 1, 0, newContent);
            }
            
            await this.app.vault.adapter.write(filePath, lines.join('\n'));
        }
    }

    // 专门用于复制 Flomo 附件的方法
    // Flomo 导出结构: file/日期/用户ID/文件 或 file/日期/用户ID/子目录/文件
    // 目标结构: flomo attachment/日期/文件 (跳过 file/ 和用户ID层，扁平化所有文件)
    private async copyAttachmentsSkipUserIdDir(sourceDir: string, targetDir: string): Promise<void> {
        try {
            const dateItems = await fs.readdir(sourceDir, { withFileTypes: true });

            // 第一层：日期目录 (如 2025-11-03)
            for (const dateItem of dateItems) {
                if (!dateItem.isDirectory()) continue;
                // 跳过 js 脚本目录（flomo导出包含的脚本文件夹，不需要导入）
                if (dateItem.name === 'js') continue;

                const dateDirPath = `${sourceDir}/${dateItem.name}`;
                const targetDateDir = normalizePath(`${targetDir}/${dateItem.name}`);

                // 递归收集所有文件（扁平化）
                const filesToCopy: { source: string; target: string }[] = [];

                // 递归函数：收集目录下所有文件
                const collectFiles = async (dir: string) => {
                    const items = await fs.readdir(dir, { withFileTypes: true });
                    for (const item of items) {
                        const itemPath = `${dir}/${item.name}`;
                        if (item.isFile()) {
                            // 直接使用文件名，扁平化到日期目录下
                            filesToCopy.push({
                                source: itemPath,
                                target: normalizePath(`${targetDateDir}/${item.name}`)
                            });
                        } else if (item.isDirectory()) {
                            // 递归处理子目录
                            await collectFiles(itemPath);
                        }
                    }
                };

                await collectFiles(dateDirPath);

                // 只有当有文件要复制时才创建目录
                if (filesToCopy.length > 0) {
                    await this.app.vault.adapter.mkdir(targetDateDir);
                    console.debug(`创建日期目录: ${targetDateDir}，包含 ${filesToCopy.length} 个文件`);

                    // 复制文件
                    for (const file of filesToCopy) {
                        try {
                            const content = await fs.readFile(file.source);
                            // 转换 Buffer 为 ArrayBuffer
                            const arrayBuffer = content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength);
                            await this.app.vault.adapter.writeBinary(file.target, arrayBuffer);
                            console.debug(`复制附件: ${file.source} -> ${file.target}`);
                        } catch (copyError) {
                            console.warn(`复制附件失败: ${file.source}`, copyError);
                        }
                    }
                } else {
                    console.debug(`跳过空日期目录: ${dateDirPath}`);
                }
            }
        } catch (error) {
            console.warn(`复制附件目录失败: ${sourceDir}`, error);
        }
    }

    async import(): Promise<FlomoCore> {

        // 1. Create workspace
        const tmpDir = path ? path.join(FLOMO_CACHE_LOC, "data") : `${FLOMO_CACHE_LOC}/data`;
        await fs.mkdirp(tmpDir);

        // 2. Unzip flomo_backup.zip to workspace
        const files = await decompress(this.config["rawDir"], tmpDir)

        // 3. copy attachments to ObVault
        // 使用配置中的 flomoTarget 动态生成附件目录路径
        // 简化目录结构：flomoTarget/flomo attachment/日期/文件
        const flomoTarget = this.config["flomoTarget"] || "flomo";
        let attachementDir = normalizePath(`${flomoTarget}/flomo attachment`);

        console.debug(`使用附件目录: ${attachementDir} (基于 flomoTarget: ${flomoTarget})`);

        for (const f of files) {
            if (f.type == "directory" && (f.path.endsWith("/file/") || f.path === "file/")) {
                console.debug(`DEBUG: copying from ${tmpDir}/${f.path} to ${attachementDir}`)

                try {
                    // 确保目标目录存在
                    await this.app.vault.adapter.mkdir(attachementDir);

                    // 复制附件，跳过 file/ 层，保留日期目录，跳过用户ID层
                    const sourceDir = `${tmpDir}/${f.path}`;
                    await this.copyAttachmentsSkipUserIdDir(sourceDir, attachementDir);

                } catch (error) {
                    console.warn(`处理附件目录失败: ${tmpDir}/${f.path}`, error);
                }
                break
            }

        }

        // 4. Import Memos
        // @Mar-31, 2024 Fix: #21 - Update default page from index.html to <userid>.html
        const defaultPage = (await fs.readdir(`${tmpDir}/${files[0].path}`)).filter((fn, _idx, fn_array) => fn.endsWith('.html'))[0];
        const dataExport = await this.sanitize(`${tmpDir}/${files[0].path}/${defaultPage}`);

        // 从配置中获取已同步的备忘录IDs，用于增量同步
        const thinoCompatible = this.config["thinoCompatible"] || false;
        const thinoSyncMode = this.config["thinoSyncMode"] || 'firstLine';
        const useFirstLineDedup = thinoCompatible && thinoSyncMode === 'firstLine';
        
        // 首行去重模式：传空数组给 FlomoCore（不在解析阶段过滤），由 importer 在成功写入后添加 ID
        const syncedMemoIdsForCore = useFirstLineDedup ? [] : (this.config["syncedMemoIds"] || []);
        console.debug(`DEBUG: Loaded ${syncedMemoIdsForCore.length} synced memo IDs for incremental sync (首行去重模式: ${useFirstLineDedup})`);

        // 将已同步的备忘录IDs和flomoTarget传递给FlomoCore
        // 同时传递标签过滤配置和 Thino 兼容模式
        // 首行去重模式下，skipAutoAddSyncedIds=true，由 importer 控制何时添加 ID
        const filterTags = this.config["filterByTags"] ? (this.config["syncTags"] || []) : [];
        const flomo = new FlomoCore(dataExport, syncedMemoIdsForCore, flomoTarget, filterTags, thinoCompatible, useFirstLineDedup);
        
        // 首行去重模式：将原始 syncedMemoIds 合并到 flomo.syncedMemoIds，避免丢失历史记录
        if (useFirstLineDedup) {
            const originalSyncedIds = this.config["syncedMemoIds"] || [];
            originalSyncedIds.forEach((id: string) => {
                if (!flomo.syncedMemoIds.includes(id)) {
                    flomo.syncedMemoIds.push(id);
                }
            });
        }

        const memos = await this.importMemos(flomo);

        // 5. Ob Intergations
        // If Generate Moments
        if (this.config["optionsMoments"] != "skip") {
            await generateMoments(this.app, memos, this.config);
        }


        // If Generate Canvas
        if (this.config["optionsCanvas"] != "skip") {
            await generateCanvas(this.app, memos, this.config);
        }


        // 6. Cleanup Workspace
        await fs.remove(tmpDir);

        return flomo

    }

    public async importFlomoFile(filePath: string, mergeDayFile: boolean = true): Promise<{ count: number, newCount: number }> {
        if (filePath === undefined) {
            throw new Error("filepath undefined");
        }
        const config = this.config;
        if (!await fs.exists(filePath)) {
            throw new Error("File doesn't exist: " + filePath);
        }
        let folder = ""

        if (config.flomoTarget !== undefined) {
            folder = config.flomoTarget;
        }
        else {
            folder = "flomo";
        }

        if (!await fs.exists(folder)) {
            await fs.mkdir(folder);
        }

        // Extract basic information
        let flomoData: string = await this.sanitize(filePath);

        // 从配置中获取已同步的备忘录ID列表
        const syncedMemoIds = this.config.syncedMemoIds || [];
        console.debug(`从配置中读取到 ${syncedMemoIds.length} 条已同步记录`);

        // 从配置中获取 flomoTarget
        const flomoTarget = this.config.flomoTarget || "flomo";

        // 获取标签过滤配置
        const filterTags = this.config.filterByTags ? (this.config.syncTags || []) : [];

        // 获取 Thino 兼容模式配置
        const thinoCompatible = this.config.thinoCompatible || false;

        // 将已同步ID、flomoTarget、标签过滤和 Thino 模式传递给FlomoCore
        const flomo = new FlomoCore(flomoData, syncedMemoIds, flomoTarget, filterTags, thinoCompatible);

        const totalMemos = flomo.memos.length;
        const newMemos = flomo.newMemosCount;
        console.log(`总共找到 ${totalMemos} 条备忘录，其中 ${newMemos} 条是新的`);

        // 将所有日记按日期分组
        const dayGroups: Record<string, Record<string, string>[]> = {};

        // 只对新增的备忘录进行处理
        flomo.memos.forEach((memo) => {
            // 检查这个备忘录是否有ID（应该都有）
            if (memo.id) {
                // 检查这个ID是否在旧的已同步列表中（不应该在，因为FlomoCore已经过滤过了）
                // 但为了安全起见，这里再次检查
                if (!syncedMemoIds.includes(memo.id)) {
                    // 这是一个新备忘录
                    const day = memo.date;
                    if (day in dayGroups) {
                        dayGroups[day].push(memo);
                    } else {
                        dayGroups[day] = [memo];
                    }
                }
            }
        });

        // 更新配置中的已同步ID列表 - 合并旧的和新发现的ID
        this.config.syncedMemoIds = [...new Set([...syncedMemoIds, ...flomo.syncedMemoIds])];
        console.debug(`更新后的同步记录数: ${this.config.syncedMemoIds.length}`);

        // 更新最后同步时间
        this.config.lastSyncTime = Date.now();

        // 保存配置（这里是假设的，实际保存应该在外部进行）
        // 主要是让调用方知道需要保存配置

        for (let day in dayGroups) {
            if (mergeDayFile && dayGroups[day].length > 1) {
                const groupFiles = dayGroups[day];
                // TODO: Add file check, prompt if existing. Currently just overwriting

                const content = groupFiles.map((i) => {
                    return i.content;
                }).join("\n\n---\n\n");

                const fileName = groupFiles[0].title + ".md";
                const outPath = path ? path.join(folder, fileName) : `${folder}/${fileName}`;
                await fs.writeFile(outPath, content, 'utf8');


            } else {
                for (let i = 0; i < dayGroups[day].length; i++) {
                    const memo = dayGroups[day][i];
                    // 如果当日仅有一条记录，则按照title(date).md保存
                    // 如果当日有多条需要分开保存，则按照title(date)_sequence.md保存
                    let fileName = memo.title;
                    // 添加序号，防止文件名冲突
                    if (dayGroups[day].length > 1) {
                        fileName += "_" + (i + 1);
                    }
                    fileName += ".md";
                    const outPath = path ? path.join(folder, fileName) : `${folder}/${fileName}`;
                    await fs.writeFile(outPath, memo.content, 'utf8');
                }
            }
        }

        // 额外生成Obsidian的Moments或Canvas
        if (config.optionsMoments === "copy_with_link" ||
            config.optionsMoments === "copy_with_content") {
            await generateMoments(this.app, flomo, config);
        }

        if (config.optionsCanvas === "copy_with_link" ||
            config.optionsCanvas === "copy_with_content") {
            await generateCanvas(this.app, flomo, config);
        }

        return { count: totalMemos, newCount: newMemos };
    }

}
