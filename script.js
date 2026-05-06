const canvas = document.querySelector('#fluid-canvas');
const hero = document.querySelector('.hero');
const customiseToggle = document.querySelector('.customise-toggle');
const parameterPanel = document.querySelector('#parameter-panel');
const panelClose = document.querySelector('.parameter-panel__close');
const controls = document.querySelectorAll('[data-setting]');

const settings = {
  motion: 1,
  glow: 0.7,
  cursorForce: 1.25,
  fade: 0.16,
};

const fluidOptions = {
  TRIGGER: 'hover',
  IMMEDIATE: true,
  AUTO: false,
  SIM_RESOLUTION: 128,
  DYE_RESOLUTION: 1024,
  DENSITY_DISSIPATION: 1.35,
  VELOCITY_DISSIPATION: 0.94,
  PRESSURE: 0.72,
  PRESSURE_ITERATIONS: 18,
  CURL: 36,
  SPLAT_RADIUS: 0.22,
  SPLAT_FORCE: 6400,
  SHADING: true,
  COLORFUL: false,
  BLOOM: false,
  SUNRAYS: true,
  SUNRAYS_WEIGHT: 0.42,
  TRANSPARENT: false,
  BACK_COLOR: { r: 0, g: 0, b: 0 },
  PAUSED: false,
};

const palette = [
  { r: 255, g: 188, b: 68 },
  { r: 194, g: 112, b: 30 },
  { r: 255, g: 235, b: 148 },
  { r: 80, g: 47, b: 18 },
];

let lastPointer = null;
let usingFallback = false;

function syncCssSettings() {
  document.documentElement.style.setProperty('--glow', settings.glow.toString());

  fluidOptions.CURL = 20 + settings.motion * 16;
  fluidOptions.SPLAT_FORCE = 5200 * settings.cursorForce;
  fluidOptions.SPLAT_RADIUS = 0.14 + settings.cursorForce * 0.065;
  fluidOptions.SUNRAYS_WEIGHT = 0.18 + settings.glow * 0.34;
}

function updateCursorPosition(clientX, clientY) {
  const rect = hero.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 100;
  const y = ((clientY - rect.top) / rect.height) * 100;
  hero.style.setProperty('--cursor-x', `${x}%`);
  hero.style.setProperty('--cursor-y', `${y}%`);
}

function bindPanel() {
  const setPanelOpen = (isOpen) => {
    parameterPanel.hidden = !isOpen;
    customiseToggle.setAttribute('aria-expanded', String(isOpen));
  };

  customiseToggle.addEventListener('click', () => {
    setPanelOpen(parameterPanel.hidden);
  });

  panelClose.addEventListener('click', () => {
    setPanelOpen(false);
    customiseToggle.focus();
  });

  controls.forEach((control) => {
    control.addEventListener('input', (event) => {
      const target = event.currentTarget;
      settings[target.dataset.setting] = Number(target.value);
      syncCssSettings();
    });
  });
}

async function bootWebGLFluid() {
  const { default: WebGLFluid } = await import('https://cdn.jsdelivr.net/npm/webgl-fluid@0.3/dist/webgl-fluid.mjs');

  WebGLFluid(canvas, fluidOptions);

  seedSyntheticPointer();
}

function seedSyntheticPointer() {
  const rect = canvas.getBoundingClientRect();
  const points = [
    [rect.width * 0.18, rect.height * 0.32],
    [rect.width * 0.24, rect.height * 0.36],
    [rect.width * 0.20, rect.height * 0.27],
  ];

  points.forEach(([x, y], index) => {
    setTimeout(() => {
      canvas.dispatchEvent(new PointerEvent('pointermove', {
        clientX: rect.left + x,
        clientY: rect.top + y,
        bubbles: true,
        pointerId: 1,
        pointerType: 'mouse',
      }));
    }, 180 * index);
  });
}

