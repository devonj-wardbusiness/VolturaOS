'use client'

import { useState } from 'react'

interface Violation {
  id: string
  description: string
  article: string
  severity: 'Critical' | 'Major' | 'Minor'
  location: string
}

const COMMON_VIOLATIONS: { description: string; article: string; severity: Violation['severity'] }[] = [
  { description: 'Double-tapped breaker', article: '210.12 / 408.36', severity: 'Major' },
  { description: 'Missing AFCI protection', article: '210.12', severity: 'Major' },
  { description: 'Missing GFCI protection', article: '210.8', severity: 'Critical' },
  { description: 'No surge protection on service', article: '230.67', severity: 'Major' },
  { description: 'Non-tamper-resistant receptacles', article: '406.12', severity: 'Minor' },
  { description: 'Missing panel circuit directory', article: '408.4', severity: 'Minor' },
  { description: 'Improper burial depth — underground wiring', article: '300.5', severity: 'Critical' },
  { description: 'Open wiring / exposed conductors', article: '110.12', severity: 'Critical' },
  { description: 'Improper grounding electrode system', article: '250.50', severity: 'Major' },
  { description: 'Single ground rod (resistance not tested)', article: '250.53(A)(2)', severity: 'Major' },
  { description: 'FPE / Stab-Lok panel (fire hazard)', article: 'UL not listed', severity: 'Critical' },
  { description: 'Zinsco / Sylvania panel (fire hazard)', article: 'UL not listed', severity: 'Critical' },
  { description: 'Missing working clearance (< 36 in)', article: '110.26', severity: 'Major' },
  { description: 'Overloaded branch circuit', article: '210.20', severity: 'Major' },
  { description: 'Missing arc-flash warning label', article: '110.16', severity: 'Minor' },
  { description: 'Aluminum wiring on 15/20A branch circuits', article: '310.14', severity: 'Critical' },
  { description: 'Missing GFCI — dishwasher circuit', article: '210.8(A)(5)', severity: 'Major' },
  { description: 'Improper box fill', article: '314.16', severity: 'Minor' },
  { description: 'Romex used in conduit underground', article: '334.12', severity: 'Critical' },
  { description: 'Neutral/ground bonded in subpanel', article: '250.24', severity: 'Critical' },
]

const SEVERITY_COLOR: Record<Violation['severity'], string> = {
  Critical: 'text-red-400 bg-red-900/20 border-red-500/30',
  Major: 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30',
  Minor: 'text-blue-400 bg-blue-900/20 border-blue-500/30',
}

function genReport(violations: Violation[], customerName: string, address: string, jobType: string): string {
  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const critical = violations.filter((v) => v.severity === 'Critical')
  const major = violations.filter((v) => v.severity === 'Major')
  const minor = violations.filter((v) => v.severity === 'Minor')

  const lines: string[] = [
    'ELECTRICAL INSPECTION REPORT',
    'Voltura Power Group — Licensed Electrical Contractor',
    'Colorado Springs, CO | ' + (process.env.NEXT_PUBLIC_VOLTURA_PHONE ?? ''),
    '',
    `Date: ${date}`,
    `Customer: ${customerName}`,
    `Property: ${address}`,
    `Job Type: ${jobType}`,
    '',
    '═══════════════════════════════════════',
    `VIOLATIONS FOUND: ${violations.length}`,
    `  ● Critical: ${critical.length}  ● Major: ${major.length}  ● Minor: ${minor.length}`,
    '═══════════════════════════════════════',
  ]

  if (critical.length) {
    lines.push('', '🔴 CRITICAL — Immediate Safety Hazard')
    lines.push('────────────────────────────────────')
    critical.forEach((v, i) => {
      lines.push(`${i + 1}. ${v.description}`)
      lines.push(`   Code Ref: NEC ${v.article}`)
      if (v.location) lines.push(`   Location: ${v.location}`)
    })
  }

  if (major.length) {
    lines.push('', '🟡 MAJOR — Code Violation, Repair Required')
    lines.push('────────────────────────────────────')
    major.forEach((v, i) => {
      lines.push(`${i + 1}. ${v.description}`)
      lines.push(`   Code Ref: NEC ${v.article}`)
      if (v.location) lines.push(`   Location: ${v.location}`)
    })
  }

  if (minor.length) {
    lines.push('', '🔵 MINOR — Non-Compliant, Recommend Correction')
    lines.push('────────────────────────────────────')
    minor.forEach((v, i) => {
      lines.push(`${i + 1}. ${v.description}`)
      lines.push(`   Code Ref: NEC ${v.article}`)
      if (v.location) lines.push(`   Location: ${v.location}`)
    })
  }

  lines.push(
    '',
    '═══════════════════════════════════════',
    'DISCLAIMER',
    '═══════════════════════════════════════',
    'This report reflects conditions observed during a visual inspection on the date above.',
    'It is not a complete code compliance assessment. Additional violations may exist.',
    'All corrections must be performed by a licensed electrical contractor and inspected',
    'by the Pikes Peak Regional Building Department (PPRBD) where required.',
    '',
    'Voltura Power Group is available to quote all repairs listed above.',
    'Contact us to schedule service.',
    '',
    `Report prepared by: Voltura Power Group`,
    `Inspection date: ${date}`,
  )

  return lines.join('\n')
}

