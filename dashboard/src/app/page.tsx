'use client';
import { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://analysis.seoh.ca/api';

function PricingCard({ tier, price, analyses, features, currentTier, onUpgrade }: {
  tier: string; price: string; analyses: string; features: string[];
  currentTier: string; onUpgrade: () => void;
}) {
  const isCurrent = tier === currentTier;
  const isDowngrade = ['free','starter','pro','agency'].indexOf(tier) < ['free','starter','pro','agency'].indexOf(currentTier);
  return (
    <div className={`bg-[#111] border rounded-xl p-5 ${isCurrent ? 'border-teal-500' : 'border-[#1a1a1a]'}`}>
      {isCurrent && <div className="text-xs text-teal-400 font-semibold uppercase mb-2">Current Plan</div>}
      <div className="flex items-end gap-1 mb-1">
        <span className="text-2xl font-bold">{price}</span>
        {price !== '$0' && <span className="text-gray-400 text-sm mb-1">/mo</span>}
      </div>
      <div className="text-sm font-medium capitalize mb-1">{tier}</div>
      <div className="text-xs text-gray-400 mb-4">{analyses} analyses/month</div>
      <ul className="space-y-1 mb-4">
        {features.map(f => <li key={f} className="text-xs text-gray-400">✓ {f}</li>)}
      </ul>
      {!isCurrent && !isDowngrade && (
        <button onClick={onUpgrade} className="w-full bg-teal-600 hover:bg-teal-700 rounded-lg py-2 text-sm font-medium transition-colors">Upgrade</button>
      )}
      {isDowngrade && <div className="text-xs text-gray-600 text-center">Contact us to downgrade</div>}
    </div>
  );
}

function ScoreRing({ score, max = 100, color = '#14b8a6', size = 80 }: { score: number; max?: number; color?: string; size?: number }) {
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, (score / max) * 100);
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1a1a1a" strokeWidth="8" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
        fill="white" fontSize={size > 70 ? "18" : "13"} fontWeight="bold">{score}</text>
    </svg>
  );
}

