import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, Check,
  ChevronRight, CircleDollarSign, Cloud, Download, FileText, Gauge, LayoutDashboard,
  LoaderCircle, Plus, RefreshCw, Shield, ShieldAlert, Target, Trash2, Wallet, X
} from "lucide-react";
import {
  CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
  BarChart, Bar
} from "recharts";

const API = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

type Asset = {
  id: number; asset_name: string; finding: string; severity: "Critical" | "High" | "Medium" | "Low";
  likelihood: number; impact: number; risk_score: number; exposure_inr: number;
  expected_loss_inr: number; mitigation_cost_inr: number; mitigation_effectiveness: number;
  estimated_avoided_loss_inr: number; status: "Open" | "In Progress" | "Mitigated";
};
type Summary = {
  asset_count: number; critical_count: number; open_count: number; average_risk_score: number;
  estimated_expected_loss_inr: number; severity_counts: Record<string, number>; sample_data: boolean;
};
type Recommendation = {
  id: number; asset_name: string; finding: string; severity: string; cost_inr: number;
  expected_loss_inr: number; estimated_avoided_loss_inr: number; benefit_per_rupee: number; reason: string;
};
type Optimization = {
  budget_inr: number; invested_inr: number; remaining_budget_inr: number;
  estimated_avoided_loss_inr: number; selected_count: number; recommendations: Recommendation[];
  method: string; sample_data: boolean;
};

type MLPrediction = {
  predicted_category: "Low" | "Medium" | "High" | "Critical";
  confidence: number;
  model_type: string;
  dataset_type: string;
};

const money = (value: number) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0
}).format(value || 0);
const compactMoney = (value: number) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return money(value);
};

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

