/* Блок «Истории заведений вашего города»: статьи амбассадоров по региону посетителя.
   Регион: ?region=<key> в адресе → ручной выбор (localStorage) → /geo.json (nginx geoip2, DB-IP) → нет.
   Данные: /articles/ambassadors.json. Контейнер: элемент [data-geo-stories]; его ближайший
   [data-geo-wrap] (или он сам) скрыт style="display:none", пока нечего показать. */
(function () {
  var box = document.querySelector('[data-geo-stories]');
  if (!box) return;
  var wrap = box.closest('[data-geo-wrap]') || box;
  var titleEl = wrap.querySelector('[data-geo-title]');
  var LS = 'alliby-region';

  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lsGet() { try { return localStorage.getItem(LS); } catch (e) { return null; } }
  function lsSet(v) { try { v ? localStorage.setItem(LS, v) : localStorage.removeItem(LS); } catch (e) {} }

  // Регион из DB-IP («Samara Oblast», город «Tolyatti») → ключ региона по списку match
  function regionFromGeo(geo, regions) {
    var hay = ((geo.region || '') + ' ' + (geo.city || '')).toLowerCase();
    for (var k in regions) {
      var m = regions[k].match || [];
      for (var i = 0; i < m.length; i++) if (hay.indexOf(m[i]) !== -1) return k;
    }
    return null;
  }

  var css = document.createElement('style');
  css.textContent =
    '.geo-st{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}' +
    '.geo-card{display:block;border:1px solid var(--line);border-radius:var(--r-3,14px);padding:18px 20px;text-decoration:none;color:inherit;transition:border-color .15s,background .15s}' +
    '.geo-card:hover{border-color:var(--teal);background:var(--bg-2)}' +
    '.geo-card .gc-city{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--teal)}' +
    '.geo-card .gc-demo{margin-left:8px;font-size:10px;font-weight:700;text-transform:uppercase;color:var(--gold);border:1px solid currentColor;border-radius:999px;padding:1px 7px}' +
    '.geo-card h3{font:700 17px/1.3 var(--font-sans);margin:8px 0 6px}' +
    '.geo-card p{color:var(--fg-3);font-size:14px;margin:0}' +
    '.geo-pick{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px;color:var(--fg-3);margin:0 0 14px}' +
    '.geo-attr{font-size:11px;color:var(--fg-4);margin:10px 0 0}.geo-attr a{color:inherit}' +
    '.geo-pick select{font:inherit;color:var(--fg);background:var(--bg-2);border:1px solid var(--line);border-radius:8px;padding:4px 8px}';
  document.head.appendChild(css);

  var qs = new URLSearchParams(location.search).get('region');
  if (qs) lsSet(qs === 'all' ? '' : qs);

  Promise.all([
    fetch('/site/articles/ambassadors.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }),
    // geo нужен только если регион не выбран вручную; ошибка geo = «регион неизвестен»
    lsGet() ? Promise.resolve({}) : fetch('/site/geo.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).catch(function () { return {}; })
  ]).then(function (res) {
    var data = res[0], geo = res[1], regions = data.regions || {}, stories = data.stories || [];
    if (!stories.length) return;
    var manual = lsGet();
    render(regions[manual] ? manual : regionFromGeo(geo, regions));

    function render(key) {
      var own = key ? stories.filter(function (s) { return s.region === key; }) : [];
      var list = own.length ? own : stories;
      if (titleEl) titleEl.innerHTML = own.length
        ? 'Истории заведений <em>в ' + esc(regions[key].in) + '</em>'
        : 'Истории заведений <em>Alliby</em>';
      var opts = '<option value="">Все города</option>' + Object.keys(regions).map(function (k) {
        return '<option value="' + esc(k) + '"' + (k === key && own.length ? ' selected' : '') + '>' + esc(regions[k].name) + '</option>';
      }).join('');
      box.innerHTML =
        '<label class="geo-pick">Ваш город: <select aria-label="Город">' + opts + '</select></label>' +
        '<div class="geo-st">' + list.map(function (s) {
          return '<a class="geo-card" href="' + esc(s.url) + '"><span class="gc-city">' + esc(s.city) + '</span>' +
            (s.demo ? '<span class="gc-demo">пример</span>' : '') +
            '<h3>' + esc(s.title) + '</h3><p>' + esc(s.excerpt) + '</p></a>';
        }).join('') + '</div>' +
        // DB-IP Lite — CC BY 4.0, ссылка на источник обязательна
        '<p class="geo-attr">Город определён по IP: <a href="https://db-ip.com" target="_blank" rel="noopener">IP Geolocation by DB-IP</a></p>';
      box.querySelector('select').onchange = function () { lsSet(this.value); render(this.value || null); };
      wrap.style.display = '';
    }
  }).catch(function () {});
})();
