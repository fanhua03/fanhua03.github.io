#!/usr/bin/env node
// 静态站生成器：data/projects.json -> index.html + projects/<id>.html + sitemap.xml
// 零依赖。跑： node build.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DATA = JSON.parse(readFileSync(join(ROOT, "data/projects.json"), "utf8"));

// 站点根地址的解析顺序：--domain= > 环境变量 SITE_DOMAIN > GitHub Actions 推断 > data/projects.json
function resolveSite() {
  const arg = process.argv.find(a => a.startsWith("--domain="));
  const owner = process.env.GITHUB_REPOSITORY_OWNER;
  const repo = process.env.GITHUB_REPOSITORY && process.env.GITHUB_REPOSITORY.split("/")[1];
  if (arg) return arg.slice("--domain=".length);
  if (process.env.SITE_DOMAIN) return process.env.SITE_DOMAIN;
  if (owner && repo) {
    return repo.toLowerCase() === `${owner.toLowerCase()}.github.io`
      ? `https://${owner.toLowerCase()}.github.io`
      : `https://${owner.toLowerCase()}.github.io/${repo}`;
  }
  return DATA.site.domain;
}
const SITE = resolveSite().replace(/\/$/, "");
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const num = n => n.toLocaleString("en-US");
const k = n => (n / 1000).toFixed(1) + "k";

/* ---------- shared bits ---------- */
const CSSV = createHash("sha1").update(readFileSync(join(ROOT, "assets/site.css"))).digest("hex").slice(0, 8);

const head = ({ title, desc, canonical, extra = "" }) => `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<link rel="canonical" href="${canonical}" />
<meta property="og:site_name" content="${esc(DATA.site.name)}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="stylesheet" href="{BASE}assets/site.css?v=${CSSV}" />
${extra}</head>
<body>`;

const topbar = (base, upto = "") => `<div class="topbar">
  <div class="wrap topbar-in">
    <a class="brand" href="{BASE}index.html">
      <div class="logo">拆</div>
      <div>${esc(DATA.site.name)} <small>OPEN SOURCE · VISUALIZED</small></div>
    </a>
    <nav class="topnav">
      <a href="{BASE}index.html#gallery">已拆</a>
      <a href="{BASE}index.html#roadmap">待拆清单</a>
      <a href="{BASE}index.html#ask">点单</a>
      <span class="live"><i class="dot"></i> 持续拆解中</span>
    </nav>
  </div>
</div>`;

const footer = n => `<footer>
    <div>${esc(DATA.site.name)} · 你要的项目，我们拆 · 每张图都有一句人话解释</div>
    <div>已拆 ${n} 张 · 纯静态，无后端</div>
  </footer>`;

const fill = (tpl, base) => tpl.replaceAll("{BASE}", base);

/* ---------- index ---------- */
const done = DATA.projects;
const allTags = [...new Set(done.flatMap(p => p.tags))];

const GROUPS = [
  { id: "runtime", label: "语言与运行时", labelEn: "Language Runtimes", desc: "一个请求进来，一行代码下去，机器上发生了什么" },
  { id: "model", label: "模型与推理", labelEn: "Models & Inference", desc: "从一次前向、一份权重、一个 token 开始看" },
  { id: "kernel", label: "内核与通信", labelEn: "Kernels & Communication", desc: "显卡上真正跑的代码，和卡与卡之间搬的数据" },
  { id: "infra", label: "分布式与数据", labelEn: "Distributed Systems & Data", desc: "多机多盘之间，数据怎么放、怎么跑" },
  { id: "agent", label: "Agent 与工具", labelEn: "Agents & Tools", desc: "让模型自己动手的那一层" },
];

