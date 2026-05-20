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
    constructor(flomoData, syncedMemoIds = [], flomoTarget = 'flomo', filterTags = []) {
        //const root = parse(DOMPurify.sanitize(flomoData));
        const root = (0, node_html_parser_1.parse)(flomoData);
        this.syncedMemoIds = [...syncedMemoIds]; // 复制已同步的备忘录IDs
        this.flomoTarget = flomoTarget;
        this.filterTags = filterTags;
        this.memos = this.loadMemos(root.querySelectorAll(".memo"));
        this.tags = this.loadTags(root.getElementById("tag").querySelectorAll("option"));
        this.files = {};
    }
    loadMemos(memoNodes) {
        const res = [];
        const extrtactTitle = (item) => { return item.replace(/(-|:|\s)/gi, "_"); };
        // 使用箭头函数以便访问 this.flomoTarget
        const extractContent = (content) => {
            //return NodeHtmlMarkdown.translate(content, {bulletMarker: '-',}).replace('\[', '[').replace('\]', ']')
            //return NodeHtmlMarkdown.translate(content, {bulletMarker: '-',}).replace('\[', '[').replace('\]', ']')
            //return (new showdown.Converter({metadata: false})).makeMarkdown(content)
            //return NodeHtmlMarkdown.translate(content, {bulletMarker: '-'})
            const td = new turndown_1.default({ bulletListMarker: '-' });
            //const p_rule = {
            //    filter: 'p',
            //    replacement: function (content) {
            //      return '\n' + content + '\n'
            //    }
            //  }
            const liRule = {
                filter: 'li',
                replacement: function (content, node, options) {
                    content = content
                        .replace(/^\n+/, '') // remove leading newlines
                        .replace(/\n+$/, '\n') // replace trailing newlines with just a single one
                        .replace(/\n/gm, '\n    '); // indent
                    //.replace(/\<p\>/gi, '')
                    //.replace(/\<\/p\>/gi, '')
                    var prefix = options.bulletListMarker + ' ';
                    var parent = node.parentNode;
                    if (parent.nodeName === 'OL') {
                        var start = parent.getAttribute('start');
                        var index = Array.prototype.indexOf.call(parent.children, node);
                        prefix = (start ? Number(start) + index : index + 1) + '.  ';
                    }
                    return (prefix + content + (node.nextSibling && !/\n$/.test(content) ? '\n' : ''));
                }
            };
            td.addRule('listItem', liRule);
            // 使用动态的 flomoTarget 路径，附件目录改为 flomo attachment（包含图片、录音等所有附件）
            // Flomo 原始路径: file/2025-11-03/4852/xxx.m4a
            // 简化后路径: flomoTarget/flomo attachment/2025-11-03/xxx.m4a (跳过 file/ 和用户ID)
            const attachmentPath = `${this.flomoTarget}/flomo attachment/`;
            return td.turndown(content).replace(/\\\[/g, '[')
                .replace(/\\\]/g, ']')
                //replace(/\\#/g, '#')
                // 匹配 file/日期/用户ID/文件名，替换为 附件路径/日期/文件名
                // 支持方括号内有文字的情况：![xxx](file/...) 或 ![](file/...)
                .replace(/!\[([^\]]*)\]\(file\/([^\/]+)\/[^\/]+\/([^)]+)\)/gi, `![$1](<${attachmentPath}$2/$3>)`);
            //.replace(/\<\!--\s--\>/g, '')
            //.replace(/^\s*[\r\n]/gm,'')
            //.replace(/!\[null\]\(<file\//gi, "\n![](<flomo/");
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
            // 将这个ID添加到已同步列表
            this.syncedMemoIds.push(memoId);
            const content = extractContent(contentBody) + "\n" + extractContent(contentFile);
            res.push({
                "title": title,
                "date": dateTime.split(" ")[0],
                "content": "📅 [[" + dateTime.split(" ")[0] + "]]" + " " + dateTime.split(" ")[1] + "\n\n" + content,
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