interface ViolationReportProps {
  customerName: string
  address: string | null
  jobType: string
}

export function ViolationReport({ customerName, address, jobType }: ViolationReportProps) {
  const [open, setOpen] = useState(false)
  const [violations, setViolations] = useState<Violation[]>([])
  const [showCommon, setShowCommon] = useState(false)
  const [customDesc, setCustomDesc] = useState('')
  const [customArticle, setCustomArticle] = useState('')
  const [customSeverity, setCustomSeverity] = useState<Violation['severity']>('Major')
  const [customLocation, setCustomLocation] = useState('')
  const [reportText, setReportText] = useState('')
  const [showReport, setShowReport] = useState(false)

  function addCommon(template: typeof COMMON_VIOLATIONS[0]) {
    setViolations((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        description: template.description,
        article: template.article,
        severity: template.severity,
        location: '',
      },
    ])
  }

  function addCustom() {
    if (!customDesc.trim()) return
    setViolations((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        description: customDesc.trim(),
        article: customArticle.trim() || '—',
        severity: customSeverity,
        location: customLocation.trim(),
      },
    ])
    setCustomDesc(''); setCustomArticle(''); setCustomLocation('')
  }

  function updateLocation(id: string, location: string) {
    setViolations((prev) => prev.map((v) => v.id === id ? { ...v, location } : v))
  }

  function remove(id: string) {
    setViolations((prev) => prev.filter((v) => v.id !== id))
  }

  function handleGenerate() {
    const text = genReport(violations, customerName, address ?? 'N/A', jobType)
    setReportText(text)
    setShowReport(true)
  }

  const counts = {
    Critical: violations.filter((v) => v.severity === 'Critical').length,
    Major: violations.filter((v) => v.severity === 'Major').length,
    Minor: violations.filter((v) => v.severity === 'Minor').length,
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-volturaNavy/60 border border-red-500/20 text-red-400 font-semibold py-3 rounded-xl text-sm hover:bg-red-900/10 transition-colors"
      >
        <span>📋</span>
        <span>Log Violations</span>
      </button>

      {open && !showReport && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center">
          <div className="bg-volturaNavy w-full max-w-lg rounded-t-2xl overflow-hidden max-h-[90dvh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <div>
                <h2 className="text-white font-bold text-base">📋 Violation Log</h2>
                <p className="text-gray-500 text-xs">
                  {violations.length} logged · {counts.Critical} critical · {counts.Major} major
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-500 text-xl">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Quick-add common violations */}
              <div>
                <button
                  onClick={() => setShowCommon(!showCommon)}
                  className="text-volturaGold text-xs font-semibold flex items-center gap-1"
                >
                  {showCommon ? '▾' : '▸'} Common Violations
                </button>
                {showCommon && (
                  <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                    {COMMON_VIOLATIONS.map((v, i) => (
                      <button
                        key={i}
                        onClick={() => addCommon(v)}
                        className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-volturaGold/10 transition-colors"
                      >
                        <span className={`text-xs font-bold ${
                          v.severity === 'Critical' ? 'text-red-400' :
                          v.severity === 'Major' ? 'text-yellow-400' : 'text-blue-400'
                        }`}>{v.severity[0]}</span>
                        <span className="text-white text-xs flex-1 leading-snug">{v.description}</span>
                        <span className="text-gray-600 text-xs shrink-0">{v.article}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom violation */}
              <div className="bg-volturaBlue/30 rounded-xl p-3 space-y-2">
                <p className="text-gray-400 text-xs uppercase tracking-wider">Add Custom</p>
                <input
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder="Violation description"
                  className="w-full bg-volturaNavy text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-volturaGold/50"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={customArticle}
                    onChange={(e) => setCustomArticle(e.target.value)}
                    placeholder="NEC Article (opt)"
                    className="bg-volturaNavy text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-volturaGold/50"
                  />
                  <input
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    placeholder="Location (opt)"
                    className="bg-volturaNavy text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-volturaGold/50"
                  />
                </div>
                <div className="flex gap-2">
                  {(['Critical', 'Major', 'Minor'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setCustomSeverity(s)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        customSeverity === s
                          ? s === 'Critical' ? 'bg-red-500/20 border-red-500/40 text-red-400'
                          : s === 'Major' ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                          : 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                          : 'bg-white/5 border-white/10 text-gray-500'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <button
                  onClick={addCustom}
                  disabled={!customDesc.trim()}
                  className="w-full bg-volturaGold/10 border border-volturaGold/40 text-volturaGold text-sm font-semibold py-2 rounded-lg disabled:opacity-40"
                >
                  + Add Violation
                </button>
              </div>

              {/* Logged violations */}
              {violations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">Logged ({violations.length})</p>
                  {violations.map((v) => (
                    <div key={v.id} className={`rounded-xl p-3 border ${SEVERITY_COLOR[v.severity]}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-white text-sm font-semibold leading-snug">{v.description}</p>
                          <p className="text-gray-500 text-xs mt-0.5">NEC {v.article} · {v.severity}</p>
                          <input
                            value={v.location}
                            onChange={(e) => updateLocation(v.id, e.target.value)}
                            placeholder="Location (e.g. main panel, garage)"
                            className="mt-1.5 w-full bg-black/20 text-white rounded px-2 py-1 text-xs focus:outline-none placeholder:text-gray-600"
                          />
                        </div>
                        <button onClick={() => remove(v.id)} className="text-gray-600 text-sm shrink-0">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 pb-8 pt-3 border-t border-white/10 shrink-0">
              <button
                onClick={handleGenerate}
                disabled={!violations.length}
                className="w-full bg-volturaGold text-volturaBlue font-bold py-3.5 rounded-xl text-sm disabled:opacity-40"
              >
                Generate Report ({violations.length} violation{violations.length !== 1 ? 's' : ''})
              </button>
            </div>
          </div>
        </div>
      )}

      {showReport && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-end justify-center">
          <div className="bg-volturaNavy w-full max-w-lg rounded-t-2xl overflow-hidden max-h-[90dvh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <h2 className="text-white font-bold text-base">Inspection Report</h2>
              <button onClick={() => setShowReport(false)} className="text-gray-500 text-xl">✕</button>
            </div>
            <pre className="flex-1 overflow-y-auto px-5 py-4 text-xs text-gray-300 font-mono leading-relaxed whitespace-pre-wrap">
              {reportText}
            </pre>
            <div className="px-5 pb-8 pt-3 border-t border-white/10 shrink-0 space-y-2">
              <button
                onClick={() => navigator.clipboard.writeText(reportText)}
                className="w-full bg-volturaGold/10 border border-volturaGold/40 text-volturaGold font-semibold py-3 rounded-xl text-sm"
              >
                Copy Report to Clipboard
              </button>
              <button
                onClick={() => { setShowReport(false); setOpen(false) }}
                className="w-full bg-white/5 text-gray-400 py-2.5 rounded-xl text-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