const GROUP_OF = {
  jq: "runtime", redis: "runtime",
  "deepseek-v3": "model", dsv32: "model", "deepseek-vl": "model", "deepseek-vl2": "model",
  janus: "model", dsocr: "model", "deepseek-ocr-2": "model", engram: "model",
  "deepseekmoe-routing": "model", deepspec: "model", dsmath: "model", dsmathv2: "model",
  prover: "model", dscoder: "model", dreamcraft: "model",
  flashmla: "kernel", deepgemm: "kernel", tilekernels: "kernel", deepjit: "kernel",
  deepep: "kernel", eplb: "kernel", lplb: "kernel", "gemm-ascend": "kernel", "ep-ascend": "kernel",
  "3fs": "infra", smallpond: "infra", profiledata: "infra", dualpipe: "infra", deepinfer: "infra",
  dsh: "agent", superagent: "agent", dsrecipe: "agent",
};

const cardHtml = p => `
      <a class="card" href="projects/${p.id}.html" data-search="${esc((p.title + " " + p.repo + " " + p.tags.join(" ") + " " + p.tagline).toLowerCase())}">
        <div class="thumb">
          <img src="${p.thumb}" alt="${esc(p.title)} 架构图" loading="lazy" />
          <span class="open-pill">打开交互图 ↗</span>
        </div>
        <div class="body">
          <div class="row">
            <span class="title">${esc(p.title)}</span>
            <span class="repo">${esc(p.repo)}</span>
            <span class="tags">${p.tags.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</span>
          </div>
          <div class="tagline">${esc(p.tagline)}</div>
          <ul class="ins"><li>${esc(p.insights[0])}</li></ul>
          <div class="foot">
            ${p.loc ? `<span><b>${num(p.loc)}</b> 行</span>` : `<span>无源码</span>`}
            <span><b>${p.sources.length}</b> 处对得上源码</span>
            <span class="go">打开 →</span>
          </div>
        </div>
      </a>`;

const LIMIT = 6;
const sections = GROUPS.map(g => {
  const items = done.filter(p => (GROUP_OF[p.id] || "model") === g.id);
  if (!items.length) return "";
  const head = items.slice(0, LIMIT);
  const rest = items.slice(LIMIT);
  return `
  <section class="group" id="g-${g.id}" data-group="${g.id}">
    <div class="group-head">
      <h2>${g.label}<span>${items.length}</span></h2>
      <p>${g.desc}</p>
    </div>
    <div class="grid">${head.map(cardHtml).join("")}
    </div>
    ${rest.length ? `<div class="grid extra" hidden>${rest.map(cardHtml).join("")}
    </div>
    <button class="more-btn" data-more>展开剩下 ${rest.length} 个 ↓</button>` : ""}
  </section>`;
}).join("");

const chips = [["all", "全部"], ...GROUPS.map(g => [g.id, g.label])]
  .map(([v, label], i) => `<button class="chip${i === 0 ? " on" : ""}" data-f="${esc(v)}">${esc(label)}</button>`).join("\n    ");

const rows = DATA.roadmap.map(([name, repo, stars, lang, hook]) => `
      <div class="row-i" data-ask="${esc(name.toLowerCase())}">
        <div><div class="rname">${esc(name)}</div><div class="rrepo">${esc(repo)}</div></div>
        <div class="rhook">${esc(hook)}</div>
        <div class="rstars">${k(stars)} ★</div>
        <div class="rlang">${esc(lang)}</div>
        <div class="rgo">点单 →</div>
      </div>`).join("");

