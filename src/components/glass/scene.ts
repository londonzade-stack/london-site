/**
 * Glass home engine.
 *
 * Two layers rendered from ONE camera:
 *  - WebGL (three.js): thick, clear, beveled glass panes lit by a studio rig
 *    (edges catch crisp highlights, faces carry a soft moving reflection) over
 *    a near-black backdrop.
 *  - DOM: each pane's real HTML content, driven with the same CSS3D matrix
 *    math three's CSS3DRenderer uses — written onto the existing React nodes
 *    instead of moving them, so text stays crisp, selectable and clickable.
 *
 * World units are CSS pixels: the z=0 plane maps 1:1 onto the viewport.
 */
import * as THREE from "three";
import {
  centroid,
  desktopLayout,
  pickMode,
  pointInConvex,
  stackedLayout,
  type GlassLayout,
  type ShardId,
  type ShardLayout,
  type Vec2,
} from "./layout";

export interface GlassSceneOptions {
  root: HTMLElement;
  /** The scene creates its own <canvas> inside this element. */
  host: HTMLElement;
  view: HTMLElement;
  cam: HTMLElement;
  spacer: HTMLElement;
  /** Called if the scene dies after start (e.g. WebGL context lost). */
  onFail: (reason: string) => void;
}

export interface GlassSceneHandle {
  dispose: () => void;
}

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------

const FOV = 38;
const DEPTH = 14; // glass body thickness (px)
const BEVEL = 9; // rounded edge size (px)
const FACE_Z = DEPTH / 2 + BEVEL; // front face plane
const CORNER = 22; // corner radius (px)
/** Must match the 3D-mode `.shard` padding in globals.css. */
const BLEED_X = 10;
const BLEED_Y = 6;
/** How far (px) a pane's farthest edge may travel in depth while hovered. */
const MAX_EDGE_DEPTH = 46;
/** Cap on drawing-buffer pixels (keeps 5K/6K displays from exhausting VRAM). */
const PIXEL_BUDGET = 6e6;
const INTRO_DURATION = 1.4; // s per pane
const INTRO_STAGGER = 0.075; // s between panes

const BACKDROP = {
  clear: 0x050506,
  base: 0x060607,
  lift: [0x17181d, 0.9] as const, // soft overhead light pool
  pointer: [0x1d2638, 0.6] as const, // faint cool glow under the cursor
};

const GLASS = {
  color: 0xffffff,
  roughness: 0.1,
  thickness: 34,
  ior: 1.5,
  dispersion: 1.2,
  attenuationColor: 0x8e97a9,
  attenuationDistance: 110,
  clearcoat: 1,
  clearcoatRoughness: 0.04,
  iridescence: 0.1,
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

class Spring {
  x = 0;
  v = 0;
  target = 0;
  constructor(
    public k = 0.085,
    public damping = 0.8,
  ) {}
  step(f: number) {
    if (!Number.isFinite(this.target)) this.target = 0;
    if (!Number.isFinite(this.x) || !Number.isFinite(this.v)) {
      this.x = this.target;
      this.v = 0;
    }
    this.v += (this.target - this.x) * this.k * f;
    this.v *= Math.pow(this.damping, f);
    this.x += this.v * f;
    // Snap when settled so transforms stop changing — the browser then
    // re-rasterizes the DOM text at full device resolution.
    if (Math.abs(this.v) < 2e-5 && Math.abs(this.target - this.x) < 2e-5) {
      this.x = this.target;
      this.v = 0;
    }
  }
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/** Deterministic per-pane pseudo-random in [-1, 1]. */
function rand(seed: string, salt: number) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  return ((h >>> 0) / 4294967295) * 2 - 1;
}

const eps = (v: number) => (Math.abs(v) < 1e-10 ? 0 : v);

// Same conventions as three/examples CSS3DRenderer (r186).
function cameraCSSMatrix(m: THREE.Matrix4) {
  const e = m.elements;
  return `matrix3d(${eps(e[0])},${eps(-e[1])},${eps(e[2])},${eps(e[3])},${eps(e[4])},${eps(-e[5])},${eps(e[6])},${eps(e[7])},${eps(e[8])},${eps(-e[9])},${eps(e[10])},${eps(e[11])},${eps(e[12])},${eps(-e[13])},${eps(e[14])},${eps(e[15])})`;
}

function objectCSSMatrix(m: THREE.Matrix4) {
  const e = m.elements;
  return `translate(-50%,-50%) matrix3d(${eps(e[0])},${eps(e[1])},${eps(e[2])},${eps(e[3])},${eps(-e[4])},${eps(-e[5])},${eps(-e[6])},${eps(-e[7])},${eps(e[8])},${eps(e[9])},${eps(e[10])},${eps(e[11])},${eps(e[12])},${eps(e[13])},${eps(e[14])},${eps(e[15])})`;
}

function shardGeometry(poly: Vec2[], c: Vec2, segments: number) {
  const pts = poly.map(([x, y]) => new THREE.Vector2(x - c[0], -(y - c[1])));
  const shape = new THREE.Shape();
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const prev = pts[(i - 1 + n) % n];
    const next = pts[(i + 1) % n];
    const r = Math.min(CORNER, p.distanceTo(prev) * 0.42, p.distanceTo(next) * 0.42);
    const a = p.clone().add(prev.clone().sub(p).normalize().multiplyScalar(r));
    const b = p.clone().add(next.clone().sub(p).normalize().multiplyScalar(r));
    if (i === 0) shape.moveTo(a.x, a.y);
    else shape.lineTo(a.x, a.y);
    shape.quadraticCurveTo(p.x, p.y, b.x, b.y);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: DEPTH,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelOffset: -BEVEL, // keep the outer silhouette exactly on the outline
    bevelSegments: segments,
    curveSegments: 10,
  });
  geo.translate(0, 0, -DEPTH / 2);
  return geo;
}

