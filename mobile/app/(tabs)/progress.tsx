import React, { useState } from 'react';
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
  const { data: historyData, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['task-history'],
    queryFn: () => progressApi.history().then((r) => r.data.data),
  });
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

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
              <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                <Text style={styles.statNum}>{stats.completed}</Text>
                <Text style={styles.statLabel}>✅ مكتملة</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                <Text style={styles.statNum}>{stats.skipped}</Text>
                <Text style={styles.statLabel}>⏭️ متخطاة</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.statNum, { color: colors.primary }]}>{stats.completionRate}%</Text>
                <Text style={styles.statLabel}>📈 الإنجاز</Text>
              </View>
            </View>

            {/* By Category */}
            <Text style={styles.sectionTitle}>التفاصيل حسب الفئة</Text>
            {Object.entries(stats.byCategory as Record<string, { planned: number; completed: number; totalMinutes: number }>).map(([cat, info]) => {
              const pct = info.planned > 0 ? Math.round((info.completed / info.planned) * 100) : 0;
              // Add specific colors for categories
              const catColor = cat === 'deen' ? colors.deen : 
                               cat === 'dunya' ? colors.dunya : 
                               cat === 'health' ? colors.success : 
                               cat === 'work' ? colors.info : 
                               colors.primary;
              return (
                <View key={cat} style={styles.catCard}>
                  <View style={styles.catTop}>
                    <Text style={styles.catName}>{CATEGORY_LABELS[cat] || cat}</Text>
                    <Text style={[styles.catPct, { color: catColor }]}>{pct}%</Text>
                  </View>
                  <View style={styles.catBar}>
                    <View style={[styles.catFill, { width: `${pct}%` as any, backgroundColor: catColor }]} />
                  </View>
                  <Text style={styles.catDetail}>{info.completed}/{info.planned} مهمة · {info.totalMinutes} دقيقة</Text>
                </View>
              );
            })}

            <Text style={styles.sectionTitle}>سجل الأيام السابقة</Text>
            {isHistoryLoading && <ActivityIndicator color={colors.primary} />}
            {!isHistoryLoading && historyData?.days?.length === 0 && <Text style={styles.emptyHistory}>لا توجد مهام من أيام سابقة بعد.</Text>}
            {historyData?.days?.map((day: any) => {
              const completionRate = day.total ? Math.round((day.completed / day.total) * 100) : 0;
              const isExpanded = expandedDate === day.date;
              return (
                <View key={day.date} style={styles.historyCard}>
                  <TouchableOpacity style={styles.historyHeader} onPress={() => setExpandedDate(isExpanded ? null : day.date)} activeOpacity={0.7}>
                    <View>
                      <Text style={styles.historyDate}>{formatHistoryDate(day.date)}</Text>
                      <Text style={styles.historyMeta}>{day.completed}/{day.total} مكتملة · {completionRate}%</Text>
                    </View>
                    <View style={[styles.expandIcon, isExpanded && { transform: [{ rotate: '180deg' }] }]}>
                      <Text style={styles.historyToggle}>▼</Text>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.catBar}>
                    <View style={[styles.catFill, { width: `${completionRate}%` as any, backgroundColor: colors.primary }]} />
                  </View>
                  {isExpanded && day.tasks.map((task: any) => (
                    <View key={task._id} style={styles.historyTask}>
                      <Text style={styles.historyTaskTitle}>{statusEmoji(task.status)} {task.title}</Text>
                      <Text style={styles.historyTaskMeta}>{task.duration} دقيقة{task.anchor && task.anchor !== 'flexible' ? ` · ${anchorLabel(task.anchor)}` : ''}</Text>
                    </View>
                  ))}
                </View>
              );
            })}

            {/* AI Weekly Insight */}
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <Text style={styles.insightEmoji}>💡</Text>
                <Text style={styles.insightTitle}>تحليل أسبوعي</Text>
              </View>
              {weeklyAiMutation.data ? (
                <Text style={styles.insightText}>
                  {weeklyAiMutation.data.data?.data?.insight || weeklyAiMutation.data.data?.data?.message}
                </Text>
              ) : (
                <TouchableOpacity
                  style={styles.insightBtn}
                  onPress={() => weeklyAiMutation.mutate()}
                  disabled={weeklyAiMutation.isPending}
                  activeOpacity={0.8}
                >
                  {weeklyAiMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.insightBtnEmoji}>🤖</Text>
                      <Text style={styles.insightBtnText}>اعرف رأي AI في أسبوعك</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatHistoryDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
}

function statusEmoji(status: string): string {
  return status === 'completed' ? '✅' : status === 'skipped' ? '⏭️' : '○';
}

function anchorLabel(anchor: string): string {
  return ({ after_fajr: 'بعد الفجر', after_dhuhr: 'بعد الظهر', before_asr: 'قبل العصر', after_asr: 'بعد العصر', after_maghrib: 'بعد المغرب', after_isha: 'بعد العشاء', before_sleep: 'قبل النوم' } as Record<string, string>)[anchor] || anchor;
}

const makeStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: Spacing.base, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: Typography.size.xl, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: Typography.size.sm, color: colors.textSecondary },
  content: { padding: Spacing.base, paddingBottom: 100 },
  
  summaryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  statCard: { flex: 1, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statNum: { fontSize: Typography.size['2xl'], fontWeight: 'bold', color: colors.text },
  statLabel: { fontSize: Typography.size.xs, color: colors.textSecondary, marginTop: Spacing.xs, textAlign: 'center', fontWeight: '600' },
  
  sectionTitle: { fontSize: Typography.size.md, fontWeight: '800', color: colors.text, marginBottom: Spacing.md, textAlign: 'right' },
  
  catCard: { backgroundColor: colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: colors.border },
  catTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  catName: { fontSize: Typography.size.base, fontWeight: '700', color: colors.text },
  catPct: { fontSize: Typography.size.base, fontWeight: '800' },
  catBar: { height: 8, backgroundColor: colors.border, borderRadius: 4, marginBottom: Spacing.xs, overflow: 'hidden' },
  catFill: { height: '100%', borderRadius: 4 },
  catDetail: { fontSize: Typography.size.xs, color: colors.textMuted, textAlign: 'right', fontWeight: '600' },
  
  emptyHistory: { color: colors.textSecondary, textAlign: 'right', paddingVertical: Spacing.sm },
  historyCard: { backgroundColor: colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  historyHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  historyDate: { color: colors.text, fontSize: Typography.size.base, fontWeight: '700', textAlign: 'right' },
  historyMeta: { color: colors.textSecondary, fontSize: Typography.size.xs, textAlign: 'right', marginTop: 2 },
  expandIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  historyToggle: { color: colors.textMuted, fontSize: Typography.size.sm },
  historyTask: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: Spacing.sm, marginTop: Spacing.sm },
  historyTaskTitle: { color: colors.text, fontSize: Typography.size.sm, textAlign: 'right', fontWeight: '600' },
  historyTaskMeta: { color: colors.textMuted, fontSize: Typography.size.xs, textAlign: 'right', marginTop: 2 },
  
  insightCard: { backgroundColor: colors.primary + '15', borderRadius: BorderRadius.lg, padding: Spacing.base, marginTop: Spacing.xl, borderWidth: 1, borderColor: colors.primary },
  insightHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: Spacing.md },
  insightEmoji: { fontSize: 24, marginLeft: Spacing.sm },
  insightTitle: { fontSize: Typography.size.lg, fontWeight: '800', color: colors.primary },
  insightText: { fontSize: Typography.size.base, color: colors.text, lineHeight: 24, textAlign: 'right', fontWeight: '500' },
  insightBtn: { flexDirection: 'row-reverse', justifyContent: 'center', padding: Spacing.md, alignItems: 'center', backgroundColor: colors.primary, borderRadius: BorderRadius.md, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  insightBtnEmoji: { fontSize: 20, marginLeft: Spacing.sm },
  insightBtnText: { color: '#fff', fontWeight: '800', fontSize: Typography.size.base },
});
