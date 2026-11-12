# Only Us · FLX

> 一个只属于两个人的恋爱空间。记录纪念日、收藏回忆、共同打卡、一起看剧。

<p align="center">
  <b>Web</b> · <b>Android APK</b> · <b>Supabase 云同步</b>
</p>

<p align="center">
  <a href="https://zyf-coder.github.io/FLX/">在线体验</a> ·
  <a href="https://zyf-coder.github.io/FLX/downloads/OnlyUs-Android.apk">下载 Android APK</a>
</p>

---

## 这是什么

一款情侣向的私密空间应用，为两个人准备：

- **恋爱相册** — 上传照片 / 视频 / 动态照片（Live Photo），自动读取 EXIF 定位生成标题
- **纪念日** — 公历 / 农历倒数，自动同步到系统日历，到点提醒
- **恋爱清单** — 想一起做的事，完成后打勾
- **悄悄话 / 未来信** — 现在写下，到指定日期才能拆开
- **我们的故事** — 时间线记录相识与相恋
- **甜蜜乐园** — 心情打卡、习惯打卡、兑换券、爱的承诺、默契问答、愿望瓶、恋爱足迹、成就徽章、恋爱数据
- **一起看** — 视频直链同步播放与进度；平台视频（爱奇艺 / 腾讯 / 优酷）同步链接并聊天对表
- **背景音乐** — 多首可切换曲目，全部本地打包，离线可播
- **数据备份** — 一键导出 / 导入 JSON

数据存在 Supabase，两台设备实时同步；本机另有 IndexedDB + localStorage 双份缓存，断网也能进。

---

## 技术栈

| 层 | 选型 |
|----|------|
| 前端 | Vue 2.7 + Vite 4（单文件逻辑集中在 `src/main.js`） |
| 图标 | lucide |
| 农历 | lunar-javascript |
| 移动端 | Capacitor 5（Android / iOS） |
| 后端 | Supabase（Postgres + Storage + Auth OTP） |
| 原生能力 | Filesystem、LocalNotifications、Share、Calendar、Browser |

---

## 快速开始

```bash
npm install

# 本地开发
npm run dev            # http://localhost:5173

# 构建
npm run build          # 产出 dist/
npm run build:app      # 相对路径构建（APP 用）

# Android
npm run android:sync   # 构建 + cap sync
npm run android:apk    # 构建 + 打包 debug APK
```

APK 产出位置：`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 配置云端

1. 在 [Supabase](https://supabase.com) 建项目
2. SQL Editor 执行 `supabase/setup.sql`（建表、RLS 策略、存储桶）
3. 复制 `.env.example` 为 `.env.local` 并填写：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_COUPLE_ID=replace-with-a-long-random-private-id
```

4. `VITE_COUPLE_ID` 是两人共享数据的密钥，请用长随机串，勿公开。

### 存储策略补丁

若遇到上传被拒（`new row violates row-level security policy`），再执行一次：

```bash
# supabase/storage-fix.sql
```

其中额外放开了 Storage 的 `update` 策略（配合 `x-upsert`）。

---

## 目录结构

```
├── src/
│   ├── main.js            # 全部业务逻辑与模板
│   └── style.css          # 全局样式（含移动端适配）
├── public/
│   ├── audio/             # 本地打包的背景音乐
│   ├── downloads/         # 已构建的 APK
│   └── update.json        # 版本检查与更新说明
├── android/               # Capacitor Android 工程
│   └── app/src/main/java/com/onlyus/flx/
│       ├── MainActivity.java
│       ├── UpdateInstallerPlugin.java   # 应用内下载并拉起系统安装
│       └── InstallerJsInterface.java     # WebView JS 桥安装器
├── supabase/
│   ├── setup.sql          # 建表 / RLS / 存储桶
│   └── storage-fix.sql    # 存储策略修复
├── .github/workflows/
│   └── deploy.yml         # push main 自动部署 GitHub Pages
└── capacitor.config.json
```

---

## 更新机制

- 应用启动与回到前台时拉取 `public/update.json`
- 版本更高时弹窗提示，可**应用内下载**（0–100% 进度）后一键拉起系统安装
- 点「暂不更新」则本次不再提示，下次打开 APP 继续提醒
- APK 采用**版本化文件名**（`OnlyUs-Android-<version>.apk`）避免 CDN 缓存串版本

---

## 部署

推送到 `main` 后由 GitHub Actions 自动构建并部署到 GitHub Pages：

```
https://zyf-coder.github.io/FLX/
```

`update.json` 与 APK 位于 `public/`，构建时随站点一起发布。

### GitHub Secrets（必配）

仓库**不包含**任何真实密钥。构建所需环境变量通过仓库 Secrets 注入：

> 仓库 → Settings → Secrets and variables → Actions → New repository secret

| Secret 名称 | 说明 |
|-------------|------|
| `VITE_SUPABASE_URL` | Supabase 项目地址 |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon / publishable key |
| `VITE_COUPLE_ID` | 两人共享数据的私密标识（长随机串） |

三者缺一，Pages 构建会得到空配置，导致云端同步与相册上传失效。

---

## 安全须知

- `.env*` 已写入 `.gitignore`，**切勿**提交真实值
- `VITE_COUPLE_ID` 是访问两人数据的钥匙，一旦泄露他人即可读写共享状态，建议定期更换
- Supabase `anon` key 本身设计为可公开，但仍须配合 RLS 策略使用
- 更换 `VITE_COUPLE_ID` 后，两台设备需同步更新配置并重新登录
- 前端打包产物（APK / 网页）必然包含可读的 `VITE_*`，因此**不要**在前端存放任何服务端密钥

---

## 隐私

- 所有数据仅存于你自己的 Supabase 项目与设备本地
- 账号为双人制，共享一个 `VITE_COUPLE_ID`
- 「允许安装未知应用」仅在使用应用内更新时需要开启
- 仓库不存放任何真实密钥，构建依赖 GitHub Secrets

---

## 致谢

- [Vue](https://vuejs.org/) · [Vite](https://vitejs.dev/) · [Capacitor](https://capacitorjs.com/)
- [Supabase](https://supabase.com/) · [lucide](https://lucide.dev/) · [lunar-javascript](https://github.com/6tail/lunar-javascript)
- 背景音乐：[多幸运 - 韩安旭]、[荷塘月色 - 凤凰传奇]（仅供个人使用）