/**
 * Studio lighting for reflections — this is what makes it read as glass.
 * Long strip lights wrap the panes so every beveled edge catches a crisp
 * highlight; a big dim gradient softbox in front gives the faces a soft
 * reflection that slides as they tilt; narrow off-axis bars flash across a
 * pane only while it leans. Everything else is black, so faces stay dark.
 */
function buildEnvironment(renderer: THREE.WebGLRenderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x000000);
  const disposables: { dispose: () => void }[] = [];

  const panel = (
    w: number,
    h: number,
    hex: number,
    intensity: number,
    dir: [number, number, number],
    map?: THREE.Texture,
  ) => {
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(hex).multiplyScalar(intensity),
      side: THREE.DoubleSide,
      map: map ?? null,
    });
    disposables.push(geo, mat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(new THREE.Vector3(...dir).normalize().multiplyScalar(6));
    mesh.lookAt(0, 0, 0);
    env.add(mesh);
  };

  // Front softbox: bright top-left falling to dark — the faces' soft sheen.
  const grad = document.createElement("canvas");
  grad.width = 256;
  grad.height = 256;
  const g = grad.getContext("2d")!;
  const lg = g.createLinearGradient(0, 0, 256, 256);
  lg.addColorStop(0, "#ffffff");
  lg.addColorStop(0.45, "#3a3a3a");
  lg.addColorStop(1, "#000000");
  g.fillStyle = lg;
  g.fillRect(0, 0, 256, 256);
  const gradTex = new THREE.CanvasTexture(grad);
  gradTex.colorSpace = THREE.SRGBColorSpace;
  disposables.push(gradTex);
  panel(16, 11, 0xffffff, 2.4, [0, 0, 1], gradTex);

  // Rim strips around the panes → bright beveled edges.
  panel(14, 1.3, 0xffffff, 5.5, [0, 1, 0.32]); // top
  panel(1.2, 14, 0xe9f1ff, 4.2, [-1, 0.06, 0.34]); // left (slightly cool)
  panel(1.2, 14, 0xffffff, 2.4, [1, -0.06, 0.26]); // right
  panel(14, 0.9, 0xffffff, 1.6, [0, -1, 0.4]); // bottom

  // Narrow bars outside the ~27° cone the composition spans: dark at rest,
  // they sweep across a pane only while it leans.
  panel(0.45, 12, 0xffffff, 1.2, [Math.sin(0.66), 0.04, Math.cos(0.66)]);
  panel(0.35, 12, 0xdce8ff, 0.9, [-Math.sin(0.7), -0.04, Math.cos(0.7)]);
  panel(12, 0.4, 0xffffff, 0.9, [-0.04, Math.sin(0.6), Math.cos(0.6)]);

  const rt = pmrem.fromScene(env, 0.025);
  disposables.forEach((d) => d.dispose());
  pmrem.dispose();
  return rt;
}

const backdropVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const backdropFragment = /* glsl */ `
uniform vec3 uBase;
uniform vec3 uLift;
uniform vec3 uPointerColor;
uniform vec2 uSize;
uniform vec2 uPointer;
uniform float uTime;
varying vec2 vUv;

float blob(vec2 p, vec2 c, float r) {
  vec2 d = (p - c) / r;
  return exp(-dot(d, d));
}

void main() {
  vec2 p = (vUv - 0.5) * uSize;
  vec3 col = uBase;
  col += uLift * blob(p, vec2(0.0, 0.40 * uSize.y), 0.55 * uSize.y);
  col += uLift * 0.45 * blob(p, vec2(-0.34 * uSize.x + 40.0 * sin(uTime * 0.07), -0.30 * uSize.y), 0.34 * uSize.y);
  col += uPointerColor * blob(p, uPointer, 0.22 * uSize.y);
  float vig = smoothstep(0.95, 0.22, length((vUv - 0.5) * vec2(1.0, 1.2)));
  col *= mix(0.55, 1.0, vig);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  // Dither: dark gradients band badly in 8-bit.
  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  gl_FragColor.rgb += (n - 0.5) / 255.0;
}
`;

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

interface ShardRuntime {
  id: ShardId;
  el: HTMLElement;
  layout: ShardLayout;
  pivot: THREE.Group;
  mesh: THREE.Mesh;
  material: THREE.MeshPhysicalMaterial;
  anchor: THREE.Object3D;
  c: Vec2;
  half: Vec2;
  maxTiltX: number;
  maxTiltY: number;
  rx: Spring;
  ry: Spring;
  lift: Spring;
  /** Local point the hover tilt pivots around (follows the cursor). */
  pin: THREE.Vector3;
  introDir: THREE.Vector3;
  introRot: THREE.Euler;
  lastTransform: string;
  lastOpacity: string;
}

