const SettingsView = (() => {
  function render() {
    const el=document.getElementById('view-settings');
    const s=Store.getSettings(),lang=s.language||'zh',theme=s.theme||'light';
    const themes=[
      {id:'light',l:t('settings.themes.light'),c1:'#f5ede0',c2:'#d4724e'},
      {id:'dark',l:t('settings.themes.dark'),c1:'#0c0e14',c2:'#f0a070'},
      {id:'purple',l:t('settings.themes.purple'),c1:'#ebe4f2',c2:'#7d5dae'},
      {id:'ocean',l:t('settings.themes.ocean'),c1:'#ddeef4',c2:'#2d8fa8'},
    ];
    const langs=I18N.list();

    el.innerHTML=`
      <div class="pg-hdr"><h2 class="heading-lg">${t('settings.title')}</h2></div>
      <div class="settings-inner">
      <div class="sec-label">${t('settings.display')}</div>
      <div class="st-sec">
        <div class="st-row"><span class="st-row-l">${t('settings.lang')}</span>
          <div class="st-row-r"><select class="fsel" style="width:auto;padding:6px 10px" onchange="SettingsView.setLang(this.value)">
            ${langs.map(l=>`<option value="${l.code}" ${lang===l.code?'selected':''}>${l.label}</option>`).join('')}
          </select></div></div>
      </div>

      <div class="sec-label">${t('settings.theme')}</div>
      <div class="st-sec" style="padding:14px">
        <div class="th-grid">
          ${themes.map(th=>`<button class="th-btn ${theme===th.id?'on':''}" onclick="SettingsView.setTheme('${th.id}')">
            <div class="th-sw" style="background:linear-gradient(135deg,${th.c1} 50%,${th.c2} 50%)"></div>
            <span class="th-nm">${th.l}</span></button>`).join('')}
        </div>
      </div>

      <div class="sec-label">${t('settings.data')}</div>
      <div class="st-sec">
        <div class="st-row" style="cursor:pointer" onclick="SettingsView.exportData()">
          <span class="st-row-l">${t('settings.export')}</span><span class="st-row-r">→</span></div>
        <div class="st-row" style="cursor:pointer" onclick="SettingsView.importData()">
          <span class="st-row-l">${t('settings.import')}</span><span class="st-row-r">→</span></div>
        <div class="st-row" style="cursor:pointer" onclick="SettingsView.clearData()">
          <span class="st-row-l" style="color:var(--err)">${t('settings.clear')}</span><span class="st-row-r">→</span></div>
      </div>

      <div class="sec-label">${t('settings.info')}</div>
      <div class="st-sec">
        <div class="st-row"><span class="st-row-l">${t('settings.about')}</span><span class="st-row-r">${t('settings.version')}</span></div>
        <div style="padding:10px 16px;font-size:12px;color:var(--t3);line-height:1.6">${t('settings.aboutText')}</div>
      </div>

      <div style="text-align:center;margin:24px 0 40px">
        <button class="btn btn-s" onclick="Onboarding.start()">${t('settings.replay')}</button>
      </div>
      </div>`;  /* close settings-inner */
  }

  function setLang(l){Store.setLanguage(l);applyI18n();App.rerender();}
  function setTheme(th){Store.setTheme(th);const meta=document.querySelector('meta[name="theme-color"]');if(meta){const c={light:'#f5ede0',dark:'#0c0e14',purple:'#ebe4f2',ocean:'#ddeef4'};meta.content=c[th]||'#f5ede0';}render();}
  function exportData(){Store.exportData();Toast.success(t('settings.export'));}
  function importData(){const i=document.createElement('input');i.type='file';i.accept='.json';i.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{Store.importData(ev.target.result)?(Toast.success(t('settings.importOk')),App.rerender()):Toast.error(t('settings.importErr'));};r.readAsText(f);};i.click();}
  function clearData(){Modal.confirm({title:t('settings.clear'),text:t('settings.clearConfirm'),danger:true,onConfirm(){Store.clearAll();App.rerender();}});}

  return {render,setLang,setTheme,exportData,importData,clearData};
})();
