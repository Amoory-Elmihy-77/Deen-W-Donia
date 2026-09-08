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
import { Colors, Spacing, Typography, BorderRadius, DayModeInfo } from '../src/constants/theme';

type DayMode = 'normal' | 'busy' | 'study' | 'deep_work' | 'recovery';
interface Routine { _id: string; title: string; goalId?: string; duration: number; enabled: boolean; frequency: 'daily' | 'weekly' | 'custom'; activeDays: number[] }
interface Goal { _id: string; title: string }

const QUICK_WAKE_TIMES = ['05:00', '05:30', '06:00', '06:30', '07:00', '07:30', '08:00'];

function getNow(): string {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export default function MorningFlowScreen() {
  const router = useRouter();
  const { date: requestedDate, newDay } = useLocalSearchParams<{ date?: string; newDay?: string }>();
  const queryClient = useQueryClient();
  const { date, setDate, setWakeTime, setDayMode, setIsPlanned } = useDayStore();
  const targetDate = typeof requestedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : date;
  const isStartingNewDay = newDay === 'true';

  const [step, setStep] = useState<'wake' | 'mode' | 'events' | 'routines'>('wake');
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
        routineTasks: activeRoutines.map((routine) => ({ routineId: routine._id, title: routineTaskTitles[routine._id].trim(), goalProgressDelta: Number(routineTaskProgress[routine._id] || 0), startTime: routineTaskTimes[routine._id].trim() })),
        date: targetDate,
      }),
    onSuccess: (res) => {
      if (isStartingNewDay) setDate(targetDate);
      setWakeTime(selectedWake);
      setDayMode(selectedMode as DayMode);
      setIsPlanned(true);
      queryClient.invalidateQueries({ queryKey: ['tasks-today'] });
      const conflicts = res.data.data?.conflicts || [];
      const conflictMessage = conflicts.length ? `\n\nتنبيه: ${conflicts.map((conflict: { taskTitle: string }) => conflict.taskTitle).join('، ')} لم تُضف بسبب تعارض في الوقت الذي اخترته.` : '';
      Alert.alert('✅ يومك جاهز!', `تم بناء خطة يومك بناءً على وقت استيقاظك، نوع يومك، والتزاماتك الثابتة.${conflictMessage}`, [
        { text: 'عظيم!', onPress: () => router.replace('/(tabs)/home') },
      ]);
    },
    onError: () => {
      Alert.alert('خطأ', 'حصل مشكلة في بناء الخطة. تأكد من الاتصال بالإنترنت.');
    },
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

  // ── Step 1: Wake Time ──────────────────────────────────────────────────────
  if (step === 'wake') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← رجوع</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.greeting}>{isStartingNewDay ? 'يوم جديد ☀️' : 'صباح الخير ☀️'}</Text>
          <Text style={styles.question}>صحيت الساعة كام؟</Text>

          <TouchableOpacity
            style={[styles.quickBtn, styles.quickBtnPrimary]}
            onPress={() => { setSelectedWake(getNow()); setStep('mode'); }}
          >
            <Text style={styles.quickBtnPrimaryText}>صحيت دلوقتي ({getNow()})</Text>
          </TouchableOpacity>

          <Text style={styles.orText}>أو اختار وقت</Text>

          <View style={styles.timeGrid}>
            {QUICK_WAKE_TIMES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.timeChip, selectedWake === t && styles.timeChipSelected]}
                onPress={() => setSelectedWake(t)}
              >
                <Text style={[styles.timeChipText, selectedWake === t && styles.timeChipSelectedText]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.customTimeInput}
            placeholder="وقت مخصص (HH:MM)"
            placeholderTextColor={Colors.textMuted}
            value={selectedWake}
            onChangeText={setSelectedWake}
            keyboardType="numbers-and-punctuation"
            textAlign="center"
          />

          {selectedWake ? (
            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep('mode')}>
              <Text style={styles.nextBtnText}>التالي →</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Step 2: Day Mode ────────────────────────────────────────────────────────
  if (step === 'mode') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep('wake')}>
          <Text style={styles.backText}>← رجوع</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.question}>إيه شكل يومك {isStartingNewDay ? 'الجديد' : 'النهاردة'}؟</Text>

          {(Object.entries(DayModeInfo) as [DayMode, typeof DayModeInfo[string]][]).map(([mode, info]) => (
            <TouchableOpacity
              key={mode}
              style={[styles.modeCard, selectedMode === mode && { borderColor: info.color, borderWidth: 2 }]}
              onPress={() => setSelectedMode(mode)}
            >
              <Text style={styles.modeEmoji}>{info.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.modeLabel}>{info.labelAr}</Text>
                <Text style={styles.modeLabelEn}>{info.label}</Text>
              </View>
              {selectedMode === mode && (
                <View style={[styles.modeCheck, { backgroundColor: info.color }]}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.nextBtn} onPress={() => setStep('events')}>
            <Text style={styles.nextBtnText}>التالي →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Step 3: Fixed Events ────────────────────────────────────────────────────
  if (step === 'events') return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TouchableOpacity style={styles.backBtn} onPress={() => setStep('mode')}>
        <Text style={styles.backText}>← رجوع</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.question}>عندك أي حاجة ثابتة في {isStartingNewDay ? 'اليوم الجديد' : 'النهاردة'}؟</Text>
        <Text style={styles.subtext}>مثل: شغل، جامعة، موعد طبيب (اختياري)</Text>

        {/* Add event form */}
        <View style={styles.addEventCard}>
          <TextInput
            style={styles.eventInput}
            placeholder="اسم الحدث"
            placeholderTextColor={Colors.textMuted}
            value={newEventTitle}
            onChangeText={setNewEventTitle}
            textAlign="right"
          />
          <View style={styles.eventRow}>
            <TextInput
              style={[styles.eventInput, { flex: 1 }]}
              placeholder="الوقت HH:MM"
              placeholderTextColor={Colors.textMuted}
              value={newEventTime}
              onChangeText={setNewEventTime}
              keyboardType="numbers-and-punctuation"
            />
            <TextInput
              style={[styles.eventInput, { flex: 1, marginLeft: Spacing.sm }]}
              placeholder="المدة (دقيقة)"
              placeholderTextColor={Colors.textMuted}
              value={newEventDuration}
              onChangeText={setNewEventDuration}
              keyboardType="number-pad"
            />
          </View>
          <TouchableOpacity style={styles.addEventBtn} onPress={addEvent}>
            <Text style={styles.addEventBtnText}>+ أضف الحدث</Text>
          </TouchableOpacity>
        </View>

        {/* Events list */}
        {fixedEvents.map((ev, i) => (
          <View key={i} style={styles.eventItem}>
            <Text style={styles.eventItemText}>🕐 {ev.start} — {ev.title} ({ev.durationMinutes} د)</Text>
            <TouchableOpacity onPress={() => setFixedEvents((p) => p.filter((_, j) => j !== i))}>
              <Text style={{ color: Colors.error, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Choose the concrete task for each routine next. */}
        <TouchableOpacity
          style={styles.buildBtn}
          onPress={() => setStep('routines')}
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
    return routineTaskTitles[routine._id]?.trim() && /^\d{2}:\d{2}$/.test(routineTaskTimes[routine._id]?.trim() || '') && Number.isFinite(progress) && progress >= 0 && progress <= 100;
  });
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TouchableOpacity style={styles.backBtn} onPress={() => setStep('events')}><Text style={styles.backText}>← رجوع</Text></TouchableOpacity>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.question}>ماذا ستفعل في روتينك اليوم؟</Text>
        <Text style={styles.subtext}>اختر مهمة محددة لكل روتين. المدة والهدف مأخوذان من قالب الروتين.</Text>
        {activeRoutines.map((routine) => (
          <View key={routine._id} style={styles.routineCard}>
            <Text style={styles.routineQuestion}>ماذا تريد أن تفعل اليوم لهدف {goalTitleFor(routine)}؟</Text>
            <Text style={styles.routineMeta}>{routine.duration} دقيقة</Text>
            <TextInput
              style={styles.eventInput}
              placeholder={`مثال: ${goalTitleFor(routine) === 'Sports' ? 'Run 3 kilometers' : 'اكتب المهمة المحددة'}`}
              placeholderTextColor={Colors.textMuted}
              value={routineTaskTitles[routine._id] || ''}
              onChangeText={(title) => setRoutineTaskTitles((current) => ({ ...current, [routine._id]: title }))}
              textAlign="right"
            />
            <TextInput style={styles.progressInput} placeholder="وقت المهمة الذي تختاره (HH:MM) مثل 14:30" placeholderTextColor={Colors.textMuted} value={routineTaskTimes[routine._id] || ''} onChangeText={(time) => setRoutineTaskTimes((current) => ({ ...current, [routine._id]: time }))} keyboardType="numbers-and-punctuation" textAlign="right" />
            <TextInput
              style={styles.progressInput}
              placeholder="نسبة التقدم لهذا الهدف اليوم (٪)"
              placeholderTextColor={Colors.textMuted}
              value={routineTaskProgress[routine._id] || ''}
              onChangeText={(progress) => setRoutineTaskProgress((current) => ({ ...current, [routine._id]: progress }))}
              keyboardType="decimal-pad"
              textAlign="right"
            />
          </View>
        ))}
        {activeRoutines.length === 0 && <Text style={styles.noRoutines}>لا توجد روتينات محفوظة. يمكنك بدء اليوم الآن.</Text>}
        <TouchableOpacity style={[styles.buildBtn, (!routineTasksComplete || buildMutation.isPending) && styles.btnDisabled]} onPress={() => buildMutation.mutate()} disabled={!routineTasksComplete || buildMutation.isPending}>
          {buildMutation.isPending ? <ActivityIndicator color="#fff" /> : <><Text style={styles.buildBtnText}>{isStartingNewDay ? '☀️ ابدأ اليوم الجديد' : '🏗️ ابني يومي'}</Text><Text style={styles.buildBtnSub}>سيتم إنشاء مهام اليوم بهذه التفاصيل</Text></>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  backBtn: { padding: Spacing.base },
  backText: { color: Colors.primary, fontSize: Typography.size.base },
  content: { padding: Spacing.base, paddingBottom: 60 },
  greeting: { fontSize: Typography.size['2xl'], fontWeight: 'bold', color: Colors.text, textAlign: 'center', marginBottom: Spacing.sm },
  question: { fontSize: Typography.size.xl, fontWeight: 'bold', color: Colors.text, textAlign: 'center', marginBottom: Spacing.xl },
  subtext: { fontSize: Typography.size.sm, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.base, marginTop: -Spacing.md },
  quickBtn: { padding: Spacing.base, borderRadius: BorderRadius.md, marginBottom: Spacing.md, alignItems: 'center' },
  quickBtnPrimary: { backgroundColor: Colors.primary },
  quickBtnPrimaryText: { color: '#fff', fontSize: Typography.size.base, fontWeight: '700' },
  orText: { textAlign: 'center', color: Colors.textMuted, marginVertical: Spacing.md },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center', marginBottom: Spacing.md },
  timeChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  timeChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  timeChipText: { color: Colors.text, fontSize: Typography.size.base },
  timeChipSelectedText: { color: '#fff', fontWeight: '700' },
  customTimeInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: Typography.size.lg, color: Colors.text, backgroundColor: Colors.surface, marginBottom: Spacing.base },
  nextBtn: { backgroundColor: Colors.primary, padding: Spacing.base, borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.base },
  nextBtnText: { color: '#fff', fontSize: Typography.size.md, fontWeight: '700' },
  modeCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.base,
    flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  modeEmoji: { fontSize: 28, marginRight: Spacing.md },
  modeLabel: { fontSize: Typography.size.md, fontWeight: '700', color: Colors.text },
  modeLabelEn: { fontSize: Typography.size.sm, color: Colors.textSecondary },
  modeCheck: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  addEventCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.base, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  eventInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.sm, fontSize: Typography.size.base, color: Colors.text, backgroundColor: Colors.bg, marginBottom: Spacing.sm },
  eventRow: { flexDirection: 'row' },
  addEventBtn: { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.primary, borderRadius: BorderRadius.sm, padding: Spacing.sm, alignItems: 'center' },
  addEventBtnText: { color: Colors.primary, fontWeight: '700' },
  eventItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: BorderRadius.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  eventItemText: { fontSize: Typography.size.sm, color: Colors.text },
  routineCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.base, marginBottom: Spacing.md },
  routineQuestion: { color: Colors.text, fontSize: Typography.size.base, fontWeight: '700', textAlign: 'right', marginBottom: Spacing.xs },
  routineMeta: { color: Colors.textSecondary, fontSize: Typography.size.xs, textAlign: 'right', marginBottom: Spacing.sm },
  progressInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.sm, fontSize: Typography.size.base, color: Colors.text, backgroundColor: Colors.bg, marginTop: Spacing.xs },
  noRoutines: { color: Colors.textSecondary, textAlign: 'center', padding: Spacing.lg },
  buildBtn: { backgroundColor: Colors.primary, padding: Spacing.xl, borderRadius: BorderRadius.lg, alignItems: 'center', marginTop: Spacing.base },
  btnDisabled: { opacity: 0.6 },
  buildBtnText: { color: '#fff', fontSize: Typography.size.lg, fontWeight: '700' },
  buildBtnSub: { color: 'rgba(255,255,255,0.8)', fontSize: Typography.size.xs, marginTop: Spacing.xs, textAlign: 'center' },
});
