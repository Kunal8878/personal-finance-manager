import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../services/api';
import {
  Bot, Sparkles, ShieldCheck, CheckCircle2, AlertCircle,
  Send, Trash2, RotateCcw, Copy, ChevronDown,
  TrendingUp, TrendingDown, Wallet, Target
} from 'lucide-react';
import { CurrencyDisplay } from '../components/CurrencyDisplay';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id?: string;
  sender: 'USER' | 'AI';
  message: string;
  suggestions?: string[];
  createdAt?: string;
  error?: boolean;
}

interface HealthData {
  score: number;
  grade: string;
  breakdown: { savingsRatePoints: number; emergencyFundPoints: number; debtRatioPoints: number; budgetAdherencePoints: number };
  strengths: string[];
  actionItems: string[];
}

interface SnapshotSummary {
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  availableBalance: number;
}

// ─── Quick prompts ──────────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  'Analyze my spending this month',
  'Am I on track with my savings goal?',
  'Where can I reduce expenses?',
  'How much can I safely spend this month?',
  'Show me my biggest expense categories',
  'Review my loan and EMI situation',
  'Compare this month with last month',
];

// ─── Markdown renderer ──────────────────────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    const rendered = parts.map((part, j) =>
      j % 2 === 1 ? <strong key={j} className="font-semibold">{part}</strong> : part
    );
    return (
      <React.Fragment key={i}>
        {rendered}
        {i < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

// ─── Grade color ────────────────────────────────────────────────────────────────
function gradeColor(grade: string) {
  if (grade === 'EXCELLENT') return 'text-finance-emerald';
  if (grade === 'GOOD') return 'text-finance-sky';
  if (grade === 'FAIR') return 'text-finance-amber';
  return 'text-finance-rose';
}

// ─── Message bubble ─────────────────────────────────────────────────────────────
const MessageBubble: React.FC<{
  msg: ChatMessage;
  onSuggestionClick: (s: string) => void;
  onCopy: (t: string) => void;
}> = ({ msg, onSuggestionClick, onCopy }) => {
  const isUser = msg.sender === 'USER';
  return (
    <div className={`flex items-start gap-2.5 group ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0
        ${isUser ? 'bg-finance-emerald/20 text-finance-primary border-finance-emerald/40'
          : msg.error ? 'bg-finance-rose/20 text-finance-rose border-finance-rose/40'
          : 'bg-finance-sky/20 text-finance-sky border-finance-sky/40'}`}>
        {isUser ? <span className="text-[10px] font-bold">You</span> : <Bot className="w-3.5 h-3.5" />}
      </div>
      <div className={`flex flex-col space-y-2 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`relative px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed
          ${isUser ? 'bg-finance-emerald text-slate-950 font-medium rounded-tr-none'
            : msg.error ? 'bg-finance-rose/10 border border-finance-rose/30 text-finance-rose rounded-tl-none'
            : 'bg-finance-card border border-finance-border text-finance-text rounded-tl-none'}`}
        >
          {isUser ? msg.message : renderMarkdown(msg.message)}
          {!isUser && !msg.error && (
            <button onClick={() => onCopy(msg.message)}
              className="absolute -bottom-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-finance-elevated border border-finance-border text-finance-muted hover:text-finance-text"
              title="Copy">
              <Copy className="w-3 h-3" />
            </button>
          )}
        </div>
        {msg.suggestions && msg.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {msg.suggestions.map((s, i) => (
              <button key={i} onClick={() => onSuggestionClick(s)}
                className="px-2.5 py-1 bg-finance-card hover:bg-finance-elevated text-finance-primary text-[11px] font-semibold rounded-full border border-finance-emerald/30 transition-colors">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const TypingIndicator: React.FC = () => (
  <div className="flex items-center gap-2.5">
    <div className="w-7 h-7 rounded-lg bg-finance-sky/20 border border-finance-sky/40 flex items-center justify-center text-finance-sky flex-shrink-0">
      <Bot className="w-3.5 h-3.5" />
    </div>
    <div className="px-3.5 py-3 bg-finance-card border border-finance-border rounded-2xl rounded-tl-none">
      <div className="flex gap-1 items-center">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-finance-primary animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  </div>
);

// ─── Main page ──────────────────────────────────────────────────────────────────
export const AIAdvisorPage: React.FC = () => {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotSummary | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load health score + chat history
  useEffect(() => {
    async function init() {
      setHealthLoading(true);
      const [healthRes, histRes] = await Promise.all([
        apiFetch<{ health: HealthData; snapshotSummary: SnapshotSummary }>('/ai/health-score'),
        apiFetch<{ history: ChatMessage[] }>('/ai/chat-history')
      ]);
      setHealthLoading(false);

      if (healthRes.success && healthRes.data) {
        setHealthData(healthRes.data.health);
        setSnapshot(healthRes.data.snapshotSummary);
      }

      if (histRes.success && histRes.data && histRes.data.history.length > 0) {
        setMessages(histRes.data.history);
      } else {
        setMessages([{
          sender: 'AI',
          message: `Hello! I'm your **AI Financial Advisor**.\n\nI analyze your real financial data — income, expenses, goals, investments, and more — to give you personalized insights.\n\nWhat would you like to explore?`,
          suggestions: ['Analyze my spending this month', 'Am I on track with my goals?', 'Where can I reduce expenses?']
        }]);
      }
    }
    init();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const [activeModel, setActiveModel] = useState<string>('Aura Financial Engine');

  const handleSend = useCallback(async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || sending) return;
    setMessages(prev => [...prev, { sender: 'USER', message: query }]);
    if (!textToSend) setInput('');
    setSending(true);
    setShowPrompts(false);

    const res = await apiFetch<{ reply: string; suggestions?: string[]; modelUsed?: string }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: query })
    });
    setSending(false);

    if (res.success && res.data) {
      if (res.data.modelUsed) setActiveModel(res.data.modelUsed);
      setMessages(prev => [...prev, { sender: 'AI', message: res.data!.reply, suggestions: res.data!.suggestions }]);
    } else {
      setMessages(prev => [...prev, { sender: 'AI', message: res.error || 'Something went wrong. Please try again.', error: true }]);
    }
  }, [input, sending]);

  const handleClear = async () => {
    if (!window.confirm('Clear all chat history?')) return;
    await apiFetch('/ai/chat-history', { method: 'DELETE' });
    setMessages([{ sender: 'AI', message: 'Conversation cleared. How can I help?', suggestions: QUICK_PROMPTS.slice(0, 3) }]);
  };

  const handleRetry = () => {
    const lastUser = [...messages].reverse().find(m => m.sender === 'USER');
    if (lastUser) handleSend(lastUser.message);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const h = healthData || {
    score: 0, grade: 'NEEDS_ATTENTION',
    breakdown: { savingsRatePoints: 0, emergencyFundPoints: 0, debtRatioPoints: 0, budgetAdherencePoints: 0 },
    strengths: [], actionItems: ['Add income and expense records to compute your Financial Health Score.']
  };

  return (
    <div className="p-6 max-w-7xl mx-auto pb-24 lg:pb-12 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-finance-text flex items-center gap-2">
            AI Financial Advisor <Sparkles className="w-5 h-5 text-finance-emerald" />
          </h2>
          <p className="text-xs text-finance-muted mt-0.5">Personalized analysis powered by your real financial data</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-finance-card border border-finance-emerald/30 text-finance-emerald rounded-full">
          <span className="w-2 h-2 rounded-full bg-finance-emerald animate-ping" />
          <span>Active: {activeModel}</span>
        </div>
      </div>

      {/* ── Health Score + Snapshot ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Score gauge */}
        <div className="glass-card rounded-2xl p-6 border border-finance-border flex flex-col items-center justify-center text-center gap-3">
          {healthLoading ? (
            <div className="w-24 h-24 rounded-full border-4 border-finance-border animate-pulse bg-finance-surface" />
          ) : (
            <div className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center shadow-xl
              ${h.grade === 'EXCELLENT' ? 'border-finance-emerald bg-finance-emerald/10 shadow-finance-emerald/10'
                : h.grade === 'GOOD' ? 'border-finance-sky bg-finance-sky/10 shadow-finance-sky/10'
                : h.grade === 'FAIR' ? 'border-finance-amber bg-finance-amber/10 shadow-finance-amber/10'
                : 'border-finance-rose bg-finance-rose/10 shadow-finance-rose/10'}`}
            >
              <span className={`num-font text-3xl font-extrabold ${gradeColor(h.grade)}`}>{h.score}</span>
              <span className="text-[10px] font-bold text-finance-muted uppercase">Health</span>
            </div>
          )}
          <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${gradeColor(h.grade)} bg-finance-card border border-finance-border`}>
            {h.grade.replace('_', ' ')}
          </span>
          <div className="grid grid-cols-2 gap-2 w-full text-xs">
            <div className="p-2 bg-finance-surface rounded-xl border border-finance-border text-center">
              <p className="text-finance-muted text-[10px]">Savings</p>
              <p className="num-font font-bold text-finance-emerald">{h.breakdown.savingsRatePoints}/30</p>
            </div>
            <div className="p-2 bg-finance-surface rounded-xl border border-finance-border text-center">
              <p className="text-finance-muted text-[10px]">Emergency</p>
              <p className="num-font font-bold text-finance-sky">{h.breakdown.emergencyFundPoints}/30</p>
            </div>
            <div className="p-2 bg-finance-surface rounded-xl border border-finance-border text-center">
              <p className="text-finance-muted text-[10px]">Debt Ratio</p>
              <p className="num-font font-bold text-finance-text">{h.breakdown.debtRatioPoints}/20</p>
            </div>
            <div className="p-2 bg-finance-surface rounded-xl border border-finance-border text-center">
              <p className="text-finance-muted text-[10px]">Budget</p>
              <p className="num-font font-bold text-finance-emerald">{h.breakdown.budgetAdherencePoints}/20</p>
            </div>
          </div>
        </div>

        {/* Financial snapshot cards */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3 content-start">
          {[
            { label: 'Monthly Income', value: snapshot?.monthlyIncome || 0, icon: TrendingUp, color: 'text-finance-emerald', bg: 'bg-finance-emerald/10' },
            { label: 'Monthly Expenses', value: snapshot?.monthlyExpenses || 0, icon: TrendingDown, color: 'text-finance-rose', bg: 'bg-finance-rose/10' },
            { label: 'Net Worth', value: snapshot?.netWorth || 0, icon: Wallet, color: 'text-finance-sky', bg: 'bg-finance-sky/10' },
            { label: 'Total Assets', value: snapshot?.totalAssets || 0, icon: ShieldCheck, color: 'text-finance-emerald', bg: 'bg-finance-emerald/10' },
            { label: 'Total Liabilities', value: snapshot?.totalLiabilities || 0, icon: Target, color: 'text-finance-rose', bg: 'bg-finance-rose/10' },
            { label: 'Savings Rate', value: null, icon: Sparkles, color: 'text-finance-amber', bg: 'bg-finance-amber/10', rawText: `${(snapshot?.savingsRate || 0).toFixed(1)}%` },
          ].map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} className="glass-card rounded-xl p-4 border border-finance-border">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg ${card.bg}`}>
                    <Icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                  <span className="text-[10px] font-semibold text-finance-muted uppercase tracking-wider">{card.label}</span>
                </div>
                <p className={`num-font text-lg font-extrabold ${card.color}`}>
                  {card.rawText ? card.rawText : <CurrencyDisplay amount={card.value!} />}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strengths & Action items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-finance-emerald/30 bg-finance-emerald/5 space-y-3">
          <h3 className="text-sm font-bold text-finance-text flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-finance-emerald" /> Financial Strengths
          </h3>
          {h.strengths.length > 0 ? (
            <ul className="space-y-1.5">
              {h.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-finance-text">
                  <span className="text-finance-emerald mt-0.5">✓</span> {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-finance-muted">Add financial records to unlock score insights.</p>
          )}
        </div>
        <div className="glass-card rounded-2xl p-5 border border-finance-amber/30 bg-finance-amber/5 space-y-3">
          <h3 className="text-sm font-bold text-finance-text flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-finance-amber" /> Action Items
          </h3>
          <ul className="space-y-1.5">
            {h.actionItems.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-finance-text">
                <span className="text-finance-amber mt-0.5">•</span> {a}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Full Chat Interface ── */}
      <div className="glass-card rounded-2xl border border-finance-border overflow-hidden flex flex-col" style={{ height: '520px' }}>
        {/* Chat header */}
        <div className="px-5 py-3.5 border-b border-finance-border flex items-center justify-between flex-shrink-0"
          style={{ backgroundColor: 'var(--t-elevated)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-finance-emerald/15 border border-finance-emerald/40 flex items-center justify-center text-finance-primary">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-finance-text">Chat with AI Advisor</h3>
              <p className="text-[10px] text-finance-muted">Reads your actual transactions, goals, and budgets</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {copied && <span className="text-[10px] text-finance-emerald">Copied!</span>}
            <button onClick={handleRetry} title="Retry last"
              className="p-1.5 rounded-lg text-finance-muted hover:text-finance-text hover:bg-finance-border/50 transition-colors">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={handleClear} title="Clear chat"
              className="p-1.5 rounded-lg text-finance-muted hover:text-finance-rose hover:bg-finance-rose/10 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((m, idx) => (
            <MessageBubble key={m.id || idx} msg={m} onSuggestionClick={handleSend} onCopy={handleCopy} />
          ))}
          {sending && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompts */}
        {showPrompts && (
          <div className="px-4 py-2.5 border-t border-finance-border flex flex-wrap gap-1.5"
            style={{ backgroundColor: 'var(--t-surface)' }}>
            {QUICK_PROMPTS.map((p, i) => (
              <button key={i} onClick={() => { handleSend(p); setShowPrompts(false); }}
                className="px-2.5 py-1 bg-finance-card hover:bg-finance-elevated text-finance-muted hover:text-finance-text text-[11px] rounded-lg border border-finance-border transition-colors">
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-finance-border flex-shrink-0 flex gap-2"
          style={{ backgroundColor: 'var(--t-elevated)' }}>
          <button onClick={() => setShowPrompts(p => !p)}
            className={`p-2 rounded-xl border transition-colors flex-shrink-0
              ${showPrompts ? 'bg-finance-emerald/20 border-finance-emerald/40 text-finance-primary' : 'bg-finance-card border-finance-border text-finance-muted hover:text-finance-text'}`}>
            <ChevronDown className={`w-4 h-4 transition-transform ${showPrompts ? 'rotate-180' : ''}`} />
          </button>
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask about your spending, goals, loans..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            maxLength={2000}
            disabled={sending}
            className="flex-1 px-3.5 py-2 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-sm focus:outline-none focus:border-finance-primary disabled:opacity-50 transition-colors"
          />
          <button onClick={() => handleSend()} disabled={sending || !input.trim()}
            className="px-4 py-2 bg-finance-emerald hover:bg-finance-emeraldDark text-slate-950 font-bold rounded-xl transition-all disabled:opacity-40 flex items-center gap-2">
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">{sending ? 'Analyzing...' : 'Ask'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
