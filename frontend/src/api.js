//  talks to the FastAPI backend

import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000";

export async function analyzePdf(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await axios.post(`${BASE_URL}/analyze`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;   // the JudgmentAnalysis JSON
}