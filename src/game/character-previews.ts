import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  DirectionalLight,
  Vector3,
  Color4,
  SceneLoader,
} from '@babylonjs/core';
import '@babylonjs/loaders';

export interface PreviewHandle {
  dispose: () => void;
}

/**
 * 在指定 canvas 上建立角色的即時 3D 預覽（播放 idle 動畫、緩慢旋轉）。
 * 每張卡一個輕量引擎；選單卸載時請呼叫 dispose 釋放 WebGL context。
 */
export async function setupCharacterPreview(canvas: HTMLCanvasElement, modelPath: string): Promise<PreviewHandle | null> {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false });
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.1, 0.13, 0.22, 1);
  /** 起始角度面向鏡頭（會持續旋轉） */
  const cam = new ArcRotateCamera('c', Math.PI / 2, Math.PI / 2.5, 4, new Vector3(0, 1, 0), scene);
  const hemi = new HemisphericLight('h', new Vector3(0.3, 1, 0.5), scene);
  hemi.intensity = 1.05;
  const dir = new DirectionalLight('d', new Vector3(-0.4, -1, -0.3), scene);
  dir.intensity = 0.7;

  try {
    const slash = modelPath.lastIndexOf('/');
    const res = await SceneLoader.ImportMeshAsync('', modelPath.slice(0, slash + 1), modelPath.slice(slash + 1), scene);
    const idle = res.animationGroups.find((g) => /idle/i.test(g.name)) ?? res.animationGroups[0];
    res.animationGroups.forEach((g) => g.stop());
    idle?.play(true);

    const root = res.meshes[0];
    const { min, max } = root.getHierarchyBoundingVectors();
    cam.target = new Vector3((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2);
    cam.radius = Math.max(max.x - min.x, max.y - min.y, max.z - min.z, 0.5) * 1.6;

    scene.onBeforeRenderObservable.add(() => {
      cam.alpha += (engine.getDeltaTime() / 1000) * 0.7; // 緩慢旋轉
    });
    engine.runRenderLoop(() => scene.render());
    return { dispose: () => engine.dispose() };
  } catch {
    engine.dispose();
    return null;
  }
}