function App() {
  const [page, setPage] = useState<"overview" | "register" | "optimizer" | "ai-predictor">("overview");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [optimization, setOptimization] = useState<Optimization | null>(null);
  const [budget, setBudget] = useState(150000);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState("");

  const [mlInputs, setMlInputs] = useState({
    likelihood: 3,
    impact: 3,
    severity_level: 3,
    asset_criticality: 3,
    exposure_level: 3
  });
  
  const [mlResult, setMlResult] = useState<MLPrediction | null>(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlError, setMlError] = useState("");
  
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [a, s] = await Promise.all([api<Asset[]>("/api/assets"), api<Summary>("/api/summary")]);
      setAssets(a);
      setSummary(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to connect to the API");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const runOptimization = useCallback(async (nextBudget = budget) => {
    setWorking(true);
    setError("");
    try {
      const result = await api<Optimization>("/api/optimize", {
        method: "POST", body: JSON.stringify({ budget_inr: nextBudget })
      });
      setOptimization(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Optimization failed");
    } finally {
      setWorking(false);
    }
  }, [budget]);

  useEffect(() => {
    if (page === "optimizer") void runOptimization(budget);
  }, [page, budget, runOptimization]);

  const riskBars = useMemo(() => assets.map(a => ({
    name: a.asset_name.length > 15 ? `${a.asset_name.slice(0, 13)}…` : a.asset_name,
    score: a.risk_score,
    severity: a.severity
  })), [assets]);

  const pieData = useMemo(() => {
    const counts = summary?.severity_counts || {};
    return [
      { name: "Critical", value: counts.Critical || 0, color: "#fb7185" },
      { name: "High", value: counts.High || 0, color: "#fb923c" },
      { name: "Medium", value: counts.Medium || 0, color: "#facc15" },
      { name: "Low", value: counts.Low || 0, color: "#34d399" }
    ];
  }, [summary]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  async function deleteAsset(id: number) {
    if (!window.confirm("Delete this finding from the demo database?")) return;
    try {
      await api(`/api/assets/${id}`, { method: "DELETE" });
      await refresh();
      notify("Finding deleted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function runMLPrediction() {
    setMlLoading(true);
    setMlError("");
    setMlResult(null);
  
    try {
      const result = await api<MLPrediction>("/api/ml/predict-risk", {
        method: "POST",
        body: JSON.stringify(mlInputs)
      });
  
      setMlResult(result);
    } catch (e) {
      setMlError(
        e instanceof Error ? e.message : "ML prediction failed"
      );
    } finally {
      setMlLoading(false);
    }
  }
  
  
async function addAsset(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);

    const payload = {
      asset_name: String(form.get("asset_name")),
      finding: String(form.get("finding")),
      severity: String(form.get("severity")),
      likelihood: Number(form.get("likelihood")),
      impact: Number(form.get("impact")),
      exposure_inr: Number(form.get("exposure_inr")),
      mitigation_cost_inr: Number(form.get("mitigation_cost_inr")),
      mitigation_effectiveness: Number(form.get("mitigation_effectiveness")),
      status: String(form.get("status"))
    };
    try {
      await api("/api/assets", { method: "POST", body: JSON.stringify(payload) });
      setShowForm(false);
      formElement.reset();
      await refresh();
      notify("Finding added successfully");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add finding");
    }
  }

  const nav = [
    { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
    { id: "register" as const, label: "Risk register", icon: ShieldAlert },
    { id: "optimizer" as const, label: "Investment optimizer", icon: Wallet },
    { id: "ai-predictor" as const, label: "AI Risk Predictor", icon: Activity }

  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Shield size={22} strokeWidth={2.4} /></div>
          <div><strong><span>.</span></strong><small>CYBER RISK INTELLIGENCE</small></div>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>
          {nav.map(item => {
            const Icon = item.icon;
            return <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`}
              onClick={() => setPage(item.id)}>
              <Icon size={18} /><span>{item.label}</span>{page === item.id && <ChevronRight size={15} className="nav-arrow" />}
            </button>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="security-status"><span className="pulse-dot" /><div><b>Risk engine online</b><small>Rule-based scoring active</small></div></div>
          <div className="profile"><div className="avatar">SI</div><div><b>SIH26105 Demo</b><small>Project workspace</small></div></div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><b>{nav.find(n => n.id === page)?.label}</b></div>
          <div className="top-actions">
            <span className="demo-pill"><span className="pulse-dot" /> DEMO ENVIRONMENT</span>
            <button className="icon-button" title="Refresh data" onClick={() => void refresh()}><RefreshCw size={17} /></button>
            <div className="avatar top-avatar">AK</div>
          </div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">CYBER RISK PLATFORM</div>
              <h1>{page === "overview" ? "Security at a glance" : page === "register" ? "Risk register" : page === "optimizer" ? "Investment optimizer" : "AI Risk Predictor"}</h1>

              <p>{page === "overview" ? "Quantify exposure. Prioritize what matters. Make every security rupee count." :
              page === "register" ? "Track findings, understand impact, and maintain your risk inventory." :
              page === "optimizer" ? "Allocate a constrained budget toward interventions with the highest modelled benefit." :
              "Enter risk factors and predict a cyber risk category using the ML demo model."}</p>

            </div>
            <div className="heading-actions">
              <span className="sample-tag"><Activity size={14} /> SYNTHETIC SAMPLE DATA</span>
              {page === "register" && <button className="primary-button" onClick={() => setShowForm(true)}><Plus size={16} /> Add finding</button>}
            </div>
          </div>

          {error && <div className="alert error-alert"><AlertTriangle size={17} /><span>{error}. Check that the backend is running on port 8000.</span><button onClick={() => setError("")}><X size={15}/></button></div>}
          {loading && <div className="loading"><LoaderCircle className="spin" size={22}/> Loading risk data…</div>}

          {!loading && !error && <>
          {page === "ai-predictor" && <>
  <section className="panel optimizer-hero">
    <div className="panel-head">
      <div>
        <h2>AI Cyber Risk Prediction</h2>
        <p>Enter values from 1 (Low) to 5 (High) for each risk factor.</p>
      </div>
      <span className="panel-icon"><Activity size={18} /></span>
    </div>

    <form className="ai-predictor-form" onSubmit={e => { e.preventDefault(); void runMLPrediction(); }}>
      <div className="form-grid">
        <label>
          Likelihood (1–5)
          <input type="number" min="1" max="5" step="1" required
            value={mlInputs.likelihood}
            onChange={e => setMlInputs({ ...mlInputs, likelihood: Number(e.target.value) })} />
        </label>

        <label>
          Impact (1–5)
          <input type="number" min="1" max="5" step="1" required
            value={mlInputs.impact}
            onChange={e => setMlInputs({ ...mlInputs, impact: Number(e.target.value) })} />
        </label>

        <label>
          Severity level (1–5)
          <input type="number" min="1" max="5" step="1" required
            value={mlInputs.severity_level}
            onChange={e => setMlInputs({ ...mlInputs, severity_level: Number(e.target.value) })} />
        </label>

        <label>
          Asset criticality (1–5)
          <input type="number" min="1" max="5" step="1" required
            value={mlInputs.asset_criticality}
            onChange={e => setMlInputs({ ...mlInputs, asset_criticality: Number(e.target.value) })} />
        </label>

        <label className="span-two">
          Exposure level (1–5)
          <input type="number" min="1" max="5" step="1" required
            value={mlInputs.exposure_level}
            onChange={e => setMlInputs({ ...mlInputs, exposure_level: Number(e.target.value) })} />
        </label>
      </div>

      <button type="submit" className="primary-button" disabled={mlLoading}>
        {mlLoading ? <LoaderCircle className="spin" size={16} /> : <Activity size={16} />}
        {mlLoading ? "Predicting..." : "Predict Risk"}
      </button>
    </form>

    {mlError && <div className="alert error-alert"><AlertTriangle size={17} /><span>{mlError}</span></div>}

    {mlResult && <div className="insight-banner">
      <div className="insight-icon"><ShieldAlert size={21} /></div>
      <div className="insight-copy">
        <b>Predicted Risk: {mlResult.predicted_category}</b>
        <p>Model confidence: {(mlResult.confidence * 100).toFixed(1)}%</p>
        <p>Model: {mlResult.model_type} · Dataset: {mlResult.dataset_type}</p>
      </div>
    </div>}

    <div className="method-note">
      <AlertTriangle size={15} />
      <span>Prototype prediction using synthetic demo data. Results are not validated for real-world security decisions.</span>
    </div>
  </section>
</>}
              {page === "overview" && <>
              <div className="metric-grid">
                <Metric title="Average risk score" value={`${summary?.average_risk_score ?? 0}`} suffix="/100"
                  note="Across tracked findings" icon={<Gauge />} tone="violet" />
                <Metric title="Expected financial loss" value={compactMoney(summary?.estimated_expected_loss_inr ?? 0)}
                  note="Probability-weighted estimate" icon={<CircleDollarSign />} tone="blue" />
                <Metric title="Critical findings" value={`${summary?.critical_count ?? 0}`}
                  note="Unmitigated critical severity" icon={<ShieldAlert />} tone="rose" />
                <Metric title="Open findings" value={`${summary?.open_count ?? 0}`}
                  note={`${summary?.asset_count ?? 0} total findings`} icon={<Activity />} tone="amber" />
              </div>

              <div className="insight-banner">
                <div className="insight-icon"><Target size={21}/></div>
                <div className="insight-copy"><b>Decision intelligence, not just alerts</b><p>Use the investment optimizer to compare mitigation costs against modelled expected loss reduction.</p></div>
                <button className="banner-link" onClick={() => setPage("optimizer")}>Optimize budget <ArrowUpRight size={16}/></button>
              </div>

              <div className="dashboard-grid">
                <section className="panel chart-panel">
                  <div className="panel-head"><div><h2>Risk by asset</h2><p>Illustrative likelihood × impact score</p></div><span className="panel-icon"><BarChart3 size={17}/></span></div>
                  <div className="chart-area">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={riskBars} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#243149" vertical={false}/>
                        <XAxis dataKey="name" tick={{ fill: "#8f9eb5", fontSize: 11 }} axisLine={false} tickLine={false}/>
                        <YAxis domain={[0, 100]} tick={{ fill: "#8f9eb5", fontSize: 11 }} axisLine={false} tickLine={false}/>
                        <Tooltip contentStyle={{ background: "#111b2d", border: "1px solid #2b3a52", borderRadius: 10, color: "#e6edf8" }} />
                        <Bar dataKey="score" name="Risk score" radius={[5, 5, 0, 0]}>
                          {riskBars.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.score >= 70 ? "#fb7185" : entry.score >= 45 ? "#fb923c" : "#6d7df7"} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="chart-foot"><span><i className="legend-dot high-dot"/> Higher priority</span><span>Scale: 0–100</span></div>
                </section>

                <section className="panel severity-panel">
                  <div className="panel-head"><div><h2>Severity distribution</h2><p>Findings by reported severity</p></div><span className="panel-icon"><Shield size={17}/></span></div>
                  <div className="severity-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart><Pie data={pieData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={87} paddingAngle={4} stroke="none">
                        {pieData.map(entry => <Cell key={entry.name} fill={entry.color}/>)}
                      </Pie><Tooltip contentStyle={{ background: "#111b2d", border: "1px solid #2b3a52", borderRadius: 10, color: "#e6edf8" }}/></PieChart>
                    </ResponsiveContainer>
                    <div className="donut-center"><b>{summary?.asset_count ?? 0}</b><span>FINDINGS</span></div>
                  </div>
                  <div className="severity-legend">
                    {pieData.map(item => <div key={item.name}><span><i style={{ background: item.color }}/>{item.name}</span><b>{item.value}</b></div>)}
                  </div>
                </section>
              </div>

              <section className="panel table-panel">
                <div className="panel-head"><div><h2>Priority findings</h2><p>Review high-impact items first</p></div><button className="text-button" onClick={() => setPage("register")}>View register <ChevronRight size={15}/></button></div>
                <RiskTable assets={[...assets].sort((a,b) => b.risk_score - a.risk_score).slice(0, 4)} onDelete={deleteAsset} compact />
              </section>
            </>}

            {page === "register" && <>
              <div className="register-summary">
                <div><span>Tracked findings</span><b>{assets.length}</b></div>
                <div><span>Critical / High</span><b>{assets.filter(a => a.severity === "Critical" || a.severity === "High").length}</b></div>
                <div><span>Mitigated</span><b>{assets.filter(a => a.status === "Mitigated").length}</b></div>
                <div><span>Expected loss</span><b>{compactMoney(summary?.estimated_expected_loss_inr ?? 0)}</b></div>
              </div>
              <section className="panel table-panel full-table">
                <div className="panel-head"><div><h2>All findings</h2><p>Sample records are stored in the local SQLite database.</p></div><button className="secondary-button" onClick={() => window.open(`${API}/api/report.csv`, "_blank")}><Download size={15}/> Export CSV</button></div>
                <RiskTable assets={assets} onDelete={deleteAsset} />
              </section>
            </>}

            {page === "optimizer" && <>
              <section className="panel optimizer-hero">
                <div className="optimizer-intro"><div className="panel-icon large"><Wallet size={20}/></div><div><h2>Security investment planner</h2><p>Explore how your available budget changes the mitigation plan.</p></div></div>
                <div className="budget-display"><span>Available budget</span><b>{money(budget)}</b></div>
                <input className="budget-slider" aria-label="Available budget" type="range" min="0" max="350000" step="5000" value={budget} onChange={e => setBudget(Number(e.target.value))}/>
                <div className="slider-labels"><span>₹0</span><span>₹3,50,000</span></div>
                <div className="budget-presets">{[50000, 100000, 150000, 250000, 350000].map(v => <button className={budget === v ? "preset active" : "preset"} key={v} onClick={() => setBudget(v)}>{compactMoney(v)}</button>)}</div>
              </section>
              <div className="metric-grid optimizer-metrics">
                <Metric title="Planned investment" value={compactMoney(optimization?.invested_inr ?? 0)} note="Selected mitigation costs" icon={<Wallet />} tone="blue"/>
                <Metric title="Modelled loss avoided" value={compactMoney(optimization?.estimated_avoided_loss_inr ?? 0)} note="Assumption-based estimate" icon={<ArrowDownRight />} tone="green"/>
                <Metric title="Budget remaining" value={compactMoney(optimization?.remaining_budget_inr ?? budget)} note="Unallocated funds" icon={<CircleDollarSign />} tone="violet"/>
                <Metric title="Interventions selected" value={`${optimization?.selected_count ?? 0}`} note="Fits within available budget" icon={<Check />} tone="amber"/>
              </div>
              <section className="panel table-panel">
                <div className="panel-head"><div><h2>Recommended interventions</h2><p>Ranked using modelled avoided loss per rupee</p></div><button className="secondary-button" onClick={() => void runOptimization()}><RefreshCw size={15}/> Recalculate</button></div>
                {working ? <div className="loading"><LoaderCircle className="spin" size={20}/> Optimizing…</div> :
                  optimization?.recommendations.length ? <div className="recommendations">
                    {optimization.recommendations.map((r, i) => <div className="recommendation" key={r.id}>
                      <div className="recommendation-rank">{String(i + 1).padStart(2, "0")}</div>
                      <div className="recommendation-main"><div className="rec-title">{r.asset_name}<Severity value={r.severity}/></div><p>{r.finding}</p><small>{r.reason}</small></div>
                      <div className="recommendation-values"><span>Mitigation cost</span><b>{money(r.cost_inr)}</b><span>Modelled avoided loss</span><strong>{money(r.estimated_avoided_loss_inr)}</strong></div>
                    </div>)}
                  </div> : <div className="empty-state"><Wallet size={28}/><b>No interventions fit this budget</b><span>Increase the budget to see recommended actions.</span></div>}
                <div className="method-note"><AlertTriangle size={15}/><span>{optimization?.method || "Optimization uses a greedy heuristic."} Outputs are illustrative and should be validated before real decisions.</span></div>
              </section>
            </>}
          </>}
          <footer className="page-footer"><span>© SIH26105 · Cyber Risk Quantification & Investment Optimization</span><span><i className="pulse-dot"/> API-backed prototype · Synthetic data</span></footer>
        </div>
      </main>

      {showForm && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
        <form className="modal" onSubmit={addAsset}>
          <div className="modal-head"><div><h2>Add risk finding</h2><p>Create a record in the demo database.</p></div><button type="button" className="icon-button" onClick={() => setShowForm(false)}><X size={17}/></button></div>
          <label>Asset name<input name="asset_name" required minLength={2} placeholder="e.g. Customer Portal"/></label>
          <label>Finding description<input name="finding" required minLength={3} placeholder="e.g. Weak password policy"/></label>
          <div className="form-grid">
            <label>Severity<select name="severity"><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label>
            <label>Status<select name="status"><option>Open</option><option>In Progress</option><option>Mitigated</option></select></label>
            <label>Likelihood (0–1)<input name="likelihood" type="number" min="0" max="1" step="0.05" defaultValue="0.5" required/></label>
            <label>Impact (1–10)<input name="impact" type="number" min="1" max="10" defaultValue="7" required/></label>
            <label>Exposure (INR)<input name="exposure_inr" type="number" min="0" defaultValue="250000" required/></label>
            <label>Mitigation cost (INR)<input name="mitigation_cost_inr" type="number" min="0" defaultValue="50000" required/></label>
            <label className="span-two">Mitigation effectiveness (0–1)<input name="mitigation_effectiveness" type="number" min="0" max="1" step="0.05" defaultValue="0.6" required/></label>
          </div>
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="primary-button"><Plus size={15}/> Save finding</button></div>
        </form>
      </div>}

      {toast && <div className="toast"><Check size={16}/>{toast}</div>}
    </div>
  );
}

function Metric({ title, value, suffix, note, icon, tone }: {
  title: string; value: string; suffix?: string; note: string; icon: React.ReactNode; tone: string;
}) {
  return <article className="metric-card">
    <div className="metric-top"><span>{title}</span><div className={`metric-icon ${tone}`}>{icon}</div></div>
    <div className="metric-value">{value}<small>{suffix}</small></div>
    <div className="metric-note"><span className="note-dot"/> {note}</div>
  </article>;
}

function Severity({ value }: { value: string }) {
  return <span className={`severity-badge ${value.toLowerCase()}`}>{value}</span>;
}

function RiskTable({ assets, onDelete, compact = false }: { assets: Asset[]; onDelete: (id: number) => void; compact?: boolean }) {
  if (!assets.length) return <div className="empty-state"><FileText size={28}/><b>No findings yet</b><span>Add a finding to start building your register.</span></div>;
  return <div className="table-scroll"><table className="risk-table">
    <thead><tr><th>Asset / finding</th><th>Severity</th><th>Risk score</th><th>Expected loss</th><th>Status</th>{!compact && <th>Action</th>}</tr></thead>
    <tbody>{assets.map(a => <tr key={a.id}>
      <td><div className="asset-cell"><div className="asset-symbol"><Cloud size={16}/></div><div><b>{a.asset_name}</b><span>{a.finding}</span></div></div></td>
      <td><Severity value={a.severity}/></td>
      <td><div className="score-cell"><b>{a.risk_score}</b><div className="score-track"><i style={{ width: `${a.risk_score}%`, background: a.risk_score >= 70 ? "#fb7185" : a.risk_score >= 45 ? "#fb923c" : "#6d7df7" }}/></div></div></td>
      <td className="money-cell">{money(a.expected_loss_inr)}</td>
      <td><span className={`status-badge ${a.status.toLowerCase().replace(" ", "-")}`}>{a.status}</span></td>
      {!compact && <td><button className="row-action" title="Delete finding" onClick={() => onDelete(a.id)}><Trash2 size={15}/></button></td>}
    </tr>)}</tbody>
  </table></div>;
}

export default App;
