(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const fallbackPalettes = {
    orange: ["#ff7a18", "#ffbe63", "#ff5433"],
    azure: ["#168fff", "#72dcff", "#345cff"],
  };
  function readThemePalette() {
    const styles = getComputedStyle(document.documentElement);
    const colors = ["--orange", "--orange-2", "--accent-rgb-deep"]
      .map((property) => styles.getPropertyValue(property).trim().toLowerCase());
    if (colors.every((color) => /^#[0-9a-f]{6}$/.test(color))) return colors;
    return fallbackPalettes[document.body.dataset.colorTheme === "azure" ? "azure" : "orange"];
  }
  let palette = readThemePalette();

  const layer = document.createElement("div");
  layer.className = "global-motion-layer";
  layer.setAttribute("aria-hidden", "true");
  layer.innerHTML = '<canvas class="aurora-background"></canvas><canvas class="splash-cursor-canvas"></canvas>';
  document.body.prepend(layer);

  const auroraCanvas = layer.querySelector(".aurora-background");
  const splashCanvas = layer.querySelector(".splash-cursor-canvas");
  const aurora = auroraCanvas.getContext("2d", { alpha: true });
  const splash = splashCanvas.getContext("2d", { alpha: true });
  if (!aurora || !splash) return;

  const hexToRgb = (hex) => {
    const value = Number.parseInt(hex.slice(1), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  };
  const rgba = (hex, alpha) => `rgba(${hexToRgb(hex).join(",")},${alpha})`;

  let width = 1;
  let height = 1;
  let dpr = 1;
  let lastFrame = performance.now();
  let lastAuroraDraw = 0;
  let auroraTime = 0;
  let pointer = { x: -100, y: -100, previousX: -100, previousY: -100 };
  const particles = [];

  function resizeCanvases() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    for (const canvas of [auroraCanvas, splashCanvas]) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    aurora.setTransform(dpr, 0, 0, dpr, 0, 0);
    splash.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function colorRamp(alpha) {
    const gradient = aurora.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, rgba(palette[0], alpha));
    gradient.addColorStop(0.5, rgba(palette[1], alpha * 0.92));
    gradient.addColorStop(1, rgba(palette[2], alpha));
    return gradient;
  }

  function drawAurora() {
    aurora.clearRect(0, 0, width, height);
    aurora.save();
    aurora.globalCompositeOperation = "screen";
    aurora.filter = `blur(${Math.max(28, Math.min(64, width * 0.035))}px)`;

    const layers = reducedMotion ? 2 : 4;
    for (let layerIndex = 0; layerIndex < layers; layerIndex += 1) {
      const phase = auroraTime * (0.7 + layerIndex * 0.13) + layerIndex * 1.8;
      const baseline = height * (0.16 + layerIndex * 0.055);
      const amplitude = height * (0.055 + layerIndex * 0.012);
      aurora.beginPath();
      aurora.moveTo(-80, -100);
      for (let x = -80; x <= width + 80; x += Math.max(18, width / 80)) {
        const wave = Math.sin(x / Math.max(170, width * 0.22) + phase) * amplitude;
        const ripple = Math.sin(x / Math.max(80, width * 0.09) - phase * 1.4) * amplitude * 0.28;
        aurora.lineTo(x, baseline + wave + ripple);
      }
      aurora.lineTo(width + 80, -100);
      aurora.closePath();
      aurora.fillStyle = colorRamp(0.16 - layerIndex * 0.018);
      aurora.fill();
    }

    const lowerGlow = aurora.createRadialGradient(width * 0.58, height * 0.72, 0, width * 0.58, height * 0.72, Math.max(width, height) * 0.65);
    lowerGlow.addColorStop(0, rgba(palette[0], 0.075));
    lowerGlow.addColorStop(0.48, rgba(palette[2], 0.035));
    lowerGlow.addColorStop(1, "rgba(0,0,0,0)");
    aurora.fillStyle = lowerGlow;
    aurora.fillRect(0, 0, width, height);
    aurora.restore();
  }

  function emitSplash(x, y, dx, dy, count = 3) {
    if (coarsePointer || reducedMotion) return;
    for (let index = 0; index < count; index += 1) {
      const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.25;
      const speed = Math.min(7, Math.hypot(dx, dy) * 0.12 + Math.random() * 1.8);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 0.7,
        vy: Math.sin(angle) * speed + (Math.random() - 0.5) * 0.7,
        life: 1,
        decay: 0.018 + Math.random() * 0.018,
        radius: 7 + Math.random() * 16,
        color: palette[(particles.length + index) % palette.length],
      });
    }
    if (particles.length > 150) particles.splice(0, particles.length - 150);
  }

  function drawSplash(elapsed) {
    splash.clearRect(0, 0, width, height);
    if (!particles.length) return;
    splash.save();
    splash.globalCompositeOperation = "screen";
    splash.filter = "blur(1.5px)";
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.x += particle.vx * elapsed * 0.065;
      particle.y += particle.vy * elapsed * 0.065;
      particle.vx *= 0.982;
      particle.vy *= 0.982;
      particle.life -= particle.decay * elapsed * 0.06;
      if (particle.life <= 0) {
        particles.splice(index, 1);
        continue;
      }
      const glow = splash.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.radius);
      glow.addColorStop(0, rgba(particle.color, particle.life * 0.34));
      glow.addColorStop(0.34, rgba(particle.color, particle.life * 0.16));
      glow.addColorStop(1, "rgba(0,0,0,0)");
      splash.fillStyle = glow;
      splash.beginPath();
      splash.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      splash.fill();
    }
    splash.restore();
  }

  function animate(now) {
    const elapsed = Math.min(40, now - lastFrame);
    lastFrame = now;
    if (!reducedMotion) auroraTime += elapsed * 0.00016;
    if (!lastAuroraDraw || now - lastAuroraDraw >= 32) {
      drawAurora();
      lastAuroraDraw = now;
    }
    drawSplash(elapsed);
    requestAnimationFrame(animate);
  }

  function decorate(root = document) {
    root.querySelectorAll("button:not(.rank-row):not(.count-podium-card):not(.member-card), [role='button'], label.match-select-control").forEach((control) => {
      control.classList.add("specular-control");
    });
    root.querySelectorAll(".panel, .summary-card, .match-card, .member-card, .announcement, .network-card, .count-podium-card").forEach((surface) => {
      if (surface.dataset.motionReady) return;
      surface.dataset.motionReady = "true";
      surface.classList.add("motion-surface-enter");
    });
  }

  let activeControl = null;
  function setSpecularPosition(event) {
    const control = event.target instanceof Element ? event.target.closest(".specular-control") : null;
    if (activeControl && activeControl !== control) activeControl.style.setProperty("--specular-opacity", "0.16");
    activeControl = control;
    if (!control) return;
    const rect = control.getBoundingClientRect();
    control.style.setProperty("--specular-x", `${event.clientX - rect.left}px`);
    control.style.setProperty("--specular-y", `${event.clientY - rect.top}px`);
    control.style.setProperty("--specular-opacity", "1");
  }

  window.addEventListener("pointermove", (event) => {
    setSpecularPosition(event);
    if (event.pointerType === "touch") return;
    const dx = event.clientX - pointer.previousX;
    const dy = event.clientY - pointer.previousY;
    pointer = { x: event.clientX, y: event.clientY, previousX: event.clientX, previousY: event.clientY };
    if (Math.hypot(dx, dy) > 2 && Math.abs(dx) < 160 && Math.abs(dy) < 160) emitSplash(event.clientX, event.clientY, dx, dy, 2);
  }, { passive: true });

  window.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch") emitSplash(event.clientX, event.clientY, 0, -3, 12);
  }, { passive: true });

  document.addEventListener("pointerout", (event) => {
    const nextTarget = event.relatedTarget instanceof Node ? event.relatedTarget : null;
    if (!activeControl || (nextTarget && activeControl.contains(nextTarget))) return;
    activeControl.style.setProperty("--specular-opacity", "0.16");
    activeControl = null;
  }, { passive: true });

  const app = document.querySelector("#app");
  let decorateFrame = 0;
  const appObserver = new MutationObserver(() => {
    cancelAnimationFrame(decorateFrame);
    decorateFrame = requestAnimationFrame(() => decorate(app || document));
  });
  if (app) appObserver.observe(app, { childList: true, subtree: true });

  const themeObserver = new MutationObserver(() => {
    palette = readThemePalette();
  });
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ["data-color-theme"] });

  resizeCanvases();
  decorate();
  window.addEventListener("resize", resizeCanvases, { passive: true });
  requestAnimationFrame(animate);
})();
