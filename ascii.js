(() => {
  const host = document.querySelector('.ascii-art');
  if (!host) return;
  const field = host.querySelector('.ascii-field');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const ruler = document.createElement('canvas').getContext('2d');
  const symbols = '·:;!)(*%#@';
  const tau = Math.PI * 2;
  let width = 0, height = 0, columns = 0, rows = 0, cell = 0, line = 0;
  let time = 0, frame = 0, lastTime = 0, lastDraw = 0, visible = true;

  function density(x, y, t) {
    const u = x / width, v = y / height;
    // Slow, overlapping swells bend the diagonal bands into continuous curves.
    const drift = u + t * .009;
    const swell = .18 * Math.sin(drift * tau * 1.05 - t * .22)
      + .075 * Math.sin(drift * tau * 2.05 + v * 1.2 + t * .13);
    const tide = v + u * .64 + swell;
    const primary = Math.sin(tide * tau * 1.65 + t * .29);
    const undertow = Math.sin((v * .68 - u * .29) * tau + t * .17);
    const value = .5 + primary * .43 + undertow * .065;
    return Math.max(0, Math.min(.999, value));
  }

  function resize() {
    width = host.clientWidth; height = host.clientHeight;
    const size = width < 500 ? 10 : 12;
    line = size * 1.22;
    field.style.fontSize = size + 'px'; field.style.lineHeight = line + 'px';
    ruler.font = size + 'px "Courier New", monospace';
    cell = ruler.measureText('@').width;
    columns = Math.ceil(width / cell) + 1;
    rows = Math.ceil(height / line) + 1;
    render(time);
  }

  function render(t) {
    if (!width || !height) return;
    const lines = [];
    for (let row = 0; row < rows; row++) {
      let text = '';
      for (let col = 0; col < columns; col++) {
        text += symbols[Math.floor(density(col * cell, row * line, t) * symbols.length)];
      }
      lines.push(text);
    }
    field.textContent = lines.join('\n');
    host.dataset.frame = String(Math.floor(t * 20));
  }

  function draw(stamp) {
    frame = 0;
    if (!visible || document.hidden || preference.matches) { lastTime = 0; return; }
    if (stamp - lastDraw >= 48) {
      if (lastTime) time += Math.min((stamp - lastTime) / 1000, .12);
      lastTime = stamp; lastDraw = stamp; render(time);
    }
    frame = requestAnimationFrame(draw);
  }
  function start() {
    if (!frame && visible && !document.hidden && !preference.matches) frame = requestAnimationFrame(draw);
  }
  function stop() { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting; visible ? start() : stop();
  }, { rootMargin: '40px' }).observe(host);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  preference.addEventListener('change', () => { stop(); render(time); start(); });
  resize(); start();
})();