export async function createGlassScene(
  opts: GlassSceneOptions,
): Promise<GlassSceneHandle> {
  const { root, host, view, cam, spacer, onFail } = opts;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const dpr0 = window.devicePixelRatio || 1;

  const elements = new Map<ShardId, HTMLElement>();
  cam.querySelectorAll<HTMLElement>("[data-shard]").forEach((el) => {
    elements.set(el.dataset.shard as ShardId, el);
  });
  if (elements.size < 7) throw new Error("glass: shard elements missing");

  // --- renderer --------------------------------------------------------------
  // A fresh canvas per instance: no context sharing across remounts.
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: dpr0 < 2, // MSAA is wasted at 2x+
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch (err) {
    canvas.remove();
    throw err;
  }
  let maxPixelRatio = 2;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.transmissionResolutionScale = dpr0 >= 2 || coarse ? 0.5 : 1;
  renderer.setClearColor(BACKDROP.clear, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 10, 8000);
  scene.add(camera);

  const envRT = buildEnvironment(renderer);
  scene.environment = envRT.texture;

  // Backdrop rides with the camera so it always fills the view.
  const backdropUniforms = {
    uBase: { value: new THREE.Color(BACKDROP.base) },
    uLift: { value: new THREE.Color(BACKDROP.lift[0]).multiplyScalar(BACKDROP.lift[1]) },
    uPointerColor: {
      value: new THREE.Color(BACKDROP.pointer[0]).multiplyScalar(BACKDROP.pointer[1]),
    },
    uSize: { value: new THREE.Vector2(1, 1) },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uTime: { value: 0 },
  };
  const backdropMaterial = new THREE.ShaderMaterial({
    uniforms: backdropUniforms,
    vertexShader: backdropVertex,
    fragmentShader: backdropFragment,
    depthWrite: false,
  });
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), backdropMaterial);
  backdrop.renderOrder = -1;
  camera.add(backdrop);

  const rootGroup = new THREE.Group();
  const inner = new THREE.Group();
  rootGroup.add(inner);
  scene.add(rootGroup);
  // The nav bar is the most-clicked thing on the page: it doesn't take part in
  // the whole-composition tilt, so its links never drift while you aim.
  const fixedGroup = new THREE.Group();
  scene.add(fixedGroup);

  const baseMaterial = new THREE.MeshPhysicalMaterial({
    color: GLASS.color,
    metalness: 0,
    roughness: GLASS.roughness,
    transmission: 1,
    thickness: GLASS.thickness,
    ior: GLASS.ior,
    dispersion: GLASS.dispersion,
    attenuationColor: GLASS.attenuationColor,
    attenuationDistance: GLASS.attenuationDistance,
    clearcoat: GLASS.clearcoat,
    clearcoatRoughness: GLASS.clearcoatRoughness,
    iridescence: GLASS.iridescence,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [280, 400],
    specularIntensity: 1,
  });

  // --- layout -----------------------------------------------------------------
  const shards: ShardRuntime[] = [];
  let layout: GlassLayout | null = null;
  let W = 0;
  let H = 0;
  let pixelRatio = 0;
  let needsResize = true;

  /** Size canvas/camera to the view. Cheap when nothing changed. */
  function sizeView() {
    const w = view.clientWidth;
    const h = view.clientHeight;
    if (!w || !h) return false;
    const pr = Math.min(
      window.devicePixelRatio || 1,
      maxPixelRatio,
      Math.sqrt(PIXEL_BUDGET / (w * h)),
    );
    if (w === W && h === H && pr === pixelRatio) return true;
    W = w;
    H = h;
    pixelRatio = pr;
    renderer.setPixelRatio(pr);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    const dist = H / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    camera.userData.dist = dist;
    cam.style.width = `${W}px`;
    cam.style.height = `${H}px`;
    const backDist = dist + 160;
    const bh = 2 * backDist * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * 1.3;
    const bw = bh * camera.aspect;
    backdrop.position.set(0, 0, -backDist);
    backdrop.scale.set(bw, bh, 1);
    backdropUniforms.uSize.value.set(bw, bh);
    return true;
  }

  function measureOverflow(el: HTMLElement) {
    delete el.dataset.overflow;
    if (el.scrollHeight > el.clientHeight + 1) el.dataset.overflow = "1";
  }

  function buildShards(next: GlassLayout) {
    const previous = new Map(shards.map((s) => [s.id, s]));
    shards.forEach((s) => {
      s.pivot.removeFromParent();
      s.mesh.geometry.dispose();
    });
    shards.length = 0;

    const center = next.center;
    for (const sl of next.shards) {
      const el = elements.get(sl.id)!;
      const old = previous.get(sl.id);
      const c = centroid(sl.poly);
      const xs = sl.poly.map((p) => p[0]);
      const ys = sl.poly.map((p) => p[1]);
      const half: Vec2 = [
        (Math.max(...xs) - Math.min(...xs)) / 2,
        (Math.max(...ys) - Math.min(...ys)) / 2,
      ];

      const material = old?.material ?? baseMaterial.clone();
      const mesh = new THREE.Mesh(shardGeometry(sl.poly, c, coarse ? 5 : 9), material);
      const pivot = new THREE.Group();
      pivot.position.set(c[0], -c[1], 0);
      pivot.add(mesh);

      const anchor = new THREE.Object3D();
      const r = sl.content;
      anchor.position.set(r.x + r.w / 2 - c[0], -(r.y + r.h / 2 - c[1]), FACE_Z + 0.5);
      pivot.add(anchor);
      (sl.id === "nav" ? fixedGroup : inner).add(pivot);

      el.style.width = `${r.w + BLEED_X * 2}px`;
      el.style.height = `${r.h + BLEED_Y * 2}px`;
      measureOverflow(el);

      // Limit tilt so the far edge moves at most MAX_EDGE_DEPTH in depth.
      const isNav = sl.id === "nav";
      const maxTiltY = isNav ? 0.012 : Math.min(0.15, Math.atan(MAX_EDGE_DEPTH / (half[0] * 2)));
      const maxTiltX = isNav ? 0.12 : Math.min(0.13, Math.atan(MAX_EDGE_DEPTH / (half[1] * 2)));

      const dir = new THREE.Vector3(c[0] - center[0], -(c[1] - center[1]), 0);
      if (dir.lengthSq() < 1) dir.set(0, 1, 0);
      dir.normalize();

      shards.push({
        id: sl.id,
        el,
        layout: sl,
        pivot,
        mesh,
        material,
        anchor,
        c,
        half,
        maxTiltX,
        maxTiltY,
        rx: old?.rx ?? new Spring(),
        ry: old?.ry ?? new Spring(),
        lift: old?.lift ?? new Spring(0.07, 0.78),
        pin: new THREE.Vector3(),
        introDir: dir,
        introRot: new THREE.Euler(rand(sl.id, 1) * 0.5, rand(sl.id, 2) * 0.6, rand(sl.id, 3) * 0.28),
        lastTransform: "",
        lastOpacity: "",
      });
    }
  }

  function relayout(force = false) {
    if (!sizeView()) return;
    const mode = pickMode(W, H);
    if (!force && layout && mode === layout.mode) {
      // Stacked panes depend only on width (mobile toolbars change height
      // constantly); the one-screen desktop layout depends on both.
      const same = mode === "stacked" ? layout.width === W : layout.width === W && layout.height === H;
      if (same) return;
    }
    root.dataset.layout = mode;
    const next =
      mode === "desktop"
        ? desktopLayout(W, H)
        : stackedLayout(W, H, (id, width) => {
            const el = elements.get(id)!;
            el.style.width = `${width + BLEED_X * 2}px`;
            el.style.height = "auto";
            delete el.dataset.overflow;
            return el.offsetHeight - BLEED_Y * 2;
          });
    layout = next;
    spacer.style.height = `${next.docHeight}px`;
    rootGroup.position.set(next.center[0], -next.center[1], 0);
    inner.position.set(-next.center[0], next.center[1], 0);
    buildShards(next);
  }

  // --- input ------------------------------------------------------------------
  const ndc = new THREE.Vector2(0, 0);
  const rawPointer = { x: 0, y: 0 };
  let pointerActive = false;
  let touchUntil = 0;
  let touchStart: { x: number; y: number; t: number } | null = null;
  let focusedId: ShardId | null = null;

  const toNdc = (x: number, y: number) => {
    rawPointer.x = x;
    rawPointer.y = y;
  };

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    toNdc(e.clientX, e.clientY);
    pointerActive = true;
  };
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "touch") touchStart = { x: e.clientX, y: e.clientY, t: performance.now() };
  };
  const onPointerUp = (e: PointerEvent) => {
    if (e.pointerType !== "touch" || !touchStart) return;
    const moved = Math.hypot(e.clientX - touchStart.x, e.clientY - touchStart.y);
    // Only a tap presses the glass — flicks and scrolls don't.
    if (moved < 10 && performance.now() - touchStart.t < 350) {
      toNdc(e.clientX, e.clientY);
      touchUntil = performance.now() + 550;
    }
    touchStart = null;
  };
  const onPointerCancel = () => {
    touchStart = null;
    touchUntil = 0;
  };
  const onPointerOut = (e: PointerEvent) => {
    if (!e.relatedTarget) pointerActive = false;
  };
  const onFocusIn = (e: FocusEvent) => {
    const target = e.target as HTMLElement | null;
    const el = target?.closest<HTMLElement>("[data-shard]");
    focusedId = (el?.dataset.shard as ShardId) ?? null;
    // Focus moving down scrolls .glass-view (handed to the window below), but
    // focus moving up can't (scrollTop can't go negative) — scroll for it.
    if (target && layout?.mode === "stacked" && !view.scrollTop) {
      const r = target.getBoundingClientRect();
      if (r.top < 0 || r.bottom > H) window.scrollBy(0, r.top - H * 0.3);
    }
  };
  const onFocusOut = (e: FocusEvent) => {
    const next = e.relatedTarget as HTMLElement | null;
    if (!next || !root.contains(next)) focusedId = null;
  };
  // Focus, find-in-page and assistive tech can scroll the fixed .glass-view
  // (overflow:hidden is still script-scrollable). The camera follows
  // window.scrollY, so hand that offset to the window instead.
  const onViewScroll = () => {
    const dy = view.scrollTop;
    if (!dy && !view.scrollLeft) return;
    view.scrollTop = 0;
    view.scrollLeft = 0;
    if (layout?.mode === "stacked") window.scrollBy(0, dy);
  };

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerdown", onPointerDown, { passive: true });
  window.addEventListener("pointerup", onPointerUp, { passive: true });
  window.addEventListener("pointercancel", onPointerCancel, { passive: true });
  document.addEventListener("pointerout", onPointerOut);
  root.addEventListener("focusin", onFocusIn);
  root.addEventListener("focusout", onFocusOut);
  view.addEventListener("scroll", onViewScroll, { passive: true });

  let resizeTimer = 0;
  const resizeObserver = new ResizeObserver(() => {
    needsResize = true; // applied at the top of the next frame — no blank frame
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => relayout(), 140);
  });
  resizeObserver.observe(view);

  // Moving between 1x and 2x displays (or zooming) changes DPR without a resize.
  let dprQuery: MediaQueryList | null = null;
  const onDprChange = () => {
    armDprQuery();
    needsResize = true;
  };
  function armDprQuery() {
    dprQuery?.removeEventListener("change", onDprChange);
    dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    dprQuery.addEventListener("change", onDprChange);
  }
  armDprQuery();

  // --- frame loop ---------------------------------------------------------------
  const raycaster = new THREE.Raycaster();
  const localRay = new THREE.Ray();
  const invInner = new THREE.Matrix4();
  const planeZ0 = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();
  const pointerLayout = new THREE.Vector2(0, 0);
  const rootRx = new Spring(0.05, 0.86);
  const rootRy = new Spring(0.05, 0.86);
  const smoothPointer = new THREE.Vector2(0, 0);
  const pointerTarget = new THREE.Vector2(0, 0);
  const pinTarget = new THREE.Vector3();
  const ZERO = new THREE.Vector3();
  const rotated = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();

  let raf = 0;
  let started = false;
  let last = performance.now();
  let introStart = -1;
  let elapsed = 0;
  let lastScrollY = window.scrollY;
  let scrollVel = 0;
  let lastCamStyle = "";
  let quality = 0;
  let perfFrames = 0;
  let perfTime = 0;
  let badWindows = 0;
  let slowFrame = 1 / 42;
  let disposed = false;

  function degrade() {
    quality++;
    if (quality === 1) {
      maxPixelRatio = 1.25;
      renderer.transmissionResolutionScale = 0.35;
      needsResize = true;
    } else if (quality === 2) {
      // Last resort: dark reflective glass without the refraction pass.
      for (const m of [baseMaterial, ...shards.map((s) => s.material)]) {
        m.transmission = 0;
        m.color.set(0x0d0e11);
        m.needsUpdate = true;
      }
    }
  }

  function syncDom() {
    const halfW = W / 2;
    const halfH = H / 2;
    const fov = camera.projectionMatrix.elements[5] * halfH;
    const camStyle =
      `perspective(${fov}px) translateZ(${fov}px)` +
      cameraCSSMatrix(camera.matrixWorldInverse) +
      `translate(${halfW}px,${halfH}px)`;
    if (camStyle !== lastCamStyle) {
      cam.style.transform = camStyle;
      lastCamStyle = camStyle;
    }
    for (const s of shards) {
      const t = objectCSSMatrix(s.anchor.matrixWorld);
      if (t !== s.lastTransform) {
        s.el.style.transform = t;
        s.lastTransform = t;
      }
    }
  }

  function frame(now: number) {
    raf = 0;
    if (disposed || document.hidden) return;
    raf = requestAnimationFrame(frame);
    const rawDt = (now - last) / 1000;
    const dt = Math.min(rawDt, 1 / 20);
    last = now;
    const f = dt * 60;
    elapsed += dt;
    const reduce = reducedMotion.matches;
    if (needsResize) {
      needsResize = false;
      sizeView();
    }
    if (!layout) return;
    ndc.set((rawPointer.x / W) * 2 - 1, -(rawPointer.y / H) * 2 + 1);

    // Camera follows page scroll (stacked layout scrolls; desktop is one screen).
    const scrollY = layout.mode === "stacked" ? window.scrollY : 0;
    scrollVel = scrollVel * 0.85 + ((scrollY - lastScrollY) / Math.max(dt, 1e-3)) * 0.15;
    if (Math.abs(scrollVel) < 1) scrollVel = 0;
    lastScrollY = scrollY;
    const dist = camera.userData.dist as number;
    camera.position.set(W / 2, -(scrollY + H / 2), dist);
    camera.updateMatrixWorld();
    backdropUniforms.uTime.value = elapsed;

    // Light drifts slowly across the still glass (WebGL only — the DOM stays
    // put, so text stays sharp).
    if (!reduce) {
      scene.environmentRotation.set(
        Math.sin(elapsed * 0.11) * 0.05,
        Math.sin(elapsed * 0.07) * 0.09,
        0,
      );
    }

    const desktop = layout.mode === "desktop";
    const live = pointerActive && desktop && !reduce;

    // Pointer → point on the shard plane, in layout coordinates.
    const touching = now < touchUntil;
    const pointerOn = pointerActive || touching;
    let hovered: ShardRuntime | null = null;
    if (pointerOn) {
      raycaster.setFromCamera(ndc, camera);
      invInner.copy(inner.matrixWorld).invert();
      localRay.copy(raycaster.ray).applyMatrix4(invInner);
      if (localRay.intersectPlane(planeZ0, hit)) {
        pointerLayout.set(hit.x, -hit.y);
        for (const s of shards) {
          if (pointInConvex(s.layout.poly, pointerLayout.x, pointerLayout.y)) {
            hovered = s;
            break;
          }
        }
      }
    }

    // Whole-composition tilt (desktop only), pressed away from the cursor.
    // Kept small so targets barely move while you aim at them; the nav bar
    // sits outside this group and never tilts.
    rootRy.target = live ? ndc.x * 0.018 : 0;
    rootRx.target = live ? -ndc.y * 0.013 : 0;
    rootRx.step(f);
    rootRy.step(f);
    rootGroup.rotation.set(rootRx.x, rootRy.x, 0);
    rootGroup.updateMatrixWorld();

    if (introStart < 0) introStart = elapsed;
    const introT = elapsed - introStart;
    const tiltScale = reduce ? 0.3 : 1;
    const viewCenterY = scrollY + H / 2;

    for (const s of shards) {
      let tx = 0;
      let ty = 0;
      let tl = 0;
      const isHover = hovered === s;
      if (isHover) {
        const dx = clamp((pointerLayout.x - s.c[0]) / s.half[0], -1, 1);
        const dy = clamp((pointerLayout.y - s.c[1]) / s.half[1], -1, 1);
        ty = dx * s.maxTiltY * tiltScale; // side under the cursor leans away
        tx = dy * s.maxTiltX * tiltScale;
        tl = 6;
        // Pivot the tilt on the cursor so whatever is under it stays put.
        pinTarget.set(pointerLayout.x - s.c[0], -(pointerLayout.y - s.c[1]), 0);
        s.pin.lerp(pinTarget, Math.min(1, 0.3 * f));
      } else {
        // Ease the pivot back to the centre so resting motion (e.g. the stacked
        // scroll roll) doesn't swing around an old touch point.
        s.pin.lerp(ZERO, Math.min(1, 0.08 * f));
        if (focusedId === s.id) tl = 10;
      }
      if (!desktop && !reduce) {
        // Panes roll gently as they pass through the viewport, and wobble with scroll speed.
        const rel = clamp((s.c[1] - viewCenterY) / H, -1, 1);
        tx += rel * 0.08 + clamp(scrollVel * 0.00004, -0.06, 0.06);
      }
      s.rx.target = tx;
      s.ry.target = ty;
      s.lift.target = tl;
      s.rx.step(f);
      s.ry.step(f);
      s.lift.step(f);

      // Intro: panes fly in from depth and assemble.
      let p = 1;
      if (!reduce) {
        p = clamp((introT - 0.08 - s.layout.order * INTRO_STAGGER) / INTRO_DURATION, 0, 1);
      }
      const k = Math.pow(1 - p, 4);

      // Rotate about the pin: position = C + (pin - R·pin).
      euler.set(s.rx.x + s.introRot.x * k, s.ry.x + s.introRot.y * k, s.introRot.z * k);
      quat.setFromEuler(euler);
      rotated.copy(s.pin).applyQuaternion(quat);
      s.pivot.position.set(
        s.c[0] + (s.pin.x - rotated.x) + s.introDir.x * 260 * k,
        -s.c[1] + (s.pin.y - rotated.y) + s.introDir.y * 260 * k,
        s.lift.x + (s.pin.z - rotated.z) - 900 * k,
      );
      s.pivot.quaternion.copy(quat);

      const opacity = String(Math.round(clamp((p - 0.55) / 0.4, 0, 1) * 1000) / 1000);
      if (opacity !== s.lastOpacity) {
        s.el.style.opacity = opacity;
        s.lastOpacity = opacity;
      }
    }

    // Faint glow follows the pointer on the backdrop.
    const bw = backdropUniforms.uSize.value.x / 1.3;
    const bh = backdropUniforms.uSize.value.y / 1.3;
    pointerTarget.set(
      pointerOn ? ndc.x * 0.5 * bw : 0,
      pointerOn ? ndc.y * 0.5 * bh : -bh * 0.1,
    );
    smoothPointer.lerp(pointerTarget, Math.min(1, 0.06 * f));
    backdropUniforms.uPointer.value.copy(smoothPointer);

    scene.updateMatrixWorld();
    renderer.render(scene, camera);
    syncDom();

    // Adaptive quality: compare against the display's real cadence (30 Hz
    // power-saving caps aren't "slow"), and require two bad windows in a row.
    if (introT > 2.4 && quality < 2) {
      perfFrames++;
      perfTime += rawDt;
      if (perfTime >= 1.5) {
        badWindows = perfTime / perfFrames > slowFrame ? badWindows + 1 : 0;
        if (badWindows >= 2) {
          degrade();
          badWindows = 0;
        }
        perfFrames = 0;
        perfTime = 0;
      }
    }
  }

  function start() {
    if (raf || disposed || !started || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  const onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else {
      start();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  const onContextLost = (e: Event) => {
    e.preventDefault();
    onFail("webgl context lost");
  };
  canvas.addEventListener("webglcontextlost", onContextLost);

  // --- boot -------------------------------------------------------------------
  try {
    await Promise.race([
      document.fonts?.ready ?? Promise.resolve(),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
    relayout(true);
    if (!layout) throw new Error("glass: zero-size view");
    elements.forEach((el) => (el.style.opacity = "0"));
    // Compile shaders up front so the intro doesn't hitch.
    camera.position.set(W / 2, -H / 2, camera.userData.dist as number);
    camera.updateMatrixWorld();
    await renderer.compileAsync(scene, camera);
    // Measure the display's frame cadence before the heavy work starts.
    const cadence = await new Promise<number>((resolve) => {
      const ts: number[] = [];
      const tick = (t: number) => {
        ts.push(t);
        if (ts.length < 10) requestAnimationFrame(tick);
        else {
          const iv = ts.slice(1).map((t, i) => t - ts[i]).sort((a, b) => a - b);
          resolve(Math.max(1 / 60, iv[Math.floor(iv.length / 2)] / 1000));
        }
      };
      requestAnimationFrame(tick);
      setTimeout(() => resolve(1 / 60), 600); // hidden tab: rAF paused
    });
    slowFrame = Math.min(Math.max(1 / 42, cadence * 1.35), 0.045);
  } catch (err) {
    dispose();
    throw err;
  }

  started = true;
  start();

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    raf = 0;
    window.clearTimeout(resizeTimer);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerCancel);
    document.removeEventListener("pointerout", onPointerOut);
    document.removeEventListener("visibilitychange", onVisibility);
    root.removeEventListener("focusin", onFocusIn);
    root.removeEventListener("focusout", onFocusOut);
    view.removeEventListener("scroll", onViewScroll);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    dprQuery?.removeEventListener("change", onDprChange);
    resizeObserver.disconnect();
    shards.forEach((s) => {
      s.mesh.geometry.dispose();
      s.material.dispose();
    });
    baseMaterial.dispose();
    backdrop.geometry.dispose();
    backdropMaterial.dispose();
    envRT.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    elements.forEach((el) => {
      el.style.removeProperty("width");
      el.style.removeProperty("height");
      el.style.removeProperty("transform");
      el.style.removeProperty("opacity");
      delete el.dataset.overflow;
    });
    cam.style.removeProperty("transform");
    cam.style.removeProperty("width");
    cam.style.removeProperty("height");
    spacer.style.removeProperty("height");
    delete root.dataset.layout;
  }

  return { dispose };
}
