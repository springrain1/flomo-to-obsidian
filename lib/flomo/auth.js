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
exports.FlomoAuth = void 0;
const fs = __importStar(require("fs-extra"));
const playwright = __importStar(require("playwright"));
const const_1 = require("./const");
class FlomoAuth {
    constructor() {
        fs.mkdirpSync(const_1.FLOMO_PLAYWRIGHT_CACHE_LOC);
    }
    async auth(uid, passwd) {
        try {
            // Setup
            const browser = await playwright.chromium.launch();
            const context = await browser.newContext(playwright.devices['Desktop Chrome']);
            const page = await context.newPage();
            await page.goto('https://v.flomoapp.com/login');
            await page.getByPlaceholder('手机号 / 邮箱').fill(uid);
            await page.getByPlaceholder('密码').fill(passwd);
            await page.getByRole('button', { name: '登录' }).click();
            await page.waitForURL('https://v.flomoapp.com/mine');
            await page.context().storageState({ path: const_1.AUTH_FILE });
            // Teardown
            await context.close();
            await browser.close();
            return [true, ""];
        }
        catch (error) {
            console.log(error);
            return [false, error];
        }
    }
}
exports.FlomoAuth = FlomoAuth;
