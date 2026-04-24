import { DEMOS } from '@/lib/demos';
import { DemoPrCard } from '@/components/demo-pr-card';
import { PrInputForm } from '@/components/pr-input-form';
import { ShieldAlert, GitCompareArrows, FlaskConical, FileText } from 'lucide-react';

const agents = [
  { icon: ShieldAlert, label: 'Security' },
  { icon: GitCompareArrows, label: 'Impact' },
  { icon: FlaskConical, label: 'Test Gaps' },
  { icon: FileText, label: 'Docs' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground page-enter">
      {/* Hero */}
      <section className="mx-auto max-w-3xl px-4 pt-20 pb-16 text-center sm:pt-28">
        <p className="eyebrow reveal mb-6" style={{ animationDelay: '50ms' }}>
          Code Review Orchestrator
        </p>
        <h1
          className="display-sm reveal text-3xl sm:text-5xl"
          style={{ animationDelay: '150ms' }}
        >
          4 AI agents review your pull request in parallel.
        </h1>
        <p
          className="reveal mt-5 text-base text-muted-foreground max-w-xl mx-auto sm:text-lg"
          style={{ animationDelay: '300ms' }}
        >
          Paste a GitHub PR URL and get instant analysis from a Security Scanner, Change Impact
          Analyzer, Test Gap Detector, and Documentation Verifier — all powered by Claude.
        </p>

        <div
          className="reveal mt-10 flex items-center justify-center gap-4 sm:gap-6"
          style={{ animationDelay: '450ms' }}
        >
          {agents.map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="glass-pill flex h-11 w-11 items-center justify-center rounded-[14px]">
                <Icon className="h-4.5 w-4.5 text-foreground/80" />
              </div>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Demo PRs */}
      <section className="mx-auto max-w-5xl px-4 pb-14">
        <div
          className="reveal mb-6 flex items-end justify-between gap-4"
          style={{ animationDelay: '550ms' }}
        >
          <div>
            <p className="eyebrow mb-1.5">Demos</p>
            <h2 className="display-sm text-xl sm:text-2xl">See it in action</h2>
          </div>
          <p className="text-sm text-muted-foreground hidden sm:block">
            Pre-run reviews on real open source PRs.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {DEMOS.map((demo, i) => (
            <div
              key={demo.id}
              className="reveal"
              style={{ animationDelay: `${650 + i * 80}ms` }}
            >
              <DemoPrCard demoId={demo.id} data={demo.data} />
            </div>
          ))}
        </div>
      </section>

      {/* Form */}
      <section className="mx-auto max-w-3xl px-4 pb-24">
        <div
          className="reveal mx-auto max-w-md rounded-[24px] border border-border/80 bg-card p-8 backdrop-blur-md sm:p-10"
          style={{ animationDelay: '850ms' }}
        >
          <p className="eyebrow mb-2">Try it</p>
          <h2 className="display-sm text-xl sm:text-2xl">Use your own PR</h2>
          <p className="mt-2 mb-6 text-sm text-muted-foreground">
            Works on any public GitHub pull request. Bring your own Anthropic API key.
          </p>
          <PrInputForm />
        </div>
      </section>
    </div>
  );
}
