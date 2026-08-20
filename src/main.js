import Vue from "vue/dist/vue.esm.js";
import { icons } from "lucide";
import { Capacitor } from "@capacitor/core";
import { App as NativeApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Share } from "@capacitor/share";
import { CapacitorCalendar } from "@ebarooni/capacitor-calendar";
import { Lunar } from "lunar-javascript";
import * as exifr from "exifr";
import "./style.css";

const PHOTO = `${import.meta.env.BASE_URL}temple-couple.jpg`;
const MUSIC_PREVIEW = `${
  import.meta.env.BASE_URL
}audio/duo-xingyun-preview.m4a`;
const LOCAL_BACKUP_KEY = "only-us-backup";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const COUPLE_ID = import.meta.env.VITE_COUPLE_ID;
const UPDATE_URLS = [
  "https://raw.githubusercontent.com/zyf-coder/FLX/main/public/update.json",
  "https://zyf-coder.github.io/FLX/update.json",
];
const GITHUB_APK_URL = "https://github.com/zyf-coder/FLX/raw/refs/heads/main/public/downloads/OnlyUs-Android.apk";
const WEB_VERSION = "1.4.14";
const BOUND_EMAIL_ACCOUNTS = {
  a: {
    emailHash:
      "9a9b2100bd1cf27aa7d1d0d23e16c314e752391330ba03d200b0c04300cff4a1",
    emailMasked: "2409****207@qq.com",
  },
  b: {
    emailHash:
      "f7a48ade9ec343a07ca465746464e08e1e4300491ba9865ff5f61b2e0fcea3bf",
    emailMasked: "1161****837@qq.com",
  },
};
const AUTH_KEY = "only-us-auth";
const SESSION_KEY = "only-us-session";
const REMEMBERED_PASSWORDS_KEY = "only-us-remembered-passwords";
const rememberedPasswords = (() => {
  try {
    return (
      JSON.parse(localStorage.getItem(REMEMBERED_PASSWORDS_KEY) || "{}") || {}
    );
  } catch (error) {
    return {};
  }
})();
const lastLoginUser = localStorage.getItem("only-us-user") || "a";
const APP_PASSCODES = {
  a: import.meta.env.VITE_APP_PASSCODE_A || "zhangyafei",
  b: import.meta.env.VITE_APP_PASSCODE_B || "xudan",
};
const isNewerVersion = (latest, current) => {
  const latestIsDateVersion = /^\d{8}\.\d+$/.test(String(latest));
  const currentIsDateVersion = /^\d{8}\.\d+$/.test(String(current));
  if (currentIsDateVersion && !latestIsDateVersion) return true;
  if (!currentIsDateVersion && latestIsDateVersion) return false;
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
    avatarA: "",
    avatarB: "",
  },
  photos: [{ id: 1, src: PHOTO, title: "第一次旅行", date: "2024-02-14" }],
  todos: [
    { id: 1, text: "一起看一次海边日出", done: false },
    { id: 2, text: "拍一组四季合照", done: false },
    { id: 3, text: "去对方长大的地方走走", done: false },
  ],
  days: [
    {
      id: 20251030,
      title: "小张同学的生日",
      date: "2026-10-30",
      icon: "🎂",
      remindDays: 30,
      time: "09:00",
      calendar: "solar",
    },
    {
      id: 1010,
      title: "徐老师的生日",
      date: "2026-11-18",
      icon: "🎂",
      remindDays: 30,
      time: "09:00",
      calendar: "lunar",
      lunarMonth: 10,
      lunarDay: 10,
    },
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
  letters: [],
};
const clone = (value) => JSON.parse(JSON.stringify(value));
const createId = () =>
  crypto.randomUUID?.() ||
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const sha256 = async (value) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};
const imageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片读取失败"));
    };
    image.src = url;
  });
const canvasBlob = (canvas, type = "image/jpeg", quality = 0.84) =>
  new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("图片压缩失败"))),
      type,
      quality
    )
  );
