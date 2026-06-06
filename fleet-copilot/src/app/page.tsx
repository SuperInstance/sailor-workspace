'use client';

import React, { useState, useCallback, useEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────

interface SystemStatus {
  name: string;
  key: string;
  status: 'online' | 'degraded' | 'offline' | 'error';
  detail: string;
}

interface QuickAction {
  label: string;
  prompt: string;
  icon: string;
}

// ── Data ───────────────────────────────────────────────────────

const INITIAL_STATUS: SystemStatus[] = [
  { name: 'Nebula Cloud', key: 'nebula', status: 'online', detail: '47 pods · 12ms' },
  { name: 'VoxelWorks', key: 'voxelworks', status: 'online', detail: '68% GPU · 23 jobs' },
  { name: 'CraftMind AI', key: 'craftmind', status: 'degraded', detail: '340ms · 1200 req/min' },
  { name: 'Cognitive Compiler', key: 'cognitive', status: 'online', detail: 'Q:3 · 87% cache' },
  { name: 'Ternary Crates', key: 'ternary', status: 'online', detail: '148 crates · 37 deps' },
];

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'System Status', prompt: 'Show me the full fleet system status', icon: '📊' },
  { label: 'Nebula Health', prompt: 'How is Nebula cloud doing right now?', icon: '☁️' },
  { label: 'VoxelWorks', prompt: 'Check VoxelWorks compute cluster health', icon: '⚡' },
  { label: 'CraftMind', prompt: 'What is the CraftMind AI inference status?', icon: '🧠' },
  { label: 'Cognitive Compiler', prompt: 'Explain how the cognitive compiler works', icon: '🔬' },
  { label: 'Ternary Docs', prompt: 'Search fleet_docs for "ternary crates"', icon: '📦' },
];

const WELCOME_MESSAGE = `# 🚀 Fleet Copilot

Welcome to the **SuperInstance Fleet Operations Center**.

I can help you monitor and manage:
- **Nebula Cloud** — Multi-region orchestration
- **VoxelWorks** — GPU compute clusters
- **CraftMind AI** — Inference layer
- **Cognitive Compiler** — Ternary compute graphs
- **Ternary Crates** — Distributed package registry

Try a quick action below or ask me anything about the Fleet.`;

// ── Component ──────────────────────────────────────────────────

