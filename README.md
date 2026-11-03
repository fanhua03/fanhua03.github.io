# 开源项目可视化拆解

热门开源项目拆成能点的架构图。每个项目一个独立页面，每条结论都挂着 `file:line`。

## 目录

```
data/projects.json   唯一数据源：项目、结论、证据、待拆清单
build.mjs            生成器（零依赖）
index.html           生成产物：清单页
projects/*.html      生成产物：一项目一页
sitemap.xml          生成产物
assets/site.css      共享样式
assets/diagrams/     交互图（Archify 生成的单文件 HTML）
assets/thumbs/       卡片缩略图
```

**不要手改 `index.html` 和 `projects/*.html`**，它们会被 `build.mjs` 覆盖。

## 本地预览

```bash
node build.mjs
python -m http.server 8787
# 打开 http://127.0.0.1:8787/
```

## 加一个项目（三步）

1. 把交互图丢进 `assets/diagrams/<id>.html`，缩略图丢进 `assets/thumbs/<id>.png`
2. 在 `data/projects.json` 的 `projects` 里加一条：`id / title / headline / tagline / repo / revision / langs / loc / date / tags / thumb / diagram / insights[3] / sources[]`
3. `node build.mjs`

## 上线

站点是纯静态、相对路径，**放在任何子目录下都能跑**（已验证 `/site/` 前缀正常）。

### 方案 A · GitHub Pages（推荐，技术受众都在这儿）

```bash
cd inspiration/site
git init
git add -A
git commit -m "init"
# 在 GitHub 建一个 public 仓库，然后：
git remote add origin git@github.com:<你的用户名>/<仓库名>.git
git push -u origin main
```

仓库 → Settings → Pages → Source 选 `main` / `/ (root)` → 拿到 `https://<用户名>.github.io/<仓库名>/`。

注意：本机还没配 git 身份，先跑
```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
```

### 方案 B · Cloudflare Pages

新建项目 → 连仓库 → 构建命令留空（产物已提交），输出目录 `/`。拿到 `<项目>.pages.dev`。

### 方案 C · 国内主机 + 域名

需要买域名（30–80 元/年）+ ICP 备案（个人备案通常 10–20 个工作日，且要一台国内主机）。**等内容验证过再做，别一上来就办。**

## 换域名

改两处再 build：

```jsonc
// data/projects.json
"site": { "domain": "https://你的域名" }
```

`canonical`、`og:url`、`sitemap.xml`、`robots.txt` 全部会自动跟着变。

## 一张图的来源

图由 Archify 生成，每个节点的「来源」徽章指向 GitHub 对应行；`sources` 数组就是项目页「证据」那一节的数据。
