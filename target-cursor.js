(() => {
  const touchScreen = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const mobileAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent || "");
  if ((touchScreen && window.innerWidth <= 768) || mobileAgent || !window.matchMedia("(hover: hover)").matches) return;

  const targetSelector = [
    "button:not(:disabled)",
    "a[href]",
    "input:not(:disabled)",
    "select:not(:disabled)",
    "textarea:not(:disabled)",
    "label.match-select-control",
    "label.checkline",
    ".member-card[data-action]",
    ".rank-row[data-action]",
    ".count-podium-card[data-action]",
  ].join(",");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cornerSize = 12;
  const borderWidth = 3;
  const idlePositions = [
    { x: -18, y: -18 },
    { x: 6, y: -18 },
    { x: 6, y: 6 },
    { x: -18, y: 6 },
  ];

  const cursor = document.createElement("div");
  cursor.className = "target-cursor-wrapper";
  cursor.setAttribute("aria-hidden", "true");
  cursor.innerHTML = `
    <div class="target-cursor-frame">
      <span class="target-cursor-corner corner-tl"></span>
      <span class="target-cursor-corner corner-tr"></span>
      <span class="target-cursor-corner corner-br"></span>
      <span class="target-cursor-corner corner-bl"></span>
    </div>
    <span class="target-cursor-dot"></span>
  `;
  document.body.appendChild(cursor);
  document.body.classList.add("target-cursor-enabled");

  const frame = cursor.querySelector(".target-cursor-frame");
  const corners = [...cursor.querySelectorAll(".target-cursor-corner")];
  let pointerX = window.innerWidth / 2;
  let pointerY = window.innerHeight / 2;
  let cursorX = pointerX;
  let cursorY = pointerY;
  let activeTarget = null;
  let lastTime = performance.now();
  let rotation = 0;
  const cornerPositions = idlePositions.map((position) => ({ ...position }));

  function interactiveTarget(node) {
    const target = node instanceof Element ? node.closest(targetSelector) : null;
    return target && !target.closest("[inert]") ? target : null;
  }

  function setActiveTarget(target) {
    if (activeTarget === target) return;
    activeTarget = target;
    cursor.classList.toggle("is-targeting", Boolean(target));
  }

  function targetCornerPositions() {
    if (!activeTarget || !activeTarget.isConnected) {
      if (activeTarget) setActiveTarget(null);
      return idlePositions;
    }
    const rect = activeTarget.getBoundingClientRect();
    const ratioX = rect.width ? Math.max(-1, Math.min(1, (pointerX - (rect.left + rect.width / 2)) / (rect.width / 2))) : 0;
    const ratioY = rect.height ? Math.max(-1, Math.min(1, (pointerY - (rect.top + rect.height / 2)) / (rect.height / 2))) : 0;
    const parallaxX = reducedMotion ? 0 : ratioX * 1.5;
    const parallaxY = reducedMotion ? 0 : ratioY * 1.5;
    return [
      { x: rect.left - borderWidth - cursorX - parallaxX, y: rect.top - borderWidth - cursorY - parallaxY },
      { x: rect.right + borderWidth - cornerSize - cursorX + parallaxX, y: rect.top - borderWidth - cursorY - parallaxY },
      { x: rect.right + borderWidth - cornerSize - cursorX + parallaxX, y: rect.bottom + borderWidth - cornerSize - cursorY + parallaxY },
      { x: rect.left - borderWidth - cursorX - parallaxX, y: rect.bottom + borderWidth - cornerSize - cursorY + parallaxY },
    ];
  }

  function animate(time) {
    const elapsed = Math.min(48, time - lastTime);
    lastTime = time;
    const followStrength = reducedMotion ? 1 : 1 - Math.pow(0.001, elapsed / 130);
    cursorX += (pointerX - cursorX) * followStrength;
    cursorY += (pointerY - cursorY) * followStrength;
    cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;

    if (!activeTarget && !reducedMotion) rotation = (rotation + (elapsed / 2400) * 360) % 360;
    frame.style.transform = `rotate(${activeTarget || reducedMotion ? 0 : rotation}deg)`;

    const targets = targetCornerPositions();
    const cornerStrength = reducedMotion ? 1 : activeTarget ? 0.24 : 0.16;
    corners.forEach((corner, index) => {
      cornerPositions[index].x += (targets[index].x - cornerPositions[index].x) * cornerStrength;
      cornerPositions[index].y += (targets[index].y - cornerPositions[index].y) * cornerStrength;
      corner.style.transform = `translate3d(${cornerPositions[index].x}px, ${cornerPositions[index].y}px, 0)`;
    });
    requestAnimationFrame(animate);
  }

  window.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    cursor.classList.add("is-visible");
    setActiveTarget(interactiveTarget(event.target));
  }, { passive: true });

  window.addEventListener("pointerover", (event) => {
    if (event.pointerType !== "touch") setActiveTarget(interactiveTarget(event.target));
  }, { passive: true });

  window.addEventListener("pointerout", (event) => {
    if (!activeTarget) return;
    const nextTarget = interactiveTarget(event.relatedTarget);
    if (nextTarget !== activeTarget) setActiveTarget(nextTarget);
  }, { passive: true });

  window.addEventListener("pointerdown", () => cursor.classList.add("is-pressed"), { passive: true });
  window.addEventListener("pointerup", () => cursor.classList.remove("is-pressed"), { passive: true });
  window.addEventListener("scroll", () => {
    const element = document.elementFromPoint(pointerX, pointerY);
    setActiveTarget(interactiveTarget(element));
  }, { passive: true });
  window.addEventListener("blur", () => {
    cursor.classList.remove("is-visible", "is-pressed");
    setActiveTarget(null);
  });
  document.addEventListener("mouseleave", () => cursor.classList.remove("is-visible"));

  requestAnimationFrame(animate);
})();
