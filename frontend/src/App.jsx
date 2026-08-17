import { useState, useEffect, useRef } from "react";
import { analyzePdf } from "./api";
import "./App.css";

const STORAGE_KEY = "judgmentai:cases";
const URGENCY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

function loadCases() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function parseDate(s) {
  const t = Date.parse(s);
  return isNaN(t) ? -Infinity : t; // unparseable/"Not specified" sorts last
}

function Tag({ level }) {
  return <span className={`tag ${level}`}>{level}</span>;
}

function Citation({ source }) {
  const conf = source.confidence ?? 0;
  const pct = Math.round(conf * 100);
  return (
    <div className="citation">
      <p className="citation-quote">{source.sentence}</p>
      <div className="citation-foot">
        <span className="pageref">{source.page === -1 ? "not in source" : `p.${source.page}`}</span>
        <span className="conf">
          <span className="conf-label">confidence</span>
          <span className="meter"><span className="meter-fill" style={{ width: `${pct}%` }} /></span>
          <span className="conf-val">{conf.toFixed(2)}</span>
        </span>
      </div>
    </div>
  );
}

// full analysis view
function CaseDetail({ data, onBack }) {
  const cd = data.case_details;
  return (
    <div className="dossier">
      <button className="back-btn" onClick={onBack}>← Back to library</button>

      <section className="verdict">
        <div className="eyebrow">Assessment</div>
        <div className="verdict-head">
          <h2 className="verdict-title">{cd.title}</h2>
          <Tag level={data.overall_urgency} />
        </div>
        <p className="verdict-summary">{data.summary}</p>
      </section>

      <section className="record">
        <h3 className="record-title">Case details</h3>
        <dl className="kv">
          <dt>Case no.</dt><dd className="mono">{cd.case_number}</dd>
          <dt>Court</dt><dd>{cd.court}</dd>
          <dt>Department</dt><dd>{cd.responsible_department || "Not specified"}</dd>
          <dt>Judges</dt><dd>{cd.judges.join(", ")}</dd>
          <dt>Date</dt><dd className="mono">{cd.date}</dd>
          <dt>Petitioner</dt><dd>{cd.petitioner}</dd>
          <dt>Respondent</dt><dd>{cd.respondent}</dd>
        </dl>
        <Citation source={cd.source} />
      </section>

      <section className="record">
        <h3 className="record-title">Appeal window</h3>
        <dl className="kv">
          <dt>Can appeal</dt><dd>{data.appeal_window.can_appeal ? "Yes" : "No"}</dd>
          <dt>Deadline</dt><dd className="mono">{data.appeal_window.deadline}</dd>
          <dt>Days left</dt><dd className="mono">{data.appeal_window.days_remaining}</dd>
        </dl>
        <Citation source={data.appeal_window.source} />
      </section>

      <section className="record">
        <h3 className="record-title">Directions <span className="count">{data.directions.length}</span></h3>
        {data.directions.length === 0 ? (
          <p className="empty">No directions issued — this judgment doesn't order any party to act.</p>
        ) : data.directions.map((d, i) => (
          <div key={i} className="entry">
            <p className="entry-text">{d.text}</p>
            <p className="entry-meta">Deadline: {d.deadline}</p>
            <Citation source={d.source} />
          </div>
        ))}
      </section>

      <section className="record">
        <h3 className="record-title">Action items <span className="count">{data.action_items.length}</span></h3>
        {data.action_items.length === 0 ? (
          <p className="empty">No action items — nothing here requires follow-up.</p>
        ) : data.action_items.map((a, i) => (
          <div key={i} className="entry">
            <p className="entry-text">{a.task} &nbsp;<Tag level={a.priority} /></p>
            <p className="entry-meta">Due: {a.due_date}</p>
            <Citation source={a.source} />
          </div>
        ))}
      </section>
    </div>
  );
}

// one row in the library list
function CaseRow({ item, onOpen, onDelete }) {
  const cd = item.data.case_details;
  return (
    <div className="case-row" onClick={() => onOpen(item.id)}>
      <div className="case-row-main">
        <p className="case-row-title">{cd.title}</p>
        <p className="case-row-meta">
          <span>{cd.court}</span><span className="dot">·</span>
          <span className="mono">{cd.date}</span><span className="dot">·</span>
          <span>{cd.responsible_department || "Not specified"}</span>
        </p>
      </div>
      <div className="case-row-side">
        <Tag level={item.data.overall_urgency} />
        <button className="del-btn" title="Remove from library"
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}>×</button>
      </div>
    </div>
  );
}

// deep-clone helper for the editable draft
function cloneDraft(data) {
  return JSON.parse(JSON.stringify(data));
}

