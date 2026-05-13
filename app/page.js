'use client'

import { useState } from 'react'

const STEPS = [
  { id: 'research', label: '자료조사', icon: '🔍' },
  { id: 'copy', label: '카피 + Figma JSON', icon: '✍️' },
  { id: 'image', label: '이미지 생성', icon: '🎨' },
  { id: 'save', label: 'Notion + GitHub 저장', icon: '💾' },
]

const RATIOS = [
  { value: '1:1', label: '1:1 (피드)' },
  { value: '9:16', label: '9:16 (스토리/릴스)' },
  { value: '16:9', label: '16:9 (유튜브)' },
  { value: '4:5', label: '4:5 (피드 세로)' },
]

export default function AdStudioPage() {
  const [form, setForm] = useState({
    courseName: '',
    target: '',
    tone: '',
    ratio: '1:1',
    imageCount: 2,
    includeCopy: true,
    referenceUrl: '',
  })

  const [stepStatus, setStepStatus] = useState({})
  const [results, setResults] = useState({})
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)

  const update = (k, v) => setForm((s) => ({ ...s, [k]: v }))

  const run = async () => {
    if (!form.courseName.trim()) {
      setError('강의명/주제는 필수입니다.')
      return
    }
    setError(null)
    setRunning(true)
    setStepStatus({})
    setResults({})

    try {
      setStepStatus((s) => ({ ...s, research: 'running' }))
      const r1 = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!r1.ok) throw new Error('자료조사 실패: ' + (await r1.text()))
      const research = await r1.json()
      setResults((s) => ({ ...s, research }))
      setStepStatus((s) => ({ ...s, research: 'done' }))

      setStepStatus((s) => ({ ...s, copy: 'running' }))
      const r2 = await fetch('/api/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form, research: research.summary }),
      })
      if (!r2.ok) throw new Error('카피 생성 실패: ' + (await r2.text()))
      const copy = await r2.json()
      setResults((s) => ({ ...s, copy }))
      setStepStatus((s) => ({ ...s, copy: 'done' }))

      setStepStatus((s) => ({ ...s, image: 'running' }))
      const r3 = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form, copy }),
      })
      if (!r3.ok) throw new Error('이미지 생성 실패: ' + (await r3.text()))
      const image = await r3.json()
      setResults((s) => ({ ...s, image }))
      setStepStatus((s) => ({ ...s, image: 'done' }))

      setStepStatus((s) => ({ ...s, save: 'running' }))
      const r4 = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form, research, copy, image }),
      })
      if (!r4.ok) throw new Error('저장 실패: ' + (await r4.text()))
      const save = await r4.json()
      setResults((s) => ({ ...s, save }))
      setStepStatus((s) => ({ ...s, save: 'done' }))
    } catch (e) {
      setError(e.message)
      setStepStatus((s) => {
        const next = { ...s }
        for (const k of Object.keys(next)) {
          if (next[k] === 'running') next[k] = 'error'
        }
        return next
      })
    } finally {
      setRunning(false)
    }
  }

  const reset = () => {
    setStepStatus({})
    setResults({})
    setError(null)
  }

  const allDone = STEPS.every((s) => stepStatus[s.id] === 'done')

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-lg">빼</div>
            <div>
              <h1 className="text-lg font-bold text-neutral-900 tracking-tight">ad-studio</h1>
              <p className="text-xs text-neutral-500">빼기 광고 소재 자동 제작 에이전트</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-neutral-100 text-neutral-600 font-medium">캠페인팀</span>
            <span className="px-2 py-1 rounded-full bg-brand-50 text-brand font-medium">무료 모드</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-neutral-900 mb-1 tracking-tight">광고 소재 만들기</h2>
          <p className="text-sm text-neutral-500 mb-6">강의 정보를 입력하면 자료조사부터 이미지 생성까지 자동 진행됩니다.</p>

          <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-5">
            <Field label="강의명 / 주제" required>
              <input
                type="text"
                value={form.courseName}
                onChange={(e) => update('courseName', e.target.value)}
                placeholder="예: 블로그 자동화, 카드뉴스 AI 제작, 광고 리포트 자동화"
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-100 text-neutral-900"
                disabled={running}
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="타겟">
                <input
                  type="text"
                  value={form.target}
                  onChange={(e) => update('target', e.target.value)}
                  placeholder="예: 20-50대 마케터, 1인 사업자"
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-100 text-neutral-900"
                  disabled={running}
                />
              </Field>

              <Field label="톤앤매너">
                <input
                  type="text"
                  value={form.tone}
                  onChange={(e) => update('tone', e.target.value)}
                  placeholder="예: 강의 플랫폼 톤, 신뢰감 있고 모던하게"
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-100 text-neutral-900"
                  disabled={running}
                />
              </Field>
            </div>

            <Field label="레퍼런스 URL (선택)">
              <input
                type="url"
                value={form.referenceUrl}
                onChange={(e) => update('referenceUrl', e.target.value)}
                placeholder="예: https://bbaegi.io/courses/xxx"
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-100 text-neutral-900"
                disabled={running}
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Field label="이미지 비율">
                <select
                  value={form.ratio}
                  onChange={(e) => update('ratio', e.target.value)}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-100 text-neutral-900 bg-white"
                  disabled={running}
                >
                  {RATIOS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="이미지 장수">
                <select
                  value={form.imageCount}
                  onChange={(e) => update('imageCount', Number(e.target.value))}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-100 text-neutral-900 bg-white"
                  disabled={running}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>{n}장</option>
                  ))}
                </select>
              </Field>

              <Field label="이미지에 카피 포함">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => update('includeCopy', true)}
                    disabled={running}
                    className={`flex-1 py-3 rounded-lg border font-medium text-sm transition ${
                      form.includeCopy
                        ? 'bg-brand text-white border-brand'
                        : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
                    }`}
                  >
                    포함
                  </button>
                  <button
                    type="button"
                    onClick={() => update('includeCopy', false)}
                    disabled={running}
                    className={`flex-1 py-3 rounded-lg border font-medium text-sm transition ${
                      !form.includeCopy
                        ? 'bg-brand text-white border-brand'
                        : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
                    }`}
                  >
                    무문구
                  </button>
                </div>
              </Field>
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-4">
              <div className="text-xs text-neutral-500">
                💡 무료 모드: Gemini 2.5 Flash Image 사용. Notion + GitHub 자동 저장.
              </div>
              <div className="flex gap-2">
                {(allDone || error) && (
                  <button
                    onClick={reset}
                    className="px-5 py-2.5 rounded-lg border border-neutral-300 bg-white text-neutral-700 font-medium text-sm hover:bg-neutral-50"
                  >
                    초기화
                  </button>
                )}
                <button
                  onClick={run}
                  disabled={running || !form.courseName.trim()}
                  className="px-6 py-2.5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-dark disabled:bg-neutral-300 disabled:cursor-not-allowed transition"
                >
                  {running ? '진행 중...' : '광고 소재 만들기'}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
              <strong>오류:</strong> {error}
            </div>
          )}
        </section>

        {Object.keys(stepStatus).length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-neutral-900 mb-4 tracking-tight">진행 상태</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {STEPS.map((step) => {
                const status = stepStatus[step.id] || 'pending'
                return (
                  <div
                    key={step.id}
                    className={`p-4 rounded-xl border-2 transition ${
                      status === 'done'
                        ? 'border-emerald-200 bg-emerald-50'
                        : status === 'running'
                        ? 'border-brand bg-brand-50'
                        : status === 'error'
                        ? 'border-red-200 bg-red-50'
                        : 'border-neutral-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{step.icon}</span>
                      <StatusBadge status={status} />
                    </div>
                    <div className="text-sm font-semibold text-neutral-900">{step.label}</div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {results.research && (
          <ResultCard title="🔍 자료조사" defaultOpen>
            <p className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">{results.research.summary}</p>
            {results.research.points && results.research.points.length > 0 && (
              <ul className="mt-4 space-y-2">
                {results.research.points.map((p, i) => (
                  <li key={i} className="text-sm text-neutral-700 pl-4 border-l-2 border-brand">{p}</li>
                ))}
              </ul>
            )}
          </ResultCard>
        )}

        {results.copy && (
          <ResultCard title="✍️ 카피 + Figma JSON" defaultOpen>
            <div className="mb-4">
              <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">헤드라인</div>
              <div className="text-lg font-bold text-neutral-900">{results.copy.headline}</div>
            </div>
            {results.copy.subtext && (
              <div className="mb-4">
                <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">서브텍스트</div>
                <div className="text-sm text-neutral-700">{results.copy.subtext}</div>
              </div>
            )}
            {results.copy.cta && (
              <div className="mb-4">
                <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">CTA</div>
                <div className="text-sm text-neutral-700">{results.copy.cta}</div>
              </div>
            )}
            <div className="mt-4">
              <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Figma JSON</span>
                <CopyButton text={JSON.stringify(results.copy.figmaJson, null, 2)} />
              </div>
              <pre className="text-xs bg-neutral-900 text-neutral-100 p-4 rounded-lg overflow-x-auto leading-relaxed">
{JSON.stringify(results.copy.figmaJson, null, 2)}
              </pre>
            </div>
          </ResultCard>
        )}

        {results.image && results.image.images && results.image.images.length > 0 && (
          <ResultCard title="🎨 생성된 이미지" defaultOpen>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {results.image.images.map((img, i) => {
                const src = img.url || `data:${img.mimeType || 'image/png'};base64,${img.base64}`
                return (
                  <div key={i} className="group relative">
                    <img src={src} alt={`Generated ${i + 1}`} className="w-full rounded-lg border border-neutral-200" />
                    <a
                      href={src}
                      download={`ad-studio-${i + 1}.png`}
                      className="absolute bottom-2 right-2 px-3 py-1.5 rounded-md bg-black/70 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition"
                    >
                      다운로드
                    </a>
                  </div>
                )
              })}
            </div>
            {results.image.warning && (
              <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                ⚠️ {results.image.warning}
              </div>
            )}
          </ResultCard>
        )}

        {results.save && (
          <ResultCard title="💾 저장 완료" defaultOpen>
            <div className="space-y-2">
              {results.save.notionUrl && (
                <a
                  href={results.save.notionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-brand hover:underline font-medium"
                >
                  📓 Notion 페이지 열기 →
                </a>
              )}
              {results.save.githubUrls && results.save.githubUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-neutral-700 hover:underline"
                >
                  🐙 GitHub 이미지 {i + 1} →
                </a>
              ))}
              {results.save.errors && results.save.errors.length > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  <strong>일부 저장 실패:</strong>
                  <ul className="mt-1 space-y-1">
                    {results.save.errors.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </ResultCard>
        )}
      </main>

      <footer className="border-t border-neutral-200 mt-20">
        <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-neutral-500 flex items-center justify-between">
          <span>위픽코퍼레이션 · 캠페인팀 · ad-studio v1.0</span>
          <span>빼기(BBAEGI) · 1강의 = 1자동화</span>
        </div>
      </footer>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-neutral-700 mb-2">
        {label}
        {required && <span className="text-brand ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

function StatusBadge({ status }) {
  if (status === 'running') return <span className="text-xs font-medium text-brand animate-pulse">진행 중...</span>
  if (status === 'done') return <span className="text-xs font-medium text-emerald-700">✓ 완료</span>
  if (status === 'error') return <span className="text-xs font-medium text-red-700">✗ 실패</span>
  return <span className="text-xs font-medium text-neutral-400">대기</span>
}

function ResultCard({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="mb-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 bg-white rounded-xl border border-neutral-200 hover:bg-neutral-50 transition"
      >
        <span className="text-base font-bold text-neutral-900">{title}</span>
        <span className="text-neutral-400">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="mt-1 p-6 bg-white rounded-xl border border-neutral-200">
          {children}
        </div>
      )}
    </section>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
    >
      {copied ? '복사됨!' : '복사'}
    </button>
  )
}
