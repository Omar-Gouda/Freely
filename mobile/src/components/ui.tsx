import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import type { Notice } from "../app-types";
import { palette, radius, spacing } from "../theme";
import { formatLabel } from "../lib/helpers";

export function Field(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric";
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={palette.soft}
        secureTextEntry={props.secureTextEntry}
        keyboardType={props.keyboardType}
        multiline={props.multiline}
        style={[styles.input, props.multiline ? styles.textarea : null]}
      />
    </View>
  );
}

export function Segmented<T extends string>(props: {
  options: T[];
  value: T;
  onChange: (value: T) => void;
  compact?: boolean;
}) {
  return (
    <View style={[styles.segmentWrap, props.compact ? styles.segmentCompact : null]}>
      {props.options.map((option) => {
        const active = option === props.value;
        return (
          <Pressable
            key={option}
            onPress={() => props.onChange(option)}
            style={[styles.segmentButton, active ? styles.segmentButtonActive : null]}
          >
            <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>{formatLabel(option)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Banner({ notice }: { notice: Notice }) {
  if (!notice) return null;

  const backgroundColor = notice.tone === "success" ? palette.successSoft : palette.dangerSoft;
  const color = notice.tone === "success" ? palette.success : palette.danger;

  return (
    <View style={[styles.banner, { backgroundColor }]}>
      <Text style={[styles.bannerText, { color }]}>{notice.message}</Text>
    </View>
  );
}

export function Section(props: { title: string; copy: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{props.title}</Text>
      <Text style={styles.sectionCopy}>{props.copy}</Text>
      <View style={styles.sectionBody}>{props.children}</View>
    </View>
  );
}

export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export function Badge({ text }: { text: string }) {
  const tone = statusTone(text);
  return (
    <View style={[styles.badge, { backgroundColor: tone.backgroundColor }]}>
      <Text style={[styles.badgeText, { color: tone.color }]}>{formatLabel(text)}</Text>
    </View>
  );
}

export function EmptyState({ copy, compact }: { copy: string; compact?: boolean }) {
  return (
    <View style={[styles.emptyState, compact ? styles.emptyStateCompact : null]}>
      <Text style={styles.emptyCopy}>{copy}</Text>
    </View>
  );
}

export function CardRow(props: { title: string; subtitle?: string; meta?: string; badge?: string }) {
  return (
    <View style={styles.rowCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{props.title}</Text>
        {!!props.subtitle && <Text style={styles.cardCopy}>{props.subtitle}</Text>}
        {!!props.meta && <Text style={styles.cardMeta}>{props.meta}</Text>}
      </View>
      {!!props.badge && <Badge text={props.badge} />}
    </View>
  );
}

export function HorizontalChoices(props: { value: string; onChange: (value: string) => void; options: Array<{ id: string; label: string }> }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inlineChoiceWrap}>
      {props.options.map((option) => {
        const active = option.id === props.value;
        return (
          <Pressable key={`${option.id}-${option.label}`} style={[styles.choiceChip, active ? styles.choiceChipActive : null]} onPress={() => props.onChange(option.id)}>
            <Text style={[styles.choiceChipText, active ? styles.choiceChipTextActive : null]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function statusTone(value: string) {
  if (value === "ACTIVE" || value === "OPEN" || value === "HIRED" || value === "COMPLETED" || value === "RESOLVED") {
    return { backgroundColor: palette.successSoft, color: palette.success };
  }

  if (value === "SUSPENDED" || value === "REJECTED" || value === "CANCELLED" || value === "CONTRACT_ENDED") {
    return { backgroundColor: palette.dangerSoft, color: palette.danger };
  }

  if (value === "PENDING_APPROVAL" || value === "ON_HOLD" || value === "WAITING_ON_REQUESTER") {
    return { backgroundColor: palette.warningSoft, color: palette.warning };
  }

  return { backgroundColor: palette.primarySoft, color: palette.primary };
}

export const uiStyles = StyleSheet.create({
  heroCard: {
    backgroundColor: palette.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: palette.line,
    gap: spacing.sm
  },
  headerCard: {
    backgroundColor: palette.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.line,
    gap: spacing.md
  },
  pageTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    color: palette.ink
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
    color: palette.ink
  },
  heroCopy: {
    fontSize: 15,
    lineHeight: 24,
    color: palette.slate
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: palette.primary
  },
  tabStrip: {
    gap: spacing.sm,
    paddingRight: spacing.md
  },
  tabButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line
  },
  tabButtonActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary
  },
  tabText: {
    color: palette.ink,
    fontWeight: "600",
    fontSize: 14
  },
  tabTextActive: {
    color: "#fff"
  }
});

const styles = StyleSheet.create({
  fieldWrap: {
    gap: spacing.xs
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.ink
  },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: palette.ink
  },
  textarea: {
    minHeight: 110,
    textAlignVertical: "top"
  },
  banner: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md
  },
  bannerText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600"
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.line,
    gap: spacing.md
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: palette.ink
  },
  sectionCopy: {
    fontSize: 14,
    lineHeight: 22,
    color: palette.slate
  },
  sectionBody: {
    gap: spacing.md
  },
  metricCard: {
    flexBasis: "47%",
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.line,
    gap: spacing.xs
  },
  metricLabel: {
    fontSize: 12,
    color: palette.slate,
    fontWeight: "600"
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "700",
    color: palette.ink
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700"
  },
  emptyState: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.line,
    borderStyle: "dashed",
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyStateCompact: {
    padding: spacing.md
  },
  emptyCopy: {
    color: palette.slate,
    textAlign: "center",
    lineHeight: 22
  },
  rowCard: {
    flexDirection: "row",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: palette.surface
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    color: palette.ink
  },
  cardCopy: {
    fontSize: 14,
    lineHeight: 22,
    color: palette.slate
  },
  cardMeta: {
    fontSize: 13,
    lineHeight: 20,
    color: palette.soft
  },
  inlineChoiceWrap: {
    gap: spacing.sm,
    paddingRight: spacing.sm
  },
  choiceChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.card
  },
  choiceChipActive: {
    borderColor: palette.primary,
    backgroundColor: palette.primarySoft
  },
  choiceChipText: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "600"
  },
  choiceChipTextActive: {
    color: palette.primary
  },
  segmentWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  segmentCompact: {
    gap: spacing.xs
  },
  segmentButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line
  },
  segmentButtonActive: {
    backgroundColor: palette.primarySoft,
    borderColor: palette.primary
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.ink
  },
  segmentTextActive: {
    color: palette.primary
  }
});
