"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlomoCore = void 0;
const node_html_parser_1 = require("node-html-parser");
//import { NodeHtmlMarkdown} from 'node-html-markdown';
const turndown_1 = __importDefault(require("turndown"));
class FlomoCore {
    memos;
    tags;
    files;
    syncedMemoIds = []; // 已同步的备忘录IDs
    newMemosCount = 0; // 新增备忘录数量
    flomoTarget; // Flomo 主目录路径
    filterTags = []; // 要筛选的标签
    thinoCompatible = false; // Thino 兼容模式
    skipAutoAddSyncedIds = false; // 是否跳过自动添加 syncedMemoIds（首行去重模式使用）
    constructor(flomoData, syncedMemoIds = [], flomoTarget = 'flomo', filterTags = [], thinoCompatible = false, skipAutoAddSyncedIds = false) {
        const root = (0, node_html_parser_1.parse)(flomoData);
        this.syncedMemoIds = [...syncedMemoIds];
        this.flomoTarget = flomoTarget;
        this.filterTags = filterTags;
        this.thinoCompatible = thinoCompatible;
        this.skipAutoAddSyncedIds = skipAutoAddSyncedIds;
        this.memos = this.loadMemos(root.querySelectorAll(".memo"));
        this.tags = this.loadTags(root.getElementById("tag").querySelectorAll("option"));
        this.files = {};
    }
    loadMemos(memoNodes) {
        const res = [];
        const extrtactTitle = (item) => { return item.replace(/(-|:|\s)/gi, "_"); };
        // 使用箭头函数以便访问 this
        const extractContent = (content) => {
            const td = new turndown_1.default({ bulletListMarker: '-' });
            // 下划线规则：保留 <u> 标签
            td.addRule('underline', {
                filter: 'u',
                replacement: function (content) {
                    return `<u>${content}</u>`;
                }
            });
            // 段落规则：检测空 <p> 标签作为空行标记
            td.addRule('paragraph', {
                filter: 'p',
                replacement: function (content, node) {
                    // 检查是否在列表项内
                    const isInListItem = node.parentNode && node.parentNode.nodeName === 'LI';
                    if (isInListItem) {
                        // 列表项内的段落：不加额外换行
                        return content;
                    }
                    // 空段落（flomo 中的空行）：输出空行
                    if (!content.trim()) {
                        return '\n';
                    }
                    // 普通段落：只加一个换行
                    return content + '\n';
                }
            });
            // 有序/无序列表规则：列表前后不加空行
            td.addRule('list', {
                filter: ['ul', 'ol'],
                replacement: function (content, node) {
                    // 检查是否是嵌套列表（父节点是 li）
                    const isNested = node.parentNode && node.parentNode.nodeName === 'LI';
                    if (isNested) {
                        // 嵌套列表：前面加换行，内容整体缩进制表符
                        const indentedContent = content.split('\n').map((line) => line ? '\t' + line : line).join('\n');
                        return '\n' + indentedContent;
                    }
                    // 顶层列表：不加额外空行
                    return content + '\n';
                }
            });
            const liRule = {
                filter: 'li',
                replacement: function (content, node, options) {
                    content = content
                        .replace(/^\n+/, '') // 移除开头换行
                        .replace(/\n+$/, ''); // 移除结尾换行
                    var prefix = options.bulletListMarker + ' ';
                    var parent = node.parentNode;
                    if (parent.nodeName === 'OL') {
                        var start = parent.getAttribute('start');
                        var index = Array.prototype.indexOf.call(parent.children, node);
                        prefix = (start ? Number(start) + index : index + 1) + '. ';
                    }
                    // 如果有下一个兄弟节点，添加换行
                    const suffix = node.nextSibling ? '\n' : '';
                    return prefix + content + suffix;
                }
            };
            td.addRule('listItem', liRule);
            // 附件路径转换
            const attachmentPath = `${this.flomoTarget}/flomo attachment/`;
            let result = td.turndown(content)
                .replace(/\\\[/g, '[')
                .replace(/\\\]/g, ']')
                // 匹配 file/日期/用户ID/文件名，替换为 附件路径/日期/文件名
                .replace(/!\[([^\]]*)\]\(file\/([^\/]+)\/[^\/]+\/([^)]+)\)/gi, `![$1](<${attachmentPath}$2/$3>)`);
            // 清理多余空行（保留原始空行）
            result = result
                .replace(/\n{3,}/g, '\n\n') // 3个以上换行变成2个（保留一个空行）
                .replace(/^\n+/, '') // 移除开头空行
                .replace(/\n+$/, ''); // 移除结尾空行
            return result;
        };
        // 用于记录当天每个时间戳出现的次数
        const timeOccurrences = {};
        // 记录处理的总备忘录数量，用于生成顺序ID
        let totalMemoCount = 0;
        console.debug(`开始处理 ${memoNodes.length} 条备忘录，已有 ${this.syncedMemoIds.length} 条同步记录`);
        if (this.filterTags.length > 0) {
            console.debug(`启用标签过滤，只同步包含以下标签的备忘录: ${this.filterTags.join(', ')}`);
        }
        memoNodes.forEach(i => {
            totalMemoCount++;
            const dateTime = i.querySelector(".time").textContent;
            const title = extrtactTitle(dateTime);
            // 计算当前时间戳出现的次数
            if (!timeOccurrences[dateTime]) {
                timeOccurrences[dateTime] = 0;
            }
            timeOccurrences[dateTime]++;
            const occurrenceCount = timeOccurrences[dateTime];
            // @Mar-31, 2024 Fix: #20 - Support <mark>.*?<mark/>
            const contentBody = i.querySelector(".content").innerHTML.replaceAll("<mark>", "FLOMOIMPORTERHIGHLIGHTMARKPLACEHOLDER").replaceAll("</mark>", "FLOMOIMPORTERHIGHLIGHTMARKPLACEHOLDER");
            const contentFile = i.querySelector(".files").innerHTML;
            // 标签过滤：如果启用了标签过滤，检查备忘录是否包含指定标签
            if (this.filterTags.length > 0) {
                // 从内容中提取标签（格式：#标签名 或 #标签名/子标签）
                const tagRegex = /#[\u4e00-\u9fa5\w\-\/]+/g;
                const memoTags = contentBody.match(tagRegex) || [];
                const memoTagsNormalized = memoTags.map(t => t.toLowerCase());
                // 检查是否包含任意一个指定的标签
                const hasMatchingTag = this.filterTags.some(filterTag => {
                    const normalizedFilter = filterTag.startsWith('#') ? filterTag.toLowerCase() : `#${filterTag.toLowerCase()}`;
                    return memoTagsNormalized.some(memoTag => memoTag === normalizedFilter || memoTag.startsWith(normalizedFilter + '/'));
                });
                if (!hasMatchingTag) {
                    console.debug(`备忘录不包含指定标签，跳过: ${dateTime}`);
                    return; // 跳过不包含指定标签的备忘录
                }
            }
            // 改进的哈希算法：结合更多信息
            let contentHash = 0;
            // 1. 对标题进行哈希
            const titleText = title || "";
            for (let j = 0; j < titleText.length; j++) {
                contentHash = ((contentHash << 5) - contentHash) + titleText.charCodeAt(j);
                contentHash = contentHash & contentHash;
            }
            // 2. 对正文进行哈希
            for (let j = 0; j < contentBody.length; j++) {
                contentHash = ((contentHash << 5) - contentHash) + contentBody.charCodeAt(j);
                contentHash = contentHash & contentHash;
            }
            // 3. 对附件内容进行哈希
            for (let j = 0; j < contentFile.length; j++) {
                contentHash = ((contentHash << 5) - contentHash) + contentFile.charCodeAt(j);
                contentHash = contentHash & contentHash;
            }
            // 生成更可靠的唯一ID:
            // - 包含完整日期时间
            // - 包含内容哈希 
            // - 包含该时间戳的出现次数（处理同一时间的多条内容）
            // - 包含总的处理顺序（作为最后的防冲突保障）
            const memoId = `${dateTime}_${Math.abs(contentHash)}_${occurrenceCount}_${totalMemoCount}`;
            console.debug(`备忘录 #${totalMemoCount}: 时间=${dateTime}, 哈希=${Math.abs(contentHash)}, 同时间第${occurrenceCount}条, ID=${memoId}`);
            // 检查这个备忘录是否已经同步过
            // 支持内容更新检测：只有时间戳和内容哈希都匹配才认为是已同步
            const isAlreadySynced = this.syncedMemoIds.some(syncedId => {
                // 完全匹配（新格式）
                if (syncedId === memoId)
                    return true;
                // 兼容旧格式：检查日期时间和内容哈希是否都匹配
                const parts = syncedId.split('_');
                if (parts.length >= 2) {
                    const syncedDateTime = parts[0];
                    const syncedHash = parts[1];
                    // 只有时间戳和哈希都匹配才认为是同一条备忘录
                    return syncedDateTime === dateTime && syncedHash === Math.abs(contentHash).toString();
                }
                // 非常旧的格式（只有时间戳）：只检查时间戳
                return syncedId === dateTime;
            });
            if (isAlreadySynced) {
                // 已同步的备忘录，跳过
                console.debug(`备忘录已存在，跳过: ${dateTime} (hash: ${Math.abs(contentHash)})`);
                return;
            }
            else {
                // 检查是否是内容更新（同一时间戳，不同哈希）
                const existingMemoIndex = this.syncedMemoIds.findIndex(syncedId => {
                    const parts = syncedId.split('_');
                    return parts.length >= 2 && parts[0] === dateTime;
                });
                if (existingMemoIndex >= 0) {
                    // 发现内容更新，删除旧的ID记录
                    const oldId = this.syncedMemoIds[existingMemoIndex];
                    console.debug(`发现内容更新: ${dateTime}, 旧哈希=${oldId.split('_')[1]}, 新哈希=${Math.abs(contentHash)}`);
                    this.syncedMemoIds.splice(existingMemoIndex, 1);
                }
            }
            // 这是一个新备忘录，增加计数
            this.newMemosCount++;
            console.debug(`发现新备忘录 #${this.newMemosCount}: ${memoId}`);
            // 将这个ID添加到已同步列表（首行去重模式下跳过，由 importer.ts 在成功写入后添加）
            if (!this.skipAutoAddSyncedIds) {
                this.syncedMemoIds.push(memoId);
            }
            const content = extractContent(contentBody) + "\n" + extractContent(contentFile);
            // 根据 Thino 兼容模式决定内容格式
            let formattedContent;
            if (this.thinoCompatible) {
                // Thino 格式: - HH:mm 内容（多行缩进）
                const time = dateTime.split(" ")[1]; // 提取 HH:mm
                const trimmedContent = content.trim();
                // 将多行内容缩进，确保属于同一个列表项
                // 使用制表符 \t 而不是空格，保持 Thino 原始格式
                const indentedContent = trimmedContent.split('\n').map((line, idx) => idx === 0 ? line : '\t' + line).join('\n');
                formattedContent = `- ${time} ${indentedContent}`;
            }
            else {
                // 原格式: 📅 [[日期]] 时间
                formattedContent = "📅 [[" + dateTime.split(" ")[0] + "]]" + " " + dateTime.split(" ")[1] + "\n\n" + content;
            }
            res.push({
                "title": title,
                "date": dateTime.split(" ")[0],
                "content": formattedContent,
                "id": memoId // 保存备忘录ID
            });
        });
        console.debug(`处理完成: 总共 ${totalMemoCount} 条备忘录, 新增 ${this.newMemosCount} 条`);
        return res;
    }
    loadTags(tagNodes) {
        const res = [];
        tagNodes.slice(1).forEach(i => { res.push(i.textContent); });
        return res;
    }
}
exports.FlomoCore = FlomoCore;
