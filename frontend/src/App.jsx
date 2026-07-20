

// import { useState, useRef } from "react";
// import { analyzePdf } from "./api";
// import "./App.css";

// // traceability block — the signature element
// function Citation({ source }) {
//   const pct = Math.round((source.confidence ?? 0) * 100);
//   return (
//     <div className="citation">
//       <p className="citation-quote">{source.sentence}</p>
//       <div className="citation-foot">
//         <span className="pageref">
//           {source.page === -1 ? "not in source" : `p.${source.page}`}
//         </span>
//         <span className="conf">
//           <span className="conf-label">confidence</span>
//           <span className="meter">
//             <span className="meter-fill" style={{ width: `${pct}%` }} />
//           </span>
//           <span className="conf-val">{source.confidence.toFixed(2)}</span>
//         </span>
//       </div>
//     </div>
//   );
// }

// function Tag({ level }) {
//   return <span className={`tag ${level}`}>{level}</span>;
// }

// function App() {
//   const [file, setFile] = useState(null);
//   const [result, setResult] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const inputRef = useRef(null);

//   async function handleAnalyze() {
//     if (!file) return;
//     setLoading(true);
//     setError("");
//     setResult(null);
//     try {
//       setResult(await analyzePdf(file));
//     } catch {
//       setError("Couldn't reach the analyzer. Make sure the backend is running, then try again.");
//     }
//     setLoading(false);
//   }

//   return (
//     <>
//       <header className="masthead">
//         <div className="masthead-inner">
//           <span className="wordmark">Judgment<span className="ai">AI</span></span>
//           <span className="masthead-tag">Court judgment → verified action plan</span>
//         </div>
//       </header>

//       <main className="shell">
//         <section className="intake">
//           <h1 className="intake-title">Upload a judgment</h1>
//           <p className="intake-help">PDF only. Digital or scanned — scanned files are read with OCR.</p>
//           <div className="intake-row">
//             <input ref={inputRef} type="file" accept=".pdf" hidden
//               onChange={(e) => setFile(e.target.files[0])} />
//             <button className="file-btn" onClick={() => inputRef.current.click()}>Choose PDF</button>
//             <span className="file-name">{file ? file.name : "No file selected"}</span>
//             <button className="analyze-btn" onClick={handleAnalyze} disabled={loading || !file}>
//               {loading ? "Reading judgment…" : "Analyze judgment"}
//             </button>
//           </div>
//           {error && <p className="notice">{error}</p>}
//         </section>

//         {result && (
//           <div className="dossier">
//             <section className="verdict">
//               <div className="eyebrow">Assessment</div>
//               <div className="verdict-head">
//                 <h2 className="verdict-title">{result.case_details.title}</h2>
//                 <Tag level={result.overall_urgency} />
//               </div>
//               <p className="verdict-summary">{result.summary}</p>
//             </section>

//             <section className="record">
//               <h3 className="record-title">Case details</h3>
//               <dl className="kv">
//                 <dt>Case no.</dt><dd className="mono">{result.case_details.case_number}</dd>
//                 <dt>Court</dt><dd>{result.case_details.court}</dd>
//                 <dt>Judges</dt><dd>{result.case_details.judges.join(", ")}</dd>
//                 <dt>Date</dt><dd className="mono">{result.case_details.date}</dd>
//                 <dt>Petitioner</dt><dd>{result.case_details.petitioner}</dd>
//                 <dt>Respondent</dt><dd>{result.case_details.respondent}</dd>
//               </dl>
//               <Citation source={result.case_details.source} />
//             </section>

//             <section className="record">
//               <h3 className="record-title">Appeal window</h3>
//               <dl className="kv">
//                 <dt>Can appeal</dt><dd>{result.appeal_window.can_appeal ? "Yes" : "No"}</dd>
//                 <dt>Deadline</dt><dd className="mono">{result.appeal_window.deadline}</dd>
//                 <dt>Days left</dt><dd className="mono">{result.appeal_window.days_remaining}</dd>
//               </dl>
//               <Citation source={result.appeal_window.source} />
//             </section>

//             <section className="record">
//               <h3 className="record-title">Directions <span className="count">{result.directions.length}</span></h3>
//               {result.directions.length === 0 ? (
//                 <p className="empty">No directions issued — this judgment doesn't order any party to act.</p>
//               ) : result.directions.map((d, i) => (
//                 <div key={i} className="entry">
//                   <p className="entry-text">{d.text}</p>
//                   <p className="entry-meta">Deadline: {d.deadline}</p>
//                   <Citation source={d.source} />
//                 </div>
//               ))}
//             </section>

//             <section className="record">
//               <h3 className="record-title">Action items <span className="count">{result.action_items.length}</span></h3>
//               {result.action_items.length === 0 ? (
//                 <p className="empty">No action items — nothing here requires follow-up.</p>
//               ) : result.action_items.map((a, i) => (
//                 <div key={i} className="entry">
//                   <p className="entry-text">{a.task} &nbsp;<Tag level={a.priority} /></p>
//                   <p className="entry-meta">Due: {a.due_date}</p>
//                   <Citation source={a.source} />
//                 </div>
//               ))}
//             </section>
//           </div>
//         )}
//       </main>
//     </>
//   );
// }

// export default App;

// App.jsx — case library: analyze, store, sort, filter, view

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

function App() {
  const [cases, setCases] = useState(loadCases);
  const [selectedId, setSelectedId] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const inputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
  }, [cases]);

  async function handleAnalyze() {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const data = await analyzePdf(file);
      const item = { id: Date.now().toString(), addedAt: Date.now(), data };
      setCases((prev) => [item, ...prev]);
      setFile(null);
      setSelectedId(item.id); // jump straight into the new case
    } catch {
      setError("Couldn't reach the analyzer. The backend may be waking up — wait a moment and try again.");
    }
    setLoading(false);
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
        {selected ? (
          <CaseDetail data={selected.data} onBack={() => setSelectedId(null)} />
        ) : (
          <>
            <section className="intake">
              <h1 className="intake-title">Analyze a judgment</h1>
              <p className="intake-help">PDF only. Digital or scanned — scanned files are read with OCR.</p>
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