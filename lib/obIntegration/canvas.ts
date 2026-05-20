import { App } from 'obsidian';
import { v4 as uuidv4 } from 'uuid';
import { FlomoCore } from '../flomo/core';

const canvasJson = {
    "nodes": [],
    "edges": []
}

const canvasSize = {
    "L": [500, 500],
    "M": [300, 350],
    "S": [230, 280]
}

export async function generateCanvas(app: App, flomo: FlomoCore, config: Record<string, any>): Promise<void> {
    if (flomo.memos.length > 0) {
        const size: number[] = canvasSize[config["canvasSize"]];
        const buffer: Record<string, string>[] = [];
        const canvasFile = `${config["flomoTarget"]}/Flomo Canvas.canvas`;
        const memoFiles = Object.keys(flomo.files);

        for (const [idx, memoFile] of memoFiles.entries()) {
                
            const _id: string = uuidv4();
            const _x: number = (idx % 8) * (size[0] + 20); //  margin: 20px, length: 8n
            const _y: number = (Math.floor(idx / 8)) * (size[1] + 20); //  margin: 20px

            const content = flomo.files[memoFile];

            const canvasNode: Record<string, any> = (() => {
                if (config["optionsCanvas"] == "copy_with_link") {
                    return {
                        "type": "file",
                        "file": memoFile,
                        "id": _id,
                        "x": _x,
                        "y": _y,
                        "width": size[0],
                        "height": size[1]
                    };
                } else {
                    // 从文件路径提取标题：支持 memo@2025-01-12.md 或 2025-01-12.md 格式
                    const fileName = memoFile.split("/").pop() || memoFile;
                    const baseName = fileName.replace(/\.md$/, '');
                    // 如果有 @ 符号，取 @ 后面的部分；否则使用整个文件名
                    const title = baseName.includes("@") ? baseName.split("@")[1] : baseName;
                    
                    return {
                        "type": "text",
                        "text": "**" + title + "**\n\n" + content.join("\n\n---\n\n"),
                        "id": _id,
                        "x": _x,
                        "y": _y,
                        "width": size[0],
                        "height": size[1]
                    };
                }
            })()

            buffer.push(canvasNode);
        };

        const canvasJson = { "nodes": buffer, "edges": [] }
        await app.vault.adapter.write(canvasFile, JSON.stringify(canvasJson));
        
    }
}