import type { RunRecord, GlobalStats } from './leaderboard';

/** 後端 API（Cloudflare Pages Functions，同源 /api）。全部失敗時回傳 null，由呼叫端回退本機資料。 */
const BASE = '/api';
const DEVICE_KEY = 'animal-survivors:deviceId';

function deviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2);
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export interface RunSubmit {
  name: string;
  character: string;
  time: number;
  kills: number;
  level: number;
  gold: number;
  won: boolean;
  difficulty: string;
}

/** 送出一場結算（fire-and-forget，離線/失敗則忽略） */
export async function submitRun(run: RunSubmit): Promise<void> {
  try {
    await fetch(`${BASE}/run`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...run, deviceId: deviceId() }),
    });
  } catch {
    /* 離線忽略 */
  }
}

/** 取全球排行榜；可選難度過濾；失敗回傳 null */
export async function fetchLeaderboard(limit = 10, difficulty?: string): Promise<RunRecord[] | null> {
  try {
    const q = difficulty ? `&difficulty=${encodeURIComponent(difficulty)}` : '';
    const res = await fetch(`${BASE}/leaderboard?limit=${limit}${q}`);
    if (!res.ok) return null;
    return (await res.json()) as RunRecord[];
  } catch {
    return null;
  }
}

/** 取全球累計統計；失敗回傳 null */
export async function fetchStats(): Promise<GlobalStats | null> {
  try {
    const res = await fetch(`${BASE}/stats`);
    if (!res.ok) return null;
    return (await res.json()) as GlobalStats;
  } catch {
    return null;
  }
}
