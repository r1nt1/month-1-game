import { Color, DirectionalLight, PerspectiveCamera, Scene, WebGLRenderer } from 'three';

const status = document.querySelector<HTMLParagraphElement>('#status');
const canvas = document.querySelector<HTMLCanvasElement>('#scene');

function fail(message: string): void {
  if (status) {
    status.hidden = false;
    status.textContent = message;
  }
  if (canvas) canvas.hidden = true;
}

function start(): void {
  if (!status || !canvas) {
    throw new Error('index.html is missing #status or #scene');
  }

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true });
  } catch {
    fail('This browser cannot draw 3D graphics, so the game cannot run here.');
    return;
  }

  const scene = new Scene();
  scene.background = new Color(0x1d1d1f);

  const camera = new PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  const light = new DirectionalLight(0xffffff, 1);
  light.position.set(5, 10, 7);
  scene.add(light);

  function resize(): void {
    const { clientWidth, clientHeight } = canvas as HTMLCanvasElement;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', resize);
  resize();
  renderer.render(scene, camera);
  status.hidden = true;
}

try {
  start();
} catch (error) {
  fail('Something went wrong while starting. Reload the page to try again.');
  console.error(error);
}
