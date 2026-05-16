const FoldersView = (() => {
  let _adding = false;

  function render() {
    const el = document.getElementById('view-folders');
    const folders = Store.sortedFolders();

    let addHtml = '';
    if (_adding) {
      addHtml = `<div class="inline-add" id="inline-add-folder">
        <input type="text" class="inline-add-inp" placeholder="${t('folders.defaultName')}" autofocus
          onkeydown="FoldersView.onAddKey(event)">
        <div class="inline-add-actions">
          <button type="button" class="btn btn-s" onclick="FoldersView.cancelAdd()">${t('common.cancel')}</button>
          <button type="button" class="btn btn-p" onclick="FoldersView.confirmAdd()">${t('common.confirm')}</button>
        </div>
      </div>`;
    }

    let gridHtml = '';
    if (folders.length === 0 && !_adding) {
      gridHtml = `<div class="empty"><div class="empty-title">${t('folders.title')}</div><p>${t('folders.empty')}</p></div>`;
    } else {
      let items = '';
      folders.forEach(f => {
        const n = f.courses ? f.courses.length : 0;
        const status = f.starred ? 'starred' : '';
        items += `<div class="li" data-status="${status}" onclick="FoldersView.open('${f.id}')">
          <div class="li-body">
            <div class="li-title">${escHtml(f.name)}</div>
            <div class="li-sub"><span>${t('folders.courseCount',{n})}</span></div>
          </div>
          <div class="li-right">
            <button class="btn-icon" onclick="event.stopPropagation();FoldersView.menu(event,'${f.id}')">···</button>
          </div>
        </div>`;
      });
      gridHtml = `<div class="li-grid">${items}</div>`;
    }

    el.innerHTML = `<div class="pg-hdr"><h2 class="heading-lg">${t('folders.title')}</h2></div>${addHtml}${gridHtml}
      <div class="fab-wrap"><button class="btn-fab" onclick="FoldersView.startAdd()" id="fab-add-folder">+</button></div>`;

    if (_adding) {
      const inp = el.querySelector('#inline-add-folder input');
      if (inp) { inp.focus(); inp.select(); }
    }
  }

  function startAdd() { _adding = true; render(); }

  function onAddKey(e) {
    if (e.key === 'Enter') { e.preventDefault(); confirmAdd(); }
    else if (e.key === 'Escape') { cancelAdd(); }
  }

  function confirmAdd() {
    const inp = document.querySelector('#inline-add-folder input');
    const name = inp ? inp.value.trim() : '';
    _adding = false;
    if (name) Store.addFolder(name);
    render();
  }

  function cancelAdd() { _adding = false; render(); }

  function open(id) { App.navigate('courses', { folderId: id }); }

  function menu(e, id) {
    e.stopPropagation();
    const f = Store.getFolder(id);
    if (!f) return;
    CtxMenu.show(e.clientX, e.clientY, [
      { icon: f.starred?'☆':'★', label: f.starred?t('common.unstar'):t('common.star'),
        action() { Store.starFolder(id); render(); } },
      { icon:'✎', label:t('common.rename'),
        action() { Modal.prompt({ title:t('common.rename'), value:f.name,
          onConfirm(n) { Store.renameFolder(id,n); render(); } }); } },
      'divider',
      { icon:'✕', label:t('common.delete'), danger:true,
        action() { Modal.confirm({ title:t('common.delete'),
          text:t('folders.deleteConfirm',{name:f.name}), danger:true,
          onConfirm() { Store.deleteFolder(id); render(); } }); } }
    ]);
  }

  return { render, startAdd, onAddKey, confirmAdd, cancelAdd, open, menu };
})();
