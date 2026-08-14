import Vue from "vue/dist/vue.esm.js";
import { icons } from "lucide";
import "./style.css";

const PHOTO = `${import.meta.env.BASE_URL}temple-couple.jpg`;
const defaults = {
  profile: {
    a: "小张同学",
    b: "徐老师",
    since: "2023-05-20",
    quote: "世界很大，刚好我们遇见了。",
  },
  photos: [{ id: 1, src: PHOTO, title: "第一次旅行", date: "2024-02-14" }],
  todos: [
    { id: 1, text: "一起看一次海边日出", done: true },
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
const storage = {
  get: () =>
    new Promise((ok) => {
      const r = indexedDB.open("only-us", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("data");
      r.onsuccess = () => {
        const q = r.result.transaction("data").objectStore("data").get("state");
        q.onsuccess = () => ok(q.result || defaults);
        q.onerror = () => ok(defaults);
      };
    }),
  set: (v) =>
    new Promise((ok) => {
      const r = indexedDB.open("only-us", 1);
      r.onsuccess = () => {
        const q = r.result
          .transaction("data", "readwrite")
          .objectStore("data")
          .put(v, "state");
        q.onsuccess = ok;
      };
    }),
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
  template: `<article class="note"><div>{{note.author[0]}}</div><p><b>{{note.author}}</b><span>{{note.text}}</span><small>{{note.time}}</small></p></article>`,
});

Vue.component("anniversary-page", {
  data: () => ({
    now: Date.now(),
    timer: null,
    together: {
      title: "徐老师和小张同学在一起已经",
      date: "2025-10-26T00:00:00",
    },
    countdown: [
      {
        id: 1,
        title: "徐老师还有",
        date: "2026-11-17T00:00:00",
        rule: "每年十月初十",
        remind: "提前30天",
      },
      {
        id: 2,
        title: "小张同学的生日还有",
        date: "2026-12-08T00:00:00",
        rule: "每年十月三十",
        remind: "提前30天",
      },
    ],
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
  },
  template: `<section class="anniversary-page"><div class="anniversary-head"><div><span>倒数纪念日</span><h2>全部</h2></div><button title="添加纪念日"><v-icon name="plus"/></button></div><article class="together-card"><p>{{together.title}}</p><div class="big-duration"><strong>{{parts(together.date,true).days}}</strong><span>天</span><strong>{{pad(parts(together.date,true).hours)}}</strong><span>时</span><strong>{{pad(parts(together.date,true).minutes)}}</strong><span>分</span><strong>{{pad(parts(together.date,true).seconds)}}</strong><span>秒</span></div><footer>2025-10-26 周日</footer></article><div class="day-section"><div class="section-label"><span>倒数</span><i/><v-icon name="chevron-up"/></div><div class="anniversary-grid"><article class="event-card countdown-card" v-for="item in countdown" :key="item.id"><div class="event-title"><i><v-icon name="heart"/></i><b>{{item.title}}</b></div><div class="event-duration"><strong>{{parts(item.date).days}}</strong><span>天</span><strong>{{pad(parts(item.date).hours)}}</strong><span>时</span><strong>{{pad(parts(item.date).minutes)}}</strong><span>分</span><strong>{{pad(parts(item.date).seconds)}}</strong><span>秒</span></div><div class="event-meta"><span><v-icon name="refresh-cw"/>{{item.rule}}</span><span><v-icon name="bell"/>{{item.remind}}</span></div><v-icon class="card-mark" name="heart-handshake"/></article></div></div><div class="day-section elapsed-section"><div class="section-label"><span>正数</span><i/><v-icon name="chevron-up"/></div><div class="anniversary-grid"><article class="event-card elapsed-card" v-for="item in elapsed" :key="item.id"><div class="event-title"><i><v-icon name="heart"/></i><b>{{item.title}}</b></div><div class="event-duration"><strong>{{parts(item.date,true).days}}</strong><span>天</span><template v-if="item.id===4"><strong>{{pad(parts(item.date,true).hours)}}</strong><span>时</span><strong>{{pad(parts(item.date,true).minutes)}}</strong><span>分</span><strong>{{pad(parts(item.date,true).seconds)}}</strong><span>秒</span></template></div><div class="event-meta">{{item.caption}}</div><v-icon class="card-mark" name="heart-handshake"/></article></div></div></section>`,
});

new Vue({
  el: "#app",
  data: {
    ready: false,
    state: defaults,
    tab: "home",
    modal: null,
    music: false,
    hearts: [],
    menu: false,
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
  },
  watch: {
    state: {
      deep: true,
      handler(v) {
        if (this.ready) storage.set(JSON.parse(JSON.stringify(v)));
      },
    },
  },
  async mounted() {
    const savedState = await storage.get();
    this.state = JSON.parse(
      JSON.stringify(savedState)
        .replaceAll("小满", "小张同学")
        .replaceAll("阿屿", "徐老师"),
    );
    this.state.stories = JSON.parse(JSON.stringify(defaults.stories));
    this.ready = true;
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  },
  methods: {
    go(t) {
      this.tab = t;
      this.menu = false;
      scrollTo({ top: 0, behavior: "smooth" });
    },
    until(d) {
      return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
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
    addNote() {
      const text = this.$refs.note.value.trim();
      if (text)
        this.state.notes.unshift({
          id: Date.now(),
          author: this.state.profile.a,
          text,
          time: "刚刚",
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
          });
        r.readAsDataURL(f);
      });
    },
    saveModal(e) {
      const f = new FormData(e.target);
      if (this.modal === "day")
        this.state.days.push({
          id: Date.now(),
          title: f.get("title"),
          date: f.get("date"),
          icon: "💗",
        });
      else
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
 <span v-for="h in hearts" :key="h.id" class="rain" :style="{left:h.left+'%',animationDelay:h.delay+'s',fontSize:h.size+'px'}">♥</span>
 <header><button class="brand" @click="go('home')"><span><v-icon name="heart" fill="currentColor"/></span><b>Only Us</b><small>我们的恋爱空间</small></button><nav><button v-for="n in nav" :key="n[0]" :class="{active:tab===n[0]}" @click="go(n[0])"><v-icon :name="n[1]"/>{{n[2]}}</button></nav><div class="tools"><button title="背景音乐" @click="music=!music"><v-icon :name="music?'music-2':'volume-x'"/></button><button title="爱心雨" @click="rain"><v-icon name="sparkles"/></button><button class="hamb" @click="menu=!menu"><v-icon name="menu"/></button></div></header>
 <div class="mobile-menu" v-if="menu"><button v-for="n in nav" :key="n[0]" @click="go(n[0])"><v-icon :name="n[1]"/>{{n[2]}}</button></div>
 <main>
  <template v-if="tab==='home'">
   <section class="hero"><img :src="'${PHOTO}'"><div class="shade"/><div class="hero-copy"><span class="eyebrow"><span/> OUR LOVE STORY <span/></span><h1>小张同学 <v-icon name="heart" fill="currentColor"/> 徐老师</h1><p>{{state.profile.quote}}</p><div class="counter"><div><strong>{{Math.max(0,Math.floor((Date.now()-new Date('2025-10-26').getTime())/86400000))}}</strong><span>相爱的日子</span></div><i/><div><strong>2025年10月26日</strong><span>故事开始于</span></div></div></div><button class="float-heart" @click="rain"><v-icon name="heart" fill="currentColor"/></button></section>
   <section class="quick"><article @click="go('album')"><div class="qicon pink"><v-icon name="images"/></div><div><b>恋爱相册</b><span>{{state.photos.length}} 张珍贵回忆</span></div><v-icon name="chevron-right"/></article><article @click="go('list')"><div class="qicon purple"><v-icon name="square-check-big"/></div><div><b>恋爱清单</b><span>{{doneCount}}/{{state.todos.length}} 已完成</span></div><v-icon name="chevron-right"/></article><article @click="go('days')"><div class="qicon amber"><v-icon name="calendar-heart"/></div><div><b>下个纪念日</b><span>{{state.days[0] ? state.days[0].title : '添加纪念日'}}</span></div><strong>{{state.days[0] ? Math.max(0,until(state.days[0].date)) : '+'}}<small>天</small></strong></article></section>
   <section class="home-grid"><div class="panel"><div class="title"><span><v-icon name="clock-3"/></span><div><b>爱情时间线</b><small>每个瞬间，都值得被记住</small></div><button @click="go('story')">查看全部 <v-icon name="chevron-right"/></button></div><love-timeline :items="state.stories.slice(-3)"/></div><div class="panel"><div class="title"><span><v-icon name="message-circle"/></span><div><b>悄悄话</b><small>只给你看的甜蜜留言</small></div><button @click="go('notes')">查看全部 <v-icon name="chevron-right"/></button></div><love-note v-for="n in state.notes.slice(0,2)" :key="n.id" :note="n"/></div></section>
   <section class="surprise"><v-icon name="gift"/><div><b>今日份的小惊喜</b><p>点击开启属于你们的浪漫时刻</p></div><button @click="rain">开启惊喜 <v-icon name="sparkles"/></button></section>
  </template>
  <section class="page" v-if="tab==='album'"><div class="page-head"><div><h2>恋爱相册</h2><p>把散落在时光里的瞬间，收藏在一起。</p></div><button class="primary" @click="$refs.file.click()"><v-icon name="camera"/>上传照片</button></div><input hidden multiple accept="image/*" type="file" ref="file" @change="photos"><div class="gallery"><figure v-for="p in state.photos" :key="p.id"><img :src="p.src"><figcaption><b>{{p.title}}</b><span>{{p.date}}</span></figcaption><button @click="state.photos=state.photos.filter(x=>x.id!==p.id)"><v-icon name="trash-2"/></button></figure></div></section>
  <section class="page" v-if="tab==='list'"><div class="page-head"><div><h2>恋爱清单</h2><p>想一起做的事，一件件变成共同回忆。</p></div></div><form class="addbar" @submit.prevent="addTodo"><input ref="todo" placeholder="下一件想一起做的事…"><button><v-icon name="plus"/>添加</button></form><div class="todo"><label v-for="t in state.todos" :key="t.id"><input type="checkbox" v-model="t.done"><span>{{t.text}}</span><button type="button" @click="state.todos=state.todos.filter(x=>x.id!==t.id)"><v-icon name="trash-2"/></button></label></div></section>
  <anniversary-page v-if="tab==='days'"/>
  <section class="page" v-if="tab==='notes'"><div class="page-head"><div><h2>悄悄话</h2><p>忙碌的日子里，也别忘了说爱你。</p></div></div><form class="noteform" @submit.prevent="addNote"><textarea ref="note" maxlength="120" placeholder="写一句只给 TA 看的话…"/><button><v-icon name="send"/>发送留言</button></form><love-note v-for="n in state.notes" :key="n.id" :note="n"/></section>
  <section class="page" v-if="tab==='story'"><div class="page-head"><div><h2>我们的故事</h2><p>从相遇到未来，每一章都由我们共同写下。</p></div><button class="primary" @click="modal='story'"><v-icon name="plus"/>记录故事</button></div><love-timeline :items="state.stories"/><div class="backup"><b>数据备份</b><span>照片和记录保存在当前设备，建议定期导出。</span><button @click="exportData"><v-icon name="download"/>导出</button><label><v-icon name="upload"/>导入<input hidden type="file" accept="application/json" @change="importData"></label></div></section>
 </main><footer><v-icon name="heart" fill="currentColor"/> Only Us · 愿每一天都值得纪念</footer>
 <div class="overlay" v-if="modal" @mousedown.self="modal=null"><div class="modal"><button class="close" @click="modal=null"><v-icon name="x"/></button><h3>{{modal==='day'?'添加纪念日':'记录故事'}}</h3><form @submit.prevent="saveModal"><input required name="title" placeholder="标题"><input required name="date" type="date"><textarea v-if="modal==='story'" required name="text" placeholder="那天发生了什么…"/><button class="primary">保存</button></form></div></div>
</div><div class="loading" v-else><v-icon name="heart" fill="currentColor"/>正在打开我们的故事…</div>`,
});
