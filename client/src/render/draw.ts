type RenderEntity = {
  id?: string | number;
  kind: string;
  x?: number;
  y?: number;
  pos?: {
    x: number;
    y: number;
  };
  vx?: number;
  vy?: number;
  angle?: number;
  radius?: number;
  hp?: number;
  thrust?: number;
  ttl?: number;
  alive?: boolean;
  type?: string;
  predicted?: boolean;
};

type RenderShip = RenderEntity | null;
type RenderWorld = Iterable<RenderEntity>;

type DrawAssets = {
  ship?: HTMLImageElement;
  asteroid?: HTMLImageElement;
  bullet?: HTMLImageElement;
  shield?: HTMLImageElement;
};

export function drawScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  ship: RenderShip,
  world: RenderWorld,
  assets: DrawAssets
): void {
  const mobile = window.matchMedia("(pointer: coarse)").matches;

  if (mobile) {
    const sizedWorld = world as RenderWorld & {
      width?: number;
      height?: number;
    };

    const worldWidth = sizedWorld.width ?? 800;
    const worldHeight = sizedWorld.height ?? 500;
    const scale = Math.min(width / worldWidth, height / worldHeight);
    const offsetX = (width - worldWidth * scale) / 2;
    const offsetY = (height - worldHeight * scale) / 2;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#050816";
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    ctx.fillStyle = "#050816";
    ctx.fillRect(0, 0, worldWidth, worldHeight);

    drawStars(ctx, worldWidth, worldHeight);
    drawGrid(ctx, worldWidth, worldHeight);

    for (const entity of world) {
      if (entity.kind === "ship" && entity.id !== ship?.id) {
        drawShip(ctx, entity, assets.ship);
      }
      if (entity.kind === "asteroid") {
        drawAsteroid(ctx, entity, assets.asteroid);
      }
      if (entity.kind === "bullet") {
        drawBullet(ctx, entity, assets.bullet);
      }
      if (entity.kind === "explosion") {
        drawExplosionParticle(ctx, entity);
      }
      if (entity.kind === "pickup") {
        drawPickup(ctx, entity, assets.shield);
      }
    }

    drawShip(ctx, ship, assets.ship);
    ctx.restore();
    return;
  }

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#050816";
  ctx.fillRect(0, 0, width, height);

  drawStars(ctx, width, height);
  drawGrid(ctx, width, height);

  for (const entity of world) {
    if (entity.kind === "ship" && entity.id !== ship?.id) {
      drawShip(ctx, entity, assets.ship);
    }
    if (entity.kind === "asteroid") {
      drawAsteroid(ctx, entity, assets.asteroid);
    }
    if (entity.kind === "bullet") {
      drawBullet(ctx, entity, assets.bullet);
    }
    if (entity.kind === "explosion") {
      drawExplosionParticle(ctx, entity);
    }
    if (entity.kind === "pickup") {
      drawPickup(ctx, entity, assets.shield);
    }
  }

  drawShip(ctx, ship, assets.ship);
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.fillStyle = "white";

  for (let x = 30; x < width; x += 100) {
    for (let y = 30; y < height; y += 100) {
      ctx.fillRect(x, y, 2, 2);
    }
  }
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const size = 50;

  ctx.strokeStyle = "#172033";
  ctx.lineWidth = 1;

  for (let x = 0; x <= width; x += size) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y <= height; y += size) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawShip(
  ctx: CanvasRenderingContext2D,
  ship: RenderShip,
  image: HTMLImageElement | undefined
): void {
  if (!ship || !image) {
    return;
  }

  const x = ship.x ?? ship.pos?.x;
  const y = ship.y ?? ship.pos?.y;

  if (x === undefined || y === undefined) {
    return;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ship.angle ?? 0);

  const sourceX = 0;
  const sourceY = 0;
  const sourceWidth = image.width;
  const sourceHeight = image.height;
  const drawWidth = 90;
  const drawHeight = 90;

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight
  );

  ctx.restore();
}

function drawBullet(
  ctx: CanvasRenderingContext2D,
  bullet: RenderEntity,
  image: HTMLImageElement | undefined
): void {
  if (!image || !bullet.pos) {
    return;
  }

  const size = (bullet.radius ?? 0) * 2;
  const sourceX = 0;
  const sourceY = 0;
  const sourceWidth = image.width;
  const sourceHeight = image.height;

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    bullet.pos.x - size / 2,
    bullet.pos.y - size / 2,
    size,
    size
  );
}

function drawAsteroid(
  ctx: CanvasRenderingContext2D,
  asteroid: RenderEntity,
  image: HTMLImageElement | undefined
): void {
  if (!image || !asteroid.pos) {
    return;
  }

  const size = (asteroid.radius ?? 0) * 2.5;
  const sourceX = 0;
  const sourceY = 0;
  const sourceWidth = image.width;
  const sourceHeight = image.height;

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    asteroid.pos.x - size / 2,
    asteroid.pos.y - size / 2,
    size,
    size
  );
}

function drawExplosionParticle(
  ctx: CanvasRenderingContext2D,
  particle: RenderEntity
): void {
  if (!particle.pos) {
    return;
  }

  const alpha = (particle.ttl ?? 0) / 0.5;
  ctx.globalAlpha = alpha;

  ctx.beginPath();
  ctx.arc(
    particle.pos.x,
    particle.pos.y,
    particle.radius ?? 0,
    0,
    Math.PI * 2
  );

  ctx.fillStyle = "orange";
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawPickup(
  ctx: CanvasRenderingContext2D,
  pickup: RenderEntity,
  image: HTMLImageElement | undefined
): void {
  if (!image || !pickup.pos) {
    return;
  }

  const size = (pickup.radius ?? 0) * 5;
  const sourceX = 0;
  const sourceY = 0;
  const sourceWidth = image.width;
  const sourceHeight = image.height;

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    pickup.pos.x - size / 2,
    pickup.pos.y - size / 2,
    size,
    size
  );
}