// editable review screen — appears after LLM extraction, before publishing
function ReviewPanel({ draft, setDraft, onApprove, onDiscard }) {
  const cd = draft.case_details;

  function updateCase(key, value) {
    setDraft((d) => ({ ...d, case_details: { ...d.case_details, [key]: value } }));
  }
  function updateTop(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  function updateAppeal(key, value) {
    setDraft((d) => ({ ...d, appeal_window: { ...d.appeal_window, [key]: value } }));
  }
  function updateDirection(i, key, value) {
    setDraft((d) => {
      const list = [...d.directions];
      list[i] = { ...list[i], [key]: value };
      return { ...d, directions: list };
    });
  }
  function updateActionItem(i, key, value) {
    setDraft((d) => {
      const list = [...d.action_items];
      list[i] = { ...list[i], [key]: value };
      return { ...d, action_items: list };
    });
  }
  function removeDirection(i) {
    setDraft((d) => ({ ...d, directions: d.directions.filter((_, idx) => idx !== i) }));
  }
  function removeActionItem(i) {
    setDraft((d) => ({ ...d, action_items: d.action_items.filter((_, idx) => idx !== i) }));
  }

  return (
    <div className="dossier">
      <div className="review-banner">
        <span className="eyebrow">Pending review</span>
        <p>Check the extraction below, correct anything the model got wrong, then publish it to the library.</p>
      </div>

      <section className="record">
        <h3 className="record-title">Case details</h3>
        <div className="edit-grid">
          <label>Title<input value={cd.title} onChange={(e) => updateCase("title", e.target.value)} /></label>
          <label>Case no.<input className="mono" value={cd.case_number} onChange={(e) => updateCase("case_number", e.target.value)} /></label>
          <label>Court<input value={cd.court} onChange={(e) => updateCase("court", e.target.value)} /></label>
          <label>Judges<input value={cd.judges.join(", ")} onChange={(e) => updateCase("judges", e.target.value.split(",").map((s) => s.trim()))} /></label>
          <label>Date<input className="mono" value={cd.date} onChange={(e) => updateCase("date", e.target.value)} /></label>
          <label>Petitioner<input value={cd.petitioner} onChange={(e) => updateCase("petitioner", e.target.value)} /></label>
          <label>Respondent<input value={cd.respondent} onChange={(e) => updateCase("respondent", e.target.value)} /></label>
          <label>Department<input value={cd.responsible_department} onChange={(e) => updateCase("responsible_department", e.target.value)} /></label>
        </div>
        <Citation source={cd.source} />
      </section>

      <section className="record">
        <h3 className="record-title">Summary &amp; urgency</h3>
        <label className="edit-block">
          Summary
          <textarea rows={3} value={draft.summary} onChange={(e) => updateTop("summary", e.target.value)} />
        </label>
        <label className="edit-block edit-inline">
          Overall urgency
          <select value={draft.overall_urgency} onChange={(e) => updateTop("overall_urgency", e.target.value)}>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
      </section>

      <section className="record">
        <h3 className="record-title">Appeal window</h3>
        <div className="edit-grid">
          <label className="edit-inline">
            Can appeal
            <select value={String(draft.appeal_window.can_appeal)} onChange={(e) => updateAppeal("can_appeal", e.target.value === "true")}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
          <label>Deadline<input className="mono" value={draft.appeal_window.deadline} onChange={(e) => updateAppeal("deadline", e.target.value)} /></label>
          <label>Days left<input className="mono" type="number" value={draft.appeal_window.days_remaining} onChange={(e) => updateAppeal("days_remaining", Number(e.target.value))} /></label>
        </div>
        <Citation source={draft.appeal_window.source} />
      </section>

      <section className="record">
        <h3 className="record-title">Directions <span className="count">{draft.directions.length}</span></h3>
        {draft.directions.length === 0 && <p className="empty">No directions extracted.</p>}
        {draft.directions.map((d, i) => (
          <div key={i} className="entry edit-entry">
            <label className="edit-block">Text<textarea rows={2} value={d.text} onChange={(e) => updateDirection(i, "text", e.target.value)} /></label>
            <label>Deadline<input className="mono" value={d.deadline} onChange={(e) => updateDirection(i, "deadline", e.target.value)} /></label>
            <button className="remove-entry" onClick={() => removeDirection(i)}>Remove this direction</button>
            <Citation source={d.source} />
          </div>
        ))}
      </section>

      <section className="record">
        <h3 className="record-title">Action items <span className="count">{draft.action_items.length}</span></h3>
        {draft.action_items.length === 0 && <p className="empty">No action items extracted.</p>}
        {draft.action_items.map((a, i) => (
          <div key={i} className="entry edit-entry">
            <label className="edit-block">Task<textarea rows={2} value={a.task} onChange={(e) => updateActionItem(i, "task", e.target.value)} /></label>
            <div className="edit-grid">
              <label className="edit-inline">
                Priority
                <select value={a.priority} onChange={(e) => updateActionItem(i, "priority", e.target.value)}>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
              <label>Due<input className="mono" value={a.due_date} onChange={(e) => updateActionItem(i, "due_date", e.target.value)} /></label>
            </div>
            <button className="remove-entry" onClick={() => removeActionItem(i)}>Remove this item</button>
            <Citation source={a.source} />
          </div>
        ))}
      </section>

      <div className="review-actions">
        <button className="discard-btn" onClick={onDiscard}>Discard</button>
        <button className="approve-btn" onClick={onApprove}>Approve &amp; publish to dashboard</button>
      </div>
    </div>
  );
}

function App() {
  const [cases, setCases] = useState(loadCases);
  const [selectedId, setSelectedId] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const inputRef = useRef(null);
  const [pendingReview, setPendingReview] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
  }, [cases]);

  async function handleAnalyze() {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const data = await analyzePdf(file);
      setPendingReview(cloneDraft(data)); // editable draft, nothing saved yet
      setFile(null);
    } catch {
      setError("Couldn't reach the analyzer. The backend may be waking up — wait a moment and try again.");
    }
    setLoading(false);
  }

  function approveReview() {
    const item = { id: Date.now().toString(), addedAt: Date.now(), data: pendingReview };
    setCases((prev) => [item, ...prev]);
    setPendingReview(null);
    setSelectedId(item.id);
  }

  function discardReview() {
    setPendingReview(null);
  }

  function deleteCase(id) {
    setCases((prev) => prev.filter((c) => c.id !== id));
  }

  const visible = cases
    .filter((c) => filter === "all" || c.data.overall_urgency === filter)
    .sort((x, y) => {
      const A = x.data, B = y.data;
      if (sortBy === "date") return parseDate(B.case_details.date) - parseDate(A.case_details.date);
      if (sortBy === "urgency") return URGENCY_RANK[A.overall_urgency] - URGENCY_RANK[B.overall_urgency];
      if (sortBy === "court") return A.case_details.court.localeCompare(B.case_details.court);
      if (sortBy === "department")
        return (A.case_details.responsible_department || "").localeCompare(B.case_details.responsible_department || "");
      return 0;
    });

  const selected = cases.find((c) => c.id === selectedId);
  const TABS = ["all", "critical", "high", "medium", "low"];

  return (
    <>
      <header className="masthead">
        <div className="masthead-inner">
          <span className="wordmark">Judgment<span className="ai">AI</span></span>
          <span className="masthead-tag">Court judgment → verified action plan</span>
        </div>
      </header>

      <main className="shell">
        {pendingReview ? (
          <ReviewPanel
            draft={pendingReview}
            setDraft={setPendingReview}
            onApprove={approveReview}
            onDiscard={discardReview}
          />
        ) : selected ? (
          <CaseDetail data={selected.data} onBack={() => setSelectedId(null)} />
        ) : (
          <>
            <section className="intake">
              <h1 className="intake-title">Analyze a judgment</h1>
              <p className="intake-help">PDF only. Digital or scanned. (Scanned files are read with OCR.)</p>
              <div className="intake-row">
                <input ref={inputRef} type="file" accept=".pdf" hidden
                  onChange={(e) => setFile(e.target.files[0])} />
                <button className="file-btn" onClick={() => inputRef.current.click()}>Choose PDF</button>
                <span className="file-name">{file ? file.name : "No file selected"}</span>
                <button className="analyze-btn" onClick={handleAnalyze} disabled={loading || !file}>
                  {loading ? "Reading judgment…" : "Analyze judgment"}
                </button>
              </div>
              {error && <p className="notice">{error}</p>}
            </section>

            <section className="library">
              <div className="library-head">
                <h2 className="library-title">Case library <span className="count">{cases.length}</span></h2>
                <div className="sort-wrap">
                  <label htmlFor="sort">Sort by</label>
                  <select id="sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="date">Date</option>
                    <option value="urgency">Urgency</option>
                    <option value="court">Court</option>
                    <option value="department">Department</option>
                  </select>
                </div>
              </div>

              <div className="tabs">
                {TABS.map((t) => (
                  <button key={t} className={`tab ${filter === t ? "active" : ""}`} onClick={() => setFilter(t)}>
                    {t === "all" ? "All" : t}
                    <span className="tab-count">
                      {t === "all" ? cases.length : cases.filter((c) => c.data.overall_urgency === t).length}
                    </span>
                  </button>
                ))}
              </div>

              {cases.length === 0 ? (
                <p className="empty library-empty">No cases yet. Upload a judgment above to get started.</p>
              ) : visible.length === 0 ? (
                <p className="empty library-empty">No cases match this filter.</p>
              ) : (
                <div className="case-list">
                  {visible.map((item) => (
                    <CaseRow key={item.id} item={item} onOpen={setSelectedId} onDelete={deleteCase} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}

export default App;
