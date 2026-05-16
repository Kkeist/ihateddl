/* ================================================
   Store — Central state & localStorage persistence
   Data model:
     State {
       settings: { language, theme, onboardingCompleted }
       folders: Folder[]
       trash: TrashItem[]
     }
     Folder { id, name, starred, createdAt, courses: Course[] }
     Course { id, name, starred, folderId, createdAt, rootGroup: Group }
     Group {
       id, name, type:'group', groupType:'custom'|'divided',
       percentage, bonus, detail,
       duration: { start, end, prepareStart, ddl },
       milestones: [{id,name,ts}],
       itemDrop, children: (Group|Item)[], status
     }
     Item {
       id, name, type:'item',
       percentage, bonus,
       scoreCurr, scoreOutOf,
       detail,
       duration: { start, end, prepareStart, ddl },
       milestones: [{id,name,ts}],
       status: 'not-started'|'in-progress'|'completed'|'graded',
       altPlan: null | { note, newDdl }
     }
   ================================================ */

const Store = (() => {
  const STORAGE_KEY = 'ihateddl-v4';
  let state = null;
  const listeners = new Set();

  /* ---- Default State ---- */
  function defaultState() {
    return {
      settings: { language: 'zh', theme: 'light', onboardingCompleted: false, languageChosen: false },
      folders: [],
      trash: []
    };
  }

  /* ---- Node Factories ---- */
  function makeGroup(name, groupType, pct) {
    return {
      id: uuid(), name: name || t('editor.addGroup'),
      type: 'group', groupType: groupType || 'custom',
      percentage: pct != null ? pct : 100,
      bonus: false, detail: '',
      duration: { start: null, end: null, prepareStart: null, ddl: null },
      milestones: [], itemDrop: 0,
      children: [], status: 'not-started'
    };
  }

  function makeItem(name, pct) {
    return {
      id: uuid(), name: name || t('editor.addItem'),
      type: 'item',
      percentage: pct != null ? pct : 10,
      bonus: false,
      scoreCurr: null, scoreOutOf: null,
      detail: '',
      duration: { start: null, end: null, prepareStart: null, ddl: null },
      milestones: [], status: 'not-started',
      altPlan: null
    };
  }

  function makeRootGroup(courseName) {
    return {
      id: uuid(), name: courseName,
      type: 'group', groupType: 'custom',
      percentage: 100, bonus: false, detail: '',
      duration: { start: null, end: null, prepareStart: null, ddl: null },
      milestones: [], itemDrop: 0,
      children: [], status: 'not-started'
    };
  }

  /* ---- Init ---- */
  function init() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        state = JSON.parse(raw);
        // migrate: ensure all nodes have required fields
        migrateState(state);
      } else {
        state = defaultState();
      }
    } catch (e) {
      console.warn('Store init error', e);
      state = defaultState();
    }
  }

  function migrateState(s) {
    if (!s.settings) s.settings = defaultState().settings;
    if (!Array.isArray(s.folders)) s.folders = [];
    if (!Array.isArray(s.trash)) s.trash = [];
    s.folders.forEach(f => {
      if (!Array.isArray(f.courses)) f.courses = [];
      f.courses.forEach(c => {
        if (!c.rootGroup) c.rootGroup = makeRootGroup(c.name);
        migrateNode(c.rootGroup);
      });
    });
  }

  function migrateNode(node) {
    if (!node.duration) node.duration = { start: null, end: null, prepareStart: null, ddl: null };
    if (!Array.isArray(node.milestones)) node.milestones = [];
    if (!node.status) node.status = 'not-started';
    if (node.type === 'group') {
      if (!node.groupType) node.groupType = 'custom';
      if (!Array.isArray(node.children)) node.children = [];
      if (node.itemDrop == null) node.itemDrop = 0;
      node.children.forEach(migrateNode);
    }
    if (node.type === 'item') {
      if (node.altPlan === undefined) node.altPlan = null;
    }
  }

  /* ---- Persist ---- */
  // 存储空间写满时不抛崩、不假装成功：记 console.error + 给用户诚实提示 + 返回 false。
  // 内存中的改动仍保留（本次会话可见），但用户知道这次没存住。
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      console.error('Store.save failed (localStorage 写满或不可用)', e);
      if (typeof Toast !== 'undefined') Toast.error(t('common.saveFail'));
      return false;
    }
  }

  /* ---- Reactivity ---- */
  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function notify(event) {
    save();
    listeners.forEach(fn => fn(event));
  }

  /* ---- Getters ---- */
  function getState() { return state; }
  function getSettings() { return state.settings; }
  function getFolders() { return state.folders; }

  function getFolder(id) {
    return state.folders.find(f => f.id === id) || null;
  }

  function getCourse(courseId) {
    for (const f of state.folders) {
      const c = f.courses.find(c => c.id === courseId);
      if (c) return { folder: f, course: c };
    }
    return null;
  }

  function findNode(rootGroup, nodeId) {
    if (rootGroup.id === nodeId) return rootGroup;
    for (const child of (rootGroup.children || [])) {
      const found = findNode(child, nodeId);
      if (found) return found;
    }
    return null;
  }

  function findNodeWithParent(rootGroup, nodeId, parent) {
    if (rootGroup.id === nodeId) return { node: rootGroup, parent };
    for (const child of (rootGroup.children || [])) {
      const r = findNodeWithParent(child, nodeId, rootGroup);
      if (r) return r;
    }
    return null;
  }

  /* ---- Folder Mutations ---- */
  function addFolder(name) {
    const lang = state.settings.language;
    const existingNames = state.folders.map(f => f.name);
    const finalName = autoIncrName(name || t('folders.defaultName'), existingNames);
    const folder = {
      id: uuid(), name: finalName,
      starred: false, createdAt: now(),
      courses: []
    };
    state.folders.push(folder);
    notify({ type: 'folder:add', folder });
    return folder;
  }

  function deleteFolder(folderId) {
    const idx = state.folders.findIndex(f => f.id === folderId);
    if (idx === -1) return;
    state.folders.splice(idx, 1);
    notify({ type: 'folder:delete', folderId });
  }

  function renameFolder(folderId, newName) {
    const f = getFolder(folderId);
    if (!f || !newName.trim()) return;
    f.name = newName.trim();
    notify({ type: 'folder:rename', folderId, name: f.name });
  }

  function starFolder(folderId) {
    const f = getFolder(folderId);
    if (!f) return;
    f.starred = !f.starred;
    notify({ type: 'folder:star', folderId, starred: f.starred });
  }

  /* ---- Course Mutations ---- */
  function addCourse(folderId, name) {
    const folder = getFolder(folderId);
    if (!folder) return;
    const existingNames = folder.courses.map(c => c.name);
    const finalName = autoIncrName(name || t('courses.defaultName'), existingNames);
    const course = {
      id: uuid(), name: finalName,
      starred: false, folderId,
      createdAt: now(),
      rootGroup: makeRootGroup(finalName)
    };
    folder.courses.push(course);
    notify({ type: 'course:add', folderId, course });
    return course;
    return course;
  }

  function deleteCourse(courseId) {
    for (const f of state.folders) {
      const idx = f.courses.findIndex(c => c.id === courseId);
      if (idx !== -1) {
        f.courses.splice(idx, 1);
        notify({ type: 'course:delete', courseId, folderId: f.id });
        return;
      }
    }
  }

  function renameCourse(courseId, newName) {
    const result = getCourse(courseId);
    if (!result || !newName.trim()) return;
    result.course.name = newName.trim();
    result.course.rootGroup.name = newName.trim();
    notify({ type: 'course:rename', courseId, name: newName.trim() });
  }

  function starCourse(courseId) {
    const result = getCourse(courseId);
    if (!result) return;
    result.course.starred = !result.course.starred;
    notify({ type: 'course:star', courseId, starred: result.course.starred });
  }

  /* ---- Node (Group/Item) Mutations ---- */
  function addNode(courseId, parentId, nodeType, groupType) {
    const result = getCourse(courseId);
    if (!result) return;
    const parent = findNode(result.course.rootGroup, parentId);
    if (!parent || parent.type !== 'group') return;

    // Calculate remaining pct for custom groups
    let remainPct = 0;
    if (parent.groupType === 'custom') {
      const usedPct = parent.children.reduce((s, c) => s + (c.bonus ? 0 : (c.percentage || 0)), 0);
      remainPct = Math.max(0, 100 - usedPct);
    }

    let newNode;
    if (nodeType === 'group') {
      newNode = makeGroup(null, groupType || 'custom', parent.groupType === 'divided' ? 0 : remainPct);
    } else {
      newNode = makeItem(null, parent.groupType === 'divided' ? 0 : remainPct);
    }
    parent.children.push(newNode);
    notify({ type: 'node:add', courseId, parentId, node: newNode });
    return newNode;
  }

  function deleteNode(courseId, nodeId) {
    const result = getCourse(courseId);
    if (!result) return;
    const r = findNodeWithParent(result.course.rootGroup, nodeId, null);
    if (!r || !r.parent) return; // can't delete root
    const idx = r.parent.children.indexOf(r.node);
    if (idx !== -1) r.parent.children.splice(idx, 1);
    notify({ type: 'node:delete', courseId, nodeId });
  }

  function renameNode(courseId, nodeId, newName) {
    const result = getCourse(courseId);
    if (!result || !newName.trim()) return;
    const node = findNode(result.course.rootGroup, nodeId);
    if (node) {
      node.name = newName.trim();
      notify({ type: 'node:rename', courseId, nodeId, name: node.name });
    }
  }

  function updateNode(courseId, nodeId, patch) {
    const result = getCourse(courseId);
    if (!result) return;
    const node = findNode(result.course.rootGroup, nodeId);
    if (node) {
      Object.assign(node, patch);
      notify({ type: 'node:update', courseId, nodeId, patch });
    }
  }

  function copyNode(courseId, nodeId) {
    const result = getCourse(courseId);
    if (!result) return;
    const r = findNodeWithParent(result.course.rootGroup, nodeId, null);
    if (!r || !r.parent) return;
    const clone = deepClone(r.node);
    // Re-assign IDs recursively
    function reassignIds(n) {
      n.id = uuid();
      if (n.children) n.children.forEach(reassignIds);
    }
    reassignIds(clone);
    // Auto-rename
    const siblingNames = r.parent.children.map(c => c.name);
    clone.name = autoIncrName(r.node.name, siblingNames);
    const idx = r.parent.children.indexOf(r.node);
    r.parent.children.splice(idx + 1, 0, clone);
    notify({ type: 'node:copy', courseId, nodeId, newNode: clone });
    return clone;
  }

  function moveNodeUp(courseId, nodeId) {
    const result = getCourse(courseId);
    if (!result) return;
    const r = findNodeWithParent(result.course.rootGroup, nodeId, null);
    if (!r || !r.parent) return;
    const arr = r.parent.children;
    const idx = arr.indexOf(r.node);
    if (idx > 0) {
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      notify({ type: 'node:move', courseId });
    }
  }

  function moveNodeDown(courseId, nodeId) {
    const result = getCourse(courseId);
    if (!result) return;
    const r = findNodeWithParent(result.course.rootGroup, nodeId, null);
    if (!r || !r.parent) return;
    const arr = r.parent.children;
    const idx = arr.indexOf(r.node);
    if (idx < arr.length - 1) {
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      notify({ type: 'node:move', courseId });
    }
  }

  /* ---- Trash ---- */
  function trashItem(nodeId, courseId) {
    const result = getCourse(courseId);
    if (!result) return;
    const r = findNodeWithParent(result.course.rootGroup, nodeId, null);
    if (!r || !r.parent) return; // 根分组不可删
    const trashEntry = {
      id: uuid(), nodeId, courseId,
      parentId: r.parent.id,
      node: deepClone(r.node),
      deletedAt: now()
    };
    state.trash.push(trashEntry);
    deleteNode(courseId, nodeId);
    notify({ type: 'trash:add', trashEntry });
    return trashEntry;
  }

  // 把回收站条目里的节点真正放回它原来的课程/父分组；父分组没了就退回课程根分组。
  // 课程整门已被删除 → 无处可放，返回 false，UI 据此提示，不静默丢数据。
  function restoreFromTrash(trashId) {
    const idx = state.trash.findIndex(t => t.id === trashId);
    if (idx === -1) return false;
    const entry = state.trash[idx];
    const result = getCourse(entry.courseId);
    if (!result) return false;
    let parent = entry.parentId ? findNode(result.course.rootGroup, entry.parentId) : null;
    if (!parent || parent.type !== 'group') parent = result.course.rootGroup;
    if (!Array.isArray(parent.children)) parent.children = [];
    parent.children.push(deepClone(entry.node));
    state.trash.splice(idx, 1);
    notify({ type: 'trash:restore', trashId });
    return true;
  }

  function emptyTrash() {
    state.trash = [];
    notify({ type: 'trash:empty' });
  }

  /* ---- Settings ---- */
  function setLanguage(lang) {
    state.settings.language = lang;
    document.body.dataset.lang = lang;
    notify({ type: 'settings:language', lang });
  }

  function setTheme(theme) {
    state.settings.theme = theme;
    document.body.dataset.theme = theme;
    notify({ type: 'settings:theme', theme });
  }

  function completeOnboarding() {
    state.settings.onboardingCompleted = true;
    notify({ type: 'settings:onboarding' });
  }

  function setLanguageChosen() {
    state.settings.languageChosen = true;
    notify({ type: 'settings:langChosen' });
  }

  /* ---- Import / Export ---- */
  function exportData() {
    const data = deepClone(state);
    delete data.trash; // 存档不包含回收站内容
    data._exported = now();
    data._version = 1;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ihateddl-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.folders || !parsed.settings) throw new Error('invalid');
      migrateState(parsed);
      state = parsed;
      document.body.dataset.lang = state.settings.language || 'zh';
      document.body.dataset.theme = state.settings.theme || 'light';
      notify({ type: 'import' });
      return true;
    } catch (e) {
      console.warn('Import error', e);
      return false;
    }
  }

  function clearAll() {
    state = defaultState();
    notify({ type: 'clear' });
  }

  /* ---- Sorted folder list (starred first) ---- */
  function sortedFolders() {
    const folders = [...state.folders];
    folders.sort((a, b) => {
      if (a.starred !== b.starred) return a.starred ? -1 : 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    return folders;
  }

  function sortedCourses(folderId) {
    const folder = getFolder(folderId);
    if (!folder) return [];
    const courses = [...folder.courses];
    courses.sort((a, b) => {
      if (a.starred !== b.starred) return a.starred ? -1 : 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    return courses;
  }

  /* ---- Count helpers ---- */
  function countItems(node) {
    if (!node) return 0;
    if (node.type === 'item') return 1;
    return (node.children || []).reduce((s, c) => s + countItems(c), 0);
  }

  /* ---- Public API ---- */
  return {
    init, getState, getSettings, getFolders, getFolder, getCourse,
    findNode, findNodeWithParent,
    addFolder, deleteFolder, renameFolder, starFolder,
    addCourse, deleteCourse, renameCourse, starCourse,
    addNode, deleteNode, renameNode, updateNode, copyNode,
    moveNodeUp, moveNodeDown,
    trashItem, restoreFromTrash, emptyTrash,
    setLanguage, setTheme, completeOnboarding, setLanguageChosen,
    exportData, importData, clearAll,
    sortedFolders, sortedCourses,
    countItems,
    makeGroup, makeItem,
    subscribe, notify, save,
  };
})();
