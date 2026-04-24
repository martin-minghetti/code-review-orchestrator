import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReviewResult } from '@/lib/schemas';

interface DemoPrCardProps {
  demoId: string;
  data: ReviewResult;
}

export function DemoPrCard({ demoId, data }: DemoPrCardProps) {
  const { pr, summary } = data;

  return (
    <Link href={`/review/${demoId}`} className="block group focus:outline-none">
      <Card className="h-full gap-3 rounded-[20px] border-border/80 bg-card py-5 backdrop-blur-md transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-foreground/15 group-hover:bg-secondary group-focus-visible:border-foreground/30">
        <CardHeader className="gap-1.5 px-5">
          <p className="text-xs font-mono text-muted-foreground">
            {pr.owner}/{pr.repo} #{pr.number}
          </p>
          <CardTitle className="text-sm font-medium leading-snug">{pr.title}</CardTitle>
        </CardHeader>
        <CardContent className="px-5">
          <div className="flex flex-wrap gap-2">
            {summary.total === 0 ? (
              <span className="inline-flex h-5 items-center rounded-full bg-green-500/15 px-2 text-xs font-medium text-green-400">
                Clean
              </span>
            ) : (
              <>
                {summary.critical > 0 && (
                  <span className="inline-flex h-5 items-center rounded-full bg-red-500/15 px-2 text-xs font-medium text-red-400">
                    {summary.critical} critical
                  </span>
                )}
                {summary.warning > 0 && (
                  <span className="inline-flex h-5 items-center rounded-full bg-yellow-500/15 px-2 text-xs font-medium text-yellow-400">
                    {summary.warning} warning{summary.warning !== 1 ? 's' : ''}
                  </span>
                )}
                {summary.info > 0 && (
                  <span className="inline-flex h-5 items-center rounded-full bg-blue-500/15 px-2 text-xs font-medium text-blue-400">
                    {summary.info} info
                  </span>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
