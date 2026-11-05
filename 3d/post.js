// Presentation render: ambient occlusion (soft contact darkening) for stills only. Loaded on demand by venue3d.html;
// the shared Three.js bundle is untouched, so office3d.html is never affected. Addons are r187, copied to vendor/addons.
import * as T from "./vendor/three-bundle.min.js";

export async function makePost(renderer, scene, camera, w, h) {
  const [{ EffectComposer }, { RenderPass }, { GTAOPass }, { OutputPass }] = await Promise.all([
    import("./vendor/addons/postprocessing/EffectComposer.js"), import("./vendor/addons/postprocessing/RenderPass.js"),
    import("./vendor/addons/postprocessing/GTAOPass.js"), import("./vendor/addons/postprocessing/OutputPass.js")]);
  const rt = new T.WebGLRenderTarget(w, h, { type: T.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1); composer.setSize(w, h);
  composer.addPass(new RenderPass(scene, camera));
  const ao = new GTAOPass(scene, camera, w, h);
  ao.output = GTAOPass.OUTPUT.Default;
  ao.updateGtaoMaterial({ radius: 0.8, distanceExponent: 1.5, thickness: 2, scale: 1.6, samples: 16, distanceFallOff: 1, screenSpaceRadius: false });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
  ao.blendIntensity = 1;
  composer.addPass(ao);
  composer.addPass(new OutputPass());
  return { render: () => composer.render(), dispose: () => { composer.dispose(); rt.dispose(); } };
}