function bootFallbackCanvas() {
  usingFallback = true;

  const context = canvas.getContext('2d');
  const splats = [];
  let width = 0;
  let height = 0;
  let ratio = 1;
  let frame = 0;

  function resize() {
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = '#000';
    context.fillRect(0, 0, width, height);
  }

  function addSplat(clientX, clientY, velocityX = 0, velocityY = 0) {
    const rect = canvas.getBoundingClientRect();
    const force = settings.cursorForce;
    const color = palette[Math.floor(Math.random() * palette.length)];

    splats.push({
      x: clientX - rect.left,
      y: clientY - rect.top,
      vx: velocityX * 0.22 * force,
      vy: velocityY * 0.22 * force,
      radius: (52 + Math.random() * 58) * force,
      age: 0,
      life: 72 + Math.random() * 34,
      spin: (Math.random() - 0.5) * 0.15,
      color,
    });

    if (splats.length > 90) {
      splats.splice(0, splats.length - 90);
    }
  }

  function drawSplat(splat) {
    const progress = splat.age / splat.life;
    const opacity = Math.max(0, 1 - progress) * settings.glow;
    const pulse = 1 + Math.sin((frame + splat.age) * 0.075) * 0.12;
    const radius = splat.radius * (0.38 + progress * 1.7) * pulse;
    const x = splat.x + Math.sin(splat.age * splat.spin) * radius * 0.12;
    const y = splat.y + Math.cos(splat.age * splat.spin) * radius * 0.12;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);

    gradient.addColorStop(0, `rgba(${splat.color.r}, ${splat.color.g}, ${splat.color.b}, ${0.42 * opacity})`);
    gradient.addColorStop(0.34, `rgba(${splat.color.r}, ${splat.color.g * 0.72}, ${splat.color.b * 0.38}, ${0.2 * opacity})`);
    gradient.addColorStop(0.72, `rgba(82, 45, 12, ${0.09 * opacity})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  function drawIdleCurrent() {
    const x = width * (0.5 + Math.sin(frame * 0.003) * 0.36);
    const y = height * (0.5 + Math.cos(frame * 0.004) * 0.26);
    const gradient = context.createRadialGradient(x, y, 0, x, y, Math.max(width, height) * 0.42);

    gradient.addColorStop(0, `rgba(255, 186, 51, ${0.018 * settings.glow})`);
    gradient.addColorStop(0.45, `rgba(84, 50, 16, ${0.012 * settings.glow})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }

  function draw() {
    frame += settings.motion;
    context.globalCompositeOperation = 'source-over';
    context.filter = 'none';
    context.fillStyle = `rgba(0, 0, 0, ${settings.fade})`;
    context.fillRect(0, 0, width, height);

    context.globalCompositeOperation = 'lighter';
    context.filter = `blur(${Math.max(12, 24 * settings.glow)}px)`;
    drawIdleCurrent();

    for (let index = splats.length - 1; index >= 0; index -= 1) {
      const splat = splats[index];
      splat.age += settings.motion;
      splat.x += splat.vx * settings.motion;
      splat.y += splat.vy * settings.motion;
      splat.vx *= 0.982;
      splat.vy *= 0.982;
      drawSplat(splat);

      if (splat.age >= splat.life) {
        splats.splice(index, 1);
      }
    }

    context.filter = 'none';
    context.globalCompositeOperation = 'source-over';
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);

  window.addEventListener('pointermove', (event) => {
    const velocityX = lastPointer ? event.clientX - lastPointer.x : 0;
    const velocityY = lastPointer ? event.clientY - lastPointer.y : 0;
    lastPointer = { x: event.clientX, y: event.clientY };
    addSplat(event.clientX, event.clientY, velocityX, velocityY);
  });

  window.addEventListener('pointerdown', (event) => {
    for (let i = 0; i < 5; i += 1) {
      addSplat(event.clientX, event.clientY, (Math.random() - 0.5) * 42, (Math.random() - 0.5) * 42);
    }
  });

  resize();
  addSplat(width * 0.18, height * 0.31, 34, 18);
  addSplat(width * 0.72, height * 0.58, -26, 16);
  draw();
}

function forwardPointerToWebGLCanvas(event) {
  canvas.dispatchEvent(new PointerEvent(event.type, {
    clientX: event.clientX,
    clientY: event.clientY,
    pressure: event.pressure,
    pointerId: event.pointerId,
    pointerType: event.pointerType,
    buttons: event.buttons,
    bubbles: false,
  }));
}

function bindCursorGlow() {
  window.addEventListener('pointermove', (event) => {
    updateCursorPosition(event.clientX, event.clientY);

    if (!usingFallback) {
      forwardPointerToWebGLCanvas(event);
      lastPointer = { x: event.clientX, y: event.clientY };
    }
  });

  window.addEventListener('pointerdown', (event) => {
    if (!usingFallback) {
      forwardPointerToWebGLCanvas(event);
    }
  });
}

syncCssSettings();
bindPanel();
bindCursorGlow();
bootWebGLFluid().catch(() => {
  bootFallbackCanvas();
});
