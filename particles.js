(() => {
  const stage = document.querySelector('.name-stage');
  if (!stage) return;
  const heading = stage.querySelector('h1');
  const canvas = stage.querySelector('.name-particles');
  const context = canvas.getContext('2d');
  const source = document.createElement('canvas');
  const ink = source.getContext('2d', { willReadFrequently: true });
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x: 0, y: 0, active: false };
  let gutter = 96;
  const verticalGutter = 32;
  let points = [], width = 0, height = 0, dpr = 1, frame = 0, previous = 0;

  function restore() {
    heading.style.opacity = '1';
    heading.style.transform = 'none';
    canvas.style.opacity = '0';
    stage.dataset.nameState = 'rest';
    context.clearRect(0, 0, width, height);
  }

  function prepare() {
    cancelAnimationFrame(frame); frame = 0; previous = 0;
    pointer.active = false;
    const box = stage.getBoundingClientRect();
    gutter = Math.min(96, Math.max(0, box.left - 2), Math.max(0, document.documentElement.clientWidth - box.right - 2));
    const text = heading.getBoundingClientRect();
    const style = getComputedStyle(heading);
    width = box.width + gutter * 2;
    height = box.height + verticalGutter * 2;
    dpr = Math.min(devicePixelRatio || 1, 2);
    for (const target of [canvas, source]) {
      target.width = Math.ceil(width * dpr);
      target.height = Math.ceil(height * dpr);
    }
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    canvas.style.left = -gutter + 'px';
    canvas.style.top = -verticalGutter + 'px';
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    ink.setTransform(dpr, 0, 0, dpr, 0, 0);
    ink.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    ink.fillStyle = style.color;
    ink.textBaseline = 'alphabetic';
    if ('letterSpacing' in ink) ink.letterSpacing = style.letterSpacing;
    const metrics = ink.measureText(heading.textContent);
    const fontSize = parseFloat(style.fontSize);
    const ascent = metrics.fontBoundingBoxAscent || fontSize * .8;
    const descent = metrics.fontBoundingBoxDescent || fontSize * .2;
    const baseline = text.top - box.top + verticalGutter +
      (parseFloat(style.lineHeight) - ascent - descent) / 2 + ascent;
    ink.fillText(heading.textContent, text.left - box.left + gutter, baseline);
    const pixels = ink.getImageData(0, 0, source.width, source.height).data;
    const cell = box.width < 500 ? 1.7 : 2.2;
    points = [];
    // Retain the exact antialiased glyph patches; only nearby patches move.
    for (let y = 0; y < height; y += cell) {
      for (let x = 0; x < width; x += cell) {
        let occupied = false;
        const x0 = Math.floor(x * dpr), y0 = Math.floor(y * dpr);
        const x1 = Math.min(source.width, Math.ceil((x + cell) * dpr));
        const y1 = Math.min(source.height, Math.ceil((y + cell) * dpr));
        for (let py = y0; py < y1 && !occupied; py++) {
          for (let px = x0; px < x1; px++) {
            if (pixels[(py * source.width + px) * 4 + 3] > 10) { occupied = true; break; }
          }
        }
        if (occupied) points.push({ x, y, cell, shift: 0, velocity: 0 });
      }
    }
    restore();
  }

  function request() {
    if (!frame && !preference.matches && !document.hidden) frame = requestAnimationFrame(draw);
  }

  function draw(stamp) {
    frame = 0;
    const dt = previous ? Math.min((stamp - previous) / 16.667, 2) : 1;
    previous = stamp;
    const radius = Math.min(135, Math.max(65, stage.clientWidth * .14));
    const maximumShift = radius * .78;
    let moving = false;
    const displaced = [];
    for (const p of points) {
      const dx = p.x + p.cell / 2 - pointer.x;
      const dy = p.y + p.cell / 2 - pointer.y;
      const distance = Math.hypot(dx, dy * 1.08);
      const influence = pointer.active ? Math.max(0, 1 - distance / radius) : 0;
      const target = (dx < 0 ? -1 : 1) * maximumShift * influence * influence;
      p.velocity = (p.velocity + (target - p.shift) * .085 * dt) * Math.pow(.72, dt);
      p.shift += p.velocity * dt;
      if (Math.abs(p.shift) > .025 || Math.abs(p.velocity) > .025 || target !== 0) {
        moving = true;
        displaced.push(p);
      } else { p.shift = 0; p.velocity = 0; }
    }
    if (!moving) { previous = 0; restore(); return; }
    heading.style.opacity = '0';
    canvas.style.opacity = '1';
    stage.dataset.nameState = pointer.active ? 'repelling' : 'returning';
    context.clearRect(0, 0, width, height);
    context.drawImage(source, 0, 0, source.width, source.height, 0, 0, width, height);
    for (const p of displaced) context.clearRect(p.x, p.y, p.cell, p.cell);
    for (const p of displaced) {
      context.drawImage(source, p.x * dpr, p.y * dpr, p.cell * dpr, p.cell * dpr,
        p.x + p.shift, p.y, p.cell, p.cell);
    }
    // Stop once the spring has settled; pointer movement starts the next frame.
    if (displaced.some(p => Math.abs(p.velocity) > .025 ||
      (!pointer.active && Math.abs(p.shift) > .025))) request();
  }

  stage.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || preference.matches) return;
    const box = stage.getBoundingClientRect();
    pointer.x = event.clientX - box.left + gutter;
    pointer.y = event.clientY - box.top + verticalGutter;
    pointer.active = true;
    request();
  });
  function release() { pointer.active = false; request(); }
  stage.addEventListener('pointerleave', release);
  stage.addEventListener('pointercancel', release);
  addEventListener('scroll', release, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; previous = 0; pointer.active = false; }
    else release();
  });
  preference.addEventListener('change', () => { prepare(); });
  let resizeTimer;
  new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(prepare, 100); }).observe(stage);
  document.fonts.ready.then(prepare);
})();
