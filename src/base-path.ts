/**
 * GitHub Pages 會把網站放在 /zombie-survivors/ 子路徑。
 * BabylonJS 模型清單原本使用 /models/...，因此在送出請求前補上部署路徑。
 */
const baseUrl = import.meta.env.BASE_URL;

function resolveModelUrl(url: string): string {
  if (baseUrl === '/' || !url.startsWith('/models/')) return url;
  return `${baseUrl.replace(/\/$/, '')}${url}`;
}

if (typeof window !== 'undefined' && baseUrl !== '/') {
  const originalOpen = XMLHttpRequest.prototype.open;

  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async = true,
    username?: string | null,
    password?: string | null,
  ): void {
    const resolvedUrl = typeof url === 'string' ? resolveModelUrl(url) : url;
    (originalOpen as any).call(this, method, resolvedUrl, async, username, password);
  } as typeof XMLHttpRequest.prototype.open;
}
