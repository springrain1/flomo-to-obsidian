"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMoments = void 0;
async function generateMoments(app, flomo, config) {
    if (flomo.memos.length > 0) {
        const buffer = [];
        const tags = [];
        const index_file = `${config["flomoTarget"]}/Flomo Moments.md`;
        const memoFiles = Object.keys(flomo.files);
        //buffer.push(`updated at: ${(new Date()).toLocaleString()}\n\n`);
        for (const tag of flomo.tags) {
            tags.push(`"${tag}"`);
        }
        ;
        buffer.push(`---\ncreatedDate: ${(new Date()).toLocaleString().split(' ')[0]}\ntags:\n  - ${tags.join("\n  - ")}\n---\n`);
        for (const [idx, memoFile] of memoFiles.entries()) {
            buffer.push(`![[${memoFile}]]\n\n---\n`);
        }
        ;
        await app.vault.adapter.write(index_file, buffer.join("\n"));
    }
}
exports.generateMoments = generateMoments;