function AnalyzeSection({ token }: { token: string }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [seo, setSeo] = useState<any>(null);
  const [geo, setGeo] = useState<any>(null);
  const [kw, setKw] = useState<any>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'seo'|'geo'|'keywords'|'airecs'>('seo');
  const [aiRecs, setAiRecs] = useState<any>(null);
  const [aiRecsLoading, setAiRecsLoading] = useState(false);
  const [aiRecsError, setAiRecsError] = useState<string|null>(null);
  const [aiRecsUpgrade, setAiRecsUpgrade] = useState(false);

  const run = async () => {
    if (!url.trim()) return;
    setLoading(true); setError(''); setSeo(null); setGeo(null); setKw(null);
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    const body = JSON.stringify({ url: url.trim() });
    try {
      const [r1, r2, r3] = await Promise.all([
        fetch(`${API_BASE}/crawl/analyze`, { method: 'POST', headers, body }),
        fetch(`${API_BASE}/geo/score`, { method: 'POST', headers, body }),
        fetch(`${API_BASE}/keywords/analyze`, { method: 'POST', headers, body }),
      ]);
      const [d1, d2, d3] = await Promise.all([r1.json(), r2.json(), r3.json()]);
      if (!r1.ok) throw new Error(d1.error || 'SEO analysis failed');
      setSeo(d1); setGeo(d2); setKw(d3); setTab('seo');
    } catch (e: any) { setError(e.message || 'Analysis failed'); }
    setLoading(false);
  };

  const geoColor = (g: string) => ({ A: '#22c55e', B: '#14b8a6', C: '#f59e0b', D: '#f97316', F: '#ef4444' }[g] || '#ef4444');
  const seoColor = (s: number) => s >= 80 ? '#22c55e' : s >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-6 mb-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Analyze a Website</h2>
      <div className="flex gap-2 mb-4">
        <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()}
          placeholder="https://example.com"
          className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500 font-mono" />
        <button onClick={run} disabled={loading}
          className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
          {loading ? 'Analyzing…' : 'Run Analysis'}
        </button>
      </div>
      {error && <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded px-3 py-2 mb-4">{error}</p>}
      {loading && (
        <div className="flex items-center gap-3 py-10 justify-center text-gray-400 text-sm">
          <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          Running SEO crawl, GEO scoring, and keyword analysis…
        </div>
      )}
      {seo && geo && (
        <>
          {/* Score overview */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5 flex items-center gap-5">
              <ScoreRing score={seo.seoScore} color={seoColor(seo.seoScore)} size={84} />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">SEO Score</p>
                <p className="text-lg font-bold">{seo.seoScore >= 80 ? 'Good' : seo.seoScore >= 60 ? 'Fair' : 'Needs Work'}</p>
                <p className="text-xs text-gray-500 truncate max-w-[180px]" title={seo.url}>{seo.url}</p>
              </div>
            </div>
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-5 flex items-center gap-5">
              <ScoreRing score={geo.geoScore} color={geoColor(geo.grade)} size={84} />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">GEO / AI Score</p>
                <p className="text-lg font-bold">Grade {geo.grade}</p>
                <p className="text-xs text-gray-500">{geo.grading}</p>
              </div>
            </div>
          </div>

          {/* Tab nav */}
          <div className="flex gap-1 mb-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-1">
            {(['seo', 'geo', 'keywords', 'airecs'] as const).map(t => (
              <button key={t} onClick={() => {
                setTab(t);
                if (t === 'airecs' && !aiRecs && !aiRecsLoading) {
                  setAiRecsLoading(true);
                  setAiRecsError(null);
                  setAiRecsUpgrade(false);
                  fetch(`${API_BASE}/ai-recommendations/analyze`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ url: seo?.url || url, seo: seo || {}, geo: geo || {} }),
                  }).then(async r => {
                    if (r.status === 403) { setAiRecsUpgrade(true); setAiRecsLoading(false); return; }
                    const d = await r.json();
                    if (!r.ok) throw new Error(d.error || 'AI analysis failed');
                    setAiRecs(d);
                    setAiRecsLoading(false);
                  }).catch(e => { setAiRecsError(e.message); setAiRecsLoading(false); });
                }
              }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === t ? 'bg-teal-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                {t === 'geo' ? 'GEO / AI Visibility' : t === 'seo' ? 'SEO Details' : t === 'airecs' ? 'AI Recs' : 'Keywords'}
              </button>
            ))}
          </div>

          {/* SEO tab */}
          {tab === 'seo' && (
            <div className="space-y-4">
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Page Meta</h3>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Title <span className="text-gray-600">({seo.titleLength} chars)</span></p>
                  <p className="text-sm text-gray-200">{seo.title}</p>
                </div>
                {seo.metaDescription && (
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">
                      Meta Description&nbsp;
                      <span className={seo.metaDescriptionLength > 160 ? 'text-amber-400' : 'text-gray-600'}>
                        ({seo.metaDescriptionLength} chars{seo.metaDescriptionLength > 160 ? ' — too long' : ''})
                      </span>
                    </p>
                    <p className="text-sm text-gray-300 line-clamp-2">{seo.metaDescription}</p>
                  </div>
                )}
                <div className="grid grid-cols-4 gap-3 pt-1">
                  {[
                    { label: 'HTTPS', ok: seo.isHttps },
                    { label: 'Mobile', ok: seo.mobileOptimized },
                    { label: 'Canonical', ok: !!seo.canonical },
                    { label: 'OG Image', ok: !!seo.openGraph?.image },
                  ].map(i => (
                    <div key={i.label} className="text-center">
                      <div className={`text-lg ${i.ok ? 'text-green-400' : 'text-red-400'}`}>{i.ok ? '✓' : '✗'}</div>
                      <div className="text-xs text-gray-500">{i.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Word Count', value: seo.content?.wordCount || 0 },
                  { label: 'Internal Links', value: seo.links?.internal || 0 },
                  { label: 'External Links', value: seo.links?.external || 0 },
                ].map(s => (
                  <div key={s.label} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3 text-center">
                    <p className="text-2xl font-mono font-bold">{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>

              {seo.images && (
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Images</h3>
                    <div className="flex gap-3 text-sm">
                      <span>{seo.images.total} total</span>
                      <span className="text-green-400">{seo.images.withAlt} with alt</span>
                      {seo.images.withoutAlt > 0 && <span className="text-amber-400">{seo.images.withoutAlt} missing alt</span>}
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-full h-1.5">
                    <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${(seo.images.withAlt / Math.max(1, seo.images.total)) * 100}%` }} />
                  </div>
                </div>
              )}

              {seo.headings?.h1?.length > 0 && (
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Headings</h3>
                  <div className="space-y-1.5">
                    {seo.headings.h1?.slice(0,2).map((h: string, i: number) => (
                      <div key={i} className="flex gap-2 text-sm"><span className="text-teal-400 font-mono text-xs w-6 mt-0.5 shrink-0">H1</span><span className="text-gray-200">{h}</span></div>
                    ))}
                    {seo.headings.h2?.slice(0,3).map((h: string, i: number) => (
                      <div key={i} className="flex gap-2 text-sm"><span className="text-blue-400 font-mono text-xs w-6 mt-0.5 shrink-0">H2</span><span className="text-gray-400">{h}</span></div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {seo.issues?.length > 0 && (
                  <div className="bg-[#0a0a0a] border border-amber-900/40 rounded-lg p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2">Issues</h3>
                    <ul className="space-y-1.5">
                      {seo.issues.map((i: string, idx: number) => (
                        <li key={idx} className="text-xs text-gray-300 flex gap-1.5"><span className="text-amber-400 shrink-0 mt-0.5">⚠</span>{i}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {seo.strengths?.length > 0 && (
                  <div className="bg-[#0a0a0a] border border-green-900/40 rounded-lg p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-green-400 mb-2">Strengths</h3>
                    <ul className="space-y-1.5">
                      {seo.strengths.map((s: string, idx: number) => (
                        <li key={idx} className="text-xs text-gray-300 flex gap-1.5"><span className="text-green-400 shrink-0 mt-0.5">✓</span>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* GEO tab */}
          {tab === 'geo' && (
            <div className="space-y-4">
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Score Breakdown</h3>
                <div className="space-y-3">
                  {geo.breakdown && Object.entries(geo.breakdown).map(([key, val]: [string, any]) => {
                    const pct = (val.score / val.max) * 100;
                    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                    const col = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">{label}</span>
                          <span className="font-mono" style={{ color: col }}>{val.score}/{val.max}</span>
                        </div>
                        <div className="bg-gray-800 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: col }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {geo.signals && (
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">AI Visibility Signals</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Schema Types', value: geo.schemas?.join(', ') || 'None detected' },
                      { label: 'Rich Headings', value: geo.signals.richHeadings ? 'Present' : 'Missing' },
                      { label: 'Citations/Sources', value: geo.signals.hasCitations ? 'Present' : 'Missing' },
                      { label: 'Word Count', value: `${geo.wordCount || 0} words` },
                    ].map(s => (
                      <div key={s.label} className="bg-[#111] rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-0.5">{s.label}</p>
                        <p className="text-sm font-medium">{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {geo.recommendations?.length > 0 && (
                <div className="bg-[#0a0a0a] border border-teal-900/40 rounded-lg p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400 mb-3">Recommendations to Improve AI Visibility</h3>
                  <ul className="space-y-2">
                    {geo.recommendations.map((r: string, i: number) => (
                      <li key={i} className="text-sm text-gray-300 flex gap-2">
                        <span className="text-teal-400 shrink-0 mt-0.5">→</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Keywords tab */}
          {tab === 'keywords' && kw && (
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Top Keywords <span className="text-gray-600 normal-case font-normal">— {kw.totalWords} words indexed</span>
              </h3>
              <div className="space-y-2.5">
                {kw.topKeywords?.slice(0, 15).map((k: any) => (
                  <div key={k.word} className="flex items-center gap-3">
                    <span className="text-sm font-mono w-28 text-gray-300 truncate">{k.word}</span>
                    <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                      <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, k.density * 12)}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-20 text-right">{k.count}× ({k.density}%)</span>
                    <div className="flex gap-1 w-16 justify-end">
                      {k.inTitle && <span className="text-xs bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded">T</span>}
                      {k.inH1 && <span className="text-xs bg-teal-900/40 text-teal-400 px-1.5 py-0.5 rounded">H1</span>}
                      {k.inMeta && <span className="text-xs bg-purple-900/40 text-purple-400 px-1.5 py-0.5 rounded">M</span>}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-3">T = in title · H1 = in heading · M = in meta description</p>
            </div>
          )}

          {/* AI Recs tab */}
          {tab === 'airecs' && (
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
              {aiRecsLoading && (
                <div className="flex items-center gap-3 py-10 justify-center text-gray-400 text-sm">
                  <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  Grok is analyzing your site...
                </div>
              )}
              {aiRecsUpgrade && (
                <div className="text-center py-10">
                  <p className="text-yellow-400 font-semibold mb-2">Starter Plan Required</p>
                  <p className="text-gray-400 text-sm mb-4">Upgrade to Starter plan for AI recommendations</p>
                  <a href="https://analysis.seoh.ca" className="bg-teal-600 hover:bg-teal-700 px-6 py-2 rounded-lg text-sm font-medium transition-colors">Upgrade Now</a>
                </div>
              )}
              {aiRecsError && (
                <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded px-3 py-2">{aiRecsError}</p>
              )}
              {aiRecs && aiRecs.recommendations && (
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                    Grok AI Recommendations <span className="text-gray-600 normal-case font-normal">— {aiRecs.model}</span>
                  </h3>
                  {aiRecs.recommendations.map((rec: any, i: number) => (
                    <div key={i} className="border border-[#2a2a2a] rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-white">{rec.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${rec.impact === 'high' ? 'bg-red-900/50 text-red-400' : rec.impact === 'medium' ? 'bg-yellow-900/50 text-yellow-400' : 'bg-blue-900/50 text-blue-400'}`}>
                          {rec.impact}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mb-2">{rec.recommendation}</p>
                      {rec.why_it_matters && (
                        <p className="text-xs text-teal-400 border-t border-[#2a2a2a] pt-2 mt-2">
                          <span className="font-semibold">Why it matters: </span>{rec.why_it_matters}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [account, setAccount] = useState<any>(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyResult, setNewKeyResult] = useState<any>(null);
  const [copied, setCopied] = useState('');
  const [section, setSection] = useState<'analyze'|'keys'|'plans'>('analyze');

  useEffect(() => {
    const saved = localStorage.getItem('dashboard_token');
    if (saved) { setToken(saved); fetchAccount(saved); }
  }, []);

  const fetchAccount = async (t: string) => {
    const r = await fetch(`${API_BASE}/account/me`, { headers: { Authorization: `Bearer ${t}` } });
    if (r.ok) setAccount(await r.json());
    else { localStorage.removeItem('dashboard_token'); setToken(null); }
  };

  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    const r = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm),
    });
    const data = await r.json();
    if (r.ok && data.token) {
      localStorage.setItem('dashboard_token', data.token);
      setToken(data.token); fetchAccount(data.token);
    } else setError(data.message || 'Login failed');
  };

  const generateKey = async () => {
    const r = await fetch(`${API_BASE}/account/keys`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newKeyLabel || 'API Key' }),
    });
    const data = await r.json();
    if (r.ok) { setNewKeyResult(data); fetchAccount(token!); }
    else setError(data.error || 'Failed to generate key');
  };

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text); setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleUpgrade = async (tier: string) => {
    const r = await fetch(`${API_BASE}/billing/checkout/${tier}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await r.json();
    if (data.checkoutUrl) window.open(data.checkoutUrl, '_blank');
    else alert(data.message || 'Contact us at seoh.ca/contact to upgrade');
  };

  if (!token) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">SEOh! Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Agency Dashboard</p>
        </div>
        <form onSubmit={login} className="bg-[#111] border border-[#1a1a1a] rounded-xl p-6 space-y-4">
          {error && <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded px-3 py-2">{error}</p>}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Email</label>
            <input type="email" required value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Password</label>
            <input type="password" required value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-teal-500" />
          </div>
          <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 rounded-lg py-2.5 font-medium transition-colors">Sign In</button>
          <p className="text-center text-xs text-gray-500">Don&apos;t have an account? <a href="https://seoh.ca/contact" target="_blank" className="text-teal-400">Contact us</a></p>
        </form>
      </div>
    </div>
  );

  const { agency, keys, tierFeatures } = account || {};
  const tierColors: Record<string, string> = { free: 'gray', starter: 'blue', pro: 'purple', agency: 'teal' };
  const tierColor = tierColors[agency?.tier] || 'gray';

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">SEOh! Analytics</h1>
          <p className="text-gray-400 text-sm">{agency?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium bg-${tierColor}-950 text-${tierColor}-400 border border-${tierColor}-800 uppercase`}>
            {agency?.tier}
          </span>
          <button onClick={() => { localStorage.removeItem('dashboard_token'); setToken(null); setAccount(null); }}
            className="text-gray-400 hover:text-white text-sm">Sign out</button>
        </div>
      </div>

      {/* Nav */}
      <div className="flex gap-1 mb-6 bg-[#111] border border-[#1a1a1a] rounded-xl p-1">
        {([['analyze', 'Analyze'], ['keys', 'API Keys'], ['plans', 'Plans & Billing']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setSection(id)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${section === id ? 'bg-teal-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Usage KPIs */}
      {keys && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Active Keys', value: keys.filter((k: any) => k.active).length },
            { label: 'Used This Month', value: keys.reduce((s: number, k: any) => s + (k.usage_this_month || 0), 0) },
            { label: 'Monthly Limit', value: keys.reduce((s: number, k: any) => s + (k.monthly_limit || 0), 0) },
          ].map(kpi => (
            <div key={kpi.label} className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{kpi.label}</p>
              <p className="text-2xl font-mono font-bold">{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {section === 'analyze' && <AnalyzeSection token={token} />}

      {section === 'keys' && (
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">API Keys</h2>
          {newKeyResult && (
            <div className="bg-green-950 border border-green-800 rounded-lg p-4 mb-4">
              <p className="text-green-400 text-sm font-semibold mb-2">Key generated — save it now, it won&apos;t be shown again</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-black rounded px-3 py-2 text-sm font-mono text-green-300 break-all">{newKeyResult.raw_key}</code>
                <button onClick={() => copy(newKeyResult.raw_key, 'new')} className="bg-green-800 hover:bg-green-700 px-3 py-2 rounded text-xs">
                  {copied === 'new' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}
          <div className="space-y-3 mb-4">
            {keys?.filter((k: any) => k.active).map((key: any) => (
              <div key={key.id} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{key.label}</span>
                  <span className="text-xs text-gray-500">{key.usage_this_month}/{key.monthly_limit} used</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-gray-400 flex-1">{key.key_prefix}••••••••••••••••</code>
                  <span className="text-xs text-gray-600">Last used: {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}</span>
                </div>
                <div className="mt-2 bg-gray-800 rounded-full h-1">
                  <div className="bg-teal-500 h-1 rounded-full" style={{ width: `${Math.min(100, (key.usage_this_month / key.monthly_limit) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newKeyLabel} onChange={e => setNewKeyLabel(e.target.value)} placeholder="Key label (e.g. Production)"
              className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500" />
            <button onClick={generateKey} className="bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Generate Key
            </button>
          </div>
          <div className="mt-6 pt-6 border-t border-[#1a1a1a]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Quick Start</h3>
            {[
              { label: 'SEO Crawl', code: `curl -X POST https://analysis.seoh.ca/api/crawl/analyze \\\n  -H "X-Api-Key: YOUR_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"url":"https://example.com"}'` },
              { label: 'GEO Score', code: `curl -X POST https://analysis.seoh.ca/api/geo/score \\\n  -H "X-Api-Key: YOUR_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"url":"https://example.com"}'` },
            ].map(ex => (
              <div key={ex.label} className="mb-3">
                <p className="text-xs text-gray-500 mb-1">{ex.label}</p>
                <div className="relative">
                  <pre className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3 text-xs font-mono text-gray-300 overflow-x-auto">{ex.code}</pre>
                  <button onClick={() => copy(ex.code, ex.label)} className="absolute top-2 right-2 text-xs text-gray-500 hover:text-white">
                    {copied === ex.label ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {section === 'plans' && (
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Your Plan — {agency?.tier?.toUpperCase()}</h2>
          {tierFeatures && (
            <div className="grid grid-cols-2 gap-2 mb-6">
              {Object.entries(tierFeatures).map(([feature, enabled]) => (
                <div key={feature} className={`flex items-center gap-2 text-sm ${enabled ? 'text-white' : 'text-gray-600'}`}>
                  <span>{enabled ? '✓' : '✗'}</span>
                  <span className="capitalize">{feature.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { tier: 'free', price: '$0', analyses: '50', features: ['SEO crawl', 'GEO score', 'Performance'] },
              { tier: 'starter', price: '$59.99', analyses: '500', features: ['Everything in Free', 'PDF reports', 'Competitor compare'] },
              { tier: 'pro', price: '$109.99', analyses: '2,000', features: ['Everything in Starter', 'Bulk analysis', 'Monitoring + alerts'] },
              { tier: 'agency', price: '$399.99', analyses: '10,000', features: ['Everything in Pro', 'Site-wide crawler', 'Priority support'] },
            ].map(p => (
              <PricingCard key={p.tier} {...p} currentTier={agency?.tier || 'free'} onUpgrade={() => handleUpgrade(p.tier)} />
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-4 text-center">
            Manage your subscription → <a href="#" onClick={async (e) => { e.preventDefault(); const r = await fetch(`${API_BASE}/billing/portal`, { headers: { Authorization: `Bearer ${token}` } }); const d = await r.json(); if (d.portalUrl) window.open(d.portalUrl, '_blank'); }} className="text-teal-400 hover:underline">Customer Portal</a>
          </p>
        </div>
      )}
    </div>
  );
}
