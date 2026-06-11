import { CONFIG } from './config';

/** 一輪遊戲的可變數值（會被升級修改） */
export interface RunState {
  // 玩家
  moveSpeed: number;
  maxHp: number;
  /** 經驗吸取範圍 */
  pickupRadius: number;
  xpMultiplier: number;
  // 武器
  damage: number;
  fireInterval: number;
  projectileCount: number;
  range: number;
  projectileSpeed: number;
}

export function createRunState(): RunState {
  return {
    moveSpeed: CONFIG.player.speed,
    maxHp: CONFIG.player.maxHp,
    pickupRadius: 5,
    xpMultiplier: 1,
    damage: CONFIG.weapon.damage,
    fireInterval: CONFIG.weapon.fireInterval,
    projectileCount: 1,
    range: CONFIG.weapon.range,
    projectileSpeed: CONFIG.weapon.projectileSpeed,
  };
}

export interface Upgrade {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  maxLevel: number;
  apply: (s: RunState) => void;
}

export const UPGRADES: Upgrade[] = [
  { id: 'damage', name: '攻擊力', desc: '武器傷害 +1', emoji: '⚔️', maxLevel: 8, apply: (s) => (s.damage += 1) },
  { id: 'firerate', name: '攻速', desc: '發射間隔 −12%', emoji: '⚡', maxLevel: 8, apply: (s) => (s.fireInterval *= 0.88) },
  { id: 'multishot', name: '多重彈', desc: '投射物 +1', emoji: '🎯', maxLevel: 4, apply: (s) => (s.projectileCount += 1) },
  { id: 'range', name: '射程', desc: '鎖定範圍 +20%', emoji: '🔭', maxLevel: 5, apply: (s) => (s.range *= 1.2) },
  { id: 'projspeed', name: '彈速', desc: '投射物速度 +20%', emoji: '💨', maxLevel: 5, apply: (s) => (s.projectileSpeed *= 1.2) },
  { id: 'movespeed', name: '移動速度', desc: '移速 +10%', emoji: '👟', maxLevel: 5, apply: (s) => (s.moveSpeed *= 1.1) },
  { id: 'maxhp', name: '最大生命', desc: '生命上限 +20 並補滿', emoji: '❤️', maxLevel: 5, apply: (s) => (s.maxHp += 20) },
  { id: 'magnet', name: '拾取範圍', desc: '經驗吸取範圍 +30%', emoji: '🧲', maxLevel: 5, apply: (s) => (s.pickupRadius *= 1.3) },
  { id: 'xpgain', name: '經驗加成', desc: '經驗獲得 +15%', emoji: '⭐', maxLevel: 5, apply: (s) => (s.xpMultiplier *= 1.15) },
];

/** 從尚未滿級的升級中隨機抽 n 個 */
export function rollChoices(levels: Record<string, number>, n = 3): Upgrade[] {
  const pool = UPGRADES.filter((u) => (levels[u.id] ?? 0) < u.maxLevel);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

/** 升到指定等級所需經驗 */
export function xpForLevel(level: number): number {
  return 5 + level * 4;
}
