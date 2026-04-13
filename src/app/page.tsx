import { DEMOS } from '@/lib/demos';
import { DemoPrCard } from '@/components/demo-pr-card';
import { PrInputForm } from '@/components/pr-input-form';
import { Separator } from '@/components/ui/separator';
import { ShieldAlert, GitCompareArrows, FlaskConical, FileText } from 'lucide-react';

const agents = [
  { icon: ShieldAlert, label: 'Security', color: 'text-red-400' },
  { icon: GitCompareArrows, label: 'Impact', color: 'text-blue-400' },
  { icon: FlaskConical, label: 'Test Gaps', color: 'text-amber-400' },
  { icon: FileText, label: 'Docs', color: 'text-emerald-400' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="mx-auto max-w-3xl px-4 pt-12 pb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          4 AI agents review your pull request in parallel
        </h1>
        <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto">
          Paste a GitHub PR URL and get instant analysis from a Security Scanner, Change Impact
          Analyzer, Test Gap Detector, and Documentation Verifier — all powered by Claude.
        </p>

        <div className="mt-8 flex items-center justify-center gap-6 sm:gap-8">
          {agents.map(({ icon: Icon, label, color }) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card">
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* Demo PRs */}
      <section className="mx-auto max-w-3xl px-4 py-10">
        <h2 className="text-lg font-semibold mb-1">See it in action</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Explore pre-run reviews on real open source PRs.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {DEMOS.map(demo => (
            <DemoPrCard key={demo.id} demoId={demo.id} data={demo.data} />
          ))}
        </div>
      </section>

      <Separator />

      {/* Form */}
      <section className="mx-auto max-w-md px-4 py-10 pb-16">
        <h2 className="text-lg font-semibold mb-1">Try with your own PR</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Works on any public GitHub pull request. Bring your own Anthropic API key.
        </p>
        <PrInputForm />
      </section>
    </div>
  );
}
