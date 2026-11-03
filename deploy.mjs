#!/usr/bin/env node
// 一键发布到 GitHub Pages。
// 用法：GH_TOKEN=xxx [GH_REPO=teardown] node deploy.mjs
// 依赖：node 22+（自带 fetch）、git、已存在的本地仓库与 main 分支。
import { execFileSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const TOKEN = process.env.GH_TOKEN;
const REPO = process.env.GH_REPO || "teardown";
const API = "https://api.github.com";

if (!TOKEN) {
  console.error("缺少 GH_TOKEN。用法：GH_TOKEN=ghp_xxx node deploy.mjs");
  process.exit(1);
}

const H = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "User-Agent": "teardown-deploy",
};

const log = (...a) => console.log("·", ...a);

async function api(path, init = {}) {
  const res = await fetch(API + path, {
    ...init,
    headers: { ...H, ...(init.body ? { "Content-Type": "application/json" } : {}), ...(init.headers || {}) },
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, ok: res.ok, body };
}

const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();

(async () => {
  // 1. 我是谁
  const me = await api("/user");
  if (!me.ok) {
    console.error("token 无效或权限不足：", me.status, me.body?.message || me.body);
    process.exit(2);
  }
  const login = me.body.login;
  log(`身份：${login}`);

  // 2. 仓库存在吗，不存在就建
  const exists = await api(`/repos/${login}/${REPO}`);
  if (exists.status === 404) {
    const created = await api("/user/repos", {
      method: "POST",
      body: JSON.stringify({
        name: REPO,
        description: "开源项目可视化拆解 · 热门开源项目的交互式架构图",
        private: false,
        has_issues: true,
        has_wiki: false,
      }),
    });
    if (!created.ok) {
      console.error("建仓失败：", created.status, created.body?.message || created.body);
      process.exit(3);
    }
    log(`仓库已创建：${login}/${REPO}`);
  } else if (exists.ok) {
    log(`仓库已存在：${login}/${REPO}（直接推）`);
  } else {
    console.error("查询仓库失败：", exists.status, exists.body?.message);
    process.exit(4);
  }

  // 3. 推代码（token 只临时出现在 remote 里，推完立刻还原）
  const clean = `https://github.com/${login}/${REPO}.git`;
  const withToken = `https://x-access-token:${TOKEN}@github.com/${login}/${REPO}.git`;
  try { git("remote", "remove", "origin"); } catch { /* 没有 origin 就算了 */ }
  git("remote", "add", "origin", withToken);
  try {
    log("推送 main …");
    git("push", "-u", "origin", "main", "--force");
    log("推送完成");
  } finally {
    git("remote", "set-url", "origin", clean);
    log("已从 git remote 中清除 token");
  }

  // 4. 开启 Pages（走 Actions 构建）
  const pages = await api(`/repos/${login}/${REPO}/pages`, {
    method: "PUT",
    body: JSON.stringify({ build_type: "workflow" }),
  });
  log(`Pages 设置：${pages.status} ${pages.ok ? "ok" : pages.body?.message || ""}`);

  // 5. 触发部署
  const dispatch = await api(`/repos/${login}/${REPO}/actions/workflows/pages.yml/dispatches`, {
    method: "POST",
    body: JSON.stringify({ ref: "main" }),
  });
  log(`触发部署：${dispatch.status} ${dispatch.ok ? "已排队" : dispatch.body?.message || ""}`);

  // 6. 等结果
  const url = `https://${login.toLowerCase()}.github.io/${REPO}/`;
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const runs = await api(`/repos/${login}/${REPO}/actions/runs?per_page=1`);
    const run = runs.body?.workflow_runs?.[0];
    if (!run) { process.stdout.write("."); continue; }
    if (run.status === "completed") {
      log(`构建${run.conclusion === "success" ? "成功" : "失败：" + run.conclusion}`);
      if (run.conclusion !== "success") log(`日志：${run.html_url}`);
      break;
    }
    process.stdout.write(".");
  }

  console.log(`\n站点地址：${url}`);
  console.log(`仓库地址：https://github.com/${login}/${REPO}`);
})().catch(e => {
  console.error("失败：", e.message);
  process.exit(9);
});