const indexHtml = fill(head({
  title: `${DATA.site.name}｜${DATA.site.tagline}`,
  desc: `热门开源项目拆成能点的架构图：${done.map(p => p.title).join("、")} 已拆，${DATA.roadmap.length} 个项目在排队。搜不到就点单，24 小时上架。`,
  canonical: `${SITE}/index.html`,
}), "") + fill(topbar(""), "") + `
<main class="wrap">
  <header class="hero">
    <h1>你想看的开源项目，<br /><em>这里基本都有</em>。</h1>
    <p class="lede">
      搜一下，点开就能看。图能放大缩小、拖着走；每张图下面都有一句<strong>人话解释</strong>，看不懂术语就只看那句。<br />
      想深究的，每个方块都标着它在源码的哪一行，点过去就是原文。搜不到？留个名字，我们拆。
    </p>
    <div class="search">
      <input id="q" type="search" placeholder="搜项目名：jq、3FS、Redis、Raft…" autocomplete="off" />
      <span class="search-hint">搜不到就点单 ↓</span>
    </div>
    <div class="stats">
      <div class="stat"><b>${done.length}</b><span>已拆</span></div>
      <div class="stat"><b id="s-queue">${DATA.roadmap.length}</b><span>排队中</span></div>
      <div class="stat"><b>24h</b><span>点单到上架</span></div>
      <div class="stat"><b>0 元</b><span>点单免费</span></div>
    </div>
  </header>

  <div class="filters" id="filters">
    ${chips}
  </div>

  <div id="gallery">${sections}
  </div>

  <section class="roadmap" id="roadmap">
    <div class="section-title" style="margin-top:56px">
      <h2>待拆清单</h2>
      <p>${DATA.roadmap.length} 个热门项目 · 点任意一行排进队列 · 攒够 3 人就开工</p>
    </div>
    <div class="list">${rows}
    </div>
  </section>

  <div class="section-title" id="how">
    <h2>怎么用</h2>
    <p>三步，不用注册，不用装东西</p>
  </div>
  <div class="steps">
    <div class="step"><b>01 · 搜</b><p>先搜项目名。搜不到不代表没有，可能只是还没排到——往下点单就行，不用换站。</p></div>
    <div class="step"><b>02 · 看</b><p>一张能放大缩小的图，加一句人话解释。术语看不懂就跳过，只看人话那句也能明白它在干嘛。</p></div>
    <div class="step"><b>03 · 点单</b><p>留个项目名。同一个项目攒够 3 个人就开工，一天内上架，不要钱也不用注册。</p></div>
  </div>

  <section class="ask" id="ask">
    <div>
      <h3>想看的项目不在这里？</h3>
      <p>留个项目名就行。同一个项目攒够 3 个人就开工，24 小时上架——不用注册，也不用留联系方式。</p>
    </div>
    <form id="ask-form">
      <input id="ask-input" placeholder="项目名或 GitHub 链接，比如 redis、apache/kafka" autocomplete="off" />
      <button type="submit">排上 →</button>
    </form>
    <div class="ask-status" id="ask-status"></div>
    <div class="queue" id="queue"></div>
  </section>

  <section class="cta">
    <div>
      <h3>要拆的不是开源项目？</h3>
      <p>内部系统也能拆。给一份仓库只读权限，48 小时出一张能点的图，外加三条「文档里没写、但代码里跑着」的结论。</p>
    </div>
    <a class="cta-btn" href="mailto:you@example.com">聊聊 →</a>
  </section>

  ${footer(done.length)}
</main>
<script>
const cards = [...document.querySelectorAll(".card")];
const state = { f: "all", q: "" };
const KEY = "teardown.orders.v1";
const SEED = ${JSON.stringify(DATA.roadmap.slice(0, 3).map(([n], i) => ({ name: n.toLowerCase(), n: [5, 3, 2][i] })))};

function apply(){
  let shown = 0;
  cards.forEach(c => {
    const grp = c.closest(".group");
    const okTag = state.f === "all" || (grp && grp.dataset.group === state.f);
    const okQ = !state.q || c.dataset.search.includes(state.q.toLowerCase());
    const on = okTag && okQ;
    c.style.display = on ? "" : "none";
    if (on) shown++;
  });
  document.getElementById("gallery").style.display = shown ? "" : "none";
  document.querySelectorAll(".group").forEach(g => {
    const any = [...g.querySelectorAll(".card")].some(c => c.style.display !== "none");
    g.style.display = any ? "" : "none";
  });
}

document.querySelectorAll(".chip").forEach(c => c.onclick = () => {
  document.querySelectorAll(".chip").forEach(x => x.classList.remove("on"));
  c.classList.add("on");
  state.f = c.dataset.f;
  apply();
});
document.getElementById("q").addEventListener("input", e => { state.q = e.target.value.trim(); apply(); });

document.querySelectorAll("[data-more]").forEach(b => b.addEventListener("click", () => {
  const box = b.previousElementSibling;
  box.hidden = false;
  b.remove();
}));

function readOrders(){ try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch(e){ return []; } }
function writeOrders(v){ try { localStorage.setItem(KEY, JSON.stringify(v)); } catch(e){} }
function renderQueue(){
  const map = new Map();
  SEED.forEach(s => map.set(s.name, { ...s }));
  readOrders().forEach(o => {
    if (map.has(o.name)) map.get(o.name).n++;
    else map.set(o.name, { name: o.name, n: 1 });
  });
  const arr = [...map.values()].sort((a, b) => b.n - a.n);
  document.getElementById("queue").innerHTML = arr.length
    ? arr.map(x => '<span class="qchip"><b>' + x.name + '</b><i>' + x.n + ' 人</i></span>').join("")
    : '<span class="qchip qempty">还没有人点单，你是第一个</span>';
  const sq = document.getElementById("s-queue"); if (sq) sq.textContent = arr.length;
}
document.getElementById("ask-form").addEventListener("submit", e => {
  e.preventDefault();
  const input = document.getElementById("ask-input");
  const raw = input.value.trim();
  if (!raw) return;
  const name = raw.replace(/^https?:\\/\\/[^/]+\\//i, "").replace(/\\.git$/i, "").replace(/\\/+$/, "").toLowerCase().slice(0, 40);
  const orders = readOrders(); orders.push({ name, t: Date.now() }); writeOrders(orders);
  input.value = ""; renderQueue();
  const st = document.getElementById("ask-status");
  st.textContent = "已排上：" + name; st.classList.add("on");
  setTimeout(() => st.classList.remove("on"), 2600);
});
document.querySelectorAll("[data-ask]").forEach(n => n.addEventListener("click", () => {
  const a = document.getElementById("ask-input");
  a.value = n.dataset.ask;
  document.getElementById("ask").scrollIntoView({ behavior: "smooth", block: "center" });
  a.focus();
}));
renderQueue();
</script>
</body>
</html>
`;

