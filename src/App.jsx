import { useState, useRef, useEffect, useCallback } from "react";

// ── Palette & global styles injected once ────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --ink:    #0d0d0d;
  --paper:  #f5f0e8;
  --cream:  #ede7d3;
  --warm:   #c8a96e;
  --accent: #b85c38;
  --muted:  #8a7e6e;
  --dark:   #1a1410;
  --card:   #faf7f1;
  --shadow: 0 4px 32px rgba(13,13,13,.12);
}

html, body { height: 100%; }
body {
  background: var(--paper);
  color: var(--ink);
  font-family: 'DM Sans', sans-serif;
  font-size: 15px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

/* ── scrollbar ── */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--cream); }
::-webkit-scrollbar-thumb { background: var(--warm); border-radius: 3px; }

/* ── noise texture overlay ── */
body::before {
  content: '';
  position: fixed; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 9999;
}

/* ── animations ── */
@keyframes fadeUp   { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
@keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
@keyframes spin     { to { transform: rotate(360deg) } }
@keyframes pulse    { 0%,100% { transform:scale(1) } 50% { transform:scale(1.04) } }
@keyframes wave     { 0%,100% { height:8px  } 50% { height:28px } }
@keyframes shimmer  { from { background-position: -200% 0 } to { background-position: 200% 0 } }
@keyframes pageTurn { 0% { transform: perspective(1200px) rotateY(0deg) } 100% { transform: perspective(1200px) rotateY(-20deg) } }
@keyframes bookFloat { 0%,100% { transform: translateY(0) rotate(-1deg) } 50% { transform: translateY(-8px) rotate(1deg) } }

.fade-up  { animation: fadeUp  .5s ease both }
.fade-in  { animation: fadeIn  .4s ease both }

button { cursor: pointer; border: none; outline: none; }
input  { outline: none; }
`;

// ── helper: inject CSS once ──────────────────────────────────────────────────
function useGlobalCss(css) {
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = css;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);
}

// ── Anthropic API call ───────────────────────────────────────────────────────
async function callClaude(messages, systemPrompt = "") {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing API key. Please set VITE_ANTHROPIC_API_KEY in your .env file");
  }
  
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API error ${res.status}: ${errorText}`);
  }
  const data = await res.json();
  return data.content.map(b => b.text || "").join("");
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INDIAN STORYTELLER VOICE ENGINE
//  Energised, enthusiastic, human-like with natural breathing rhythm
// ═══════════════════════════════════════════════════════════════════════════════

function pickIndianVoice(voices) {
  const priority = [
    "Lekha", "Rishi", "Veena", "Neel",
    "Google हिन्दी", "Google हिंदी",
    "Google UK English Female",
    "Google UK English Male",
    "Samantha", "Google US English",
  ];
  for (const name of priority) {
    const v = voices.find(v => v.name === name);
    if (v) return v;
  }
  return voices.find(v => v.lang === "en-IN")
      || voices.find(v => v.lang.startsWith("en"))
      || null;
}

