/* Эффекты главной (см. assets/fx.css). Работает только при html.fx. */
(function () {
  var root = document.documentElement;
  if (!root.classList.contains('fx')) return;

  // Заголовок: каждое слово — отдельный блок с задержкой; цветные слова сохраняют свой span
  var h1 = document.querySelector('.ph-h1');
  if (h1) {
    var i = 0;
    Array.from(h1.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var w = document.createElement('span');
          w.className = 'fx-w'; w.style.setProperty('--i', i++); w.textContent = part;
          frag.appendChild(w);
        });
        h1.replaceChild(frag, n);
      } else if (n.nodeType === 1) {
        n.classList.add('fx-w'); n.style.setProperty('--i', i++);
      }
    });
    h1.classList.add('fx-split');
  }

  // Фон первого экрана не крутим, когда его не видно
  var aurora = document.querySelector('.fx-aurora');
  if (aurora && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      aurora.classList.toggle('fx-paused', !es[0].isIntersecting);
    }).observe(aurora);
  }

  // Появление блоков при прокрутке; соседи появляются лесенкой
  var RV = '.seg-head,.side-card,.dir-card,.feat-tile,.team-card,.app-tile,.scen-wrap,.cmp-wrap';
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        el.classList.add('fx-in');
        io.unobserve(el);
        // После появления снимаем служебные классы — чтобы не мешать hover-переходам карточек
        setTimeout(function () { el.classList.remove('fx-rv', 'fx-in'); el.style.removeProperty('--fx-d'); }, 1600);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    document.querySelectorAll(RV).forEach(function (el) {
      if (el.closest('#page-hero')) return;
      var sibs = Array.from(el.parentNode.children).filter(function (s) { return s.matches(RV); });
      el.style.setProperty('--fx-d', Math.min(sibs.indexOf(el), 5) * 80 + 'ms');
      el.classList.add('fx-rv');
      io.observe(el);
    });
  }

  // Заголовки «из дыма»: курсор или палец разрезает буквы, через время они собираются обратно.
  // Заголовок с подменяемым текстом (истории по региону) не трогаем — скрипт перепишет слова.
  if ('IntersectionObserver' in window) {
    var fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    var smokes = [];
    document.querySelectorAll('.ph-h1,.seg-h2:not([data-geo-title]),.dir-group-h').forEach(function (h) {
      if (h !== h1) splitWords(h);
      // Первый экран ждёт, пока доиграет появление слов
      smokes.push(smokeTitle(h, h === h1 ? 3600 : 0));
    });
    var sio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target._fxSmoke.show(e.isIntersecting); });
    }, { rootMargin: '150px 0px' });
    smokes.forEach(function (s) { sio.observe(s.h); });

    // Реакции на курсор и касание (разрез букв) отключены: заголовки остаются как есть.
    // Метод move() у smokeTitle сохранён, чтобы эффект можно было вернуть, подключив события заново.

    // На телефоне resize приходит при скрытии адресной строки — пересобираем только при смене ширины
    var vw = window.innerWidth;
    window.addEventListener('resize', function () {
      if (window.innerWidth === vw) return;
      vw = window.innerWidth;
      smokes.forEach(function (s) { s.rebuild(); });
    });
    new MutationObserver(function () { smokes.forEach(function (s) { s.rebuild(); }); })
      .observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }

  // Курсор — оранжевая капля с инерцией: догоняет мышь на пружине и вытягивается по скорости.
  // Одинаковая над любыми элементами (системный курсор скрыт через html.fx-cursor)
  if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    var drop = document.createElement('div');
    drop.className = 'fx-drop'; drop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(drop);
    root.classList.add('fx-cursor');
    var px = -100, py = -100, tx = -100, ty = -100, dvx = 0, dvy = 0, draf = 0;
    var dstep = function () {
      dvx = (dvx + (tx - px) * 0.22) * 0.62;
      dvy = (dvy + (ty - py) * 0.22) * 0.62;
      px += dvx; py += dvy;
      var sp = Math.sqrt(dvx * dvx + dvy * dvy), st = Math.min(sp / 28, 0.55);
      drop.style.transform = 'translate(' + px + 'px,' + py + 'px) rotate(' + Math.atan2(dvy, dvx) + 'rad) scale(' + (1 + st) + ',' + (1 - st * 0.45) + ')';
      draf = (sp > 0.05 || Math.abs(tx - px) > 0.1 || Math.abs(ty - py) > 0.1) ? requestAnimationFrame(dstep) : 0;
    };
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      if (px < -50) { px = e.clientX; py = e.clientY; }
      tx = e.clientX; ty = e.clientY;
      drop.classList.add('fx-on');
      if (!draf) draf = requestAnimationFrame(dstep);
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', function () { drop.classList.remove('fx-on'); });
  }

  // Подсветка карточек за курсором
  if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    var SPOT = '.side-card,.dir-card,.feat-tile,.team-card';
    document.querySelectorAll(SPOT).forEach(function (el) { el.classList.add('fx-spot'); });
    document.addEventListener('pointermove', function (e) {
      var el = e.target.closest && e.target.closest('.fx-spot');
      if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  // Каждое слово заголовка (и внутри em/span) — в отдельный span.fx-w: canvas рисует текст по их рамкам
  function splitWords(el) {
    Array.from(el.childNodes).forEach(function (n) {
      if (n.nodeType === 1) { splitWords(n); return; }
      if (n.nodeType !== 3 || !n.textContent.trim()) return;
      var frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var w = document.createElement('span');
        w.className = 'fx-w'; w.textContent = part;
        frag.appendChild(w);
      });
      el.replaceChild(frag, n);
    });
  }

  // Текст заголовка рисуется на canvas плитками 3×3 px. В покое — цельная картинка текста;
  // плитки рядом с курсором отрываются, уплывают дымом и через HOLD мс возвращаются на место.
  // Canvas существует, только пока заголовок рядом с экраном: вне экрана память освобождается.
  function smokeTitle(h, delay) {
    var PAD = 90, G = root.classList.contains('fx-lite') ? 4 : 3, R = 34, HOLD = 1100;
    var cv = document.createElement('canvas');
    cv.className = 'fx-smoke-cv'; cv.setAttribute('aria-hidden', 'true');
    var ctx = cv.getContext('2d');
    var src = document.createElement('canvas'), sctx = src.getContext('2d');   // нетронутый текст
    var holed = document.createElement('canvas'), hctx = holed.getContext('2d'); // текст с дырами
    var W, H, PL, dpr, Gd, Gc, tiles = null, grid, cols, active = [], raf = 0, last = null;
    var seen = false, size = '', rt, readyAt = performance.now() + delay;
    var me = { h: h, show: show, move: move, end: function () { last = null; }, rebuild: rebuild };
    h._fxSmoke = me;
    h.appendChild(cv);

    function show(v) {
      seen = v;
      if (v && !tiles) fontsReady.then(function () {
        setTimeout(function () { requestAnimationFrame(build); }, Math.max(0, readyAt - performance.now()));
      });
      else if (!v) release();
    }

    function release() {
      if (!tiles || active.length) return;
      tiles = null; cancelAnimationFrame(raf); raf = 0;
      [cv, src, holed].forEach(function (c) { c.width = c.height = 0; });
      h.classList.remove('fx-smoke');
    }

    function rebuild() {
      if (!tiles) return;
      clearTimeout(rt); rt = setTimeout(function () { requestAnimationFrame(build); }, 200);
    }

    function build() {
      if (!seen) return;
      cancelAnimationFrame(raf); raf = 0; active = []; last = null;
      var hr = h.getBoundingClientRect();
      if (!hr.width || !hr.height) return;
      size = Math.round(hr.width) + 'x' + Math.round(hr.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      // Плитка — целое число физических пикселей: при масштабе 125% и т.п. стирание и возврат без щелей
      Gd = Math.max(2, Math.round(G * dpr)); Gc = Gd / dpr;
      // По бокам холст не выходит за экран — иначе на телефоне появится горизонтальная прокрутка
      var vwid = root.clientWidth;
      PL = Math.floor(Math.min(PAD, Math.max(0, hr.left)));
      var PR = Math.floor(Math.min(PAD, Math.max(0, vwid - hr.right)));
      W = Math.ceil(hr.width + PL + PR); H = Math.ceil(hr.height + PAD * 2);
      [cv, src, holed].forEach(function (c) { c.width = W * dpr; c.height = H * dpr; });
      cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.style.left = -PL + 'px';
      [ctx, sctx].forEach(function (c) { c.setTransform(dpr, 0, 0, dpr, 0, 0); });
      hctx.setTransform(1, 0, 0, 1, 0, 0);
      var dark = root.getAttribute('data-theme') !== 'light';
      var fitLS = !('letterSpacing' in sctx), base = getComputedStyle(h).color;
      h.querySelectorAll('.fx-w').forEach(function (w) {
        // DOM-текст в режиме дыма скрыт через text-fill-color, поэтому color — настоящий цвет слова.
        // Дымом рассыпаются только цветные слова (fx-c), обычные остаются текстом страницы
        var r = w.getBoundingClientRect(), cs = getComputedStyle(w), col = cs.color;
        w.classList.toggle('fx-c', col !== base);
        if (!r.width || col === base) return;
        sctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
        if (!fitLS) sctx.letterSpacing = cs.letterSpacing;
        var m = sctx.measureText(w.textContent);
        var asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent;
        var x = r.left - hr.left + PL, y = r.top - hr.top + PAD + (r.height - asc - desc) / 2 + asc;
        // Свечение цветных слов первого экрана — как итоговый text-shadow из fx.css
        var glow = dark && h === h1 && (w.classList.contains('em-orange') || w.classList.contains('em-blue'));
        sctx.shadowColor = glow ? col.replace(/^rgb\((.+)\)$/, 'rgba($1, .35)') : 'transparent';
        sctx.shadowBlur = glow ? 14 : 0;
        sctx.fillStyle = col;
        // Без letterSpacing в canvas (старый Safari) подгоняем ширину слова под вёрстку
        var sx = fitLS && m.width ? r.width / m.width : 1;
        sctx.setTransform(dpr * sx, 0, 0, dpr, x * dpr, 0);
        sctx.fillText(w.textContent, 0, y);
        sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      });
      hctx.clearRect(0, 0, holed.width, holed.height); hctx.drawImage(src, 0, 0);
      // Плитки — только там, где есть пиксели текста. В плитку попадает любой видимый пиксель —
      // и края букв, и свечение, иначе после разреза остаётся «тень» буквы
      var DW = W * dpr, DH = H * dpr;
      var data = sctx.getImageData(0, 0, DW, DH).data, rowLen = DW * 4;
      cols = Math.ceil(DW / Gd); tiles = []; grid = {};
      for (var dy = 0; dy < DH; dy += Gd) for (var dx = 0; dx < DW; dx += Gd) {
        var hit = false;
        for (var yy = dy; yy < Math.min(dy + Gd, DH) && !hit; yy++)
          for (var xx = dx; xx < Math.min(dx + Gd, DW); xx++) if (data[yy * rowLen + xx * 4 + 3]) { hit = true; break; }
        if (!hit) continue;
        var t = { dx: dx, dy: dy, hx: dx / dpr, hy: dy / dpr, x: dx / dpr, y: dy / dpr, vx: 0, vy: 0, a: 1, s: Gc, t: 0, on: false, k: Math.random() * 6.28 };
        grid[(dy / Gd) * cols + dx / Gd] = t; tiles.push(t);
      }
      paint();
      // fx-calm навсегда гасит появление слов: иначе при уходе с экрана оно проиграется заново
      h.classList.add('fx-smoke', 'fx-calm');
    }

    // Размер заголовка поменялся (перенос строк, открылся раздел) — перерисовать
    if ('ResizeObserver' in window) new ResizeObserver(function () {
      var hr = h.getBoundingClientRect();
      if (tiles && Math.round(hr.width) + 'x' + Math.round(hr.height) !== size) rebuild();
    }).observe(h);

    function paint() {
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(holed, 0, 0, W, H);
      for (var i = 0; i < active.length; i++) {
        var t = active[i];
        ctx.globalAlpha = t.a;
        ctx.drawImage(src, t.dx, t.dy, Gd, Gd, t.x - (t.s - Gc) / 2, t.y - (t.s - Gc) / 2, t.s, t.s);
      }
      ctx.globalAlpha = 1;
    }

    function step() {
      var now = performance.now(), keep = [];
      for (var i = 0; i < active.length; i++) {
        var t = active[i];
        if (now - t.t < HOLD) {
          // Дым: затухающий разлёт, всплытие, завихрения, растворение
          t.vx = t.vx * 0.95 + Math.sin(t.y * 0.05 + now * 0.002 + t.k) * 0.08;
          t.vy = t.vy * 0.95 - 0.035;
          t.x += t.vx; t.y += t.vy;
          t.a = Math.max(0.12, t.a * 0.982);
          t.s += (Gc * 2.4 - t.s) * 0.04;
        } else {
          // Возврат на место
          t.vx = t.vy = 0;
          t.x += (t.hx - t.x) * 0.075; t.y += (t.hy - t.y) * 0.075;
          t.a += (1 - t.a) * 0.08; t.s += (Gc - t.s) * 0.1;
          if (Math.abs(t.x - t.hx) < 0.4 && Math.abs(t.y - t.hy) < 0.4 && t.a > 0.97) {
            t.x = t.hx; t.y = t.hy; t.a = 1; t.s = Gc; t.on = false;
            hctx.drawImage(src, t.dx, t.dy, Gd, Gd, t.dx, t.dy, Gd, Gd);
            continue;
          }
        }
        keep.push(t);
      }
      active = keep;
      paint();
      raf = active.length ? requestAnimationFrame(step) : 0;
      if (!raf && !seen) release();
    }

    function cut(mx, my, dx, dy, now) {
      var c0 = Math.max(0, Math.floor((mx - R) / Gc)), c1 = Math.min(cols - 1, Math.floor((mx + R) / Gc));
      var r0 = Math.max(0, Math.floor((my - R) / Gc)), r1 = Math.floor((my + R) / Gc);
      for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) {
        var t = grid[r * cols + c]; if (!t) continue;
        var ex = t.x + Gc / 2 - mx, ey = t.y + Gc / 2 - my, d = Math.sqrt(ex * ex + ey * ey);
        if (d > R) continue;
        var f = 1 - d / R, n = d || 1;
        if (!t.on) {
          t.on = true; active.push(t);
          hctx.clearRect(t.dx, t.dy, Gd, Gd);
        }
        t.vx += dx * 0.3 * f + ex / n * 1.6 * f + (Math.random() - 0.5) * 1.4;
        t.vy += dy * 0.3 * f + ey / n * 1.6 * f - 0.7 * f + (Math.random() - 0.5) * 1.4;
        t.a = Math.min(t.a, 0.9); t.t = now;
      }
    }

    // fresh — касание пальцем: разрыв в точке касания без предыдущей точки
    function move(x, y, fresh) {
      if (!tiles) return;
      var b = cv.getBoundingClientRect(), mx = x - b.left, my = y - b.top;
      if (mx < -R || my < -R || mx > W + R || my > H + R) { last = null; return; }
      var now = performance.now();
      if (fresh) cut(mx, my, 0, 0, now);
      else if (last) {
        // Быстрое движение: режем по всему отрезку, а не только в конечной точке
        var dx = mx - last.x, dy = my - last.y, len = Math.sqrt(dx * dx + dy * dy), n = Math.max(1, Math.ceil(len / 10));
        for (var i = 1; i <= n; i++) cut(last.x + dx * i / n, last.y + dy * i / n, dx / n, dy / n, now);
      }
      last = { x: mx, y: my };
      if (!raf && active.length) raf = requestAnimationFrame(step);
    }

    return me;
  }
})();
