import * as playwright from 'playwright';

import { DOWNLOAD_FILE, AUTH_FILE } from './const'

// 调试开关：由构造函数设置
let EXPORTER_DEBUG = false;

// Flomo WAF 通过检测 User-Agent 中的 "HeadlessChrome" 拦截无头浏览器
// 使用与有头模式一致的 UA 即可绕过
const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function dbg(...args: any[]) {
    if (EXPORTER_DEBUG) console.log('[Exporter:DBG]', ...args);
}

export class FlomoExporter {
    constructor(isDebug: boolean = false) {
        EXPORTER_DEBUG = isDebug;
    }

    // filterTags: 要导出的标签列表，为空则导出全部
    async export(filterTags: string[] = []): Promise<[boolean, string]> {
        let browser = null;
        try {
            // 正常模式：无头后台运行 + 自定义 UA 绕过 WAF
            // 调试模式：有头模式，弹出可见窗口便于观察
            const headless = !EXPORTER_DEBUG;
            dbg(`启动浏览器 (headless=${headless})...`);
            browser = await playwright.chromium.launch({ headless });
            dbg('浏览器已启动');

            dbg(`加载认证文件: ${AUTH_FILE}`);
            const context = await browser.newContext({
                storageState: AUTH_FILE,
                ...(headless ? { userAgent: CHROME_UA } : {})
            });
            const page = await context.newPage();

            const mode = filterTags.length > 0 ? '按标签(' + filterTags.join(', ') + ')' : '全部导出';
            console.log(`[Exporter] 开始导出 (${mode})`);

            // 根据是否有标签过滤，决定访问不同的页面
            if (filterTags.length > 0) {
                await this.exportByTag(page, filterTags);
            } else {
                await this.exportAll(page);
            }

            // Teardown
            await context.close();
            await browser.close();

            return [true, ""]
        } catch (error) {
            console.error('[Exporter] 导出过程出错:', error);

            // 确保浏览器关闭
            if (browser) {
                try {
                    await browser.close();
                } catch (e) {
                    console.error('[Exporter] 关闭浏览器失败:', e);
                }
            }

            return [false, `导出失败: ${error.message || error}`];
        }
    }

    // 检查页面状态，抛出明确错误
    private async checkPageState(page: playwright.Page, label: string): Promise<void> {
        const currentUrl = page.url();
        const pageTitle = await page.title();
        dbg(`[${label}] URL: ${currentUrl}, 标题: "${pageTitle}"`);

        if (currentUrl.includes('login')) {
            throw new Error('认证已过期（URL重定向到登录页），请重新登录。');
        }
        if (pageTitle.includes('403') || pageTitle.includes('Forbidden')) {
            throw new Error('被 Flomo 服务器拒绝访问(403 Forbidden)，可能是无头浏览器被检测拦截。');
        }
    }

    // 调试截图：仅在 DEBUG 开启时保存
    private async debugScreenshot(page: playwright.Page, name: string): Promise<void> {
        if (!EXPORTER_DEBUG) return;
        const path = DOWNLOAD_FILE.replace('flomo_export.zip', `debug_${name}.png`);
        await page.screenshot({ path });
        dbg(`截图已保存: ${path}`);
    }

    // 错误截图：总是保存（用于排查问题）
    private async errorScreenshot(page: playwright.Page, name: string, label: string): Promise<void> {
        const path = DOWNLOAD_FILE.replace('flomo_export.zip', `error_${name}.png`);
        await page.screenshot({ path });
        const bodySnippet = await page.locator('body').innerText().catch(() => '(无法获取)');
        console.error(`[${label}] 操作超时！截图: ${path}`);
        console.error(`[${label}] 页面内容前300字: "${bodySnippet.substring(0, 300)}"`);
    }

