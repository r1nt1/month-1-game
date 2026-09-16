import { BoxGeometry, Color, DirectionalLight, Group, Mesh, MeshLambertMaterial, OrthographicCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { overlap, travelTime } from './rules';
import { accounts, initAccounts } from './accounts';

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = element<HTMLCanvasElement>('scene');
const panels = ['loading', 'title', 'paused', 'gameover', 'error'];
type State = 'loading' | 'title' | 'playing' | 'gameover' | 'error';
let state: State = 'loading';
let paused = false;
let fading = false;
let fadeRemaining = 0;
let score = 0;
let gameOverElapsed = 0;
const restartInputDelay = 0.5;
let renderer: WebGLRenderer;
const scene = new Scene();
scene.background = new Color('#191920');
const tower = new Group();
scene.add(tower);
const camera = new OrthographicCamera(-8, 8, 8, -8, .1, 200);
camera.position.set(12, 12, 12);
camera.lookAt(0, 0, 0);
const light = new DirectionalLight(0xffffff, 3);
light.position.set(3, 10, 6);
scene.add(light);
const geometry = new BoxGeometry(1, 1, 1);
const palette = ['#FFBF00', '#FF7F00', '#FF4040', '#D000A0', '#8A2BE2', '#4169E1', '#0000FF'].map(c => new Color(c));
const height = .65;
// 50% farther away; entrance may extend beyond phone edges.
const distance = 5.25;
const framingMagnification = 1.25;
type Block = Mesh<BoxGeometry, MeshLambertMaterial>;
let top: Block;
let moving: Block | null = null;
let axis: 'x' | 'z' = 'x';
let elapsed = 0;
let settling = 0;
const falling: { mesh: Block; velocity: number; age: number }[] = [];

function show(panel?: string) {
  accounts.setScreen(state === 'title' || state === 'gameover');
  for (const id of panels) element(id).hidden = id !== panel;
  element('overlay').classList.toggle('score-focus', panel === 'gameover');
  element('counter').hidden = state === 'loading' || state === 'error' || state === 'title';
  element('instructions').hidden = state !== 'playing' || paused || fading;
  layoutTitle();
}
// Place the menu around the base block without changing the gameplay camera.
function layoutTitle() {
  const isTitle = state === 'title';
  element('overlay').classList.toggle('title-layout', isTitle);
  if (!isTitle) return;
  const viewportHeight = window.innerHeight;
  camera.updateMatrixWorld();
  const projectedY: number[] = [];
  for (const x of [-1.5, 1.5]) for (const y of [-height / 2, height / 2]) for (const z of [-1.5, 1.5]) {
    projectedY.push(new Vector3(x, y, z).project(camera).y);
  }
  const blockTop = (1 - Math.max(...projectedY)) * viewportHeight / 2;
  const blockBottom = (1 - Math.min(...projectedY)) * viewportHeight / 2;
  const gap = viewportHeight <= 500 ? 12 : 24;
  const heading = element('title-heading');
  heading.style.top = `${blockTop - gap - heading.getBoundingClientRect().height}px`;
  element('title-actions').style.top = `${blockBottom + gap}px`;
}
function fail(message: string) {
  state = 'error';
  element('error-message').textContent = message;
  show('error');
}
function colorAt(level: number) {
  const progress = Math.min(level / 40, 1) * (palette.length - 1);
  const index = Math.min(Math.floor(progress), palette.length - 2);
  return palette[index].clone().lerp(palette[index + 1], progress - index);
}
function block(width: number, depth: number, x: number, y: number, z: number, color: Color): Block {
  const mesh = new Mesh(geometry, new MeshLambertMaterial({ color, flatShading: true }));
  mesh.scale.set(width, height, depth);
  mesh.position.set(x, y, z);
  tower.add(mesh);
  return mesh;
}
function remove(mesh: Block) { tower.remove(mesh); mesh.material.dispose(); }
function resetTower() {
  for (const child of [...tower.children]) remove(child as Block);
  falling.length = 0;
  moving = null;
  score = 0;
  settling = 0;
  tower.position.set(0, 0, 0);
  top = block(3, 3, 0, 0, 0, colorAt(0));
  element('score').textContent = '0';
}
function spawn() {
  axis = score % 2 === 0 ? 'x' : 'z';
  moving = block(top.scale.x, top.scale.z, top.position.x, top.position.y + height, top.position.z, colorAt(score + 1));
  moving.position[axis] -= distance;
  elapsed = 0;
}
function begin() {
  accounts.startRun();
  resetTower();
  paused = false;
  fading = false;
  element('title').classList.remove('fading');
  state = 'playing';
  spawn();
  show();
}
function pause() {
  if (state === 'playing') { paused = true; show('paused'); }
}
function resume() { paused = false; show(); }
function lose() {
  if (moving) { falling.push({ mesh: moving, velocity: 0, age: 0 }); moving = null; }
  state = 'gameover';
  gameOverElapsed = 0;
  element('final-score').textContent = String(score);
  show('gameover');
  void accounts.finishRun(score);
}
function place() {
  if (!moving) return;
  const placed = moving;
  const size = placed.scale[axis];
  const result = overlap(placed.position[axis], top.position[axis], size);
  if (result.size <= 0) { lose(); return; }
  const excess = size - result.size;
  if (excess > 0) {
    const direction = Math.sign(placed.position[axis] - top.position[axis]);
    const piece = block(placed.scale.x, placed.scale.z, placed.position.x, placed.position.y, placed.position.z, placed.material.color);
    piece.scale[axis] = excess;
    piece.position[axis] = result.center + direction * (result.size + excess) / 2;
    falling.push({ mesh: piece, velocity: 0, age: 0 });
  }
  placed.scale[axis] = result.size;
  placed.position[axis] = result.center;
  top = placed;
  moving = null;
  score += 1;
  element('score').textContent = String(score);
  // Recenter the world, leaving the isometric camera fixed.
  tower.position.set(-top.position.x, -top.position.y, -top.position.z);
  settling = .35;
  // Older blocks below the view can be discarded without changing play.
  for (const child of [...tower.children]) {
    if (child.position.y < top.position.y - 24 && !falling.some(f => f.mesh === child)) remove(child as Block);
  }
}
function primary() {
  if (accounts.isOpen() || fading || state === 'loading' || state === 'error') return;
  if (state === 'title') {
    fading = true;
    fadeRemaining = .3;
    element('title').classList.add('fading');
  } else if (state === 'gameover') {
    // Discard early inputs; never queue a restart for after the delay.
    if (gameOverElapsed >= restartInputDelay) begin();
  }
  else if (paused) resume();
  else place();
}
element('start').addEventListener('click', primary);
element('restart').addEventListener('pointerdown', event => {
  if (event.button === 0 && event.isPrimary && state === 'gameover') primary();
});
element('restart').addEventListener('click', event => {
  // Pointer input is handled on press, so a late release cannot restart.
  // Keep keyboard/assistive activation of the button available.
  if (event.detail === 0 && state === 'gameover') primary();
});
element('menu').addEventListener('click', () => {
  if (state !== 'gameover') return;
  state = 'title';
  paused = false;
  fading = false;
  element('title').classList.remove('fading');
  resetTower();
  show('title');
  element('start').focus();
});
element('resume').addEventListener('click', () => { if (paused) primary(); });
element('retry').addEventListener('click', () => location.reload());
document.addEventListener('pointerdown', event => {
  if (event.button !== 0 || !event.isPrimary || (event.target as HTMLElement).closest('button, [data-ui]')) return;
  primary();
});
document.addEventListener('keydown', event => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key !== ' ' || (event.target as HTMLElement).closest('[data-ui]')) return;
  event.preventDefault();
  primary();
});
document.addEventListener('visibilitychange', () => { pause(); });
window.addEventListener('blur', pause);
window.addEventListener('orientationchange', pause);
function resize() {
  pause();
  const width = window.innerWidth;
  const viewHeight = window.innerHeight;
  const aspect = width / viewHeight;
  const halfHeight = Math.max(7, 6 / aspect) / framingMagnification;
  camera.left = -halfHeight * aspect;
  camera.right = halfHeight * aspect;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(width, viewHeight, false);
  layoutTitle();
}
canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  fail('The connection to 3D graphics was interrupted. Retry to start a new game.');
});
let previous = 0;
function frame(now: number) {
  const dt = Math.min((now - previous) / 1000, .05);
  previous = now;
  if (state === 'error') return;
  if (state === 'gameover' && !document.hidden) gameOverElapsed += dt;
  if (fading && !document.hidden) {
    fadeRemaining -= dt;
    if (fadeRemaining <= 0) { begin(); if (!document.hasFocus()) pause(); }
  }
  if (!paused && (state === 'playing' || state === 'gameover')) {
    for (let i = falling.length - 1; i >= 0; i--) {
      const piece = falling[i];
      piece.age += dt;
      piece.velocity -= 18 * dt;
      piece.mesh.position.y += piece.velocity * dt;
      if (piece.age > 2) { remove(piece.mesh); falling.splice(i, 1); }
    }
    if (state === 'playing') {
      if (moving) {
        elapsed += dt;
        moving.position[axis] = top.position[axis] - distance + distance * elapsed / travelTime(score + 1);
        if (moving.position[axis] >= top.position[axis] + top.scale[axis]) lose();
      } else {
        settling -= dt;
        if (settling <= 0) spawn();
      }
    }
  }
  renderer.render(scene, camera);
}
initAccounts(() => {
  if (state === 'title' || state === 'gameover') begin();
});
try {
  renderer = new WebGLRenderer({ canvas, antialias: true });
  resize();
  window.addEventListener('resize', resize);
  resetTower();
  state = 'title';
  show('title');
  renderer.setAnimationLoop(frame);
} catch (error) {
  console.error(error);
  fail('This browser could not start 3D graphics. Retry, or use a browser with WebGL enabled.');
}
