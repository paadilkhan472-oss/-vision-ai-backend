import express from "express";

const app = express();
app.use(express.json({ limit: "30kb" }));

const PORT = process.env.PORT || 3000;
const ACCESS_KEY = process.env.VISION_ACCESS_KEY;
const MODEL_API_KEY = process.env.MODEL_API_KEY;
const MODEL_BASE_URL = (process.env.MODEL_BASE_URL || "https://openrouter.ai/api/v1").replace(/\\/$/, "");
const MODEL_NAME = process.env.MODEL_NAME || "openai/gpt-4o-mini";

app.get("/", (_req, res) => res.json({ ok: true, service: "VISION AI backend" }));
app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/chat", async (req, res) => {
  if (!ACCESS_KEY || !MODEL_API_KEY) {
    return res.status(500).json({ error: "Backend secrets are not configured." });
  }
  const key = req.header("Authorization")?.replace(/^Bearer\\s+/i, "");
  if (key !== ACCESS_KEY) return res.status(401).json({ error: "Invalid access key." });

  const message = req.body?.message;
  if (typeof message !== "string" || !message.trim() || message.length > 8000) {
    return res.status(400).json({ error: "message must be a non-empty string (max 8000 characters)." });
  }

  try {
    const upstream = await fetch(`${MODEL_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MODEL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: "system", content: "Reply helpfully in Hindi unless the user asks otherwise." },
          { role: "user", content: message.trim() }
        ]
      })
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return res.status(upstream.status).json({ error: data?.error?.message || "AI provider request failed." });
    return res.json({ reply: data?.choices?.[0]?.message?.content || "कोई जवाब प्राप्त नहीं हुआ।" });
  } catch (_err) {
    return res.status(502).json({ error: "AI provider connection failed." });
  }
});

app.listen(PORT, "0.0.0.0", () => console.log(`VISION backend listening on ${PORT}`));
