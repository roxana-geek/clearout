import { useState, useRef } from "react";

const PLATFORMS = [
  { id: "yad2", label: "Yad2", lang: "he", emoji: "IL", color: "#E8F4FD" },
  { id: "telegram", label: "Telegram RU", lang: "ru", emoji: "RU", color: "#FDF0F0" },
  { id: "facebook", label: "Facebook EN", lang: "en", emoji: "EN", color: "#F0FDF4" },

];
function CopyButton({ text, small }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{
        background: copied ? "#22c55e" : "#1a1a2e",
        color: "#fff", border: "none",
        borderRadius: "8px",
        padding: small ? "5px 10px" : "7px 16px",
        fontSize: small ? "11px" : "12px",
        cursor: "pointer",
        fontFamily: "'DM Mono', monospace",
        letterSpacing: "0.04em",
        transition: "background 0.2s",
        whiteSpace: "nowrap",
      }}
    >{copied ? "✓ Скопировано" : "Копировать"}</button>
  );
}
function ShareButton({ label, emoji, color, text, href }) {
  return (
    <a
      href={href || "#"}
      target="_blank"
      rel="noreferrer"
      onClick={!href ? (e) => { e.preventDefault(); navigator.clipboard.writeText(text); alert("Текст скопирован! Вставь в " + label); } : undefined}
      style={{
        display: "flex", alignItems: "center", gap: "6px",
        background: color, border: "1.5px solid rgba(0,0,0,0.1)",
        borderRadius: "10px", padding: "8px 14px",
        fontSize: "13px", fontFamily: "'DM Sans', sans-serif",
        color: "#1a1a2e", textDecoration: "none",
        cursor: "pointer", flex: 1, justifyContent: "center",
        fontWeight: 500,
      }}
        ><span style={{ fontSize: "16px" }}>{emoji}</span>{label}</a>
  );
}

  function ListingCard({ platform, content, isLoading }) {

  const shareHref = platform.id === "telegram"
    ? `https://t.me/share/url?text=${encodeURIComponent(content || "")}`
    : platform.id === "facebook"
    ? `https://www.facebook.com/marketplace/create/item/`
    : null;
  return (
    <div style={{
      background: platform.color,
      borderRadius: "16px", padding: "18px",
      border: "1.5px solid rgba(0,0,0,0.07)",
      marginBottom: "14px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <span style={{ fontSize: "18px" }}>{platform.emoji}</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, fontSize: "12px", letterSpacing: "0.08em", color: "#1a1a2e", textTransform: "uppercase" }}>
            {platform.label}
          </span>
        </div>
        {content && !isLoading && <CopyButton text={content} small />}
      </div>
      {isLoading ? (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 0" }}>
          <div style={{ width: "16px", height: "16px", border: "2px solid #1a1a2e", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontSize: "13px", color: "#666", fontFamily: "'DM Sans', sans-serif" }}>Генерирую...</span>
        </div>
      ) : content ? (
        <>
          <pre style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
            lineHeight: "1.7", whiteSpace: "pre-wrap", color: "#1a1a2e",
            margin: "0 0 12px", background: "rgba(255,255,255,0.65)",
            borderRadius: "10px", padding: "12px",
          }}>{content}</pre>
          <div style={{ display: "flex", gap: "8px" }}>
            <ShareButton
              label={platform.id === "yad2" ? "Открыть Yad2" : platform.id === "telegram" ? "Поделиться в Telegram" : "Открыть Facebook"}
              emoji={platform.emoji}
              color="rgba(255,255,255,0.7)"
              text={content}
              href={shareHref}
            />
          </div>
        </>
      ) : (
        <div style={{ color: "#bbb", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", padding: "6px 0" }}>Объявление появится здесь</div>
      )}
    </div>
  );
}

export default function App() {
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [price, setPrice] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [listings, setListings] = useState({ yad2: null, telegram: null, facebook: null });
  const [loading, setLoading] = useState({ yad2: false, telegram: false, facebook: false });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [itemSummary, setItemSummary] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef();

  const processFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImage(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = (e) => setImageBase64(e.target.result.split(",")[1]);
    reader.readAsDataURL(file);
    setListings({ yad2: null, telegram: null, facebook: null });
    setItemSummary(null);
    setError(null);
  };  
  
    const callClaude = async (system, userText, imgBase64) => {
    const content = imgBase64
      ? [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: imgBase64 } }, { type: "text", text: userText }]
      : [{ type: "text", text: userText }];

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        system,
        messages: [{ role: "user", content }],
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.content?.[0]?.text || "";
  };
  const generate = async () => {
    if (!imageBase64) return;
    setIsAnalyzing(true);
    setError(null);
    setListings({ yad2: null, telegram: null, facebook: null });
    setItemSummary(null);

    try {
      const raw = await callClaude(
        "Analyze item for resale. Return ONLY valid JSON: {name, category, condition (1-10), keyFeatures (array of 3-5 strings), suggestedPriceILS (number)}. No markdown, no explanation.",
        "What is this item? Condition? Key selling features for Israeli second-hand market?",
        imageBase64
      );

      let item;
      try { item = JSON.parse(raw.replace(/```json|```/g, "").trim()); }
      catch { item = { name: "Товар", condition: 8, keyFeatures: [], suggestedPriceILS: parseInt(price) || 500 }; }

      setItemSummary(item);
      setIsAnalyzing(false);

      const p = price || item.suggestedPriceILS;
      const mp = minPrice || Math.round(p * 0.9);
      const ctx = `Item: ${item.name} | Category: ${item.category} | Condition: ${item.condition}/10 | Features: ${(item.keyFeatures||[]).join(", ")} | Price: ${p}₪ | Min: ${mp}₪ | Notes: ${notes || "Moving to new home"}`;

      setLoading({ yad2: true, telegram: true, facebook: true });

      await Promise.all([
        callClaude("Write a Yad2 Israeli classified ad in Hebrew. Max 10 lines. Format: emoji title, blank line, - bullet features, blank line, price + moving sale if moving. Be concise.", `Write listing for: ${ctx}`, null)
          .then(t => { setListings(p => ({ ...p, yad2: t })); setLoading(p => ({ ...p, yad2: false })); }),

        callClaude("Write a Telegram classified ad in Russian for Israeli Russian-speaking groups. Max 10 lines. Format: CAPS title, blank line, - bullets, blank line, price. Warm and friendly.", `Write listing for: ${ctx}`, null)
          .then(t => { setListings(p => ({ ...p, telegram: t })); setLoading(p => ({ ...p, telegram: false })); }),

        callClaude("Write a Facebook Marketplace listing in English. Max 10 lines. Format: catchy title, blank line, - bullets, blank line, price + 'Pickup only'. Clear and friendly.", `Write listing for: ${ctx}`, null)
          .then(t => { setListings(p => ({ ...p, facebook: t })); setLoading(p => ({ ...p, facebook: false })); }),
      ]);

    } catch (e) {
      setError("Ошибка: " + e.message);
      setIsAnalyzing(false);
      setLoading({ yad2: false, telegram: false, facebook: false });
    }
  };

  const allReady = listings.yad2 && listings.telegram && listings.facebook;
  const isWorking = isAnalyzing || Object.values(loading).some(Boolean);

  const inputStyle = {
    width: "100%", padding: "12px 14px",
    border: "2px solid #e5e2db", borderRadius: "12px",
    fontSize: "16px", fontFamily: "'DM Sans', sans-serif",
    background: "#fff", color: "#1a1a2e",
    transition: "border-color 0.2s", outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f7f5f0", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500;600&family=Playfair+Display:wght@700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        input:focus, textarea:focus { border-color: #f0c040 !important; }
      `}</style>
      <div style={{ background: "#1a1a2e", padding: "24px 20px 20px", borderBottom: "3px solid #f0c040" }}>
        <div style={{ maxWidth: "560px", margin: "0 auto" }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(24px,6vw,34px)", color: "#f7f5f0", margin: 0, fontWeight: 800, letterSpacing: "-0.02em" }}>
            Продай пока спишь
          </h1>
          <p style={{ color: "rgba(247,245,240,0.5)", fontSize: "13px", margin: "6px 0 0", fontWeight: 300 }}>
            Фото → готовые объявления на 3 языках · Yad2 · Telegram · Facebook
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "24px 16px 60px" }}>
        <div
          onClick={() => fileRef.current.click()}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]); }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          style={{
            border: `2.5px dashed ${dragOver ? "#f0c040" : image ? "#22c55e" : "#1a1a2e"}`,
            borderRadius: "20px", background: image ? "#fff" : dragOver ? "#fffbeb" : "#fff",
            cursor: "pointer", transition: "all 0.2s", overflow: "hidden",
            marginBottom: "16px", minHeight: image ? "auto" : "140px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <input ref={fileRef} type="file" accept="image/*" onChange={(e) => processFile(e.target.files[0])} style={{ display: "none" }} />
          {image ? (
            <div style={{ position: "relative", width: "100%" }}>
              <img src={image} alt="item" style={{ width: "100%", maxHeight: "280px", objectFit: "cover", display: "block", borderRadius: "17px" }} />
              <div style={{ position: "absolute", bottom: "10px", right: "10px", background: "rgba(26,26,46,0.85)", color: "#f0c040", borderRadius: "8px", padding: "5px 10px", fontSize: "11px", fontFamily: "'DM Mono', monospace" }}>
                [photo] Нажми чтобы заменить
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "28px 20px" }}>
              <div style={{ fontSize: "36px", marginBottom: "10px" }}>[box]</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "13px", color: "#1a1a2e", fontWeight: 600 }}>
                [photo] Сфотографировать вещь
              </div>
              <div style={{ fontSize: "11px", color: "#999", marginTop: "5px" }}>или выбери из галереи</div>
            </div>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
          {[["Цена (₪)", price, setPrice, "950"], ["Мин. цена (₪)", minPrice, setMinPrice, "870"]].map(([label, val, set, ph]) => (
            <div key={label}>
              <label style={{ display: "block", fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#888", marginBottom: "5px" }}>{label}</label>
              <input type="number" value={val} onChange={e => set(e.target.value)} placeholder={ph} style={inputStyle} />
            </div>
          ))}
        </div>

        <div style={{ marginBottom: "18px" }}>
          <label style={{ display: "block", fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#888", marginBottom: "5px" }}>Заметки (необязательно)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Куплено за 920₪, использовалась мало, переезд..." rows={2}
            style={{ ...inputStyle, resize: "none", fontSize: "14px" }} />
        </div>

        {error && (
          <div style={{ background: "#fee2e2", borderRadius: "10px", padding: "12px 14px", marginBottom: "14px", fontSize: "13px", color: "#dc2626", fontFamily: "'DM Mono', monospace" }}>
            ! {error}
          </div>
        )}
        <button onClick={generate} disabled={!imageBase64 || isWorking}
          style={{
            width: "100%", padding: "15px",
            background: !imageBase64 ? "#ddd" : "#1a1a2e",
            color: !imageBase64 ? "#aaa" : "#f0c040",
            border: "none", borderRadius: "14px",
            fontSize: "14px", fontFamily: "'DM Mono', monospace",
            fontWeight: 600, letterSpacing: "0.08em",
            cursor: !imageBase64 ? "not-allowed" : "pointer",
            marginBottom: "24px", textTransform: "uppercase",
          }}>
          {isAnalyzing ? "... Анализирую фото..." : isWorking ? "... Пишу объявления..." : allReady ? "* Сгенерировать заново" : "* Создать объявления"}
        </button>

        {itemSummary && (
          <div style={{ background: "#1a1a2e", borderRadius: "14px", padding: "14px 18px", marginBottom: "18px", animation: "fadeUp 0.4s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", color: "#f0c040", fontSize: "16px", fontWeight: 700 }}>{itemSummary.name}</div>
                <div style={{ color: "rgba(247,245,240,0.55)", fontSize: "11px", fontFamily: "'DM Mono', monospace", marginTop: "3px" }}>
                  {itemSummary.category} · Состояние {itemSummary.condition}/10
                </div>
              </div>
              <div style={{ background: "#f0c040", color: "#1a1a2e", borderRadius: "8px", padding: "5px 12px", fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: "15px" }}>
                {price || itemSummary.suggestedPriceILS} ₪
              </div>
            </div>
          </div>
        )}
        {(itemSummary || isWorking) && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: "12px" }}>
              Готовые объявления
            </div>
            {PLATFORMS.map(p => (
              <ListingCard key={p.id} platform={p} content={listings[p.id]} isLoading={loading[p.id]} />
            ))}
            {allReady && (
              <CopyButton
                text={PLATFORMS.map(p => `=== ${p.emoji} ${p.label} ===\n${listings[p.id]}`).join("\n\n")}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

