const App = (() => {
  let _cur = 'calendar', _ctx = {};

  const VIEWS = {
    calendar: { el:'view-calendar', r(){ CalendarView.render(); } },
    folders:  { el:'view-folders',  r(){ FoldersView.render(); } },
    courses:  { el:'view-courses',  r(){ CoursesView.render(_ctx.folderId); } },
    editor:   { el:'view-editor',   r(){ EditorView.render(_ctx.courseId, _ctx.folderId); } },
    tools:    { el:'view-tools',    r(){ ToolsView.render(); } },
    settings: { el:'view-settings', r(){ SettingsView.render(); } },
  };

  function navigate(viewId, ctx) {
    if (ctx) _ctx = { ..._ctx, ...ctx };
    Object.values(VIEWS).forEach(v => document.getElementById(v.el).classList.add('hidden'));
    const v = VIEWS[viewId]; if (!v) return;
    _cur = viewId;
    document.getElementById(v.el).classList.remove('hidden');
    v.r();
    updNav(viewId);
    updHdr(viewId);
    document.getElementById(v.el).scrollTop = 0;
  }

  function updNav(id) {
    document.querySelectorAll('.nav-tab').forEach(b => {
      const d = b.dataset.view;
      b.classList.toggle('active', d===id || (d==='folders'&&(id==='folders'||id==='courses'||id==='editor')));
    });
  }

  function updHdr(id) {
    const t_ = document.getElementById('header-title');
    const bb = document.getElementById('btn-back');
    // 移动端顶栏是全局品牌栏（桌面端对应 nav-bar 的 iHateDDL logo）。
    // 页面级标题由各视图正文的面包屑/页头负责，顶栏不再重复页面名，
    // 否则移动端会出现顶栏"文件夹"+正文"文件夹"两个相同标题。
    const back = (id === 'courses' || id === 'editor');
    if (t_) t_.textContent = 'iHateDDL';
    if (bb) bb.classList.toggle('hidden', !back);
  }

  function goBack() {
    if (_cur==='editor') navigate('courses',{folderId:_ctx.folderId});
    else if (_cur==='courses') navigate('folders');
    else navigate('folders');
  }

  function rerender() { navigate(_cur); applyI18n(); }

  function showLangSelector() {
    const overlay = document.getElementById('lang-overlay');
    overlay.classList.remove('hidden');
    const langs = I18N.list();
    const opts = document.getElementById('lang-options');
    opts.innerHTML = langs.map(l =>
      `<button class="lang-opt" onclick="App.selectLang('${l.code}')">${l.label}</button>`
    ).join('');
  }

  function selectLang(code) {
    Store.setLanguage(code);
    Store.setLanguageChosen();
    document.getElementById('lang-overlay').classList.add('hidden');
    initApp();
  }

  function initApp() {
    const s = Store.getSettings();
    document.body.dataset.lang = s.language || 'zh';
    document.body.dataset.theme = s.theme || 'light';

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const c = {light:'#f5ede0',dark:'#1a1510',purple:'#f0ecf5',ocean:'#eaf3f6'};
      meta.content = c[s.theme] || '#f5ede0';
    }

    document.querySelectorAll('.nav-tab').forEach(b => {
      b.addEventListener('click', () => {
        const map = {calendar:'calendar',folders:'folders',tools:'tools',settings:'settings'};
        navigate(map[b.dataset.view] || b.dataset.view);
      });
    });

    navigate('calendar');
    applyI18n();

    Store.subscribe(ev => {
      if (ev.type && ev.type.startsWith('node:') && _cur==='calendar') CalendarView.render();
    });

    if (!s.onboardingCompleted) setTimeout(() => Onboarding.start(), 500);

    document.addEventListener('keydown', e => {
      if (e.key==='Escape') {
        if (!document.getElementById('modal-overlay').classList.contains('hidden')) { Modal.close(); return; }
        CtxMenu.hide();
      }
    });
  }

  function init() {
    Store.init();
    const s = Store.getSettings();
    document.body.dataset.theme = s.theme || 'light';

    if (!s.languageChosen) {
      showLangSelector();
    } else {
      initApp();
    }
  }

  return { init, navigate, goBack, rerender, selectLang };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
