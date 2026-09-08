import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { goalsApi } from '../../src/services/endpoints';
import { Spacing, Typography, BorderRadius } from '../../src/constants/theme';
import { useAppTheme } from '../../src/theme/ThemeProvider';

interface Goal {
  _id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  progress: number;
  description?: string;
  deadline?: string;
}

const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const PRIORITY_LABELS: Record<string, string> = { critical: '🔴 حرج', high: '🟠 عالي', medium: '🟡 متوسط', low: '🟢 منخفض' };

export default function GoalsScreen() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('active');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('deen');
  const [newPriority, setNewPriority] = useState('medium');
  const [newDescription, setNewDescription] = useState('');
  const [deadlineMode, setDeadlineMode] = useState<'life' | 'date'>('life');
  const [newDeadline, setNewDeadline] = useState('');

  const CATEGORIES = [
    { value: 'deen', label: '🕌 الدين', color: colors.deen },
    { value: 'dunya', label: '🌍 الدنيا', color: colors.dunya },
    { value: 'health', label: '🏃 الصحة', color: colors.success },
    { value: 'learning', label: '📚 التعلم', color: '#7C3AED' }, // Hardcoded purple looks fine, but can use primary
    { value: 'work', label: '💼 العمل', color: colors.info },
  ];

  const { data, isLoading } = useQuery({
    queryKey: ['goals', filter],
    queryFn: () => goalsApi.list({ status: filter }).then((r) => r.data.data as Goal[]),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (deadlineMode === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(newDeadline)) throw new Error('INVALID_DEADLINE');
      return goalsApi.create({ title: newTitle, category: newCategory, priority: newPriority, description: newDescription, deadline: deadlineMode === 'date' ? new Date(`${newDeadline}T23:59:59.999Z`).toISOString() : undefined });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setShowModal(false);
      setNewTitle(''); setNewDescription(''); setNewDeadline(''); setDeadlineMode('life');
    },
    onError: () => Alert.alert('تحقق من الموعد', 'اكتب الموعد بصيغة YYYY-MM-DD، مثل 2026-12-31.'),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => goalsApi.update(id, { status: 'completed' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });
  const pauseMutation = useMutation({ mutationFn: (id: string) => goalsApi.update(id, { status: 'paused' }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }) });
  const resumeMutation = useMutation({ mutationFn: (id: string) => goalsApi.update(id, { status: 'active' }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }) });
  const deleteMutation = useMutation({ mutationFn: (id: string) => goalsApi.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }) });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>أهدافي 🎯</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>+ هدف جديد</Text>
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterBar}>
        {['active', 'paused', 'completed'].map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, filter === s && styles.filterChipActive]}
            onPress={() => setFilter(s)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, filter === s && styles.filterChipTextActive]}>
              {s === 'active' ? 'نشطة' : s === 'paused' ? 'موقوفة' : 'مكتملة'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 100 }}>
        {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />}

        {!isLoading && (!data || data.length === 0) && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyTitle}>لا يوجد أهداف بعد</Text>
            <Text style={styles.emptyText}>ابدأ بإضافة هدف حياتك الأول</Text>
          </View>
        )}

        {(data || []).map((goal) => {
          const cat = CATEGORIES.find((c) => c.value === goal.category);
          return (
            <View key={goal._id} style={styles.goalCard}>
              <View style={[styles.catBar, { backgroundColor: cat?.color || colors.primary }]} />
              <View style={styles.goalContent}>
                <View style={styles.goalTop}>
                  <Text style={styles.catLabel}>{cat?.label || goal.category}</Text>
                  <Text style={styles.priorityLabel}>{PRIORITY_LABELS[goal.priority] || goal.priority}</Text>
                </View>
                <Text style={styles.goalTitle}>{goal.title}</Text>
                {goal.description ? <Text style={styles.goalDesc}>{goal.description}</Text> : null}
                <Text style={styles.deadlineText}>{goal.deadline ? `📅 الموعد: ${new Date(goal.deadline).toLocaleDateString('ar-EG')}` : '🌱 هدف حياة — بدون موعد نهائي'}</Text>
                
                {/* Progress bar */}
                <View style={styles.progressBarWrap}>
                  <View style={[styles.progressBarFill, { width: `${goal.progress}%` as any, backgroundColor: cat?.color || colors.primary }]} />
                </View>
                <Text style={styles.progressPct}>{goal.progress}%</Text>

                <View style={styles.goalActions}>
                  {goal.status === 'active' && (
                    <>
                      <TouchableOpacity style={styles.pauseGoalBtn} onPress={() => Alert.alert('إيقاف الهدف', `سيظل هدف «${goal.title}» محفوظًا، لكن لن تزيد المهام المرتبطة به تقدمه.`, [{ text: 'إلغاء', style: 'cancel' }, { text: 'إيقاف', style: 'destructive', onPress: () => pauseMutation.mutate(goal._id) }])} activeOpacity={0.7}>
                        <Text style={styles.pauseGoalText}>⏸ إيقاف</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.completeGoalBtn} onPress={() => Alert.alert('إكمال الهدف', `هل أكملت: ${goal.title}؟`, [{ text: 'لأ', style: 'cancel' }, { text: 'نعم', onPress: () => completeMutation.mutate(goal._id) }])} activeOpacity={0.7}>
                        <Text style={styles.completeGoalBtnText}>✓ تم الإنجاز</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {goal.status === 'paused' && (
                    <TouchableOpacity style={styles.resumeGoalBtn} onPress={() => resumeMutation.mutate(goal._id)} activeOpacity={0.7}>
                      <Text style={styles.resumeGoalText}>▶ استئناف الهدف</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.deleteGoalBtn} onPress={() => Alert.alert('حذف الهدف', `سيتم حذف «${goal.title}». الروتينات المرتبطة ستبقى، ولكن بلا هدف.`, [{ text: 'إلغاء', style: 'cancel' }, { text: 'حذف', style: 'destructive', onPress: () => deleteMutation.mutate(goal._id) }])} activeOpacity={0.7}>
                    <Text style={styles.deleteGoalText}>حذف</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Add Goal Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>هدف جديد 🎯</Text>
            <TouchableOpacity onPress={() => setShowModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={{ color: colors.error, fontSize: 24, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: Spacing.base, flex: 1 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>العنوان *</Text>
            <TextInput style={styles.input} value={newTitle} onChangeText={setNewTitle} placeholder="مثال: حفظ القرآن الكريم" placeholderTextColor={colors.textMuted} textAlign="right" />

            <Text style={styles.fieldLabel}>الفئة</Text>
            <View style={styles.chips}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity key={c.value} style={[styles.chip, newCategory === c.value && { backgroundColor: c.color, borderColor: c.color }]} onPress={() => setNewCategory(c.value)} activeOpacity={0.7}>
                  <Text style={[styles.chipText, newCategory === c.value && { color: '#fff', fontWeight: 'bold' }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>الأولوية</Text>
            <View style={styles.chips}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity key={p} style={[styles.chip, newPriority === p && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setNewPriority(p)} activeOpacity={0.7}>
                  <Text style={[styles.chipText, newPriority === p && { color: '#fff', fontWeight: 'bold' }]}>{PRIORITY_LABELS[p]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>الوصف (اختياري)</Text>
            <TextInput style={[styles.input, { height: 80 }]} value={newDescription} onChangeText={setNewDescription} placeholder="تفاصيل الهدف..." placeholderTextColor={colors.textMuted} multiline textAlign="right" />

            <Text style={styles.fieldLabel}>مدة الهدف</Text>
            <View style={styles.chips}>
              <TouchableOpacity style={[styles.chip, deadlineMode === 'life' && styles.chipActive]} onPress={() => setDeadlineMode('life')} activeOpacity={0.7}>
                <Text style={[styles.chipText, deadlineMode === 'life' && styles.chipTextActive]}>🌱 هدف حياة</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.chip, deadlineMode === 'date' && styles.chipActive]} onPress={() => setDeadlineMode('date')} activeOpacity={0.7}>
                <Text style={[styles.chipText, deadlineMode === 'date' && styles.chipTextActive]}>📅 له موعد نهائي</Text>
              </TouchableOpacity>
            </View>
            {deadlineMode === 'date' && (
              <TextInput style={[styles.input, { marginTop: Spacing.sm }]} value={newDeadline} onChangeText={setNewDeadline} placeholder="YYYY-MM-DD مثل 2026-12-31" placeholderTextColor={colors.textMuted} keyboardType="numbers-and-punctuation" textAlign="right" />
            )}

            <TouchableOpacity style={[styles.saveBtn, (!newTitle || createMutation.isPending) && { opacity: 0.5 }]} onPress={() => createMutation.mutate()} disabled={!newTitle || createMutation.isPending} activeOpacity={0.8}>
              {createMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>💾 حفظ الهدف</Text>}
            </TouchableOpacity>
            
            {/* Added extra padding at bottom to ensure scrolling works well with keyboard */}
            <View style={{ height: 60 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: Typography.size.xl, fontWeight: 'bold', color: colors.text },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full },
  addBtnText: { color: '#fff', fontSize: Typography.size.sm, fontWeight: '700' },
  filterBar: { flexDirection: 'row-reverse', backgroundColor: colors.surface, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterChip: { flex: 1, minHeight: 42, paddingHorizontal: Spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  filterChipText: { color: colors.textSecondary, fontSize: Typography.size.sm, fontWeight: '600' },
  filterChipTextActive: { color: '#fff', fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 50, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.size.lg, fontWeight: 'bold', color: colors.text },
  emptyText: { fontSize: Typography.size.sm, color: colors.textSecondary, marginTop: Spacing.xs },
  goalCard: { backgroundColor: colors.card, borderRadius: BorderRadius.lg, marginBottom: Spacing.md, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  catBar: { width: 8 }, // Made category color bar wider for better visual hierarchy
  goalContent: { flex: 1, padding: Spacing.md },
  goalTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  catLabel: { fontSize: Typography.size.xs, color: colors.textSecondary, fontWeight: '600' },
  priorityLabel: { fontSize: Typography.size.xs },
  goalTitle: { fontSize: Typography.size.base, fontWeight: '700', color: colors.text, textAlign: 'right', marginBottom: Spacing.xs },
  goalDesc: { fontSize: Typography.size.xs, color: colors.textSecondary, textAlign: 'right', marginBottom: Spacing.sm, lineHeight: 18 },
  deadlineText: { fontSize: Typography.size.xs, color: colors.textSecondary, textAlign: 'right', marginBottom: Spacing.sm },
  progressBarWrap: { height: 6, backgroundColor: colors.border, borderRadius: 3, marginBottom: 4, overflow: 'hidden' }, // Thicker progress bar
  progressBarFill: { height: '100%', borderRadius: 3 },
  progressPct: { fontSize: Typography.size.xs, color: colors.textMuted, textAlign: 'right', marginBottom: Spacing.sm, fontWeight: '600' },
  goalActions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  completeGoalBtn: { borderWidth: 1, borderColor: colors.success, backgroundColor: colors.successBg, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  completeGoalBtnText: { color: colors.successText, fontSize: Typography.size.xs, fontWeight: '700' },
  pauseGoalBtn: { borderWidth: 1, borderColor: colors.warning, backgroundColor: colors.warningBg, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs }, 
  pauseGoalText: { color: colors.warningText, fontSize: Typography.size.xs, fontWeight: '700' },
  resumeGoalBtn: { borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surfaceMuted, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs }, 
  resumeGoalText: { color: colors.primary, fontSize: Typography.size.xs, fontWeight: '700' },
  deleteGoalBtn: { borderWidth: 1, borderColor: colors.error, backgroundColor: colors.errorBg, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs }, 
  deleteGoalText: { color: colors.errorText, fontSize: Typography.size.xs, fontWeight: '700' },
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  modalTitle: { fontSize: Typography.size.xl, fontWeight: 'bold', color: colors.text },
  fieldLabel: { fontSize: Typography.size.sm, fontWeight: '700', color: colors.text, textAlign: 'right', marginBottom: Spacing.xs, marginTop: Spacing.lg },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, backgroundColor: colors.inputBackground, fontSize: Typography.size.base, color: colors.text, minHeight: 48 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipText: { fontSize: Typography.size.sm, color: colors.textSecondary },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary }, 
  chipTextActive: { color: '#fff', fontWeight: '700' },
  saveBtn: { backgroundColor: colors.primary, padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.xl, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  saveBtnText: { color: '#fff', fontSize: Typography.size.lg, fontWeight: 'bold' },
});
