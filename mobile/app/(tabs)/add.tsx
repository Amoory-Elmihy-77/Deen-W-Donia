import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiApi, routinesApi, goalsApi } from '../../src/services/endpoints';
import { Colors, Spacing, Typography, BorderRadius } from '../../src/constants/theme';
import { useAppTheme } from '../../src/theme/ThemeProvider';
import { useRouter } from 'expo-router';

const ANCHOR_LABELS: Record<string, string> = {
  after_fajr: 'بعد الفجر 🌅',
  after_dhuhr: 'بعد الظهر 🕌',
  before_asr: 'قبل العصر',
  after_asr: 'بعد العصر 🌇',
  after_maghrib: 'بعد المغرب 🌙',
  after_isha: 'بعد العشاء ⭐',
  before_sleep: 'قبل النوم 😴',
};

const TYPE_LABELS: Record<string, string> = {
  routine: '🔄 روتين يومي',
  goal: '🎯 هدف',
  task: '✓ مهمة',
};

interface GoalOption { _id: string; title: string; progress: number; }

export default function AddScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [needsClarification, setNeedsClarification] = useState(false);
  const [mode, setMode] = useState<'smart' | 'manual'>('smart');
  const [manualType, setManualType] = useState<'goal' | 'routine' | null>(null);
  const [manualTitle, setManualTitle] = useState('');
  const [manualCategory, setManualCategory] = useState('deen');
  const [manualPriority, setManualPriority] = useState('medium');
  const [manualDuration, setManualDuration] = useState('30');
  const [manualAnchor, setManualAnchor] = useState('');
  const [relatedGoalId, setRelatedGoalId] = useState('');
  const [deadlineMode, setDeadlineMode] = useState<'life' | 'date'>('life');
  const [manualDeadline, setManualDeadline] = useState('');

  const { data: activeGoals = [] } = useQuery({
    queryKey: ['goals', 'active'],
    queryFn: () => goalsApi.list({ status: 'active' }).then((r) => r.data.data as GoalOption[]),
    enabled: mode === 'manual' && manualType === 'routine',
  });

  const smartAddMutation = useMutation({
    mutationFn: () => aiApi.smartAdd(text),
    onSuccess: (res) => {
      const data = res.data.data;
      if (data.needsClarification) {
        setNeedsClarification(true);
        setPreview(null);
      } else {
        setPreview(data.preview);
        setNeedsClarification(false);
      }
    },
    onError: (err: any) => {
      const code = err?.response?.data?.code;
      if (code === 'AI_KEY_MISSING') {
        Alert.alert('مفتاح Groq غير موجود', 'روح الإعدادات وأضف مفتاح Groq عشان تستخدم Smart Add');
      } else {
        Alert.alert('خطأ', 'حصل مشكلة في تحليل النص');
      }
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => {
      if (!preview) throw new Error('No preview');
      const type = preview.type as string;
      if (type === 'routine') {
        return routinesApi.create({
          title: preview.title,
          category: preview.category,
          duration: preview.durationMinutes || 30,
          frequency: preview.frequency || 'daily',
          schedulingType: preview.schedulingType || 'flexible',
          anchor: preview.anchor,
          preferredTime: preview.preferredTime,
        });
      } else {
        return goalsApi.create({
          title: preview.title,
          category: preview.category,
        });
      }
    },
    onSuccess: () => {
      Alert.alert('✅ تم الإضافة!', 'تمت الإضافة بنجاح');
      setText('');
      setPreview(null);
    },
    onError: () => Alert.alert('خطأ', 'فشل الحفظ'),
  });

  const manualSaveMutation = useMutation({
    mutationFn: () => {
      if (!manualType || (manualType === 'goal' && !manualTitle.trim())) throw new Error('MISSING_MANUAL_FIELDS');
      if (manualType === 'goal') {
        const deadline = deadlineMode === 'date'
          ? new Date(`${manualDeadline}T23:59:59.999Z`).toISOString()
          : undefined;
        if (deadlineMode === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(manualDeadline)) throw new Error('INVALID_DEADLINE');
        return goalsApi.create({ title: manualTitle.trim(), category: manualCategory, priority: manualPriority, deadline });
      }
      const duration = Number(manualDuration);
      if (!Number.isInteger(duration) || duration < 1 || duration > 720) throw new Error('INVALID_DURATION');
      if (!relatedGoalId) throw new Error('MISSING_ROUTINE_GOAL');
      const goal = activeGoals.find((item) => item._id === relatedGoalId);
      return routinesApi.create({
        title: `${goal?.title || 'Goal'} routine`,
        category: manualCategory,
        priority: manualPriority,
        duration,
        minimumDuration: Math.min(duration, 15),
        frequency: 'daily',
        schedulingType: manualAnchor ? 'prayer_anchor' : 'flexible',
        goalId: relatedGoalId,
        goalProgressContribution: 0,
        ...(manualAnchor ? { anchor: manualAnchor } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      setManualTitle(''); setManualDuration('30'); setManualAnchor(''); setRelatedGoalId(''); setManualDeadline(''); setDeadlineMode('life'); setManualType(null);
      Alert.alert('✅ تمت الإضافة', 'أصبح جاهزًا ضمن خطتك.');
    },
    onError: (error: Error) => Alert.alert('تحقق من البيانات', error.message === 'INVALID_DURATION' ? 'اكتب مدة بين دقيقة و12 ساعة.' : error.message === 'INVALID_DEADLINE' ? 'اكتب التاريخ بصيغة سنة-شهر-يوم، مثل 2026-12-31.' : error.message === 'MISSING_ROUTINE_GOAL' ? 'اختر هدفًا لهذا الروتين.' : 'اكتب اسمًا قبل الحفظ.'),
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={styles.title}>أضف جديد ✨</Text>
        <View style={styles.modeToggle}>
          <TouchableOpacity style={[styles.modeBtn, mode === 'smart' && styles.modeBtnActive]} onPress={() => setMode('smart')}>
            <Text style={[styles.modeBtnText, mode === 'smart' && styles.modeBtnTextActive]}>🤖 ذكاء اصطناعي</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modeBtn, mode === 'manual' && styles.modeBtnActive]} onPress={() => setMode('manual')}>
            <Text style={[styles.modeBtnText, mode === 'manual' && styles.modeBtnTextActive]}>✏️ يدوي</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {mode === 'smart' ? (
          <>
            <Text style={styles.hint}>قل لي بالعربي أو الإنجليزي إيه اللي عايز تضيفه:</Text>
            <Text style={styles.example}>مثال: "عايز أذاكر Gen AI ساعتين بعد العصر كل يوم"</Text>

            <TextInput
              style={styles.bigInput}
              multiline
              placeholder="اكتب هنا..."
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              textAlignVertical="top"
              textAlign="right"
            />

            <TouchableOpacity
              style={[styles.analyzeBtn, (!text.trim() || smartAddMutation.isPending) && styles.btnDisabled]}
              onPress={() => smartAddMutation.mutate()}
              disabled={!text.trim() || smartAddMutation.isPending}
            >
              {smartAddMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.analyzeBtnText}>🧠 تحليل وإضافة</Text>}
            </TouchableOpacity>

            {needsClarification && (
              <View style={styles.clarifyBox}>
                <Text style={styles.clarifyText}>⚠️ محتاج توضيح أكتر</Text>
                <Text style={styles.clarifySubtext}>حدد المدة، التكرار، أو الوقت بشكل أوضح</Text>
              </View>
            )}

            {preview && (
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>فهمت عليك 👌</Text>

                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>النوع:</Text>
                  <Text style={styles.previewValue}>{TYPE_LABELS[preview.type as string] || String(preview.type)}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>الاسم:</Text>
                  <Text style={styles.previewValue}>{String(preview.title)}</Text>
                </View>
                {preview.durationMinutes ? (
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>المدة:</Text>
                    <Text style={styles.previewValue}>{String(preview.durationMinutes)} دقيقة</Text>
                  </View>
                ) : null}
                {preview.anchor ? (
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>الوقت:</Text>
                    <Text style={styles.previewValue}>{ANCHOR_LABELS[preview.anchor as string] || String(preview.anchor)}</Text>
                  </View>
                ) : null}
                {preview.frequency ? (
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>التكرار:</Text>
                    <Text style={styles.previewValue}>{preview.frequency === 'daily' ? 'كل يوم' : String(preview.frequency)}</Text>
                  </View>
                ) : null}

                <View style={styles.previewActions}>
                  <TouchableOpacity style={styles.confirmBtn} onPress={() => confirmMutation.mutate()} disabled={confirmMutation.isPending}>
                    {confirmMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmBtnText}>✅ أضفه</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.discardBtn} onPress={() => setPreview(null)}>
                    <Text style={styles.discardBtnText}>✕ إلغاء</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        ) : <View style={styles.manualArea}>
          {!manualType ? <>
            <Text style={styles.manualTitle}>ماذا تريد أن تضيف؟</Text>
            <Text style={styles.manualText}>اختر النوع ثم املأ التفاصيل التي تناسب يومك.</Text>
            <View style={styles.manualActions}>
              <TouchableOpacity style={[styles.manualChoice, styles.goalChoice]} onPress={() => setManualType('goal')}>
                <Text style={styles.manualChoiceEmoji}>🎯</Text><Text style={styles.manualChoiceTitle}>هدف جديد</Text><Text style={styles.manualChoiceText}>وجهة كبيرة تتقدم نحوها</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.manualChoice, styles.routineChoice]} onPress={() => setManualType('routine')}>
                <Text style={styles.manualChoiceEmoji}>🔄</Text><Text style={styles.manualChoiceTitle}>روتين يومي</Text><Text style={styles.manualChoiceText}>فعل يتكرر داخل خطتك</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.manualChoice, styles.todayTaskChoice]} onPress={() => router.push('/daily-tasks' as any)}>
                <Text style={styles.manualChoiceEmoji}>🗓️</Text><Text style={styles.manualChoiceTitle}>مهمة اليوم فقط</Text><Text style={styles.manualChoiceText}>لن تُضاف إلى الغد</Text>
              </TouchableOpacity>
            </View>
          </> : <>
            <TouchableOpacity onPress={() => setManualType(null)}><Text style={styles.backToChoices}>← اختيار نوع آخر</Text></TouchableOpacity>
            <Text style={styles.manualTitle}>{manualType === 'goal' ? '🎯 أضف هدفًا جديدًا' : '🔄 أضف روتينًا يوميًا'}</Text>
            {manualType === 'goal' && <><Text style={styles.fieldLabel}>الاسم</Text><TextInput style={[styles.manualInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={manualTitle} onChangeText={setManualTitle} placeholder="مثال: إنهاء دورة الذكاء الاصطناعي" placeholderTextColor={colors.textMuted} textAlign="right" /></>}
            <Text style={styles.fieldLabel}>الفئة</Text>
            <View style={styles.optionRow}>{[['deen', '🕌 الدين'], ['dunya', '🌍 الدنيا'], ['health', '🏃 الصحة'], ['learning', '📚 التعلم']].map(([value, label]) => <TouchableOpacity key={value} style={[styles.smallOption, manualCategory === value && styles.smallOptionActive]} onPress={() => setManualCategory(value)}><Text style={[styles.smallOptionText, manualCategory === value && styles.smallOptionTextActive]}>{label}</Text></TouchableOpacity>)}</View>
            {manualType === 'goal' && <><Text style={styles.fieldLabel}>مدة الهدف</Text><View style={styles.optionRow}><TouchableOpacity style={[styles.smallOption, deadlineMode === 'life' && styles.smallOptionActive]} onPress={() => setDeadlineMode('life')}><Text style={[styles.smallOptionText, deadlineMode === 'life' && styles.smallOptionTextActive]}>🌱 هدف حياة — بدون موعد</Text></TouchableOpacity><TouchableOpacity style={[styles.smallOption, deadlineMode === 'date' && styles.smallOptionActive]} onPress={() => setDeadlineMode('date')}><Text style={[styles.smallOptionText, deadlineMode === 'date' && styles.smallOptionTextActive]}>📅 له موعد نهائي</Text></TouchableOpacity></View>{deadlineMode === 'date' && <TextInput style={[styles.manualInput, { marginTop: Spacing.sm, backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={manualDeadline} onChangeText={setManualDeadline} keyboardType="numbers-and-punctuation" placeholder="YYYY-MM-DD مثل 2026-12-31" placeholderTextColor={colors.textMuted} textAlign="right" />}</>}
            {manualType === 'routine' && <><Text style={styles.fieldLabel}>المدة بالدقائق</Text><TextInput style={styles.manualInput} value={manualDuration} onChangeText={setManualDuration} keyboardType="number-pad" placeholder="30" placeholderTextColor={Colors.textMuted} textAlign="right" /><Text style={styles.fieldLabel}>اربط الروتين بهدف</Text><Text style={styles.fieldHint}>الروتين قالب عام. ستختار المهمة المحددة ونسبة التقدم لها عند بدء اليوم.</Text><View style={styles.optionRow}>{activeGoals.map((goal) => <TouchableOpacity key={goal._id} style={[styles.smallOption, relatedGoalId === goal._id && styles.smallOptionActive]} onPress={() => setRelatedGoalId(goal._id)}><Text style={[styles.smallOptionText, relatedGoalId === goal._id && styles.smallOptionTextActive]}>{goal.title} ({goal.progress}%)</Text></TouchableOpacity>)}</View></>}
            <TouchableOpacity style={[styles.manualSaveBtn, ((manualType === 'goal' ? !manualTitle.trim() : !relatedGoalId) || manualSaveMutation.isPending) && styles.btnDisabled]} onPress={() => manualSaveMutation.mutate()} disabled={(manualType === 'goal' ? !manualTitle.trim() : !relatedGoalId) || manualSaveMutation.isPending}>{manualSaveMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.manualSaveText}>إضافة {manualType === 'goal' ? 'الهدف' : 'الروتين'}</Text>}</TouchableOpacity>
          </>}
        </View>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { padding: Spacing.base, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: Typography.size.xl, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.sm },
  modeToggle: { flexDirection: 'row', gap: Spacing.sm },
  modeBtn: { flex: 1, padding: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  modeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  modeBtnText: { fontSize: Typography.size.sm, color: Colors.textSecondary },
  modeBtnTextActive: { color: '#fff', fontWeight: '700' },
  content: { padding: Spacing.base, paddingBottom: 100 },
  hint: { fontSize: Typography.size.base, fontWeight: '600', color: Colors.text, textAlign: 'right', marginBottom: Spacing.xs },
  example: { fontSize: Typography.size.sm, color: Colors.textSecondary, textAlign: 'right', marginBottom: Spacing.base, fontStyle: 'italic' },
  bigInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.base, minHeight: 120, backgroundColor: Colors.surface, fontSize: Typography.size.base, color: Colors.text, marginBottom: Spacing.base },
  analyzeBtn: { backgroundColor: Colors.primary, padding: Spacing.base, borderRadius: BorderRadius.md, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  analyzeBtnText: { color: '#fff', fontSize: Typography.size.base, fontWeight: '700' },
  clarifyBox: { marginTop: Spacing.base, backgroundColor: '#FEF3C7', borderRadius: BorderRadius.md, padding: Spacing.base, borderWidth: 1, borderColor: Colors.warning },
  clarifyText: { fontSize: Typography.size.base, fontWeight: '700', color: '#92400E', textAlign: 'center' },
  clarifySubtext: { fontSize: Typography.size.sm, color: '#92400E', textAlign: 'center', marginTop: Spacing.xs },
  previewCard: { marginTop: Spacing.base, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, borderWidth: 1, borderColor: Colors.primary },
  previewTitle: { fontSize: Typography.size.lg, fontWeight: 'bold', color: Colors.primary, textAlign: 'center', marginBottom: Spacing.base },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.border },
  previewLabel: { fontSize: Typography.size.sm, color: Colors.textSecondary },
  previewValue: { fontSize: Typography.size.sm, fontWeight: '600', color: Colors.text, textAlign: 'right' },
  previewActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  confirmBtn: { flex: 2, backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: Typography.size.base },
  discardBtn: { flex: 1, backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center' },
  discardBtnText: { color: Colors.textSecondary, fontSize: Typography.size.base },
  manualArea: { paddingTop: Spacing.xl },
  manualTitle: { fontSize: Typography.size.lg, fontWeight: '800', color: Colors.text, textAlign: 'right', marginBottom: Spacing.xs },
  manualText: { fontSize: Typography.size.sm, color: Colors.textSecondary, textAlign: 'right', lineHeight: 21 },
  manualActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.xl },
  manualChoice: { flex: 1, minHeight: 160, borderRadius: BorderRadius.lg, padding: Spacing.base, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  goalChoice: { backgroundColor: '#EEF8F5', borderColor: '#B6E4D8' }, routineChoice: { backgroundColor: '#F1F5FD', borderColor: '#C9D8F6' }, todayTaskChoice: { backgroundColor: '#FFF7E6', borderColor: '#F8D89B' },
  manualChoiceEmoji: { fontSize: 30, marginBottom: Spacing.sm }, manualChoiceTitle: { fontSize: Typography.size.md, fontWeight: '800', color: Colors.text }, manualChoiceText: { fontSize: Typography.size.xs, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs, lineHeight: 18 },
  backToChoices: { color: Colors.primary, fontSize: Typography.size.sm, fontWeight: '700', textAlign: 'right', marginBottom: Spacing.lg },
  fieldLabel: { fontSize: Typography.size.sm, fontWeight: '700', color: Colors.text, textAlign: 'right', marginTop: Spacing.base, marginBottom: Spacing.xs },
  fieldHint: { fontSize: Typography.size.xs, color: Colors.textSecondary, textAlign: 'right', marginBottom: Spacing.sm },
  manualInput: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: Typography.size.base, color: Colors.text },
  optionRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: Spacing.sm },
  smallOption: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  smallOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  smallOptionText: { fontSize: Typography.size.xs, color: Colors.textSecondary }, smallOptionTextActive: { color: '#fff', fontWeight: '700' },
  manualSaveBtn: { backgroundColor: Colors.primary, padding: Spacing.base, borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.xl }, manualSaveText: { color: '#fff', fontWeight: '800', fontSize: Typography.size.base },
});
