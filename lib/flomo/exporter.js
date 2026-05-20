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
exports.FlomoExporter = void 0;
const playwright = __importStar(require("playwright"));
const const_1 = require("./const");
class FlomoExporter {
    async export() {
        let browser = null;
        try {
            // Setup - 使用无头模式后台运行（认证已完成，无需用户交互）
            browser = await playwright.chromium.launch({ headless: true });
            const context = await browser.newContext({ storageState: const_1.AUTH_FILE });
            const page = await context.newPage();
            console.log('正在访问 Flomo 导出页面...');
            // 直接访问导出弹窗页面，增加超时时间到 60 秒，使用 domcontentloaded 而非 networkidle
            await page.goto('https://v.flomoapp.com/mine?source=export', {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });
            // 等待页面加载完成
            await page.waitForLoadState('load', { timeout: 60000 });
            await page.waitForTimeout(2000);
            // 检查是否被重定向到登录页（认证过期）
            const currentUrl = page.url();
            if (currentUrl.includes('login')) {
                throw new Error('认证已过期，请重新登录。删除认证文件后重新点击 Auto Sync 进行登录。');
            }
            console.log('页面已加载完成，当前URL:', currentUrl);
            // 调试用: 保存页面截图
            try {
                const screenshotPath = const_1.DOWNLOAD_FILE.replace('flomo_export.zip', 'page_screenshot.png');
                await page.screenshot({ path: screenshotPath, fullPage: true });
                console.log(`页面截图已保存到: ${screenshotPath}`);
            }
            catch (e) {
                console.log('保存截图失败:', e.message);
            }
            // 等待"导出笔记"弹窗出现
            console.log('等待导出弹窗显示...');
            const exportDialog = page.locator('text=导出笔记').first();
            await exportDialog.waitFor({ state: 'visible', timeout: 10000 });
            console.log('导出弹窗已显示');
            // 查找"导出全部笔记"右侧的绿色"导出"按钮
            console.log('查找导出按钮...');
            // 打印页面上所有包含"导出"的元素,帮助调试
            const debugInfo = await page.evaluate(() => {
                const allElements = Array.from(document.querySelectorAll('*'));
                const exportElements = allElements.filter(el => {
                    const text = el.textContent?.trim() || '';
                    const htmlEl = el;
                    return text === '导出' && htmlEl.offsetWidth > 0 && htmlEl.offsetHeight > 0;
                });
                return exportElements.map(el => {
                    const htmlEl = el;
                    return {
                        tagName: el.tagName,
                        className: el.className,
                        id: el.id,
                        parentTag: el.parentElement?.tagName,
                        parentClass: el.parentElement?.className,
                        rect: el.getBoundingClientRect()
                    };
                });
            });
            console.log('页面上所有"导出"元素:', JSON.stringify(debugInfo, null, 2));
            // 获取"导出全部笔记"周围的完整 HTML 结构
            const htmlStructure = await page.evaluate(() => {
                // 查找包含"导出全部笔记"的元素
                const allElements = Array.from(document.querySelectorAll('*'));
                const targetElement = allElements.find(el => {
                    const text = el.textContent?.trim() || '';
                    return text.includes('导出全部笔记');
                });
                if (!targetElement)
                    return 'Not found';
                // 获取父容器的 HTML (可能包含导出按钮)
                const container = targetElement.closest('div') || targetElement.parentElement;
                return container?.outerHTML || 'No container';
            });
            console.log('=== 导出全部笔记 区域的 HTML ===');
            console.log(htmlStructure);
            console.log('=== HTML 结束 ===');
            // 尝试多种方式查找按钮
            let exportButton = null;
            let foundMethod = '';
            // 方式1: 直接查找 Element UI 按钮（最精确的方式）
            try {
                exportButton = page.locator('button.el-button.el-button--text').filter({ hasText: /^[\s]*导出[\s]*$/ }).first();
                await exportButton.waitFor({ state: 'visible', timeout: 5000 });
                foundMethod = '方式1: Element UI 按钮';
                console.log('找到导出按钮 (方式1: Element UI 按钮)');
            }
            catch (e) {
                console.log('方式1失败,尝试方式2');
            }
            // 方式2: 通过包含"导出全部笔记"文本的行,找同行的按钮
            if (!exportButton) {
                try {
                    // 查找包含"导出全部笔记"的容器
                    const container = page.locator('text=导出全部笔记').locator('..');
                    // 在该容器中查找 button 元素
                    exportButton = container.locator('button').filter({ hasText: /^[\s]*导出[\s]*$/ }).first();
                    await exportButton.waitFor({ state: 'visible', timeout: 5000 });
                    foundMethod = '方式2: 容器内按钮';
                    console.log('找到导出按钮 (方式2: 在容器中查找)');
                }
                catch (e) {
                    console.log('方式2失败,尝试方式3');
                }
            }
            // 方式3: 直接查找所有文本为"导出"的可点击元素
            if (!exportButton) {
                try {
                    exportButton = page.locator('button:has-text("导出"), a:has-text("导出"), [role="button"]:has-text("导出")').filter({ hasText: /^[\s]*导出[\s]*$/ }).first();
                    await exportButton.waitFor({ state: 'visible', timeout: 5000 });
                    foundMethod = '方式3: 通用按钮查找';
                    console.log('找到导出按钮 (方式3: 直接查找可点击元素)');
                }
                catch (e) {
                    console.log('方式3失败');
                }
            }
            if (!exportButton) {
                throw new Error('无法找到导出按钮');
            }
            console.log(`成功找到导出按钮 (${foundMethod})`);
            // 确保按钮完全可点击
            await exportButton.scrollIntoViewIfNeeded();
            await page.waitForTimeout(500);
            // 设置下载监听 - 在点击之前就设置好
            const downloadPromise = page.waitForEvent('download', { timeout: 10 * 60 * 1000 });
            // 使用 Playwright 的 click() 方法 - 这是最可靠的方式
            // Playwright 会自动处理可见性、滚动、元素拦截等问题
            console.log('点击导出按钮...');
            await exportButton.click({ timeout: 5000 });
            console.log('已触发点击');
            // 点击后等待一下,看页面是否有变化
            await page.waitForTimeout(1000);
            console.log('点击后等待1秒');
            // 检查是否有新的弹窗或进度提示出现
            const hasProgress = await page.locator('text=导出中, text=正在导出, text=生成中').count();
            if (hasProgress > 0) {
                console.log('检测到导出进度提示');
            }
            // 等待下载开始
            console.log('等待下载开始...');
            const download = await downloadPromise;
            console.log('下载已触发,正在保存文件...');
            await download.saveAs(const_1.DOWNLOAD_FILE);
            console.log(`文件已保存到: ${const_1.DOWNLOAD_FILE}`);
            // Teardown
            await context.close();
            await browser.close();
            return [true, ""];
        }
        catch (error) {
            console.error('导出过程出错:', error);
            // 确保浏览器关闭
            if (browser) {
                try {
                    await browser.close();
                }
                catch (e) {
                    console.error('关闭浏览器失败:', e);
                }
            }
            return [false, `导出失败: ${error.message || error}`];
        }
    }
}
exports.FlomoExporter = FlomoExporter;
