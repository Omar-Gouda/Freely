import { FunnelChart } from "@/components/charts/funnel-chart";
import { SourceChart } from "@/components/charts/source-chart";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { WorkspaceHero } from "@/components/ui/workspace-hero";
import { getAnalyticsOverview } from "@/lib/analytics";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/lib/models";

function formatAction(action: string) {
  return action.replaceAll(".", " ").replaceAll("_", " ");
}

type AnalyticsPageProps = {
  searchParams?: Promise<{ jobId?: string }>;
};

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const session = await requireSession();
  const params = (searchParams ? await searchParams : {}) ?? {};
  const allJobs = (await db.job.findMany({
    where: { organizationId: session.organizationId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, assignedRecruiterId: true, assignmentHistory: true }
  })) as Array<{ id: string; title: string; assignedRecruiterId?: string | null; assignmentHistory?: Array<{ recruiterId: string }> }>;
  const jobs = session.role === Role.RECRUITER
    ? allJobs.filter((job) => job.assignedRecruiterId === session.id || (job.assignmentHistory ?? []).some((entry) => entry.recruiterId === session.id))
    : allJobs;
  const selectedJobId = params.jobId ?? (session.role === Role.RECRUITER ? jobs[0]?.id ?? "" : "");
  const analytics = await getAnalyticsOverview(session.organizationId, selectedJobId || undefined);

  return (
    <div className="stack-xl workspace-screen-shell">
      <WorkspaceHero
        scene="analytics"
        eyebrow="Hiring insights"
        title="Track funnel movement, source quality, and recruiter delivery from a cleaner analytics view."
        description="The analytics workspace keeps the signal high so leaders and recruiters can review hiring momentum without noise." 
        stats={[
          { label: "Jobs in scope", value: String(analytics.totals.jobs) },
          { label: "Candidates", value: String(analytics.totals.candidates) },
          { label: "Avg. days to hire", value: String(analytics.avgTimeToHireDays) }
        ]}
      />

      <Card className="filter-bar filter-bar-rich">
        <form method="GET" className="filter-bar-inline">
          <select name="jobId" className="input" defaultValue={selectedJobId}>
            <option value="">All visible jobs</option>
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
          <strong>{analytics.selectedJob?.title ?? "All visible jobs"}</strong>
          <span>{analytics.totals.candidates} candidate records in scope</span>
        </div>
      </Card>

      <div className="stats-grid">
        <Card><strong>{analytics.totals.jobs}</strong><span>{selectedJobId ? "Jobs in scope" : "Visible jobs"}</span></Card>
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
          <SectionHeading title="Quality distribution" description="Candidate quality uses a 10-point fit score." />
          <div className="stats-inline">
            <span>Excellent {analytics.qualityBands.excellent}</span>
            <span>Strong {analytics.qualityBands.strong}</span>
            <span>Moderate {analytics.qualityBands.moderate}</span>
            <span>Low {analytics.qualityBands.low}</span>
          </div>
        </Card>
        <Card>
          <SectionHeading title="Recent activity" description="Quick visibility into what changed for the selected scope." />
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

