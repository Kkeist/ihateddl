const ToolsView = (() => {
  let _tm='focus',_tr=false,_ti=null,_rem=25*60,_tot=25*60,_sc=0;
  let _fm=25,_sb=5,_lb=15;
  let _pcid=null,_pt=90,_po={};
  let _pOpen=new Set();

  function render() {
    const el=document.getElementById('view-tools');
    el.innerHTML=`<div class="tools-lay">${rTimer()}${rPlanner()}</div>`;
  }

  function rTimer() {
    const pct=(_tot-_rem)/_tot,r=74,circ=2*Math.PI*r,off=circ*(1-pct);
    const mi=Math.floor(_rem/60),se=_rem%60;
    const ts=`${String(mi).padStart(2,'0')}:${String(se).padStart(2,'0')}`;
    const colors={focus:'var(--ac)',shortBreak:'var(--ok)',longBreak:'var(--info)'};
    const labels={focus:t('tools.timer.focus'),shortBreak:t('tools.timer.short'),longBreak:t('tools.timer.long')};

    return `<div class="card" style="padding:20px">
      <div class="heading-md" style="margin-bottom:16px">${t('tools.timer.title')}</div>
      <div class="tabs" style="margin-bottom:20px">
        <div class="tab ${_tm==='focus'?'on':''}" onclick="ToolsView.stm('focus')">${t('tools.timer.focus')}</div>
        <div class="tab ${_tm==='shortBreak'?'on':''}" onclick="ToolsView.stm('shortBreak')">${t('tools.timer.short')}</div>
        <div class="tab ${_tm==='longBreak'?'on':''}" onclick="ToolsView.stm('longBreak')">${t('tools.timer.long')}</div>
      </div>
      <div class="tmr">
        <div class="tmr-circle">
          <svg class="tmr-svg" viewBox="0 0 200 200">
            <circle class="tmr-trk" cx="100" cy="100" r="${r}"/>
            <circle class="tmr-prg" id="tmr-p" cx="100" cy="100" r="${r}" stroke="${colors[_tm]}" stroke-dasharray="${circ}" stroke-dashoffset="${off}"/>
          </svg>
          <div class="tmr-txt"><span class="tmr-time" id="tmr-t">${ts}</span><span class="tmr-lbl">${labels[_tm]}</span></div>
        </div>
        <div class="tmr-ctrl">
          <button class="btn btn-s btn-icon" style="width:40px;height:40px" onclick="ToolsView.rst()">↺</button>
          <button class="btn btn-p" style="min-width:90px" onclick="ToolsView.tgl()" id="tmr-btn">${_tr?t('tools.timer.pause'):t('tools.timer.start')}</button>
        </div>
        <div style="margin-top:12px;font-size:12px;color:var(--t3);font-weight:600">${_sc} ${t('tools.timer.sessions')}</div>
      </div>
      <div class="divider"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:12px">
        <div><div class="fl">${t('tools.timer.focusMin')}</div><input type="number" class="fi" min="1" max="120" value="${_fm}" onchange="ToolsView.ud('f',this.value)"></div>
        <div><div class="fl">${t('tools.timer.breakMin')}</div><input type="number" class="fi" min="1" max="60" value="${_sb}" onchange="ToolsView.ud('s',this.value)"></div>
        <div><div class="fl">${t('tools.timer.long')}</div><input type="number" class="fi" min="1" max="120" value="${_lb}" onchange="ToolsView.ud('l',this.value)"></div>
      </div>
    </div>`;
  }

  function stm(m){if(_tr)return;_tm=m;const v=m==='focus'?_fm:m==='shortBreak'?_sb:_lb;_tot=v*60;_rem=_tot;render();}
  function tgl(){if(_tr){clearInterval(_ti);_tr=false;}else{_tr=true;_ti=setInterval(tick,1000);}const b=document.getElementById('tmr-btn');if(b)b.textContent=_tr?t('tools.timer.pause'):t('tools.timer.start');}
  function tick(){
    if(_rem<=0){clearInterval(_ti);_tr=false;if(_tm==='focus'){_sc++;stm(_sc%4===0?'longBreak':'shortBreak');}else stm('focus');return;}
    _rem--;const mi=Math.floor(_rem/60),se=_rem%60;const s=`${String(mi).padStart(2,'0')}:${String(se).padStart(2,'0')}`;
    const el=document.getElementById('tmr-t');if(el)el.textContent=s;
    const r=74,circ=2*Math.PI*r,pct=(_tot-_rem)/_tot;
    const p=document.getElementById('tmr-p');if(p)p.style.strokeDashoffset=circ*(1-pct);
    document.title=`${s} · iHateDDL`;
  }
  function rst(){clearInterval(_ti);_tr=false;const v=_tm==='focus'?_fm:_tm==='shortBreak'?_sb:_lb;_tot=v*60;_rem=_tot;render();document.title='iHateDDL';}
  function ud(t,v){const n=Math.max(1,parseInt(v)||1);if(t==='f')_fm=n;else if(t==='s')_sb=n;else _lb=n;if(!_tr)stm(_tm);}

  function rPlanner() {
    const folders=Store.sortedFolders();let ac=[];
    folders.forEach(f=>f.courses.forEach(c=>ac.push({course:c,folder:f})));
    let sel=null;if(_pcid){const r=Store.getCourse(_pcid);if(r)sel=r.course;}

    let b=`<div class="fg"><label class="fl">${t('tools.plan.course')}</label>
      <select class="fsel" onchange="ToolsView.spc(this.value)"><option value="">— ${t('tools.plan.course')} —</option>
        ${ac.map(({course:c,folder:f})=>`<option value="${c.id}" ${c.id===_pcid?'selected':''}>${escHtml(f.name)} / ${escHtml(c.name)}</option>`).join('')}
      </select></div>`;

    if(sel){
      const root=sel.rootGroup, children=root.children||[];
      const totalScore=calcNodeScore(root,_po);

      b+=`<div class="plan-tbl"><div class="plan-r plan-th">
        <span class="plan-c1">${t('tools.plan.component')}</span>
        <span class="plan-c2">${t('tools.plan.weight')}</span>
        <span class="plan-c3">${t('tools.plan.score')}</span>
        <span class="plan-c4">${t('tools.plan.contrib')}</span></div>`;
      children.forEach(c=>{ b+=rPNode(c,0); });
      b+=`<div class="plan-r plan-tot">
        <span class="plan-c1">${t('tools.plan.total')}</span>
        <span class="plan-c2"></span><span class="plan-c3"></span>
        <span class="plan-c4" style="color:${scoreColor(totalScore)}">${totalScore!==null?totalScore.toFixed(1)+'%':'—'}</span>
      </div></div>`;

      const need=totalScore!==null?_pt-totalScore:null;
      b+=`<div style="margin-top:16px"><div class="fg"><label class="fl">${t('tools.plan.target')}</label>
        <div style="display:flex;align-items:center;gap:10px">
          <input type="range" min="50" max="100" step="1" value="${_pt}" style="flex:1" oninput="ToolsView.spt(this.value)">
          <span style="font-size:16px;font-weight:800;color:var(--ac);min-width:44px;text-align:right">${_pt}%</span>
        </div></div>
        ${need!==null?`<div style="padding:10px;background:${need<=0?'var(--ok-bg)':'var(--warn-bg)'};border-radius:var(--r-xs);text-align:center;font-size:13px;font-weight:600;color:${need<=0?'var(--ok)':'var(--warn)'}">
          ${need<=0?'✓ '+t('tools.plan.reached'):t('tools.plan.need')+' +'+need.toFixed(1)+'%'}
        </div>`:''}</div>`;
    }
    return `<div class="card" style="padding:20px"><div class="heading-md" style="margin-bottom:16px">${t('tools.plan.title')}</div>${b}</div>`;
  }

  function rPNode(node,depth){
    const sc=calcNodeScore(node,_po),pct=node.percentage||0;
    const contrib=sc!==null?(sc*pct/100):null;
    const isGrp=node.type==='group',isOpen=_pOpen.has(node.id);
    const pad=12+depth*20;
    let scoreStr='';
    if(node.type==='item'){
      const po=_po[node.id]||{};
      const curr=po.scoreCurr!=null?po.scoreCurr:node.scoreCurr;
      const outof=po.scoreOutOf!=null?po.scoreOutOf:node.scoreOutOf;
      if(curr!=null&&outof!=null&&outof>0) scoreStr=`${curr}/${outof}`;
      else scoreStr=`<span onclick="event.stopPropagation()" style="display:inline-flex;gap:2px;align-items:center"><input type="number" min="0" step="0.1" class="fi" style="width:34px;padding:2px;font-size:10px;text-align:center" placeholder="?" value="${curr!=null?curr:''}" oninput="ToolsView.spo2('${node.id}','curr',this.value)"><span style="font-size:9px;color:var(--t3)">/</span><input type="number" min="0" step="0.1" class="fi" style="width:34px;padding:2px;font-size:10px;text-align:center" placeholder="?" value="${outof!=null?outof:''}" oninput="ToolsView.spo2('${node.id}','outof',this.value)"></span>`;
    } else scoreStr=sc!==null?sc.toFixed(1)+'%':'—';
    const arrow=isGrp?`<span style="display:inline-block;width:10px;font-size:9px;color:var(--t3)">${isOpen?'▾':'▸'}</span>`:'<span style="display:inline-block;width:10px;font-size:8px;color:var(--bd);text-align:center">·</span>';
    const bonus=node.bonus?' <span class="chip" style="font-size:8px;padding:1px 5px">+</span>':'';
    const cColor=sc!==null?scoreColor(sc):'var(--t3)';
    let h=`<div class="plan-r${isGrp?' plan-grp':' plan-itm'}${node.bonus?' plan-bonus':''}" style="padding-left:${pad}px" ${isGrp?`onclick="ToolsView.ptog('${node.id}')"`:''}>
      <span class="plan-c1">${arrow} ${escHtml(node.name)}${bonus}</span>
      <span class="plan-c2">${pct}%</span><span class="plan-c3">${scoreStr}</span>
      <span class="plan-c4" style="color:${cColor}">${contrib!==null?contrib.toFixed(1)+'%':'—'}</span></div>`;
    if(isGrp&&isOpen&&node.children){
      const di=getDividedDropInfo(node,_po);
      node.children.forEach(c=>{
        const dr=di.droppedIds&&di.droppedIds.has(c.id);
        h+=dr?`<div class="plan-r plan-itm" style="padding-left:${12+(depth+1)*20}px;opacity:.35;text-decoration:line-through"><span class="plan-c1"><span style="display:inline-block;width:10px;font-size:8px;color:var(--bd)">·</span> ${escHtml(c.name)}</span><span class="plan-c2">${c.percentage||0}%</span><span class="plan-c3">—</span><span class="plan-c4">—</span></div>`:rPNode(c,depth+1);
      });
    }
    return h;
  }

  function spc(id){_pcid=id||null;_po={};_pOpen=new Set();render();}
  function spt(v){_pt=parseInt(v)||90;render();}
  function ptog(id){_pOpen.has(id)?_pOpen.delete(id):_pOpen.add(id);render();}
  function spo2(id,f,v){if(!_po[id])_po[id]={};const n=v===''?null:parseFloat(v);f==='curr'?(_po[id].scoreCurr=n):(_po[id].scoreOutOf=n);render();}

  return {render,stm,tgl,rst,ud,spc,spt,ptog,spo2};
})();
