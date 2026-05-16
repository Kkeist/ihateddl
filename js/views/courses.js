const CoursesView = (() => {
  let _folderId = null;
  let _adding = false;
  let _setupCourseId = null, _setupTemplates = [];

  function render(folderId) {
    if (folderId) _folderId = folderId;
    const folder = Store.getFolder(_folderId);
    if (!folder) { App.navigate('folders'); return; }
    const courses = Store.sortedCourses(_folderId);
    const el = document.getElementById('view-courses');

    let addHtml = '';
    if (_adding) {
      addHtml = `<div class="inline-add" id="inline-add-course">
        <input type="text" class="inline-add-inp" placeholder="${t('courses.defaultName')}" autofocus
          onkeydown="CoursesView.onAddKey(event)">
        <div class="inline-add-actions">
          <button type="button" class="btn btn-s" onclick="CoursesView.cancelAdd()">${t('common.cancel')}</button>
          <button type="button" class="btn btn-p" onclick="CoursesView.confirmAdd()">${t('common.confirm')}</button>
        </div>
      </div>`;
    }

    let gridHtml = '';
    if (courses.length === 0 && !_adding) {
      gridHtml = `<div class="empty"><div class="empty-title">${t('courses.title')}</div><p>${t('courses.empty')}</p></div>`;
    } else {
      let items = '';
      courses.forEach(c => {
        const score = calcNodeScore(c.rootGroup);
        const n = Store.countItems(c.rootGroup);
        const status = c.starred ? 'starred' : (score !== null && score >= 90 ? 'ok' : score !== null && score < 60 ? 'err' : '');
        const scoreStr = score !== null
          ? `<span style="color:${scoreColor(score)};font-weight:700">${score.toFixed(1)}%</span>`
          : `<span style="color:var(--t3)">${t('editor.noScore')}</span>`;
        let pbar = '';
        if (score !== null) {
          pbar = `<div class="pbar" style="margin-top:6px"><div class="pfill ${pctBarClass(score)}" style="width:${Math.min(score,100)}%"></div></div>`;
        }
        items += `<div class="li" data-status="${status}" onclick="CoursesView.open('${c.id}')">
          <div class="li-body">
            <div class="li-title">${escHtml(c.name)}</div>
            <div class="li-sub">${scoreStr}<span style="opacity:.3">·</span><span>${t('courses.itemCount',{n})}</span></div>
            ${pbar}
          </div>
          <div class="li-right">
            <button class="btn-icon" onclick="event.stopPropagation();CoursesView.menu(event,'${c.id}')">···</button>
          </div>
        </div>`;
      });
      gridHtml = `<div class="li-grid">${items}</div>`;
    }

    el.innerHTML = `
      <div class="bc">
        <span onclick="App.navigate('folders')">${t('folders.title')}</span>
        <span class="sep">/</span>
        <span class="cur">${escHtml(folder.name)}</span>
      </div>
      <div class="pg-hdr"><h2 class="heading-lg">${escHtml(folder.name)}</h2></div>
      ${addHtml}${gridHtml}
      <div class="fab-wrap"><button class="btn-fab" onclick="CoursesView.startAdd()" id="fab-add-course">+</button></div>`;

    if (_adding) { const inp = el.querySelector('#inline-add-course input'); if (inp) { inp.focus(); inp.select(); } }
  }

  function startAdd() { _adding = true; render(); }
  function onAddKey(e) {
    if (e.key === 'Enter') { e.preventDefault(); confirmAdd(); }
    else if (e.key === 'Escape') { cancelAdd(); }
  }
  function confirmAdd() {
    const inp = document.querySelector('#inline-add-course input');
    const n = inp ? inp.value.trim() : '';
    _adding = false;
    if (n) { const c = Store.addCourse(_folderId, n); if (c) { showSetup(c); return; } }
    render();
  }
  function cancelAdd() { _adding = false; render(); }
  function open(id) { App.navigate('editor', { courseId:id, folderId:_folderId }); }

  function menu(e, id) {
    e.stopPropagation();
    const r = Store.getCourse(id); if (!r) return;
    const c = r.course;
    CtxMenu.show(e.clientX, e.clientY, [
      { icon:c.starred?'☆':'★', label:c.starred?t('common.unstar'):t('common.star'),
        action() { Store.starCourse(id); render(); } },
      { icon:'✎', label:t('common.rename'),
        action() { Modal.prompt({ title:t('common.rename'), value:c.name,
          onConfirm(n) { Store.renameCourse(id,n); render(); } }); } },
      'divider',
      { icon:'✕', label:t('common.delete'), danger:true,
        action() { Modal.confirm({ title:t('common.delete'),
          text:t('courses.deleteConfirm',{name:escHtml(c.name)}), danger:true,
          onConfirm() { Store.deleteCourse(id); render(); } }); } }
    ]);
  }

  function showSetup(course) {
    _setupCourseId=course.id;
    _setupTemplates=[
      {name:t('courses.setup.standard'),items:[{n:'Final',p:40,tp:'item'},{n:'Midterm',p:20,tp:'item'},{n:'Assignments',p:20,tp:'group',gt:'divided'},{n:'Quizzes',p:20,tp:'group',gt:'divided'}]},
      {name:t('courses.setup.lab'),items:[{n:'Labs',p:40,tp:'group',gt:'divided'},{n:'Final',p:30,tp:'item'},{n:'Midterm',p:15,tp:'item'},{n:'Participation',p:15,tp:'item'}]},
      {name:t('courses.setup.seminar'),items:[{n:'Paper',p:40,tp:'item'},{n:'Presentation',p:30,tp:'item'},{n:'Participation',p:30,tp:'item'}]},
    ];
    let body=`<p style="color:var(--t2);font-size:13px;margin-bottom:16px">${t('courses.setup.desc')}</p>`;
    _setupTemplates.forEach((tpl,idx)=>{
      const desc=tpl.items.map(i=>`${i.n} ${i.p}%`).join(' · ');
      body+=`<div class="li" style="margin-bottom:8px;cursor:pointer" onclick="CoursesView.applyTpl(${idx})">
        <div class="li-body"><div class="li-title">${tpl.name}</div><div class="li-sub" style="font-size:12px">${desc}</div></div>
        <span style="color:var(--t3);font-size:14px">→</span></div>`;
    });
    Modal.open({title:t('courses.setup.title'),body,footer:`<button class="btn btn-s" onclick="CoursesView.skipSetup()">${t('courses.setup.skip')}</button>`});
  }

  function applyTpl(idx) {
    const tpl=_setupTemplates[idx]; if(!tpl||!_setupCourseId)return;
    const r=Store.getCourse(_setupCourseId); if(!r)return;
    const rootId=r.course.rootGroup.id;
    tpl.items.forEach(i=>{
      const nd=Store.addNode(_setupCourseId,rootId,i.tp==='group'?'group':'item',i.gt||'custom');
      if(nd) Store.updateNode(_setupCourseId,nd.id,{name:i.n,percentage:i.p});
    });
    Modal.close();open(_setupCourseId);
  }

  function skipSetup() { Modal.close();if(_setupCourseId)open(_setupCourseId);else render(); }

  return { render, startAdd, onAddKey, confirmAdd, cancelAdd, open, menu, applyTpl, skipSetup, getFolderId(){ return _folderId; } };
})();
