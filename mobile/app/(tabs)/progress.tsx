import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { progressApi, aiApi } from '../../src/services/endpoints';
import { Spacing, Typography, BorderRadius } from '../../src/constants/theme';
import { useAppTheme } from '../../src/theme/ThemeProvider';

const CATEGORY_LABELS: Record<string, string> = {
  deen: '🕌 الدين',
  dunya: '🌍 الدنيا',
  health: '🏃 الصحة',
  learning: '📚 التعلم',
  work: '💼 العمل',
};

export default function ProgressScreen() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['weekly-progress'],
    queryFn: () => progressApi.weekly().then((r) => r.data.data),
  });

  const weeklyAiMutation = useMutation({
    mutationFn: () => aiApi.analyzeWeek(),
  });

  const stats = data?.stats;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>تقدمي 📊</Text>
        <Text style={styles.subtitle}>آخر 7 أيام</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />}

        {stats && (
          <>
            {/* Summary */}
            <View style={styles.summaryRow}>
              <View style={[styles.statCard, { backgroundColor: colors.surfaceMuted }]}>
                <Text style={styles.statNum}>{stats.completed}</Text>
                <Text style={styles.statLabel}>✅ مكتملة</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surfaceMuted }]}>
                <Text style={styles.statNum}>{stats.skipped}</Text>
                <Text style={styles.statLabel}>⏭️ متخطاة</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surfaceMuted }]}>
                <Text style={styles.statNum}>{stats.completionRate}%</Text>
                <Text style={styles.statLabel}>📈 الإنجاز</Text>
              </View>
            </View>

            {/* By Category */}
            <Text style={styles.sectionTitle}>التفاصيل حسب الفئة</Text>
            {Object.entries(stats.byCategory as Record<string, { planned: number; completed: number; totalMinutes: number }>).map(([cat, info]) => {
              const pct = info.planned > 0 ? Math.round((info.completed / info.planned) * 100) : 0;
              return (
                <View key={cat} style={styles.catCard}>
                  <View style={styles.catTop}>
                    <Text style={styles.catName}>{CATEGORY_LABELS[cat] || cat}</Text>
                    <Text style={styles.catPct}>{pct}%</Text>
                  </View>
                  <View style={styles.catBar}>
                  <View style={[styles.catFill, { width: `${pct}%` as any, backgroundColor: cat === 'deen' ? colors.deen : colors.primary }]} />
                  </View>
                  <Text style={styles.catDetail}>{info.completed}/{info.planned} مهمة · {info.totalMinutes} دقيقة</Text>
                </View>
              );
            })}

            {/* AI Weekly Insight */}
            <View style={styles.insightCard}>
              <Text style={styles.insightTitle}>💡 تحليل أسبوعي</Text>
              {weeklyAiMutation.data ? (
                <Text style={styles.insightText}>
                  {weeklyAiMutation.data.data?.data?.insight || weeklyAiMutation.data.data?.data?.message}
                </Text>
              ) : (
                <TouchableOpacity
                  style={styles.insightBtn}
                  onPress={() => weeklyAiMutation.mutate()}
                  disabled={weeklyAiMutation.isPending}
                >
                  {weeklyAiMutation.isPending ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.insightBtnText}>🤖 اعرف رأي AI في أسبوعك</Text>}
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: Spacing.base, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: Typography.size.xl, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: Typography.size.sm, color: colors.textSecondary },
  content: { padding: Spacing.base, paddingBottom: 100 },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  statCard: { flex: 1, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  statNum: { fontSize: Typography.size['2xl'], fontWeight: 'bold', color: colors.text },
  statLabel: { fontSize: Typography.size.xs, color: colors.textSecondary, marginTop: Spacing.xs, textAlign: 'center' },
  sectionTitle: { fontSize: Typography.size.md, fontWeight: '700', color: colors.text, marginBottom: Spacing.md, textAlign: 'right' },
  catCard: { backgroundColor: colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 1 },
  catTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  catName: { fontSize: Typography.size.base, fontWeight: '600', color: colors.text },
  catPct: { fontSize: Typography.size.base, fontWeight: '700', color: colors.primary },
  catBar: { height: 6, backgroundColor: colors.border, borderRadius: 3, marginBottom: Spacing.xs },
  catFill: { height: 6, borderRadius: 3 },
  catDetail: { fontSize: Typography.size.xs, color: colors.textMuted, textAlign: 'right' },
  insightCard: { backgroundColor: colors.surface, borderRadius: BorderRadius.md, padding: Spacing.base, marginTop: Spacing.base, borderWidth: 1, borderColor: colors.border },
  insightTitle: { fontSize: Typography.size.md, fontWeight: '700', color: colors.text, marginBottom: Spacing.md },
  insightText: { fontSize: Typography.size.base, color: colors.text, lineHeight: 24, textAlign: 'right' },
  insightBtn: { padding: Spacing.md, alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: BorderRadius.sm },
  insightBtnText: { color: colors.primary, fontWeight: '600', fontSize: Typography.size.base },
});