const compressPhoto = async (file, maxSize = 2048) => {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  const image = await imageFromFile(file);
  const scale = Math.min(
    1,
    maxSize / Math.max(image.naturalWidth, image.naturalHeight)
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvasBlob(canvas);
};
const videoPosterBlob = (file) => new Promise((resolve, reject) => {
  const video = document.createElement("video");
  const url = URL.createObjectURL(file);
  video.muted = true; video.playsInline = true; video.preload = "metadata";
  video.onloadeddata = () => { video.currentTime = Math.min(0.05, video.duration / 2 || 0.05); };
  video.onseeked = async () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 360;
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve(await canvasBlob(canvas));
    } catch (error) { reject(error); }
    URL.revokeObjectURL(url);
  };
  video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("视频封面生成失败")); };
  video.src = url;
});
const cropAvatar = async (file) => {
  const image = await imageFromFile(file);
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  const sx = (image.naturalWidth - side) / 2;
  const sy = (image.naturalHeight - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  canvas.getContext("2d").drawImage(image, sx, sy, side, side, 0, 0, 512, 512);
  return canvas.toDataURL("image/jpeg", 0.84);
};
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
const emailOtpApi = async (action, email, token = "") => {
  const endpoint = action === "send" ? "otp" : "verify";
  const body =
    action === "send"
      ? { email, create_user: true, email_redirect_to: "https://zyf-coder.github.io/FLX/" }
      : { email, token, type: "email" };
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${endpoint}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("邮箱验证码发送或验证失败");
};
const uploadStorageObject = async (path, blob, onProgress = () => {}) => {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(
          "POST",
          `${SUPABASE_URL}/storage/v1/object/couple-photos/${path}`
        );
        xhr.timeout = 45000;
        xhr.setRequestHeader("apikey", SUPABASE_KEY);
        xhr.setRequestHeader("Authorization", `Bearer ${SUPABASE_KEY}`);
        xhr.setRequestHeader("x-couple-id", COUPLE_ID);
        xhr.setRequestHeader("Content-Type", blob.type || "image/jpeg");
        xhr.setRequestHeader("x-upsert", "false");
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable)
            onProgress(
              Math.min(99, Math.round((event.loaded / event.total) * 100))
            );
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`上传失败：${xhr.status}`));
        xhr.onerror = () => reject(new Error("网络连接中断"));
        xhr.ontimeout = () => reject(new Error("上传超时"));
        xhr.send(blob);
      });
      onProgress(100);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("照片上传失败");
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
  const item = value && typeof value === "object" ? value : null;
  if (item?.calendar === "lunar") {
    const now = new Date();
    let year = Lunar.fromDate(now).getYear();
    let solar = Lunar.fromYmd(
      year,
      Number(item.lunarMonth),
      Number(item.lunarDay)
    ).getSolar();
    let date = new Date(
      solar.getYear(),
      solar.getMonth() - 1,
      solar.getDay(),
      hour
    );
    if (date.getTime() <= now.getTime()) {
      solar = Lunar.fromYmd(
        year + 1,
        Number(item.lunarMonth),
        Number(item.lunarDay)
      ).getSolar();
      date = new Date(
        solar.getYear(),
        solar.getMonth() - 1,
        solar.getDay(),
        hour
      );
    }
    return date;
  }
  const dateValue = item ? item.date : value;
  const date = new Date(
    `${String(dateValue).slice(0, 10)}T${String(hour).padStart(2, "0")}:00:00`
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
  avatarA: "",
  avatarB: "",
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
  props: ["items", "editable"],
  template: `<div class="timeline"><article v-for="(x,i) in items" :key="x.id"><i><v-icon v-if="i===items.length-1" name="heart" fill="currentColor"/><span v-else/></i><div><time>{{x.date}}</time><b>{{x.title}}</b><p>{{x.text}}</p><button v-if="editable" class="timeline-delete" title="删除这条故事" @click="$emit('remove',x)"><v-icon name="trash-2"/>删除</button></div></article></div>`,
});
Vue.component("love-note", {
  props: ["note", "profile"],
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
    avatar() {
      if (!this.profile) return "";
      return this.note.author === this.profile.b
        ? this.profile.avatarB
        : this.profile.avatarA;
    },
  },
  template: `<article class="note"><div><img v-if="avatar()" :src="avatar()" :alt="note.author"><span v-else>{{note.author[0]}}</span></div><p><b>{{note.author}}</b><span>{{note.text}}</span><small>{{displayTime(note.time)}}</small></p></article>`,
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
      return nextAnnualDate(item).getTime();
    },
    dateLabel(item) {
      const label = nextAnnualDate(item).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      return item.calendar === "lunar" ? `农历十月初十 · ${label}` : label;
    },
    recurrenceLabel(item) {
      if (item.calendar === "lunar")
        return `每年农历${item.lunarMonth}月${item.lunarDay}日`;
      return "每年公历重复";
    },
    reminderDays(item) {
      return item.remindDays === 0 ? 0 : item.remindDays || 1;
    },
  },
  template: `<section class="anniversary-page"><div class="anniversary-head"><div><span>我们的</span><h2>纪念日</h2></div><button title="添加纪念日" @click="$emit('add')"><v-icon name="plus"/></button></div><article class="together-card"><p>{{together.title}}</p><div class="big-duration"><strong>{{parts(together.date,true).days}}</strong><span>天</span><strong>{{pad(parts(together.date,true).hours)}}</strong><span>时</span><strong>{{pad(parts(together.date,true).minutes)}}</strong><span>分</span><strong>{{pad(parts(together.date,true).seconds)}}</strong><span>秒</span></div><footer>从 2025年10月26日 开始</footer></article><div class="day-section"><button class="section-label" @click="countdownOpen=!countdownOpen"><span>倒数纪念日 · {{items.length}}</span><i/><v-icon :name="countdownOpen?'chevron-up':'chevron-down'"/></button><div class="anniversary-grid" v-show="countdownOpen"><article class="event-card countdown-card" v-for="item in items" :key="item.id"><button class="event-delete" title="删除纪念日" @click="$emit('remove',item)"><v-icon name="trash-2"/></button><div class="event-title"><i><v-icon name="heart"/></i><b>{{item.title}}</b></div><div class="event-duration"><strong>{{parts(nextDate(item)).days}}</strong><span>天</span><strong>{{pad(parts(nextDate(item)).hours)}}</strong><span>时</span><strong>{{pad(parts(nextDate(item)).minutes)}}</strong><span>分</span><strong>{{pad(parts(nextDate(item)).seconds)}}</strong><span>秒</span></div><div class="event-meta"><span><v-icon name="refresh-cw"/>{{recurrenceLabel(item)}}</span><span><v-icon name="bell"/>{{reminderDays(item)===0?'当天提醒':'提前'+reminderDays(item)+'天提醒'}}</span></div><small class="event-date">{{dateLabel(item)}}</small><button class="calendar-action" @click="$emit('calendar',item)"><v-icon name="calendar-plus"/>添加到手机日历</button></article><button class="empty-add" v-if="!items.length" @click="$emit('add')"><v-icon name="plus"/>添加第一个纪念日</button></div></div><div class="day-section elapsed-section"><button class="section-label" @click="elapsedOpen=!elapsedOpen"><span>共同经历</span><i/><v-icon :name="elapsedOpen?'chevron-up':'chevron-down'"/></button><div class="anniversary-grid" v-show="elapsedOpen"><article class="event-card elapsed-card" v-for="item in elapsed" :key="item.id"><div class="event-title"><i><v-icon name="heart"/></i><b>{{item.title}}</b></div><div class="event-duration"><strong>{{parts(item.date,true).days}}</strong><span>天</span></div><div class="event-meta">{{item.caption}}</div><v-icon class="card-mark" name="heart-handshake"/></article></div></div></section>`,
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
    currentVersion: WEB_VERSION,
    updateInfo: null,
    updateModal: false,
    quickAddOpen: false,
    appNotice: "",
    appNoticeType: "success",
    profileEditing: false,
    profileDraft: null,
    authenticated: localStorage.getItem(AUTH_KEY) === "yes",
    sessionId: localStorage.getItem(SESSION_KEY) || "",
    loginUser: lastLoginUser,
    loginPasscode: rememberedPasswords[lastLoginUser] || "",
    rememberPassword: Boolean(rememberedPasswords[lastLoginUser]),
    loginError: "",
    logoutConfirm: false,
    accountModal: "",
    accountStep: "form",
    accountView: "menu",
    loginMode: "password",
    emailInput: "",
    otpInput: "",
    otpVerified: false,
    deleteConfirm: null,
    uploadQueue: [],
    runtimePosters: {},
    photoEditing: null,
    photoDraft: null,
    replaceTarget: null,
    dayCalendar: "solar",
    editingDay: null,
    loginPhotoIndex: 0,
    loginPhotoTimer: null,
    timeHours: Array.from({ length: 24 }, (_, index) =>
      String(index).padStart(2, "0")
    ),
    timeMinutes: Array.from({ length: 12 }, (_, index) =>
      String(index * 5).padStart(2, "0")
    ),
    nav: [
      ["home", "house", "主页"],
      ["album", "images", "相册"],
      ["list", "square-check-big", "清单"],
      ["days", "calendar-heart", "纪念日"],
      ["notes", "message-circle", "留言"],
      ["story", "book-heart", "故事"],
      ["me", "circle-user-round", "我的"],
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
        .map((item) => ({ ...item, nextDate: nextAnnualDate(item) }))
        .sort((a, b) => a.nextDate - b.nextDate)[0];
    },
    latestNotes() {
      return [...this.state.notes]
        .sort((a, b) => (Number(b.time) || 0) - (Number(a.time) || 0))
        .slice(0, 2);
    },
    loginPhotos() {
      const photos = this.state.photos
        .filter((photo) => photo.type !== "video" && !/\.(mp4|mov|webm|m4v)$/i.test(photo.src || ""))
        .map((photo) => photo.src)
        .filter(Boolean);
      return photos.length ? photos : [PHOTO];
    },
    loginPhoto() {
      return this.loginPhotos[this.loginPhotoIndex % this.loginPhotos.length];
    },
    sortedPhotos() {
      return [...this.state.photos].sort(
        (a, b) => (Number(a.uploadedAt) || 0) - (Number(b.uploadedAt) || 0)
      );
    },
  },
  watch: {
    state: {
      deep: true,
      handler(v) {
        if (this.ready && !this.applyingRemote) this.persistState(v, true);
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
    let migratedPhotoPath = false;
    this.state.photos = this.state.photos.map((photo) => {
      if (String(photo.src).startsWith("/FLX/")) {
        migratedPhotoPath = true;
        return {
          ...photo,
          src: `https://zyf-coder.github.io${photo.src}`,
        };
      }
      return photo;
    });
    this.state.notes = this.state.notes.map((note) => ({
      ...note,
      time: note.time === "刚刚" ? Date.now() : note.time,
    }));
    this.state.profile.avatarA = this.state.profile.avatarA || "";
    this.state.profile.avatarB = this.state.profile.avatarB || "";
    this.state.letters = this.state.letters || [];
    this.state.meta = this.state.meta || {};
    this.state.meta.sessions = this.state.meta.sessions || {};
    this.state.meta.accounts = this.state.meta.accounts || {};
    for (const [user, email] of Object.entries(BOUND_EMAIL_ACCOUNTS)) {
      const account = this.state.meta.accounts[user] || {};
      this.$set(
        this.state.meta.accounts,
        user,
        account.emailHash ? account : { ...account, ...email }
      );
    }
    if (!this.state.meta.todoDefaultsCleared) {
      this.state.todos.forEach((todo) => (todo.done = false));
      this.state.meta.todoDefaultsCleared = true;
    }
    this.state.stories = Array.isArray(this.state.stories)
      ? this.state.stories
      : clone(defaults.stories);
    this.ready = true;
    this.loginPhotoTimer = setInterval(() => {
      this.loginPhotoIndex =
        (this.loginPhotoIndex + 1) % this.loginPhotos.length;
    }, 6500);
    if (migratedPhotoPath) this.persistState(this.state, true);
    this.lastCloudVersion = this.state._updatedAt || 0;
    if (this.authenticated) {
      const remoteSession = this.state.meta.sessions[this.loginUser];
      if (this.sessionId && remoteSession && remoteSession !== this.sessionId) {
        this.forceLogout("账号已在其他设备登录，本机已退出");
      } else {
        this.sessionId = this.sessionId || createId();
        localStorage.setItem(SESSION_KEY, this.sessionId);
        this.$set(this.state.meta.sessions, this.loginUser, this.sessionId);
      }
    }
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
    clearInterval(this.loginPhotoTimer);
  },
  methods: {
    async login() {
      const passcode = this.loginPasscode;
      const passwordHash =
        this.state.meta?.accounts?.[this.loginUser]?.passwordHash;
      const valid = passwordHash
        ? (await sha256(passcode)) === passwordHash
        : passcode === APP_PASSCODES[this.loginUser];
      if (!valid) {
        this.loginError = `${
          this.loginUser === "a" ? "小张同学" : "徐老师"
        }的密码不正确，请重新输入`;
        this.loginPasscode = "";
        return;
      }
      this.finishLogin(passcode);
    },
    finishLogin(passcode = "") {
      if (this.rememberPassword && passcode) {
        rememberedPasswords[this.loginUser] = passcode;
      } else if (passcode) {
        delete rememberedPasswords[this.loginUser];
      }
      localStorage.setItem(
        REMEMBERED_PASSWORDS_KEY,
        JSON.stringify(rememberedPasswords)
      );
      this.authenticated = true;
      this.loginError = "";
      this.sessionId = createId();
      localStorage.setItem(AUTH_KEY, "yes");
      localStorage.setItem("only-us-user", this.loginUser);
      localStorage.setItem(SESSION_KEY, this.sessionId);
      this.state.meta = this.state.meta || {};
      this.state.meta.sessions = this.state.meta.sessions || {};
      this.$set(this.state.meta.sessions, this.loginUser, this.sessionId);
      this.showNotice("登录成功");
    },
    selectLoginUser(user) {
      this.loginUser = user;
      this.loginError = "";
      this.loginPasscode = rememberedPasswords[user] || "";
      this.rememberPassword = Boolean(rememberedPasswords[user]);
    },
    logout() {
      this.logoutConfirm = true;
    },
    confirmLogout() {
      this.logoutConfirm = false;
      if (this.state.meta?.sessions?.[this.loginUser] === this.sessionId)
        this.$set(this.state.meta.sessions, this.loginUser, null);
      this.forceLogout("");
    },
    forceLogout(message) {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem("only-us-user");
      localStorage.removeItem(SESSION_KEY);
      this.sessionId = "";
      this.profileEditing = false;
      this.profileDraft = null;
      this.loginError = message;
      this.authenticated = false;
      this.go("home");
    },
    openAccountSecurity() {
      this.accountModal = "security";
      this.accountView = "menu";
      this.accountStep = "form";
      this.emailInput = "";
      this.otpInput = "";
      this.otpVerified = false;
    },
    openAccountSection(view) {
      this.accountView = view;
      this.accountStep = "form";
      this.emailInput = "";
      this.otpInput = "";
    },
    openForgotPassword() {
      this.accountModal = "forgot";
      this.accountStep = "email";
      this.emailInput = "";
      this.otpInput = "";
      this.otpVerified = false;
    },
    async changePassword(event) {
      const form = new FormData(event.target);
      const current = String(form.get("current") || "");
      const next = String(form.get("next") || "");
      const confirmNext = String(form.get("confirmNext") || "");
      const account = this.state.meta?.accounts?.[this.loginUser] || {};
      const currentValid = account.passwordHash
        ? (await sha256(current)) === account.passwordHash
        : current === APP_PASSCODES[this.loginUser];
      if (!currentValid) return this.showNotice("当前密码不正确");
      if (next.length < 6) return this.showNotice("新密码至少需要6位");
      if (next !== confirmNext) return this.showNotice("两次新密码输入不一致");
      this.state.meta.accounts = this.state.meta.accounts || {};
      this.$set(this.state.meta.accounts, this.loginUser, {
        ...account,
        passwordHash: await sha256(next),
      });
      rememberedPasswords[this.loginUser] = next;
      localStorage.setItem(
        REMEMBERED_PASSWORDS_KEY,
        JSON.stringify(rememberedPasswords)
      );
      this.loginPasscode = next;
      this.accountModal = "";
      this.showNotice("密码修改成功并已同步到云端");
    },
    async sendEmailOtp() {
      const email = this.emailInput.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return this.showNotice("请输入正确的邮箱地址");
      const account = this.state.meta?.accounts?.[this.loginUser] || {};
      const emailHash = await sha256(email);
      if (
        this.accountModal === "forgot" &&
        (!account.emailHash || emailHash !== account.emailHash)
      )
        return this.showNotice("邮箱与当前账号绑定信息不一致");
      try {
        await emailOtpApi("send", email);
        this.accountStep = "otp";
        this.showNotice("验证码已发送");
      } catch (error) {
        this.showNotice("邮箱验证码发送失败");
        console.warn("发送邮箱验证码失败", error);
      }
    },
    async sendLoginOtp() {
      const email = this.emailInput.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return this.showNotice("请输入正确的邮箱地址");
      const account = this.state.meta?.accounts?.[this.loginUser] || {};
      if ((await sha256(email)) !== account.emailHash)
        return this.showNotice("邮箱与所选账号不一致");
      try {
        await emailOtpApi("send", email);
        this.accountStep = "loginOtp";
        this.showNotice("验证码已发送");
      } catch (error) {
        this.showNotice("邮箱验证码发送失败");
        console.warn("登录验证码发送失败", error);
      }
    },
    async verifyLoginOtp() {
      try {
        await emailOtpApi(
          "verify",
          this.emailInput.trim().toLowerCase(),
          this.otpInput.trim()
        );
        this.finishLogin();
      } catch (error) {
        this.showNotice("验证码错误或已失效");
      }
    },
    async verifyEmailOtp() {
      if (!/^\d{4,8}$/.test(this.otpInput.trim()))
        return this.showNotice("请输入邮箱验证码");
      try {
        await emailOtpApi(
          "verify",
          this.emailInput.trim().toLowerCase(),
          this.otpInput.trim()
        );
        this.otpVerified = true;
        if (this.accountModal === "security") {
          this.state.meta.accounts = this.state.meta.accounts || {};
          this.$set(this.state.meta.accounts, this.loginUser, {
            ...(this.state.meta.accounts[this.loginUser] || {}),
            emailHash: await sha256(this.emailInput.trim().toLowerCase()),
            emailMasked: this.emailInput
              .trim()
              .toLowerCase()
              .replace(/^(.{4}).*(@.*)$/, "$1****$2"),
          });
          this.accountModal = "";
          this.showNotice("邮箱绑定成功");
        } else {
          this.accountStep = "reset";
        }
      } catch (error) {
        this.showNotice("验证码错误或已失效");
      }
    },
    async resetForgottenPassword(event) {
      if (!this.otpVerified) return;
      const form = new FormData(event.target);
      const next = String(form.get("next") || "");
      const confirmNext = String(form.get("confirmNext") || "");
      if (next.length < 6) return this.showNotice("新密码至少需要6位");
      if (next !== confirmNext) return this.showNotice("两次新密码输入不一致");
      this.state.meta.accounts = this.state.meta.accounts || {};
      this.$set(this.state.meta.accounts, this.loginUser, {
        ...(this.state.meta.accounts[this.loginUser] || {}),
        passwordHash: await sha256(next),
      });
      rememberedPasswords[this.loginUser] = next;
      localStorage.setItem(
        REMEMBERED_PASSWORDS_KEY,
        JSON.stringify(rememberedPasswords)
      );
      this.loginPasscode = next;
      this.accountModal = "";
      this.showNotice("密码已重置，请登录");
    },
    async persistState(value, silent = false) {
      this.cloudSync = "正在保存到云端";
      const result = await storage.set(value);
      this.lastCloudVersion = result.updatedAt;
      this.cloudSync = result.saved
        ? "已实时保存到云端"
        : "网络异常，等待重新上传";
      if (!silent) {
        this.showNotice(
          result.saved ? "已成功保存到云端" : "保存失败，请检查网络后重试"
        );
      }
      return result;
    },
    async pullCloudState() {
      try {
        const remote = await cloud.get();
        const remoteSession = remote?.meta?.sessions?.[this.loginUser];
        if (
          this.authenticated &&
          this.sessionId &&
          remoteSession &&
          remoteSession !== this.sessionId
        ) {
          this.forceLogout("账号已在其他设备登录，本机已退出");
          return;
        }
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
        if (!isActive && this.$refs.bgm) {
          this.$refs.bgm.pause();
          return;
        }
        if (isActive) this.checkForUpdate();
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
      const at = nextAnnualDate(item, 9);
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
        if (this.deleteConfirm) {
          this.deleteConfirm = null;
          return;
        }
        if (this.photoEditing) {
          this.photoEditing = null;
          return;
        }
        if (this.accountModal) {
          this.accountModal = "";
          return;
        }
        if (this.logoutConfirm) {
          this.logoutConfirm = false;
          return;
        }
        if (this.updateModal) {
          this.updateModal = false;
          return;
        }
        if (this.quickAddOpen) {
          this.quickAddOpen = false;
          return;
        }
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
    async checkForUpdate(manual = false) {
      try {
        const appInfo = Capacitor.isNativePlatform()
          ? await NativeApp.getInfo()
          : { version: WEB_VERSION };
        this.currentVersion = appInfo.version;
        let update = null;
        for (const url of UPDATE_URLS) {
          try {
            const response = await fetch(`${url}?t=${Date.now()}`, {
              cache: "no-store",
            });
            if (!response.ok) continue;
            const candidate = await response.json();
            candidate.androidUrl = GITHUB_APK_URL;
            if (!update || isNewerVersion(candidate.version, update.version))
              update = candidate;
          } catch (error) {
            console.warn("更新源暂不可用", url, error);
          }
        }
        if (!update) throw new Error("所有更新源均不可用");
        if (isNewerVersion(update.version, appInfo.version)) {
          this.updateInfo = update;
          this.updateModal = true;
        } else if (manual) {
          this.showNotice("当前已是最新版本");
        }
      } catch (error) {
        if (manual) this.showNotice("暂时无法检查更新");
        console.warn("检查更新失败", error);
      }
    },
    async installUpdate() {
      if (!this.updateInfo) return;
      await Browser.open({ url: this.updateInfo.androidUrl });
    },
    showNotice(message) {
      const cleanMessage = String(message)
        .replace("密码修改成功并已同步到云端", "密码修改成功")
        .replace("头像已更新并同步到云端", "头像已更新")
        .replace("照片纪念文字已保存到云端", "已保存")
        .replace("故事已删除并同步到云端", "故事已删除")
        .replace("已成功保存到云端", "已保存")
        .replace("已保存到云端", "上传成功");
      this.appNoticeType = /失败|错误|不正确|无法|未能|中断/.test(cleanMessage)
        ? "error"
        : /正在|请输入|请完整|暂时|当前已是/.test(cleanMessage)
        ? "info"
        : "success";
      this.appNotice = cleanMessage;
      setTimeout(() => {
        if (this.appNotice === cleanMessage) this.appNotice = "";
      }, 2600);
    },
    chooseQuickAdd(target) {
      this.quickAddOpen = false;
      if (target === "photo") {
        this.go("album");
        this.$nextTick(() => this.$refs.file?.click());
      } else if (target === "day") {
        this.go("days");
        this.modal = "day";
      } else {
        this.go(target);
      }
    },
    async changeAvatar(key, event) {
      const file = event.target.files?.[0];
      if (!file) return;
      this.showNotice("正在处理头像");
      try {
        const avatar = await cropAvatar(file);
        this.$set(this.state.profile, key, avatar);
        this.showNotice("头像已更新并同步到云端");
      } catch (error) {
        this.showNotice("头像处理失败，请换一张照片重试");
        console.warn("头像处理失败", error);
      } finally {
        event.target.value = "";
      }
    },
    startProfileEdit() {
      this.profileDraft = {
        a: this.state.profile.a,
        b: this.state.profile.b,
        since: this.state.profile.since,
        quote: this.state.profile.quote,
      };
      this.profileEditing = true;
    },
    cancelProfileEdit() {
      this.profileEditing = false;
      this.profileDraft = null;
    },
    saveProfile() {
      if (
        !this.profileDraft.a.trim() ||
        !this.profileDraft.b.trim() ||
        !this.profileDraft.since
      ) {
        this.showNotice("请完整填写昵称和恋爱日期");
        return;
      }
      Object.assign(this.state.profile, {
        a: this.profileDraft.a.trim(),
        b: this.profileDraft.b.trim(),
        since: this.profileDraft.since,
        quote: this.profileDraft.quote.trim(),
      });
      this.cancelProfileEdit();
      this.showNotice("已保存");
    },
    addLetter() {
      const text = this.$refs.letterText.value.trim();
      const openDate = this.$refs.letterDate.value;
      if (!text || !openDate) return;
      this.state.letters.unshift({
        id: Date.now(),
        text,
        openDate,
        createdAt: Date.now(),
      });
      this.$refs.letterText.value = "";
      this.showNotice("未来信已封存");
    },
    letterReady(letter) {
      return new Date(`${letter.openDate}T00:00:00`).getTime() <= Date.now();
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
      window.scrollTo(0, 0);
      this.tab = t;
      this.menu = false;
      this.$nextTick(() => window.scrollTo(0, 0));
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
      if (!text) {
        this.showNotice("请输入清单内容", "info");
        return;
      }
      this.state.todos.push({ id: Date.now(), text, done: false });
      this.$refs.todo.value = "";
      this.showNotice("已添加到清单");
    },
    editAnniversary(item) {
      this.editingDay = item;
      this.dayCalendar = item.calendar || "solar";
      this.modal = "day";
    },
    confirmDelete(collection, id, label) {
      this.deleteConfirm = {
        title: `删除“${label}”？`,
        text: "删除后无法撤销，请确认是否继续。",
        action: () => {
          this.state[collection] = this.state[collection].filter(
            (item) => item.id !== id
          );
          this.showNotice("已删除");
        },
      };
    },
    async removeAnniversary(item) {
      this.deleteConfirm = {
        title: `删除纪念日“${item.title}”？`,
        text: "删除后对应的日历提醒也会取消。",
        action: () => this.performRemoveAnniversary(item),
      };
    },
    async performRemoveAnniversary(item) {
      this.state.days = this.state.days.filter((day) => day.id !== item.id);
      if (Capacitor.isNativePlatform()) {
        const id = Math.max(
          1,
          Number(String(item.id).replace(/\D/g, "").slice(-8)) || 1
        );
        await LocalNotifications.cancel({ notifications: [{ id }] });
      }
      this.showNotice("纪念日已删除");
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
    async photos(e) {
      const files = [...e.target.files];
      let completed = 0;
      for (const [index, file] of files.entries()) {
        const queueId = createId();
        const preview = URL.createObjectURL(file);
        const pending = {
          id: queueId,
          preview,
          type: file.type.startsWith("video/") ? "video" : "image",
          title: file.name.replace(/\.[^.]+$/, ""),
          progress: 0,
          status: "正在处理",
        };
        this.uploadQueue.push(pending);
        try {
          let photoTitle = "";
          try {
            const gps = await exifr.gps(file);
            if (gps?.latitude && gps?.longitude) {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=zh-CN&lat=${gps.latitude}&lon=${gps.longitude}`
              );
              if (response.ok) {
                const place = await response.json();
                const address = place.address || {};
                photoTitle = [
                  address.city || address.town || address.county,
                  address.suburb || address.village,
                  address.road || address.neighbourhood,
                ]
                  .filter(Boolean)
                  .join(" · ");
              }
            }
          } catch (error) {
            console.warn("照片地址读取失败", error);
          }
          const isVideo = file.type.startsWith("video/");
          if (isVideo && file.size > 100 * 1024 * 1024)
            throw new Error("视频大小不能超过 100MB");
          const uploadBlob = isVideo ? file : await compressPhoto(file);
          const id = createId();
          const extension = isVideo
            ? (file.name.split(".").pop() || "mp4").toLowerCase()
            : "jpg";
          const storagePath = `${COUPLE_ID}/${id}.${extension}`;
          pending.status = "正在上传";
          await uploadStorageObject(storagePath, uploadBlob, (progress) => {
            pending.progress = progress;
          });
          let poster = "";
          if (isVideo) {
            try {
              const posterPath = `${COUPLE_ID}/${id}-poster.jpg`;
              await uploadStorageObject(posterPath, await videoPosterBlob(file));
              poster = `${SUPABASE_URL}/storage/v1/object/public/couple-photos/${posterPath}`;
            } catch (error) { console.warn("视频封面生成失败", error); }
          }
          this.state.photos.push({
            id,
            src: `${SUPABASE_URL}/storage/v1/object/public/couple-photos/${storagePath}`,
            storagePath,
            type: isVideo ? "video" : "image",
            poster,
            title: photoTitle,
            date: new Date().toISOString().slice(0, 10),
            uploadedAt: Date.now(),
          });
          completed += 1;
          pending.status = "上传成功";
          await new Promise((resolve) => setTimeout(resolve, 450));
          URL.revokeObjectURL(preview);
          this.uploadQueue = this.uploadQueue.filter(
            (item) => item.id !== queueId
          );
        } catch (error) {
          console.warn("照片上传失败", error);
          pending.status = "上传失败，请重新选择";
          pending.failed = true;
          this.showNotice(
            error.message || `第 ${index + 1} 个媒体上传失败，请重试`
          );
        }
      }
      if (completed) this.showNotice(`${completed} 个照片或视频已保存`);
      e.target.value = "";
    },
    ensureVideoPoster(photo, event) {
      if (!photo || photo.poster || this.runtimePosters[photo.id]) return;
      const video = event.currentTarget;
      if (!video || video.dataset.posterPending === "yes") return;
      video.dataset.posterPending = "yes";
      const capture = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
          canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
          this.$set(this.runtimePosters, photo.id, canvas.toDataURL("image/jpeg", 0.82));
        } catch (error) {
          console.warn("视频首帧读取失败", error);
        } finally {
          delete video.dataset.posterPending;
        }
      };
      const firstFrameTime = Math.min(0.08, Math.max(0, (video.duration || 0) / 2));
      if (Math.abs(video.currentTime - firstFrameTime) < 0.01) capture();
      else {
        video.addEventListener("seeked", capture, { once: true });
        video.currentTime = firstFrameTime;
      }
    },
    async removePhoto(photo) {
      this.deleteConfirm = {
        title: `删除照片“${photo.title}”？`,
        text: "照片和纪念文字删除后无法恢复。",
        action: () => this.performRemovePhoto(photo),
      };
    },
    async performRemovePhoto(photo) {
      if (photo.storagePath) {
        await fetch(
          `${SUPABASE_URL}/storage/v1/object/couple-photos/${photo.storagePath}`,
          {
            method: "DELETE",
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              "x-couple-id": COUPLE_ID,
            },
          }
        );
      }
      if (photo.poster) {
        const posterPath = photo.poster.split("/couple-photos/")[1];
        if (posterPath)
          await fetch(
            `${SUPABASE_URL}/storage/v1/object/couple-photos/${posterPath}`,
            { method: "DELETE", headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "x-couple-id": COUPLE_ID } }
          );
      }
      this.state.photos = this.state.photos.filter(
        (item) => item.id !== photo.id
      );
      this.showNotice("照片已删除");
    },
    replacePhoto(photo) {
      this.replaceTarget = photo;
      this.$refs.replaceFile.click();
    },
    async replacePhotoFile(e) {
      const file = e.target.files?.[0];
      const target = this.replaceTarget;
      if (!file || !target) return;
      try {
        const isVideo = file.type.startsWith("video/");
        const blob = isVideo ? file : await compressPhoto(file);
        const id = createId();
        const ext = isVideo ? (file.name.split(".").pop() || "mp4").toLowerCase() : "jpg";
        const path = COUPLE_ID + "/" + id + "." + ext;
        await uploadStorageObject(path, blob);
        let poster = "";
        if (isVideo) {
          const posterPath = COUPLE_ID + "/" + id + "-poster.jpg";
          await uploadStorageObject(posterPath, await videoPosterBlob(file));
          poster = SUPABASE_URL + "/storage/v1/object/public/couple-photos/" + posterPath;
        }
        const oldPath = target.storagePath;
        this.$set(target, "src", SUPABASE_URL + "/storage/v1/object/public/couple-photos/" + path);
        this.$set(target, "storagePath", path);
        this.$set(target, "type", isVideo ? "video" : "image");
        this.$set(target, "poster", poster);
        this.$set(target, "uploadedAt", Date.now());
        if (oldPath) await fetch(SUPABASE_URL + "/storage/v1/object/couple-photos/" + oldPath, { method: "DELETE", headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY, "x-couple-id": COUPLE_ID } });
        this.showNotice("相册媒体已替换");
      } catch (error) {
        this.showNotice(error.message || "替换失败", "error");
      }
      this.replaceTarget = null;
      e.target.value = "";
    },
    editPhoto(photo) {
      this.photoEditing = photo;
      this.photoDraft = {
        title: photo.title || "",
        date: photo.date || new Date().toISOString().slice(0, 10),
        description: photo.description || "",
      };
    },
    savePhotoText() {
      if (!this.photoEditing || !this.photoDraft?.title.trim()) return;
      this.$set(this.photoEditing, "title", this.photoDraft.title.trim());
      this.$set(this.photoEditing, "date", this.photoDraft.date);
      this.$set(
        this.photoEditing,
        "description",
        this.photoDraft.description.trim()
      );
      this.photoEditing = null;
      this.photoDraft = null;
      this.showNotice("照片纪念文字已保存到云端");
    },
    async addToPhoneCalendar(day) {
      if (!Capacitor.isNativePlatform()) return;
      try {
        const [hour, minute] = (day.time || "09:00").split(":").map(Number);
        const start = nextAnnualDate(day, hour);
        start.setMinutes(minute || 0, 0, 0);
        await CapacitorCalendar.createEventWithPrompt({
          title: day.title,
          startDate: start.getTime(),
          endDate: start.getTime() + 60 * 60 * 1000,
          description: `Only Us 纪念日 · 提前${day.remindDays || 0}天提醒`,
        });
      } catch (error) {
        this.showNotice("未能打开系统日历，请检查日历权限");
        console.warn("添加系统日历失败", error);
      }
    },
    saveModal(e) {
      const f = new FormData(e.target);
      if (this.modal === "day") {
        const day = {
          id: Date.now(),
          title: f.get("title"),
          date: f.get("date") || new Date().toISOString().slice(0, 10),
          icon: "💗",
          remindDays: Number(f.get("remindDays") || 1),
          time: `${f.get("hour") || "09"}:${f.get("minute") || "00"}`,
          calendar: f.get("calendar") || "solar",
        };
        if (day.calendar === "lunar") {
          day.lunarMonth = Number(f.get("lunarMonth"));
          day.lunarDay = Number(f.get("lunarDay"));
          day.date = nextAnnualDate(day).toISOString().slice(0, 10);
        }
        if (this.editingDay) {
          Object.assign(this.editingDay, day, { id: this.editingDay.id });
          this.editingDay = null;
          this.showNotice("纪念日已更新");
        } else {
          this.state.days.push(day);
          this.showNotice("纪念日已添加");
        }
        this.scheduleReminder(day).catch((error) =>
          console.warn("纪念日提醒设置失败", error)
        );
        if (f.get("addCalendar") === "on") this.addToPhoneCalendar(day);
      } else
        this.state.stories.push({
          id: Date.now(),
          title: f.get("title"),
          date: f.get("date").replaceAll("-", "."),
          text: f.get("text"),
        });
      this.modal = null;
      this.editingDay = null;
    },
    removeStory(story) {
      this.deleteConfirm = {
        title: `删除故事“${story.title}”？`,
        text: "删除后无法恢复，请确认是否继续。",
        action: () => {
          this.state.stories = this.state.stories.filter(
            (item) => item.id !== story.id
          );
          this.showNotice("故事已删除");
        },
      };
    },
    runDeleteConfirm() {
      const action = this.deleteConfirm?.action;
      this.deleteConfirm = null;
      if (action) action();
    },
    async exportData() {
      const content = JSON.stringify(this.state, null, 2);
      if (Capacitor.isNativePlatform()) {
        try {
          const fileName = `only-us-backup-${new Date()
            .toISOString()
            .slice(0, 10)}.json`;
          const result = await Filesystem.writeFile({
            path: fileName,
            data: content,
            directory: Directory.Cache,
            encoding: Encoding.UTF8,
          });
          await Share.share({ title: "Only Us 数据备份", url: result.uri });
          this.showNotice("备份文件已生成");
        } catch (error) {
          this.showNotice("导出失败，请重试");
          console.warn("导出失败", error);
        }
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(
        new Blob([content], {
          type: "application/json",
        })
      );
      a.download = "only-us-backup.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      this.showNotice("备份文件已导出");
    },
    importData(e) {
      const r = new FileReader();
      r.onload = () => (this.state = JSON.parse(r.result));
      r.readAsText(e.target.files[0]);
    },
  },
  template: `
<div class="login-screen" v-if="!authenticated"><transition name="login-fade"><img :key="loginPhoto" :src="loginPhoto"/></transition><div class="login-shade"/><div class="login-meteors" aria-hidden="true"><i v-for="n in 7" :key="n" :style="{'--meteor':n}"/></div><section class="login-panel"><span class="login-mark"><v-icon name="heart" fill="currentColor"/></span><small>ONLY US</small><h1>欢迎回到我们的故事</h1><p>选择身份并完成验证</p><div class="login-users"><button type="button" :class="{active:loginUser==='a'}" @click="selectLoginUser('a')"><i><img v-if="state.profile.avatarA" :src="state.profile.avatarA"><span v-else>{{state.profile.a[0]}}</span></i>{{state.profile.a}}</button><button type="button" :class="{active:loginUser==='b'}" @click="selectLoginUser('b')"><i><img v-if="state.profile.avatarB" :src="state.profile.avatarB"><span v-else>{{state.profile.b[0]}}</span></i>{{state.profile.b}}</button></div><div class="login-mode"><button :class="{active:loginMode==='password'}" @click="loginMode='password';accountStep='form'">密码登录</button><button :class="{active:loginMode==='email'}" @click="loginMode='email';accountStep='form'">邮箱登录</button></div><form v-if="loginMode==='password'" autocomplete="on" @submit.prevent="login"><input class="login-username" name="username" autocomplete="username" :value="loginUser==='a'?'zhangyafei':'xudan'" readonly tabindex="-1"><label><v-icon name="key-round"/><input ref="loginPasscode" v-model="loginPasscode" name="password" required type="password" autocomplete="current-password" maxlength="32" placeholder="输入专属密码"></label><div class="login-options"><label class="remember-password"><input v-model="rememberPassword" type="checkbox"><i><v-icon name="check"/></i><span>记住密码</span></label><button type="button" @click="openForgotPassword">忘记密码</button></div><em v-if="loginError">{{loginError}}</em><button :disabled="!ready">{{ready?'进入 Only Us':'正在同步账号'}} <v-icon name="arrow-right"/></button></form><div v-else class="login-sms"><label><v-icon name="mail"/><input v-model="emailInput" inputmode="email" placeholder="输入绑定邮箱"></label><label v-if="accountStep==='loginOtp'"><v-icon name="shield-check"/><input v-model="otpInput" inputmode="numeric" maxlength="8" placeholder="输入邮箱验证码"></label><button v-if="accountStep!=='loginOtp'" :disabled="!ready" @click="sendLoginOtp">获取验证码</button><button v-else @click="verifyLoginOtp">验证并登录 <v-icon name="arrow-right"/></button></div><footer>徐老师与小张同学 · 只属于我们的空间</footer></section><div class="overlay account-overlay" v-if="accountModal==='forgot'"><div class="account-dialog"><button class="account-close" @click="accountModal=''"><v-icon name="x"/></button><span class="account-icon"><v-icon name="key-round"/></span><h3>找回密码</h3><p v-if="accountStep==='email'">输入当前账号绑定的邮箱</p><div v-if="accountStep==='email'" class="account-fields"><input v-model="emailInput" inputmode="email" placeholder="绑定邮箱"><button class="primary" @click="sendEmailOtp">发送验证码</button></div><div v-else-if="accountStep==='otp'" class="account-fields"><input v-model="otpInput" inputmode="numeric" maxlength="8" placeholder="邮箱验证码"><button class="primary" @click="verifyEmailOtp">验证邮箱</button></div><form v-else class="account-fields" @submit.prevent="resetForgottenPassword"><input required name="next" type="password" minlength="6" placeholder="设置新密码"><input required name="confirmNext" type="password" minlength="6" placeholder="再次输入新密码"><button class="primary">确认重置密码</button></form><small>验证码发送失败时，请稍后重试或使用密码登录</small></div></div></div>
<div class="app" v-else-if="ready">
 <div class="app-toast exit-toast" v-if="exitHint"><v-icon name="info"/><span>再返回一次退出 APP</span></div>
 <transition name="toast"><div class="app-toast" :class="'toast-'+appNoticeType" v-if="appNotice"><v-icon :name="appNoticeType==='error'?'circle-alert':appNoticeType==='info'?'info':'check-circle-2'"/><span>{{appNotice}}</span></div></transition>
 <span v-for="h in hearts" :key="h.id" class="rain" :style="{left:h.left+'%',animationDelay:h.delay+'s',fontSize:h.size+'px'}">♥</span>
 <header><button class="brand" @click="go('home')"><span><v-icon name="heart" fill="currentColor"/></span><b>Only Us</b><small>我们的恋爱空间</small></button><nav><button v-for="n in nav" :key="n[0]" :class="{active:tab===n[0]}" @click="go(n[0])"><v-icon :name="n[1]"/>{{n[2]}}</button></nav><div class="tools"><span class="music-label" v-if="music"><i></i>多幸运 · 韩安旭</span><span class="music-hearts" v-if="music" aria-hidden="true"><i v-for="n in 6" :key="n" :style="{'--heart-index':n}">♥</i></span><button :title="music?'暂停《多幸运》':'播放《多幸运》'" @click="toggleMusic"><v-icon :name="music?'music-2':'volume-x'"/></button><button title="爱心雨" @click="rain"><v-icon name="sparkles"/></button><button class="hamb" @click="menu=!menu"><v-icon name="menu"/></button></div></header><audio ref="bgm" :src="'${MUSIC_PREVIEW}'" preload="none" loop @pause="music=false" @play="music=true"></audio>
 <div class="mobile-menu" v-if="menu"><button v-for="n in nav" :key="n[0]" @click="go(n[0])"><v-icon :name="n[1]"/>{{n[2]}}</button></div>
 <nav class="bottom-nav"><button :class="{active:tab==='home'}" @click="go('home')"><v-icon name="house"/><span>首页</span></button><button :class="{active:tab==='list'}" @click="go('list')"><v-icon name="list-checks"/><span>清单</span></button><button class="bottom-add" title="快捷添加" @click="quickAddOpen=true"><v-icon name="plus"/></button><button :class="{active:tab==='future'}" @click="go('future')"><v-icon name="mail"/><span>未来信</span></button><button :class="{active:tab==='me'}" @click="go('me')"><i v-if="updateInfo"/><v-icon name="circle-user-round"/><span>我的</span></button></nav>
 <main>
  <template v-if="tab==='home'">
   <section class="hero"><img :src="'${PHOTO}'"><div class="shade"/><div class="hero-copy"><span class="eyebrow"><span/> OUR LOVE STORY <span/></span><h1>{{state.profile.a}} <v-icon name="heart" fill="currentColor"/> {{state.profile.b}}</h1><p>{{state.profile.quote}}</p><div class="counter"><div><strong>{{loveDays}}</strong><span>相爱的日子</span></div><i/><div><strong>{{startDate}}</strong><span>故事开始于</span></div></div></div><button class="float-heart" @click="rain"><v-icon name="heart" fill="currentColor"/></button></section>
   <section class="quick"><article @click="go('album')"><div class="qicon pink"><v-icon name="images"/></div><div><b>恋爱相册</b><span>{{state.photos.length}} 张珍贵回忆</span></div><v-icon name="chevron-right"/></article><article @click="go('list')"><div class="qicon purple"><v-icon name="square-check-big"/></div><div><b>恋爱清单</b><span>{{doneCount}}/{{state.todos.length}} 已完成</span></div><v-icon name="chevron-right"/></article><article @click="go('days')"><div class="qicon amber"><v-icon name="calendar-heart"/></div><div><b>下个纪念日</b><span>{{nextAnniversary ? nextAnniversary.title : '添加纪念日'}}</span></div><strong>{{nextAnniversary ? until(nextAnniversary) : '+'}}<small>天</small></strong></article></section>
   <section class="home-grid"><div class="panel"><div class="title"><span><v-icon name="clock-3"/></span><div><b>爱情时间线</b><small>每个瞬间，都值得被记住</small></div><button @click="go('story')">查看全部 <v-icon name="chevron-right"/></button></div><love-timeline :items="state.stories.slice(-3)"/></div><div class="panel"><div class="title"><span><v-icon name="message-circle"/></span><div><b>悄悄话</b><small>只给你看的甜蜜留言</small></div><button @click="go('notes')">查看全部 <v-icon name="chevron-right"/></button></div><love-note v-for="n in latestNotes" :key="n.id" :note="n" :profile="state.profile"/></div></section>
   <section class="surprise"><v-icon name="gift"/><div><b>今日份的小惊喜</b><p>点击开启属于你们的浪漫时刻</p></div><button @click="rain">开启惊喜 <v-icon name="sparkles"/></button></section>
  </template>
  <section class="page" v-if="tab==='album'"><div class="page-head"><div><h2>恋爱相册</h2><p>照片、视频和动态照片都可以收藏。</p></div><button class="primary" @click="$refs.file.click()"><v-icon name="camera"/>上传照片 / 视频</button></div><input hidden multiple accept="image/*,video/*,.heic,.heif" type="file" ref="file" @change="photos"><input hidden accept="image/*,video/*,.heic,.heif" type="file" ref="replaceFile" @change="replacePhotoFile"><div class="gallery"><figure class="upload-preview" :class="{failed:item.failed}" v-for="item in uploadQueue" :key="'upload-'+item.id"><video v-if="item.type==='video'" :src="item.preview" muted playsinline autoplay loop/><img v-else :src="item.preview"><div class="upload-progress"><b>{{item.progress}}%</b><span>{{item.status}}</span><i><em :style="{width:item.progress+'%'}"/></i></div></figure><figure class="photo-memory" v-for="p in sortedPhotos" :key="p.id"><video v-if="p.type==='video' || (!p.type && /\.(mp4|mov|webm|m4v)$/i.test(p.src))" :src="p.src" :poster="p.poster || runtimePosters[p.id]" crossorigin="anonymous" controls playsinline preload="auto" @loadeddata="ensureVideoPoster(p,$event)"/><img v-else :src="p.src"><figcaption v-if="p.title||p.description||p.date"><div><b v-if="p.title">{{p.title}}</b><span v-if="p.date">{{p.date}}</span></div><p v-if="p.description">{{p.description}}</p></figcaption><div class="photo-actions"><button title="编辑纪念文字" @click="editPhoto(p)"><v-icon name="pencil"/></button><button title="替换媒体" @click="replacePhoto(p)"><v-icon name="refresh-cw"/></button><button title="删除媒体" @click="removePhoto(p)"><v-icon name="trash-2"/></button></div></figure></div></section>
  <section class="page list-page" v-if="tab==='list'"><div class="page-head"><div><h2>恋爱清单</h2><p>想一起做的事，一件件变成共同回忆。</p></div><span class="list-progress">已完成 {{doneCount}} / {{state.todos.length}}</span></div><form class="addbar" @submit.prevent="addTodo"><v-icon name="sparkles"/><input ref="todo" placeholder="写下下一件想一起做的事"><button title="添加到清单"><v-icon name="plus"/><span>添加</span></button></form><div class="todo"><label v-for="t in state.todos" :key="t.id" :class="{completed:t.done}"><input type="checkbox" v-model="t.done"><i><v-icon name="check"/></i><span>{{t.text}}</span><button type="button" title="删除" @click.prevent="confirmDelete('todos',t.id,t.text)"><v-icon name="trash-2"/></button></label></div></section>
  <anniversary-page v-if="tab==='days'" :items="state.days" @add="modal='day'" @remove="removeAnniversary" @calendar="addToPhoneCalendar"/>
  <section class="page" v-if="tab==='notes'"><div class="page-head"><div><h2>悄悄话</h2><p>忙碌的日子里，也别忘了说爱你。</p></div></div><form class="noteform" @submit.prevent="addNote"><textarea ref="note" maxlength="120" placeholder="写一句只给 TA 看的话…"/><button><v-icon name="send"/>发送留言</button></form><love-note v-for="n in state.notes" :key="n.id" :note="n" :profile="state.profile"/></section>
  <section class="page future-page" v-if="tab==='future'"><div class="page-head"><div><h2>未来的信</h2><p>把此刻想说的话，交给未来的某一天。</p></div></div><form class="letter-form" @submit.prevent="addLetter"><textarea ref="letterText" required maxlength="500" placeholder="写给未来的我们…"/><label><v-icon name="calendar-days"/><span>开启日期</span><input ref="letterDate" required type="date"></label><button class="primary"><v-icon name="lock-keyhole"/>封存这封信</button></form><div class="letters"><article v-for="letter in state.letters" :key="letter.id" :class="{locked:!letterReady(letter)}"><div><v-icon :name="letterReady(letter)?'mail-open':'lock-keyhole'"/></div><section><b>{{letterReady(letter)?'来自过去的一封信':'尚未到开启时间'}}</b><p v-if="letterReady(letter)">{{letter.text}}</p><p v-else>这封信将在 {{letter.openDate}} 开启</p><small>写于 {{new Date(letter.createdAt).toLocaleDateString('zh-CN')}}</small></section><button title="删除未来信" @click="confirmDelete('letters',letter.id,'这封未来信')"><v-icon name="trash-2"/></button></article><div class="empty-state" v-if="!state.letters.length"><v-icon name="mail"/><b>还没有未来信</b><span>写下第一封，留给未来的你们。</span></div></div></section>
  <section class="page me-page" v-if="tab==='me'"><div class="me-cover"><span>ONLY US</span><h2>我们的空间</h2><p>{{state.profile.a}} 与 {{state.profile.b}}</p></div><div class="couple-profile"><article><label class="avatar-editor"><img v-if="state.profile.avatarA" :src="state.profile.avatarA"><span v-else>{{state.profile.a[0]}}</span><i><v-icon name="camera"/></i><input hidden type="file" accept="image/*" @change="changeAvatar('avatarA',$event)"></label><b>{{state.profile.a}}</b></article><v-icon class="profile-heart" name="heart" fill="currentColor"/><article><label class="avatar-editor"><img v-if="state.profile.avatarB" :src="state.profile.avatarB"><span v-else>{{state.profile.b[0]}}</span><i><v-icon name="camera"/></i><input hidden type="file" accept="image/*" @change="changeAvatar('avatarB',$event)"></label><b>{{state.profile.b}}</b></article></div><template v-if="!profileEditing"><section class="profile-signature profile-value"><div><i><v-icon name="quote"/></i><span><b>我们的签名</b><small>会展示在首页照片上</small></span></div><p>{{state.profile.quote||'还没有设置签名'}}</p></section><section class="settings-list"><div class="setting-view"><i><v-icon name="calendar-heart"/></i><span><b>恋爱开始日期</b><small>{{startDate}}</small></span></div><button @click="startProfileEdit"><i><v-icon name="user-pen"/></i><span><b>编辑资料</b><small>修改昵称、恋爱日期和我们的签名</small></span><v-icon name="chevron-right"/></button><button @click="openAccountSecurity"><i><v-icon name="shield-check"/></i><span><b>账号与安全</b><small>修改密码、绑定或更换邮箱</small></span><v-icon name="chevron-right"/></button><button class="about-row" @click="updateInfo?updateModal=true:checkForUpdate(true)"><i><v-icon name="info"/></i><span><b>关于我们 <em v-if="updateInfo">有更新</em></b><small>当前版本 {{currentVersion}}{{updateInfo?' · 最新 '+updateInfo.version:''}}</small></span><v-icon name="chevron-right"/></button><button class="logout-row" @click="logout"><i><v-icon name="log-out"/></i><span><b>退出登录</b><small>退出当前账号并返回登录页面</small></span><v-icon name="chevron-right"/></button></section></template><form v-else class="profile-edit-form" @submit.prevent="saveProfile"><div class="profile-edit-heading"><span><v-icon name="user-pen"/></span><div><h3>编辑我们的资料</h3><p>修改后将实时保存到云端</p></div></div><div class="name-edit-grid"><label class="form-field"><span>昵称一</span><input required v-model="profileDraft.a" maxlength="12"></label><label class="form-field"><span>昵称二</span><input required v-model="profileDraft.b" maxlength="12"></label></div><label class="form-field"><span>恋爱开始日期</span><input required type="date" v-model="profileDraft.since"></label><label class="form-field"><span>我们的签名</span><textarea v-model="profileDraft.quote" maxlength="50" placeholder="写一句属于你们的话…"/></label><div><button type="button" @click="cancelProfileEdit">取消</button><button class="primary"><v-icon name="check"/>保存资料</button></div></form></section>
  <section class="page" v-if="tab==='story'"><div class="page-head"><div><h2>我们的故事</h2><p>从相遇到未来，每一章都由我们共同写下。</p></div><button class="primary" @click="modal='story'"><v-icon name="plus"/>记录故事</button></div><love-timeline :items="state.stories" editable @remove="removeStory"/><div class="backup"><b>数据备份</b><span>{{cloudEnabled?cloudSync:'当前仅保存在本机，卸载 APP 前请先导出备份。'}}</span><button @click="exportData"><v-icon name="download"/>导出</button><label><v-icon name="upload"/>导入<input hidden type="file" accept="application/json" @change="importData"></label></div></section>
 </main><footer><v-icon name="heart" fill="currentColor"/> Only Us · 愿每一天都值得纪念</footer>
 <div class="overlay" v-if="modal" @mousedown.self="modal=null"><div class="modal" :class="{'day-modal':modal==='day'}"><button class="close" @click="modal=null"><v-icon name="x"/></button><small v-if="modal==='day'">ONLY US CALENDAR</small><h3>{{modal==='day'?'添加纪念日':'记录故事'}}</h3><form @submit.prevent="saveModal"><label class="form-field"><span>纪念日名称</span><input required name="title" placeholder="例如：第一次旅行"></label><label class="form-field" v-if="modal==='day'"><span><v-icon name="calendar-heart"/>日期类型</span><select name="calendar" v-model="dayCalendar"><option value="solar">公历</option><option value="lunar">农历</option></select></label><div class="date-time-grid" v-if="modal==='day'"><label class="form-field" v-if="dayCalendar==='solar'"><span><v-icon name="calendar-days"/>公历日期</span><input required name="date" type="date"></label><label class="form-field" v-else><span><v-icon name="calendar-days"/>农历日期</span><div class="lunar-date-select"><select name="lunarMonth"><option v-for="m in 12" :value="m">{{m}}月</option></select><select name="lunarDay"><option v-for="d in 30" :value="d">{{d}}日</option></select></div></label><label class="form-field"><span><v-icon name="clock-3"/>时间</span><div class="time-select"><input name="hour" aria-label="小时" type="number" inputmode="numeric" min="0" max="23" value="9"><b>:</b><input name="minute" aria-label="分钟" type="number" inputmode="numeric" min="0" max="59" step="5" value="0"></div></label></div><label class="form-field" v-else><span>日期</span><input required name="date" type="date"></label><label class="remind-field" v-if="modal==='day'"><span><v-icon name="bell-ring"/>提前提醒</span><select name="remindDays"><option value="0">当天提醒</option><option value="1" selected>提前1天</option><option value="3">提前3天</option><option value="7">提前7天</option><option value="30">提前30天</option></select></label><label class="calendar-toggle" v-if="modal==='day'"><span><i><v-icon name="calendar-plus"/></i><b>添加到手机日历</b><small>保存后打开系统日历确认</small></span><input type="checkbox" name="addCalendar" checked><i/></label><textarea v-if="modal==='story'" required name="text" placeholder="那天发生了什么…"/><button class="primary">{{modal==='day'?'保存并设置提醒':'保存'}}</button></form></div></div>
 <div class="overlay" v-if="photoEditing" @mousedown.self="photoEditing=null"><div class="modal photo-edit-modal"><button class="close" @click="photoEditing=null"><v-icon name="x"/></button><small>PHOTO MEMORY</small><h3>编辑照片纪念</h3><form @submit.prevent="savePhotoText"><label class="form-field"><span>纪念标题</span><input required v-model="photoDraft.title" maxlength="30" placeholder="例如：第一次旅行"></label><label class="form-field"><span>拍摄日期</span><input required type="date" v-model="photoDraft.date"></label><label class="form-field"><span>纪念文字</span><textarea v-model="photoDraft.description" maxlength="200" placeholder="写下这张照片背后的故事…"/></label><button class="primary"><v-icon name="check"/>保存纪念内容</button></form></div></div>
 <div class="overlay confirm-overlay" v-if="logoutConfirm"><div class="confirm-dialog"><span><v-icon name="log-out"/></span><h3>退出当前账号？</h3><p>退出后需要重新验证密码才能进入。</p><div><button @click="logoutConfirm=false">取消</button><button class="danger" @click="confirmLogout">确认退出</button></div></div></div>
 <div class="overlay account-overlay" v-if="accountModal==='security'"><div class="account-dialog security-dialog"><button class="account-close" @click="accountModal=''"><v-icon name="x"/></button><button class="account-back" v-if="accountView!=='menu'" @click="accountView='menu';accountStep='form'"><v-icon name="chevron-left"/>返回</button><span class="account-icon"><v-icon :name="accountView==='password'?'key-round':accountView==='email'?'mail':'shield-check'"/></span><h3>{{accountView==='password'?'修改密码':accountView==='email'?'绑定邮箱':'账号与安全'}}</h3><p v-if="accountView==='menu'">管理当前账号的登录与验证方式</p><div class="security-menu" v-if="accountView==='menu'"><button @click="openAccountSection('password')"><i><v-icon name="key-round"/></i><span><b>修改密码</b><small>定期更换密码，保护账号安全</small></span><v-icon name="chevron-right"/></button><button @click="openAccountSection('email')"><i><v-icon name="mail"/></i><span><b>绑定邮箱</b><small>当前绑定 {{state.meta.accounts[loginUser]?.emailMasked||'未绑定'}}</small></span><v-icon name="chevron-right"/></button></div><form v-else-if="accountView==='password'" class="account-fields" @submit.prevent="changePassword"><input required name="current" type="password" placeholder="当前密码"><input required name="next" type="password" minlength="6" placeholder="新密码（至少6位）"><input required name="confirmNext" type="password" minlength="6" placeholder="再次输入新密码"><button class="primary">保存新密码</button></form><template v-else><div v-if="accountStep==='form'" class="account-fields"><p class="bound-phone">已绑定邮箱： {{state.meta.accounts[loginUser]?.emailMasked}}</p><input v-model="emailInput" inputmode="email" placeholder="输入新的邮箱地址"><button class="primary" @click="sendEmailOtp">发送验证码</button></div><div v-else class="account-fields"><p>验证码已发送至 {{emailInput}}</p><input v-model="otpInput" inputmode="numeric" maxlength="8" placeholder="邮箱验证码"><button class="primary" @click="verifyEmailOtp">确认绑定</button></div></template></div></div>
 <div class="overlay confirm-overlay" v-if="deleteConfirm"><div class="confirm-dialog"><span><v-icon name="trash-2"/></span><h3>{{deleteConfirm.title}}</h3><p>{{deleteConfirm.text}}</p><div><button @click="deleteConfirm=null">取消</button><button class="danger" @click="runDeleteConfirm">确认删除</button></div></div></div>
 <div class="overlay update-overlay" v-if="updateModal&&updateInfo"><div class="update-dialog"><div class="update-art"><v-icon name="sparkles"/><span>NEW</span></div><button class="close" title="稍后更新" @click="updateModal=false"><v-icon name="x"/></button><small>ONLY US UPDATE</small><h3>发现新版本 {{updateInfo.version}}</h3><p>本次更新</p><ul><li v-for="line in updateInfo.notes.split('；')" :key="line"><v-icon name="check-circle-2"/>{{line}}</li></ul><div><button class="later" @click="updateModal=false">暂不更新</button><button class="primary" @click="installUpdate"><v-icon name="download"/>立即更新</button></div></div></div>
 <div class="overlay quick-overlay" v-if="quickAddOpen" @mousedown.self="quickAddOpen=false"><div class="quick-sheet"><i/><h3>记录此刻</h3><div><button @click="chooseQuickAdd('photo')"><span><v-icon name="camera"/></span>上传照片</button><button @click="chooseQuickAdd('notes')"><span><v-icon name="message-circle"/></span>写悄悄话</button><button @click="chooseQuickAdd('day')"><span><v-icon name="calendar-heart"/></span>加纪念日</button><button @click="chooseQuickAdd('future')"><span><v-icon name="mail"/></span>写未来信</button></div><button class="sheet-cancel" @click="quickAddOpen=false">取消</button></div></div>
</div><div class="loading load-error" v-else-if="loadError"><v-icon name="cloud-off"/><b>暂时无法读取云端数据</b><span>请检查网络后重试，避免显示不准确的数据。</span><button @click="reloadPage">重新连接</button></div><div class="loading" v-else><v-icon name="heart" fill="currentColor"/>正在打开我们的故事…</div>`,
});
