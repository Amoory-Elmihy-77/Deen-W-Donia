import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiApi, routinesApi, goalsApi } from '../../src/services/endpoints';
import { Spacing, Typography, BorderRadius } from '../../src/constants/theme';
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
  const styles = makeStyles(colors);
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>أضف جديد ✨</Text>
        <View style={styles.modeToggle}>
          <TouchableOpacity style={[styles.modeBtn, mode === 'smart' && styles.modeBtnActive]} onPress={() => setMode('smart')} activeOpacity={0.8}>
            <Text style={[styles.modeBtnText, mode === 'smart' && styles.modeBtnTextActive]}>🤖 ذكاء اصطناعي</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modeBtn, mode === 'manual' && styles.modeBtnActive]} onPress={() => setMode('manual')} activeOpacity={0.8}>
            <Text style={[styles.modeBtnText, mode === 'manual' && styles.modeBtnTextActive]}>✏️ يدوي</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
              activeOpacity={0.8}
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
                  <TouchableOpacity style={styles.confirmBtn} onPress={() => confirmMutation.mutate()} disabled={confirmMutation.isPending} activeOpacity={0.8}>
                    {confirmMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmBtnText}>✅ أضفه</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.discardBtn} onPress={() => setPreview(null)} activeOpacity={0.8}>
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
            <TouchableOpacity style={styles.manageRoutinesBtn} onPress={() => router.push('/routines' as any)} activeOpacity={0.7}>
              <Text style={styles.manageRoutinesText}>🔄 عرض وإدارة روتيناتي</Text>
            </TouchableOpacity>
            
            <View style={styles.manualActions}>
              <TouchableOpacity style={[styles.manualChoice, styles.goalChoice]} onPress={() => setManualType('goal')} activeOpacity={0.8}>
                <Text style={styles.manualChoiceEmoji}>🎯</Text>
                <Text style={[styles.manualChoiceTitle, { color: colors.deen }]}>هدف جديد</Text>
                <Text style={styles.manualChoiceText}>وجهة كبيرة تتقدم نحوها</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.manualChoice, styles.routineChoice]} onPress={() => setManualType('routine')} activeOpacity={0.8}>
                <Text style={styles.manualChoiceEmoji}>🔄</Text>
                <Text style={[styles.manualChoiceTitle, { color: colors.info }]}>روتين يومي</Text>
                <Text style={styles.manualChoiceText}>فعل يتكرر داخل خطتك</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.manualChoice, styles.todayTaskChoice]} onPress={() => router.push('/daily-tasks' as any)} activeOpacity={0.8}>
                <Text style={styles.manualChoiceEmoji}>🗓️</Text>
                <Text style={[styles.manualChoiceTitle, { color: colors.warning }]}>مهمة اليوم فقط</Text>
                <Text style={styles.manualChoiceText}>لن تُضاف إلى الغد</Text>
              </TouchableOpacity>
            </View>
          </> : <>
            <TouchableOpacity onPress={() => setManualType(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.backToChoices}>← اختيار نوع آخر</Text>
            </TouchableOpacity>
            
            <Text style={styles.manualTitle}>{manualType === 'goal' ? '🎯 أضف هدفًا جديدًا' : '🔄 أضف روتينًا يوميًا'}</Text>
            
            {manualType === 'goal' && (
              <>
                <Text style={styles.fieldLabel}>الاسم</Text>
                <TextInput style={styles.manualInput} value={manualTitle} onChangeText={setManualTitle} placeholder="مثال: إنهاء دورة الذكاء الاصطناعي" placeholderTextColor={colors.textMuted} textAlign="right" />
              </>
            )}
            
            <Text style={styles.fieldLabel}>الفئة</Text>
            <View style={styles.optionRow}>
              {[['deen', '🕌 الدين'], ['dunya', '🌍 الدنيا'], ['health', '🏃 الصحة'], ['learning', '📚 التعلم']].map(([value, label]) => (
                <TouchableOpacity key={value} style={[styles.smallOption, manualCategory === value && styles.smallOptionActive]} onPress={() => setManualCategory(value)} activeOpacity={0.7}>
                  <Text style={[styles.smallOptionText, manualCategory === value && styles.smallOptionTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {manualType === 'goal' && (
              <>
                <Text style={styles.fieldLabel}>مدة الهدف</Text>
                <View style={styles.optionRow}>
                  <TouchableOpacity style={[styles.smallOption, deadlineMode === 'life' && styles.smallOptionActive]} onPress={() => setDeadlineMode('life')} activeOpacity={0.7}>
                    <Text style={[styles.smallOptionText, deadlineMode === 'life' && styles.smallOptionTextActive]}>🌱 هدف حياة — بدون موعد</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.smallOption, deadlineMode === 'date' && styles.smallOptionActive]} onPress={() => setDeadlineMode('date')} activeOpacity={0.7}>
                    <Text style={[styles.smallOptionText, deadlineMode === 'date' && styles.smallOptionTextActive]}>📅 له موعد نهائي</Text>
                  </TouchableOpacity>
                </View>
                {deadlineMode === 'date' && (
                  <TextInput style={[styles.manualInput, { marginTop: Spacing.sm }]} value={manualDeadline} onChangeText={setManualDeadline} keyboardType="numbers-and-punctuation" placeholder="YYYY-MM-DD مثل 2026-12-31" placeholderTextColor={colors.textMuted} textAlign="right" />
                )}
              </>
            )}
            
            {manualType === 'routine' && (
              <>
                <Text style={styles.fieldLabel}>المدة بالدقائق</Text>
                <TextInput style={styles.manualInput} value={manualDuration} onChangeText={setManualDuration} keyboardType="number-pad" placeholder="30" placeholderTextColor={colors.textMuted} textAlign="right" />
                
                <Text style={styles.fieldLabel}>اربط الروتين بوقت الصلاة (اختياري)</Text>
                <View style={styles.optionRow}>
                  <TouchableOpacity style={[styles.smallOption, !manualAnchor && styles.smallOptionActive]} onPress={() => setManualAnchor('')} activeOpacity={0.7}>
                    <Text style={[styles.smallOptionText, !manualAnchor && styles.smallOptionTextActive]}>بدون وقت محدد</Text>
                  </TouchableOpacity>
                  {Object.entries(ANCHOR_LABELS).map(([anchor, label]) => (
                    <TouchableOpacity key={anchor} style={[styles.smallOption, manualAnchor === anchor && styles.smallOptionActive]} onPress={() => setManualAnchor(anchor)} activeOpacity={0.7}>
                      <Text style={[styles.smallOptionText, manualAnchor === anchor && styles.smallOptionTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.fieldLabel}>اربط الروتين بهدف</Text>
                <Text style={styles.fieldHint}>الروتين قالب عام. ستختار المهمة المحددة ونسبة التقدم لها عند بدء اليوم.</Text>
                <View style={styles.optionRow}>
                  {activeGoals.map((goal) => (
                    <TouchableOpacity key={goal._id} style={[styles.smallOption, relatedGoalId === goal._id && styles.smallOptionActive]} onPress={() => setRelatedGoalId(goal._id)} activeOpacity={0.7}>
                      <Text style={[styles.smallOptionText, relatedGoalId === goal._id && styles.smallOptionTextActive]}>{goal.title} ({goal.progress}%)</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            
            <TouchableOpacity style={[styles.manualSaveBtn, ((manualType === 'goal' ? !manualTitle.trim() : !relatedGoalId) || manualSaveMutation.isPending) && styles.btnDisabled]} onPress={() => manualSaveMutation.mutate()} disabled={(manualType === 'goal' ? !manualTitle.trim() : !relatedGoalId) || manualSaveMutation.isPending} activeOpacity={0.8}>
              {manualSaveMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.manualSaveText}>إضافة {manualType === 'goal' ? 'الهدف' : 'الروتين'}</Text>}
            </TouchableOpacity>
          </>}
        </View>}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: Spacing.base, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: Typography.size.xl, fontWeight: 'bold', color: colors.text, marginBottom: Spacing.sm },
  modeToggle: { flexDirection: 'row', gap: Spacing.sm },
  modeBtn: { flex: 1, padding: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  modeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeBtnText: { fontSize: Typography.size.sm, color: colors.textSecondary },
  modeBtnTextActive: { color: '#fff', fontWeight: '700' },
  content: { padding: Spacing.base, paddingBottom: 100 },
  hint: { fontSize: Typography.size.base, fontWeight: '600', color: colors.text, textAlign: 'right', marginBottom: Spacing.xs },
  example: { fontSize: Typography.size.sm, color: colors.textSecondary, textAlign: 'right', marginBottom: Spacing.base, fontStyle: 'italic' },
  bigInput: { borderWidth: 1, borderColor: colors.border, borderRadius: BorderRadius.md, padding: Spacing.base, minHeight: 120, backgroundColor: colors.inputBackground, fontSize: Typography.size.base, color: colors.text, marginBottom: Spacing.base },
  analyzeBtn: { backgroundColor: colors.primary, padding: Spacing.base, borderRadius: BorderRadius.md, alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnDisabled: { opacity: 0.5 },
  analyzeBtnText: { color: '#fff', fontSize: Typography.size.base, fontWeight: '700' },
  
  // Fix clarify box dark mode
  clarifyBox: { marginTop: Spacing.base, backgroundColor: colors.warningBg, borderRadius: BorderRadius.md, padding: Spacing.base, borderWidth: 1, borderColor: colors.warning },
  clarifyText: { fontSize: Typography.size.base, fontWeight: '700', color: colors.warningText, textAlign: 'center' },
  clarifySubtext: { fontSize: Typography.size.sm, color: colors.warningText, textAlign: 'center', marginTop: Spacing.xs },
  
  previewCard: { marginTop: Spacing.base, backgroundColor: colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, borderWidth: 1, borderColor: colors.primary },
  previewTitle: { fontSize: Typography.size.lg, fontWeight: 'bold', color: colors.primary, textAlign: 'center', marginBottom: Spacing.base },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  previewLabel: { fontSize: Typography.size.sm, color: colors.textSecondary },
  previewValue: { fontSize: Typography.size.sm, fontWeight: '600', color: colors.text, textAlign: 'right' },
  previewActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  confirmBtn: { flex: 2, backgroundColor: colors.primary, padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: Typography.size.base },
  discardBtn: { flex: 1, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center' },
  discardBtnText: { color: colors.textSecondary, fontSize: Typography.size.base, fontWeight: '600' },
  
  manualArea: { paddingTop: Spacing.xl },
  manualTitle: { fontSize: Typography.size.lg, fontWeight: '800', color: colors.text, textAlign: 'right', marginBottom: Spacing.xs },
  manualText: { fontSize: Typography.size.sm, color: colors.textSecondary, textAlign: 'right', lineHeight: 21 },
  manageRoutinesBtn: { alignSelf: 'center', borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, marginTop: Spacing.md },
  manageRoutinesText: { color: colors.primary, fontWeight: '700' },
  manualActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.xl },
  
  // Fix manual choices for dark mode
  manualChoice: { flex: 1, minHeight: 160, borderRadius: BorderRadius.lg, padding: Spacing.base, justifyContent: 'center', alignItems: 'center', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  goalChoice: { backgroundColor: colors.deenBg, borderColor: colors.deen }, 
  routineChoice: { backgroundColor: colors.infoBg, borderColor: colors.info }, 
  todayTaskChoice: { backgroundColor: colors.warningBg, borderColor: colors.warning },
  
  manualChoiceEmoji: { fontSize: 30, marginBottom: Spacing.sm }, 
  manualChoiceTitle: { fontSize: Typography.size.md, fontWeight: '800' }, 
  manualChoiceText: { fontSize: Typography.size.xs, color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs, lineHeight: 18 },
  
  backToChoices: { color: colors.primary, fontSize: Typography.size.sm, fontWeight: '700', textAlign: 'right', marginBottom: Spacing.lg },
  fieldLabel: { fontSize: Typography.size.sm, fontWeight: '700', color: colors.text, textAlign: 'right', marginTop: Spacing.base, marginBottom: Spacing.xs },
  fieldHint: { fontSize: Typography.size.xs, color: colors.textSecondary, textAlign: 'right', marginBottom: Spacing.sm },
  manualInput: { backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: Typography.size.base, color: colors.text, minHeight: 50 },
  optionRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: Spacing.sm },
  smallOption: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  smallOptionActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  smallOptionText: { fontSize: Typography.size.xs, color: colors.textSecondary }, 
  smallOptionTextActive: { color: '#fff', fontWeight: '700' },
  
  manualSaveBtn: { backgroundColor: colors.primary, padding: Spacing.base, borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.xl, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }, 
  manualSaveText: { color: '#fff', fontWeight: '800', fontSize: Typography.size.base },
});
