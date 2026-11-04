(() => {
  const filters = [...document.querySelectorAll('[data-filter]')];
  if (!filters.length) return;
  const cards = [...document.querySelectorAll('.catalog-card')];
  const count = document.querySelector('#project-count');
  const legacyDestinations = {
    '#life': 'life.html', '#contact': 'contact.html',
    '#project-ai': 'ai-assistant.html', '#project-business': 'business.html',
    '#project-architecture': 'architecture.html',
    '#architecture-models': 'architecture.html#architecture-models',
    '#architecture-drawings': 'architecture.html#architecture-drawings'
  };
  function applyFilter() {
    if (legacyDestinations[location.hash]) {
      location.replace(legacyDestinations[location.hash]);
      return;
    }
    const requested = location.hash.slice(1);
    const category = ['product', 'design'].includes(requested) ? requested : 'all';
    let visible = 0;
    for (const card of cards) {
      card.hidden = category !== 'all' && card.dataset.category !== category;
      if (!card.hidden) visible++;
    }
    for (const button of filters) button.setAttribute('aria-pressed', String(button.dataset.filter === category));
    count.textContent = `(${String(visible).padStart(2, '0')})`;
  }
  for (const button of filters) button.addEventListener('click', () => {
    const hash = button.dataset.filter === 'all' ? '#projects' : '#' + button.dataset.filter;
    if (location.hash === hash) applyFilter();
    else history.pushState(null, '', hash), applyFilter();
  });
  addEventListener('hashchange', applyFilter);
  addEventListener('popstate', applyFilter);
  applyFilter();
})();

(() => {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.catalog-preview').forEach((gallery, order) => {
    const card = gallery.closest('.catalog-card');
    const track = gallery.querySelector('.preview-track');
    const frames = [...track.children];
    const counter = gallery.querySelector('.preview-count');
    const pause = gallery.querySelector('.preview-pause');
    const title = gallery.getAttribute('aria-label').replace(' 图片预览', '');
    let current = 0, timer = 0, visible = false, paused = false, hovering = false;
    const delay = 4600 + order * 500;
    function update() {
      current = frames.reduce((best, item, index) => Math.abs(item.offsetLeft - track.scrollLeft) < Math.abs(frames[best].offsetLeft - track.scrollLeft) ? index : best, 0);
      counter.textContent = `${String(current + 1).padStart(2, '0')} / ${String(frames.length).padStart(2, '0')}`;
    }
    function go(index) {
      current = (index + frames.length) % frames.length;
      track.scrollTo({left: frames[current].offsetLeft, behavior: preference.matches ? 'instant' : 'smooth'});
      counter.textContent = `${String(current + 1).padStart(2, '0')} / ${String(frames.length).padStart(2, '0')}`;
    }
    function schedule() {
      clearTimeout(timer);
      if (preference.matches || paused || hovering || !visible || document.hidden || card.hidden || gallery.contains(document.activeElement)) return;
      timer = setTimeout(() => { go(current + 1); schedule(); }, delay);
    }
    gallery.querySelector('.preview-prev').addEventListener('click', () => { go(current - 1); schedule(); });
    gallery.querySelector('.preview-next').addEventListener('click', () => { go(current + 1); schedule(); });
    pause.addEventListener('click', () => {
      paused = !paused;
      pause.setAttribute('aria-pressed', String(paused));
      pause.setAttribute('aria-label', `${paused ? '继续' : '暂停'} ${title} 自动预览`);
      pause.textContent = paused ? '▷' : 'Ⅱ';
      schedule();
    });
    track.addEventListener('scroll', update, {passive:true});
    track.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault(); go(current + (event.key === 'ArrowRight' ? 1 : -1)); schedule();
    });
    gallery.addEventListener('pointerenter', event => { if(event.pointerType === 'mouse') { hovering = true; schedule(); } });
    gallery.addEventListener('pointerleave', () => { hovering = false; schedule(); });
    gallery.addEventListener('focusin', schedule);
    gallery.addEventListener('focusout', () => setTimeout(schedule, 0));
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }, {threshold:.25}).observe(gallery);
    document.addEventListener('visibilitychange', schedule);
    preference.addEventListener('change', schedule);
    update();
  });
})();
