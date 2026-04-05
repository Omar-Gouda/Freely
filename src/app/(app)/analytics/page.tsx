import { FunnelChart } from "@/components/charts/funnel-chart";
import { SourceChart } from "@/components/charts/source-chart";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getAnalyticsOverview } from "@/lib/analytics";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

function formatAction(action: string) {
  return action.replaceAll(".", " ").replaceAll("_", " ");
}

type AnalyticsPageProps = {
  searchParams?: Promise<{ jobId?: string }>;
};

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const session = await requireSession();
  const params = (searchParams ? await searchParams : {}) ?? {};
  const jobs = (await db.job.findMany({
    where: { organizationId: session.organizationId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true }
  })) as Array<{ id: string; title: string }>;
  const selectedJobId = params.jobId ?? "";
  const analytics = await getAnalyticsOverview(session.organizationId, selectedJobId || undefined);

  return (
    <div className="stack-xl">
      <SectionHeading title="Analytics dashboard" description="Monitor the overall funnel or drill into one job to track candidate progress, pipeline movement, and recent recruiter activity." />
      <Card className="filter-bar">
        <form method="GET" className="filter-bar-inline">
          <select name="jobId" className="input" defaultValue={selectedJobId}>
            <option value="">All jobs</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>{job.title}</option>
            ))}
          </select>
          <div className="filter-actions">
            <button type="submit" className="button button-primary">Load analytics</button>
            <a href="/analytics" className="button button-ghost">Reset</a>
          </div>
        </form>
        <div className="filter-summary">
          <strong>{analytics.selectedJob?.title ?? "All jobs"}</strong>
          <span>{analytics.totals.candidates} candidate records in scope</span>
        </div>
      </Card>

      <div className="stats-grid">
        <Card><strong>{analytics.totals.jobs}</strong><span>{selectedJobId ? "Jobs in scope" : "Total jobs"}</span></Card>
        <Card><strong>{analytics.totals.candidates}</strong><span>Total candidates</span></Card>
        <Card><strong>{analytics.avgTimeToHireDays} days</strong><span>Avg time to hire</span></Card>
        <Card><strong>{analytics.conversionRates.qualifiedToHired}%</strong><span>Qualified to hired</span></Card>
      </div>
      <div className="two-column-grid">
        <Card>
          <SectionHeading title="Applicants by source" />
          <SourceChart data={analytics.sourceBreakdown} />
        </Card>
        <Card>
          <SectionHeading title="Stage conversion funnel" />
          <FunnelChart data={analytics.funnel} />
        </Card>
      </div>
      <div className="two-column-grid">
        <Card>
          <SectionHeading title="Quality distribution" description="Candidate quality now uses a 10-point fit score." />
          <div className="stats-inline">
            <span>Excellent {analytics.qualityBands.excellent}</span>
            <span>Strong {analytics.qualityBands.strong}</span>
            <span>Moderate {analytics.qualityBands.moderate}</span>
            <span>Low {analytics.qualityBands.low}</span>
          </div>
        </Card>
        <Card>
          <SectionHeading title="Recent activity" description="Quick visibility into what changed for this job and its candidates." />
          <div className="timeline-list">
            {analytics.recentActivity.length ? analytics.recentActivity.map((item: { id: string; action: string; entityType: string; createdAt: Date }) => (
              <div key={item.id} className="timeline-item">
                <strong>{formatAction(item.action)}</strong>
                <p>{item.entityType.replaceAll("_", " ")}</p>
                <small>{new Date(item.createdAt).toLocaleString()}</small>
              </div>
            )) : <p className="muted">No tracked activity yet for this scope.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
