const EditorView = (() => {
  let _cid = null, _fid = null, _plan = false, _po = {}, _vm = 'pct', _open = new Set();

  const _calSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';

  // 课程/分组总分文案：百分比视图显示 "80.5%"，原始分视图显示 "80.5 / 100"
  function fmtScore(sc) {
    if (sc === null) return t('editor.noScore');
    return _vm === 'raw' ? sc.toFixed(1) + ' / 100' : sc.toFixed(1) + '%';
  }
  // 单个项的分数文案：原始分视图下显示用户填的「得分/满分」，否则显示百分比
  function fmtNodeScore(node, sc) {
    if (sc === null) return '';
    if (_vm === 'raw' && node.type === 'item') {
      const ov = (_plan && _po[node.id]) ? _po[node.id] : {};
      const cv = ov.scoreCurr != null ? ov.scoreCurr : node.scoreCurr;
      const o2 = ov.scoreOutOf != null ? ov.scoreOutOf : node.scoreOutOf;
      if (cv != null && o2 != null) return `${cv} / ${o2}`;
    }
    return sc.toFixed(1) + '%';
  }

  function render(cid, fid) {
    if (cid) _cid = cid; if (fid) _fid = fid;
    const r = Store.getCourse(_cid);
    if (!r) { App.navigate('folders'); return; }
    const { folder, course } = r;
    const root = course.rootGroup;
    _open.add(root.id);

    const sc = calcNodeScore(root, _plan ? _po : {});
    const ss = fmtScore(sc);
    const el = document.getElementById('view-editor');

    el.innerHTML = `
      <div class="bc">
        <span onclick="App.navigate('folders')">${t('folders.title')}</span><span class="sep">/</span>
        <span onclick="App.navigate('courses',{folderId:'${_fid}'})">${escHtml(folder.name)}</span><span class="sep">/</span>
        <span class="cur">${escHtml(course.name)}</span>
      </div>
      <div class="card" style="padding:16px 18px;margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div>
            <div class="label" style="margin-bottom:4px">${_plan ? t('editor.plan') : t('editor.courseScore')}</div>
            <div class="score"><span class="score-n" style="color:${scoreColor(sc)}">${ss}</span>
            ${sc!==null?`<span class="score-u">/ 100%</span>`:''}</div>
            ${sc!==null?`<div class="pbar" style="margin-top:6px;width:180px"><div class="pfill ${pctBarClass(sc)}" style="width:${Math.min(sc,100)}%"></div></div>`:''}
            ${_plan?`<div style="font-size:11px;color:var(--t3);margin-top:4px">${t('editor.planNote')}</div>`:''}
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-s" style="font-size:12px" onclick="EditorView.toggleVm()">${_vm==='pct'?t('editor.viewRaw'):t('editor.viewPct')}</button>
            <button class="btn ${_plan?'btn-p':'btn-s'}" style="font-size:12px" onclick="EditorView.togglePlan()">${_plan?t('editor.exitPlan'):t('editor.plan')}</button>
          </div>
        </div>
      </div>
      <div class="ed-root" id="ed-tree">${rn(root,true)}</div>`;
  }

  function rn(node, isRoot) {
    const op = _open.has(node.id);
    const sc = calcNodeScore(node, _plan?_po:{});
    const ss = fmtNodeScore(node, sc);

    let icoClass = node.type==='group'?'grp':'itm';
    if (node.bonus) icoClass='bonus';
    if (node.status==='completed'||node.status==='graded') icoClass='done';
    const icoLetter = node.type==='group'?'G':'I';

    let planField = '';
    if (_plan && node.type==='item') {
      const ov = _po[node.id]||{};
      const cv = ov.scoreCurr!=null?ov.scoreCurr:(node.scoreCurr!=null?node.scoreCurr:'');
      const ov2 = ov.scoreOutOf!=null?ov.scoreOutOf:(node.scoreOutOf!=null?node.scoreOutOf:'');
      planField = `<div class="sc-in" style="flex-shrink:0" onclick="event.stopPropagation()">
        <input type="number" min="0" step="0.1" value="${cv}" placeholder="—" style="width:46px"
          oninput="EditorView.setPlan('${node.id}','curr',this.value)">
        <span class="div">/</span>
        <input type="number" min="0" step="0.1" value="${ov2}" placeholder="—" style="width:46px"
          oninput="EditorView.setPlan('${node.id}','outof',this.value)">
      </div>`;
    }

    const pctD = !isRoot ? (node.bonus
      ? `<span class="chip" style="font-size:10px">+${node.percentage}%</span>`
      : `<span class="tn-pct">${node.percentage}%</span>`) : '';
    const scD = ss ? `<span class="tn-score" style="color:${scoreColor(sc)}">${ss}</span>` : '';

    let kids = '';
    if (node.type==='group' && op) {
      const di = getDividedDropInfo(node,_plan?_po:{});
      let ch = '';
      (node.children||[]).forEach(c => {
        const drop = di.droppedIds&&di.droppedIds.has(c.id);
        ch += `<div style="${drop?'opacity:.4':''}">`;
        if (drop) ch += `<div style="font-size:10px;color:var(--t3);font-weight:600;margin-bottom:2px">${t('editor.dropped')}</div>`;
        ch += rn(c,false) + '</div>';
      });
      kids = `<div class="tn-kids">${ch}</div>`;
      kids += `<div style="display:flex;gap:6px;margin-top:8px;margin-left:12px" onclick="event.stopPropagation()">
        <button class="btn btn-s" style="font-size:12px;padding:5px 12px" onclick="EditorView.add('${node.id}','item')">+ ${t('editor.addItem')}</button>
        <button class="btn btn-s" style="font-size:12px;padding:5px 12px" onclick="EditorView.add('${node.id}','group')">+ ${t('editor.addGroup')}</button>
      </div>`;
    }

    const body = op ? rb(node,isRoot) : '';

    return `<div class="tn ${op?'open':''} ${_plan?'plan':''}" data-nid="${node.id}">
      <div class="tn-hdr" ${isRoot?'style="background:var(--ac-bg)"':''} onclick="EditorView.tog('${node.id}')">
        <span class="tn-tog">▶</span>
        <span class="tn-ico ${icoClass}">${icoLetter}</span>
        <span class="tn-name">${escHtml(node.name)}</span>
        ${pctD} ${scD} ${planField}
        <div class="tn-acts" onclick="event.stopPropagation()">
          <button class="btn-icon" style="font-size:12px" onclick="EditorView.nmenu(event,'${node.id}','${isRoot}')">···</button>
        </div>
      </div>
      <div class="tn-body">${body}${kids}</div>
    </div>`;
  }

  function rb(node, isRoot) {
    let h = '<div class="flds">';
    if (!isRoot && !node.bonus) {
      h += `<div class="fld"><span class="fld-l">${t('editor.pct')}</span><div class="fld-v" onclick="event.stopPropagation()">
        <input type="number" class="il" min="0" max="100" step="0.1" value="${node.percentage??''}" style="width:64px"
          onchange="EditorView.uf('${node.id}','percentage',this.value)"> <span style="color:var(--t3)">%</span></div></div>`;
    }
    if (!isRoot) {
      h += `<div class="fld"><span class="fld-l">${t('editor.bonus')}</span><div class="fld-v" onclick="event.stopPropagation()">
        <label class="tgl"><input type="checkbox" ${node.bonus?'checked':''} onchange="EditorView.uf('${node.id}','bonus',this.checked)"><div class="tgl-t"></div></label></div></div>`;
    }
    if (node.type==='group' && !isRoot) {
      h += `<div class="fld"><span class="fld-l">${t('editor.type')}</span><div class="fld-v" onclick="event.stopPropagation()">
        <select class="fsel" style="width:auto;padding:4px 8px" onchange="EditorView.uf('${node.id}','groupType',this.value)">
          <option value="custom" ${node.groupType==='custom'?'selected':''}>${t('editor.grpCustom')}</option>
          <option value="divided" ${node.groupType==='divided'?'selected':''}>${t('editor.grpDivided')}</option>
        </select></div></div>`;
    }
    if (node.type==='group' && node.groupType==='divided') {
      const cc=(node.children||[]).filter(c=>!c.bonus).length;
      h += `<div class="fld"><span class="fld-l">${t('editor.drop')}</span><div class="fld-v" onclick="event.stopPropagation()">
        <input type="number" class="il" min="0" max="${Math.max(0,cc-1)}" value="${node.itemDrop||0}" style="width:46px"
          onchange="EditorView.uf('${node.id}','itemDrop',parseInt(this.value)||0)">
        <span style="color:var(--t3);font-size:11px;margin-left:4px">/ ${cc} ${t('editor.total')}</span></div></div>`;
    }
    if (node.type==='item') {
      const cv=node.scoreCurr!=null?node.scoreCurr:'', ov=node.scoreOutOf!=null?node.scoreOutOf:'';
      h += `<div class="fld"><span class="fld-l">${t('editor.score')}</span><div class="fld-v" onclick="event.stopPropagation()">
        <div class="sc-in">
          <input type="number" min="0" step="0.1" value="${cv}" placeholder="—"
            onchange="EditorView.uf('${node.id}','scoreCurr',this.value===''?null:parseFloat(this.value))">
          <span class="div">/</span>
          <input type="number" min="0" step="0.1" value="${ov}" placeholder="—"
            onchange="EditorView.uf('${node.id}','scoreOutOf',this.value===''?null:parseFloat(this.value))">
        </div></div></div>`;
      const sts = ['not-started','in-progress','completed','graded'];
      const stl = [t('editor.sNotStarted'),t('editor.sInProgress'),t('editor.sCompleted'),t('editor.sGraded')];
      h += `<div class="fld"><span class="fld-l">${t('editor.status')}</span><div class="fld-v" onclick="event.stopPropagation()">
        <select class="fsel" style="width:auto;padding:4px 8px" onchange="EditorView.uf('${node.id}','status',this.value)">
          ${sts.map((s,i)=>`<option value="${s}" ${node.status===s?'selected':''}>${stl[i]}</option>`).join('')}
        </select></div></div>`;
    }
    const d=node.duration||{};
    const dl=d.ddl||d.end;
    h += `<div class="fld" style="flex-direction:column;align-items:flex-start;gap:6px">
      <span class="fld-l">${t('editor.duration')}</span>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%" onclick="event.stopPropagation()">
        <div>
          <div style="font-size:10px;color:var(--t3);font-weight:600;margin-bottom:3px">${t('editor.from')}</div>
          <div style="display:flex;gap:4px;align-items:center">
            <input type="text" class="fi fi-date" id="ed-inp-${node.id}-start" style="padding:5px 8px;font-size:12px;flex:1;min-width:0" maxlength="16" autocomplete="off" placeholder="${t('editor.dateDigits')}" value="${formatDateDigits(d.start)}"
              onblur="EditorView.dateBlurKind('${node.id}','start',this)">
            <button type="button" class="hdr-btn" style="flex-shrink:0;width:32px;height:32px" title="${t('editor.pickCal')}" onclick="event.stopPropagation();EditorView.toggleMiniCal('${node.id}','start')">${_calSvg}</button>
          </div>
          <div id="ed-cal-${node.id}-start" class="ed-mini-cal" style="display:none"></div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--err);font-weight:600;margin-bottom:3px">${t('editor.ddl')}</div>
          <div style="display:flex;gap:4px;align-items:center">
            <input type="text" class="fi fi-date" id="ed-inp-${node.id}-deadline" style="padding:5px 8px;font-size:12px;flex:1;min-width:0;border-color:var(--err)" maxlength="16" autocomplete="off" placeholder="${t('editor.dateDigits')}" value="${formatDateDigits(dl)}"
              onblur="EditorView.dateBlurKind('${node.id}','deadline',this)">
            <button type="button" class="hdr-btn" style="flex-shrink:0;width:32px;height:32px" title="${t('editor.pickCal')}" onclick="event.stopPropagation();EditorView.toggleMiniCal('${node.id}','deadline')">${_calSvg}</button>
          </div>
          <div id="ed-cal-${node.id}-deadline" class="ed-mini-cal" style="display:none"></div>
        </div>
      </div>
      <details class="dur-prep" ${d.prepareStart?'open':''} onclick="event.stopPropagation()">
        <summary>${t('editor.prepareOptional')}</summary>
        <div class="dur-prep-in">
          <div style="font-size:10px;color:var(--t3);font-weight:600;margin-bottom:3px">${t('editor.prepare')}</div>
          <div style="display:flex;align-items:flex-start;gap:8px;flex-wrap:wrap">
            <div style="flex:1;min-width:140px;max-width:100%">
              <div style="display:flex;gap:4px;align-items:center">
                <input type="text" class="fi fi-date" id="ed-inp-${node.id}-prepare" style="padding:5px 8px;font-size:12px;flex:1;min-width:0" maxlength="16" autocomplete="off" placeholder="${t('editor.dateDigits')}" value="${formatDateDigits(d.prepareStart)}"
                  onblur="EditorView.dateBlurKind('${node.id}','prepare',this)">
                <button type="button" class="hdr-btn" style="flex-shrink:0;width:32px;height:32px" title="${t('editor.pickCal')}" onclick="event.stopPropagation();EditorView.toggleMiniCal('${node.id}','prepare')">${_calSvg}</button>
              </div>
              <div id="ed-cal-${node.id}-prepare" class="ed-mini-cal" style="display:none"></div>
            </div>
            ${d.prepareStart?`<button type="button" class="btn btn-s" style="font-size:11px;padding:5px 12px;align-self:center" onclick="event.stopPropagation();EditorView.clrPrep('${node.id}')">${t('editor.prepareRemove')}</button>`:''}
          </div>
        </div>
      </details></div>`;
    h += `<div class="fld" style="flex-direction:column;align-items:flex-start" onclick="event.stopPropagation()">
      <span class="fld-l">${t('editor.detail')}</span>
      <textarea class="fta" style="margin-top:4px;width:100%;min-height:50px" placeholder="${t('editor.detail')}..."
        onchange="EditorView.uf('${node.id}','detail',this.value)">${escHtml(node.detail||'')}</textarea></div>`;
    const ms=node.milestones||[];
    h += `<div class="fld" style="flex-direction:column;align-items:flex-start" onclick="event.stopPropagation()">
      <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
        <span class="fld-l">${t('editor.milestone')}</span>
        <button class="btn btn-s" style="font-size:11px;padding:3px 10px" onclick="EditorView.addMs('${node.id}')">+ ${t('editor.addMs')}</button>
      </div>
      ${ms.map(m=>`<div style="display:flex;align-items:flex-start;gap:6px;margin-top:6px;width:100%;flex-wrap:wrap">
        <div style="flex:0 0 auto;min-width:120px">
          <div style="display:flex;gap:4px;align-items:center">
            <input type="text" class="fi fi-date" id="ed-inp-${node.id}-ms-${m.id}" style="padding:4px 6px;font-size:12px;flex:1;min-width:0" maxlength="16" autocomplete="off" placeholder="${t('editor.dateDigits')}" value="${formatDateDigits(m.ts)}"
              onblur="EditorView.msDateBlur('${node.id}','${m.id}',this)">
            <button type="button" class="hdr-btn" style="flex-shrink:0;width:30px;height:30px" title="${t('editor.pickCal')}" onclick="event.stopPropagation();EditorView.toggleMiniCal('${node.id}','ms','${m.id}')">${_calSvg}</button>
          </div>
          <div id="ed-cal-${node.id}-ms-${m.id}" class="ed-mini-cal" style="display:none"></div>
        </div>
        <input type="text" class="fi" style="padding:4px 6px;font-size:12px;flex:1;min-width:100px" value="${escHtml(m.name)}" placeholder="${t('editor.milestone')}"
          oninput="EditorView.updMs('${node.id}','${m.id}','name',this.value)">
        <button class="btn-icon" style="color:var(--err);font-size:13px;flex-shrink:0" onclick="EditorView.delMs('${node.id}','${m.id}')">✕</button>
      </div>`).join('')}</div>`;
    h += '</div>';
    return h;
  }

  function tog(id) { _open.has(id)?_open.delete(id):_open.add(id); render(); }
  function uf(id,f,v) { Store.updateNode(_cid,id,{[f]:v}); rsc(); }
  function dateBlurKind(id, kind, el) {
    const r = Store.getCourse(_cid); if (!r) return;
    const n = Store.findNode(r.course.rootGroup, id); if (!n) return;
    if (!n.duration) n.duration = {};
    let prev = null;
    if (kind === 'start') prev = n.duration.start;
    else if (kind === 'deadline') prev = n.duration.ddl != null ? n.duration.ddl : n.duration.end;
    else if (kind === 'prepare') prev = n.duration.prepareStart;
    const res = commitDateFlexible(el.value, kind === 'deadline');
    if (!res.ok) { el.value = formatDateDigits(prev); return; }
    if (res.clear) {
      if (kind === 'start') n.duration.start = null;
      else if (kind === 'deadline') { n.duration.ddl = null; n.duration.end = null; }
      else if (kind === 'prepare') n.duration.prepareStart = null;
      el.value = '';
    } else {
      if (kind === 'start') n.duration.start = res.ts;
      else if (kind === 'deadline') { n.duration.ddl = res.ts; n.duration.end = res.ts; }
      else if (kind === 'prepare') n.duration.prepareStart = res.ts;
      el.value = formatDateDigits(res.ts);
    }
    Store.save(); Store.notify({ type: 'node:update', courseId: _cid, nodeId: id });
    if (kind === 'prepare') render();
  }
  function msDateBlur(nid, mid, el) {
    const r = Store.getCourse(_cid); if (!r) return;
    const n = Store.findNode(r.course.rootGroup, nid); if (!n || !n.milestones) return;
    const m = n.milestones.find(x => x.id === mid); if (!m) return;
    const res = commitDateFlexible(el.value, false);
    if (!res.ok) { el.value = formatDateDigits(m.ts); return; }
    m.ts = res.clear ? null : res.ts;
    el.value = res.clear ? '' : formatDateDigits(m.ts);
    Store.save();
  }
  function clrPrep(id) {
    const r=Store.getCourse(_cid); if(!r)return;
    const n=Store.findNode(r.course.rootGroup,id); if(!n)return;
    if(!n.duration) n.duration={};
    n.duration.prepareStart=null;
    Store.save(); Store.notify({type:'node:update',courseId:_cid,nodeId:id});
    render();
  }
  function rsc() {
    const r=Store.getCourse(_cid); if(!r)return;
    const sc=calcNodeScore(r.course.rootGroup,_plan?_po:{});
    const ss=fmtScore(sc);
    const el=document.querySelector('#view-editor .score-n');
    if(el){el.textContent=ss;el.style.color=scoreColor(sc);}
    const pf=document.querySelector('#view-editor .pfill');
    if(pf&&sc!==null)pf.style.width=Math.min(sc,100)+'%';
  }
  function add(pid,type) { const n=Store.addNode(_cid,pid,type); if(n){_open.add(pid);_open.add(n.id);render();} }
  function nmenu(e,id,isRoot) {
    e.stopPropagation();
    const r=Store.getCourse(_cid); if(!r)return;
    const n=Store.findNode(r.course.rootGroup,id); if(!n)return;
    const items=[
      {icon:'✎',label:t('editor.rename'),action(){Modal.prompt({title:t('editor.rename'),value:n.name,onConfirm(v){Store.renameNode(_cid,id,v);render();}});}},
      {icon:'⧉',label:t('editor.copy'),action(){Store.copyNode(_cid,id);render();}},
      {icon:'↑',label:t('editor.up'),action(){Store.moveNodeUp(_cid,id);render();}},
      {icon:'↓',label:t('editor.down'),action(){Store.moveNodeDown(_cid,id);render();}},
    ];
    if(isRoot!=='true'){items.push('divider');items.push({icon:'✕',label:t('editor.del'),danger:true,action(){
      Modal.confirm({title:t('common.delete'),text:`${t('editor.del')} "${n.name}"?`,danger:true,
        onConfirm(){Store.trashItem(id,_cid);_open.delete(id);render();Toast.success(t('editor.del'));}});}});}
    CtxMenu.show(e.clientX,e.clientY,items);
  }
  function togglePlan() { _plan=!_plan; if(!_plan)_po={}; render(); }
  function setPlan(id,f,v) {
    if(!_po[id])_po[id]={};
    const num=v===''?null:parseFloat(v);
    f==='curr'?(_po[id].scoreCurr=num):(_po[id].scoreOutOf=num); rsc();
  }
  function toggleMiniCal(nodeId, kind, msId) {
    const suf = kind === 'ms' ? `ms-${msId}` : kind;
    const wrap = document.getElementById(`ed-cal-${nodeId}-${suf}`);
    const inp = document.getElementById(`ed-inp-${nodeId}-${suf}`);
    if (!wrap || !inp) return;
    const willOpen = wrap.style.display !== 'block';
    document.querySelectorAll('#view-editor .ed-mini-cal').forEach(w => {
      if (w !== wrap) { w.style.display = 'none'; w.innerHTML = ''; }
    });
    if (!willOpen) {
      wrap.style.display = 'none';
      wrap.innerHTML = '';
      return;
    }
    wrap.style.display = 'block';
    let selTs = Date.now();
    const pr = commitDateFlexible(inp.value, false);
    if (pr.ok && !pr.clear) selTs = pr.ts;
    buildMiniCalendar(wrap.id, selTs, ts => {
      inp.value = formatDateDigits(ts);
      wrap.style.display = 'none';
      wrap.innerHTML = '';
      if (kind === 'ms') msDateBlur(nodeId, msId, inp);
      else dateBlurKind(nodeId, kind, inp);
    }, null);
  }

  function toggleVm() { _vm=_vm==='pct'?'raw':'pct'; render(); }
  function addMs(id) { const r=Store.getCourse(_cid);if(!r)return;const n=Store.findNode(r.course.rootGroup,id);if(!n)return;if(!n.milestones)n.milestones=[];n.milestones.push({id:uuid(),name:'',ts:null});Store.save();render(); }
  function updMs(nid,mid,f,v) { const r=Store.getCourse(_cid);if(!r)return;const n=Store.findNode(r.course.rootGroup,nid);if(!n||!n.milestones)return;const m=n.milestones.find(x=>x.id===mid);if(!m)return;f==='ts'?(m.ts=v?parseDateInput(v):null):(m[f]=v);Store.save(); }
  function delMs(nid,mid) { const r=Store.getCourse(_cid);if(!r)return;const n=Store.findNode(r.course.rootGroup,nid);if(!n)return;n.milestones=(n.milestones||[]).filter(m=>m.id!==mid);Store.save();render(); }

  return { render,tog,uf,dateBlurKind,msDateBlur,clrPrep,add,nmenu,togglePlan,setPlan,toggleVm,toggleMiniCal,addMs,updMs,delMs,getCourseId(){return _cid;} };
})();
