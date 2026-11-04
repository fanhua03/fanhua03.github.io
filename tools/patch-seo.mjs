import fs from "node:fs";

const f = "build.mjs";
let s = fs.readFileSync(f, "utf8");
let hits = 0;
const rep = (a, b, tag) => {
  if (!s.includes(a)) { console.log("NO MATCH:", tag); return; }
  s = s.replace(a, b); hits++;
};

/* 1. 项目页 title / description 改用英文（面向搜索） */
rep(
  "    title: `${p.title} 架构图｜${p.headline} · ${DATA.site.name}`,\n    desc: `${p.tagline} 交互式架构图，${p.sources.length} 处结论可直接跳到 ${p.repo} 的源码行。`,",
  "    title: `${p.en ? p.en.title : p.title + \" 架构图｜\" + p.headline} · ${DATA.site.name}`,\n    desc: `${p.en ? p.en.desc : p.tagline}`,",
  "title/desc"
);

/* 2. h1 下面加一行英文摘要 */
rep(
  "    <p class=\"sub\">${esc(p.tagline)}</p>",
  "    <p class=\"sub\">${esc(p.tagline)}</p>\n    ${p.en ? `<p class=\"en\">${esc(p.en.one)}</p>` : \"\"}",
  "en line"
);

/* 3. 相关项目 */
rep(
  "  const pager = `",
  "  const rel = relatedProjects(p).map(x => `\n      <a class=\"rel\" href=\"${x.id}.html\">\n        <img src=\"../${x.thumb}\" alt=\"${esc(x.title)}\" loading=\"lazy\" />\n        <div><b>${esc(x.title)}</b><span>${esc(x.tagline)}</span></div>\n      </a>`).join(\"\");\n\n  const pager = `",
  "related def"
);

rep(
  "  </div>\n${pager}",
  "  </div>\n\n  <h2 class=\"blk\">顺着往下看</h2>\n  <div class=\"related\">${rel}\n  </div>\n${pager}",
  "related block"
);

/* 4. relatedProjects 函数（放在 projectPage 之前） */
rep(
  "/* ---------- project pages ---------- */",
  `/* ---------- related ---------- */
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

/* ---------- project pages ---------- */`,
  "related fn"
);

fs.writeFileSync(f, s);
console.log("patched:", hits, "/ 5");
