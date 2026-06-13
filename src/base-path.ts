import { Tools } from '@babylonjs/core';

/**
 * GitHub Pages 會把網站放在 /zombie-survivors/ 子路徑。
 * 透過 BabylonJS 官方 URL 前處理鉤子修正 /models/...，
 * 避免覆寫瀏覽器 XMLHttpRequest 而造成部分瀏覽器啟動失敗。
 */
const baseUrl = import.meta.env.BASE_URL;
const originalPreprocessUrl = Tools.PreprocessUrl;

Tools.PreprocessUrl = (url: string): string => {
  let resolved = url;

  if (baseUrl !== '/' && url.startsWith('/models/')) {
    resolved = `${baseUrl.replace(/\/$/, '')}${url}`;
  }

  return originalPreprocessUrl ? originalPreprocessUrl(resolved) : resolved;
};
