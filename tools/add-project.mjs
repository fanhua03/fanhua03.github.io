#!/usr/bin/env node
// 把一个新项目并入站点：
//   node tools/add-project.mjs <entry.json> <diagram.html> [thumb.png]
// entry.json 是 {id,title,headline,tagline,repo,revision,langs,loc,date,tags,insights,sources}
// 会把 diagram 拷到 assets/diagrams/<id>.html、thumb 拷到 assets/thumbs/<id>.png、更新 data/projects.json、重新 build。
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const [entryPath, diagramPath, thumbPath] = process.argv.slice(2);

if (!entryPath || !diagramPath) {
  console.error("用法: node tools/add-project.mjs <entry.json> <diagram.html> [thumb.png]");
  process.exit(1);
}

const entry = JSON.parse(readFileSync(entryPath, "utf8"));
if (!entry.id) throw new Error("entry 缺少 id");

const dataPath = join(ROOT, "data/projects.json");
const data = JSON.parse(readFileSync(dataPath, "utf8"));

// 1. 资源
const diagramDest = `assets/diagrams/${entry.id}.html`;
copyFileSync(diagramPath, join(ROOT, diagramDest));
entry.diagram = diagramDest;

const thumbDest = `assets/thumbs/${entry.id}.png`;
if (thumbPath && existsSync(thumbPath)) {
  copyFileSync(thumbPath, join(ROOT, thumbDest));
  entry.thumb = thumbDest;
} else {
  entry.thumb = "";
}

// 2. 项目（同 id 覆盖）
const idx = data.projects.findIndex(p => p.id === entry.id);
if (idx >= 0) data.projects[idx] = entry;
else data.projects.push(entry);

// 3. 从待拆清单里移除（按 title 或 repo 名匹配）
const name = entry.title.toLowerCase();
const before = data.roadmap.length;
data.roadmap = data.roadmap.filter(r => {
  const t = String(r[0]).toLowerCase();
  const repo = String(r[1]).toLowerCase().split("/")[1] || "";
  return t !== name && repo !== name && repo !== entry.repo.toLowerCase().split("/")[1];
});

writeFileSync(dataPath, JSON.stringify(data, null, 2) + "\n");
console.log(`· 项目：${entry.id}（共 ${data.projects.length} 个）`);
console.log(`· 待拆清单：${before} → ${data.roadmap.length}`);
console.log(`· 图：${diagramDest} ${thumbPath ? "· 缩略图：" + thumbDest : "· 无缩略图"}`);

execFileSync(process.execPath, [join(ROOT, "build.mjs")], { cwd: ROOT, stdio: "inherit" });
