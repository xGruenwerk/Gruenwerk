/* ============================================================
   GrünWerk – KI-Backend (Vercel Serverless Function)
   Liegt unter /api/ki  →  erreichbar als  https://DEINE-APP.vercel.app/api/ki
   Versteckt den Anthropic-API-Key (kommt aus der Umgebungsvariable).
   ============================================================ */

export default async function handler(req, res) {
  // nur POST erlauben
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY ist auf Vercel nicht gesetzt." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const text = String(body.text || "").slice(0, 4000);          // Eingabe begrenzen
    const catalog = Array.isArray(body.catalog) ? body.catalog.slice(0, 300) : [];
    if (!text.trim()) {
      res.status(400).json({ error: "Kein Text übergeben." });
      return;
    }

    const prompt =
`Du bist ein Kalkulations-Assistent für ein deutsches Garten- und Landschaftsbau-Unternehmen.

Leistungskatalog mit Netto-Preisen in Euro (JSON):
${JSON.stringify(catalog)}

Der Nutzer beschreibt in Stichpunkten oder Sätzen die auszuführenden Arbeiten:
"""
${text}
"""

Erzeuge daraus Positionen für ein Angebot/eine Rechnung. Regeln:
- Ordne jeden Punkt der am besten passenden Katalog-Leistung zu und übernimm deren Einheit (unit) und Preis (price) EXAKT aus dem Katalog.
- Lies die Menge aus dem Text (z.B. "120 m²" -> qty 120, "3 Bäume" -> qty 3). Ohne erkennbare Menge: qty 1.
- Passt nichts im Katalog, erstelle eine sinnvolle eigene Position mit realistischem deutschen GaLaBau-Marktpreis (Netto, Euro je Einheit) und setze "suggested": true.
- "matched": true wenn aus dem Katalog übernommen, sonst false.
- Einheiten nur: m², lfm, Stk, Std, m³, t, psch.
- "desc": kurze Beschreibung nur wenn sinnvoll, sonst "".

Antworte AUSSCHLIESSLICH mit gültigem JSON, ohne Markdown, ohne Text davor/danach, in diesem Format:
{"positions":[{"name":string,"desc":string,"unit":string,"qty":number,"price":number,"matched":boolean,"suggested":boolean}]}`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      res.status(502).json({ error: "Anthropic-Fehler", detail: detail.slice(0, 500) });
      return;
    }

    const data = await r.json();
    const textOut = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    const clean = textOut.replace(/```json/g, "").replace(/```/g, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      // Falls die KI doch Drumherum schickt: erstes JSON-Objekt herausschneiden
      const m = clean.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { positions: [] };
    }

    res.status(200).json({ positions: Array.isArray(parsed.positions) ? parsed.positions : [] });
  } catch (e) {
    res.status(500).json({ error: "Serverfehler", detail: String(e).slice(0, 300) });
  }
}
