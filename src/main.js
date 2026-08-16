import Vue from "vue/dist/vue.esm.js";
import { icons } from "lucide";
import { Capacitor } from "@capacitor/core";
import { App as NativeApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { LocalNotifications } from "@capacitor/local-notifications";
import "./style.css";

const PHOTO = `${import.meta.env.BASE_URL}temple-couple.jpg`;
const MUSIC_PREVIEW = `${
  import.meta.env.BASE_URL
}audio/duo-xingyun-preview.m4a`;
const LOCAL_BACKUP_KEY = "only-us-backup";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const COUPLE_ID = import.meta.env.VITE_COUPLE_ID;
const UPDATE_URL = "https://zyf-coder.github.io/FLX/update.json";
const isNewerVersion = (latest, current) => {
  const left = String(latest).split(".").map(Number);
  const right = String(current).split(".").map(Number);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] || 0) - (right[index] || 0);
    if (difference) return difference > 0;
  }
  return false;
};
const defaults = {
  profile: {
    a: "小张同学",
    b: "徐老师",
    since: "2023-05-20",
    quote: "世界很大，刚好我们遇见了。",
  },
  photos: [{ id: 1, src: PHOTO, title: "第一次旅行", date: "2024-02-14" }],
  todos: [
    { id: 1, text: "一起看一次海边日出", done: false },
    { id: 2, text: "拍一组四季合照", done: false },
    { id: 3, text: "去对方长大的地方走走", done: false },
  ],
  days: [
    { id: 1, title: "在一起纪念日", date: "2026-05-20", icon: "💗" },
    { id: 2, title: "她的生日", date: "2026-10-18", icon: "🎂" },
  ],
  notes: [
    {
      id: 1,
      author: "徐老师",
      text: "今天也比昨天更喜欢你一点。",
      time: "刚刚",
    },
  ],
  stories: [
    {
      id: 1,
      date: "2025.10.18",
      title: "相遇",
      text: "2025年10月18日，我们第一次相遇。",
    },
    {
      id: 2,
      date: "2025.10.26",
      title: "表白",
      text: "2025年10月26日，我们正式走到了一起。",
    },
  ],
};
const clone = (value) => JSON.parse(JSON.stringify(value));
const localBackup = {
  get() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_BACKUP_KEY));
    } catch {
      return null;
    }
  },
  set(value) {
    try {
      localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(value));
    } catch (error) {
      console.warn("Local backup failed", error);
    }
  },
};
const cloud = {
  enabled: Boolean(SUPABASE_URL && SUPABASE_KEY && COUPLE_ID),
  headers: {
    apikey: SUPABASE_KEY,
    "Content-Type": "application/json",
    "x-couple-id": COUPLE_ID,
  },
  async get() {
    if (!this.enabled) return null;
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/couple_states?couple_id=eq.${encodeURIComponent(
        COUPLE_ID
      )}&select=state`,
      { headers: this.headers }
    );
    if (!response.ok) throw new Error(`Cloud read failed: ${response.status}`);
    const rows = await response.json();
    return rows[0]?.state || null;
  },
  async set(value) {
    if (!this.enabled) return;
    const response = await fetch(`${SUPABASE_URL}/rest/v1/couple_states`, {
      method: "POST",
      headers: { ...this.headers, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        couple_id: COUPLE_ID,
        state: value,
        updated_at: new Date().toISOString(),
      }),
    });
    if (!response.ok) throw new Error(`Cloud write failed: ${response.status}`);
  },
};
const indexedDb = {
  get: () =>
    new Promise((resolve) => {
      const request = indexedDB.open("only-us", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("data");
      request.onerror = () => resolve(null);
      request.onsuccess = () => {
        const query = request.result
          .transaction("data")
          .objectStore("data")
          .get("state");
        query.onsuccess = () => resolve(query.result || null);
        query.onerror = () => resolve(null);
      };
    }),
  set: (value) =>
    new Promise((resolve) => {
      const request = indexedDB.open("only-us", 1);
      request.onerror = () => resolve();
      request.onsuccess = () => {
        const query = request.result
          .transaction("data", "readwrite")
          .objectStore("data")
          .put(value, "state");
        query.onsuccess = resolve;
        query.onerror = resolve;
      };
    }),
};
const storage = {
  pending: Promise.resolve(),
  async get() {
    if (!cloud.enabled) return defaults;
    const remote = await cloud.get();
    if (remote) return remote;
    await cloud.set(defaults);
    return defaults;
  },
  async set(value) {
    const snapshot = clone(value);
    snapshot._updatedAt = Date.now();
    this.pending = this.pending.then(async () => {
      try {
        await cloud.set(snapshot);
        return { saved: true, updatedAt: snapshot._updatedAt };
      } catch (error) {
        console.warn("Cloud sync failed; keeping the change in memory", error);
        return { saved: false, updatedAt: snapshot._updatedAt };
      }
    });
    return this.pending;
  },
};
const formatRelativeTime = (value) => {
  const timestamp =
    typeof value === "number" ? value : new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return value || "";
  const diff = Math.max(0, Date.now() - timestamp);
  if (diff < 60000) return "刚刚";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 172800000) return "昨天";
  return new Date(timestamp).toLocaleDateString("zh-CN");
};
const nextAnnualDate = (value, hour = 0) => {
  const date = new Date(
    `${String(value).slice(0, 10)}T${String(hour).padStart(2, "0")}:00:00`
  );
  const now = new Date();
  while (date.getTime() <= now.getTime())
    date.setFullYear(date.getFullYear() + 1);
  return date;
};
defaults.profile = {
  a: "小张同学",
  b: "徐老师",
  since: "2025-10-26",
  quote: "世界很大，刚好我们遇见了。",
};
const iconKey = (name) =>
  name
    .split("-")
    .map((x) => x[0].toUpperCase() + x.slice(1))
    .join("");
const drawIcon = (h, node, fill) =>
  h(
    node[0],
    { attrs: { ...node[1], ...(node[0] === "svg" && fill ? { fill } : {}) } },
    (node[2] || []).map((x) => drawIcon(h, x))
  );
Vue.component("v-icon", {
  functional: true,
  props: ["name", "fill"],
  render(h, ctx) {
    return drawIcon(h, icons[iconKey(ctx.props.name)], ctx.props.fill);
  },
});
Vue.component("love-timeline", {
  props: ["items"],
  template: `<div class="timeline"><article v-for="(x,i) in items" :key="x.id"><i><v-icon v-if="i===items.length-1" name="heart" fill="currentColor"/><span v-else/></i><div><time>{{x.date}}</time><b>{{x.title}}</b><p>{{x.text}}</p></div></article></div>`,
});
Vue.component("love-note", {
  props: ["note"],
  data: () => ({ now: Date.now(), clock: null }),
  mounted() {
    this.clock = setInterval(() => (this.now = Date.now()), 30000);
  },
  beforeDestroy() {
    clearInterval(this.clock);
  },
  methods: {
    reloadPage() {
      window.location.reload();
    },
    displayTime(value) {
      this.now;
      return formatRelativeTime(value);
    },
  },
  template: `<article class="note"><div>{{note.author[0]}}</div><p><b>{{note.author}}</b><span>{{note.text}}</span><small>{{displayTime(note.time)}}</small></p></article>`,
});

Vue.component("anniversary-page", {
  props: ["items"],
  data: () => ({
    now: Date.now(),
    timer: null,
    countdownOpen: true,
    elapsedOpen: true,
    together: {
      title: "徐老师和小张同学在一起已经",
      date: "2025-10-26T00:00:00",
    },
    elapsed: [
      {
        id: 3,
        title: "求婚已经",
        date: "2026-07-25T00:00:00",
        caption: "2026-07-25 周六",
      },
      {
        id: 4,
        title: "认识了已经",
        date: "2025-10-18T00:00:00",
        caption: "相爱于2025年10月18日",
      },
    ],
  }),
  mounted() {
    this.timer = setInterval(() => (this.now = Date.now()), 1000);
  },
  beforeDestroy() {
    clearInterval(this.timer);
  },
  methods: {
    parts(date, reverse = false) {
      const gap = Math.max(
        0,
        reverse
          ? this.now - new Date(date).getTime()
          : new Date(date).getTime() - this.now
      );
      return {
        days: Math.floor(gap / 86400000),
        hours: Math.floor(gap / 3600000) % 24,
        minutes: Math.floor(gap / 60000) % 60,
        seconds: Math.floor(gap / 1000) % 60,
      };
    },
    pad(n) {
      return String(n).padStart(2, "0");
    },
    nextDate(item) {
      return nextAnnualDate(item.date).getTime();
    },
    dateLabel(item) {
      return nextAnnualDate(item.date).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    },
    reminderDays(item) {
      return item.remindDays === 0 ? 0 : item.remindDays || 1;
    },
  },
  template: `<section class="anniversary-page"><div class="anniversary-head"><div><span>我们的</span><h2>纪念日</h2></div><button title="添加纪念日" @click="$emit('add')"><v-icon name="plus"/></button></div><article class="together-card"><p>{{together.title}}</p><div class="big-duration"><strong>{{parts(together.date,true).days}}</strong><span>天</span><strong>{{pad(parts(together.date,true).hours)}}</strong><span>时</span><strong>{{pad(parts(together.date,true).minutes)}}</strong><span>分</span><strong>{{pad(parts(together.date,true).seconds)}}</strong><span>秒</span></div><footer>从 2025年10月26日 开始</footer></article><div class="day-section"><button class="section-label" @click="countdownOpen=!countdownOpen"><span>倒数纪念日 · {{items.length}}</span><i/><v-icon :name="countdownOpen?'chevron-up':'chevron-down'"/></button><div class="anniversary-grid" v-show="countdownOpen"><article class="event-card countdown-card" v-for="item in items" :key="item.id"><button class="event-delete" title="删除纪念日" @click="$emit('remove',item)"><v-icon name="trash-2"/></button><div class="event-title"><i><v-icon name="heart"/></i><b>{{item.title}}</b></div><div class="event-duration"><strong>{{parts(nextDate(item)).days}}</strong><span>天</span><strong>{{pad(parts(nextDate(item)).hours)}}</strong><span>时</span><strong>{{pad(parts(nextDate(item)).minutes)}}</strong><span>分</span></div><div class="event-meta"><span><v-icon name="refresh-cw"/>每年重复</span><span><v-icon name="bell"/>{{reminderDays(item)===0?'当天提醒':'提前'+reminderDays(item)+'天提醒'}}</span></div><small class="event-date">{{dateLabel(item)}}</small></article><button class="empty-add" v-if="!items.length" @click="$emit('add')"><v-icon name="plus"/>添加第一个纪念日</button></div></div><div class="day-section elapsed-section"><button class="section-label" @click="elapsedOpen=!elapsedOpen"><span>共同经历</span><i/><v-icon :name="elapsedOpen?'chevron-up':'chevron-down'"/></button><div class="anniversary-grid" v-show="elapsedOpen"><article class="event-card elapsed-card" v-for="item in elapsed" :key="item.id"><div class="event-title"><i><v-icon name="heart"/></i><b>{{item.title}}</b></div><div class="event-duration"><strong>{{parts(item.date,true).days}}</strong><span>天</span></div><div class="event-meta">{{item.caption}}</div><v-icon class="card-mark" name="heart-handshake"/></article></div></div></section>`,
});

new Vue({
  el: "#app",
  data: {
    ready: false,
    loadError: false,
    state: defaults,
    tab: "home",
    modal: null,
    music: false,
    hearts: [],
    menu: false,
    exitHint: false,
    lastBackAt: 0,
    cloudEnabled: cloud.enabled,
    cloudSync: cloud.enabled ? "正在连接云端" : "云端未配置",
    cloudPoller: null,
    lastCloudVersion: 0,
    applyingRemote: false,
    nav: [
      ["home", "house", "主页"],
      ["album", "images", "相册"],
      ["list", "square-check-big", "清单"],
      ["days", "calendar-heart", "纪念日"],
      ["notes", "message-circle", "留言"],
      ["story", "book-heart", "故事"],
    ],
  },
  computed: {
    loveDays() {
      return Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(this.state.profile.since).getTime()) / 86400000
        )
      );
    },
    startDate() {
      return new Date(this.state.profile.since).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    },
    doneCount() {
      return this.state.todos.filter((x) => x.done).length;
    },
    nextAnniversary() {
      return [...this.state.days]
        .map((item) => ({ ...item, nextDate: nextAnnualDate(item.date) }))
        .sort((a, b) => a.nextDate - b.nextDate)[0];
    },
  },
  watch: {
    state: {
      deep: true,
      handler(v) {
        if (this.ready && !this.applyingRemote) this.persistState(v);
      },
    },
  },
  async mounted() {
    let savedState;
    try {
      savedState = await storage.get();
    } catch (error) {
      this.loadError = true;
      this.cloudSync = "无法连接云端，请检查网络";
      return;
    }
    this.state = JSON.parse(
      JSON.stringify(savedState)
        .replaceAll("小满", "小张同学")
        .replaceAll("阿屿", "徐老师")
    );
    this.state.notes = this.state.notes.map((note) => ({
      ...note,
      time: note.time === "刚刚" ? Date.now() : note.time,
    }));
    this.state.meta = this.state.meta || {};
    if (!this.state.meta.todoDefaultsCleared) {
      this.state.todos.forEach((todo) => (todo.done = false));
      this.state.meta.todoDefaultsCleared = true;
    }
    this.state.stories = JSON.parse(JSON.stringify(defaults.stories));
    this.ready = true;
    this.lastCloudVersion = this.state._updatedAt || 0;
    if (cloud.enabled) {
      this.cloudSync = "云端数据已同步";
      this.cloudPoller = setInterval(() => this.pullCloudState(), 5000);
    }
    if (Capacitor.isNativePlatform()) {
      this.setupNativeBack();
      this.setupNativeLifecycle();
      this.scheduleAllReminders();
      this.checkForUpdate();
    }
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  },
  beforeDestroy() {
    clearInterval(this.cloudPoller);
  },
  methods: {
    async persistState(value) {
      this.cloudSync = "正在保存到云端";
      const result = await storage.set(value);
      this.lastCloudVersion = result.updatedAt;
      this.cloudSync = result.saved
        ? "已实时保存到云端"
        : "网络异常，等待重新上传";
    },
    async pullCloudState() {
      try {
        const remote = await cloud.get();
        if (remote && (remote._updatedAt || 0) > this.lastCloudVersion) {
          this.lastCloudVersion = remote._updatedAt || 0;
          this.applyingRemote = true;
          this.state = remote;
          this.$nextTick(() => (this.applyingRemote = false));
          this.cloudSync = "已获取云端最新数据";
        }
      } catch (error) {
        this.cloudSync = "云端连接暂时中断";
      }
    },
    setupNativeLifecycle() {
      NativeApp.addListener("appStateChange", ({ isActive }) => {
        if (!isActive && this.$refs.bgm) this.$refs.bgm.pause();
      });
    },
    async scheduleAllReminders() {
      const permission = await LocalNotifications.checkPermissions();
      const result =
        permission.display === "granted"
          ? permission
          : await LocalNotifications.requestPermissions();
      if (result.display !== "granted") return;
      for (const item of this.state.days) await this.scheduleReminder(item);
    },
    async scheduleReminder(item) {
      if (!Capacitor.isNativePlatform()) return;
      const at = nextAnnualDate(item.date, 9);
      const remindDays =
        item.remindDays === 0 ? 0 : Number(item.remindDays || 1);
      at.setDate(at.getDate() - remindDays);
      if (at.getTime() <= Date.now()) at.setFullYear(at.getFullYear() + 1);
      const id = Math.max(
        1,
        Number(String(item.id).replace(/\D/g, "").slice(-8)) || 1
      );
      await LocalNotifications.cancel({ notifications: [{ id }] });
      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title: "纪念日提醒",
            body:
              remindDays === 0
                ? `今天是${item.title}`
                : `${item.title}还有${remindDays}天`,
            schedule: { at },
          },
        ],
      });
    },
    setupNativeBack() {
      NativeApp.addListener("backButton", () => {
        if (this.modal) {
          this.modal = null;
          return;
        }
        if (this.menu) {
          this.menu = false;
          return;
        }
        if (this.tab !== "home") {
          this.go("home");
          return;
        }
        const now = Date.now();
        if (now - this.lastBackAt < 2000) {
          NativeApp.exitApp();
          return;
        }
        this.lastBackAt = now;
        this.exitHint = true;
        setTimeout(() => (this.exitHint = false), 2000);
      });
    },
    async checkForUpdate() {
      try {
        const [appInfo, response] = await Promise.all([
          NativeApp.getInfo(),
          fetch(`${UPDATE_URL}?t=${Date.now()}`, { cache: "no-store" }),
        ]);
        if (!response.ok) return;
        const update = await response.json();
        if (
          isNewerVersion(update.version, appInfo.version) &&
          confirm(
            `发现新版本 ${update.version}\n\n${
              update.notes || "修复问题并优化使用体验"
            }\n\n是否立即更新？`
          )
        ) {
          await Browser.open({ url: update.androidUrl });
        }
      } catch (error) {
        console.warn("检查更新失败", error);
      }
    },
    async toggleMusic() {
      const player = this.$refs.bgm;
      if (this.music) {
        player.pause();
        return;
      }
      try {
        await player.play();
      } catch (error) {
        this.music = false;
        console.warn("音乐播放失败", error);
      }
    },
    go(t) {
      this.tab = t;
      this.menu = false;
      scrollTo({ top: 0, behavior: "smooth" });
    },
    until(d) {
      return Math.max(
        1,
        Math.ceil((nextAnnualDate(d).getTime() - Date.now()) / 86400000)
      );
    },
    rain() {
      this.hearts = Array.from({ length: 28 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.8,
        size: 14 + Math.random() * 22,
      }));
      setTimeout(() => (this.hearts = []), 4000);
    },
    addTodo() {
      const text = this.$refs.todo.value.trim();
      if (text) this.state.todos.push({ id: Date.now(), text, done: false });
      this.$refs.todo.value = "";
    },
    confirmDelete(collection, id, label) {
      if (!confirm(`确定要删除“${label}”吗？\n删除后无法撤销。`)) return;
      this.state[collection] = this.state[collection].filter(
        (item) => item.id !== id
      );
    },
    async removeAnniversary(item) {
      if (!confirm(`确定要删除纪念日“${item.title}”吗？\n对应提醒也会被取消。`))
        return;
      this.state.days = this.state.days.filter((day) => day.id !== item.id);
      if (Capacitor.isNativePlatform()) {
        const id = Math.max(
          1,
          Number(String(item.id).replace(/\D/g, "").slice(-8)) || 1
        );
        await LocalNotifications.cancel({ notifications: [{ id }] });
      }
    },
    addNote() {
      const text = this.$refs.note.value.trim();
      if (text)
        this.state.notes.unshift({
          id: Date.now(),
          author: this.state.profile.a,
          text,
          time: Date.now(),
        });
      this.$refs.note.value = "";
    },
    photos(e) {
      [...e.target.files].forEach((f) => {
        const r = new FileReader();
        r.onload = () =>
          this.state.photos.push({
            id: Date.now() + Math.random(),
            src: r.result,
            title: f.name.replace(/\.[^.]+$/, ""),
            date: new Date().toISOString().slice(0, 10),
            uploadedAt: Date.now(),
          });
        r.readAsDataURL(f);
      });
    },
    saveModal(e) {
      const f = new FormData(e.target);
      if (this.modal === "day") {
        const day = {
          id: Date.now(),
          title: f.get("title"),
          date: f.get("date"),
          icon: "💗",
          remindDays: Number(f.get("remindDays") || 1),
        };
        this.state.days.push(day);
        this.scheduleReminder(day).catch((error) =>
          console.warn("纪念日提醒设置失败", error)
        );
      } else
        this.state.stories.push({
          id: Date.now(),
          title: f.get("title"),
          date: f.get("date").replaceAll("-", "."),
          text: f.get("text"),
        });
      this.modal = null;
    },
    exportData() {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(
        new Blob([JSON.stringify(this.state, null, 2)], {
          type: "application/json",
        })
      );
      a.download = "only-us-backup.json";
      a.click();
    },
    importData(e) {
      const r = new FileReader();
      r.onload = () => (this.state = JSON.parse(r.result));
      r.readAsText(e.target.files[0]);
    },
  },
  template: `
<div class="app" v-if="ready">
 <div class="app-toast" v-if="exitHint">再返回一次退出 APP</div>
 <span v-for="h in hearts" :key="h.id" class="rain" :style="{left:h.left+'%',animationDelay:h.delay+'s',fontSize:h.size+'px'}">♥</span>
 <header><button class="brand" @click="go('home')"><span><v-icon name="heart" fill="currentColor"/></span><b>Only Us</b><small>我们的恋爱空间</small></button><nav><button v-for="n in nav" :key="n[0]" :class="{active:tab===n[0]}" @click="go(n[0])"><v-icon :name="n[1]"/>{{n[2]}}</button></nav><div class="tools"><span class="music-label" v-if="music"><i></i>多幸运 · 韩安旭</span><span class="music-hearts" v-if="music" aria-hidden="true"><i v-for="n in 6" :key="n" :style="{'--heart-index':n}">♥</i></span><button :title="music?'暂停《多幸运》':'播放《多幸运》'" @click="toggleMusic"><v-icon :name="music?'music-2':'volume-x'"/></button><button title="爱心雨" @click="rain"><v-icon name="sparkles"/></button><button class="hamb" @click="menu=!menu"><v-icon name="menu"/></button></div></header><audio ref="bgm" :src="'${MUSIC_PREVIEW}'" preload="none" loop @pause="music=false" @play="music=true"></audio>
 <div class="mobile-menu" v-if="menu"><button v-for="n in nav" :key="n[0]" @click="go(n[0])"><v-icon :name="n[1]"/>{{n[2]}}</button></div>
 <main>
  <template v-if="tab==='home'">
   <section class="hero"><img :src="'${PHOTO}'"><div class="shade"/><div class="hero-copy"><span class="eyebrow"><span/> OUR LOVE STORY <span/></span><h1>小张同学 <v-icon name="heart" fill="currentColor"/> 徐老师</h1><p>{{state.profile.quote}}</p><div class="counter"><div><strong>{{Math.max(0,Math.floor((Date.now()-new Date('2025-10-26').getTime())/86400000))}}</strong><span>相爱的日子</span></div><i/><div><strong>2025年10月26日</strong><span>故事开始于</span></div></div></div><button class="float-heart" @click="rain"><v-icon name="heart" fill="currentColor"/></button></section>
   <section class="quick"><article @click="go('album')"><div class="qicon pink"><v-icon name="images"/></div><div><b>恋爱相册</b><span>{{state.photos.length}} 张珍贵回忆</span></div><v-icon name="chevron-right"/></article><article @click="go('list')"><div class="qicon purple"><v-icon name="square-check-big"/></div><div><b>恋爱清单</b><span>{{doneCount}}/{{state.todos.length}} 已完成</span></div><v-icon name="chevron-right"/></article><article @click="go('days')"><div class="qicon amber"><v-icon name="calendar-heart"/></div><div><b>下个纪念日</b><span>{{nextAnniversary ? nextAnniversary.title : '添加纪念日'}}</span></div><strong>{{nextAnniversary ? until(nextAnniversary.date) : '+'}}<small>天</small></strong></article></section>
   <section class="home-grid"><div class="panel"><div class="title"><span><v-icon name="clock-3"/></span><div><b>爱情时间线</b><small>每个瞬间，都值得被记住</small></div><button @click="go('story')">查看全部 <v-icon name="chevron-right"/></button></div><love-timeline :items="state.stories.slice(-3)"/></div><div class="panel"><div class="title"><span><v-icon name="message-circle"/></span><div><b>悄悄话</b><small>只给你看的甜蜜留言</small></div><button @click="go('notes')">查看全部 <v-icon name="chevron-right"/></button></div><love-note v-for="n in state.notes.slice(0,2)" :key="n.id" :note="n"/></div></section>
   <section class="surprise"><v-icon name="gift"/><div><b>今日份的小惊喜</b><p>点击开启属于你们的浪漫时刻</p></div><button @click="rain">开启惊喜 <v-icon name="sparkles"/></button></section>
  </template>
  <section class="page" v-if="tab==='album'"><div class="page-head"><div><h2>恋爱相册</h2><p>把散落在时光里的瞬间，收藏在一起。</p></div><button class="primary" @click="$refs.file.click()"><v-icon name="camera"/>上传照片</button></div><input hidden multiple accept="image/*" type="file" ref="file" @change="photos"><div class="gallery"><figure v-for="p in state.photos" :key="p.id"><img :src="p.src"><figcaption><b>{{p.title}}</b><span>{{p.date}}</span></figcaption><button @click="confirmDelete('photos',p.id,p.title)"><v-icon name="trash-2"/></button></figure></div></section>
  <section class="page list-page" v-if="tab==='list'"><div class="page-head"><div><h2>恋爱清单</h2><p>想一起做的事，一件件变成共同回忆。</p></div><span class="list-progress">已完成 {{doneCount}} / {{state.todos.length}}</span></div><form class="addbar" @submit.prevent="addTodo"><v-icon name="sparkles"/><input ref="todo" placeholder="写下下一件想一起做的事"><button title="添加到清单"><v-icon name="plus"/><span>添加</span></button></form><div class="todo"><label v-for="t in state.todos" :key="t.id" :class="{completed:t.done}"><input type="checkbox" v-model="t.done"><i><v-icon name="check"/></i><span>{{t.text}}</span><button type="button" title="删除" @click.prevent="confirmDelete('todos',t.id,t.text)"><v-icon name="trash-2"/></button></label></div></section>
  <anniversary-page v-if="tab==='days'" :items="state.days" @add="modal='day'" @remove="removeAnniversary"/>
  <section class="page" v-if="tab==='notes'"><div class="page-head"><div><h2>悄悄话</h2><p>忙碌的日子里，也别忘了说爱你。</p></div></div><form class="noteform" @submit.prevent="addNote"><textarea ref="note" maxlength="120" placeholder="写一句只给 TA 看的话…"/><button><v-icon name="send"/>发送留言</button></form><love-note v-for="n in state.notes" :key="n.id" :note="n"/></section>
  <section class="page" v-if="tab==='story'"><div class="page-head"><div><h2>我们的故事</h2><p>从相遇到未来，每一章都由我们共同写下。</p></div><button class="primary" @click="modal='story'"><v-icon name="plus"/>记录故事</button></div><love-timeline :items="state.stories"/><div class="backup"><b>数据备份</b><span>{{cloudEnabled?cloudSync:'当前仅保存在本机，卸载 APP 前请先导出备份。'}}</span><button @click="exportData"><v-icon name="download"/>导出</button><label><v-icon name="upload"/>导入<input hidden type="file" accept="application/json" @change="importData"></label></div></section>
 </main><footer><v-icon name="heart" fill="currentColor"/> Only Us · 愿每一天都值得纪念</footer>
 <div class="overlay" v-if="modal" @mousedown.self="modal=null"><div class="modal"><button class="close" @click="modal=null"><v-icon name="x"/></button><h3>{{modal==='day'?'添加纪念日':'记录故事'}}</h3><form @submit.prevent="saveModal"><input required name="title" placeholder="标题"><input required name="date" type="date"><label class="remind-field" v-if="modal==='day'"><span>提前提醒</span><select name="remindDays"><option value="0">当天</option><option value="1" selected>提前1天</option><option value="3">提前3天</option><option value="7">提前7天</option><option value="30">提前30天</option></select></label><textarea v-if="modal==='story'" required name="text" placeholder="那天发生了什么…"/><button class="primary">保存</button></form></div></div>
</div><div class="loading load-error" v-else-if="loadError"><v-icon name="cloud-off"/><b>暂时无法读取云端数据</b><span>请检查网络后重试，避免显示不准确的数据。</span><button @click="reloadPage">重新连接</button></div><div class="loading" v-else><v-icon name="heart" fill="currentColor"/>正在打开我们的故事…</div>`,
});
