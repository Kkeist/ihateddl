/* ================================================
   Utils — Helper functions
   ================================================ */

/* ---------- UUID ---------- */
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

/* ---------- Date Helpers ---------- */
function now() { return Date.now(); }

function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfDay(ts) {
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function startOfMonth(year, month) {
  return new Date(year, month, 1).getTime();
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function dayOfWeek(ts) {
  return new Date(ts).getDay(); // 0=Sun
}

function isSameDay(a, b) {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
         da.getMonth() === db.getMonth() &&
         da.getDate() === db.getDate();
}

function formatDate(ts, lang) {
  if (!ts) return '';
  const d = new Date(ts);
  const yr = d.getFullYear(), mo = d.getMonth(), da = d.getDate();
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  if (lang === 'en') {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[mo]} ${da}, ${yr}`;
  }
  return `${yr}年${mo+1}月${da}日`;
}

function formatDateTime(ts, lang) {
  if (!ts) return '';
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  return formatDate(ts, lang) + ` ${hh}:${mm}`;
}

function formatDateInput(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const yr = d.getFullYear();
  const mo = String(d.getMonth()+1).padStart(2,'0');
  const da = String(d.getDate()).padStart(2,'0');
  return `${yr}-${mo}-${da}`;
}

function parseDateInput(str) {
  if (!str) return null;
  const d = new Date(str + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d.getTime();
}

/** 8-digit YYYYMMDD display (no separators) */
function formatDateDigits(ts) {
  if (ts == null || ts === '') return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${yr}${mo}${da}`;
}

/**
 * Parse 8-digit date string. Returns { ok, clear?, ts? }.
 * clear=true when input has no digits; ok=false when partial or invalid calendar date.
 */
function commitDateDigitsRaw(raw, endOfDay) {
  const s = String(raw || '').replace(/\D/g, '');
  if (s.length === 0) return { ok: true, clear: true };
  if (s.length !== 8) return { ok: false };
  const y = parseInt(s.slice(0, 4), 10);
  const mo = parseInt(s.slice(4, 6), 10);
  const day = parseInt(s.slice(6, 8), 10);
  if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || day < 1 || day > 31) return { ok: false };
  const dt = new Date(y, mo - 1, day);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== day) return { ok: false };
  if (endOfDay) dt.setHours(23, 59, 59, 0);
  else dt.setHours(0, 0, 0, 0);
  return { ok: true, ts: dt.getTime() };
}

/**
 * 日期输入：支持连续 8 位 YYYYMMDD（含从 YYYY-MM-DD 抽出的 8 位数字），以及 YYYY-MM-DD / YYYY/MM/DD。
 */
function commitDateFlexible(raw, endOfDay) {
  const s = String(raw || '').trim();
  if (!s) return { ok: true, clear: true };

  const digits = s.replace(/\D/g, '');
  if (digits.length === 8) {
    const r = commitDateDigitsRaw(digits, endOfDay);
    if (r.ok) return r;
  }

  const ymd = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymd) {
    const y = parseInt(ymd[1], 10);
    const mo = parseInt(ymd[2], 10);
    const day = parseInt(ymd[3], 10);
    if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || day < 1 || day > 31) return { ok: false };
    const dt = new Date(y, mo - 1, day);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== day) return { ok: false };
    if (endOfDay) dt.setHours(23, 59, 59, 0);
    else dt.setHours(0, 0, 0, 0);
    return { ok: true, ts: dt.getTime() };
  }

  const iso = parseDateInput(s);
  if (iso != null) {
    const dt = new Date(iso);
    if (endOfDay) dt.setHours(23, 59, 59, 0);
    else dt.setHours(0, 0, 0, 0);
    return { ok: true, ts: dt.getTime() };
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (endOfDay) dt.setHours(23, 59, 59, 0);
    else dt.setHours(0, 0, 0, 0);
    return { ok: true, ts: dt.getTime() };
  }

  return { ok: false };
}

function dateDigitsOnInput(el) {
  const v = el.value.replace(/\D/g, '').slice(0, 8);
  if (v !== el.value) el.value = v;
}

function timeRemaining(ddl) {
  const diff = ddl - Date.now();
  if (diff <= 0) return null; // overdue
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  return { diff, mins, hours, days, weeks };
}

