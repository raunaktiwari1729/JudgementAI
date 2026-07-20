

import { useState, useRef } from "react";
import { analyzePdf } from "./api";
import "./App.css";

// traceability block — the signature element
function Citation({ source }) {
  const pct = Math.round((source.confidence ?? 0) * 100);
  return (
    <div className="citation">
      <p className="citation-quote">{source.sentence}</p>
      <div className="citation-foot">
        <span className="pageref">
          {source.page === -1 ? "not in source" : `p.${source.page}`}
        </span>
        <span className="conf">
          <span className="conf-label">confidence</span>
          <span className="meter">
            <span className="meter-fill" style={{ width: `${pct}%` }} />
          </span>
          <span className="conf-val">{source.confidence.toFixed(2)}</span>
        </span>
      </div>
    </div>
  );
}

function Tag({ level }) {
  return <span className={`tag ${level}`}>{level}</span>;
}

function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  async function handleAnalyze() {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      setResult(await analyzePdf(file));
    } catch {
      setError("Couldn't reach the analyzer. Make sure the backend is running, then try again.");
    }
    setLoading(false);
  }

  return (
    <>
      <header className="masthead">
        <div className="masthead-inner">
          <span className="wordmark">Judgment<span className="ai">AI</span></span>
          <span className="masthead-tag">Court judgment → verified action plan</span>
        </div>
      </header>

      <main className="shell">
        <section className="intake">
          <h1 className="intake-title">Upload a judgment</h1>
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

        {result && (
          <div className="dossier">
            <section className="verdict">
              <div className="eyebrow">Assessment</div>
              <div className="verdict-head">
                <h2 className="verdict-title">{result.case_details.title}</h2>
                <Tag level={result.overall_urgency} />
              </div>
              <p className="verdict-summary">{result.summary}</p>
            </section>

            <section className="record">
              <h3 className="record-title">Case details</h3>
              <dl className="kv">
                <dt>Case no.</dt><dd className="mono">{result.case_details.case_number}</dd>
                <dt>Court</dt><dd>{result.case_details.court}</dd>
                <dt>Judges</dt><dd>{result.case_details.judges.join(", ")}</dd>
                <dt>Date</dt><dd className="mono">{result.case_details.date}</dd>
                <dt>Petitioner</dt><dd>{result.case_details.petitioner}</dd>
                <dt>Respondent</dt><dd>{result.case_details.respondent}</dd>
              </dl>
              <Citation source={result.case_details.source} />
            </section>

            <section className="record">
              <h3 className="record-title">Appeal window</h3>
              <dl className="kv">
                <dt>Can appeal</dt><dd>{result.appeal_window.can_appeal ? "Yes" : "No"}</dd>
                <dt>Deadline</dt><dd className="mono">{result.appeal_window.deadline}</dd>
                <dt>Days left</dt><dd className="mono">{result.appeal_window.days_remaining}</dd>
              </dl>
              <Citation source={result.appeal_window.source} />
            </section>

            <section className="record">
              <h3 className="record-title">Directions <span className="count">{result.directions.length}</span></h3>
              {result.directions.length === 0 ? (
                <p className="empty">No directions issued — this judgment doesn't order any party to act.</p>
              ) : result.directions.map((d, i) => (
                <div key={i} className="entry">
                  <p className="entry-text">{d.text}</p>
                  <p className="entry-meta">Deadline: {d.deadline}</p>
                  <Citation source={d.source} />
                </div>
              ))}
            </section>

            <section className="record">
              <h3 className="record-title">Action items <span className="count">{result.action_items.length}</span></h3>
              {result.action_items.length === 0 ? (
                <p className="empty">No action items — nothing here requires follow-up.</p>
              ) : result.action_items.map((a, i) => (
                <div key={i} className="entry">
                  <p className="entry-text">{a.task} &nbsp;<Tag level={a.priority} /></p>
                  <p className="entry-meta">Due: {a.due_date}</p>
                  <Citation source={a.source} />
                </div>
              ))}
            </section>
          </div>
        )}
      </main>
    </>
  );
}

export default App;