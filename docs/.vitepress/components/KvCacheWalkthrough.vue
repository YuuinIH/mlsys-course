<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const tokens = ['x₁', 'x₂', 'x₃', 'x₄', 'y₁', 'y₂']
const stages = [
  { name: 'Prefill · 计算输入', group: 0, inputs: tokens.slice(0, 4), cached: 0, pending: 4, freshFrom: 0, output: '', note: '处理四个输入位置，分别算出本层的 Q、K、V。K、V 准备写入缓存。' },
  { name: 'Prefill · 保留输入的 KV', group: 0, inputs: tokens.slice(0, 4), cached: 4, pending: 0, freshFrom: 0, output: 'y₁', note: '四组 K、V 已保存。完成后续计算后选出 y₁；y₁ 的 KV 要等下一轮才计算。' },
  { name: '第一轮 Decode · 处理 y₁', group: 1, inputs: ['y₁'], cached: 4, pending: 1, freshFrom: 4, output: '', note: '输入 y₁，只新算这个位置的 Q、K、V。四个输入位置的 KV 保持不变、继续复用。' },
  { name: '第一轮 Decode · 保存 y₁ 的 KV', group: 1, inputs: ['y₁'], cached: 5, pending: 0, freshFrom: 4, output: 'y₂', note: '缓存增加 y₁ 的一组 K、V。完成后续计算后选出 y₂，它将在下一轮被处理。' },
  { name: '第二轮 Decode · 处理 y₂', group: 2, inputs: ['y₂'], cached: 5, pending: 1, freshFrom: 5, output: '', note: '输入 y₂，复用五个位置的 KV，只为当前新位置计算一组 Q、K、V。' },
  { name: '第二轮 Decode · 保存 y₂ 的 KV', group: 2, inputs: ['y₂'], cached: 6, pending: 0, freshFrom: 5, output: 'y₃', note: '缓存已保存六个位置的 K、V。新输出是 y₃，此时缓存尚不包含 y₃ 的状态。' }
]
const groups = ['Prefill', '第一轮 Decode', '第二轮 Decode']
const step = ref(0)
const stage = computed(() => stages[step.value])
const playing = ref(false)
const ready = ref(false)
const cacheViewport = ref<HTMLDivElement | null>(null)
let timer: ReturnType<typeof setInterval> | undefined

watch(step, async () => {
  await nextTick()
  const viewport = cacheViewport.value
  if (!viewport || viewport.scrollWidth <= viewport.clientWidth) return
  if (stage.value.group === 0) {
    viewport.scrollLeft = 0
    return
  }
  const cell = viewport.querySelector('tbody tr td.pending, tbody tr td.new')
  if (!cell) return
  const bounds = cell.getBoundingClientRect()
  const visible = viewport.getBoundingClientRect()
  if (bounds.right > visible.right - 8 || bounds.left < visible.left + 40) {
    viewport.scrollLeft += bounds.right - visible.right + 8
  }
})

function pause() {
  if (timer !== undefined) clearInterval(timer)
  timer = undefined
  playing.value = false
}

function goTo(index: number) {
  pause()
  step.value = Math.max(0, Math.min(index, stages.length - 1))
}

function togglePlayback() {
  if (playing.value) return pause()
  if (step.value === stages.length - 1) step.value = 0
  playing.value = true
  timer = setInterval(() => {
    step.value += 1
    if (step.value === stages.length - 1) pause()
  }, 2600)
}

function cellState(index: number) {
  if (index < stage.value.cached) return index >= stage.value.freshFrom ? 'new' : 'retained'
  return index < stage.value.cached + stage.value.pending ? 'pending' : 'empty'
}

function onVisibilityChange() {
  if (document.hidden) pause()
}

