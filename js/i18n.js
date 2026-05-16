/* ================================================
   i18n — Pluggable language registry
   I18N.register(code, tree, meta) to add any language
   ================================================ */
const I18N = (() => {
  const _langs = {}, _meta = {};
  function register(code, tree, meta) { _langs[code] = tree; _meta[code] = meta || { label: code }; }
  function has(code) { return !!_langs[code]; }
  function get(code) { return _langs[code]; }
  function list() { return Object.keys(_langs).map(c => ({ code: c, ...(_meta[c] || {}) })); }
  function resolve(key, langCode, vars) {
    const lang = langCode || document.body.dataset.lang || 'zh';
    const parts = key.split('.');
    let v = _langs[lang];
    for (const p of parts) { if (v == null) break; v = v[p]; }
    if (v == null && lang !== 'zh') { let fb = _langs['zh']; for (const p of parts) { if (fb == null) break; fb = fb[p]; } v = fb; }
    if (v == null) return key;
    if (typeof v === 'string' && vars) return v.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
    return v;
  }
  return { register, has, get, list, resolve };
})();

function t(key, vars) { return I18N.resolve(key, null, vars); }
function applyI18n() { document.querySelectorAll('[data-i18n]').forEach(el => { const v = t(el.dataset.i18n); if (typeof v === 'string') el.textContent = v; }); }