function prepareStoryteller(raw) {
  return raw
    .replace(/[#*_`~>]/g, "")
    .replace(/\n\n+/g, "  ...  ")
    .replace(/\n/g, ", ")
    .replace(/—/g, "... ")
    .replace(/!( )/g, "! ... $1")
    .replace(/\?( )/g, "? ... $1")
    .replace(/:( )/g, "... $1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function chunkText(text, maxLen = 180) {
  const sentences = text.match(/[^.!?…]+[.!?…]*/g) || [text];
  const out = [];
  let buf = "";
  for (const s of sentences) {
    if ((buf + s).length > maxLen) {
      if (buf.trim()) out.push(buf.trim());
      buf = s;
    } else {
      buf += " " + s;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

const MOOD_PROFILES = {
  energised: { rate: 0.91, pitch: 1.12, label: "⚡ Energised", hint: "Passionate & alive"    },
  storytell: { rate: 0.84, pitch: 1.04, label: "🎙 Storyteller", hint: "Warm Indian cadence" },
  dramatic:  { rate: 0.78, pitch: 0.96, label: "🌋 Dramatic",  hint: "Intense & gripping"    },
};

function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [paused,   setPaused]   = useState(false);
  const [voices,   setVoices]   = useState([]);
  const uttRef    = useRef(null);
  const activeRef = useRef(true);

  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  const speak = useCallback((rawText, mood = "storytell", onEnd) => {
    window.speechSynthesis.cancel();
    activeRef.current = true;

    const text    = prepareStoryteller(rawText);
    const chunks  = chunkText(text);
    const profile = MOOD_PROFILES[mood] || MOOD_PROFILES.storytell;
    const voice   = pickIndianVoice(voices.length ? voices : window.speechSynthesis.getVoices());

    const speakOne = (idx) => {
      if (!activeRef.current || idx >= chunks.length) {
        if (activeRef.current) { setSpeaking(false); setPaused(false); onEnd?.(); }
        return;
      }
      const isBreath = chunks[idx].endsWith("...") || chunks[idx].endsWith("… ");
      const breathMs = isBreath ? 540 : 85;

      const utt = new SpeechSynthesisUtterance(chunks[idx]);
      // Micro-variation makes it feel human — never perfectly robotic
      utt.rate   = profile.rate  + (Math.random() * 0.04 - 0.02);
      utt.pitch  = profile.pitch + (Math.random() * 0.06 - 0.03);
      utt.volume = 1.0;
      if (voice) utt.voice = voice;

      utt.onstart = () => { setSpeaking(true); setPaused(false); };
      utt.onend   = () => { setTimeout(() => speakOne(idx + 1), breathMs); };
      utt.onerror = (e) => {
        if (e.error === "interrupted" || e.error === "canceled") return;
        setSpeaking(false); setPaused(false);
      };
      uttRef.current = utt;
      window.speechSynthesis.speak(utt);
    };

    setSpeaking(true);
    setTimeout(() => speakOne(0), 480);
  }, [voices]);

  const pause  = useCallback(() => { window.speechSynthesis.pause();  setPaused(true);  }, []);
  const resume = useCallback(() => { window.speechSynthesis.resume(); setPaused(false); }, []);
  const stop   = useCallback(() => {
    activeRef.current = false;
    window.speechSynthesis.cancel();
    setSpeaking(false); setPaused(false);
  }, []);

  return { speaking, paused, speak, pause, resume, stop, MOOD_PROFILES };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SCREEN 1 — Auth
// ═══════════════════════════════════════════════════════════════════════════════
function AuthScreen({ onLogin }) {
  const [mode,  setMode]  = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [pass,  setPass]  = useState("");
  const [name,  setName]  = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    setError("");
    if (!email || !pass || (mode === "signup" && !name)) {
      setError("Please fill in all fields."); return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin({ name: name || email.split("@")[0], email, avatar: null });
    }, 900);
  };

  const handleGoogle = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin({ name: "Reader", email: "reader@gmail.com", avatar: "G", google: true });
    }, 1000);
  };

  return (
    <div style={S.authWrap}>
      {/* left panel */}
      <div style={S.authLeft}>
        <div style={S.authLeftInner}>
          <div style={S.bookIcon}>📚</div>
          <h1 style={S.authBrand}>Lector</h1>
          <p style={S.authTagline}>Your AI-powered book narrator.<br/>Upload any PDF, hear it come alive.</p>
          <div style={S.featureList}>
            {["✦  Upload any PDF book","✦  AI generates rich summaries","✦  Beautiful voice narration","✦  Chapter-by-chapter breakdown"].map(f => (
              <div key={f} style={S.featureItem}>{f}</div>
            ))}
          </div>
        </div>
      </div>

      {/* right panel */}
      <div style={S.authRight}>
        <div style={S.authCard} className="fade-up">
          <div style={S.authTabs}>
            {["login","signup"].map(m => (
              <button key={m} style={{...S.authTab, ...(mode===m ? S.authTabActive : {})}}
                onClick={() => { setMode(m); setError(""); }}>
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {mode === "signup" && (
            <input style={S.input} placeholder="Full name"
              value={name} onChange={e => setName(e.target.value)} />
          )}
          <input style={S.input} placeholder="Email address" type="email"
            value={email} onChange={e => setEmail(e.target.value)} />
          <input style={S.input} placeholder="Password" type="password"
            value={pass} onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()} />

          {error && <p style={S.errorMsg}>{error}</p>}

          <button style={S.btnPrimary} onClick={handleSubmit} disabled={loading}>
            {loading ? <Spinner /> : (mode === "login" ? "Sign In" : "Create Account")}
          </button>

          <div style={S.divider}><span>or</span></div>

          <button style={S.btnGoogle} onClick={handleGoogle} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 48 48" style={{marginRight:10}}>
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6.1C12.5 13.2 17.8 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.2-.4-4.7H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.3z"/>
              <path fill="#FBBC05" d="M10.5 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.7-4.6l-7.8-6.1A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.2z"/>
              <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.2 0-11.5-4.2-13.4-9.9l-7.9 6.2C6.6 42.6 14.6 48 24 48z"/>
            </svg>
            Continue with Google
          </button>

          <p style={S.authSwitch}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <span style={S.authLink} onClick={() => { setMode(mode==="login"?"signup":"login"); setError(""); }}>
              {mode === "login" ? "Sign up" : "Sign in"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SCREEN 2 — Dashboard / Upload
// ═══════════════════════════════════════════════════════════════════════════════
function Dashboard({ user, onLogout, onBookReady }) {
  const [dragging, setDragging] = useState(false);
  const [file,     setFile]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [progress, setProgress] = useState("");
  const fileRef = useRef();

  const handleFile = async (f) => {
    if (!f || f.type !== "application/pdf") {
      alert("Please upload a PDF file."); return;
    }
    setFile(f);
    setLoading(true);
    setProgress("Reading your PDF…");

    try {
      // Extract text using PDF.js via CDN
      const arrayBuffer = await f.arrayBuffer();
      setProgress("Extracting text content…");

      let extractedText = "";
      try {
        // Load PDF.js dynamically
        if (!window.pdfjsLib) {
          setProgress("Loading PDF reader…");
          await new Promise((res, rej) => {
            const s = document.createElement("script");
            s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            s.onload = res; 
            s.onerror = () => rej(new Error("Failed to load PDF.js library"));
            document.head.appendChild(s);
          });
          
          // Wait for pdfjsLib to be available
          let attempts = 0;
          while (!window.pdfjsLib && attempts < 50) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
          }
          
          if (!window.pdfjsLib) {
            throw new Error("PDF.js library not loaded");
          }
          
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }
        
        setProgress("Loading PDF document…");
        const pdfDoc = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const maxPages = Math.min(pdfDoc.numPages, 30);
        
        for (let i = 1; i <= maxPages; i++) {
          setProgress(`Reading page ${i} of ${maxPages}…`);
          const page = await pdfDoc.getPage(i);
          const content = await page.getTextContent();
          extractedText += content.items.map(it => it.str).join(" ") + "\n";
        }
        
        if (!extractedText.trim()) {
          throw new Error("No text could be extracted from PDF");
        }
      } catch (pdfError) {
        console.error("PDF extraction error:", pdfError);
        extractedText = `[PDF title: ${f.name.replace(".pdf","")}] This appears to be a book or document. Note: Text extraction failed - ${pdfError.message}`;
      }

      setProgress("Analysing with AI…");

      const trimmed = extractedText.slice(0, 8000);
      const bookTitle = f.name.replace(".pdf","").replace(/_/g," ");

      const systemPrompt = `You are an ENERGISED Indian storyteller narrator — imagine a brilliant author from Mumbai who has read ten thousand books and cannot WAIT to tell you about this one. You narrate with infectious enthusiasm, warmth, and the rich musical cadence of Indian English storytelling.

YOUR RULES:
1. Open with a BANG — a surprising fact, a vivid scene, or a provocative question that grabs instantly
2. Build MOMENTUM — each sentence makes the listener lean forward wanting more
3. Use the rhythm of Indian English — slightly musical, rising warmth on key revelations
4. Sprinkle genuine WONDER — "And here is what is truly extraordinary...", "Can you imagine?", "This is where everything changes..."
5. SHORT punchy sentences for impact. Then longer flowing ones for atmosphere. Vary constantly.
6. Use "..." for dramatic breath pauses — the narrator pausing for effect
7. Make themes feel like REVELATIONS, not textbook points
8. End every paragraph with a hook that makes you desperate to hear the next one
9. Be PRECISE — no fluff, no filler, every single word earns its place
10. Write as LIVE SPOKEN WORD — contractions, natural energy, the pulse of a live performance

FORBIDDEN: dry summaries, passive voice, "this book is about", academic tone, generic phrases

Respond ONLY in raw JSON — no preamble, no markdown fences, nothing else:
{
  "title": "...",
  "author": "...(from text, else Unknown)",
  "genre": "...(creative — e.g. Psychological Thriller, Epic Philosophy, Human Drama)",
  "tagline": "One electric sentence that makes someone absolutely need to read this book",
  "narrativeSummary": "5 to 6 paragraphs of ELECTRIC narration written for an enthusiastic Indian storyteller voice. Each paragraph separated by \\n\\n. Open with a hook. Build tension. Reveal the beating heart of the book. Close with an irresistible invitation. Make every word sing.",
  "themes": ["Each theme as a vivid insight not just a label — e.g. The terrifying cost of unchecked ambition"],
  "chapters": [{"title":"...","summary":"2 energised sentences — what happens and exactly why it matters"}],
  "totalPages": null
}`;

      let aiText;
      try {
        aiText = await callClaude([
          { role: "user", content: `Book filename: "${bookTitle}"\n\nExtracted text (first portion):\n${trimmed}\n\nAnalyse this book and respond with the JSON structure.` }
        ], systemPrompt);
      } catch (apiError) {
        console.error("API call error:", apiError);
        setLoading(false);
        setProgress("");
        alert(`Failed to analyze PDF with AI: ${apiError.message}\n\nPlease check:\n1. Your API key is set in .env file\n2. You have internet connection\n3. Your API key is valid`);
        return;
      }

      let bookData;
      try {
        const clean = aiText.replace(/```json|```/g, "").trim();
        bookData = JSON.parse(clean);
      } catch {
        bookData = {
          title: bookTitle,
          author: "Unknown",
          genre: "Unknown",
          tagline: "An AI-analysed literary work.",
          narrativeSummary: aiText,
          themes: [],
          chapters: [],
          totalPages: null,
        };
      }

      setLoading(false);
      onBookReady({ ...bookData, fileName: f.name, fileSize: f.size });
    } catch (err) {
      setLoading(false);
      setProgress("");
      alert("Error analysing PDF: " + err.message);
    }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div style={S.dashWrap}>
      <header style={S.header}>
        <div style={S.headerLogo}>📚 Lector</div>
        <div style={S.headerUser}>
          <div style={S.avatar}>{user.avatar || user.name[0].toUpperCase()}</div>
          <span style={S.userName}>{user.name}</span>
          <button style={S.btnLogout} onClick={onLogout}>Sign out</button>
        </div>
      </header>

      <main style={S.dashMain}>
        <div className="fade-up" style={{textAlign:"center",marginBottom:48}}>
          <h2 style={S.dashTitle}>Upload your book</h2>
          <p style={S.dashSub}>Drop any PDF and Lector will summarise and narrate it for you</p>
        </div>

        {loading ? (
          <div style={S.loadingBox} className="fade-in">
            <div style={S.loadingBook}>📖</div>
            <div style={S.loadingSpinner} />
            <p style={S.loadingText}>{progress}</p>
            <p style={{color:"var(--muted)",fontSize:13,marginTop:8}}>This may take a moment…</p>
          </div>
        ) : (
          <div
            style={{...S.dropZone, ...(dragging ? S.dropZoneActive : {})}}
            className="fade-up"
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current.click()}
          >
            <input ref={fileRef} type="file" accept=".pdf" style={{display:"none"}}
              onChange={e => handleFile(e.target.files[0])} />
            <div style={S.dropIcon}>
              {dragging ? "📂" : "📄"}
            </div>
            <p style={S.dropTitle}>{dragging ? "Release to upload" : "Drop your PDF here"}</p>
            <p style={S.dropSub}>or click to browse · PDF files only</p>
            <button style={S.btnUpload}>Choose File</button>
          </div>
        )}

        <div style={S.tipsRow} className="fade-up">
          {["Novel","Textbook","Biography","Essay","Manual","Research Paper"].map(t => (
            <span key={t} style={S.tipTag}>{t}</span>
          ))}
        </div>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SCREEN 3 — Narrator Player
// ═══════════════════════════════════════════════════════════════════════════════
function NarratorScreen({ book, user, onBack }) {
  const { speaking, paused, speak, pause, resume, stop, MOOD_PROFILES } = useSpeech();
  const [activeChapter, setActiveChapter] = useState(-1); // -1 = full summary
  const [played,        setPlayed]        = useState(false);
  const [currentText,   setCurrentText]   = useState("");
  const [tab,           setTab]           = useState("summary"); // summary | chapters | themes
  const [mood, setMood] = useState("storytell"); // energised | storytell | dramatic
  const moodSettings = MOOD_PROFILES;

  const fullText = `Namaste, and welcome! ... Get ready, because this story is something else. ... ${book.title}. ... Written by ${book.author}. ... ${book.tagline} ... ${book.narrativeSummary}`;

  const playText = (text, label) => {
    setCurrentText(label);
    setPlayed(true);
    speak(text, mood, () => setCurrentText(""));
  };

  const handlePlayPause = () => {
    if (!played || (!speaking && !paused)) {
      playText(fullText, "Full Summary");
    } else if (paused) {
      resume();
    } else {
      pause();
    }
  };

  const chapterPlay = (ch, i) => {
    setActiveChapter(i);
    playText(`Chapter ${i+1}. ... ${ch.title}. ... ${ch.summary}`, ch.title);
  };

  return (
    <div style={S.narratorWrap}>
      <header style={S.header}>
        <button style={S.btnBack} onClick={() => { stop(); onBack(); }}>← Back</button>
        <div style={S.headerLogo}>📚 Lector</div>
        <div style={S.headerUser}>
          <div style={S.avatar}>{user.name[0].toUpperCase()}</div>
        </div>
      </header>

      <div style={S.narratorBody}>
        {/* Book Card */}
        <div style={S.bookCard} className="fade-up">
          <div style={S.bookCover}>
            <div style={S.bookSpine} />
            <div style={S.bookFront}>
              <div style={S.bookEmoji}>📖</div>
              <div style={S.bookCoverTitle}>{book.title}</div>
              <div style={S.bookCoverAuthor}>{book.author}</div>
            </div>
          </div>

          <div style={S.bookInfo}>
            <div style={S.genreTag}>{book.genre}</div>
            <h1 style={S.bookTitle}>{book.title}</h1>
            <p style={S.bookAuthorLine}>by {book.author}</p>
            <p style={S.bookTagline}>"{book.tagline}"</p>

            {/* Player */}
            <div style={S.player}>
              {/* Waveform */}
              <div style={S.waveform}>
                {Array.from({length: 32}).map((_,i) => (
                  <div key={i} style={{
                    ...S.waveBar,
                    animationName: speaking && !paused ? "wave" : "none",
                    animationDuration: `${0.35 + (i % 5) * 0.09}s`,
                    animationDelay: `${i * 0.04}s`,
                    animationTimingFunction: "ease-in-out",
                    animationIterationCount: "infinite",
                  }} />
                ))}
              </div>

              {currentText && (
                <div style={S.nowPlaying} className="fade-in">
                  🔊 &nbsp;<em>{currentText}</em>
                </div>
              )}

              {/* Mood selector */}
              <div style={S.moodRow}>
                {Object.entries(moodSettings).map(([key, m]) => (
                  <button key={key}
                    style={{...S.moodBtn, ...(mood===key ? S.moodBtnActive : {})}}
                    onClick={() => setMood(key)}
                    title={m.hint}
                  >{m.label}</button>
                ))}
              </div>

              <div style={S.controls}>
                <button style={S.btnStop} onClick={stop} title="Stop">⏹</button>
                <button style={S.btnPlay} onClick={handlePlayPause}>
                  {speaking && !paused ? "⏸" : "▶"}
                </button>
                <button style={S.btnStop} onClick={() => playText(fullText,"Full Summary")} title="Restart">↺</button>
              </div>

              <p style={S.playerHint}>
                {speaking && !paused
                  ? `🎙 ${moodSettings[mood] ? moodSettings[mood].hint : "Narrating"}…`
                  : paused ? "⏸ Paused — press ▶ to continue the story"
                  : "Press ▶ and let the story begin!"}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={S.tabs} className="fade-up">
          {["summary","chapters","themes"].map(t => (
            <button key={t} style={{...S.tabBtn, ...(tab===t ? S.tabBtnActive : {})}}
              onClick={() => setTab(t)}>
              {t === "summary" ? "📝 Summary" : t === "chapters" ? "📑 Chapters" : "🏷 Themes"}
            </button>
          ))}
        </div>

        {tab === "summary" && (
          <div style={S.summaryBox} className="fade-in">
            {book.narrativeSummary.split("\n\n").map((para, i) => (
              <p key={i} style={S.summaryPara}>{para}</p>
            ))}
          </div>
        )}

        {tab === "chapters" && (
          <div style={S.chapterList} className="fade-in">
            {book.chapters && book.chapters.length > 0 ? book.chapters.map((ch, i) => (
              <div key={i} style={{...S.chapterCard, ...(activeChapter===i ? S.chapterCardActive : {})}}>
                <div style={S.chapterHeader}>
                  <span style={S.chapterNum}>Ch. {i+1}</span>
                  <span style={S.chapterTitle}>{ch.title}</span>
                  <button style={S.btnChPlay} onClick={() => chapterPlay(ch, i)}>
                    {speaking && activeChapter===i ? "⏸" : "▶"}
                  </button>
                </div>
                <p style={S.chapterSummary}>{ch.summary}</p>
              </div>
            )) : (
              <div style={S.emptyState}>
                <p>No chapters detected — the AI provided a unified summary instead.</p>
                <button style={S.btnPrimary} onClick={() => setTab("summary")}>Read Summary →</button>
              </div>
            )}
          </div>
        )}

        {tab === "themes" && (
          <div style={S.themeGrid} className="fade-in">
            {book.themes && book.themes.length > 0 ? book.themes.map((th, i) => (
              <div key={i} style={S.themeCard}>
                <div style={S.themeNum}>{String(i+1).padStart(2,"0")}</div>
                <div style={S.themeText}>{th}</div>
              </div>
            )) : <p style={{color:"var(--muted)"}}>No themes extracted.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tiny spinner ──────────────────────────────────────────────────────────────
function Spinner() {
  return <div style={{width:18,height:18,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite",display:"inline-block"}} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  useGlobalCss(GLOBAL_CSS);
  const [user, setUser] = useState(null);
  const [book, setBook] = useState(null);

  if (!user)  return <AuthScreen   onLogin={u => setUser(u)} />;
  if (!book)  return <Dashboard    user={user} onLogout={() => setUser(null)} onBookReady={b => setBook(b)} />;
  return              <NarratorScreen user={user} book={book} onBack={() => setBook(null)} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const S = {
  // ── Auth ──
  authWrap: {
    display:"flex", minHeight:"100vh",
  },
  authLeft: {
    flex:"0 0 42%", background:"var(--dark)", display:"flex",
    alignItems:"center", justifyContent:"center", padding:48,
    position:"relative", overflow:"hidden",
  },
  authLeftInner: {
    position:"relative", zIndex:1, color:"var(--paper)",
  },
  bookIcon: {
    fontSize:56, marginBottom:16, display:"block",
    animation:"bookFloat 3s ease-in-out infinite",
  },
  authBrand: {
    fontFamily:"'Playfair Display', serif", fontSize:52,
    fontWeight:700, letterSpacing:"-1px", color:"var(--warm)",
    marginBottom:12,
  },
  authTagline: {
    fontSize:16, lineHeight:1.7, color:"#b0a898", marginBottom:36,
    fontStyle:"italic",
  },
  featureList: { display:"flex", flexDirection:"column", gap:12 },
  featureItem: { fontSize:14, color:"#8a7e6e", letterSpacing:.3 },

  authRight: {
    flex:1, display:"flex", alignItems:"center", justifyContent:"center",
    padding:48, background:"var(--paper)",
  },
  authCard: {
    width:"100%", maxWidth:400,
  },
  authTabs: {
    display:"flex", gap:4, marginBottom:28,
    borderBottom:"2px solid var(--cream)", paddingBottom:0,
  },
  authTab: {
    flex:1, padding:"10px 0", background:"none", color:"var(--muted)",
    fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:500,
    borderBottom:"2px solid transparent", marginBottom:-2, transition:"all .2s",
  },
  authTabActive: {
    color:"var(--accent)", borderBottomColor:"var(--accent)",
  },
  input: {
    width:"100%", padding:"13px 16px", marginBottom:12,
    background:"var(--card)", border:"1.5px solid var(--cream)",
    borderRadius:8, fontSize:14, color:"var(--ink)",
    fontFamily:"'DM Sans',sans-serif", transition:"border .2s",
  },
  errorMsg: { color:"var(--accent)", fontSize:13, marginBottom:10 },
  btnPrimary: {
    width:"100%", padding:"13px 0", background:"var(--accent)",
    color:"#fff", borderRadius:8, fontSize:14, fontWeight:500,
    fontFamily:"'DM Sans',sans-serif", transition:"opacity .2s",
    marginBottom:16,
  },
  divider: {
    textAlign:"center", color:"var(--muted)", fontSize:13,
    margin:"4px 0 16px", position:"relative",
    display:"flex", alignItems:"center", gap:12,
    "::before": { content:'""' },
  },
  btnGoogle: {
    width:"100%", padding:"13px 0", background:"var(--card)",
    border:"1.5px solid var(--cream)", borderRadius:8,
    display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:14, color:"var(--ink)", fontFamily:"'DM Sans',sans-serif",
    transition:"background .2s", marginBottom:20,
  },
  authSwitch: { textAlign:"center", color:"var(--muted)", fontSize:13 },
  authLink: { color:"var(--accent)", cursor:"pointer", fontWeight:500 },

  // ── Dashboard ──
  dashWrap: { minHeight:"100vh", background:"var(--paper)" },
  header: {
    display:"flex", alignItems:"center", justifyContent:"space-between",
    padding:"16px 32px", borderBottom:"1px solid var(--cream)",
    background:"var(--card)", position:"sticky", top:0, zIndex:100,
  },
  headerLogo: {
    fontFamily:"'Playfair Display',serif", fontSize:22,
    color:"var(--accent)", fontWeight:700,
  },
  headerUser: { display:"flex", alignItems:"center", gap:12 },
  avatar: {
    width:36, height:36, borderRadius:"50%", background:"var(--warm)",
    display:"flex", alignItems:"center", justifyContent:"center",
    color:"#fff", fontWeight:700, fontSize:15,
  },
  userName: { fontSize:14, color:"var(--ink)", fontWeight:500 },
  btnLogout: {
    padding:"6px 14px", background:"none", border:"1.5px solid var(--cream)",
    borderRadius:6, fontSize:13, color:"var(--muted)",
    fontFamily:"'DM Sans',sans-serif", transition:"all .2s",
  },
  dashMain: {
    maxWidth:640, margin:"0 auto", padding:"64px 24px",
  },
  dashTitle: {
    fontFamily:"'Playfair Display',serif", fontSize:40,
    fontWeight:700, marginBottom:12, color:"var(--ink)",
  },
  dashSub: { color:"var(--muted)", fontSize:16 },
  dropZone: {
    border:"2px dashed var(--warm)", borderRadius:16,
    padding:"56px 32px", textAlign:"center", cursor:"pointer",
    background:"var(--card)", transition:"all .25s",
    marginBottom:32,
  },
  dropZoneActive: {
    background:"#fdf6e3", borderColor:"var(--accent)", transform:"scale(1.01)",
  },
  dropIcon: { fontSize:52, marginBottom:16 },
  dropTitle: {
    fontFamily:"'Playfair Display',serif", fontSize:22,
    marginBottom:8, color:"var(--ink)",
  },
  dropSub: { color:"var(--muted)", fontSize:14, marginBottom:24 },
  btnUpload: {
    padding:"10px 28px", background:"var(--accent)", color:"#fff",
    borderRadius:8, fontSize:14, fontFamily:"'DM Sans',sans-serif",
    pointerEvents:"none",
  },
  tipsRow: { display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center" },
  tipTag: {
    padding:"5px 14px", background:"var(--cream)", borderRadius:20,
    fontSize:13, color:"var(--muted)",
  },
  loadingBox: {
    textAlign:"center", padding:"56px 32px", background:"var(--card)",
    borderRadius:16, border:"1px solid var(--cream)",
  },
  loadingBook: { fontSize:52, marginBottom:16, animation:"bookFloat 2s ease-in-out infinite" },
  loadingSpinner: {
    width:36, height:36, border:"3px solid var(--cream)",
    borderTopColor:"var(--warm)", borderRadius:"50%",
    animation:"spin .8s linear infinite", margin:"0 auto 16px",
  },
  loadingText: { fontSize:16, color:"var(--ink)", fontWeight:500 },

  // ── Narrator ──
  narratorWrap: { minHeight:"100vh", background:"var(--paper)" },
  btnBack: {
    background:"none", border:"none", fontSize:14, color:"var(--muted)",
    fontFamily:"'DM Sans',sans-serif", cursor:"pointer",
  },
  narratorBody: {
    maxWidth:860, margin:"0 auto", padding:"48px 24px",
  },
  bookCard: {
    display:"flex", gap:40, background:"var(--card)",
    borderRadius:20, padding:40, marginBottom:40,
    boxShadow:"var(--shadow)",
    flexWrap:"wrap",
  },
  bookCover: {
    width:140, height:200, position:"relative", flexShrink:0,
    perspective:800,
  },
  bookSpine: {
    position:"absolute", left:0, top:0, width:20, height:"100%",
    background:"var(--accent)", borderRadius:"4px 0 0 4px",
  },
  bookFront: {
    position:"absolute", left:20, top:0, right:0, height:"100%",
    background:"linear-gradient(135deg,#3d2b1f,#6b4226)",
    borderRadius:"0 6px 6px 0",
    display:"flex", flexDirection:"column", alignItems:"center",
    justifyContent:"center", padding:16, textAlign:"center",
    boxShadow:"4px 4px 20px rgba(0,0,0,.3)",
  },
  bookEmoji: { fontSize:28, marginBottom:8 },
  bookCoverTitle: {
    fontFamily:"'Playfair Display',serif", fontSize:12,
    color:"#f5e6cc", fontWeight:700, lineHeight:1.3,
  },
  bookCoverAuthor: { fontSize:10, color:"#c8a96e", marginTop:6 },
  bookInfo: { flex:1, minWidth:240 },
  genreTag: {
    display:"inline-block", padding:"3px 12px",
    background:"var(--cream)", borderRadius:20,
    fontSize:12, color:"var(--muted)", marginBottom:12,
  },
  bookTitle: {
    fontFamily:"'Playfair Display',serif", fontSize:30,
    fontWeight:700, marginBottom:6, color:"var(--ink)", lineHeight:1.2,
  },
  bookAuthorLine: { color:"var(--muted)", fontSize:15, marginBottom:12 },
  bookTagline: {
    fontStyle:"italic", color:"var(--warm)", fontSize:14,
    marginBottom:24, lineHeight:1.6,
  },

  // Player
  player: {
    background:"var(--dark)", borderRadius:12, padding:20,
  },
  waveform: {
    display:"flex", alignItems:"center", gap:3, height:40,
    justifyContent:"center", marginBottom:12,
  },
  waveBar: {
    width:3, background:"var(--warm)", borderRadius:2,
    transition:"height .1s ease",
  },
  nowPlaying: {
    fontSize:12, color:"var(--warm)", textAlign:"center",
    marginBottom:10,
  },
  controls: {
    display:"flex", alignItems:"center", justifyContent:"center", gap:16,
    marginBottom:8,
  },
  btnPlay: {
    width:52, height:52, borderRadius:"50%",
    background:"var(--accent)", color:"#fff", fontSize:20,
    display:"flex", alignItems:"center", justifyContent:"center",
    transition:"transform .15s",
  },
  btnStop: {
    width:38, height:38, borderRadius:"50%",
    background:"rgba(255,255,255,.08)", color:"#b0a898", fontSize:16,
    display:"flex", alignItems:"center", justifyContent:"center",
  },
  playerHint: { textAlign:"center", fontSize:12, color:"#6b6358" },

  // Mood selector
  moodRow: {
    display:"flex", gap:6, justifyContent:"center", marginBottom:14,
  },
  moodBtn: {
    padding:"5px 13px", borderRadius:20, fontSize:12,
    background:"rgba(255,255,255,.07)", color:"#8a7e6e",
    border:"1px solid rgba(255,255,255,.1)", transition:"all .2s",
    fontFamily:"'DM Sans',sans-serif",
  },
  moodBtnActive: {
    background:"var(--warm)", color:"var(--dark)",
    border:"1px solid var(--warm)",
  },

  // Tabs
  tabs: {
    display:"flex", gap:8, marginBottom:28,
  },
  tabBtn: {
    padding:"10px 20px", borderRadius:8, background:"var(--card)",
    border:"1.5px solid var(--cream)", fontSize:14, color:"var(--muted)",
    fontFamily:"'DM Sans',sans-serif", transition:"all .2s",
  },
  tabBtnActive: {
    background:"var(--accent)", color:"#fff", border:"1.5px solid var(--accent)",
  },

  // Summary
  summaryBox: {
    background:"var(--card)", borderRadius:16, padding:32,
    boxShadow:"var(--shadow)",
  },
  summaryPara: {
    fontFamily:"'Playfair Display',serif", fontSize:16,
    lineHeight:1.9, color:"var(--ink)", marginBottom:20,
  },

  // Chapters
  chapterList: { display:"flex", flexDirection:"column", gap:12 },
  chapterCard: {
    background:"var(--card)", borderRadius:12, padding:20,
    border:"1.5px solid var(--cream)", transition:"all .2s",
  },
  chapterCardActive: {
    border:"1.5px solid var(--warm)", background:"#fdf8f0",
  },
  chapterHeader: { display:"flex", alignItems:"center", gap:12, marginBottom:8 },
  chapterNum: { fontSize:12, color:"var(--muted)", fontWeight:500 },
  chapterTitle: { flex:1, fontWeight:500, fontSize:15, color:"var(--ink)" },
  btnChPlay: {
    width:30, height:30, borderRadius:"50%", background:"var(--accent)",
    color:"#fff", fontSize:13,
    display:"flex", alignItems:"center", justifyContent:"center",
  },
  chapterSummary: { fontSize:14, color:"var(--muted)", lineHeight:1.7 },
  emptyState: { textAlign:"center", padding:40, color:"var(--muted)" },

  // Themes
  themeGrid: {
    display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:16,
  },
  themeCard: {
    background:"var(--card)", borderRadius:12, padding:20,
    border:"1.5px solid var(--cream)",
    display:"flex", alignItems:"flex-start", gap:12,
  },
  themeNum: {
    fontFamily:"'Playfair Display',serif", fontSize:28,
    color:"var(--cream)", fontWeight:700, lineHeight:1,
  },
  themeText: { fontSize:14, color:"var(--ink)", lineHeight:1.6, paddingTop:4 },
};