onMounted(() => {
  ready.value = true
  document.addEventListener('visibilitychange', onVisibilityChange)
})
onUnmounted(() => {
  pause()
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <section class="kv-demo" :class="{ 'is-computing': stage.pending > 0 }" aria-label="KV Cache 逐步演示" :data-step="step">
    <div class="kv-heading">
      <strong>本步算出的向量，哪些要留到下一步？</strong>
      <span>只画一层、一个 KV Head</span>
    </div>
    <div class="kv-groups" role="group" aria-label="选择生成阶段">
      <button v-for="(name, index) in groups" :key="name" type="button"
        :disabled="!ready" :aria-pressed="stage.group === index" @click="goTo(index * 2)">{{ name }}</button>
    </div>

    <div class="kv-pipeline">
      <div class="kv-card kv-input">
        <div class="kv-label">本步处理的 Token</div>
        <div class="kv-token-list"><span v-for="token in stage.inputs" :key="token" class="kv-token">{{ token }}</span></div>
        <span class="kv-muted">{{ stage.group === 0 ? '输入 Prompt' : '上一轮选出的输出' }}</span>
      </div>
      <span class="kv-arrow" aria-hidden="true">→</span>
      <div class="kv-card kv-compute">
        <div class="kv-label">每个新位置分别计算</div>
        <div class="kv-projections">
          <div v-for="kind in ['Q', 'K', 'V']" :key="kind" class="kv-projection" :class="kind.toLowerCase()">
            <strong>{{ kind }}</strong><span class="kv-vector" aria-hidden="true"><i v-for="n in 4" :key="n" :style="{ opacity: 0.4 + n * 0.14 }" /></span>
          </div>
        </div>
        <span class="kv-muted">Q 在本步使用；K、V 保留复用</span>
      </div>
      <span class="kv-arrow" aria-hidden="true">→</span>
      <div class="kv-card kv-output">
        <div class="kv-label">完成后续计算，选出</div>
        <div v-if="stage.output" class="kv-token kv-next-token">{{ stage.output }}</div>
        <span v-else class="kv-waiting">等待本步完成</span>
        <span class="kv-muted">{{ stage.output ? '下一轮处理，尚未计算 KV' : '其余层与输出计算省略' }}</span>
      </div>
    </div>

    <div class="kv-storage-note"><span class="kv-query-note">Q 读取本层当前及之前位置的 K、V</span><span>K、V 写入下面的缓存 ↓</span></div>
    <div class="kv-cache-heading"><strong>本层 KV Cache</strong><span>已保留 {{ stage.cached }} 个 Token 位置</span></div>
    <div ref="cacheViewport" class="kv-scroll" tabindex="0" role="region" aria-label="各 Token 位置的 Key 与 Value，可横向滚动">
      <table class="kv-matrix">
        <thead><tr><th scope="col">位置</th><th v-for="token in tokens" :key="token" scope="col">{{ token }}</th></tr></thead>
        <tbody>
          <tr v-for="kind in ['K', 'V']" :key="kind">
            <th scope="row">{{ kind }}</th>
            <td v-for="(token, index) in tokens" :key="token" :class="[cellState(index), kind.toLowerCase()]">
              <div v-if="index < stage.cached" class="kv-stored-vector" :aria-label="`${token} 的 ${kind} 向量，${cellState(index) === 'new' ? '本步写入' : '保留复用'}`">
                <span>{{ kind }}({{ token }})</span>
                <span class="kv-vector" aria-hidden="true"><i v-for="n in 4" :key="n" :style="{ opacity: 0.4 + ((index + n + (kind === 'V' ? 1 : 0)) % 4) * 0.18 }" /></span>
              </div>
              <span v-else class="kv-placeholder">{{ cellState(index) === 'pending' ? '待写入' : '未计算' }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <span class="kv-scroll-hint">左右滑动查看各个位置；Decode 时自动显示新增位置。</span>
    <div class="kv-legend"><span><i class="kv-dot reused" />保留复用</span><span><i class="kv-dot added" />本步写入</span><span><i class="kv-dot pending" />待写入</span></div>
    <p class="kv-status" role="status" aria-live="polite" aria-atomic="true"><strong>{{ stage.name }}</strong><span>{{ stage.note }}</span></p>
    <div class="kv-controls">
      <button type="button" class="kv-play" :disabled="!ready" :aria-pressed="playing" @click="togglePlayback">{{ playing ? '暂停' : step === stages.length - 1 ? '重播' : '播放' }}</button>
      <button type="button" :disabled="!ready || step === 0" @click="goTo(step - 1)">上一步</button>
      <button type="button" :disabled="!ready || step === stages.length - 1" @click="goTo(step + 1)">下一步</button>
      <button type="button" :disabled="!ready || step === 0" @click="goTo(0)">回到开始</button>
      <span class="kv-step-count">{{ step + 1 }} / {{ stages.length }}</span>
    </div>
    <div class="kv-footnote">每个向量内的条纹仅作示意。其他层各自保存 KV；阶段时长不对应真实耗时。</div>
  </section>
</template>

<style scoped>
.kv-demo {
  --kv-blue: #3974b8; --kv-green: #267a68; --kv-purple: #7855a4;
  --kv-old: #edf4fc; --kv-new: #fff1dc; --kv-new-border: #b87a2a;
  --kv-line: #c4cfdd; --kv-panel: #f5f7fa;
  margin: 24px 0 8px; padding: 20px; border: 1px solid var(--kv-line); border-radius: 14px; scroll-margin-top: 90px;
  background: var(--vp-c-bg); color: var(--vp-c-text-1); font-size: 14px; line-height: 1.6;
}
:global(.dark .kv-demo) {
  --kv-blue: #85b2eb; --kv-green: #80cdb8; --kv-purple: #c5a3f1;
  --kv-old: #23364b; --kv-new: #463924; --kv-new-border: #e6b568;
  --kv-line: #526175; --kv-panel: #242c38;
}
.kv-heading { display: flex; flex-wrap: wrap; gap: 4px 16px; justify-content: space-between; align-items: baseline; }
.kv-heading strong { font-size: 17px; }
.kv-heading > span, .kv-muted, .kv-footnote, .kv-step-count { font-size: 12px; color: var(--vp-c-text-2); }
.kv-groups { display: flex; gap: 6px; margin: 16px 0; flex-wrap: wrap; }
.kv-demo button { border: 1px solid var(--kv-line); border-radius: 7px; padding: 5px 11px; font: inherit; font-size: 13px; color: inherit; background: var(--vp-c-bg); cursor: pointer; }
.kv-demo button:hover:not(:disabled) { border-color: var(--kv-blue); }
.kv-demo button:focus-visible, .kv-scroll:focus-visible { outline: 3px solid var(--kv-blue); outline-offset: 3px; }
.kv-demo button:disabled { opacity: 0.4; cursor: default; }
.kv-groups button[aria-pressed='true'] { color: var(--kv-blue); border-color: var(--kv-blue); background: var(--kv-old); }
.kv-pipeline { display: grid; grid-template-columns: 1fr 20px 1.35fr 20px 1.1fr; align-items: stretch; gap: 5px; }
.kv-card { padding: 12px 10px; border: 1px solid var(--kv-line); border-radius: 9px; text-align: center; min-width: 0; display: flex; flex-direction: column; gap: 10px; align-items: center; justify-content: space-between; background: var(--kv-panel); }
.kv-label { font-size: 12px; font-weight: 600; }
.kv-arrow { align-self: center; text-align: center; color: var(--vp-c-text-2); font-size: 22px; }
.kv-token-list { display: flex; gap: 5px; justify-content: center; flex-wrap: wrap; }
.kv-token { display: inline-block; padding: 2px 8px; border: 1px solid var(--kv-blue); border-radius: 5px; color: var(--kv-blue); background: var(--kv-old); font-size: 18px; }
.kv-next-token { border: 2px dashed var(--kv-purple); background: var(--vp-c-bg); color: var(--kv-purple); }
.kv-waiting { font-size: 13px; color: var(--vp-c-text-2); min-height: 34px; display: flex; align-items: center; }
.kv-projections { display: grid; gap: 5px; width: 100%; max-width: 130px; }
.kv-projection { display: flex; gap: 9px; align-items: center; }
.kv-projection strong { width: 15px; font-size: 13px; }
.q { color: var(--kv-purple); }.k { color: var(--kv-blue); }.v { color: var(--kv-green); }
.kv-vector { display: flex; flex: 1; gap: 3px; height: 13px; }
.kv-vector i { display: block; flex: 1; background: currentColor; border-radius: 2px; }
.kv-storage-note { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 3px 12px; font-size: 12px; color: var(--kv-blue); margin: 12px 0 18px; }
.kv-query-note { color: var(--kv-purple); }
.kv-cache-heading { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
.kv-cache-heading > span { font-size: 12px; color: var(--vp-c-text-2); }
.kv-scroll { overflow-x: auto; border: 1px solid var(--kv-line); border-radius: 8px; }
.kv-scroll-hint { display: none; font-size: 12px; color: var(--vp-c-text-2); margin-top: 5px; }
.kv-demo .kv-matrix { display: table; margin: 0; width: 100%; min-width: 550px; border-collapse: separate; border-spacing: 5px; font-size: 12px; }
.kv-demo .kv-matrix tr { border: 0; background: transparent; }
.kv-demo .kv-matrix th, .kv-demo .kv-matrix td { border: 0; padding: 6px 3px; text-align: center; }
.kv-demo .kv-matrix th { background: transparent; font-weight: 600; }
.kv-demo .kv-matrix th[scope='row'] { position: sticky; left: 0; z-index: 1; background: var(--vp-c-bg); }
.kv-demo .kv-matrix td { width: 15%; border: 1px solid var(--kv-line); border-radius: 5px; background: var(--kv-panel); transition: background-color 0.3s, border-color 0.3s; }
.kv-demo .kv-matrix td.retained { background: var(--kv-old); }
.kv-demo.is-computing .kv-matrix td.retained { animation: kv-read 0.9s ease-in-out 2; }
.kv-demo .kv-matrix td.new { background: var(--kv-new); border-color: var(--kv-new-border); animation: kv-write 0.65s ease-out; }
.kv-demo .kv-matrix td.pending { border-style: dashed; }
.kv-stored-vector { display: grid; gap: 5px; }
.kv-placeholder { color: var(--vp-c-text-3); font-size: 11px; display: flex; min-height: 38px; align-items: center; justify-content: center; }
.kv-demo .kv-matrix .pending .kv-placeholder { color: var(--vp-c-text-2); }
.kv-legend { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 9px; color: var(--vp-c-text-2); font-size: 12px; }
.kv-legend > span { display: flex; gap: 6px; align-items: center; }
.kv-dot { width: 12px; height: 12px; border: 1px solid var(--kv-line); border-radius: 3px; }
.kv-dot.reused { background: var(--kv-old); }.kv-dot.added { background: var(--kv-new); border-color: var(--kv-new-border); }.kv-dot.pending { border-style: dashed; }
.kv-demo .kv-status { display: grid; gap: 3px; padding: 12px; margin: 16px 0 12px; min-height: 90px; border-radius: 8px; background: var(--kv-panel); font-size: 13px; }
.kv-status strong { font-size: 14px; }
.kv-controls { display: flex; gap: 7px; align-items: center; flex-wrap: wrap; }
.kv-controls .kv-play { color: var(--kv-blue); border-color: var(--kv-blue); background: var(--kv-old); min-width: 54px; }
.kv-step-count { margin-left: auto; font-variant-numeric: tabular-nums; }
.kv-footnote { margin-top: 12px; }
@keyframes kv-write { from { box-shadow: inset 0 0 0 2px var(--kv-new-border); } to { box-shadow: inset 0 0 0 0 transparent; } }
@keyframes kv-read { 50% { box-shadow: inset 0 0 0 1.5px var(--kv-blue); } }
@media (max-width: 600px) {
  .kv-demo { padding: 14px; }
  .kv-pipeline { grid-template-columns: 1fr; gap: 7px; }
  .kv-card { display: grid; grid-template-columns: 1fr 1.4fr; gap: 8px; text-align: left; align-items: center; }
  .kv-card > .kv-muted { grid-column: 1 / -1; }
  .kv-card .kv-token-list { justify-content: flex-start; }
  .kv-arrow { display: none; }
  .kv-next-token { justify-self: start; }
  .kv-demo .kv-status { min-height: 114px; }
  .kv-scroll-hint { display: block; }
}
@media (prefers-reduced-motion: reduce) {
  .kv-demo .kv-matrix td, .kv-demo .kv-matrix td.new, .kv-demo.is-computing .kv-matrix td.retained { transition: none; animation: none; }
}
</style>
