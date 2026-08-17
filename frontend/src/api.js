
import axios from "axios";

// local dev uses localhost; production reads the Render env var
const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export async function analyzePdf(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await axios.post(`${BASE_URL}/analyze`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}