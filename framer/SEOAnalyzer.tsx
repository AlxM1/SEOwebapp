import { useState, useCallback } from "react"
import { addPropertyControls, ControlType } from "framer"

// ─── Types ────────────────────────────────────────────────────────────────────

interface SEOResult {
  url: string
  seoScore: number
  geoScore: number
  performance: { lcp: number; fcp: number; cls: number; ttfb: number; score: number }
  issues: Array<{ type: string; severity: string; message: string }>
  strengths: string[]
  geo: {
    score: number
    breakdown: { answerReadiness: number; structuredData: number; authoritySignals: number; parseableStructure: number }
  }
}

// ─── Score Ring SVG ────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 80, color }: { score: number; size?: number; color: string }) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text
        x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize={size * 0.22} fontWeight="700" fontFamily="-apple-system,sans-serif"
        style={{ transform: "rotate(90deg)", transformOrigin: `${size / 2}px ${size / 2}px` }}
      >
        {score}
      </text>
    </svg>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function SEOAnalyzer({
  apiKey = "",
  apiUrl = "https://analysis.seoh.ca",
  accentColor = "#14b8a6",
  backgroundColor = "#0a0a0a",
  cardBackground = "#111111",
  borderColor = "#1a1a1a",
  fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  borderRadius = 16,
  showGEO = true,
  showPerformance = true,
  showIssues = true,
  placeholder = "https://example.com",
  buttonText = "Analyze",
  width = 560,
  height = "auto" as any,
}: {
  apiKey?: string
  apiUrl?: string
  accentColor?: string
  backgroundColor?: string
  cardBackground?: string
  borderColor?: string
  fontFamily?: string
  borderRadius?: number
  showGEO?: boolean
  showPerformance?: boolean
  showIssues?: boolean
  placeholder?: string
  buttonText?: string
  width?: number
  height?: any
}) {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SEOResult | null>(null)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"overview" | "geo" | "issues">("overview")

  const analyze = useCallback(async () => {
    if (!url.trim()) return
    if (!apiKey) { setError("API key not configured — add it in Framer sidebar"); return }

    setLoading(true)
    setError("")
    setResult(null)

    try {
      // Run crawl + GEO in parallel
      const [crawlRes, geoRes] = await Promise.all([
        fetch(`${apiUrl}/api/crawl/analyze`, {
          method: "POST",
          headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim() }),
        }),
        showGEO ? fetch(`${apiUrl}/api/geo/score`, {
          method: "POST",
          headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim() }),
        }) : Promise.resolve(null),
      ])

      if (!crawlRes.ok) {
        const err = await crawlRes.json()
        throw new Error(err.error || `Error ${crawlRes.status}`)
      }

      const crawl = await crawlRes.json()
      const geo = geoRes?.ok ? await geoRes.json() : null

      setResult({
        url: url.trim(),
        seoScore: crawl.seoScore ?? crawl.score ?? 0,
        geoScore: geo?.score ?? 0,
        performance: crawl.performance ?? { lcp: 0, fcp: 0, cls: 0, ttfb: 0, score: 0 },
        issues: crawl.issues ?? [],
        strengths: crawl.strengths ?? [],
        geo: geo ?? { score: 0, breakdown: { answerReadiness: 0, structuredData: 0, authoritySignals: 0, parseableStructure: 0 } },
      })
      setActiveTab("overview")
    } catch (e: any) {
      setError(e.message || "Analysis failed")
    } finally {
      setLoading(false)
    }
  }, [url, apiKey, apiUrl, showGEO])

  const s: Record<string, any> = {
    wrap: {
      width, fontFamily, backgroundColor, color: "#fff",
      borderRadius, border: `1px solid ${borderColor}`,
      overflow: "hidden", boxSizing: "border-box",
    },
    input: {
      width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${borderColor}`,
      borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 14,
      outline: "none", boxSizing: "border-box" as any, fontFamily,
    },
    btn: {
      background: accentColor, border: "none", borderRadius: 10, padding: "12px 20px",
      color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
      whiteSpace: "nowrap" as any, fontFamily, transition: "opacity 0.2s",
      opacity: loading ? 0.6 : 1,
    },
    card: {
      background: cardBackground, border: `1px solid ${borderColor}`,
      borderRadius: borderRadius - 4, padding: 20,
    },
    label: { fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" as any, letterSpacing: 1, marginBottom: 4 },
    tab: (active: boolean) => ({
      padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer",
      background: active ? accentColor : "transparent",
      color: active ? "#fff" : "rgba(255,255,255,0.4)", border: "none", fontFamily,
    }),
  }

  const scoreColor = (n: number) => n >= 80 ? "#22c55e" : n >= 60 ? "#f59e0b" : "#ef4444"

  return (
    <div style={s.wrap}>
      {/* Input bar */}
      <div style={{ padding: 24, borderBottom: `1px solid ${borderColor}` }}>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            style={s.input} value={url} placeholder={placeholder}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !loading && analyze()}
          />
          <button style={s.btn} onClick={analyze} disabled={loading}>
            {loading ? "Analyzing…" : buttonText}
          </button>
        </div>
        {error && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(239,68,68,0.1)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", fontSize: 13, color: "#fca5a5" }}>
            {error}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: 48, textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
          <div style={{ width: 32, height: 32, border: `3px solid ${borderColor}`, borderTopColor: accentColor, borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
          Crawling {url}…
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div style={{ padding: 24 }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "rgba(255,255,255,0.04)", padding: 4, borderRadius: 10, width: "fit-content" }}>
            <button style={s.tab(activeTab === "overview")} onClick={() => setActiveTab("overview")}>Overview</button>
            {showGEO && <button style={s.tab(activeTab === "geo")} onClick={() => setActiveTab("geo")}>GEO Score</button>}
            {showIssues && <button style={s.tab(activeTab === "issues")} onClick={() => setActiveTab("issues")}>Issues {result.issues.length > 0 && `(${result.issues.length})`}</button>}
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: showGEO ? "1fr 1fr" : "1fr", gap: 12, marginBottom: 16 }}>
                <div style={{ ...s.card, display: "flex", alignItems: "center", gap: 16 }}>
                  <ScoreRing score={result.seoScore} color={scoreColor(result.seoScore)} />
                  <div>
                    <div style={s.label}>SEO Score</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
                      {result.seoScore >= 80 ? "Strong" : result.seoScore >= 60 ? "Needs work" : "Critical issues"}
                    </div>
                  </div>
                </div>
                {showGEO && (
                  <div style={{ ...s.card, display: "flex", alignItems: "center", gap: 16 }}>
                    <ScoreRing score={result.geoScore} color={accentColor} />
                    <div>
                      <div style={s.label}>GEO Score</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
                        {result.geoScore >= 80 ? "AI-optimized" : result.geoScore >= 60 ? "Partially visible" : "Not AI-ready"}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {showPerformance && result.performance.score > 0 && (
                <div style={{ ...s.card, marginBottom: 12 }}>
                  <div style={{ ...s.label, marginBottom: 12 }}>Performance</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    {[
                      { key: "LCP", val: `${result.performance.lcp}s` },
                      { key: "FCP", val: `${result.performance.fcp}s` },
                      { key: "CLS", val: result.performance.cls },
                      { key: "TTFB", val: `${result.performance.ttfb}ms` },
                    ].map(m => (
                      <div key={m.key} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: accentColor }}>{m.val}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{m.key}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.strengths.length > 0 && (
                <div style={s.card}>
                  <div style={{ ...s.label, marginBottom: 10 }}>Strengths</div>
                  <div style={{ display: "flex", flexWrap: "wrap" as any, gap: 6 }}>
                    {result.strengths.slice(0, 6).map((str, i) => (
                      <span key={i} style={{ padding: "4px 10px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 6, fontSize: 12, color: "#86efac" }}>
                        {str}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GEO Tab */}
          {activeTab === "geo" && showGEO && (
            <div style={s.card}>
              <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
                <ScoreRing score={result.geo.score} size={96} color={accentColor} />
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{result.geo.score}/100</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>AI Search Visibility</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
                    {result.geo.score >= 80 ? "This page is well-optimized for AI search engines (ChatGPT, Perplexity, Gemini)" :
                     result.geo.score >= 60 ? "Partially visible in AI search. Improvements will increase citation frequency" :
                     "Low visibility in AI search. Significant optimization needed"}
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { key: "Answer Readiness", val: result.geo.breakdown.answerReadiness, max: 40 },
                  { key: "Structured Data", val: result.geo.breakdown.structuredData, max: 20 },
                  { key: "Authority Signals", val: result.geo.breakdown.authoritySignals, max: 20 },
                  { key: "Parseable Structure", val: result.geo.breakdown.parseableStructure, max: 20 },
                ].map(dim => (
                  <div key={dim.key} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>{dim.key}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: accentColor }}>{dim.val}<span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>/{dim.max}</span></div>
                    <div style={{ marginTop: 8, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                      <div style={{ height: 3, width: `${(dim.val / dim.max) * 100}%`, background: accentColor, borderRadius: 2, transition: "width 0.8s ease" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Issues Tab */}
          {activeTab === "issues" && showIssues && (
            <div>
              {result.issues.length === 0 ? (
                <div style={{ ...s.card, textAlign: "center", padding: 32, color: "rgba(255,255,255,0.4)" }}>No issues found</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" as any, gap: 8 }}>
                  {result.issues.map((issue, i) => {
                    const colors: Record<string, string> = { critical: "#ef4444", warning: "#f59e0b", info: "#3b82f6" }
                    const c = colors[issue.severity] || "#6b7280"
                    return (
                      <div key={i} style={{ ...s.card, display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: c, marginTop: 5, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 12, color: c, fontWeight: 600, marginBottom: 2, textTransform: "capitalize" as any }}>{issue.severity}</div>
                          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{issue.message}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center" }}>
            Powered by SEO Analytics API · {new Date().toLocaleDateString()}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div style={{ padding: 48, textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 14 }}>
          Enter a URL above to analyze SEO + GEO visibility
        </div>
      )}
    </div>
  )
}

// ─── Framer Property Controls ─────────────────────────────────────────────────

addPropertyControls(SEOAnalyzer, {
  apiKey: { type: ControlType.String, title: "API Key", defaultValue: "", placeholder: "seoh_..." },
  apiUrl: { type: ControlType.String, title: "API URL", defaultValue: "https://analysis.seoh.ca" },
  accentColor: { type: ControlType.Color, title: "Accent Color", defaultValue: "#14b8a6" },
  backgroundColor: { type: ControlType.Color, title: "Background", defaultValue: "#0a0a0a" },
  cardBackground: { type: ControlType.Color, title: "Card Background", defaultValue: "#111111" },
  borderColor: { type: ControlType.Color, title: "Border Color", defaultValue: "#1a1a1a" },
  fontFamily: { type: ControlType.String, title: "Font Family", defaultValue: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  borderRadius: { type: ControlType.Number, title: "Border Radius", defaultValue: 16, min: 0, max: 32, step: 1 },
  showGEO: { type: ControlType.Boolean, title: "Show GEO Score", defaultValue: true },
  showPerformance: { type: ControlType.Boolean, title: "Show Performance", defaultValue: true },
  showIssues: { type: ControlType.Boolean, title: "Show Issues Tab", defaultValue: true },
  placeholder: { type: ControlType.String, title: "Input Placeholder", defaultValue: "https://example.com" },
  buttonText: { type: ControlType.String, title: "Button Text", defaultValue: "Analyze" },
  width: { type: ControlType.Number, title: "Width", defaultValue: 560, min: 320, max: 900, step: 10 },
})
