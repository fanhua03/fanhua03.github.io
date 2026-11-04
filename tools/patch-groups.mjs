import fs from "node:fs";

const f = "build.mjs";
let s = fs.readFileSync(f, "utf8");
let hits = 0;
const rep = (a, b, tag) => {
  if (!s.includes(a)) { console.log("NO MATCH:", tag); return; }
  s = s.replace(a, b); hits++;
};

/* 1. 给分组加英文名 */
rep(
  `  { id: "runtime", label: "语言与运行时", desc: "一个请求进来，一行代码下去，机器上发生了什么" },
  { id: "model", label: "模型与推理", desc: "从一次前向、一份权重、一个 token 开始看" },
  { id: "kernel", label: "内核与通信", desc: "显卡上真正跑的代码，和卡与卡之间搬的数据" },
  { id: "infra", label: "分布式与数据", desc: "多机多盘之间，数据怎么放、怎么跑" },
  { id: "agent", label: "Agent 与工具", desc: "让模型自己动手的那一层" },`,
  `  { id: "runtime", label: "语言与运行时", labelEn: "Language Runtimes", desc: "一个请求进来，一行代码下去，机器上发生了什么" },
  { id: "model", label: "模型与推理", labelEn: "Models & Inference", desc: "从一次前向、一份权重、一个 token 开始看" },
  { id: "kernel", label: "内核与通信", labelEn: "Kernels & Communication", desc: "显卡上真正跑的代码，和卡与卡之间搬的数据" },
  { id: "infra", label: "分布式与数据", labelEn: "Distributed Systems & Data", desc: "多机多盘之间，数据怎么放、怎么跑" },
  { id: "agent", label: "Agent 与工具", labelEn: "Agents & Tools", desc: "让模型自己动手的那一层" },`,
  "groups en"
);

/* 2. 分组页生成器（放在 write 之前） */
rep(
  "/* ---------- write ---------- */",
  `/* ---------- group pages ---------- */
function groupPage(g) {
  const items = done.filter(p => (GROUP_OF[p.id] || "model") === g.id);
  const cards = items.map(p => \`
      <a class="card" href="../projects/\${p.id}.html">
        <div class="thumb"><img src="../\${p.thumb}" alt="\${esc(p.title)} architecture diagram" loading="lazy" /></div>
        <div class="body">
          <div class="row"><span class="title">\${esc(p.title)}</span><span class="repo">\${esc(p.repo)}</span></div>
          <div class="tagline">\${esc(p.en ? p.en.one : p.tagline)}</div>
        </div>
      </a>\`).join("");

  return fill(head({
    title: \`\${g.labelEn} — Open Source Architecture Diagrams | \${DATA.site.name}\`,
    desc: \`\${items.length} interactive architecture diagrams of \${g.labelEn.toLowerCase()}: \${items.map(p => p.title).join(", ")}. Every claim links to a source line.\`,
    canonical: \`\${SITE}/groups/\${g.id}.html\`,
  }), "../") + fill(topbar("../"), "../") + \`
<main class="wrap">
  <div class="crumb"><a href="../index.html">全部项目</a><span>/</span><span>\${esc(g.label)}</span></div>
  <header class="proj-head">
    <h1>\${esc(g.label)} <span class="cnt">\${items.length}</span></h1>
    <p class="sub">\${esc(g.labelEn)} · \${esc(g.desc)}</p>
  </header>
  <div class="grid">\${cards}
  </div>
  \${footer(done.length)}
</main>
</body>
</html>
\`;
}

/* ---------- write ---------- */`,
  "group page fn"
);

/* 3. 写分组页 + sitemap */
rep(
  'const urls = [`${SITE}/index.html`, ...done.map(p => `${SITE}/projects/${p.id}.html`)];',
  'if (!existsSync(join(ROOT, "groups"))) mkdirSync(join(ROOT, "groups"));\nGROUPS.forEach(g => writeFileSync(join(ROOT, "groups", `${g.id}.html`), groupPage(g)));\n\nconst urls = [`${SITE}/index.html`, ...GROUPS.map(g => `${SITE}/groups/${g.id}.html`), ...done.map(p => `${SITE}/projects/${p.id}.html`)];',
  "write groups"
);

fs.writeFileSync(f, s);
console.log("patched:", hits, "/ 3");
