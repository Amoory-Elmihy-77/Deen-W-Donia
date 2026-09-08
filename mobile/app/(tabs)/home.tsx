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
import { Colors, Spacing, Typography, BorderRadius, PrayerEmojis } from '../../src/constants/theme';
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

function TaskCard({ task, onComplete, onSkip }: {
  task: Task;
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
}) {
  const isDone = task.status === 'completed';
  const isSkipped = task.status === 'skipped';

  return (
    <View style={[styles.taskCard, isDone && styles.taskDone, isSkipped && styles.taskSkipped]}>
      <View style={styles.taskLeft}>
        <Text style={[styles.taskTitle, isDone && styles.strikethrough]}>{task.title}</Text>
        <Text style={styles.taskMeta}>
          {task.scheduledStart ? formatTime(task.scheduledStart) : ''} · {task.duration} دقيقة
        </Text>
      </View>
      {!isDone && !isSkipped && (
        <View style={styles.taskActions}>
          <TouchableOpacity style={styles.completeBtn} onPress={() => onComplete(task._id)}>
            <Text style={styles.completeBtnText}>✓</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipBtn} onPress={() => onSkip(task._id)}>
            <Text style={styles.skipBtnText}>تخطى</Text>
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
          <Text style={styles.appName}>دين ودنيا</Text>
          <Text style={styles.dateText}>{today}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.editTasksBtn} onPress={() => router.push('/daily-tasks' as any)}><Text style={styles.editTasksText}>✏️ مهام اليوم</Text></TouchableOpacity>
          <TouchableOpacity style={styles.morningFlowBtn} onPress={() => router.push({ pathname: '/morning-flow', params: { date, newDay: 'true' } } as any)}><Text style={styles.morningFlowBtnText}>☀️ ابدأ يومًا جديدًا</Text></TouchableOpacity>
        </View>
      </View>

      {/* Progress bar */}
      {totalCount > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>{completedCount}/{totalCount} مهمة</Text>
            <Text style={styles.progressPct}>{Math.round((completedCount / totalCount) * 100)}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(completedCount / totalCount) * 100}%` as any }]} />
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {isLoading && <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />}

        {timelineTasks.length > 0 && <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>الخط الزمني لليوم</Text>
          {timelineTasks.map((task) => <View key={task._id} style={styles.timelineRow}><View style={styles.timelineDot} /><View style={styles.timelineLine} /><Text style={styles.timelineTime}>{formatTime(task.scheduledStart!)}</Text><Text style={styles.timelineTask}>{task.title}</Text></View>)}
        </View>}

        {!isLoading && totalCount === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌅</Text>
            <Text style={styles.emptyTitle}>يومك فاضي</Text>
            <Text style={styles.emptyText}>أضف مهمة لليوم، أو ابدأ يومًا جديدًا لتحميل مهامك المحفوظة لليوم التالي.</Text>
            <View style={styles.emptyActions}><TouchableOpacity style={styles.editTasksBtn} onPress={() => setIsAddingTodayTask(true)}><Text style={styles.editTasksText}>＋ أضف مهمة اليوم</Text></TouchableOpacity><TouchableOpacity style={styles.startBtn} onPress={() => router.push({ pathname: '/morning-flow', params: { date, newDay: 'true' } } as any)}><Text style={styles.startBtnText}>☀️ ابدأ يومًا جديدًا</Text></TouchableOpacity></View>
          </View>
        )}

        {/* Timeline grouped by anchor */}
        {Object.entries(grouped).map(([anchor, tasks]) => (
          <View key={anchor} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEmoji}>{PrayerEmojis[anchor] || '🕐'}</Text>
              <Text style={styles.sectionTitle}>{ANCHOR_LABELS[anchor] || anchor}</Text>
              <View style={styles.divider} />
            </View>
            {tasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onComplete={(id) => completeMutation.mutate(id)}
                onSkip={(id) => skipMutation.mutate(id)}
              />
            ))}
          </View>
        ))}

        <View style={styles.addTodaySection}>
          {isAddingTodayTask ? (
            <View style={styles.addTodayForm}>
              <TextInput
                style={styles.addTodayInput}
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                placeholder="اسم مهمة لليوم فقط"
                placeholderTextColor={Colors.textMuted}
                textAlign="right"
                autoFocus
                onSubmitEditing={() => newTaskTitle.trim() && addTodayTaskMutation.mutate()}
              />
              <View style={styles.addTodayActions}>
                <TouchableOpacity style={styles.cancelAddBtn} onPress={() => { setNewTaskTitle(''); setIsAddingTodayTask(false); }}><Text style={styles.cancelAddText}>إلغاء</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveTodayBtn, (!newTaskTitle.trim() || addTodayTaskMutation.isPending) && styles.disabledBtn]} onPress={() => addTodayTaskMutation.mutate()} disabled={!newTaskTitle.trim() || addTodayTaskMutation.isPending}><Text style={styles.saveTodayText}>{addTodayTaskMutation.isPending ? 'جارٍ الإضافة…' : 'إضافة'}</Text></TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.addTodayBtn} onPress={() => { setIsAddingNextDayTask(false); setIsAddingTodayTask(true); }}><Text style={styles.addTodayBtnText}>＋ أضف مهمة لليوم فقط</Text></TouchableOpacity>
          )}
        </View>

        <View style={styles.nextDaySection}>
          <Text style={styles.nextDayTitle}>مهام الغد</Text>
          <Text style={styles.nextDayHint}>أضف مهامًا ليوم الغد من دون مغادرة يومك الحالي.</Text>
          {nextDayTasks.map((task) => (
            <View key={task._id} style={styles.nextDayTask}>
              <Text style={styles.nextDayTaskTitle}>{task.title}</Text>
              <Text style={styles.nextDayTaskMeta}>{task.duration} دقيقة</Text>
            </View>
          ))}
          {isAddingNextDayTask ? (
            <View style={styles.addTodayForm}>
              <TextInput
                style={styles.addTodayInput}
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                placeholder="اسم مهمة للغد فقط"
                placeholderTextColor={Colors.textMuted}
                textAlign="right"
                autoFocus
                onSubmitEditing={() => newTaskTitle.trim() && addNextDayTaskMutation.mutate()}
              />
              <View style={styles.addTodayActions}>
                <TouchableOpacity style={styles.cancelAddBtn} onPress={() => { setNewTaskTitle(''); setIsAddingNextDayTask(false); }}><Text style={styles.cancelAddText}>إلغاء</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveTodayBtn, (!newTaskTitle.trim() || addNextDayTaskMutation.isPending) && styles.disabledBtn]} onPress={() => addNextDayTaskMutation.mutate()} disabled={!newTaskTitle.trim() || addNextDayTaskMutation.isPending}><Text style={styles.saveTodayText}>{addNextDayTaskMutation.isPending ? 'جارٍ الإضافة…' : 'إضافة للغد'}</Text></TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.addTodayBtn} onPress={() => { setIsAddingTodayTask(false); setIsAddingNextDayTask(true); }}><Text style={styles.addTodayBtnText}>＋ أضف مهمة للغد فقط</Text></TouchableOpacity>
          )}
        </View>

        {/* Rescue My Day */}
        {totalCount > 0 && completedCount < totalCount && (
          <TouchableOpacity
            style={styles.rescueBtn}
            onPress={() => rescueMutation.mutate(60)}
          >
            <Text style={styles.rescueBtnText}>⛑️ Rescue My Day</Text>
            <Text style={styles.rescueBtnSub}>ساعدني أرتب الوقت المتبقي</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  appName: { fontSize: Typography.size.xl, fontWeight: 'bold', color: Colors.primary },
  dateText: { fontSize: Typography.size.sm, color: Colors.textSecondary, marginTop: 2 },
  morningFlowBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  morningFlowBtnText: { color: '#fff', fontSize: Typography.size.sm, fontWeight: '700' },
  headerActions: { flexDirection: 'row-reverse', gap: Spacing.xs },
  editTasksBtn: { borderWidth: 1, borderColor: Colors.primary, minHeight: 34, paddingHorizontal: Spacing.md, paddingVertical: 0, borderRadius: BorderRadius.full, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  editTasksText: { color: Colors.primary, fontSize: Typography.size.xs, fontWeight: '700', lineHeight: 16, includeFontPadding: false },
  progressSection: { padding: Spacing.base, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  progressText: { fontSize: Typography.size.sm, color: Colors.textSecondary },
  progressPct: { fontSize: Typography.size.sm, fontWeight: '700', color: Colors.primary },
  progressBar: { height: 6, backgroundColor: Colors.border, borderRadius: BorderRadius.full },
  progressFill: { height: 6, backgroundColor: Colors.primary, borderRadius: BorderRadius.full },
  scroll: { flex: 1 },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: Spacing.xl },
  emptyEmoji: { fontSize: 60, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.size.xl, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.sm },
  emptyText: { fontSize: Typography.size.base, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl },
  startBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.full },
  startBtnText: { color: '#fff', fontSize: Typography.size.md, fontWeight: '700' },
  emptyActions: { flexDirection: 'row-reverse', gap: Spacing.sm },
  addTodaySection: { margin: Spacing.base },
  addTodayBtn: { borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', backgroundColor: Colors.surface },
  addTodayBtnText: { color: Colors.primary, fontSize: Typography.size.base, fontWeight: '700' },
  addTodayForm: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md },
  addTodayInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.sm, color: Colors.text, fontSize: Typography.size.base, backgroundColor: Colors.bg },
  addTodayActions: { flexDirection: 'row-reverse', gap: Spacing.sm, marginTop: Spacing.sm },
  saveTodayBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: BorderRadius.sm, padding: Spacing.sm, alignItems: 'center' },
  saveTodayText: { color: '#fff', fontWeight: '700' },
  cancelAddBtn: { paddingHorizontal: Spacing.md, justifyContent: 'center' },
  cancelAddText: { color: Colors.textSecondary, fontWeight: '700' },
  disabledBtn: { opacity: 0.6 },
  nextDaySection: { marginHorizontal: Spacing.base, marginTop: Spacing.xl, padding: Spacing.base, backgroundColor: Colors.bg, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border },
  nextDayTitle: { color: Colors.text, fontSize: Typography.size.md, fontWeight: '800', textAlign: 'right' },
  nextDayHint: { color: Colors.textSecondary, fontSize: Typography.size.xs, textAlign: 'right', marginTop: Spacing.xs, marginBottom: Spacing.md },
  nextDayTask: { paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  nextDayTaskTitle: { color: Colors.text, fontWeight: '700', textAlign: 'right' },
  nextDayTaskMeta: { color: Colors.textSecondary, fontSize: Typography.size.xs, textAlign: 'right', marginTop: 2 },
  section: { marginTop: Spacing.base },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, marginBottom: Spacing.sm },
  sectionEmoji: { fontSize: 18, marginRight: Spacing.xs },
  sectionTitle: { fontSize: Typography.size.md, fontWeight: '700', color: Colors.text },
  divider: { flex: 1, height: 1, backgroundColor: Colors.border, marginLeft: Spacing.sm },
  taskCard: {
    backgroundColor: Colors.surface, marginHorizontal: Spacing.base, marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md, padding: Spacing.md, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  taskDone: { opacity: 0.6, backgroundColor: '#F0FDF4' },
  taskSkipped: { opacity: 0.5, backgroundColor: '#F9FAFB' },
  taskLeft: { flex: 1 },
  taskTitle: { fontSize: Typography.size.base, fontWeight: '600', color: Colors.text, textAlign: 'right' },
  strikethrough: { textDecorationLine: 'line-through', color: Colors.textMuted },
  taskMeta: { fontSize: Typography.size.xs, color: Colors.textMuted, marginTop: 2, textAlign: 'right' },
  taskActions: { flexDirection: 'row', gap: Spacing.xs, marginLeft: Spacing.sm },
  completeBtn: {
    backgroundColor: Colors.success, width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  completeBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  skipBtn: { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.sm, height: 36, borderRadius: BorderRadius.sm, alignItems: 'center', justifyContent: 'center' },
  skipBtnText: { fontSize: Typography.size.xs, color: Colors.textSecondary },
  doneBadge: { fontSize: 20 },
  skippedBadge: { fontSize: 20 },
  rescueBtn: {
    margin: Spacing.base, padding: Spacing.base, borderRadius: BorderRadius.md,
    backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: Colors.warning,
    alignItems: 'center',
  },
  rescueBtnText: { fontSize: Typography.size.base, fontWeight: '700', color: '#92400E' },
  rescueBtnSub: { fontSize: Typography.size.xs, color: '#92400E', marginTop: 2 },
  timelineCard: { marginHorizontal: Spacing.base, marginBottom: Spacing.sm, padding: Spacing.base, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border },
  timelineTitle: { color: Colors.text, fontSize: Typography.size.md, fontWeight: '800', textAlign: 'right', marginBottom: Spacing.sm },
  timelineRow: { minHeight: 36, flexDirection: 'row-reverse', alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary, marginHorizontal: Spacing.sm },
  timelineLine: { position: 'absolute', right: 20, top: 23, height: 22, width: 2, backgroundColor: Colors.border },
  timelineTime: { color: Colors.primary, fontSize: Typography.size.xs, width: 78, textAlign: 'right' },
  timelineTask: { flex: 1, color: Colors.text, fontSize: Typography.size.sm, fontWeight: '600', textAlign: 'right' },
});
