

import { useState } from "react";
import { analyzePdf } from "./api";
import "./App.css";

function Source({ source }) {
  return (
    <div className="source">
      "{source.sentence}" — page {source.page} · confidence {source.confidence}
    </div>
  );
}

function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAnalyze() {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await analyzePdf(file);
      setResult(data);
    } catch (err) {
      setError("Analysis failed. Is the backend running?");
    }
    setLoading(false);
  }

  return (
    <div className="container">
      <h1>JudgmentAI</h1>
      <p className="subtitle">Upload an Indian court judgment → get a structured action plan.</p>

      {/* upload area */}
      <div className="upload-box">
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <br />
        <button onClick={handleAnalyze} disabled={loading || !file}>
          {loading ? "Analyzing..." : "Analyze"}
        </button>
        {error && <p className="error">{error}</p>}
      </div>

      {/* results */}
      {result && (
        <>
          {/* overall urgency */}
          <div className="card">
            <h2>
              Overall Urgency:{" "}
              <span className={`badge ${result.overall_urgency}`}>
                {result.overall_urgency}
              </span>
            </h2>
            <p>{result.summary}</p>
          </div>

          {/* case details */}
          <div className="card">
            <h2>Case Details</h2>
            <div className="field"><span className="label">Title: </span>{result.case_details.title}</div>
            <div className="field"><span className="label">Case No: </span>{result.case_details.case_number}</div>
            <div className="field"><span className="label">Court: </span>{result.case_details.court}</div>
            <div className="field"><span className="label">Judges: </span>{result.case_details.judges.join(", ")}</div>
            <div className="field"><span className="label">Date: </span>{result.case_details.date}</div>
            <div className="field"><span className="label">Petitioner: </span>{result.case_details.petitioner}</div>
            <div className="field"><span className="label">Respondent: </span>{result.case_details.respondent}</div>
            <Source source={result.case_details.source} />
          </div>

          {/* appeal window */}
          <div className="card">
            <h2>Appeal Window</h2>
            <div className="field"><span className="label">Can appeal: </span>{result.appeal_window.can_appeal ? "Yes" : "No"}</div>
            <div className="field"><span className="label">Deadline: </span>{result.appeal_window.deadline}</div>
            <div className="field"><span className="label">Days remaining: </span>{result.appeal_window.days_remaining}</div>
            <Source source={result.appeal_window.source} />
          </div>

          {/* directions */}
          <div className="card">
            <h2>Directions ({result.directions.length})</h2>
            {result.directions.length === 0 && <p>No specific court directions found.</p>}
            {result.directions.map((d, i) => (
              <div key={i} className="field">
                • {d.text} <span className="label">(deadline: {d.deadline})</span>
                <Source source={d.source} />
              </div>
            ))}
          </div>

          {/* action items */}
          <div className="card">
            <h2>Action Items ({result.action_items.length})</h2>
            {result.action_items.length === 0 && <p>No action items found.</p>}
            {result.action_items.map((a, i) => (
              <div key={i} className="field">
                • {a.task}{" "}
                <span className={`badge ${a.priority}`}>{a.priority}</span>{" "}
                <span className="label">(due: {a.due_date})</span>
                <Source source={a.source} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default App;