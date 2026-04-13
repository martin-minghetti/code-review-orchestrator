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
      <Card className="h-full transition-all duration-150 group-hover:ring-primary/50 group-focus-visible:ring-primary/50 group-hover:ring-2 group-focus-visible:ring-2">
        <CardHeader>
          <p className="text-xs font-mono text-muted-foreground">
            {pr.owner}/{pr.repo} #{pr.number}
          </p>
          <CardTitle className="text-sm leading-snug">{pr.title}</CardTitle>
        </CardHeader>
        <CardContent>
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
