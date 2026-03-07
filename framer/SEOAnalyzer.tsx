import { useState, useCallback } from "react"
import { addPropertyControls, ControlType } from "framer"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CrawlResult {
  url: string
  seoScore: number
  title?: string
  titleLength?: number
  metaDescription?: string
  metaDescriptionLength?: number
  isHttps?: boolean
  mobileOptimized?: boolean
  content?: { wordCount: number }
  headings?: { h1: string[]; h2: string[] }
  links?: { internal: number; external: number }
  images?: { total: number; withAlt: number; withoutAlt: number }
  strengths?: string[]
  issues?: string[]
}

interface GeoResult {
  geoScore: number
  grade: string
  grading: string
  breakdown: {
    answerReadiness: { score: number; max: number }
    structuredData: { score: number; max: number }
    authoritySignals: { score: number; max: number }
    parseableStructure: { score: number; max: number }
  }
  recommendations?: string[]
  signals?: Record<string, boolean>
  schemas?: string[]
}

interface Branding {
  name: string
  color: string
  tagline: string
  website: string
  logoUrl: string
}

// ─── Score Ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 80, color, label }: { score: number; size?: number; color: string; label?: string }) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <div style={{ display: "flex", flexDirection: "column" as any, alignItems: "center", gap: 6 }}>
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
      {label && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{label}</div>}
    </div>
  )
}

// ─── Breakdown Bar ─────────────────────────────────────────────────────────────