I18N.register('zh', {
  nav: { calendar:'日历', courses:'课程', tools:'工具箱', settings:'设置' },
  folders: {
    title:'文件夹', add:'新建文件夹', empty:'还没有文件夹，点击右下角 + 创建',
    defaultName:'2026Fall', deleteConfirm:'删除文件夹「{name}」？里面的课程也会被删除。',
    courseCount:'{n} 门课程',
  },
  courses: {
    title:'课程', add:'新建课程', empty:'还没有课程，点击 + 创建',
    defaultName:'Course001', deleteConfirm:'删除课程「{name}」？',
    itemCount:'{n} 项',
    setup:{ title:'快速配置', desc:'选择模板快速设置课程组件，或跳过后手动配置',
            skip:'跳过', standard:'标准课程', lab:'实验课', seminar:'研讨课' },
  },
  editor: {
    addGroup:'新建分组', addItem:'新建项', del:'删除', rename:'重命名',
    copy:'复制', up:'上移', down:'下移',
    pct:'权重', score:'分数', curr:'得分', outof:'满分',
    duration:'时间', detail:'备注', bonus:'加分项',
    drop:'丢弃最低', type:'类型', status:'状态',
    grpCustom:'自定义分组', grpDivided:'均分分组',
    sNotStarted:'未开始', sInProgress:'进行中', sCompleted:'已完成', sGraded:'已出分',
    plan:'计划模式', exitPlan:'退出计划',
    viewPct:'百分比', viewRaw:'原始分',
    noScore:'--', courseScore:'课程总分', planNote:'计划分数不影响实际记录',
    from:'开始', to:'结束', prepare:'准备开始', ddl:'截止日期',
    prepareOptional:'可选：提前准备提醒', prepareRemove:'移除',
    dateDigits:'YYYYMMDD 或 YYYY-MM-DD',
    pickCal:'小日历',
    dropped:'已丢弃', bonusTag:'+bonus', milestone:'节点', addMs:'添加节点',
    total:'共',
  },
  calendar: {
    title:'日历', month:'月', ddlList:'列表', agenda:'日程',
    today:'今天', upcoming:'即将到来', completed:'已完成', overdue:'已逾期',
    noTasks:'暂无任务', allFolders:'全部',
    weeks:['日','一','二','三','四','五','六'],
    months:['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
    timeLeft:'剩余', week:'周', day:'天', hour:'小时', minute:'分钟',
    overduBy:'已逾期',
    markDone:'标记完成', postpone:'延期', alt:'替代方案',
    restore:'恢复', restoreFail:'原课程已被删除，无法恢复', trash:'回收站', emptyTrash:'清空',
    trashEmpty:'回收站为空', deleteConfirm:'确认删除？',
    emptyConfirm:'清空回收站？不可撤销。',
    postponeTo:'延期至', altNote:'替代方案说明',
    filter:'筛选', start:'开始',
  },
  tools: {
    title:'工具箱',
    timer:{ title:'专注计时', focus:'专注', short:'短休息', long:'长休息',
            start:'开始', pause:'暂停', reset:'重置', sessions:'次',
            focusMin:'专注(分)', breakMin:'休息(分)' },
    plan:{ title:'分数规划', course:'选择课程', target:'目标分',
           current:'当前', need:'还差', ungraded:'未评分项',
           hint:'填入临时分数来预估是否达标', result:'预估总分',
           reached:'已达标', gap:'差',
           component:'组件', weight:'权重', score:'成绩', contrib:'贡献', total:'合计' },
  },
  settings: {
    title:'设置', lang:'语言', theme:'外观',
    themes:{ light:'便签纸', dark:'深色', purple:'薰衣草', ocean:'海洋' },
    export:'导出', import:'导入', importOk:'导入成功',
    importErr:'导入失败：格式不正确', clear:'清除全部数据',
    clearConfirm:'确定清除所有数据？此操作不可撤销。',
    about:'关于', version:'v1.0',
    aboutText:'帮助大学生管理课程 DDL 和成绩的工具。',
    data:'数据', display:'显示', info:'关于',
    replay:'重新查看引导',
  },
  common: {
    cancel:'取消', confirm:'确认', save:'保存', delete:'删除', badDate:'请输入有效日期：8 位 YYYYMMDD，或 YYYY-MM-DD',
    saveFail:'保存失败：存储空间已满，这次改动未能存住',
    rename:'重命名', star:'收藏', unstar:'取消收藏', more:'更多',
  },
  onboarding: {
    skip:'跳过', next:'下一步', done:'完成', go:'继续',
    steps:[
      { title:'欢迎使用 iHateDDL', text:'拿到课程大纲后，跟着引导把这学期的课录进来。点下面「继续」。' },
      { title:'新建文件夹', text:'点亮起的 + 按钮，新建一个学期文件夹。' },
      { title:'确认文件夹名', text:'名字已填好 2026Fall，点「确认」创建。' },
      { title:'打开文件夹', text:'点这个文件夹进去。' },
      { title:'新建课程', text:'点亮起的 + 按钮，新建一门课。' },
      { title:'确认课程名', text:'名字已填好 exampleCourse001，点「确认」创建。' },
      { title:'手动配置', text:'这次我们手动配，点「跳过」进入课程编辑。' },
      { title:'添加 Final', text:'点「新建项」，自动加一个 Final，占 40%，截止 2027 年 1 月 1 日。' },
      { title:'添加 Quiz', text:'点「新建分组」，自动加一个均分的 Quizzes 组，占 30%，含 Quiz1-3、丢弃最低 1 个。' },
      { title:'添加 Assignment', text:'点「新建项」，自动加 Assignment，占剩余 20%。' },
      { title:'添加 Bonus', text:'点「新建项」，自动加 Bonus 2%，加分项不计入 100% 上限。' },
      { title:'查看日历', text:'点日历，设了时间的作业都在这里，能看到距离截止还有多久。' },
      { title:'完成', text:'日历里可勾选完成或删除，删除的进回收站需手动清空（导出存档不含回收站）。点下面结束引导。' },
    ]
  }
}, { label:'中文简体' });

I18N.register('en', {
  nav: { calendar:'Calendar', courses:'Courses', tools:'Tools', settings:'Settings' },
  folders: {
    title:'Folders', add:'New Folder', empty:'No folders yet. Tap + to create one.',
    defaultName:'2026Fall', deleteConfirm:'Delete folder "{name}"? All courses inside will be deleted.',
    courseCount:'{n} courses',
  },
  courses: {
    title:'Courses', add:'New Course', empty:'No courses yet. Tap + to add one.',
    defaultName:'Course001', deleteConfirm:'Delete course "{name}"?',
    itemCount:'{n} items',
    setup:{ title:'Quick Setup', desc:'Pick a template to set up course components, or skip to do it manually',
            skip:'Skip', standard:'Standard', lab:'Lab Course', seminar:'Seminar' },
  },
  editor: {
    addGroup:'Add Group', addItem:'Add Item', del:'Delete', rename:'Rename',
    copy:'Copy', up:'Move Up', down:'Move Down',
    pct:'Weight', score:'Score', curr:'Points', outof:'Out of',
    duration:'Duration', detail:'Notes', bonus:'Bonus',
    drop:'Drop Lowest', type:'Type', status:'Status',
    grpCustom:'Custom', grpDivided:'Divided',
    sNotStarted:'Not Started', sInProgress:'In Progress', sCompleted:'Completed', sGraded:'Graded',
    plan:'Plan Mode', exitPlan:'Exit Plan',
    viewPct:'Percentage', viewRaw:'Raw Score',
    noScore:'--', courseScore:'Course Score', planNote:'Plan scores do not affect actual records',
    from:'From', to:'To', prepare:'Prep Start', ddl:'Deadline',
    prepareOptional:'Optional: prep reminder', prepareRemove:'Remove',
    dateDigits:'YYYYMMDD or YYYY-MM-DD',
    pickCal:'Mini calendar',
    dropped:'Dropped', bonusTag:'+bonus', milestone:'Milestone', addMs:'Add Milestone',
    total:'Total',
  },
  calendar: {
    title:'Calendar', month:'Month', ddlList:'List', agenda:'Agenda',
    today:'Today', upcoming:'Upcoming', completed:'Completed', overdue:'Overdue',
    noTasks:'No tasks', allFolders:'All',
    weeks:['Su','Mo','Tu','We','Th','Fr','Sa'],
    months:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    timeLeft:'Left', week:'w', day:'d', hour:'h', minute:'m',
    overduBy:'Overdue',
    markDone:'Complete', postpone:'Postpone', alt:'Alternative',
    restore:'Restore', restoreFail:'The original course was deleted; cannot restore', trash:'Trash', emptyTrash:'Empty',
    trashEmpty:'Trash is empty', deleteConfirm:'Delete this item?',
    emptyConfirm:'Empty trash? Cannot be undone.',
    postponeTo:'Postpone to', altNote:'Alternative plan',
    filter:'Filter', start:'Start',
  },
  tools: {
    title:'Tools',
    timer:{ title:'Focus Timer', focus:'Focus', short:'Short Break', long:'Long Break',
            start:'Start', pause:'Pause', reset:'Reset', sessions:'sessions',
            focusMin:'Focus (min)', breakMin:'Break (min)' },
    plan:{ title:'Score Planner', course:'Select Course', target:'Target',
           current:'Current', need:'Need', ungraded:'Ungraded',
           hint:'Fill in temp scores to see if you can reach your target', result:'Estimated',
           reached:'Target reached', gap:'Need',
           component:'Component', weight:'Weight', score:'Score', contrib:'Contrib', total:'Total' },
  },
  settings: {
    title:'Settings', lang:'Language', theme:'Theme',
    themes:{ light:'Memo', dark:'Dark', purple:'Lavender', ocean:'Ocean' },
    export:'Export', import:'Import', importOk:'Import successful',
    importErr:'Import failed: invalid format', clear:'Clear All Data',
    clearConfirm:'Clear all data? This cannot be undone.',
    about:'About', version:'v1.0',
    aboutText:'A tool to help students manage course DDLs and grades.',
    data:'Data', display:'Display', info:'About',
    replay:'Replay Tutorial',
  },
  common: {
    cancel:'Cancel', confirm:'Confirm', save:'Save', delete:'Delete', badDate:'Enter a valid date: YYYYMMDD or YYYY-MM-DD',
    saveFail:'Save failed: storage is full, this change was not saved',
    rename:'Rename', star:'Star', unstar:'Unstar', more:'More',
  },
  onboarding: {
    skip:'Skip', next:'Next', done:'Done', go:'Continue',
    steps:[
      { title:'Welcome to iHateDDL', text:'Got your syllabus? Follow along to enter this semester. Tap Continue below.' },
      { title:'Create a Folder', text:'Tap the highlighted + button to make a semester folder.' },
      { title:'Confirm Folder Name', text:'Name is prefilled as 2026Fall. Tap Confirm to create it.' },
      { title:'Open the Folder', text:'Tap this folder to go inside.' },
      { title:'Add a Course', text:'Tap the highlighted + button to add a course.' },
      { title:'Confirm Course Name', text:'Name is prefilled as exampleCourse001. Tap Confirm.' },
      { title:'Configure Manually', text:'We will set it up by hand. Tap Skip to open the course editor.' },
      { title:'Add Final', text:'Tap "Add Item" — a Final worth 40%, due Jan 1 2027, is added.' },
      { title:'Add Quiz', text:'Tap "Add Group" — a divided Quizzes group worth 30% with Quiz1-3, drop lowest 1.' },
      { title:'Add Assignment', text:'Tap "Add Item" — an Assignment for the remaining 20%.' },
      { title:'Add Bonus', text:'Tap "Add Item" — a 2% Bonus; bonus items are not capped at 100%.' },
      { title:'Calendar', text:'Tap Calendar. Timed work shows here with a countdown to each deadline.' },
      { title:'Done', text:'In Calendar you can complete or delete items; deleted ones go to Trash (empty it manually; exports exclude Trash). Tap below to finish.' },
    ]
  }
}, { label:'English' });