export default function FleetCopilotPage() {
  const [statuses, setStatuses] = useState<SystemStatus[]>(INITIAL_STATUS);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: WELCOME_MESSAGE },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Simulate live status updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStatuses(prev =>
        prev.map(s => {
          if (s.key === 'craftmind') {
            const util = 60 + Math.floor(Math.random() * 35);
            return {
              ...s,
              status: util > 85 ? 'degraded' : 'online' as const,
              detail: `${280 + Math.floor(Math.random() * 120)}ms · ${1000 + Math.floor(Math.random() * 500)} req/min`,
            };
          }
          if (s.key === 'nebula') {
            const pods = 42 + Math.floor(Math.random() * 15);
            return { ...s, detail: `${pods} pods · ${10 + Math.floor(Math.random() * 8)}ms` };
          }
          return s;
        })
      );
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickAction = useCallback(async (action: QuickAction) => {
    setMessages(prev => [...prev, { role: 'user', content: action.prompt }]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/copilotkit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: action.prompt }],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `API error ${res.status}`);
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || '✅ No response.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/copilotkit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: text }],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `API error ${res.status}`);
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || '✅ No response.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const statusDotClass = (status: string) => {
    switch (status) {
      case 'online': return 'status-dot online active';
      case 'degraded': return 'status-dot degraded';
      case 'error': return 'status-dot error';
      default: return 'status-dot offline';
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ─────────────────────────────── */}
      <aside className="w-72 flex-shrink-0 border-r border-fleet-border p-4 flex flex-col gap-4 overflow-y-auto"
        style={{ background: 'var(--fleet-surface)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🚀</span>
          <div>
            <h1 className="text-base font-bold tracking-tight text-fleet-text">Fleet Copilot</h1>
            <p className="text-xs text-fleet-text-dim">SuperInstance Operations</p>
          </div>
        </div>

        {/* System Status */}
        <div className="sidebar-section">
          <h2 className="text-xs font-semibold text-fleet-text-dim uppercase tracking-wider mb-2">System Status</h2>
          <div className="space-y-2">
            {statuses.map(s => (
              <div key={s.key} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className={statusDotClass(s.status)} />
                  <span className="text-xs font-medium text-fleet-text">{s.name}</span>
                </div>
                <span className="text-[10px] text-fleet-text-dim font-mono">{s.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Detail view */}
        <div className="sidebar-section">
          <h2 className="text-xs font-semibold text-fleet-text-dim uppercase tracking-wider mb-2">Live Metrics</h2>
          {statuses.map(s => (
            <div key={s.key} className="flex items-center gap-2 py-0.5">
              <span className="text-[10px] font-mono text-fleet-text-dim min-w-[16px]">
                {s.status === 'online' ? '🟢' : s.status === 'degraded' ? '🟡' : '🔴'}
              </span>
              <span className="text-[11px] font-mono text-fleet-text-dim">{s.detail}</span>
            </div>
          ))}
        </div>

        {/* API Status */}
        <div className="sidebar-section mt-auto">
          <div className="flex items-center gap-2">
            <span className="status-dot online" />
            <span className="text-[11px] font-mono text-fleet-text-dim">API connected</span>
          </div>
          <p className="text-[10px] text-fleet-text-dim mt-1">
            Model: DeepSeek V4 Flash
          </p>
        </div>
      </aside>

      {/* ── Main Chat Area ──────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0"
        style={{ background: 'var(--fleet-bg)' }}
      >
        {/* Header */}
        <header className="h-12 border-b border-fleet-border flex items-center px-5 gap-3 flex-shrink-0"
          style={{ background: 'var(--fleet-surface)' }}
        >
          <span className="w-2 h-2 rounded-full bg-fleet-success" />
          <span className="text-xs font-medium text-fleet-text-dim">Fleet Operations — All systems monitored</span>
          {error && (
            <span className="text-xs text-fleet-error ml-auto">⚠️ {error}</span>
          )}
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`message-enter flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
              >
                {/* Avatar */}
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-fleet-accent/20 flex items-center justify-center flex-shrink-0 text-sm">
                    🚀
                  </div>
                )}

                {/* Bubble */}
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-fleet-accent/20 border border-fleet-accent/30 text-fleet-text'
                      : 'bg-fleet-surface border border-fleet-border text-fleet-text'
                  }`}
                >
                  <div className="prose prose-invert prose-sm max-w-none">
                    {msg.content.split('\n').map((line, j) => {
                      // Handle code blocks
                      if (line.startsWith('```')) {
                        const lang = line.slice(3);
                        return <code key={j} className="block text-xs font-mono text-fleet-accent">{lang}</code>;
                      }
                      // Handle bold
                      const rendered = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-fleet-accent">$1</strong>');
                      // Handle inline code
                      const withCode = rendered.replace(/`(.*?)`/g, '<code class="text-fleet-accent-dim bg-fleet-bg px-1 rounded text-xs font-mono">$1</code>');
                      return (
                        <span key={j}>
                          <span dangerouslySetInnerHTML={{ __html: withCode }} />
                          <br />
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* User avatar */}
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-fleet-accent flex items-center justify-center flex-shrink-0 text-sm">
                    👤
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="message-enter flex gap-3">
                <div className="w-8 h-8 rounded-full bg-fleet-accent/20 flex items-center justify-center flex-shrink-0 text-sm">
                  🚀
                </div>
                <div className="bg-fleet-surface border border-fleet-border rounded-xl px-4 py-3">
                  <span className="inline-flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-fleet-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-fleet-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-fleet-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-5 py-2 border-t border-fleet-border"
          style={{ background: 'var(--fleet-surface)' }}
        >
          <div className="max-w-3xl mx-auto">
            <p className="text-[10px] text-fleet-text-dim uppercase tracking-wider mb-2 font-semibold">
              Quick Actions
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map(action => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action)}
                  disabled={isLoading}
                  className="quick-action-btn flex items-center gap-1.5"
                >
                  <span>{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="px-5 py-3 border-t border-fleet-border"
          style={{ background: 'var(--fleet-surface)' }}
        >
          <div className="max-w-3xl mx-auto flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the Fleet..."
              disabled={isLoading}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm border outline-none transition-all duration-200"
              style={{
                background: 'var(--fleet-bg)',
                borderColor: 'var(--fleet-border)',
                color: 'var(--fleet-text)',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--fleet-accent-dim)')}
              onBlur={e => (e.target.style.borderColor = 'var(--fleet-border)')}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !inputValue.trim()}
              className="rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-40"
              style={{
                background: 'var(--fleet-accent)',
                color: 'white',
                opacity: isLoading || !inputValue.trim() ? 0.4 : 1,
              }}
            >
              Send
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