function formatTimeRemaining(ddl, lang) {
  const lang_ = lang || (document.body.dataset.lang || 'zh');
  const T = t('calendar');
  if (!ddl) return '';
  const diff = ddl - Date.now();
  if (diff < 0) {
    const mins = Math.floor(-diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${T.overduBy} ${days}${T.day}`;
    if (hours > 0) return `${T.overduBy} ${hours}${T.hour}`;
    return `${T.overduBy} ${mins}${T.minute}`;
  }
  if (diff < 60000) return T.justNow;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const parts = [];
  if (weeks > 0) parts.push(`${weeks}${T.week}`);
  const remDays = days % 7;
  if (remDays > 0) parts.push(`${remDays}${T.day}`);
  const remHours = hours % 24;
  if (remHours > 0 && days < 3) parts.push(`${remHours}${T.hour}`);
  if (parts.length === 0) parts.push(`${mins}${T.minute}`);
  return parts.join(' ');
}

function urgencyClass(ddl) {
  if (!ddl) return 'normal';
  const diff = ddl - Date.now();
  if (diff < 0) return 'overdue';
  if (diff < 86400000) return 'urgent';       // < 1 day
  if (diff < 3 * 86400000) return 'soon';     // < 3 days
  return 'normal';
}

/* ---------- Score Calculation ---------- */
function calcNodeScore(node, planOverrides) {
  // planOverrides: {nodeId: {scoreCurr, scoreOutOf}} — for plan mode
  const po = planOverrides || {};

  if (node.type === 'item') {
    const override = po[node.id];
    const curr = override ? override.scoreCurr : node.scoreCurr;
    const outof = override ? override.scoreOutOf : node.scoreOutOf;
    if (curr == null || outof == null || outof === 0) return null;
    return (parseFloat(curr) / parseFloat(outof)) * 100; // percentage 0-100
  }

  // Group
  if (node.type === 'group') {
    const children = node.children || [];
    if (children.length === 0) return null;

    let nonBonusChildren = children.filter(c => !c.bonus);
    const bonusChildren  = children.filter(c => c.bonus);

    // Divided group: equal weight, drop lowest
    if (node.groupType === 'divided') {
      const drop = node.itemDrop || 0;
      const count = nonBonusChildren.length;
      if (count === 0) return null;

      // Score each child
      const scored = nonBonusChildren.map(c => ({
        child: c,
        score: calcNodeScore(c, po)
      }));

      // Sort ascending — null treated as 0 for drop purposes
      scored.sort((a, b) => {
        const sa = a.score ?? 0;
        const sb = b.score ?? 0;
        return sa - sb;
      });

      const toDrop = Math.min(drop, count - 1);
      const droppedIds = new Set(scored.slice(0, toDrop).map(x => x.child.id));
      const activeScored = scored.filter(x => !droppedIds.has(x.child.id));

      const active = activeScored.length;
      if (active === 0) return null;

      const equalPct = 100 / active;
      let total = 0, hasAny = false;
      for (const { score } of activeScored) {
        if (score !== null) {
          total += score * equalPct / 100;
          hasAny = true;
        }
      }
      let groupScore = hasAny ? total : null;

      // Add bonus children
      for (const bc of bonusChildren) {
        const bs = calcNodeScore(bc, po);
        if (bs !== null) {
          groupScore = (groupScore ?? 0) + bs * (bc.percentage || 0) / 100;
        }
      }
      return groupScore;
    }

    // Custom group: children have their own percentage
    let total = 0, hasAny = false;
    for (const child of nonBonusChildren) {
      const cs = calcNodeScore(child, po);
      if (cs !== null) {
        total += cs * (child.percentage || 0) / 100;
        hasAny = true;
      }
    }
    let groupScore = hasAny ? total : null;
    for (const bc of bonusChildren) {
      const bs = calcNodeScore(bc, po);
      if (bs !== null) {
        groupScore = (groupScore ?? 0) + bs * (bc.percentage || 0) / 100;
      }
    }
    return groupScore;
  }
  return null;
}

/* Return drop info for a divided group */
function getDividedDropInfo(node, planOverrides) {
  if (node.type !== 'group' || node.groupType !== 'divided') return {};
  const children = (node.children || []).filter(c => !c.bonus);
  const drop = node.itemDrop || 0;
  const scored = children.map(c => ({
    id: c.id,
    score: calcNodeScore(c, planOverrides)
  })).sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
  const droppedIds = new Set(scored.slice(0, Math.min(drop, children.length - 1)).map(x => x.id));
  return { droppedIds };
}

/* ---------- Name auto-increment ---------- */
function autoIncrName(baseName, existing) {
  // If baseName ends in digits, increment; else append Copy
  const names = new Set(existing);
  if (!names.has(baseName)) return baseName;
  const m = baseName.match(/^(.*?)(\d+)$/);
  if (m) {
    const base = m[1];
    const width = m[2].length;
    let n = parseInt(m[2], 10) + 1;
    while (names.has(base + String(n).padStart(width, '0'))) n++;
    return base + String(n).padStart(width, '0');
  }
  let i = 2;
  while (names.has(`${baseName} (${i})`)) i++;
  return `${baseName} (${i})`;
}

/* ---------- Deep clone ---------- */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/* ---------- Toast ---------- */
const Toast = {
  show(msg, type, duration) {
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ' ' + type : '');
    el.textContent = msg;
    const container = document.getElementById('toast-container');
    container.appendChild(el);
    setTimeout(() => {
      el.style.animation = 'tOut 0.3s ease forwards';
      setTimeout(() => el.remove(), 300);
    }, duration || 2200);
  },
  success(msg) { this.show(msg, 'success'); },
  error(msg)   { this.show(msg, 'error'); },
};

/* ---------- Modal ---------- */
const Modal = {
  _stack: [],
  open({ title, body, footer, onClose }) {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = title || '';
    document.getElementById('modal-body').innerHTML = body || '';
    document.getElementById('modal-footer').innerHTML = footer || '';
    overlay.classList.remove('hidden');
    this._stack.push(onClose);
    // Trap re-render functions passed as footer buttons
  },
  close() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.add('hidden');
    const cb = this._stack.pop();
    if (typeof cb === 'function') cb();
  },
  closeOnOverlay(e) {
    if (e.target === document.getElementById('modal-overlay')) this.close();
  },
  confirm({ title, text, confirmText, danger, onConfirm }) {
    const cancelTxt = t('common.cancel');
    const confirmTxt = confirmText || t('common.confirm');
    this.open({
      title,
      body: `<p style="color:var(--t2);line-height:1.6;">${text}</p>`,
      footer: `
        <button class="btn btn-s" onclick="Modal.close()">${cancelTxt}</button>
        <button class="btn ${danger ? 'btn-d' : 'btn-p'}" id="modal-confirm-btn">${confirmTxt}</button>
      `,
    });
    document.getElementById('modal-confirm-btn').onclick = () => {
      Modal.close();
      if (typeof onConfirm === 'function') onConfirm();
    };
  },
  prompt({ title, label, value, placeholder, onConfirm }) {
    const cancelTxt = t('common.cancel');
    const saveTxt = t('common.save');
    this.open({
      title,
      body: `
        <div class="fg">
          ${label ? `<label class="fl">${label}</label>` : ''}
          <input class="fi" id="modal-prompt-input" value="${escHtml(value||'')}" placeholder="${escHtml(placeholder||'')}">
        </div>
      `,
      footer: `
        <button class="btn btn-s" onclick="Modal.close()">${cancelTxt}</button>
        <button class="btn btn-p" id="modal-prompt-btn">${saveTxt}</button>
      `,
    });
    const inp = document.getElementById('modal-prompt-input');
    inp.focus();
    inp.select();
    const doConfirm = () => {
      const v = inp.value.trim();
      if (!v) return;
      Modal.close();
      if (typeof onConfirm === 'function') onConfirm(v);
    };
    document.getElementById('modal-prompt-btn').onclick = doConfirm;
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') doConfirm(); });
  }
};

/* ---------- Context Menu ---------- */
const CtxMenu = {
  _el: null,
  show(x, y, items) {
    this.hide();
    const el = document.createElement('div');
    el.className = 'ctx';
    items.forEach(item => {
      if (item === 'divider') {
        el.insertAdjacentHTML('beforeend', '<div class="divider" style="margin:4px 0"></div>');
        return;
      }
      const btn = document.createElement('div');
      btn.className = 'ctx-i' + (item.danger ? ' danger' : '');
      btn.innerHTML = `<span class="ctx-ic">${item.icon||''}</span> ${escHtml(item.label)}`;
      btn.onclick = () => { this.hide(); item.action && item.action(); };
      el.appendChild(btn);
    });
    document.body.appendChild(el);
    this._el = el;

    // Position
    const vw = window.innerWidth, vh = window.innerHeight;
    const mw = 180, mh = items.length * 42;
    const px = Math.min(x, vw - mw - 8);
    const py = Math.min(y, vh - mh - 8);
    el.style.left = px + 'px';
    el.style.top  = py + 'px';

    setTimeout(() => {
      document.addEventListener('click', () => this.hide(), { once: true });
    }, 0);
  },
  hide() {
    if (this._el) { this._el.remove(); this._el = null; }
  }
};

/* ---------- HTML Escape ---------- */
function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

/* ---------- Score color ---------- */
function scoreColor(pct) {
  if (pct == null) return 'var(--t3)';
  if (pct >= 90) return 'var(--ok)';
  if (pct >= 70) return 'var(--ac)';
  if (pct >= 60) return 'var(--warn)';
  return 'var(--err)';
}

/* ---------- Percentage bar ---------- */
function pctBarClass(pct) {
  if (pct == null) return '';
  if (pct >= 90) return 'ok';
  if (pct >= 70) return '';
  if (pct >= 60) return 'warn';
  return 'err';
}

/* ---------- Collect all DDL items from store ---------- */
function getAllDdlItems(store) {
  const items = [];
  for (const folder of store.folders) {
    for (const course of folder.courses) {
      collectDdlItems(course.rootGroup, folder, course, [], items);
    }
  }
  return items;
}

function collectDdlItems(node, folder, course, path, out) {
  const nodePath = [...path, node.name];
  if (node.duration && (node.duration.ddl || node.duration.end)) {
    out.push({ node, folder, course, path: nodePath });
  }
  if (node.children) {
    for (const child of node.children) {
      collectDdlItems(child, folder, course, nodePath, out);
    }
  }
}

/* ---------- Mini Calendar Builder ---------- */
function buildMiniCalendar(containerId, selectedTs, onSelect, markedDates) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let viewDate = selectedTs ? new Date(selectedTs) : new Date();
  let viewYear = viewDate.getFullYear();
  let viewMonth = viewDate.getMonth();

  function render() {
    const months = t('calendar.months');
    const weeks = t('calendar.weeks');
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const numDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    const today = new Date();

    let html = `
      <div class="cal-surface ed-mini-cal-surface">
      <div class="cal-nav">
        <button type="button" class="hdr-btn" data-mini-prev aria-label="prev">&#8249;</button>
        <h3>${months[viewMonth]} ${viewYear}</h3>
        <button type="button" class="hdr-btn" data-mini-next aria-label="next">&#8250;</button>
      </div>
      <div class="cal-grid">
    `;
    weeks.forEach(w => { html += `<div class="cal-wk">${w}</div>`; });

    for (let i = 0; i < firstDay; i++) {
      html += `<div class="cal-d om"></div>`;
    }

    for (let d = 1; d <= numDays; d++) {
      const ts = new Date(viewYear, viewMonth, d).getTime();
      const isToday = isSameDay(ts, today.getTime());
      const isSel = selectedTs ? isSameDay(ts, selectedTs) : false;
      const hasMark = markedDates && markedDates.some(m => isSameDay(m, ts));
      let cls = 'cal-d';
      if (isToday) cls += ' today';
      if (isSel) cls += ' sel';
      html += `<div class="${cls}" data-ts="${ts}">
        <span class="cal-dn">${d}</span>
        ${hasMark ? '<div class="cal-dots"><div class="cal-dot"></div></div>' : ''}
      </div>`;
    }
    html += '</div></div>';
    container.innerHTML = html;

    container.querySelector('[data-mini-prev]').onclick = e => {
      e.stopPropagation();
      viewMonth--;
      if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      render();
    };
    container.querySelector('[data-mini-next]').onclick = e => {
      e.stopPropagation();
      viewMonth++;
      if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      render();
    };
    container.querySelectorAll('.cal-d[data-ts]').forEach(el => {
      el.onclick = e => {
        e.stopPropagation();
        const ts = parseInt(el.dataset.ts, 10);
        selectedTs = ts;
        if (typeof onSelect === 'function') onSelect(ts);
        render();
      };
    });
  }
  render();
}
