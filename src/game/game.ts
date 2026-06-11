import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Color4,
  Vector3,
} from '@babylonjs/core';
import { CONFIG } from './config';
import { Input } from './input';
import { SpatialGrid } from './spatial-grid';
import { EnemySystem } from './enemy-system';
import { WeaponSystem } from './weapon-system';
import { GemSystem } from './gem-system';
import { createRunState, rollChoices, xpForLevel, type RunState, type Upgrade } from './upgrades';

export type GameState = 'running' | 'levelup' | 'dead';

export interface ChoiceView {
  id: string;
  name: string;
  desc: string;
  emoji: string;
}

export interface GameStats {
  fps: number;
  enemies: number;
  kills: number;
  time: number;
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpToNext: number;
  state: GameState;
  choices: ChoiceView[];
}

export interface GameOptions {
  onStats?: (stats: GameStats) => void;
}

export interface GameHandle {
  dispose: () => void;
  setJoystick: (x: number, z: number) => void;
  setEnemyCount: (n: number) => void;
  chooseUpgrade: (index: number) => void;
  restart: () => void;
}

export function createGame(canvas: HTMLCanvasElement, options: GameOptions = {}): GameHandle {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false });

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.05, 0.07, 0.13, 1);

  const camera = new ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 3.2, 50, Vector3.Zero(), scene);
  const light = new HemisphericLight('light', new Vector3(0.4, 1, 0.3), scene);
  light.intensity = 0.95;

  createGround(scene);
  scatterProps(scene);

  const player = MeshBuilder.CreateCapsule(
    'player',
    { radius: CONFIG.player.radius, height: CONFIG.player.radius * 2.4 },
    scene,
  );
  player.position.set(0, 1, 0);
  const playerMaterial = new StandardMaterial('player-material', scene);
  playerMaterial.diffuseColor = new Color3(1, 0.95, 0.4);
  playerMaterial.emissiveColor = new Color3(0.4, 0.35, 0.05);
  playerMaterial.specularColor = Color3.Black();
  player.material = playerMaterial;

  const input = new Input();
  input.attach();

  const grid = new SpatialGrid(CONFIG.gridCellSize);
  const enemies = new EnemySystem(scene);
  const weapon = new WeaponSystem(scene);
  const gems = new GemSystem(scene);

  /** 一輪狀態 */
  let run: RunState = createRunState();
  let levels: Record<string, number> = {};
  let level = 1;
  let xp = 0;
  let xpToNext = xpForLevel(level);
  let hp = run.maxHp;
  let kills = 0;
  let time = 0;
  let state: GameState = 'running';
  let choices: Upgrade[] = [];

  const contactRange = CONFIG.player.radius + CONFIG.enemy.radius + 0.2;
  const contactRange2 = contactRange * contactRange;

  const stats: GameStats = {
    fps: 0,
    enemies: enemies.count,
    kills: 0,
    time: 0,
    hp,
    maxHp: run.maxHp,
    level,
    xp: 0,
    xpToNext,
    state,
    choices: [],
  };

  function pushStats() {
    stats.fps = Math.round(engine.getFps());
    stats.enemies = enemies.count;
    stats.kills = kills;
    stats.time = time;
    stats.hp = Math.max(0, Math.ceil(hp));
    stats.maxHp = run.maxHp;
    stats.level = level;
    stats.xp = Math.floor(xp);
    stats.xpToNext = xpToNext;
    stats.state = state;
    stats.choices = choices.map((c) => ({ id: c.id, name: c.name, desc: c.desc, emoji: c.emoji }));
    options.onStats?.(stats);
  }

  const clampArena = (v: number) => Math.max(-CONFIG.arenaHalf, Math.min(CONFIG.arenaHalf, v));

  function enterLevelUp() {
    const rolled = rollChoices(levels);
    if (rolled.length === 0) return; // 全滿級，略過暫停
    choices = rolled;
    state = 'levelup';
    pushStats();
  }

  function gameplay(dt: number) {
    const dir = input.getDirection();
    player.position.x = clampArena(player.position.x + dir.x * run.moveSpeed * dt);
    player.position.z = clampArena(player.position.z + dir.z * run.moveSpeed * dt);
    camera.target.copyFrom(player.position);

    const px = player.position.x;
    const pz = player.position.z;

    grid.clear();
    enemies.insertAll(grid);
    enemies.update(dt, px, pz, grid);

    kills += weapon.update(dt, px, pz, enemies, grid, run, (x, z) => gems.spawn(x, z));

    const collected = gems.update(dt, px, pz, run.pickupRadius);
    if (collected > 0) {
      xp += collected * run.xpMultiplier;
      if (xp >= xpToNext) {
        xp -= xpToNext;
        level += 1;
        xpToNext = xpForLevel(level);
        enterLevelUp();
      }
    }

    /** 接觸傷害 */
    let touching = false;
    grid.query(px, pz, (j) => {
      if (touching || !enemies.isAlive(j)) return;
      const dx = enemies.getX(j) - px;
      const dz = enemies.getZ(j) - pz;
      if (dx * dx + dz * dz <= contactRange2) touching = true;
    });
    if (touching) hp -= CONFIG.player.contactDps * dt;
    if (hp <= 0) {
      hp = 0;
      state = 'dead';
      pushStats();
    }

    time += dt;
  }

  let throttle = 0;
  engine.runRenderLoop(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    if (state === 'running') gameplay(dt);
    scene.render();

    throttle += dt;
    if (throttle >= 0.1) {
      throttle = 0;
      pushStats();
    }
  });

  const onResize = () => engine.resize();
  window.addEventListener('resize', onResize);

  pushStats();

  return {
    dispose() {
      window.removeEventListener('resize', onResize);
      input.detach();
      engine.dispose();
    },
    setJoystick(x: number, z: number) {
      input.setJoystick(x, z);
    },
    setEnemyCount(n: number) {
      enemies.setCount(n, player.position.x, player.position.z);
    },
    chooseUpgrade(index: number) {
      if (state !== 'levelup') return;
      const upgrade = choices[index];
      if (!upgrade) return;
      upgrade.apply(run);
      levels[upgrade.id] = (levels[upgrade.id] ?? 0) + 1;
      if (upgrade.id === 'maxhp') hp = run.maxHp;
      else hp = Math.min(hp, run.maxHp);
      choices = [];
      state = 'running';
      pushStats();
    },
    restart() {
      run = createRunState();
      levels = {};
      level = 1;
      xp = 0;
      xpToNext = xpForLevel(level);
      hp = run.maxHp;
      kills = 0;
      time = 0;
      choices = [];
      state = 'running';
      player.position.set(0, 1, 0);
      enemies.reset(0, 0);
      gems.reset();
      weapon.reset();
      pushStats();
    },
  };
}

function createGround(scene: Scene) {
  const size = CONFIG.arenaHalf * 2.4;
  const ground = MeshBuilder.CreateGround('ground', { width: size, height: size }, scene);
  const material = new StandardMaterial('ground-material', scene);
  material.diffuseColor = new Color3(0.16, 0.22, 0.32);
  material.specularColor = Color3.Black();
  ground.material = material;
  return ground;
}

function scatterProps(scene: Scene) {
  const material = new StandardMaterial('prop-material', scene);
  material.diffuseColor = new Color3(0.3, 0.42, 0.55);
  material.specularColor = Color3.Black();

  const half = CONFIG.arenaHalf;
  for (let i = 0; i < 60; i++) {
    const box = MeshBuilder.CreateBox(`prop-${i}`, { size: 1 + Math.random() * 2 }, scene);
    box.position.set((Math.random() * 2 - 1) * half, 0.5, (Math.random() * 2 - 1) * half);
    box.rotation.y = Math.random() * Math.PI;
    box.material = material;
    box.freezeWorldMatrix();
  }
}
