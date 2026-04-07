import { StyleSheet, View } from "react-native";

import type { AnalyticsOverview, InterviewSlot, NotificationItem } from "../types";
import { CardRow, EmptyState, MetricCard, Section } from "../components/ui";
import { formatDateTime } from "../lib/helpers";
import { spacing } from "../theme";

export function DashboardPanel(props: {
  analytics: AnalyticsOverview | null;
  jobsCount: number;
  candidatesCount: number;
  openSupportCount: number;
  upcomingInterviews: InterviewSlot[];
  notifications: NotificationItem[];
}) {
  return (
    <View style={styles.stack}>
      <Section title="Workspace summary" copy="Key recruiting activity, upcoming interviews, and unread updates.">
        <View style={styles.metricGrid}>
          <MetricCard label="Jobs" value={`${props.analytics?.totals.jobs ?? props.jobsCount}`} />
          <MetricCard label="Candidates" value={`${props.analytics?.totals.candidates ?? props.candidatesCount}`} />
          <MetricCard label="Hired" value={`${props.analytics?.totals.hired ?? 0}`} />
          <MetricCard label="Open support" value={`${props.openSupportCount}`} />
        </View>
      </Section>

      <Section title="Upcoming interviews" copy="The next booked and available interview blocks from your workspace.">
        {props.upcomingInterviews.length ? props.upcomingInterviews.map((slot) => (
          <CardRow
            key={slot.id}
            title={slot.job?.title || "Interview slot"}
            subtitle={`${formatDateTime(slot.startsAt)} to ${formatDateTime(slot.endsAt)}`}
            meta={slot.booking?.candidate ? `${slot.booking.candidate.firstName} ${slot.booking.candidate.lastName}` : "No candidate booked yet"}
            badge={slot.status}
          />
        )) : <EmptyState copy="No upcoming interviews are scheduled yet." />}
      </Section>

      <Section title="Notifications" copy="Recent system and team alerts from the shared workspace.">
        {props.notifications.length ? props.notifications.map((item) => (
          <CardRow key={item.id} title={item.title} subtitle={item.message} meta={formatDateTime(item.createdAt)} badge={item.isRead ? "Read" : "Unread"} />
        )) : <EmptyState copy="No notifications yet." />}
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  }
});
