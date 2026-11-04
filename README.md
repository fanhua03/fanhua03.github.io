# 开源项目可视化拆解 · Open-Source Teardowns

Interactive architecture diagrams for **34 real open-source projects**. Every claim is pinned to a
file and line you can open yourself.

**Read it online:** https://fanhua03.github.io/

Each project page has one diagram, one plain-words paragraph, three counterintuitive findings, and a
list of the source references behind them. The diagram is interactive: pan, zoom, and click the badge
on any node to jump to that line on GitHub.

## What is in here

| Project | The question it answers |
|---|---|
| [jq](https://fanhua03.github.io/projects/jq.html) | How does one filter emit several values without coroutines? |
| [Redis](https://fanhua03.github.io/projects/redis.html) | What does one thread actually optimise? |
| [3FS](https://fanhua03.github.io/projects/3fs.html) | Why write to one node and read from any? |
| [FlashMLA](https://fanhua03.github.io/projects/flashmla.html) | What do 384 threads in one CTA do? |
| [DeepSeek-V3](https://fanhua03.github.io/projects/deepseek-v3.html) | Where does 576 come from, instead of 32,768? |
| [DeepEP](https://fanhua03.github.io/projects/deepep.html) | How does an all-to-all stay in the microseconds? |
| [DeepGEMM](https://fanhua03.github.io/projects/deepgemm.html) | Why compile the kernel at runtime? |
| [DeepInfer](https://fanhua03.github.io/projects/deepinfer.html) | Where does the GPU wait, and who removes it? |
| [DeepSeek Harness](https://fanhua03.github.io/projects/dsh.html) | What is left when everything is a plugin? |
| …and 25 more | [index](https://fanhua03.github.io/) |

The full set: jq · 3FS · Redis · FlashMLA · DeepSeek-V3 · DeepEP · DeepGEMM · smallpond ·
DeepSeek-OCR · EPLB · TileKernels · DeepSeek-VL2 · Janus · DeepInfer · DualPipe · Engram ·
DeepSeekMoE · DeepJIT · deepseek-recipe · DeepSpec · DreamCraft3D · DeepSeek Harness ·
DeepSeek-V3.2-Exp · LPLB · DeepSeek-Coder · DeepSeek-Prover-V1.5 · DeepGEMM-Ascend ·
DeepEP-Ascend · DeepSeek-VL · DeepSeek-OCR 2 · dsh-superagent · profile-data · DeepSeek-Math ·
DeepSeekMath-V2

## The rule

**No code, no diagram.** Repositories that ship only a README and a paper are skipped — four of them
were dropped for exactly this reason while building this set. A claim that cannot be pointed at a
source line does not go in.

## How it is built

```
data/projects.json      one record per project: headline, plain-words summary,
                        three findings, and the source references
build.mjs               generates index.html, one page per project, group pages,
                        sitemap.xml and 404.html
assets/diagrams/*.html  the interactive diagrams (self-contained)
assets/thumbs/*.webp    card thumbnails
```

Regenerate everything with `node build.mjs`. No dependencies, no build step, static output.

## Licence

Text and diagrams: CC BY-NC 4.0. The projects themselves belong to their respective authors (each page
links to the repository and the exact revision the diagram was drawn from).
