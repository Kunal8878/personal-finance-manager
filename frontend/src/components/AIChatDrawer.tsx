import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../services/api';
import {
  Bot, Send, X, Sparkles, User as UserIcon,
  Copy, Trash2, RotateCcw, ChevronDown
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id?: string;
  sender: 'USER' | 'AI';
  message: string;
  suggestions?: string[];
  createdAt?: string;
  error?: boolean;
}

// ─── Quick prompts ──────────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  'Analyze my spending this month',
  'Am I on track with my savings goal?',
  'Where can I reduce expenses?',
  'How much can I safely spend this month?',
  'Show me my biggest expenses',
  'Review my loan situation',
  'Help me understand my net worth',
];

// ─── Simple markdown renderer (bold + newlines, no external dep) ──────────────
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Bold: **text**
    const parts = line.split(/\*\*(.*?)\*\*/g);
    const rendered = parts.map((part, j) =>
      j % 2 === 1 ? <strong key={j}>{part}</strong> : part
    );
    return (
      <React.Fragment key={i}>
        {rendered}
        {i < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

// ─── Message bubble ────────────────────────────────────────────────────────────
const MessageBubble: React.FC<{
  msg: ChatMessage;
  onSuggestionClick: (s: string) => void;
  onCopy: (text: string) => void;
}> = ({ msg, onSuggestionClick, onCopy }) => {
  const isUser = msg.sender === 'USER';

  return (
    <div className={`flex items-start gap-2.5 group ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold border
        ${isUser
          ? 'bg-finance-emerald/20 text-finance-primary border-finance-emerald/40'
          : msg.error
            ? 'bg-finance-rose/20 text-finance-rose border-finance-rose/40'
            : 'bg-finance-secondary/20 text-finance-sky border-finance-secondary/40'
        }`}
      >
        {isUser ? <UserIcon className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>

      <div className={`space-y-2 max-w-[82%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Bubble */}
        <div className={`relative px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed
          ${isUser
            ? 'bg-finance-emerald text-slate-950 font-medium rounded-tr-none'
            : msg.error
              ? 'bg-finance-rose/10 border border-finance-rose/30 text-finance-rose rounded-tl-none'
              : 'bg-finance-card border border-finance-border text-finance-text rounded-tl-none'
          }`}
        >
          {isUser ? msg.message : renderMarkdown(msg.message)}

          {/* Copy button (AI only) */}
          {!isUser && !msg.error && (
            <button
              onClick={() => onCopy(msg.message)}
              className="absolute -bottom-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-finance-elevated border border-finance-border text-finance-muted hover:text-finance-text"
              title="Copy response"
            >
              <Copy className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Suggestions */}
        {msg.suggestions && msg.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {msg.suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSuggestionClick(s)}
                className="px-2.5 py-1 bg-finance-card hover:bg-finance-elevated text-finance-primary text-[11px] font-semibold rounded-full border border-finance-emerald/30 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        {msg.createdAt && (
          <span className="text-[10px] text-finance-muted px-1">
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Typing indicator ───────────────────────────────────────────────────────────
const TypingIndicator: React.FC = () => (
  <div className="flex items-center gap-2.5">
    <div className="w-7 h-7 rounded-lg bg-finance-secondary/20 border border-finance-secondary/40 flex items-center justify-center text-finance-sky flex-shrink-0">
      <Bot className="w-3.5 h-3.5" />
    </div>
    <div className="px-3.5 py-2.5 bg-finance-card border border-finance-border rounded-2xl rounded-tl-none">
      <div className="flex gap-1 items-center h-4">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-finance-primary animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  </div>
);

// ─── Main Drawer ───────────────────────────────────────────────────────────────
interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const [activeModel, setActiveModel] = useState<string>('Aura Financial Engine');

  // Load history when drawer opens
  useEffect(() => {
    if (!isOpen) return;
    async function loadHistory() {
      setHistoryLoading(true);
      const res = await apiFetch<{ history: ChatMessage[] }>('/ai/chat-history');
      setHistoryLoading(false);
      if (res.success && res.data && res.data.history.length > 0) {
        setMessages(res.data.history);
      } else {
        setMessages([{
          sender: 'AI',
          message: `Hello! I'm your **AI Financial Assistant** powered by your real financial data.\n\nI can help you:\n- Analyze spending patterns\n- Track goal progress\n- Review loan situations\n- Understand your net worth\n\nWhat would you like to know?`,
          suggestions: ['Analyze my spending this month', 'Show my goals progress', 'How much can I safely spend?']
        }]);
      }
    }
    loadHistory();
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Send message
  const handleSend = useCallback(async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    setMessages(prev => [...prev, { sender: 'USER', message: query }]);
    if (!textToSend) setInput('');
    setLoading(true);
    setShowPrompts(false);

    const res = await apiFetch<{ reply: string; suggestions?: string[]; modelUsed?: string }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: query })
    });

    setLoading(false);

    if (res.success && res.data) {
      if (res.data.modelUsed) setActiveModel(res.data.modelUsed);
      setMessages(prev => [...prev, {
        sender: 'AI',
        message: res.data!.reply,
        suggestions: res.data!.suggestions
      }]);
    } else {
      setMessages(prev => [...prev, {
        sender: 'AI',
        message: res.error || 'Something went wrong. Please try again.',
        error: true
      }]);
    }
  }, [input, loading]);

  // Clear conversation
  const handleClear = async () => {
    if (!window.confirm('Clear all chat history?')) return;
    await apiFetch('/ai/chat-history', { method: 'DELETE' });
    setMessages([{
      sender: 'AI',
      message: 'Conversation cleared. How can I help you with your finances?',
      suggestions: QUICK_PROMPTS.slice(0, 3)
    }]);
  };

  // Copy message text
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsg(text);
    setTimeout(() => setCopiedMsg(''), 2000);
  };

  // Retry last message
  const handleRetry = () => {
    const lastUser = [...messages].reverse().find(m => m.sender === 'USER');
    if (lastUser) handleSend(lastUser.message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] flex flex-col shadow-2xl border-l border-finance-border"
      style={{ backgroundColor: 'var(--t-card)' }}
    >
      {/* ── Header ── */}
      <div className="px-4 py-3.5 border-b border-finance-border flex items-center justify-between flex-shrink-0"
        style={{ backgroundColor: 'var(--t-elevated)' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-finance-emerald/15 border border-finance-emerald/40 flex items-center justify-center text-finance-primary">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-finance-text flex items-center gap-1.5">
              AI Advisor <Sparkles className="w-3.5 h-3.5 text-finance-primary" />
            </h3>
            <p className="text-[10px] text-finance-emerald font-semibold">{activeModel}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={handleRetry} title="Retry last message"
            className="p-1.5 rounded-lg text-finance-muted hover:text-finance-text hover:bg-finance-border/50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={handleClear} title="Clear conversation"
            className="p-1.5 rounded-lg text-finance-muted hover:text-finance-rose hover:bg-finance-rose/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-finance-muted hover:text-finance-text hover:bg-finance-border/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {historyLoading && (
          <div className="text-center text-xs text-finance-muted py-4 animate-pulse">Loading conversation...</div>
        )}

        {messages.map((m, idx) => (
          <MessageBubble
            key={m.id || idx}
            msg={m}
            onSuggestionClick={handleSend}
            onCopy={handleCopy}
          />
        ))}

        {loading && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Copy toast ── */}
      {copiedMsg && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-finance-elevated border border-finance-border text-finance-text text-xs rounded-full shadow-lg">
          Copied!
        </div>
      )}

      {/* ── Quick prompts panel ── */}
      {showPrompts && (
        <div className="border-t border-finance-border px-3 py-2 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto"
          style={{ backgroundColor: 'var(--t-surface)' }}
        >
          {QUICK_PROMPTS.map((p, i) => (
            <button key={i} onClick={() => { handleSend(p); setShowPrompts(false); }}
              className="px-2.5 py-1 bg-finance-card hover:bg-finance-elevated text-finance-muted hover:text-finance-text text-[11px] rounded-lg border border-finance-border transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="px-3 py-2.5 border-t border-finance-border flex-shrink-0"
        style={{ backgroundColor: 'var(--t-elevated)' }}
      >
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setShowPrompts(p => !p)}
            title="Quick prompts"
            className={`p-2 rounded-xl border transition-colors flex-shrink-0
              ${showPrompts
                ? 'bg-finance-emerald/20 border-finance-emerald/40 text-finance-primary'
                : 'bg-finance-card border-finance-border text-finance-muted hover:text-finance-text'
              }`}
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showPrompts ? 'rotate-180' : ''}`} />
          </button>

          <input
            ref={inputRef}
            type="text"
            placeholder="Ask about your finances..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={2000}
            disabled={loading}
            className="flex-1 px-3.5 py-2 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-xs focus:outline-none focus:border-finance-primary disabled:opacity-50 transition-colors"
          />

          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="p-2 bg-finance-emerald hover:bg-finance-emeraldDark text-slate-950 font-bold rounded-xl transition-all disabled:opacity-40 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-finance-muted mt-1.5 text-center">
          Powered by your real financial data
        </p>
      </div>
    </div>
  );
};
