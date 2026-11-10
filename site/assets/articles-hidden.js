// Прячет ссылки на статьи, скрытые в панели ops (сами страницы nginx уже отдаёт с 404)
fetch('/site/articles/hidden.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : []; }).then(function (list) {
  list.forEach(function (s) {
    document.querySelectorAll('a[href="/articles/' + s + '"],a[href="/articles/' + s + '/"]').forEach(function (a) {
      (a.classList.contains('article-card') ? a : a.closest('li') || a).remove();
    });
  });
}).catch(function () {});
