const path = (window as any).require ? (window as any).require('path') : null;
const os = (window as any).require ? (window as any).require('os') : null;

const homeDir = os ? os.homedir() : '';
export const FLOMO_CACHE_LOC = path ? path.join(homeDir, "/.flomo/cache/") : "/.flomo/cache/";
export const FLOMO_PLAYWRIGHT_CACHE_LOC = path ? path.join(homeDir, "/.flomo/cache/playwright/") : "/.flomo/cache/playwright/";
export const AUTH_FILE = FLOMO_PLAYWRIGHT_CACHE_LOC + 'flomo_auth.json';
export const DOWNLOAD_FILE = FLOMO_PLAYWRIGHT_CACHE_LOC + 'flomo_export.zip';