function BreakdownBar({ label, score, max, color }: { label: string; score: number; max: number; color: string }) {
  const pct = score / max
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{score}/{max}</span>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
        <div style={{ height: 3, width: `${pct * 100}%`, background: color, borderRadius: 2, transition: "width 0.8s ease" }} />
      </div>
    </div>
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
  placeholder = "https://example.com",
  buttonText = "Analyze",
  // Branding
  brandName = "SEO Analytics",
  brandColor = "#111111",
  brandTagline = "SEO & GEO Analysis Report",
  brandWebsite = "",
  brandLogoUrl = "",
  // Feature flags
  showGEO = true,
  showPDF = true,
  width = 580,
}: {
  apiKey?: string
  apiUrl?: string
  accentColor?: string
  backgroundColor?: string
  cardBackground?: string
  borderColor?: string
  fontFamily?: string
  borderRadius?: number
  placeholder?: string
  buttonText?: string
  brandName?: string
  brandColor?: string
  brandTagline?: string
  brandWebsite?: string
  brandLogoUrl?: string
  showGEO?: boolean
  showPDF?: boolean
  width?: number
}) {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [crawl, setCrawl] = useState<CrawlResult | null>(null)
  const [geo, setGeo] = useState<GeoResult | null>(null)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"seo" | "geo" | "issues">("seo")

  const headers = { "X-Api-Key": apiKey, "Content-Type": "application/json" }

  const analyze = useCallback(async () => {
    if (!url.trim()) return
    if (!apiKey) { setError("API key not configured — add it in Framer sidebar"); return }

    setLoading(true)
    setError("")
    setCrawl(null)
    setGeo(null)

    try {
      const requests: Promise<Response>[] = [
        fetch(`${apiUrl}/api/crawl/analyze`, { method: "POST", headers, body: JSON.stringify({ url: url.trim() }) }),
      ]
      if (showGEO) {
        requests.push(fetch(`${apiUrl}/api/geo/score`, { method: "POST", headers, body: JSON.stringify({ url: url.trim() }) }))
      }

      const [crawlRes, geoRes] = await Promise.all(requests)

      if (!crawlRes.ok) {
        const err = await crawlRes.json()
        throw new Error(err.error || `Error ${crawlRes.status}`)
      }

      const crawlData = await crawlRes.json()
      const geoData = geoRes?.ok ? await geoRes.json() : null

      setCrawl(crawlData)
      if (geoData) setGeo(geoData)
    } catch (e: any) {
      setError(e.message || "Analysis failed")
    } finally {
      setLoading(false)
    }
  }, [url, apiKey, apiUrl, showGEO])

  const downloadPDF = useCallback(async () => {
    if (!crawl) return
    setPdfLoading(true)
    try {
      const branding: Branding = {
        name: brandName,
        color: brandColor || accentColor,
        tagline: brandTagline,
        website: brandWebsite,
        logoUrl: brandLogoUrl,
      }
      const res = await fetch(`${apiUrl}/api/report/pdf`, {
        method: "POST",
        headers,
        body: JSON.stringify({ url: crawl.url, crawlData: crawl, geoData: geo, branding }),
      })
      if (!res.ok) throw new Error("PDF generation failed")
      const blob = await res.blob()
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      const hostname = new URL(crawl.url).hostname
      link.download = `${brandName.replace(/\s+/g, "-")}-SEO-Report-${hostname}-${new Date().toISOString().split("T")[0]}.pdf`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (e: any) {
      setError("PDF failed: " + (e.message || "unknown error"))
    } finally {
      setPdfLoading(false)
    }
  }, [crawl, geo, apiUrl, apiKey, brandName, brandColor, brandTagline, brandWebsite, brandLogoUrl, accentColor])

  // ── Styles ─────────────────────────────────────────────────────────────────

  const s = {
    wrap: {
      fontFamily, width, backgroundColor, color: "white",
      borderRadius, padding: 24, boxSizing: "border-box" as any,
      border: `1px solid ${borderColor}`,
    },
    input: {
      width: "100%", padding: "12px 16px", background: cardBackground,
      border: `1px solid ${borderColor}`, borderRadius: borderRadius * 0.6,
      color: "white", fontSize: 14, outline: "none", boxSizing: "border-box" as any,
    },
    btn: (disabled: boolean, bg = accentColor) => ({
      padding: "12px 22px", borderRadius: borderRadius * 0.6, border: "none",
      background: disabled ? "rgba(255,255,255,0.08)" : bg,
      color: disabled ? "rgba(255,255,255,0.3)" : "white",
      fontWeight: 600, fontSize: 14, cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "nowrap" as any, transition: "opacity 0.2s",
      flexShrink: 0,
    }),
    card: {
      background: cardBackground, border: `1px solid ${borderColor}`,
      borderRadius: borderRadius * 0.75, padding: 16, marginBottom: 12,
    },
    tab: (active: boolean) => ({
      padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
      background: active ? accentColor : "transparent",
      color: active ? "white" : "rgba(255,255,255,0.4)",
      border: "none", transition: "all 0.2s",
    }),
    grade: (g: string) => {
      const c: Record<string, string> = { A: "#22c55e", B: "#14b8a6", C: "#f59e0b", D: "#f97316", F: "#ef4444" }
      return c[g] || "#6b7280"
    },
  }

  const scoreColor = (n: number) => n >= 80 ? "#22c55e" : n >= 60 ? "#f59e0b" : "#ef4444"

  return (
    <div style={s.wrap}>
      {/* Input row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input
          style={s.input}
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder={placeholder}
          onKeyDown={e => e.key === "Enter" && !loading && analyze()}
        />
        <button style={s.btn(loading || !url.trim())} onClick={analyze} disabled={loading || !url.trim()}>
          {loading ? "Analyzing…" : buttonText}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ ...s.card, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: 48, color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
          Analyzing {url}…
        </div>
      )}

      {/* Results */}
      {crawl && !loading && (
        <div>
          {/* Score rings */}
          <div style={{ ...s.card, display: "flex", justifyContent: "center", gap: 40, padding: "24px 16px" }}>
            <ScoreRing score={crawl.seoScore ?? 0} color={scoreColor(crawl.seoScore ?? 0)} label="SEO Score" />
            {geo && showGEO && (
              <ScoreRing score={geo.geoScore} color={s.grade(geo.grade)} label="GEO / AI" />
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            <button style={s.tab(activeTab === "seo")} onClick={() => setActiveTab("seo")}>SEO Details</button>
            {showGEO && geo && <button style={s.tab(activeTab === "geo")} onClick={() => setActiveTab("geo")}>GEO / AI</button>}
            <button style={s.tab(activeTab === "issues")} onClick={() => setActiveTab("issues")}>Issues</button>
          </div>

          {/* SEO Tab */}
          {activeTab === "seo" && (
            <div>
              {[
                { label: "Title", value: crawl.title ? `${crawl.title} (${crawl.titleLength} chars)` : "Missing" },
                { label: "Meta Description", value: crawl.metaDescription ? `${crawl.metaDescriptionLength} chars${(crawl.metaDescriptionLength ?? 0) > 160 ? " — too long" : ""}` : "Missing" },
                { label: "Word Count", value: `${crawl.content?.wordCount ?? 0} words` },
                { label: "Internal Links", value: String(crawl.links?.internal ?? 0) },
                { label: "External Links", value: String(crawl.links?.external ?? 0) },
                { label: "Images", value: `${crawl.images?.total ?? 0} total, ${crawl.images?.withoutAlt ?? 0} missing alt` },
                { label: "HTTPS", value: crawl.isHttps ? "✓ Yes" : "✗ No" },
                { label: "Mobile", value: crawl.mobileOptimized ? "✓ Optimised" : "✗ Not optimised" },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${borderColor}`, fontSize: 13 }}>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>{label}</span>
                  <span style={{ color: "white", fontWeight: 500, maxWidth: "60%", textAlign: "right" }}>{value}</span>
                </div>
              ))}
              {crawl.strengths && crawl.strengths.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as any }}>Strengths</div>
                  {crawl.strengths.slice(0, 4).map((s2, i) => (
                    <div key={i} style={{ fontSize: 13, color: "#22c55e", marginBottom: 5 }}>✓ {s2}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* GEO Tab */}
          {activeTab === "geo" && geo && showGEO && (
            <div>
              <div style={{ ...s.card, display: "flex", alignItems: "center", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: s.grade(geo.grade) }}>{geo.geoScore}<span style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>/100</span></div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: s.grade(geo.grade) }}>Grade {geo.grade}</div>
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", flex: 1 }}>{geo.grading}</div>
              </div>
              <div style={{ marginTop: 8 }}>
                {Object.entries(geo.breakdown || {}).map(([k, v]) => {
                  const labels: Record<string, string> = {
                    answerReadiness: "Answer Readiness",
                    structuredData: "Structured Data",
                    authoritySignals: "Authority Signals",
                    parseableStructure: "Parseable Structure",
                  }
                  const pct = v.score / v.max
                  const c = pct >= 0.7 ? "#22c55e" : pct >= 0.4 ? "#f59e0b" : "#ef4444"
                  return <BreakdownBar key={k} label={labels[k] || k} score={v.score} max={v.max} color={c} />
                })}
              </div>
              {geo.recommendations && geo.recommendations.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as any }}>How to Improve</div>
                  {geo.recommendations.map((r, i) => (
                    <div key={i} style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 8, paddingLeft: 12, borderLeft: `2px solid ${accentColor}` }}>{r}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Issues Tab */}
          {activeTab === "issues" && (
            <div>
              {(!crawl.issues || crawl.issues.length === 0) ? (
                <div style={{ textAlign: "center", padding: 32, color: "rgba(255,255,255,0.3)", fontSize: 13 }}>No issues found</div>
              ) : (
                crawl.issues.map((issue, i) => (
                  <div key={i} style={{ ...s.card, display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", marginTop: 4, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>{issue}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* PDF Download */}
          {showPDF && (
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <button
                style={s.btn(pdfLoading, brandColor || accentColor)}
                onClick={downloadPDF}
                disabled={pdfLoading}
              >
                {pdfLoading ? "Generating PDF…" : "⬇ Download PDF Report"}
              </button>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.15)", textAlign: "center" }}>
            {brandName} · Powered by SEO Analytics API · {new Date().toLocaleDateString()}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!crawl && !loading && !error && (
        <div style={{ padding: 48, textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>
          Enter a URL above to analyze SEO + GEO visibility
        </div>
      )}
    </div>
  )
}

// ─── Framer Property Controls ──────────────────────────────────────────────────

addPropertyControls(SEOAnalyzer, {
  // Connection
  apiKey:        { type: ControlType.String,  title: "API Key",          defaultValue: "", placeholder: "seoh_..." },
  apiUrl:        { type: ControlType.String,  title: "API URL",          defaultValue: "https://analysis.seoh.ca" },
  // Branding (for PDF)
  brandName:     { type: ControlType.String,  title: "Brand Name",       defaultValue: "SEO Analytics" },
  brandColor:    { type: ControlType.Color,   title: "Brand Color",      defaultValue: "#111111" },
  brandTagline:  { type: ControlType.String,  title: "Brand Tagline",    defaultValue: "SEO & GEO Analysis Report" },
  brandWebsite:  { type: ControlType.String,  title: "Brand Website",    defaultValue: "" },
  brandLogoUrl:  { type: ControlType.String,  title: "Brand Logo URL",   defaultValue: "", placeholder: "https://..." },
  // Appearance
  accentColor:   { type: ControlType.Color,   title: "Accent Color",     defaultValue: "#14b8a6" },
  backgroundColor: { type: ControlType.Color, title: "Background",       defaultValue: "#0a0a0a" },
  cardBackground: { type: ControlType.Color,  title: "Card Background",  defaultValue: "#111111" },
  borderColor:   { type: ControlType.Color,   title: "Border Color",     defaultValue: "#1a1a1a" },
  fontFamily:    { type: ControlType.String,  title: "Font Family",      defaultValue: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  borderRadius:  { type: ControlType.Number,  title: "Border Radius",    defaultValue: 16, min: 0, max: 32, step: 1 },
  // Options
  showGEO:       { type: ControlType.Boolean, title: "Show GEO Score",   defaultValue: true },
  showPDF:       { type: ControlType.Boolean, title: "Show PDF Button",  defaultValue: true },
  placeholder:   { type: ControlType.String,  title: "Input Placeholder",defaultValue: "https://example.com" },
  buttonText:    { type: ControlType.String,  title: "Button Text",      defaultValue: "Analyze" },
  width:         { type: ControlType.Number,  title: "Width",            defaultValue: 580, min: 320, max: 1000, step: 10 },
})
