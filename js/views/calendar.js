const CalendarView = (() => {
  let _mode='month', _vd=new Date(), _sel=null, _showTrash=false, _exp=new Set();
  const _miniCalSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  let _filters = {}; // { folderId: true, courseId: true } — checked = shown

  function render() {
    const el=document.getElementById('view-calendar');
    el.innerHTML=`
      <div class="tabs">
        <div class="tab ${_mode==='month'?'on':''}" onclick="CalendarView.setMode('month')">${t('calendar.month')}</div>
        <div class="tab ${_mode==='ddlList'?'on':''}" onclick="CalendarView.setMode('ddlList')">${t('calendar.ddlList')}</div>
        <div class="tab ${_mode==='agenda'?'on':''}" onclick="CalendarView.setMode('agenda')">${t('calendar.agenda')}</div>
        <div class="tab ${_showTrash?'on':''}" onclick="CalendarView.toggleTrash()" style="margin-left:auto">${t('calendar.trash')}</div>
      </div>
      <div id="cal-c"></div>`;
    _showTrash?rTrash():_mode==='month'?rMonth():_mode==='ddlList'?rDdl():rAgenda();
  }

  function setMode(m){_mode=m;_showTrash=false;render();}
  function toggleTrash(){_showTrash=!_showTrash;render();}

  function initFilters() {
    if(Object.keys(_filters).length>0)return;
    Store.sortedFolders().forEach(f=>{_filters['f_'+f.id]=true;f.courses.forEach(c=>{_filters['c_'+c.id]=true;});});
  }

  function passFilter(item) {
    initFilters();
    if(Object.values(_filters).every(v=>v))return true;
    return _filters['f_'+item.folder.id]&&_filters['c_'+item.course.id];
  }

  function renderFilterPanel() {
    initFilters();
    const folders=Store.sortedFolders();
    const allOn=Object.values(_filters).every(v=>v);
    let h=`<div class="filter-panel" style="margin-bottom:14px">
      <div class="filter-row" onclick="CalendarView.toggleFilterAll()">
        <div class="filter-cb ${allOn?'on':''}">✓</div>
        <span style="font-weight:600">${t('calendar.allFolders')}</span>
      </div>`;
    folders.forEach(f=>{
      const fon=_filters['f_'+f.id];
      h+=`<div class="filter-row" onclick="CalendarView.toggleFilter('f_${f.id}')">
        <div class="filter-cb ${fon?'on':''}">✓</div>
        <span>${escHtml(f.name)}</span>
      </div>`;
      f.courses.forEach(c=>{
        const con=_filters['c_'+c.id];
        h+=`<div class="filter-row sub" onclick="CalendarView.toggleFilter('c_${c.id}')">
          <div class="filter-cb ${con?'on':''}">✓</div>
          <span>${escHtml(c.name)}</span>
        </div>`;
      });
    });
    h+='</div>';
    return h;
  }

  function toggleFilter(key){_filters[key]=!_filters[key];render();}
  function toggleFilterAll(){const allOn=Object.values(_filters).every(v=>v);Object.keys(_filters).forEach(k=>{_filters[k]=!allOn;});render();}

  function rMonth() {
    const yr=_vd.getFullYear(),mo=_vd.getMonth();
    const months=t('calendar.months'),weeks=t('calendar.weeks');
    const all=getAllDdlItems(Store.getState()).filter(passFilter);
    const c=document.getElementById('cal-c');

    const dm={};
    all.forEach(({node,folder,course,path})=>{
      const ddl=node.duration&&(node.duration.ddl||node.duration.end);
      if(!ddl)return;const k=dk(ddl);if(!dm[k])dm[k]=[];dm[k].push({node,folder,course,path,ddl});
    });

    const fd=new Date(yr,mo,1).getDay(),nd=new Date(yr,mo+1,0).getDate(),tk=dk(Date.now());

    let left=`<div class="cal-surface"><div class="cal-nav">
      <button class="hdr-btn" onclick="CalendarView.pm()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button>
      <h3>${months[mo]} ${yr}</h3>
      <button class="hdr-btn" onclick="CalendarView.nm()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></button>
    </div><div class="cal-grid">`;
    weeks.forEach(w=>{left+=`<div class="cal-wk">${w}</div>`;});
    for(let i=0;i<fd;i++)left+=`<div class="cal-d om"></div>`;
    for(let d=1;d<=nd;d++){
      const ts=new Date(yr,mo,d).getTime(),k=dk(ts),items=dm[k]||[];
      let cls='cal-d';if(k===tk)cls+=' today';if(_sel&&dk(_sel)===k)cls+=' sel';
      let dots='';items.slice(0,3).forEach(it=>{
        const dn=it.node.status==='completed'||it.node.status==='graded';
        dots+=`<div class="cal-dot${!dn&&it.ddl<Date.now()?' ov':dn?' dn':''}"></div>`;
      });
      left+=`<div class="${cls}" onclick="CalendarView.sd(${ts})"><span class="cal-dn">${d}</span>${dots?`<div class="cal-dots">${dots}</div>`:''}</div>`;
    }
    left+='</div></div>';

    let right='';
    if(_sel){
      const di=dm[dk(_sel)]||[];
      const lang=document.body.dataset.lang||'zh';
      right+=`<div class="sec-label">${formatDate(_sel,lang)}</div>`;
      if(di.length===0) right+=`<div style="color:var(--t3);font-size:13px;padding:20px 0;text-align:center">${t('calendar.noTasks')}</div>`;
      else di.forEach(it=>{right+=ri(it);});
    } else {
      right=`<div style="color:var(--t3);font-size:13px;padding:40px 0;text-align:center">${t('calendar.noTasks')}</div>`;
    }

    c.innerHTML=`<div class="cal-desk"><div>${left}</div><div class="cal-detail">${right}</div></div>`;
  }

  function sd(ts){_sel=ts;rMonth();}
  function pm(){_vd.setMonth(_vd.getMonth()-1);render();}
  function nm(){_vd.setMonth(_vd.getMonth()+1);render();}

  function rDdl() {
    const c=document.getElementById('cal-c');
    const all=getAllDdlItems(Store.getState());
    const now_=Date.now();
    const ov=[],up=[],dn=[];

    all.forEach(item=>{
      const ddl=item.node.duration&&(item.node.duration.ddl||item.node.duration.end);
      if(!ddl)return;
      const done=item.node.status==='completed'||item.node.status==='graded';
      done?dn.push(item):ddl<now_?ov.push(item):up.push(item);
    });
    up.sort((a,b)=>(a.node.duration.ddl||a.node.duration.end)-(b.node.duration.ddl||b.node.duration.end));
    ov.sort((a,b)=>(b.node.duration.ddl||b.node.duration.end)-(a.node.duration.ddl||a.node.duration.end));

    const fOv=ov.filter(passFilter),fUp=up.filter(passFilter),fDn=dn.filter(passFilter);
    let h=renderFilterPanel();

    if(fOv.length>0){h+=`<div class="sec-label" style="color:var(--err)">${t('calendar.overdue')} (${fOv.length})</div>`;fOv.forEach(i=>{h+=ri(i);});}
    if(fUp.length>0){h+=`<div class="sec-label">${t('calendar.upcoming')} (${fUp.length})</div>`;fUp.forEach(i=>{h+=ri(i);});}
    else if(fOv.length===0) h+=`<div class="empty"><div class="empty-title">${t('calendar.noTasks')}</div></div>`;
    if(fDn.length>0){h+=`<div class="sec-label" style="margin-top:20px">${t('calendar.completed')} (${fDn.length})</div>`;fDn.forEach(i=>{h+=ri(i);});}
    c.innerHTML=h;
  }

  function rAgenda() {
    const c=document.getElementById('cal-c');
    const all=getAllDdlItems(Store.getState()).filter(passFilter);
    const lang=document.body.dataset.lang||'zh';
    const gs={};
    all.forEach(item=>{
      const ddl=item.node.duration&&(item.node.duration.ddl||item.node.duration.end);
      if(!ddl)return;const k=dk(ddl);if(!gs[k])gs[k]={ts:startOfDay(ddl),items:[]};gs[k].items.push(item);
    });
    const keys=Object.keys(gs).sort(),today=startOfDay(Date.now());
    if(keys.length===0){c.innerHTML=`<div class="empty"><div class="empty-title">${t('calendar.noTasks')}</div></div>`;return;}
    let h='';
    keys.forEach(k=>{
      const g=gs[k],isT=g.ts===today,isP=g.ts<today;
      h+=`<div style="margin-bottom:20px"><div class="sec-label" style="${isP?'color:var(--t3)':isT?'color:var(--ac)':''}">${isT?t('calendar.today')+' · ':''}${formatDate(g.ts,lang)}</div>`;
      g.items.forEach(i=>{h+=ri(i);});
      h+='</div>';
    });
    c.innerHTML=h;
  }

  function rTrash() {
    const c=document.getElementById('cal-c'),tr=Store.getState().trash||[],lang=document.body.dataset.lang||'zh';
    let h=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <span class="heading-md">${t('calendar.trash')}</span>
      <button class="btn btn-d" style="font-size:12px" onclick="CalendarView.confirmEmpty()">${t('calendar.emptyTrash')}</button></div>`;
    if(tr.length===0) h+=`<div class="empty"><div class="empty-title">${t('calendar.trashEmpty')}</div></div>`;
    else tr.forEach(e=>{
      h+=`<div class="li" style="opacity:.6"><div class="li-body"><div class="li-title">${escHtml(e.node.name)}</div>
        <div class="li-sub">${formatDate(e.deletedAt,lang)}</div></div>
        <button class="btn btn-s" style="font-size:12px" onclick="CalendarView.restoreT('${e.id}')">↩</button></div>`;
    });
    c.innerHTML=h;
  }

  function ri({node,folder,course,path}) {
    const ddl=node.duration&&(node.duration.ddl||node.duration.end);
    const done=node.status==='completed'||node.status==='graded';
    const urg=ddl?urgencyClass(ddl):'normal';
    const ts=ddl?formatTimeRemaining(ddl):'';
    const exp=_exp.has(node.id);
    const lang=document.body.dataset.lang||'zh';
    // path[0] 是课程根分组（名字等于课程名），去掉它和节点自身，只留中间层级
    const ps=path.slice(1,-1).join(' / ');

    let cls='di';if(done)cls+=' done';else if(urg==='overdue')cls+=' overdue';else if(urg==='urgent')cls+=' urgent';
    let tc='mute';if(done)tc='ok';else if(urg==='overdue')tc='err';else if(urg==='urgent')tc='err';else if(urg==='soon')tc='warn';

    return `<div class="${cls} ${exp?'open':''}">
      <div class="di-hdr" onclick="CalendarView.te('${node.id}')">
        <div class="di-left">
          <div class="di-name">${done?'<span style="text-decoration:line-through;opacity:.5">':''}${escHtml(node.name)}${done?'</span>':''}
            ${node.bonus?`<span class="chip" style="font-size:9px;margin-left:4px">${t('editor.bonusTag')}</span>`:''}
            ${node.percentage?`<span style="font-size:10px;color:var(--t3);margin-left:4px">${node.percentage}%</span>`:''}</div>
          <div class="di-path">${escHtml(folder.name)} / ${escHtml(course.name)}${ps?' / '+escHtml(ps):''}</div>
        </div>
        ${ddl?`<div class="di-time ${tc}">${ts}</div>`:''}
        <span class="di-chv${exp?' on':''}">&rsaquo;</span>
      </div>
      <div class="di-body">
        <div style="font-size:12px;color:var(--t2);margin-bottom:8px">
          ${ddl?formatDateTime(ddl,lang):''}
          ${node.duration&&node.duration.start?` · ${t('calendar.start')}: ${formatDate(node.duration.start,lang)}`:''}
        </div>
        ${node.detail?`<div style="font-size:13px;color:var(--t2);padding:8px;background:var(--srf-a);border-radius:var(--r-xs);margin-bottom:8px">${escHtml(node.detail)}</div>`:''}
        <div class="di-acts">
          ${!done?`<button class="btn btn-p" style="font-size:12px" onclick="CalendarView.markDone('${node.id}','${course.id}')">${t('calendar.markDone')}</button>`:''}
          <button class="btn btn-s" style="font-size:12px" onclick="CalendarView.showPost('${node.id}','${course.id}')">${t('calendar.postpone')}</button>
          <button class="btn btn-s" style="font-size:12px" onclick="CalendarView.showAlt('${node.id}','${course.id}')">${t('calendar.alt')}</button>
          ${done?`<button class="btn btn-g" style="font-size:12px" onclick="CalendarView.restoreS('${node.id}','${course.id}')">↩ ${t('calendar.restore')}</button>`:''}
        </div>
        ${node.altPlan?`<div style="margin-top:8px;padding:8px;background:var(--warn-bg);border-radius:var(--r-xs);font-size:12px;color:var(--warn)">
          ${t('calendar.alt')}: ${escHtml(node.altPlan.note||'')}${node.altPlan.newDdl?' · '+formatDate(node.altPlan.newDdl,lang):''}</div>`:''}
      </div>
    </div>`;
  }

  function te(id){_exp.has(id)?_exp.delete(id):_exp.add(id);render();}
  function markDone(id,cid){Store.updateNode(cid,id,{status:'completed'});render();}
  function restoreS(id,cid){Store.updateNode(cid,id,{status:'in-progress'});render();}

  function openModalMiniCal(wrapId, inpId) {
    const wrap = document.getElementById(wrapId);
    const inp = document.getElementById(inpId);
    if (!wrap || !inp) return;
    const willOpen = wrap.style.display !== 'block';
    ['pp-cal-wrap', 'alt-cal-wrap'].forEach(id => {
      const w = document.getElementById(id);
      if (w && w !== wrap) { w.style.display = 'none'; w.innerHTML = ''; }
    });
    if (!willOpen) { wrap.style.display = 'none'; wrap.innerHTML = ''; return; }
    wrap.style.display = 'block';
    let selTs = Date.now();
    const pr = commitDateFlexible(inp.value, false);
    if (pr.ok && !pr.clear) selTs = pr.ts;
    buildMiniCalendar(wrapId, selTs, ts => {
      inp.value = formatDateDigits(ts);
      wrap.style.display = 'none';
      wrap.innerHTML = '';
    }, null);
  }

  function showPost(id,cid){
    const r=Store.getCourse(cid);if(!r)return;const n=Store.findNode(r.course.rootGroup,id);if(!n)return;
    Modal.open({title:t('calendar.postpone'),
      body:`<div class="fg"><label class="fl">${t('calendar.postponeTo')}</label>
        <div style="display:flex;gap:6px;align-items:center">
          <input type="text" class="fi fi-date" id="pp-d" style="flex:1;min-width:0" maxlength="16" autocomplete="off" placeholder="${t('editor.dateDigits')}" value="${formatDateDigits(n.duration&&(n.duration.ddl||n.duration.end))}">
          <button type="button" class="hdr-btn" style="flex-shrink:0;width:34px;height:34px" title="${t('editor.pickCal')}" onclick="CalendarView.openModalMiniCal('pp-cal-wrap','pp-d')">${_miniCalSvg}</button>
        </div>
        <div id="pp-cal-wrap" class="ed-mini-cal" style="display:none;margin-top:10px"></div></div>`,
      footer:`<button class="btn btn-s" onclick="Modal.close()">${t('common.cancel')}</button><button class="btn btn-p" id="pp-ok">${t('common.confirm')}</button>`});
    document.getElementById('pp-ok').onclick=()=>{
      const dr=commitDateFlexible(document.getElementById('pp-d').value,true);
      if(!dr.ok){Toast.error(t('common.badDate'));return;}
      if(!n.duration)n.duration={};
      if(dr.clear){n.duration.ddl=null;n.duration.end=null;}
      else{n.duration.ddl=dr.ts;n.duration.end=dr.ts;}
      Store.save();Store.notify({type:'node:update',courseId:cid,nodeId:id});
      Modal.close();render();};
  }

  function showAlt(id,cid){
    const r=Store.getCourse(cid);if(!r)return;const n=Store.findNode(r.course.rootGroup,id);if(!n)return;
    Modal.open({title:t('calendar.alt'),
      body:`<div class="fg"><label class="fl">${t('calendar.altNote')}</label><textarea class="fta" id="alt-n">${escHtml(n.altPlan?n.altPlan.note||'':'')}</textarea></div>
        <div class="fg"><label class="fl">${t('calendar.postponeTo')}</label>
        <div style="display:flex;gap:6px;align-items:center">
          <input type="text" class="fi fi-date" id="alt-d" style="flex:1;min-width:0" maxlength="16" autocomplete="off" placeholder="${t('editor.dateDigits')}" value="${formatDateDigits(n.altPlan&&n.altPlan.newDdl)}">
          <button type="button" class="hdr-btn" style="flex-shrink:0;width:34px;height:34px" title="${t('editor.pickCal')}" onclick="CalendarView.openModalMiniCal('alt-cal-wrap','alt-d')">${_miniCalSvg}</button>
        </div>
        <div id="alt-cal-wrap" class="ed-mini-cal" style="display:none;margin-top:10px"></div></div>`,
      footer:`<button class="btn btn-s" onclick="Modal.close()">${t('common.cancel')}</button>
        ${n.altPlan?`<button class="btn btn-g" onclick="CalendarView.clrAlt('${id}','${cid}')">✕</button>`:''}
        <button class="btn btn-p" id="alt-ok">${t('common.save')}</button>`});
    document.getElementById('alt-ok').onclick=()=>{
      const dr=commitDateFlexible(document.getElementById('alt-d').value,true);
      if(!dr.ok){Toast.error(t('common.badDate'));return;}
      let newDdl=null;
      if(!dr.clear)newDdl=dr.ts;
      Store.updateNode(cid,id,{altPlan:{note:document.getElementById('alt-n').value.trim(),newDdl}});
      Modal.close();render();};
  }

  function clrAlt(id,cid){Store.updateNode(cid,id,{altPlan:null});Modal.close();render();}
  function restoreT(tid){
    const ok=Store.restoreFromTrash(tid);
    if(ok){Toast.success(t('calendar.restore'));render();}
    else{Toast.error(t('calendar.restoreFail'));rTrash();}
  }
  function confirmEmpty(){Modal.confirm({title:t('calendar.emptyTrash'),text:t('calendar.emptyConfirm'),danger:true,onConfirm(){Store.emptyTrash();rTrash();}});}

  function dk(ts){const d=new Date(ts);return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;}

  return {render,setMode,toggleTrash,pm,nm,sd,te,markDone,restoreS,showPost,showAlt,clrAlt,restoreT,confirmEmpty,toggleFilter,toggleFilterAll,openModalMiniCal};
})();
