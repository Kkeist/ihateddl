/* ================================================
   Notify — DDL 本地推送提醒（Capacitor LocalNotifications）
   每个节点在 duration.reminder 存「提前多少毫秒提醒」(null=不提醒,0=截止时刻)。
   有 ddl 且设了 reminder 的节点，按 ddl-reminder 调度一条本地通知。
   非 APK（纯浏览器无 window.Capacitor）时全部静默降级，不报错。
   ================================================ */
const Notify = (() => {
  // Capacitor 在 Android WebView 注入 window.Capacitor；纯网页里没有 → 返回 null 全程降级
  function LN() {
    const c = window.Capacitor;
    return (c && c.Plugins && c.Plugins.LocalNotifications) || null;
  }
  function isNative() { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }

  let _permGranted = false;
  let _rescheduleTimer = null;

  // uuid 字符串 → 稳定 31-bit 正整数（Capacitor 通知 id 必须是 number）
  function hashId(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return Math.abs(h) % 2000000000 + 1;
  }

  async function ensurePermission() {
    const ln = LN();
    if (!ln) return false;
    try {
      let p = await ln.checkPermissions();
      if (p.display !== 'granted') p = await ln.requestPermissions();
      _permGranted = p.display === 'granted';
      return _permGranted;
    } catch (e) {
      console.warn('Notify permission error', e);
      return false;
    }
  }

  // 收集所有「有截止时间 + 设了提醒 + 未完成」的节点，算出各自的提醒触发时刻
  function buildSchedule(state) {
    const out = [];
    const items = getAllDdlItems(state); // {node,folder,course,path}
    const now = Date.now();
    for (const { node, folder, course } of items) {
      const d = node.duration || {};
      const ddl = d.ddl || d.end;
      const rem = d.reminder;
      if (!ddl || rem == null) continue;
      if (node.status === 'completed' || node.status === 'graded') continue;
      const at = ddl - rem;
      if (at <= now) continue; // 提醒时刻已过，不调度
      out.push({
        id: hashId(node.id),
        title: t('notify.title'),
        body: t('notify.body', {
          course: course.name,
          name: node.name,
          when: formatDateTime(ddl, document.body.dataset.lang || 'zh')
        }),
        schedule: { at: new Date(at) },
        smallIcon: 'ic_stat_icon',
      });
    }
    return out;
  }

  // 取消所有 pending 通知，按当前状态重新全量调度（节点增删改/启动时调用）
  async function rescheduleAll() {
    const ln = LN();
    if (!ln) return;
    const s = Store.getSettings();
    try {
      const pending = await ln.getPending();
      if (pending && pending.notifications && pending.notifications.length) {
        await ln.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
      }
      if (!s.notificationsEnabled) return; // 总开关关闭：只取消不重排
      const list = buildSchedule(Store.getState());
      if (!list.length) return;
      if (!_permGranted && !(await ensurePermission())) return;
      await ln.schedule({ notifications: list });
    } catch (e) {
      console.warn('Notify reschedule error', e);
    }
  }

  // 防抖：节点频繁变动时合并成一次重排
  function scheduleReschedule() {
    clearTimeout(_rescheduleTimer);
    _rescheduleTimer = setTimeout(rescheduleAll, 400);
  }

  async function init() {
    if (!LN()) return; // 纯网页：无声降级
    const s = Store.getSettings();
    // 已有任何提醒设置才主动要权限，避免一进 app 就弹权限
    const hasAny = getAllDdlItems(Store.getState()).some(x => (x.node.duration || {}).reminder != null);
    if (s.notificationsEnabled && hasAny) await ensurePermission();
    await rescheduleAll();
    Store.subscribe(ev => {
      if (ev.type && (ev.type.startsWith('node:') || ev.type === 'import' || ev.type === 'clear'
        || ev.type === 'trash:add' || ev.type === 'trash:restore' || ev.type === 'settings:notifications')) {
        scheduleReschedule();
      }
    });
  }

  return { init, rescheduleAll, ensurePermission, isNative };
})();
