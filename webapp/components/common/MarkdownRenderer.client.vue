<template>
  <div ref="container" class="markdown" v-html="html"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import MarkdownIt from 'markdown-it'
import renderMathInElement from 'katex/contrib/auto-render'
import 'katex/dist/katex.min.css'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

const props = defineProps<{
  content: string
}>()

const html = ref('')
const container = ref<HTMLElement | null>(null)

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight(code: string, lang?: string) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        const out = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
        return `<pre><code class="hljs language-${lang}">${out}</code></pre>`
      } catch {}
    } else {
      try {
        const out = hljs.highlightAuto(code).value
        return `<pre><code class="hljs">${out}</code></pre>`
      } catch {}
    }
    return `<pre><code>${escapeHtml(code)}</code></pre>`
  }
})

function renderContent() {
  try {
    html.value = md.render(props.content || '')
  } catch (e) {
    html.value = props.content || ''
  }

  nextTick(() => {
    if (container.value) {
      try {
        renderMathInElement(container.value, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ],
          throwOnError: false
        })
      } catch {}
    }
  })
}

onMounted(() => {
  renderContent()
})

watch(() => props.content, () => {
  renderContent()
})
</script>

<style scoped>
.markdown {
  color: #374151; /* text-gray-700 */
}
.markdown h1 { font-size: 1.5rem; font-weight: 700; margin: 1rem 0; }
.markdown h2 { font-size: 1.25rem; font-weight: 700; margin: 0.75rem 0; }
.markdown h3 { font-size: 1.125rem; font-weight: 600; margin: 0.5rem 0; }
.markdown p { margin: 0.5rem 0; }
.markdown code { background: #f3f4f6; padding: 0.1rem 0.25rem; border-radius: 0.25rem; }
.markdown pre { background: #f3f4f6; padding: 0.75rem; border-radius: 0.375rem; overflow: auto; }
.markdown a { color: #2563eb; text-decoration: none; }
.markdown a:hover { text-decoration: underline; }
.markdown ul { list-style: disc; padding-left: 1.25rem; }
.markdown ol { list-style: decimal; padding-left: 1.25rem; }
.markdown table { border-collapse: collapse; margin: 0.75rem 0; }
.markdown th, .markdown td { border: 1px solid #e5e7eb; padding: 0.5rem; }
</style>
