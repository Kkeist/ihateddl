/* ================================================
   Onboarding — 手把手引导
   暗色蒙层把整屏压暗，只把当前要操作的真实按钮挖空高亮；
   用户点这个高亮按钮 → 执行它对应的真实动作 → 自动进入下一步。
   蒙层挡住其它一切，右下角「跳过」随时退出。无目标的步骤（欢迎/结尾）
   显示一个「继续/完成」按钮推进。走完自动回到文件夹页。
   ================================================ */
const Onboarding = (() => {
  let _step = 0;
  let _active = false;
  let _folderId = null;
  let _courseId = null;
  let _rootId = null;

  const FOLDER_NAME = '2026Fall';
  const COURSE_NAME = 'exampleCourse001';

  function curCourse() { return _courseId ? Store.getCourse(_courseId) : null; }

  // 步骤定义：
  //  text  -> i18n onboarding.steps 下标
  //  arm   -> 进入该步前准备视图/预填输入（可异步靠 waitForTarget 兜底）
  //  target-> 该步要高亮的真实元素选择器（字符串或返回字符串的函数）；null=居中无目标
  //  act   -> 用户点高亮（或继续按钮）时执行的真实动作
  function getSteps() {
    return [
      { // 0 欢迎
        text: 0, target: null,
        arm() { App.navigate('folders'); },
        act() {}
      },
      { // 1 新建文件夹：高亮 + 按钮
        text: 1, target: '#fab-add-folder',
        arm() { App.navigate('folders'); },
        act() { FoldersView.startAdd(); }
      },
      { // 2 确认文件夹名：预填 2026Fall，高亮确认
        text: 2, target: '#inline-add-folder .btn-p',
        arm() {
          FoldersView.startAdd();
          afterRender('#inline-add-folder input', el => { el.value = FOLDER_NAME; });
        },
        act() {
          const inp = document.querySelector('#inline-add-folder input');
          if (inp) inp.value = FOLDER_NAME;
          FoldersView.confirmAdd();
          const f = Store.sortedFolders().find(x => x.name === FOLDER_NAME) || Store.sortedFolders()[0];
          if (f) _folderId = f.id;
        }
      },
      { // 3 打开文件夹：高亮文件夹卡片
        text: 3, target: '#view-folders .li',
        arm() { App.navigate('folders'); FoldersView.render(); },
        act() { if (_folderId) App.navigate('courses', { folderId: _folderId }); }
      },
      { // 4 新建课程：高亮 + 按钮
        text: 4, target: '#fab-add-course',
        arm() { App.navigate('courses', { folderId: _folderId }); },
        act() { CoursesView.startAdd(); }
      },
      { // 5 确认课程名：预填 exampleCourse001，高亮确认（确认后弹出快速配置弹窗）
        text: 5, target: '#inline-add-course .btn-p',
        arm() {
          CoursesView.startAdd();
          afterRender('#inline-add-course input', el => { el.value = COURSE_NAME; });
        },
        act() {
          const inp = document.querySelector('#inline-add-course input');
          if (inp) inp.value = COURSE_NAME;
          CoursesView.confirmAdd(); // 创建课程并弹出快速配置弹窗
          const f = Store.getFolder(_folderId);
          const c = f && (f.courses.find(x => x.name === COURSE_NAME) || f.courses[f.courses.length - 1]);
          if (c) { _courseId = c.id; _rootId = c.rootGroup.id; }
        }
      },
      { // 6 跳过模板，手动配置：高亮弹窗「跳过」
        text: 6, target: '#modal-footer .btn',
        arm() { /* 上一步已弹出 setup 弹窗 */ },
        act() {
          CoursesView.skipSetup(); // 关弹窗 → 进入编辑器
          App.navigate('editor', { courseId: _courseId, folderId: _folderId });
        }
      },
      { // 7 添加 Final：高亮根分组「+ 新建项」
        text: 7, target: () => `#ed-add-item-${_rootId}`,
        arm() { App.navigate('editor', { courseId: _courseId, folderId: _folderId }); },
        act() {
          const d = new Date(2027, 0, 1); d.setHours(23, 59, 59, 0);
          const ddl = d.getTime();
          const n = Store.addNode(_courseId, _rootId, 'item');
          if (n) Store.updateNode(_courseId, n.id, { name: 'Final', percentage: 40,
            duration: { start: null, end: ddl, prepareStart: null, ddl } });
          EditorView.render();
        }
      },
      { // 8 添加 Quiz 均分组：高亮根分组「+ 新建分组」
        text: 8, target: () => `#ed-add-group-${_rootId}`,
        arm() { EditorView.render(); },
        act() {
          const g = Store.addNode(_courseId, _rootId, 'group', 'divided');
          if (g) {
            Store.updateNode(_courseId, g.id, { name: 'Quizzes', percentage: 30 });
            ['Quiz1', 'Quiz2', 'Quiz3'].forEach(nm => {
              const q = Store.addNode(_courseId, g.id, 'item');
              if (q) Store.updateNode(_courseId, q.id, { name: nm });
            });
            Store.updateNode(_courseId, g.id, { itemDrop: 1 });
          }
          EditorView.render();
        }
      },
      { // 9 添加 Assignment：高亮「+ 新建项」
        text: 9, target: () => `#ed-add-item-${_rootId}`,
        arm() { EditorView.render(); },
        act() {
          const n = Store.addNode(_courseId, _rootId, 'item');
          if (n) Store.updateNode(_courseId, n.id, { name: 'Assignment', percentage: 20 });
          EditorView.render();
        }
      },
      { // 10 添加 Bonus：高亮「+ 新建项」
        text: 10, target: () => `#ed-add-item-${_rootId}`,
        arm() { EditorView.render(); },
        act() {
          const n = Store.addNode(_courseId, _rootId, 'item');
          if (n) Store.updateNode(_courseId, n.id, { name: 'Bonus', percentage: 2, bonus: true });
          EditorView.render();
        }
      },
      { // 11 查看日历：高亮日历导航
        text: 11, target: '.nav-tab[data-view="calendar"]',
        arm() { App.navigate('editor', { courseId: _courseId, folderId: _folderId }); },
        act() { App.navigate('calendar'); }
      },
      { // 12 完成
        text: 12, target: null,
        arm() { App.navigate('calendar'); },
        act() {}
      },
    ];
  }

  // 视图重渲染后，等目标元素出现再回调（用于预填输入框）
  function afterRender(selector, cb, tries) {
    tries = tries || 0;
    const el = document.querySelector(selector);
    if (el) { cb(el); return; }
    if (tries >= 30) return;
    setTimeout(() => afterRender(selector, cb, tries + 1), 40);
  }

  function start() {
    _step = 0; _active = true;
    _folderId = _courseId = _rootId = null;
    document.getElementById('onboarding-overlay').classList.remove('hidden');
    document.getElementById('onboarding-highlight').onclick = () => { if (_active) advance(); };
    document.getElementById('onboarding-next').onclick = () => { if (_active) advance(); };
    showStep(0);
  }

  function endOverlay() {
    _active = false;
    document.getElementById('onboarding-overlay').classList.add('hidden');
  }

  function skip() {
    endOverlay();
    Store.completeOnboarding();
    App.navigate('folders');
  }

  // 执行当前步真实动作并前进
  function advance() {
    if (!_active) return;
    const steps = getSteps();
    const cur = steps[_step];
    try { if (cur && typeof cur.act === 'function') cur.act(); }
    catch (e) { console.error('onboarding act error', e); }
    _step++;
    if (_step >= steps.length) { finish(); return; }
    setTimeout(() => showStep(_step), 260);
  }

  function finish() {
    endOverlay();
    Store.completeOnboarding();
    App.navigate('folders');
    Toast.success(t('onboarding.done'));
  }

  function resolveTarget(target) {
    if (!target) return null;
    return typeof target === 'function' ? target() : target;
  }

  function showStep(idx) {
    const steps = getSteps();
    if (idx >= steps.length) { finish(); return; }
    const step = steps[idx];
    if (typeof step.arm === 'function') step.arm();

    const texts = t('onboarding.steps');
    const data = texts[step.text] || { title: '', text: '' };
    const isLast = idx === steps.length - 1;
    const sel = resolveTarget(step.target);

    document.getElementById('onboarding-text').innerHTML =
      `<strong>${data.title}</strong>${data.text}`;
    document.getElementById('onboarding-skip').textContent = t('onboarding.skip');

    // 有目标的步骤：靠点高亮按钮推进，隐藏继续按钮（只有被框住的能点）
    // 无目标的步骤（欢迎/结尾）：显示「继续 / 完成」按钮
    const nextBtn = document.getElementById('onboarding-next');
    if (sel) {
      nextBtn.style.display = 'none';
    } else {
      nextBtn.style.display = '';
      nextBtn.textContent = isLast ? t('onboarding.done') : t('onboarding.go');
    }

    waitForTarget(sel, 0);
  }

  function waitForTarget(selector, tries) {
    if (!_active) return;
    if (!selector) { positionHighlight(null); return; }
    const el = document.querySelector(selector);
    if (el && el.getBoundingClientRect().width > 0) { positionHighlight(el); return; }
    if (tries >= 40) { positionHighlight(null); return; }
    setTimeout(() => waitForTarget(selector, tries + 1), 50);
  }

  function positionHighlight(target) {
    const hl = document.getElementById('onboarding-highlight');
    const tt = document.getElementById('onboarding-tooltip');
    const tw = Math.min(300, window.innerWidth - 32);
    tt.style.maxWidth = tw + 'px';

    if (!target) {
      // 无目标：零尺寸高亮让 9999px 投影把整屏均匀压暗，提示框居中
      hl.style.display = 'block';
      hl.style.width = '0px';
      hl.style.height = '0px';
      hl.style.left = (window.innerWidth / 2) + 'px';
      hl.style.top = (window.innerHeight / 2) + 'px';
      tt.style.transform = 'translate(-50%,-50%)';
      tt.style.left = '50%';
      tt.style.top = '50%';
      return;
    }

    target.scrollIntoView({ block: 'center', behavior: 'instant' });
    const rect = target.getBoundingClientRect();
    const pad = 8;
    hl.style.display = 'block';
    hl.style.left = (rect.left - pad) + 'px';
    hl.style.top = (rect.top - pad) + 'px';
    hl.style.width = (rect.width + pad * 2) + 'px';
    hl.style.height = (rect.height + pad * 2) + 'px';

    tt.style.transform = '';
    const vh = window.innerHeight;
    const ttH = tt.offsetHeight || 170;
    const below = rect.bottom + pad + 14;
    const ty = (below + ttH > vh) ? Math.max(10, rect.top - pad - ttH - 14) : below;
    const tx = Math.max(10, Math.min(rect.left + rect.width / 2 - tw / 2, window.innerWidth - tw - 10));
    tt.style.left = tx + 'px';
    tt.style.top = ty + 'px';
  }

  return { start, skip, advance, next: advance, finish };
})();
