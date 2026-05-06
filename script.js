const canvas = document.querySelector('#fluid-canvas');

const palette = [
  { r: 1.0, g: 0.74, b: 0.24 },
  { r: 0.78, g: 0.46, b: 0.15 },
  { r: 0.16, g: 0.11, b: 0.07 },
  { r: 0.96, g: 0.88, b: 0.56 },
];

async function bootWebGLFluid() {
  const { default: WebGLFluid } = await import('https://cdn.jsdelivr.net/npm/webgl-fluid@0.3/dist/webgl-fluid.mjs');

  WebGLFluid(canvas, {
    SIM_RESOLUTION: 128,
    DYE_RESOLUTION: 1024,
    DENSITY_DISSIPATION: 1.8,
    VELOCITY_DISSIPATION: 0.96,
    PRESSURE: 0.74,
    PRESSURE_ITERATIONS: 18,
    CURL: 28,
    SPLAT_RADIUS: 0.23,
    SPLAT_FORCE: 5200,
    SHADING: true,
    COLORFUL: false,
    BLOOM: true,
    BLOOM_INTENSITY: 0.45,
    BLOOM_THRESHOLD: 0.24,
    SUNRAYS: true,
    SUNRAYS_WEIGHT: 0.45,
    TRANSPARENT: true,
    BACK_COLOR: { r: 3, g: 2, b: 1 },
    PAUSED: false,
  });

  seedSyntheticPointer();
}

function seedSyntheticPointer() {
  const fireMove = (x, y) => {
    canvas.dispatchEvent(new PointerEvent('pointermove', {
      clientX: x,
      clientY: y,
      bubbles: true,
      pointerId: 1,
      pointerType: 'mouse',
    }));
  };

  const rect = canvas.getBoundingClientRect();
  const points = [
    [rect.width * 0.16, rect.height * 0.31],
    [rect.width * 0.21, rect.height * 0.35],
    [rect.width * 0.18, rect.height * 0.27],
    [rect.width * 0.62, rect.height * 0.41],
    [rect.width * 0.78, rect.height * 0.56],
  ];

  points.forEach(([x, y], index) => setTimeout(() => fireMove(x, y), 240 * index));
}

function bootFallbackCanvas() {
  const context = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let frame = 0;
  const blobs = Array.from({ length: 38 }, (_, index) => ({
    x: Math.random(),
    y: Math.random(),
    radius: 0.08 + Math.random() * 0.18,
    speed: 0.0015 + Math.random() * 0.004,
    drift: Math.random() * Math.PI * 2,
    color: palette[index % palette.length],
  }));

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function draw() {
    frame += 1;
    context.fillStyle = 'rgba(2, 1, 0, 0.22)';
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = 'lighter';
    context.filter = 'blur(18px)';

    blobs.forEach((blob, index) => {
      const wave = frame * blob.speed + blob.drift;
      const x = (blob.x + Math.sin(wave * 1.7) * 0.09) * width;
      const y = (blob.y + Math.cos(wave * 1.3) * 0.08) * height;
      const radius = blob.radius * Math.max(width, height) * (0.8 + Math.sin(wave * 2) * 0.2);
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      const alpha = index < 5 ? 0.36 : 0.13;
      gradient.addColorStop(0, `rgba(${blob.color.r * 255}, ${blob.color.g * 255}, ${blob.color.b * 255}, ${alpha})`);
      gradient.addColorStop(0.48, `rgba(${blob.color.r * 150}, ${blob.color.g * 115}, ${blob.color.b * 90}, ${alpha * 0.46})`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    });

    context.filter = 'none';
    context.globalCompositeOperation = 'source-over';
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
}

bootWebGLFluid().catch(() => {
  bootFallbackCanvas();
});
