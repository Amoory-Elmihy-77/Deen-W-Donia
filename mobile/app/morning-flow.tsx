import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { goalsApi, plannerApi, routinesApi } from '../src/services/endpoints';
import { useDayStore } from '../src/stores/useDayStore';
import { Spacing, Typography, BorderRadius, DayModeInfo } from '../src/constants/theme';
import { useAppTheme } from '../src/theme/ThemeProvider';

type DayMode = 'normal' | 'busy' | 'study' | 'deep_work' | 'recovery';
interface Routine { _id: string; title: string; goalId?: string; duration: number; enabled: boolean; frequency: 'daily' | 'weekly' | 'custom'; activeDays: number[] }
interface Goal { _id: string; title: string }

const QUICK_WAKE_TIMES = ['05:00', '05:30', '06:00', '06:30', '07:00', '07:30', '08:00'];
const STEPS = ['wake', 'mode', 'events', 'routines'] as const;
type Step = typeof STEPS[number];

function getNow(): string {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function StepProgress({ current, colors }: { current: Step; colors: any }) {
  const labels = ['الاستيقاظ', 'نوع اليوم', 'الأحداث', 'الروتينات'];
  const currentIndex = STEPS.indexOf(current);
  return (
    <View style={{ paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, paddingBottom: Spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
        {STEPS.map((step, index) => {
          const isDone = index < currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <React.Fragment key={step}>
              <View style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: isDone || isCurrent ? colors.primary : colors.border,
                alignItems: 'center', justifyContent: 'center',
              }}>
                {isDone
                  ? <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>
                  : <Text style={{ color: isCurrent ? '#fff' : colors.textMuted, fontSize: 12, fontWeight: '700' }}>{index + 1}</Text>
                }
              </View>
              {index < STEPS.length - 1 && (
                <View style={{ flex: 1, height: 2, backgroundColor: index < currentIndex ? colors.primary : colors.border, maxWidth: 40 }} />
              )}
            </React.Fragment>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs, paddingHorizontal: 0 }}>
        {labels.map((label, index) => (
          <Text
            key={label}
            style={{ fontSize: 9, color: index === currentIndex ? colors.primary : colors.textMuted, fontWeight: index === currentIndex ? '700' : '400', width: 55, textAlign: 'center' }}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function MorningFlowScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { date: requestedDate, newDay } = useLocalSearchParams<{ date?: string; newDay?: string }>();
  const queryClient = useQueryClient();
  const { date, setDate, setWakeTime, setDayMode, setIsPlanned } = useDayStore();
  const targetDate = typeof requestedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : date;
  const isStartingNewDay = newDay === 'true';

  const [step, setStep] = useState<Step>('wake');
  const [selectedWake, setSelectedWake] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<DayMode>('normal');
  const [fixedEvents, setFixedEvents] = useState<Array<{ title: string; start: string; durationMinutes: number }>>([]);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventDuration, setNewEventDuration] = useState('60');
  const [routineTaskTitles, setRoutineTaskTitles] = useState<Record<string, string>>({});
  const [routineTaskProgress, setRoutineTaskProgress] = useState<Record<string, string>>({});
  const [routineTaskTimes, setRoutineTaskTimes] = useState<Record<string, string>>({});

  const { data: routines = [] } = useQuery({ queryKey: ['routines'], queryFn: () => routinesApi.list().then((r) => r.data.data as Routine[]) });
  const { data: goals = [] } = useQuery({ queryKey: ['goals', 'active'], queryFn: () => goalsApi.list({ status: 'active' }).then((r) => r.data.data as Goal[]) });
  const targetDayOfWeek = new Date(`${targetDate}T12:00:00`).getDay();
  const activeRoutines = routines.filter((routine) => routine.enabled && (routine.frequency === 'daily' || routine.activeDays.includes(targetDayOfWeek)));
  const goalTitleFor = (routine: Routine) => goals.find((goal) => goal._id === routine.goalId)?.title || routine.title;

  const buildMutation = useMutation({
    mutationFn: () =>
      plannerApi.buildDay({
        wakeTime: selectedWake,
        dayMode: selectedMode,
        fixedEvents,
        routineTasks: activeRoutines.map((routine) => ({
          routineId: routine._id,
          title: routineTaskTitles[routine._id].trim(),
          goalProgressDelta: Number(routineTaskProgress[routine._id] || 0),
          startTime: routineTaskTimes[routine._id].trim(),
        })),
        date: targetDate,
      }),
    onSuccess: (res) => {
      if (isStartingNewDay) setDate(targetDate);
      setWakeTime(selectedWake);
      setDayMode(selectedMode as DayMode);
      setIsPlanned(true);
      queryClient.invalidateQueries({ queryKey: ['tasks-today'] });
      const conflicts = res.data.data?.conflicts || [];
      const conflictMessage = conflicts.length
        ? `\n\nتنبيه: ${conflicts.map((c: { taskTitle: string }) => c.taskTitle).join('، ')} لم تُضف بسبب تعارض في الوقت.`
        : '';
      Alert.alert('✅ يومك جاهز!', `تم بناء خطة يومك بناءً على وقت استيقاظك، نوع يومك، والتزاماتك الثابتة.${conflictMessage}`, [
        { text: 'عظيم!', onPress: () => router.replace('/(tabs)/home') },
      ]);
    },
    onError: () => Alert.alert('خطأ في البناء', 'حصل مشكلة في بناء الخطة. تأكد من الاتصال بالإنترنت وحاول مرة أخرى.'),
  });

  function addEvent() {
    if (!newEventTitle || !newEventTime) return;
    setFixedEvents((prev) => [
      ...prev,
      { title: newEventTitle, start: newEventTime, durationMinutes: parseInt(newEventDuration) || 60 },
    ]);
    setNewEventTitle('');
    setNewEventTime('');
    setNewEventDuration('60');
  }

  const styles = makeStyles(colors);

  // ── Step 1: Wake Time ──────────────────────────────────────────────────────
  if (step === 'wake') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.backText, { color: colors.primary }]}>← رجوع</Text>
          </TouchableOpacity>
          <StepProgress current="wake" colors={colors} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.greeting, { color: colors.text }]}>{isStartingNewDay ? 'يوم جديد ☀️' : 'صباح الخير ☀️'}</Text>
          <Text style={[styles.question, { color: colors.text }]}>صحيت الساعة كام؟</Text>

          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.primary }]}
            onPress={() => { setSelectedWake(getNow()); setStep('mode'); }}
            activeOpacity={0.85}
          >
            <Text style={styles.quickBtnPrimaryText}>⚡ صحيت دلوقتي ({getNow()})</Text>
          </TouchableOpacity>

          <Text style={[styles.orText, { color: colors.textMuted }]}>أو اختار وقت</Text>

          <View style={styles.timeGrid}>
            {QUICK_WAKE_TIMES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.timeChip, { backgroundColor: colors.card, borderColor: selectedWake === t ? colors.primary : colors.border },
                  selectedWake === t && { backgroundColor: colors.primary }]}
                onPress={() => setSelectedWake(t)}
                activeOpacity={0.75}
              >
                <Text style={[styles.timeChipText, { color: selectedWake === t ? '#fff' : colors.text },
                  selectedWake === t && { fontWeight: '700' }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={[styles.customTimeInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
            placeholder="وقت مخصص (HH:MM)"
            placeholderTextColor={colors.textMuted}
            value={selectedWake}
            onChangeText={setSelectedWake}
            keyboardType="numbers-and-punctuation"
            textAlign="center"
          />

          {selectedWake ? (
            <TouchableOpacity style={[styles.nextBtn, { backgroundColor: colors.primary }]} onPress={() => setStep('mode')} activeOpacity={0.85}>
              <Text style={styles.nextBtnText}>التالي ←</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Step 2: Day Mode ────────────────────────────────────────────────────────
  if (step === 'mode') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep('wake')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.backText, { color: colors.primary }]}>← رجوع</Text>
          </TouchableOpacity>
          <StepProgress current="mode" colors={colors} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.question, { color: colors.text }]}>إيه شكل يومك {isStartingNewDay ? 'الجديد' : 'النهاردة'}؟</Text>

          {(Object.entries(DayModeInfo) as [DayMode, typeof DayModeInfo[string]][]).map(([mode, info]) => (
            <TouchableOpacity
              key={mode}
              style={[styles.modeCard, { backgroundColor: colors.card, borderColor: selectedMode === mode ? info.color : colors.border },
                selectedMode === mode && { borderWidth: 2 }]}
              onPress={() => setSelectedMode(mode)}
              activeOpacity={0.8}
            >
              <Text style={styles.modeEmoji}>{info.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modeLabel, { color: colors.text }]}>{info.labelAr}</Text>
                <Text style={[styles.modeLabelEn, { color: colors.textSecondary }]}>{info.label}</Text>
              </View>
              {selectedMode === mode && (
                <View style={[styles.modeCheck, { backgroundColor: info.color }]}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={[styles.nextBtn, { backgroundColor: colors.primary }]} onPress={() => setStep('events')} activeOpacity={0.85}>
            <Text style={styles.nextBtnText}>التالي ←</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Step 3: Fixed Events ────────────────────────────────────────────────────
  if (step === 'events') return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep('mode')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.backText, { color: colors.primary }]}>← رجوع</Text>
        </TouchableOpacity>
        <StepProgress current="events" colors={colors} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.question, { color: colors.text }]}>عندك أي التزامات ثابتة؟</Text>
        <Text style={[styles.subtext, { color: colors.textSecondary }]}>
          مثل: شغل، جامعة، موعد طبيب — اختياري
        </Text>

        {/* Add event form */}
        <View style={[styles.addEventCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.eventInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
            placeholder="اسم الحدث"
            placeholderTextColor={colors.textMuted}
            value={newEventTitle}
            onChangeText={setNewEventTitle}
            textAlign="right"
          />
          <View style={styles.eventRow}>
            <TextInput
              style={[styles.eventInput, { flex: 1, backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              placeholder="الوقت HH:MM"
              placeholderTextColor={colors.textMuted}
              value={newEventTime}
              onChangeText={setNewEventTime}
              keyboardType="numbers-and-punctuation"
            />
            <TextInput
              style={[styles.eventInput, { flex: 1, marginLeft: Spacing.sm, backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              placeholder="المدة (دقيقة)"
              placeholderTextColor={colors.textMuted}
              value={newEventDuration}
              onChangeText={setNewEventDuration}
              keyboardType="number-pad"
            />
          </View>
          <TouchableOpacity
            style={[styles.addEventBtn, { borderColor: colors.primary, backgroundColor: colors.surfaceMuted }]}
            onPress={addEvent}
            activeOpacity={0.8}
          >
            <Text style={[styles.addEventBtnText, { color: colors.primary }]}>+ أضف الحدث</Text>
          </TouchableOpacity>
        </View>

        {/* Events list */}
        {fixedEvents.map((ev, i) => (
          <View key={i} style={[styles.eventItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.eventItemText, { color: colors.text }]}>🕐 {ev.start} — {ev.title} ({ev.durationMinutes} د)</Text>
            <TouchableOpacity onPress={() => setFixedEvents((p) => p.filter((_, j) => j !== i))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ color: colors.error, fontSize: 18, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.buildBtn, { backgroundColor: colors.primary }]}
          onPress={() => setStep('routines')}
          activeOpacity={0.85}
        >
          <Text style={styles.buildBtnText}>التالي: مهام الروتين</Text>
          <Text style={styles.buildBtnSub}>اختر المهمة المحددة التي ستنفذها لكل روتين اليوم</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  // ── Step 4: Routine task details ────────────────────────────────────────────
  const routineTasksComplete = activeRoutines.every((routine) => {
    const progress = Number(routineTaskProgress[routine._id] || 0);
    return routineTaskTitles[routine._id]?.trim() &&
      /^\d{2}:\d{2}$/.test(routineTaskTimes[routine._id]?.trim() || '') &&
      Number.isFinite(progress) && progress >= 0 && progress <= 100;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep('events')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.backText, { color: colors.primary }]}>← رجوع</Text>
        </TouchableOpacity>
        <StepProgress current="routines" colors={colors} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.question, { color: colors.text }]}>ماذا ستفعل في روتينك اليوم؟</Text>
        <Text style={[styles.subtext, { color: colors.textSecondary }]}>
          اختر مهمة محددة لكل روتين. المدة والهدف مأخوذان من قالب الروتين.
        </Text>
        {activeRoutines.map((routine) => (
          <View key={routine._id} style={[styles.routineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.routineQuestion, { color: colors.text }]}>
              ماذا تريد أن تفعل اليوم لهدف {goalTitleFor(routine)}؟
            </Text>
            <Text style={[styles.routineMeta, { color: colors.textSecondary }]}>{routine.duration} دقيقة</Text>
            <TextInput
              style={[styles.eventInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              placeholder={`مثال: ${goalTitleFor(routine) === 'Sports' ? 'Run 3 kilometers' : 'اكتب المهمة المحددة'}`}
              placeholderTextColor={colors.textMuted}
              value={routineTaskTitles[routine._id] || ''}
              onChangeText={(title) => setRoutineTaskTitles((current) => ({ ...current, [routine._id]: title }))}
              textAlign="right"
            />
            <TextInput
              style={[styles.progressInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              placeholder="وقت المهمة الذي تختاره (HH:MM) مثل 14:30"
              placeholderTextColor={colors.textMuted}
              value={routineTaskTimes[routine._id] || ''}
              onChangeText={(time) => setRoutineTaskTimes((current) => ({ ...current, [routine._id]: time }))}
              keyboardType="numbers-and-punctuation"
              textAlign="right"
            />
            <TextInput
              style={[styles.progressInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              placeholder="نسبة التقدم لهذا الهدف اليوم (٪)"
              placeholderTextColor={colors.textMuted}
              value={routineTaskProgress[routine._id] || ''}
              onChangeText={(progress) => setRoutineTaskProgress((current) => ({ ...current, [routine._id]: progress }))}
              keyboardType="decimal-pad"
              textAlign="right"
            />
          </View>
        ))}
        {activeRoutines.length === 0 && (
          <View style={[styles.noRoutinesBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
            <Text style={{ fontSize: 32, textAlign: 'center', marginBottom: Spacing.sm }}>🔄</Text>
            <Text style={[styles.noRoutines, { color: colors.textSecondary }]}>
              لا توجد روتينات محفوظة. يمكنك بدء اليوم الآن مباشرةً.
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.buildBtn, { backgroundColor: colors.primary },
            (!routineTasksComplete || buildMutation.isPending) && styles.btnDisabled]}
          onPress={() => buildMutation.mutate()}
          disabled={!routineTasksComplete || buildMutation.isPending}
          activeOpacity={0.85}
        >
          {buildMutation.isPending
            ? <ActivityIndicator color="#fff" />
            : <>
              <Text style={styles.buildBtnText}>{isStartingNewDay ? '☀️ ابدأ اليوم الجديد' : '🏗️ ابني يومي'}</Text>
              <Text style={styles.buildBtnSub}>سيتم إنشاء مهام اليوم بهذه التفاصيل</Text>
            </>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  container: { flex: 1 },
  topBar: { borderBottomWidth: 1, paddingTop: Spacing.xs },
  backBtn: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.xs },
  backText: { fontSize: Typography.size.base, fontWeight: '600' },
  content: { padding: Spacing.base, paddingBottom: 60 },
  greeting: { fontSize: Typography.size['2xl'], fontWeight: 'bold', textAlign: 'center', marginBottom: Spacing.sm },
  question: { fontSize: Typography.size.xl, fontWeight: 'bold', textAlign: 'center', marginBottom: Spacing.xl },
  subtext: { fontSize: Typography.size.sm, textAlign: 'center', marginBottom: Spacing.base, marginTop: -Spacing.md, lineHeight: 20 },
  quickBtn: { padding: Spacing.base, borderRadius: BorderRadius.md, marginBottom: Spacing.md, alignItems: 'center' },
  quickBtnPrimaryText: { color: '#fff', fontSize: Typography.size.base, fontWeight: '700' },
  orText: { textAlign: 'center', marginVertical: Spacing.md, fontSize: Typography.size.sm },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center', marginBottom: Spacing.md },
  timeChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1 },
  timeChipText: { fontSize: Typography.size.base },
  customTimeInput: {
    borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md,
    fontSize: Typography.size.lg, marginBottom: Spacing.base,
  },
  nextBtn: { padding: Spacing.base, borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.base },
  nextBtnText: { color: '#fff', fontSize: Typography.size.md, fontWeight: '700' },
  modeCard: {
    borderRadius: BorderRadius.md, padding: Spacing.base,
    flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm,
    borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  modeEmoji: { fontSize: 28, marginRight: Spacing.md },
  modeLabel: { fontSize: Typography.size.md, fontWeight: '700' },
  modeLabelEn: { fontSize: Typography.size.sm },
  modeCheck: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  addEventCard: { borderRadius: BorderRadius.md, padding: Spacing.base, marginBottom: Spacing.md, borderWidth: 1 },
  eventInput: { borderWidth: 1, borderRadius: BorderRadius.sm, padding: Spacing.sm, fontSize: Typography.size.base, marginBottom: Spacing.sm },
  eventRow: { flexDirection: 'row' },
  addEventBtn: { borderWidth: 1, borderRadius: BorderRadius.sm, padding: Spacing.sm, alignItems: 'center' },
  addEventBtnText: { fontWeight: '700' },
  eventItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.sm, marginBottom: Spacing.sm, borderWidth: 1 },
  eventItemText: { fontSize: Typography.size.sm, flex: 1, textAlign: 'right' },
  routineCard: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.base, marginBottom: Spacing.md },
  routineQuestion: { fontSize: Typography.size.base, fontWeight: '700', textAlign: 'right', marginBottom: Spacing.xs },
  routineMeta: { fontSize: Typography.size.xs, textAlign: 'right', marginBottom: Spacing.sm },
  progressInput: { borderWidth: 1, borderRadius: BorderRadius.sm, padding: Spacing.sm, fontSize: Typography.size.base, marginTop: Spacing.xs },
  noRoutinesBox: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing['2xl'], alignItems: 'center', marginBottom: Spacing.base },
  noRoutines: { textAlign: 'center', fontSize: Typography.size.sm, lineHeight: 20 },
  buildBtn: { padding: Spacing.xl, borderRadius: BorderRadius.lg, alignItems: 'center', marginTop: Spacing.base },
  btnDisabled: { opacity: 0.6 },
  buildBtnText: { color: '#fff', fontSize: Typography.size.lg, fontWeight: '700' },
  buildBtnSub: { color: 'rgba(255,255,255,0.8)', fontSize: Typography.size.xs, marginTop: Spacing.xs, textAlign: 'center' },
});