/* ---------- related ---------- */
function relatedProjects(p, limit = 3) {
  const groupOf = id => GROUP_OF[id] || "model";
  const scored = done
    .filter(x => x.id !== p.id)
    .map(x => {
      let sc = 0;
      if (groupOf(x.id) === groupOf(p.id)) sc += 2;
      sc += x.tags.filter(t => p.tags.includes(t)).length * 3;
      return { x, sc };
    })
    .sort((a, b) => b.sc - a.sc);
  return scored.slice(0, limit).map(o => o.x);
}

/* ---------- project pages ---------- */
function projectPage(p, prev, next) {
  const link = p.repo + "/blob/" + p.revision + "/";
  const ev = p.sources.map(s => {
    const href = `https://github.com/${link}${s.path}${s.line ? "#L" + s.line : ""}`;
    const range = s.line ? (s.end_line ? `${s.line}–${s.end_line}` : `${s.line}`) : "";
    return `      <li><code><a href="${href}" rel="noopener" target="_blank">${esc(s.path)}${range ? ":" + range : ""}</a></code><span>${esc(s.label || "")}</span></li>`;
  }).join("\n");

  const rel = relatedProjects(p).map(x => `
      <a class="rel" href="${x.id}.html">
        <img src="../${x.thumb}" alt="${esc(x.title)}" loading="lazy" />
        <div><b>${esc(x.title)}</b><span>${esc(x.tagline)}</span></div>
      </a>`).join("");

  const pager = `
  <div class="pager">
    ${prev ? `<a href="${prev.id}.html"><span class="lbl">← 上一个</span>${esc(prev.title)}</a>` : `<a href="../index.html"><span class="lbl">← 返回</span>全部项目</a>`}
    ${next ? `<a href="${next.id}.html"><span class="lbl">下一个 →</span>${esc(next.title)}</a>` : `<a href="../index.html#ask"><span class="lbl">还想要别的？</span>点单 →</a>`}
  </div>`;

  const jsonld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: `${p.title} 架构图｜${p.headline}`,
    description: p.tagline,
    datePublished: p.date,
    inLanguage: "zh-CN",
    about: { "@type": "SoftwareSourceCode", name: p.title, codeRepository: `https://github.com/${p.repo}` },
    isPartOf: { "@type": "WebSite", name: DATA.site.name, url: SITE }
  });

  return fill(head({
    title: `${p.en ? p.en.title : p.title + " 架构图｜" + p.headline} · ${DATA.site.name}`,
    desc: `${p.en ? p.en.desc : p.tagline}`,
    canonical: `${SITE}/projects/${p.id}.html`,
    extra: `<meta property="og:image" content="${SITE}/${p.thumb}" />
<script type="application/ld+json">${jsonld}</script>
`,
  }), "../") + fill(topbar("../"), "../") + `
<main class="wrap narrow">
  <div class="crumb">
    <a href="../index.html">全部项目</a><span>/</span><a href="../groups/${GROUP_OF[p.id] || "model"}.html">${esc((GROUPS.find(g=>g.id===(GROUP_OF[p.id]||"model"))||{}).label||"")}</a><span>/</span><span>${esc(p.title)}</span>
  </div>

  <header class="proj-head">
    <h1><span class="pn">${esc(p.title)}</span> 架构图｜${esc(p.headline)}</h1>
    <p class="sub">${esc(p.tagline)}</p>
    ${p.en ? `<p class="en">${esc(p.en.one)}</p>` : ""}
    ${p.plain ? `<p class="plain"><b>人话版</b>${esc(p.plain)}</p>` : ""}
    <div class="pmeta">
      <span><b>仓库</b> <a href="https://github.com/${p.repo}" target="_blank" rel="noopener">${esc(p.repo)}</a></span>
      <span><b>语言</b> ${esc(p.langs.join(" / "))}</span>
      ${p.loc ? `<span><b>规模</b> ${num(p.loc)} 行</span>` : ""}
      <span><b>出处</b> ${p.sources.length} 处能对到源码</span>
      <span><b>更新</b> ${esc(p.date)}</span>
    </div>
  </header>

  <figure class="embed">
    <button class="embed-load" id="embed-load" aria-label="加载交互图">
      <img src="../${p.thumb}" alt="${esc(p.title)} 架构图预览" />
      <span class="play"><span>▶ 加载交互图（约 800KB）</span></span>
    </button>
    <figcaption>
      <span>拖动平移 · 滚轮缩放 · 点节点右上角「来源」跳到 GitHub 对应行</span>
      <a href="../${p.diagram}" target="_blank" rel="noopener">新窗口打开 ↗</a>
    </figcaption>
  </figure>

  <h2 class="blk">三个反直觉的地方</h2>
  <ul class="ins">${p.insights.map(x => `<li>${esc(x)}</li>`).join("")}</ul>

  <h2 class="blk">证据 · 每条都能点过去</h2>
  <ol class="ev">
${ev}
  </ol>

  <h2 class="blk">顺着往下看</h2>
  <div class="related">${rel}
  </div>
${pager}
  ${footer(done.length)}
</main>
<script>
(() => {
  const btn = document.getElementById("embed-load");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const f = document.createElement("iframe");
    f.src = "../${p.diagram}";
    f.title = ${JSON.stringify(esc(p.title))} + " 交互式架构图";
    f.loading = "eager";
    const fig = document.getElementById("embed-load");
    fig.parentNode.replaceChild(f, fig);
  });
})();
</script>
</body>
</html>
`;
}

