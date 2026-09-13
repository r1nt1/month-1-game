import { AmbientLight, Color, DirectionalLight, OrthographicCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { Game } from './game.ts';

const VIEW_HEIGHT = 16; // world units visible top to bottom
const CAMERA_OFFSET = new Vector3(12, 12, 12);

const status = document.querySelector<HTMLParagraphElement>('#status');
const canvas = document.querySelector<HTMLCanvasElement>('#scene');
const title = document.querySelector<HTMLElement>('#title');
const over = document.querySelector<HTMLElement>('#over');
const score = document.querySelector<HTMLElement>('#score');
const finalScore = document.querySelector<HTMLElement>('#final');
const restart = document.querySelector<HTMLButtonElement>('#restart');

function fail(message: string): void {
  if (status) {
    status.hidden = false;
    status.textContent = message;
  }
  if (canvas) canvas.hidden = true;
}

function start(): void {
  if (!status || !canvas || !title || !over || !score || !finalScore || !restart) {
    throw new Error('index.html is missing a required element');
  }
  const ui = { title, over, score, finalScore, restart };

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true });
  } catch {
    fail('This browser cannot draw 3D graphics, so the game cannot run here.');
    return;
  }

  const scene = new Scene();
  scene.background = new Color(0x1d1d1f);
  scene.add(new AmbientLight(0xffffff, 0.6));
  const light = new DirectionalLight(0xffffff, 2);
  light.position.set(-6, 10, 4); // from the top-left
  scene.add(light);

  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  const target = new Vector3(0, 0, 0);
  const game = new Game(scene);

  function resize(): void {
    const { clientWidth, clientHeight } = canvas as HTMLCanvasElement;
    const aspect = clientWidth / clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(clientWidth, clientHeight, false);
    camera.top = VIEW_HEIGHT / 2;
    camera.bottom = -VIEW_HEIGHT / 2;
    camera.left = (-VIEW_HEIGHT / 2) * aspect;
    camera.right = (VIEW_HEIGHT / 2) * aspect;
    camera.updateProjectionMatrix();
  }

  function showScreens(): void {
    ui.title.hidden = game.phase !== 'title';
    ui.over.hidden = game.phase !== 'over';
    ui.score.hidden = game.phase === 'title';
    ui.score.textContent = String(game.score);
    ui.finalScore.textContent = `Score ${game.score}`;
  }

  function act(): void {
    if (game.phase === 'title' || game.phase === 'over') game.start();
    else game.press();
    showScreens();
  }

  window.addEventListener('keydown', (event) => {
    if (event.code !== 'Space' || event.repeat) return;
    event.preventDefault();
    act();
  });
  window.addEventListener('pointerdown', (event) => {
    if (event.target === ui.restart) return; // the button handles its own click
    act();
  });
  ui.restart.addEventListener('click', act);

  let last = performance.now();
  document.addEventListener('visibilitychange', () => {
    last = performance.now();
  });

  function frame(now: number): void {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!document.hidden) {
      game.update(dt);
      showScreens();
    }
    target.y += (game.height - target.y) * Math.min(dt * 4, 1);
    camera.position.copy(target).add(CAMERA_OFFSET);
    camera.lookAt(target);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  resize();
  showScreens();
  status.hidden = true;
  requestAnimationFrame(frame);
}

try {
  start();
} catch (error) {
  fail('Something went wrong while starting. Reload the page to try again.');
  console.error(error);
}
