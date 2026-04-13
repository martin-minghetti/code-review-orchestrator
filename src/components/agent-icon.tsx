import { ShieldAlert, GitCompareArrows, FlaskConical, FileText } from 'lucide-react';
import type { AgentId } from '@/lib/agents/config';

const iconMap: Record<AgentId, React.ComponentType<{ className?: string }>> = {
  security: ShieldAlert,
  'change-impact': GitCompareArrows,
  'test-gap': FlaskConical,
  docs: FileText,
};

const colorMap: Record<AgentId, string> = {
  security: 'text-red-400',
  'change-impact': 'text-blue-400',
  'test-gap': 'text-amber-400',
  docs: 'text-emerald-400',
};

interface AgentIconProps {
  agent: AgentId;
  className?: string;
}

export function AgentIcon({ agent, className }: AgentIconProps) {
  const Icon = iconMap[agent];
  return <Icon className={`${colorMap[agent]} ${className ?? 'h-4 w-4'}`} />;
}
