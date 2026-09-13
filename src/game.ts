import { BoxGeometry, Color, Group, Mesh, MeshLambertMaterial, type Scene } from 'three';

export type Phase = 'title' | 'playing' | 'over';
type Axis = 'x' | 'z';

const BLOCK_HEIGHT = 1;
const START_SIZE = 3;
const TRAVEL = 6; // blocks slide from -TRAVEL to +TRAVEL along their axis
const SPEED = 5; // units per second
const GRAVITY = 30;
const COLOR_STEPS = 20; // blocks from amber to blue
const AMBER = new Color(0xe8a33d);
const BLUE = new Color(0x3a7bd5);
const geometry = new BoxGeometry(1, 1, 1);

interface Block {
  mesh: Mesh;
  x: number;
  z: number;
  w: number;
  d: number;
}

interface Falling {
  mesh: Mesh;
  vy: number;
}

function colorFor(index: number): Color {
  return AMBER.clone().lerp(BLUE, Math.min(index / COLOR_STEPS, 1));
}

function makeBlock(x: number, y: number, z: number, w: number, d: number, index: number): Block {
  const mesh = new Mesh(geometry, new MeshLambertMaterial({ color: colorFor(index), flatShading: true }));
  mesh.scale.set(w, BLOCK_HEIGHT, d);
  mesh.position.set(x, y, z);
  return { mesh, x, z, w, d };
}

function sync(block: Block): void {
  block.mesh.position.x = block.x;
  block.mesh.position.z = block.z;
  block.mesh.scale.x = block.w;
  block.mesh.scale.z = block.d;
}

function dispose(mesh: Mesh): void {
  (mesh.material as MeshLambertMaterial).dispose();
}

export class Game {
  phase: Phase = 'title';
  score = 0;
  private stack: Block[] = [];
  private moving: Block | null = null;
  private axis: Axis = 'x';
  private falling: Falling[] = [];
  private group = new Group();

  constructor(scene: Scene) {
    scene.add(this.group);
  }

  /** Height of the top surface of the tower, in world units. */
  get height(): number {
    return this.stack.length * BLOCK_HEIGHT;
  }

  start(): void {
    this.clear();
    const base = makeBlock(0, BLOCK_HEIGHT / 2, 0, START_SIZE, START_SIZE, 0);
    this.group.add(base.mesh);
    this.stack.push(base);
    this.score = 1;
    this.axis = 'x';
    this.phase = 'playing';
    this.spawn();
  }

  /** The one input. Only does something while playing. */
  press(): void {
    const moving = this.moving;
    const top = this.stack[this.stack.length - 1];
    if (this.phase !== 'playing' || !moving || !top) return;

    const along = this.axis;
    const size = along === 'x' ? top.w : top.d;
    const delta = moving[along] - top[along];
    const overlap = size - Math.abs(delta);

    if (overlap <= 0) {
      this.drop(moving);
      this.end();
      return;
    }

    // Keep the part that sits on the block below; cut the rest off and let it fall.
    const keptCenter = (moving[along] + top[along]) / 2;
    const cutCenter = keptCenter + Math.sign(delta) * (size / 2);
    const index = this.stack.length;
    const y = moving.mesh.position.y;

    if (Math.abs(delta) > 0.001) {
      const cut =
        along === 'x'
          ? makeBlock(cutCenter, y, moving.z, Math.abs(delta), moving.d, index)
          : makeBlock(moving.x, y, cutCenter, moving.w, Math.abs(delta), index);
      this.drop(cut);
    }

    moving[along] = keptCenter;
    if (along === 'x') moving.w = overlap;
    else moving.d = overlap;
    sync(moving);

    this.stack.push(moving);
    this.moving = null;
    this.score = this.stack.length;
    this.axis = along === 'x' ? 'z' : 'x';
    this.spawn();
  }

  update(dt: number): void {
    const moving = this.moving;
    if (moving && this.phase === 'playing') {
      moving[this.axis] += SPEED * dt;
      sync(moving);
      if (moving[this.axis] > TRAVEL) {
        // Slid all the way past without a press.
        this.drop(moving);
        this.end();
      }
    }

    for (const piece of this.falling) {
      piece.vy -= GRAVITY * dt;
      piece.mesh.position.y += piece.vy * dt;
      piece.mesh.rotation.x += dt;
    }
    this.falling = this.falling.filter((piece) => {
      if (piece.mesh.position.y > -30) return true;
      this.group.remove(piece.mesh);
      dispose(piece.mesh);
      return false;
    });
  }

  private spawn(): void {
    const top = this.stack[this.stack.length - 1];
    if (!top) return;
    const index = this.stack.length;
    const y = index * BLOCK_HEIGHT + BLOCK_HEIGHT / 2;
    const block =
      this.axis === 'x'
        ? makeBlock(-TRAVEL, y, top.z, top.w, top.d, index)
        : makeBlock(top.x, y, -TRAVEL, top.w, top.d, index);
    this.group.add(block.mesh);
    this.moving = block;
  }

  private drop(block: Block): void {
    if (block === this.moving) this.moving = null;
    this.group.add(block.mesh);
    this.falling.push({ mesh: block.mesh, vy: 0 });
  }

  private end(): void {
    this.phase = 'over';
    // Score is frozen here. Nothing after this point may change it.
  }

  private clear(): void {
    for (const block of this.stack) {
      this.group.remove(block.mesh);
      dispose(block.mesh);
    }
    for (const piece of this.falling) {
      this.group.remove(piece.mesh);
      dispose(piece.mesh);
    }
    if (this.moving) {
      this.group.remove(this.moving.mesh);
      dispose(this.moving.mesh);
    }
    this.stack = [];
    this.falling = [];
    this.moving = null;
  }
}
