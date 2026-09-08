import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tasksApi, plannerApi } from '../../src/services/endpoints';
import { useDayStore } from '../../src/stores/useDayStore';
import { Spacing, Typography, BorderRadius, PrayerEmojis } from '../../src/constants/theme';
import { useAppTheme } from '../../src/theme/ThemeProvider';

interface Task {
  _id: string;
  title: string;
  category: string;
  duration: number;
  status: string;
  scheduledStart?: string;
  anchor?: string;
}

const ANCHOR_LABELS: Record<string, string> = {
  after_fajr: 'بعد الفجر',
  morning: 'الصباح',
  after_dhuhr: 'بعد الظهر',
  afternoon: 'بعد الظهر',
  after_asr: 'بعد العصر',
  late_afternoon: 'آخر العصر',
  after_maghrib: 'بعد المغرب',
  after_isha: 'بعد العشاء',
  before_sleep: 'قبل النوم',
};

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function TaskCard({ task, onComplete, onSkip, colors, styles }: {
  task: Task;
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
  colors: any;
  styles: any;
}) {
  const isDone = task.status === 'completed';
  const isSkipped = task.status === 'skipped';

  return (
    <View style={[
      styles.taskCard,
      { backgroundColor: colors.card, borderColor: colors.border },
      isDone && { backgroundColor: colors.successBg, opacity: 0.8 },
      isSkipped && { backgroundColor: colors.surfaceMuted, opacity: 0.7 }
    ]}>
      <View style={styles.taskLeft}>
        <Text style={[styles.taskTitle, { color: colors.text }, isDone && styles.strikethrough]}>{task.title}</Text>
        <Text style={[styles.taskMeta, { color: colors.textMuted }]}>
          {task.scheduledStart ? formatTime(task.scheduledStart) : ''} · {task.duration} دقيقة
        </Text>
      </View>
      {!isDone && !isSkipped && (
        <View style={styles.taskActions}>
          <TouchableOpacity style={[styles.completeBtn, { backgroundColor: colors.success }]} onPress={() => onComplete(task._id)} activeOpacity={0.7}>
            <Text style={styles.completeBtnText}>✓</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.skipBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]} onPress={() => onSkip(task._id)} activeOpacity={0.7}>
            <Text style={[styles.skipBtnText, { color: colors.textSecondary }]}>تخطى</Text>
          </TouchableOpacity>
        </View>
      )}
      {isDone && <Text style={styles.doneBadge}>✅</Text>}
      {isSkipped && <Text style={styles.skippedBadge}>⏭️</Text>}
    </View>
  );
}

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { date } = useDayStore();
  const [isAddingTodayTask, setIsAddingTodayTask] = useState(false);
  const [isAddingNextDayTask, setIsAddingNextDayTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const nextDate = addDays(date, 1);

  const today = new Date(`${date}T12:00:00`).toLocaleDateString('ar-EG', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tasks-today', date],
    queryFn: () => tasksApi.getToday(date).then((r) => r.data.data as Task[]),
  });

  const { data: nextDayTasks = [] } = useQuery({
    queryKey: ['tasks-next-day', nextDate],
    queryFn: () => tasksApi.getToday(nextDate).then((r) => r.data.data as Task[]),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => tasksApi.complete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks-today'] }),
  });

  const skipMutation = useMutation({
    mutationFn: (id: string) => tasksApi.skip(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks-today'] }),
  });

  const addTodayTaskMutation = useMutation({
    mutationFn: () => tasksApi.createDaily({ title: newTaskTitle.trim(), date, duration: 30 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-today'] });
      setNewTaskTitle('');
      setIsAddingTodayTask(false);
    },
    onError: () => Alert.alert('تعذر إضافة المهمة', 'اكتب اسم المهمة وحاول مرة أخرى.'),
  });

  const addNextDayTaskMutation = useMutation({
    mutationFn: () => tasksApi.createDaily({ title: newTaskTitle.trim(), date: nextDate, duration: 30 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-next-day'] });
      setNewTaskTitle('');
      setIsAddingNextDayTask(false);
    },
    onError: () => Alert.alert('تعذر إضافة المهمة', 'اكتب اسم المهمة وحاول مرة أخرى.'),
  });

  const rescueMutation = useMutation({
    mutationFn: (mins: number) => plannerApi.rescueDay({ availableMinutes: mins }),
    onSuccess: (res) => {
      const suggested = res.data.data?.suggested || [];
      Alert.alert(
        '⛑️ Rescue My Day',
        suggested.length > 0
          ? `اقتراح:\n${suggested.map((t: { title: string; duration: number }) => `• ${t.title} (${t.duration} د)`).join('\n')}`
          : 'مفيش وقت كافي للمهام المتبقية',
      );
    },
  });

  // Group tasks by anchor
  const grouped = (data || []).reduce((acc, task) => {
    const key = task.anchor || 'flexible';
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const completedCount = (data || []).filter((t) => t.status === 'completed').length;
  const totalCount = data?.length || 0;
  const timelineTasks = useMemo(() => [...(data || [])].filter((task) => task.scheduledStart).sort((a, b) => new Date(a.scheduledStart!).getTime() - new Date(b.scheduledStart!).getTime()), [data]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.appName, { color: colors.primary }]}>دين ودنيا</Text>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>{today}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={[styles.editTasksBtn, { borderColor: colors.primary, backgroundColor: colors.surface }]} onPress={() => router.push('/daily-tasks' as any)} activeOpacity={0.7}>
            <Text style={[styles.editTasksText, { color: colors.primary }]}>✏️ مهام اليوم</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.morningFlowBtn, { backgroundColor: colors.primary }]} onPress={() => router.push({ pathname: '/morning-flow', params: { date, newDay: 'true' } } as any)} activeOpacity={0.85}>
            <Text style={styles.morningFlowBtnText}>☀️ ابدأ يومًا جديدًا</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress bar */}
      {totalCount > 0 && (
        <View style={[styles.progressSection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>{completedCount}/{totalCount} مهمة</Text>
            <Text style={[styles.progressPct, { color: colors.primary }]}>{Math.round((completedCount / totalCount) * 100)}%</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${(completedCount / totalCount) * 100}%` as any }]} />
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {isLoading && <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />}

        {timelineTasks.length > 0 && <View style={[styles.timelineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.timelineTitle, { color: colors.text }]}>الخط الزمني لليوم</Text>
          {timelineTasks.map((task) => (
            <View key={task._id} style={styles.timelineRow}>
              <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
              <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.timelineTime, { color: colors.primary }]}>{formatTime(task.scheduledStart!)}</Text>
              <Text style={[styles.timelineTask, { color: colors.text }]}>{task.title}</Text>
            </View>
          ))}
        </View>}

        {!isLoading && totalCount === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌅</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>يومك فاضي</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>أضف مهمة لليوم، أو ابدأ يومًا جديدًا لتحميل مهامك المحفوظة لليوم التالي.</Text>
            <View style={styles.emptyActions}>
              <TouchableOpacity style={[styles.editTasksBtn, { borderColor: colors.primary, backgroundColor: colors.surface }]} onPress={() => setIsAddingTodayTask(true)} activeOpacity={0.7}>
                <Text style={[styles.editTasksText, { color: colors.primary }]}>＋ أضف مهمة اليوم</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.startBtn, { backgroundColor: colors.primary }]} onPress={() => router.push({ pathname: '/morning-flow', params: { date, newDay: 'true' } } as any)} activeOpacity={0.85}>
                <Text style={styles.startBtnText}>☀️ ابدأ يومًا جديدًا</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Timeline grouped by anchor */}
        {Object.entries(grouped).map(([anchor, tasks]) => (
          <View key={anchor} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEmoji}>{PrayerEmojis[anchor] || '🕐'}</Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{ANCHOR_LABELS[anchor] || anchor}</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </View>
            {tasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onComplete={(id) => completeMutation.mutate(id)}
                onSkip={(id) => skipMutation.mutate(id)}
                colors={colors}
                styles={styles}
              />
            ))}
          </View>
        ))}

        <View style={styles.addTodaySection}>
          {isAddingTodayTask ? (
            <View style={[styles.addTodayForm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.addTodayInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                placeholder="اسم مهمة لليوم فقط"
                placeholderTextColor={colors.textMuted}
                textAlign="right"
                autoFocus
                onSubmitEditing={() => newTaskTitle.trim() && addTodayTaskMutation.mutate()}
              />
              <View style={styles.addTodayActions}>
                <TouchableOpacity style={styles.cancelAddBtn} onPress={() => { setNewTaskTitle(''); setIsAddingTodayTask(false); }}>
                  <Text style={[styles.cancelAddText, { color: colors.textSecondary }]}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveTodayBtn, { backgroundColor: colors.primary }, (!newTaskTitle.trim() || addTodayTaskMutation.isPending) && styles.disabledBtn]} onPress={() => addTodayTaskMutation.mutate()} disabled={!newTaskTitle.trim() || addTodayTaskMutation.isPending}>
                  <Text style={styles.saveTodayText}>{addTodayTaskMutation.isPending ? 'جارٍ الإضافة…' : 'إضافة'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={[styles.addTodayBtn, { borderColor: colors.primary, backgroundColor: colors.surface }]} onPress={() => { setIsAddingNextDayTask(false); setIsAddingTodayTask(true); }} activeOpacity={0.7}>
              <Text style={[styles.addTodayBtnText, { color: colors.primary }]}>＋ أضف مهمة لليوم فقط</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.nextDaySection, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
          <Text style={[styles.nextDayTitle, { color: colors.text }]}>مهام الغد</Text>
          <Text style={[styles.nextDayHint, { color: colors.textSecondary }]}>أضف مهامًا ليوم الغد من دون مغادرة يومك الحالي.</Text>
          {nextDayTasks.map((task) => (
            <View key={task._id} style={[styles.nextDayTask, { borderTopColor: colors.border }]}>
              <Text style={[styles.nextDayTaskTitle, { color: colors.text }]}>{task.title}</Text>
              <Text style={[styles.nextDayTaskMeta, { color: colors.textSecondary }]}>{task.duration} دقيقة</Text>
            </View>
          ))}
          {isAddingNextDayTask ? (
            <View style={[styles.addTodayForm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.addTodayInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                placeholder="اسم مهمة للغد فقط"
                placeholderTextColor={colors.textMuted}
                textAlign="right"
                autoFocus
                onSubmitEditing={() => newTaskTitle.trim() && addNextDayTaskMutation.mutate()}
              />
              <View style={styles.addTodayActions}>
                <TouchableOpacity style={styles.cancelAddBtn} onPress={() => { setNewTaskTitle(''); setIsAddingNextDayTask(false); }}>
                  <Text style={[styles.cancelAddText, { color: colors.textSecondary }]}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveTodayBtn, { backgroundColor: colors.primary }, (!newTaskTitle.trim() || addNextDayTaskMutation.isPending) && styles.disabledBtn]} onPress={() => addNextDayTaskMutation.mutate()} disabled={!newTaskTitle.trim() || addNextDayTaskMutation.isPending}>
                  <Text style={styles.saveTodayText}>{addNextDayTaskMutation.isPending ? 'جارٍ الإضافة…' : 'إضافة للغد'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={[styles.addTodayBtn, { borderColor: colors.primary, backgroundColor: colors.surface }]} onPress={() => { setIsAddingTodayTask(false); setIsAddingNextDayTask(true); }} activeOpacity={0.7}>
              <Text style={[styles.addTodayBtnText, { color: colors.primary }]}>＋ أضف مهمة للغد فقط</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Rescue My Day */}
        {totalCount > 0 && completedCount < totalCount && (
          <TouchableOpacity
            style={[styles.rescueBtn, { backgroundColor: colors.warningBg, borderColor: colors.warning }]}
            onPress={() => rescueMutation.mutate(60)}
            activeOpacity={0.8}
          >
            <Text style={[styles.rescueBtnText, { color: colors.warningText }]}>⛑️ Rescue My Day</Text>
            <Text style={[styles.rescueBtnSub, { color: colors.warningText }]}>ساعدني أرتب الوقت المتبقي</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function addDays(date: string, days: number): string {
  const result = new Date(`${date}T12:00:00`);
  result.setDate(result.getDate() + days);
  return result.toISOString().slice(0, 10);
}

const makeStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  appName: { fontSize: Typography.size.xl, fontWeight: 'bold' },
  dateText: { fontSize: Typography.size.sm, marginTop: 2 },
  morningFlowBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  morningFlowBtnText: { color: '#fff', fontSize: Typography.size.sm, fontWeight: '700' },
  headerActions: { flexDirection: 'row-reverse', gap: Spacing.xs },
  editTasksBtn: { borderWidth: 1, minHeight: 34, paddingHorizontal: Spacing.md, paddingVertical: 0, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
  editTasksText: { fontSize: Typography.size.xs, fontWeight: '700', lineHeight: 16, includeFontPadding: false },
  progressSection: { padding: Spacing.base, borderBottomWidth: 1 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  progressText: { fontSize: Typography.size.sm },
  progressPct: { fontSize: Typography.size.sm, fontWeight: '700' },
  progressBar: { height: 6, borderRadius: BorderRadius.full },
  progressFill: { height: 6, borderRadius: BorderRadius.full },
  scroll: { flex: 1 },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: Spacing.xl },
  emptyEmoji: { fontSize: 60, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.size.xl, fontWeight: 'bold', marginBottom: Spacing.sm },
  emptyText: { fontSize: Typography.size.base, textAlign: 'center', marginBottom: Spacing.xl },
  startBtn: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.full },
  startBtnText: { color: '#fff', fontSize: Typography.size.md, fontWeight: '700' },
  emptyActions: { flexDirection: 'row-reverse', gap: Spacing.sm },
  addTodaySection: { margin: Spacing.base },
  addTodayBtn: { borderWidth: 1, borderStyle: 'dashed', borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  addTodayBtnText: { fontSize: Typography.size.base, fontWeight: '700' },
  addTodayForm: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md },
  addTodayInput: { borderWidth: 1, borderRadius: BorderRadius.sm, padding: Spacing.sm, fontSize: Typography.size.base },
  addTodayActions: { flexDirection: 'row-reverse', gap: Spacing.sm, marginTop: Spacing.sm },
  saveTodayBtn: { flex: 1, borderRadius: BorderRadius.sm, padding: Spacing.sm, alignItems: 'center' },
  saveTodayText: { color: '#fff', fontWeight: '700' },
  cancelAddBtn: { paddingHorizontal: Spacing.md, justifyContent: 'center' },
  cancelAddText: { fontWeight: '700' },
  disabledBtn: { opacity: 0.6 },
  nextDaySection: { marginHorizontal: Spacing.base, marginTop: Spacing.xl, padding: Spacing.base, borderRadius: BorderRadius.lg, borderWidth: 1 },
  nextDayTitle: { fontSize: Typography.size.md, fontWeight: '800', textAlign: 'right' },
  nextDayHint: { fontSize: Typography.size.xs, textAlign: 'right', marginTop: Spacing.xs, marginBottom: Spacing.md },
  nextDayTask: { paddingVertical: Spacing.sm, borderTopWidth: 1 },
  nextDayTaskTitle: { fontWeight: '700', textAlign: 'right' },
  nextDayTaskMeta: { fontSize: Typography.size.xs, textAlign: 'right', marginTop: 2 },
  section: { marginTop: Spacing.base },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, marginBottom: Spacing.sm },
  sectionEmoji: { fontSize: 18, marginRight: Spacing.xs },
  sectionTitle: { fontSize: Typography.size.md, fontWeight: '700' },
  divider: { flex: 1, height: 1, marginLeft: Spacing.sm },
  taskCard: {
    marginHorizontal: Spacing.base, marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md, padding: Spacing.md, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  taskLeft: { flex: 1 },
  taskTitle: { fontSize: Typography.size.base, fontWeight: '600', textAlign: 'right' },
  strikethrough: { textDecorationLine: 'line-through' },
  taskMeta: { fontSize: Typography.size.xs, marginTop: 2, textAlign: 'right' },
  taskActions: { flexDirection: 'row', gap: Spacing.xs, marginLeft: Spacing.sm },
  completeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  completeBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  skipBtn: { borderWidth: 1, paddingHorizontal: Spacing.sm, height: 36, borderRadius: BorderRadius.sm, alignItems: 'center', justifyContent: 'center' },
  skipBtnText: { fontSize: Typography.size.xs },
  doneBadge: { fontSize: 20 },
  skippedBadge: { fontSize: 20 },
  rescueBtn: {
    margin: Spacing.base, padding: Spacing.base, borderRadius: BorderRadius.md,
    borderWidth: 1, alignItems: 'center',
  },
  rescueBtnText: { fontSize: Typography.size.base, fontWeight: '700' },
  rescueBtnSub: { fontSize: Typography.size.xs, marginTop: 2 },
  timelineCard: { marginHorizontal: Spacing.base, marginBottom: Spacing.sm, padding: Spacing.base, borderRadius: BorderRadius.lg, borderWidth: 1 },
  timelineTitle: { fontSize: Typography.size.md, fontWeight: '800', textAlign: 'right', marginBottom: Spacing.sm },
  timelineRow: { minHeight: 36, flexDirection: 'row-reverse', alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginHorizontal: Spacing.sm },
  timelineLine: { position: 'absolute', right: 20, top: 23, height: 22, width: 2 },
  timelineTime: { fontSize: Typography.size.xs, width: 78, textAlign: 'right' },
  timelineTask: { flex: 1, fontSize: Typography.size.sm, fontWeight: '600', textAlign: 'right' },
});
