import fs from "node:fs";

const p = "data/projects.json";
const d = JSON.parse(fs.readFileSync(p, "utf8"));

// 英文版内容：plain_en + insights_en
const EN = {
  jq: {
    plain: "jq is a small command-line tool for JSON. Give it a rule and it reshapes the data. The surprising part: one rule can produce several results, because jq saves its position before it yields a value and resumes from there next time.",
    insights: [
      "One filter can yield many results because jq bookmarks the VM: it records where it stopped, hands you a value, then resumes from that bookmark.",
      "The built-in functions (map, select, ...) are not C — they are written in jq's own language and compiled together with your program, which is why names must be bound before bytecode is generated.",
      "The longest file in the repo is not the VM. It is a 4,276-line number formatter, so that 1e1000 prints back as 1e1000 instead of inf.",
    ],
  },
  "3fs": {
    plain: "3FS is DeepSeek's own network filesystem for training data. Every chunk lives on three machines in a chain: writes go to the head, reads can go to any of them, so read bandwidth grows with the number of replicas.",
    insights: [
      "Every chunk sits on three machines in a chain. Writes hit the head and are forwarded downstream; reads are served by any replica, so more copies means faster reads.",
      "Directory metadata is not stored locally: it all goes to FoundationDB. That is why every metadata server is stateless and can be replaced at any time.",
      "The kernel FUSE path tops out around 400k small reads per second, so 3FS ships a native client that writes into shared memory and lets the NIC read it directly — zero copy.",
    ],
  },
  redis: {
    plain: "Redis keeps data in memory. It is fast not because it parallelises, but because one thread does everything: no locks, no waiting. The real limit is the network round trip, not the CPU.",
    insights: [
      "Every command runs start-to-finish on a single thread, so nothing needs a lock. The bottleneck is the network round trip (0.1 ms), not the computation.",
      "Small hashes are not hash tables. They live in one contiguous blob, which is cheaper and faster to read. Only past a threshold do they become a real dict.",
      "fsync never happens on the main thread: commands go into an in-memory buffer, get flushed to the kernel later, and the actual disk sync is done by a background thread.",
    ],
  },
  flashmla: {
    plain: "FlashMLA is a GPU program that does exactly one thing: attention for DeepSeek's MLA. It splits one GPU block of work across 384 threads, each owning a slice, then stitches the results back together.",
    insights: [
      "One CTA is split across 384 threads: 128 compute exponentials, 128 dequantize cached values, one issues the matrix instruction, one moves data, one computes addresses.",
      "The KV cache is stored compressed; the kernel computes page and offset on the fly, fetching four rows per gather and 64 rows in sixteen gathers. Out-of-range indices become -1 and the hardware skips them.",
      "Compression is aggressive: 512 numbers become 8-bit integers, position encoding included, plus a 16-byte scale. One token costs 528 bytes; the fp4 variant costs 256.",
    ],
  },
  "deepseek-v3": {
    plain: "This is the official inference code for DeepSeek-V3, one page of Python. It shows the exact order of operations that turns a prompt into the next token.",
    insights: [
      "The 128 attention heads do not need 32,768 stored values: only 512 compressed numbers plus 64 position numbers, 576 in total — 1.76% of the naive cache.",
      "The compression happens before scoring: the query is folded into the same 512-dim latent, so scoring becomes two small matrix products, and the output is expanded back to 128 dims.",
      "Expert selection has two gates: 256 experts are grouped into 8, four groups are kept, then 8 experts are picked inside them. Weights use raw sigmoid values, normalised, times 2.5.",
    ],
  },
  deepep: {
    plain: "DeepEP moves tokens between GPUs. On the same node it copies straight into the peer's memory; only cross-node traffic goes over the network, so most of the data never leaves the box.",
    insights: [
      "The number of SMs and queue pairs is derived from a bandwidth model: 9 QPs in direct mode, SMs × 16 + 1 in hybrid mode.",
      "Counting arrivals does not involve every thread: a dedicated notify warp fuses the counter and the arrival count into one 64-bit atomic.",
      "Same-node peers are written through symmetric addresses with TMA; cross-node traffic lands in a send buffer first and goes out over RDMA.",
    ],
  },
  deepgemm: {
    plain: "DeepGEMM is a matrix-multiplication library that compiles itself at runtime: only then does it know the shape and dtype, so it can emit a kernel tuned for exactly that case.",
    insights: [
      "Nothing is compiled ahead of time: 30 template arguments (block shape, pipeline stages, thread count, dtype) are baked into a cubin, and at runtime only a launch remains.",
      "The number of pipeline stages is derived, not tuned: given 232,448 bytes of shared memory, fit as many as possible. Tile shapes are first filtered by a 512-column tmem limit.",
      "The grid is exactly the number of SMs. Each block finishes a tile and grabs the next one by arithmetic, so no scheduler hands out work.",
    ],
  },
  smallpond: {
    plain: "smallpond splits a large dataframe job into many small tasks and runs them on 3FS. Each task opens a throwaway DuckDB, computes, writes Parquet, and exits.",
    insights: [
      "A job becomes producer and consumer task groups: the producer count is computed from the worker count and CPU budget, and consumers only merge partitions instead of moving data.",
      "There is no long-running service: a scheduler process launches workers with mpirun, and the task queue is a directory on 3FS where claiming a task means winning a rename.",
      "Every task opens its own in-memory DuckDB: read Parquet, compute, write Parquet, exit. Nothing stays resident between tasks.",
    ],
  },
  dsocr: {
    plain: "DeepSeek-OCR reads a page as an image: it compresses the page into a small number of visual tokens, then lets a language model write the text back out. However many words the page has, the model sees roughly the same amount of input.",
    insights: [
      "The compression happens inside the vision encoder: a 1024×1024 image is cut into 16-pixel patches, downsampled twice, and ends up as a 16×16 grid of 256 tokens.",
      "One page always costs 273 slots: a 16×16 grid gets one newline per row plus one separator at the end, which is 16 × 17 + 1.",
      "Cost depends on image size, not word count: 512 px → 64 tokens, 1024 → 256, 1280 → 400. Layout comes back from coordinates embedded in the output text.",
    ],
  },
  eplb: {
    plain: "In a mixture-of-experts model some experts get overloaded while others idle. EPLB replicates the busy ones and spreads the copies so every GPU carries a similar load.",
    insights: [
      "Hot experts get extra replicas: each round picks the hottest expert by comparing load against replica count.",
      "Packing is greedy: heaviest group first, placed into the currently lightest bin, and every bin must end up with the same count.",
      "Packing happens twice: once to spread expert groups across nodes, once to spread replicas across GPUs. The global mode skips the first pass.",
    ],
  },
  tilekernels: {
    plain: "GPU kernels usually mean hand-managing threads and shared memory. TileKernels describes work block by block and lets a compiler turn that into threads and memory movement, so the same source can target different backends.",
    insights: [
      "You declare how many blocks and threads, then describe copies and maths block by block; the compiler fills in the rest.",
      "Block and thread counts are derived: small batches use 64 threads × 32 elements, and the reduction width is the gcd with the hidden size.",
      "The same source targets another backend: on Ascend a different launcher is picked and shapes are left dynamic until runtime.",
    ],
  },
  "deepseek-vl2": {
    plain: "This is a model that can look at a picture and talk about it. It slices the image, folds each slice into a few numbers, and puts them inline with your question — then the text model answers as usual.",
    insights: [
      "The image is tiled first: one global view for the big picture, plus crops chosen by aspect ratio, so detail is decided per image.",
      "Each tile becomes 27×27 = 729 patches, the projector merges 2×2 into one, giving 196 tokens plus one newline per row: 210 words per tile, inline with the text.",
      "There is no second language model: the text side is the original DeepSeek-V2 MoE decoder. The new parts are the vision tower, a projector, and two learned separator tokens.",
    ],
  },
  janus: {
    plain: "Janus understands images and also draws them. Instead of forcing one image encoder to do both, it uses two: one that turns an image into meaning, one that turns it into reconstructable pieces. Both feed the same language model.",
    insights: [
      "Understanding and generation need different things: one needs meaning, the other needs pixels. Sharing a single encoder forces both to compromise, so Janus keeps two.",
      "The understanding path turns a 384×384 image into 576 tokens that simply replace the image placeholder; after that it is ordinary chat.",
      "The generation path emits 576 discrete codes one at a time, feeding each back in; a dedicated decoder then upsamples them 16× into an image.",
    ],
  },
  deepinfer: {
    plain: "DeepInfer is the inference engine behind DeepSeek's serving. Requests are queued, batched, scheduled, and the bookkeeping is pushed off the critical path so the GPU never waits.",
    insights: [
      "Requests queue up and get batched together; whether a batch reads a prompt or keeps writing is decided by a vote across machines every few steps.",
      "To keep the GPU busy, the tail end of one step is deliberately deferred into the next model computation, and launches are issued without waiting.",
      "Memory is accounted in fixed-size blocks returned to a counter-tagged free list; when blocks run short, the request that has written the most is preempted first.",
    ],
  },
  dualpipe: {
    plain: "Training a big model spreads it over many machines in a pipeline. While one machine waits for data, it idles — DualPipe fills that idle time by running two directions at once.",
    insights: [
      "Each machine owns two model chunks, one near the front of the pipeline and one near the back, so two data directions can alternate and keep both busy.",
      "Communication does not block computation: all sends and receives are posted together, then the machine computes and only collects results afterwards.",
      "Backward is split in two halves; the weight-gradient half is stored and computed later in a gap, so the last pipeline stages do not stall.",
    ],
  },
  engram: {
    plain: "Big models usually scale by adding more experts to compute. Engram bets some things do not need computing at all: common word combinations can be looked up in a giant table.",
    insights: [
      "The table is built from n-grams: separate tables for 2- and 3-word combinations, each split into 8 heads with its own modulus, so one phrase lands in eight different buckets.",
      "Addresses are computed, not learned: text is normalised, then a fixed multiply-xor-modulo turns it into an index, so the same input always hits the same row.",
      "Retrieved vectors are not simply summed: they are gated by the current state, then smoothed by a short convolution before being added back as a residual.",
    ],
  },
  "deepseekmoe-routing": {
    plain: "This is the official MoE code (shipped inside the DeepSeek-VL2 repo, because the V2 and DeepSeek-MoE repos only carry a paper). It splits one big layer into many narrow experts and sends each token to a few of them — with a penalty that stops every token from picking the same one.",
    insights: [
      "One wide feed-forward layer becomes many narrow experts; each token visits only a few, so the number of reachable combinations explodes while compute per token stays flat.",
      "Training adds a penalty: the fraction of tokens each expert receives, times its average score, summed. Skew makes the penalty large, and gradients push the gate back toward even use.",
      "Sending tokens to experts has two code paths: training duplicates each token per expert, inference sorts by expert and does one pass, with all-to-all across GPUs.",
    ],
  },
  deepjit: {
    plain: "GPU code is normally compiled ahead of time and shipped in the installer. DeepJIT compiles on first use instead: it builds the kernel, caches the binary, and reads it back next time.",
    insights: [
      "Compiled artifacts are fingerprinted by source, compiler version and options; an identical fingerprint means the old binary is reused.",
      "Two cache levels: an in-process map, then a directory on disk. On disk it writes a commit marker and renames, so others see nothing or something complete.",
      "The first encounter pays a compiler invocation; afterwards the same machine and options never recompile, and register spills are checked after building.",
    ],
  },
  dsrecipe: {
    plain: "There are several chat APIs in the world, each shaped differently. This library folds any of them into one conversation structure, renders that into a prompt, encodes it into tokens, and translates the model's output back into the format the caller expects.",
    insights: [
      "Every incoming protocol is converted into one conversation structure first, so nothing downstream has to care which API it came from.",
      "Rendering to a prompt records where the special markers landed, so encoding does not have to search the string again.",
      "Streaming is translated as it arrives: each fragment is parsed into events and re-wrapped into the caller's format immediately.",
    ],
  },
  deepspec: {
    plain: "It speeds up generation by guessing: a small draft model proposes the next few tokens, the big model checks them all in one pass, and however many match are accepted at once.",
    insights: [
      "The draft model is tiny, five layers, and guesses by reading internal features borrowed from five layers of the target model.",
      "It drafts seven tokens, then scores its own confidence and truncates the tail it is unsure about before handing the block over.",
      "Verification compares probabilities position by position; the first mismatch ends the run, and the number of accepted tokens per round is the actual speedup.",
    ],
  },
  dreamcraft: {
    plain: "It turns a sentence into a 3D object: grow a rough shape in 3D, photograph it from random angles, let an image model criticise the photos, and adjust. Once the shape is right, paint it.",
    insights: [
      "Three stages: a coarse implicit shape at 256, a mesh extracted from it, then colour at 1024 with geometry frozen.",
      "The critic is a diffusion model shown random views: it predicts noise twice and the difference becomes the gradient that reshapes the 3D object.",
      "The model also fine-tunes that critic on its own renders, so the judge gets better at this particular object each round.",
    ],
  },
  dsv32: {
    plain: "Long context means every new token would normally look back at everything. Sparse attention spends a small budget picking the 2,048 most relevant keys and only lets those take part.",
    insights: [
      "The selector is a second, small attention: 64 index heads of 128 dims each, with q and k quantised to fp8.",
      "64 scores are ReLU'd and summed per head into a single score per key, then the top 2,048 are kept.",
      "The reference implementation saves nothing: it computes the full q·k table and masks it with -inf. Real savings require a deployment that computes only the selected keys.",
    ],
  },
  lplb: {
    plain: "Some experts get more tokens than others in every batch. When an expert has a replica elsewhere, this project recomputes each batch how much work each replica should take, smoothing the load.",
    insights: [
      "EPLB fixes long-term imbalance by replicating experts; LPLB fixes per-batch jitter by deciding where this batch's tokens go.",
      "It treats how much each replica accepts as variables in a small linear program, minimising the busiest GPU.",
      "Solving costs about 100 microseconds per batch, and under extreme imbalance the simple approach can still win.",
    ],
  },
  dscoder: {
    plain: "This repo is not the model — the weights live on Hugging Face. It is the exam room: write dozens of answers per problem, strip the chatter, append the official tests, run them in a sandbox, and score pass@k.",
    insights: [
      "There is no model code here: weights are on Hugging Face, and the repo holds evaluation, fine-tuning and a demo.",
      "Each problem gets 40 samples, cleaned by keyword, completed with the reference tests, then executed in a separate process with a 10-second cap.",
      "The score is pass@k: draw k of the 40 samples, pass if any of them works — a measure of whether trying more helps.",
    ],
  },
  prover: {
    plain: "The model writes a proof one step at a time and a proof assistant decides whether each step is valid. Wrong steps are abandoned, promising branches are explored further.",
    insights: [
      "Each step is a single tactic handed to Lean; a compile error or a leftover sorry counts as unfinished.",
      "Attempts form a tree: every node records the goal state, and the next branch is chosen by balancing exploration against the best-known score.",
      "A single problem may need thousands of samples: 6,400 by default, shared across 256 search processes that all grow the same tree.",
    ],
  },
  "gemm-ascend": {
    plain: "The same matrix multiplication, but Ascend silicon has a different staircase for data: it moves GM → L1 → L0 → L0C. No TMA, no thread-block clusters, and even the scale factors have to be repacked.",
    insights: [
      "TMA and clusters have no counterpart here: neither appears anywhere in the repo, and data movement becomes two explicit copy instructions.",
      "NVIDIA shared memory becomes L1 and TMEM becomes L0C; if a tile does not fit, it fails at compile time rather than silently spilling.",
      "Even the scale factors change format: a pair of exponents is packed into one int16 and stored in MN-major order.",
    ],
  },
  "ep-ascend": {
    plain: "Same token exchange, different rails. On Ascend the symmetric writes become UBMEM, the RDMA puts become URMA, and even the way a peer address is computed has to be rewritten.",
    insights: [
      "NCCL becomes HCCL, RDMA queue pairs become Jetty channels, and the window becomes a symmetric buffer you allocate and register yourself.",
      "There is no fallback: construction asserts that every peer is reachable over UBMEM, instead of degrading to the network.",
      "URMA can still be reading the source after the kernel exits, so a dedicated environment flag is required to stay correct.",
    ],
  },
  "deepseek-vl": {
    plain: "The first DeepSeek model that could see. It gives every image two sets of eyes — one for detail, one for meaning — then concatenates what each saw and hands it to the language model.",
    insights: [
      "Two encoders with different jobs: one sees a 1024-wide view and answers where things are, the other sees a 384-wide view and answers what they resemble.",
      "Fusion is plain: each side projects to half the width, then the two maps are concatenated along channels, which only works if the grids match.",
      "The fixed budget is the flaw: an extreme aspect ratio is resized to 1024 and padded into a square, so a thin strip is mostly blank, and cost never tracks content.",
    ],
  },
  "deepseek-ocr-2": {
    plain: "The second generation stops letting the model scan the page. Instead a queue of learned queries reads the image in order, each one seeing the image plus everything the earlier queries concluded.",
    insights: [
      "The encoder is new: SAM turns the page into a feature map, then a 24-layer Qwen2 — normally a language decoder — reads those features.",
      "Order is the point: image features and a fixed set of queries share one sequence with a mixed visibility mask. Images see each other; a query only sees earlier queries.",
      "The query count equals the feature count: 256 features for a 1024 image pair with 256 queries, 144 with 144, so both fit one 896-wide sequence.",
    ],
  },
  dsh: {
    plain: "This is DeepSeek's own coding agent. What makes it unusual: even the agent loop, the system prompt and the tool table are plugins, loaded from a config file. Swap one and the whole behaviour changes.",
    insights: [
      "The loop, the prompt, the tool table and the session store are separate packages loaded into one container; the main line lives in configuration, not in code.",
      "The system prompt is not a constant: each step resolves the available tools and re-assembles the prompt, so adding a tool changes what the model is told.",
      "One model turn can emit several tool calls, all executed together, each result appended to the session so the next turn sees the full history.",
    ],
  },
  superagent: {
    plain: "Someone asks for a change in a repository; this program decides whether to take the job, works in its own directory, and files a progress report — the report decides whether it continues or waits for a human.",
    insights: [
      "It does not plan once and execute: every turn ends with one of five statuses — progress, ready, blocked, failed, dropped.",
      "Before accepting, every enabled rule must be answered, and accepting also requires inventing a short English working-directory name.",
      "A turn is not finished while background shell jobs are alive; it stays working and waits up to 30 minutes.",
    ],
  },
  profiledata: {
    plain: "Three recorded runs of a training job, nothing else. Load them into a trace viewer and you can see whether computation and communication really ran side by side.",
    insights: [
      "Three traces cover training, prefill and decode, each with different parallelism and batch settings, so conclusions only hold for that configuration.",
      "Every event carries a timestamp, a duration and a stream id; a trace viewer draws all streams on one time axis.",
      "Overlap is arithmetic: a 6,074 µs combine interval fully contains a 3,863 µs attention kernel, which anyone can recompute from the two line numbers.",
    ],
  },
  dsmath: {
    plain: "This is not a training repo, it is a marking scheme. It formats the question, lets the model write a solution, digs the final answer out of the prose, then compares numbers and then expressions.",
    insights: [
      "Nothing here trains a model: questions are wrapped in each dataset's few-shot template and handed to inference.",
      "The answer has to be extracted from prose: first look for a boxed expression, then for 'the answer is', and otherwise take the last number.",
      "Marking is not string equality: compare numerically within 1e-3, and when that fails, ask a computer algebra system whether the two expressions are the same.",
    ],
  },
  dsmathv2: {
    plain: "No reference answers: the model writes proofs, grades its own proofs, has those grades checked, then revises the best ones — round after round.",
    insights: [
      "Each proof is scored 0, 0.5 or 1 by the model itself, four times, averaged, so a single bad judgement does not dominate.",
      "Those scores are then meta-verified: a second pass judges whether the critique actually points at real errors.",
      "After a round the top six proofs are recombined into up to sixteen revision prompts; a proof scoring 0.99999 stops the loop.",
    ],
  },
};

let n = 0;
for (const proj of d.projects) {
  const e = EN[proj.id];
  if (!e) { console.log("missing en:", proj.id); continue; }
  proj.plain_en = e.plain;
  proj.insights_en = e.insights;
  n++;
}
fs.writeFileSync(p, JSON.stringify(d, null, 2) + "\n");
console.log("english content added:", n, "/", d.projects.length);
