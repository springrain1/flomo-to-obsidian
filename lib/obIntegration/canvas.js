"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCanvas = void 0;
const uuid_1 = require("uuid");
const canvasJson = {
    "nodes": [],
    "edges": []
};
const canvasSize = {
    "L": [500, 500],
    "M": [300, 350],
    "S": [230, 280]
};
async function generateCanvas(app, flomo, config) {
    if (flomo.memos.length > 0) {
        const size = canvasSize[config["canvasSize"]];
        const buffer = [];
        const canvasFile = `${config["flomoTarget"]}/Flomo Canvas.canvas`;
        const memoFiles = Object.keys(flomo.files);
        for (const [idx, memoFile] of memoFiles.entries()) {
            const _id = (0, uuid_1.v4)();
            const _x = (idx % 8) * (size[0] + 20); //  margin: 20px, length: 8n
            const _y = (Math.floor(idx / 8)) * (size[1] + 20); //  margin: 20px
            const content = flomo.files[memoFile];
            const canvasNode = (() => {
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
                }
                else {
                    return {
                        "type": "text",
                        "text": "**" + memoFile.split("@")[1] + "**\n\n" + content.join("\n\n---\n\n"),
                        "id": _id,
                        "x": _x,
                        "y": _y,
                        "width": size[0],
                        "height": size[1]
                    };
                }
            })();
            buffer.push(canvasNode);
        }
        ;
        const canvasJson = { "nodes": buffer, "edges": [] };
        await app.vault.adapter.write(canvasFile, JSON.stringify(canvasJson));
    }
}
exports.generateCanvas = generateCanvas;
