import { DEMOS } from '@/lib/demos';
import { DemoPrCard } from '@/components/demo-pr-card';
import { PrInputForm } from '@/components/pr-input-form';
import { Separator } from '@/components/ui/separator';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="mx-auto max-w-3xl px-4 pt-16 pb-12 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          4 AI agents review your pull request in parallel
        </h1>
        <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto">
          Paste a GitHub PR URL and get instant analysis from a Security Scanner, Change Impact
          Analyzer, Test Gap Detector, and Documentation Verifier — all powered by Claude.
        </p>
      </section>

      <Separator />

      {/* Demo PRs */}
      <section className="mx-auto max-w-3xl px-4 py-12">
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
      <section className="mx-auto max-w-md px-4 py-12">
        <h2 className="text-lg font-semibold mb-1">Try with your own PR</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Works on any public GitHub pull request. Bring your own Anthropic API key.
        </p>
        <PrInputForm />
      </section>
    </div>
  );
}
