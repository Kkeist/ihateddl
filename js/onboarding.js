/* ================================================
   Onboarding — 暗色覆盖 + 高亮真实按钮的引导教程
   每一步：before() 准备好对应视图/示例数据 → 高亮该步真实存在的目标元素
   → 文案与高亮一致 → 点高亮区域或「下一步」执行 after() 真实动作并前进。
   暗色区域不可点击，只有被框住的元素可点；右下角「跳过」随时退出。
   走完自动回到文件夹页面。
   ================================================ */
const Onboarding = (() => {
  let _step = 0;
  let _active = false;
  let _folderId = null;
  let _courseId = null;

  const FOLDER_NAME = '2026Fall';
  const COURSE_NAME = 'exampleCourse001';

  function ensureFolder() {
    let f = Store.sortedFolders().find(x => x.name === FOLDER_NAME);
    if (!f) f = Store.addFolder(FOLDER_NAME);
    _folderId = f.id;
    return f;
  }
  function ensureCourse() {
    const f = ensureFolder();
    let c = f.courses.find(x => x.name === COURSE_NAME) || f.courses[0];
    if (!c) c = Store.addCourse(_folderId, COURSE_NAME);
    _courseId = c.id;
    return c;
  }
  // 教程里自动把示例课程配好（Final / Quiz 均分 / Assignment / Bonus），
  // 让用户直接看到一个配置完整、能算分的真实课程。
  function ensureSampleComponents() {
    const c = ensureCourse();
    const r = Store.getCourse(_courseId);
    if (!r) return;
    const root = r.course.rootGroup;
    if (root.children && root.children.length > 0) return; // 已配置过就不重复加
    const ddl = new Date(2027, 0, 1).getTime();
    const fin = Store.addNode(_courseId, root.id, 'item');
    Store.updateNode(_courseId, fin.id, { name: 'Final', percentage: 40,
      duration: { start: null, end: ddl, prepareStart: null, ddl } });
    const quiz = Store.addNode(_courseId, root.id, 'group', 'divided');
    Store.updateNode(_courseId, quiz.id, { name: 'Quizzes', percentage: 30 });
    const q1 = Store.addNode(_courseId, quiz.id, 'item'); Store.updateNode(_courseId, q1.id, { name: 'Quiz1' });
    const q2 = Store.addNode(_courseId, quiz.id, 'item'); Store.updateNode(_courseId, q2.id, { name: 'Quiz2' });
    const q3 = Store.addNode(_courseId, quiz.id, 'item'); Store.updateNode(_courseId, q3.id, { name: 'Quiz3' });
    Store.updateNode(_courseId, quiz.id, { itemDrop: 1 });
    const asg = Store.addNode(_courseId, root.id, 'item');
    Store.updateNode(_courseId, asg.id, { name: 'Assignment', percentage: 20 });
    const bonus = Store.addNode(_courseId, root.id, 'item');
    Store.updateNode(_courseId, bonus.id, { name: 'Bonus', percentage: 2, bonus: true });
  }

  // 步骤定义：target 是该步要高亮的真实选择器，before 准备视图，after 执行真实动作
  function getSteps() {
    return [
      { // 0 欢迎 —— 居中，无高亮
        target: null,
        before() { App.navigate('folders'); },
        after() {}
      },
      { // 1 新建文件夹 —— 高亮右下角 + 按钮
        target: '#fab-add-folder',
        before() { App.navigate('folders'); },
        after() { ensureFolder(); FoldersView.render(); }
      },
      { // 2 添加课程 —— 进入文件夹，高亮右下角 + 按钮
        target: '#fab-add-course',
        before() { ensureFolder(); App.navigate('courses', { folderId: _folderId }); },
        after() { ensureCourse(); CoursesView.render(_folderId); }
      },
      { // 3 配置课程 —— 高亮课程卡片
        target: '#view-courses .li',
        before() { ensureCourse(); App.navigate('courses', { folderId: _folderId }); CoursesView.render(_folderId); },
        after() { ensureSampleComponents(); App.navigate('editor', { courseId: _courseId, folderId: _folderId }); }
      },
      { // 4 查看日历 —— 高亮日历导航
        target: '.nav-tab[data-view="calendar"]',
        before() { ensureSampleComponents(); App.navigate('editor', { courseId: _courseId, folderId: _folderId }); },
        after() { App.navigate('calendar'); }
      },
      { // 5 使用工具箱 —— 高亮工具箱导航
        target: '.nav-tab[data-view="tools"]',
        before() { App.navigate('calendar'); },
        after() { App.navigate('folders'); }
      },
    ];
  }

  function start() {
    _step = 0;
    _active = true;
    const ov = document.getElementById('onboarding-overlay');
    ov.classList.remove('hidden');
    document.getElementById('onboarding-highlight').onclick = () => { if (_active) next(); };
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

  function next() {
    if (!_active) return;
    const steps = getSteps();
    const cur = steps[_step];
    if (cur && typeof cur.after === 'function') cur.after();
    _step++;
    if (_step >= steps.length) { finish(); return; }
    setTimeout(() => showStep(_step), 240);
  }

  function finish() {
    endOverlay();
    Store.completeOnboarding();
    App.navigate('folders');
    Toast.success(t('onboarding.done'));
  }

  function showStep(idx) {
    const steps = getSteps();
    if (idx >= steps.length) { finish(); return; }
    const step = steps[idx];
    if (typeof step.before === 'function') step.before();

    const texts = t('onboarding.steps');
    const data = texts[idx] || { title: '', text: '' };
    const isLast = idx === steps.length - 1;

    document.getElementById('onboarding-text').innerHTML =
      `<strong>${data.title}</strong>${data.text}`;
    document.getElementById('onboarding-skip').textContent = t('onboarding.skip');
    document.getElementById('onboarding-next').textContent =
      isLast ? t('onboarding.done') : `${t('onboarding.next')} (${idx + 1}/${steps.length})`;

    // before() 可能切视图并重渲染，等元素真正出现再定位高亮，避免框住空白
    waitForTarget(step.target, 0);
  }

  function waitForTarget(selector, tries) {
    if (!_active) return;
    if (!selector) { positionHighlight(null); return; }
    const el = document.querySelector(selector);
    if (el && el.getBoundingClientRect().width > 0) { positionHighlight(el); return; }
    if (tries >= 30) { positionHighlight(null); return; } // ~1.5s 仍找不到 → 居中提示，不乱框
    setTimeout(() => waitForTarget(selector, tries + 1), 50);
  }

  function positionHighlight(target) {
    const hl = document.getElementById('onboarding-highlight');
    const tt = document.getElementById('onboarding-tooltip');
    const tw = Math.min(300, window.innerWidth - 32);
    tt.style.maxWidth = tw + 'px';

    if (!target) {
      // 无具体目标（欢迎页/找不到元素）：用一个不可见的零尺寸高亮，
      // 让 9999px 投影把整屏均匀压暗，提示框居中，不出现错位的亮框。
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
    // 目标下方放不下就放上方
    const below = rect.bottom + pad + 14;
    const ty = (below + ttH > vh) ? Math.max(10, rect.top - pad - ttH - 14) : below;
    const tx = Math.max(10, Math.min(rect.left + rect.width / 2 - tw / 2, window.innerWidth - tw - 10));
    tt.style.left = tx + 'px';
    tt.style.top = ty + 'px';
  }

  return { start, skip, next, finish };
})();