    // 按标签导出
    private async exportByTag(page: playwright.Page, filterTags: string[]): Promise<void> {
        const searchQuery = filterTags.map(tag => {
            const trimmed = tag.trim();
            return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
        }).join(' ');

        dbg(`搜索内容: ${searchQuery}`);

        // 1. 访问 Flomo 主页
        await page.goto('https://v.flomoapp.com/mine', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
        await page.waitForLoadState('load', { timeout: 60000 });
        await page.waitForTimeout(2000);

        await this.checkPageState(page, 'exportByTag');
        await this.debugScreenshot(page, 'after_load');

        // 2. 点击搜索框
        dbg('定位搜索框...');
        const searchInput = page.locator('.search-input input.el-input__inner');
        try {
            await searchInput.waitFor({ state: 'visible', timeout: 10000 });
        } catch (e) {
            await this.errorScreenshot(page, 'search_input', 'exportByTag');
            throw e;
        }
        await searchInput.click();
        await page.waitForTimeout(500);

        // 3. 输入搜索内容
        dbg(`输入搜索内容: ${searchQuery}`);
        await searchInput.fill(searchQuery);
        await page.waitForTimeout(300);

        // 4. 按回车执行搜索
        dbg('按回车搜索...');
        await searchInput.press('Enter');
        await page.waitForTimeout(3000);
        await this.debugScreenshot(page, 'after_search');

        // 5. 设置下载监听
        const downloadPromise = page.waitForEvent('download', { timeout: 10 * 60 * 1000 });

        // 6. 点击"导出"按钮
        dbg('查找导出按钮...');
        const exportButton = page.locator('button.ffhJGx.btn-text');
        try {
            await exportButton.waitFor({ state: 'visible', timeout: 10000 });
        } catch (e) {
            await this.errorScreenshot(page, 'export_btn', 'exportByTag');
            throw e;
        }
        await this.debugScreenshot(page, 'before_export_click');

        await exportButton.evaluate((btn: HTMLButtonElement) => btn.click());
        dbg('已点击导出按钮');

        // 7. 等待确认弹窗并点击"确定"
        await page.waitForTimeout(1500);
        await this.debugScreenshot(page, 'dialog');

        const dialogWrapper = page.locator('.el-message-box__wrapper[role="dialog"]');
        await dialogWrapper.waitFor({ state: 'visible', timeout: 10000 });

        const confirmButton = dialogWrapper.locator('.el-message-box__btns .el-button--primary span:has-text("确定")');
        await confirmButton.click();
        dbg('已点击确定按钮');

        // 8. 等待下载完成
        const download = await downloadPromise;
        await download.saveAs(DOWNLOAD_FILE);
        console.log(`[Exporter] 导出完成，文件: ${DOWNLOAD_FILE}`);
    }

    // 导出全部笔记
    private async exportAll(page: playwright.Page): Promise<void> {
        await page.goto('https://v.flomoapp.com/mine?source=export', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        await page.waitForLoadState('load', { timeout: 60000 });
        await page.waitForTimeout(2000);

        await this.checkPageState(page, 'exportAll');

        // 等待"导出笔记"弹窗出现
        dbg('等待导出弹窗...');
        const exportDialog = page.locator('text=导出笔记').first();
        await exportDialog.waitFor({ state: 'visible', timeout: 10000 });
        dbg('导出弹窗已显示');

        // 查找导出按钮
        let exportButton = null;

        // 方式1: 直接查找 Element UI 按钮
        try {
            exportButton = page.locator('button.el-button.el-button--text').filter({ hasText: /^[\s]*导出[\s]*$/ }).first();
            await exportButton.waitFor({ state: 'visible', timeout: 5000 });
            dbg('找到导出按钮 (Element UI 按钮)');
        } catch (e) {
            dbg('方式1失败，尝试方式2');
        }

        // 方式2: 通过"导出全部笔记"文本查找
        if (!exportButton) {
            try {
                const container = page.locator('text=导出全部笔记').locator('..');
                exportButton = container.locator('button').filter({ hasText: /^[\s]*导出[\s]*$/ }).first();
                await exportButton.waitFor({ state: 'visible', timeout: 5000 });
                dbg('找到导出按钮 (容器内按钮)');
            } catch (e) {
                dbg('方式2失败');
            }
        }

        if (!exportButton) {
            throw new Error('无法找到导出按钮');
        }

        // 设置下载监听
        const downloadPromise = page.waitForEvent('download', { timeout: 10 * 60 * 1000 });

        dbg('点击导出按钮...');
        await exportButton.click({ timeout: 5000 });

        await page.waitForTimeout(1000);

        // 等待下载
        const download = await downloadPromise;
        await download.saveAs(DOWNLOAD_FILE);
        console.log(`[Exporter] 导出完成，文件: ${DOWNLOAD_FILE}`);
    }
}
