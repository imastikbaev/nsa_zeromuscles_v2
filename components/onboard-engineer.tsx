"use client";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Design } from "@/lib/data";
import { phases, type Flight } from "@/lib/simulation";
import { useI18n } from "./preferences";
import "./onboard-engineer.css";

type Message = { role: "user" | "assistant"; content: string; phase: number };
const POS_KEY = "mission-architect:pet-position:v1";
const SIZE = 64;
const clampPos = (x: number, y: number) => ({
  x: Math.min(Math.max(8, x), Math.max(8, window.innerWidth - SIZE - 8)),
  y: Math.min(Math.max(8, y), Math.max(8, window.innerHeight - SIZE - 8)),
});

export function OnboardEngineer({ design, flight }: { design: Design; flight: Flight }) {
  const { locale, t } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const request = useRef<AbortController | null>(null);
  const drag = useRef<{ dx: number; dy: number; moved: boolean; sx: number; sy: number } | null>(null);
  const log = useRef<HTMLDivElement | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    let start = { x: window.innerWidth - SIZE - 24, y: window.innerHeight - SIZE - 24 };
    try {
      const saved = JSON.parse(localStorage.getItem(POS_KEY) ?? "null");
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) start = saved;
    } catch { /* ignore corrupt position */ }
    setPos(clampPos(start.x, start.y));
    const onResize = () => setPos(p => (p ? clampPos(p.x, p.y) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [messages, busy]);
  const c = (ru: string, en: string, kk: string) => locale === "ru" ? ru : locale === "kk" ? kk : en;
  const prompts = [
    c("Объясни этот этап", "Explain this phase", "Осы кезеңді түсіндір"),
    c("Что сейчас опаснее всего?", "What is the biggest risk now?", "Қазір ең үлкен қауіп қандай?"),
    c("Как сохранить больше данных?", "How can I preserve more data?", "Көбірек деректерді қалай сақтауға болады?"),
  ];

  function onDown(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!pos) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, moved: false, sx: e.clientX, sy: e.clientY };
  }
  function onMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 5) return;
    d.moved = true;
    setDragging(true);
    setPos(clampPos(e.clientX - d.dx, e.clientY - d.dy));
  }
  function onUp() {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d) return;
    if (d.moved) {
      setPos(p => { if (p) try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch { /* storage unavailable */ } return p; });
    } else setOpen(o => !o);
  }
  function onKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (!pos) return;
    const step = e.shiftKey ? 40 : 12;
    const move: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (move[e.key]) {
      e.preventDefault();
      const next = clampPos(pos.x + move[e.key][0], pos.y + move[e.key][1]);
      setPos(next);
      try { localStorage.setItem(POS_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
    } else if (e.key === "Escape") setOpen(false);
  }

  async function ask(text: string) {
    if (!text.trim() || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setError("");
    const phase = flight.phase;
    const timeout = setTimeout(() => controller.abort(), 50_000);
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_ENGINEER_URL || "http://127.0.0.1:3013/ask", {
        method: "POST", headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ design, flight, question: text, history: messages.slice(-10).map(({role, content}) => ({role, content})) }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error === "missing_key"
          ? c("Добавь OPENAI_API_KEY в .env.engineer и перезапусти npm run engineer.", "Add OPENAI_API_KEY to .env.engineer and restart npm run engineer.", ".env.engineer файлына OPENAI_API_KEY қосып, npm run engineer қайта іске қос.")
          : c("Не удалось получить ответ. Проверь ключ, баланс API и доступ к модели, затем повтори.", "Could not get a reply. Check the API key, credit and model access, then retry.", "Жауап алынбады. API кілтін, теңгерімді және модельге қолжетімділікті тексеріп, қайтала."));
        return;
      }
      setMessages(current => [...current, {role: "user", content: text, phase}, {role: "assistant", content: data.answer, phase}].slice(-20) as Message[]);
      setQuestion("");
    } catch {
      if (!controller.signal.aborted) setError(c("Сервис недоступен. Запусти npm run engineer и проверь подключение.", "Service unavailable. Run npm run engineer and check your connection.", "Қызмет қолжетімсіз. npm run engineer іске қосып, байланысты тексер."));
      else setError(c("Ответ занял слишком много времени. Попробуй ещё раз.", "The request timed out. Try again.", "Жауап күту уақыты аяқталды. Қайталап көр."));
    } finally { clearTimeout(timeout); request.current = null; setBusy(false); }
  }

  if (!pos) return null;
  const label = c("Бортовой инженер", "Onboard engineer", "Борт инженері");
  const panelW = Math.min(380, window.innerWidth - 16);
  const panelLeft = Math.min(Math.max(8, pos.x + SIZE / 2 - panelW / 2), window.innerWidth - panelW - 8);
  const above = pos.y > window.innerHeight / 2;
  const panelStyle = above
    ? { left: panelLeft, bottom: window.innerHeight - pos.y + 10, width: panelW, maxHeight: Math.max(240, pos.y - 20) }
    : { left: panelLeft, top: pos.y + SIZE + 10, width: panelW, maxHeight: Math.max(240, window.innerHeight - pos.y - SIZE - 20) };

  return <div className="engineer-pet" aria-label={label}>
    {open && <section className="engineer-panel" style={panelStyle} role="dialog" aria-label={label}>
      <header>
        <h3>{label}</h3>
        <button type="button" className="engineer-close" onClick={() => setOpen(false)} aria-label={c("Закрыть", "Close", "Жабу")}>×</button>
      </header>
      <p>{c("Объясняет текущий этап, риски и последствия решений по данным твоей миссии.", "Explains the current phase, risks and decisions using your mission data.", "Миссия деректері бойынша кезеңді, қауіптерді және шешімдерді түсіндіреді.")}</p>
      <div className="engineer-prompts">{prompts.map(prompt => <button type="button" key={prompt} disabled={busy} onClick={() => ask(prompt)}>{prompt}</button>)}</div>
      <div className="engineer-messages" role="log" aria-live="polite" ref={log}>
        {messages.map((message, i) => <article key={i} data-role={message.role}><small>{message.role === "user" ? c("Ты", "You", "Сен") : c("Инженер", "Engineer", "Инженер")} · {t(phases[message.phase])}</small><p>{message.content}</p></article>)}
        {busy && <article data-role="assistant"><small>{c("Инженер", "Engineer", "Инженер")}</small><p className="engineer-typing"><span/><span/><span/></p></article>}
      </div>
      <form onSubmit={event => { event.preventDefault(); void ask(question); }}>
        <label><span className="engineer-sr">{c("Вопрос о миссии", "Mission question", "Миссия туралы сұрақ")}</span>
          <textarea maxLength={2000} value={question} placeholder={c("Вопрос о миссии…", "Ask about your mission…", "Миссия туралы сұрақ…")} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void ask(question); } }} disabled={busy} rows={2}/></label>
        <button type="submit" disabled={busy || !question.trim()}>{busy ? c("Инженер отвечает…", "Thinking…", "Инженер жауап беруде…") : c("Спросить", "Ask", "Сұрау")}</button>
      </form>
      {error && <p role="alert" className="engineer-error">{error}</p>}
    </section>}
    <button type="button" className={`engineer-bot${dragging ? " is-dragging" : ""}${busy ? " is-busy" : ""}${open ? " is-open" : ""}`}
      style={{ left: pos.x, top: pos.y }} aria-expanded={open}
      aria-label={`${label}. ${c("Нажми, чтобы спросить; перетащи или стрелками перемести", "Click to ask; drag or use arrow keys to move", "Сұрау үшін бас; сүйреп немесе көрсеткілермен жылжыт")}`}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onKeyDown={onKey}>
      <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" focusable="false">
        <line x1="32" y1="8" x2="32" y2="2" stroke="#90bfff" strokeWidth="2.5" strokeLinecap="round"/>
        <circle className="engineer-antenna" cx="32" cy="4" r="3" fill="#6ee7b7"/>
        <rect x="8" y="10" width="48" height="44" rx="16" fill="#dbe8fb" stroke="#4f78ad" strokeWidth="2.5"/>
        <rect x="14" y="20" width="36" height="22" rx="10" fill="#0c1523"/>
        <g className="engineer-eyes"><circle cx="25" cy="31" r="4.2" fill="#90bfff"/><circle cx="39" cy="31" r="4.2" fill="#90bfff"/></g>
        <path d="M26 47 Q32 51 38 47" fill="none" stroke="#4f78ad" strokeWidth="2.5" strokeLinecap="round"/>
        <rect x="3" y="28" width="5" height="12" rx="2.5" fill="#4f78ad"/><rect x="56" y="28" width="5" height="12" rx="2.5" fill="#4f78ad"/>
      </svg>
    </button>
  </div>;
}