/* ---------- group pages ---------- */
function groupPage(g) {
  const items = done.filter(p => (GROUP_OF[p.id] || "model") === g.id);
  const cards = items.map(p => `
      <a class="card" href="../projects/${p.id}.html">
        <div class="thumb"><img src="../${p.thumb}" alt="${esc(p.title)} architecture diagram" loading="lazy" /></div>
        <div class="body">
          <div class="row"><span class="title">${esc(p.title)}</span><span class="repo">${esc(p.repo)}</span></div>
          <div class="tagline">${esc(p.en ? p.en.one : p.tagline)}</div>
        </div>
      </a>`).join("");

  return fill(head({
    title: `${g.labelEn} — Open Source Architecture Diagrams | ${DATA.site.name}`,
    desc: `${items.length} interactive architecture diagrams of ${g.labelEn.toLowerCase()}: ${items.map(p => p.title).join(", ")}. Every claim links to a source line.`,
    canonical: `${SITE}/groups/${g.id}.html`,
  }), "../") + fill(topbar("../"), "../") + `
<main class="wrap">
  <div class="crumb"><a href="../index.html">全部项目</a><span>/</span><span>${esc(g.label)}</span></div>
  <header class="proj-head">
    <h1>${esc(g.label)} <span class="cnt">${items.length}</span></h1>
    <p class="sub">${esc(g.labelEn)} · ${esc(g.desc)}</p>
  </header>
  <div class="grid">${cards}
  </div>
  ${footer(done.length)}
</main>
</body>
</html>
`;
}

