'use client';

import { useState } from 'react';
import { AGENT_META, AGENT_IDS, type AgentId } from '@/lib/agents/config';
import type { ReviewResult } from '@/lib/schemas';

interface ContextInspectorProps {
  contextByAgent: ReviewResult['contextByAgent'];
}

export function ContextInspector({ contextByAgent }: ContextInspectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <span className="text-sm font-medium">Context Inspector</span>
        <span className="text-xs text-muted-foreground">{open ? '▲ Hide' : '▼ Show'} files read by each agent</span>
      </button>

      {open && (
        <div className="border-t border-border p-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {AGENT_IDS.map(agentId => {
            const files = contextByAgent[agentId] ?? [];
            const meta = AGENT_META[agentId as AgentId];
            return (
              <div key={agentId} className="flex flex-col gap-1">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <span aria-hidden="true">{meta.icon}</span>
                  {meta.name}
                </p>
                {files.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No files</p>
                ) : (
                  <ul className="flex flex-col gap-0.5">
                    {files.map(file => (
                      <li key={file} className="text-xs font-mono text-foreground/70 truncate" title={file}>
                        {file}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