/* ---------- write ---------- */
const notFound = fill(head({
  title: `404 · ${DATA.site.name}`,
  desc: "这个地址没有内容。回首页看看已拆的项目，或者点单。",
  canonical: `${SITE}/404.html`,
}), "") + fill(topbar(""), "") + `
<main class="wrap narrow" style="padding:110px 0 90px;text-align:center">
  <div style="font-size:72px;font-weight:800;letter-spacing:-4px;line-height:1;background:linear-gradient(100deg,var(--accent),var(--accent-2));-webkit-background-clip:text;background-clip:text;color:transparent">404</div>
  <p style="color:var(--muted);font-size:15.5px;line-height:1.8;margin:20px auto 30px;max-width:420px">
    这个地址没有东西。可能是链接少了斜杠，或者这个项目还没拆。
  </p>
  <a class="cta-btn" href="{BASE}index.html">回首页看看 →</a>
  <p style="margin-top:26px"><a href="{BASE}index.html#ask" style="color:var(--dim);font-size:13px">想看的项目不在这里？点单</a></p>
</main>
</body>
</html>
`;

writeFileSync(join(ROOT, "index.html"), indexHtml);
writeFileSync(join(ROOT, "404.html"), notFound);
if (!existsSync(join(ROOT, "projects"))) mkdirSync(join(ROOT, "projects"));
done.forEach((p, i) => {
  const page = projectPage(p, done[i - 1], done[i + 1]);
  writeFileSync(join(ROOT, "projects", `${p.id}.html`), page);
});

if (!existsSync(join(ROOT, "groups"))) mkdirSync(join(ROOT, "groups"));
GROUPS.forEach(g => writeFileSync(join(ROOT, "groups", `${g.id}.html`), groupPage(g)));

const urls = [`${SITE}/index.html`, ...GROUPS.map(g => `${SITE}/groups/${g.id}.html`), ...done.map(p => `${SITE}/projects/${p.id}.html`)];
writeFileSync(join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc><lastmod>${done[0]?.date || "2026-11-04"}</lastmod></url>`).join("\n")}
</urlset>
`);
writeFileSync(join(ROOT, "robots.txt"), `User-agent: *
Allow: /
Sitemap: ${SITE}/sitemap.xml
`);

console.log(`built: index.html + ${done.length} project page(s) + sitemap.xml + robots.txt`);
