import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { goalsApi } from '../../src/services/endpoints';
import { Colors, Spacing, Typography, BorderRadius } from '../../src/constants/theme';
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

const CATEGORIES = [
  { value: 'deen', label: '🕌 الدين', color: Colors.deen },
  { value: 'dunya', label: '🌍 الدنيا', color: Colors.dunya },
  { value: 'health', label: '🏃 الصحة', color: '#059669' },
  { value: 'learning', label: '📚 التعلم', color: '#7C3AED' },
  { value: 'work', label: '💼 العمل', color: '#1D4ED8' },
];

const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const PRIORITY_LABELS: Record<string, string> = { critical: '🔴 حرج', high: '🟠 عالي', medium: '🟡 متوسط', low: '🟢 منخفض' };

export default function GoalsScreen() {
  const { colors } = useAppTheme();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('active');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('deen');
  const [newPriority, setNewPriority] = useState('medium');
  const [newDescription, setNewDescription] = useState('');
  const [deadlineMode, setDeadlineMode] = useState<'life' | 'date'>('life');
  const [newDeadline, setNewDeadline] = useState('');

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={styles.title}>أهدافي 🎯</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.addBtnText}>+ هدف جديد</Text>
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {['active', 'paused', 'completed'].map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }, filter === s && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => setFilter(s)}
          >
            <Text style={[styles.filterChipText, filter === s && styles.filterChipTextActive]}>
              {s === 'active' ? 'نشطة' : s === 'paused' ? 'موقوفة' : 'مكتملة'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.base, paddingBottom: 100 }}>
        {isLoading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />}

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
            <View key={goal._id} style={[styles.goalCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.catBar, { backgroundColor: cat?.color || Colors.primary }]} />
              <View style={styles.goalContent}>
                <View style={styles.goalTop}>
                  <Text style={styles.catLabel}>{cat?.label || goal.category}</Text>
                  <Text style={styles.priorityLabel}>{PRIORITY_LABELS[goal.priority] || goal.priority}</Text>
                </View>
                <Text style={[styles.goalTitle, { color: colors.text }]}>{goal.title}</Text>
                {goal.description ? <Text style={styles.goalDesc}>{goal.description}</Text> : null}
                <Text style={styles.deadlineText}>{goal.deadline ? `📅 الموعد: ${new Date(goal.deadline).toLocaleDateString('ar-EG')}` : '🌱 هدف حياة — بدون موعد نهائي'}</Text>
                {/* Progress bar */}
                <View style={styles.progressBarWrap}>
                  <View style={[styles.progressBarFill, { width: `${goal.progress}%` as any, backgroundColor: cat?.color || Colors.primary }]} />
                </View>
                <Text style={styles.progressPct}>{goal.progress}%</Text>

                <View style={styles.goalActions}>
                  {goal.status === 'active' && <><TouchableOpacity style={styles.pauseGoalBtn} onPress={() => Alert.alert('إيقاف الهدف', `سيظل هدف «${goal.title}» محفوظًا، لكن لن تزيد المهام المرتبطة به تقدمه.`, [{ text: 'إلغاء' }, { text: 'إيقاف', onPress: () => pauseMutation.mutate(goal._id) }])}><Text style={styles.pauseGoalText}>⏸ إيقاف</Text></TouchableOpacity><TouchableOpacity style={styles.completeGoalBtn} onPress={() => Alert.alert('إكمال الهدف', `هل أكملت: ${goal.title}؟`, [{ text: 'لأ' }, { text: 'نعم', onPress: () => completeMutation.mutate(goal._id) }])}><Text style={styles.completeGoalBtnText}>✓ تم الإنجاز</Text></TouchableOpacity></>}
                  {goal.status === 'paused' && <TouchableOpacity style={styles.resumeGoalBtn} onPress={() => resumeMutation.mutate(goal._id)}><Text style={styles.resumeGoalText}>▶ استئناف الهدف</Text></TouchableOpacity>}
                  <TouchableOpacity style={styles.deleteGoalBtn} onPress={() => Alert.alert('حذف الهدف', `سيتم حذف «${goal.title}». الروتينات المرتبطة ستبقى، ولكن بلا هدف.`, [{ text: 'إلغاء' }, { text: 'حذف', style: 'destructive', onPress: () => deleteMutation.mutate(goal._id) }])}><Text style={styles.deleteGoalText}>حذف</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Add Goal Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>هدف جديد 🎯</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={{ color: Colors.error, fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: Spacing.base }}>
            <Text style={styles.fieldLabel}>العنوان *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={newTitle} onChangeText={setNewTitle} placeholder="مثال: حفظ القرآن الكريم" placeholderTextColor={colors.textMuted} textAlign="right" />

            <Text style={styles.fieldLabel}>الفئة</Text>
            <View style={styles.chips}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity key={c.value} style={[styles.chip, newCategory === c.value && { backgroundColor: c.color, borderColor: c.color }]} onPress={() => setNewCategory(c.value)}>
                  <Text style={[styles.chipText, newCategory === c.value && { color: '#fff' }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>الأولوية</Text>
            <View style={styles.chips}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity key={p} style={[styles.chip, newPriority === p && { backgroundColor: Colors.primary, borderColor: Colors.primary }]} onPress={() => setNewPriority(p)}>
                  <Text style={[styles.chipText, newPriority === p && { color: '#fff' }]}>{PRIORITY_LABELS[p]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>الوصف (اختياري)</Text>
            <TextInput style={[styles.input, { height: 80, backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={newDescription} onChangeText={setNewDescription} placeholder="تفاصيل الهدف..." placeholderTextColor={colors.textMuted} multiline textAlign="right" />

            <Text style={styles.fieldLabel}>مدة الهدف</Text>
            <View style={styles.chips}>
              <TouchableOpacity style={[styles.chip, deadlineMode === 'life' && styles.chipActive]} onPress={() => setDeadlineMode('life')}><Text style={[styles.chipText, deadlineMode === 'life' && styles.chipTextActive]}>🌱 هدف حياة</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.chip, deadlineMode === 'date' && styles.chipActive]} onPress={() => setDeadlineMode('date')}><Text style={[styles.chipText, deadlineMode === 'date' && styles.chipTextActive]}>📅 له موعد نهائي</Text></TouchableOpacity>
            </View>
            {deadlineMode === 'date' && <TextInput style={[styles.input, { marginTop: Spacing.sm, backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={newDeadline} onChangeText={setNewDeadline} placeholder="YYYY-MM-DD مثل 2026-12-31" placeholderTextColor={colors.textMuted} keyboardType="numbers-and-punctuation" textAlign="right" />}

            <TouchableOpacity style={[styles.saveBtn, (!newTitle || createMutation.isPending) && { opacity: 0.5 }]} onPress={() => createMutation.mutate()} disabled={!newTitle || createMutation.isPending}>
              {createMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>💾 حفظ الهدف</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: Typography.size.xl, fontWeight: 'bold', color: Colors.text },
  addBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full },
  addBtnText: { color: '#fff', fontSize: Typography.size.sm, fontWeight: '700' },
  filterBar: { flexDirection: 'row-reverse', backgroundColor: Colors.surface, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterChip: { flex: 1, minHeight: 42, paddingHorizontal: Spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary, shadowColor: Colors.primary, shadowOpacity: 0.16, shadowRadius: 5, elevation: 2 },
  filterChipText: { color: Colors.textSecondary, fontSize: Typography.size.sm, fontWeight: '600' },
  filterChipTextActive: { color: '#fff', fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 50, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.size.lg, fontWeight: 'bold', color: Colors.text },
  emptyText: { fontSize: Typography.size.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  goalCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, marginBottom: Spacing.md, flexDirection: 'row', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  catBar: { width: 5 },
  goalContent: { flex: 1, padding: Spacing.md },
  goalTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  catLabel: { fontSize: Typography.size.xs, color: Colors.textSecondary },
  priorityLabel: { fontSize: Typography.size.xs },
  goalTitle: { fontSize: Typography.size.base, fontWeight: '700', color: Colors.text, textAlign: 'right', marginBottom: Spacing.xs },
  goalDesc: { fontSize: Typography.size.xs, color: Colors.textSecondary, textAlign: 'right', marginBottom: Spacing.sm },
  deadlineText: { fontSize: Typography.size.xs, color: Colors.textSecondary, textAlign: 'right', marginBottom: Spacing.sm },
  progressBarWrap: { height: 4, backgroundColor: Colors.border, borderRadius: 2, marginBottom: 2 },
  progressBarFill: { height: 4, borderRadius: 2 },
  progressPct: { fontSize: Typography.size.xs, color: Colors.textMuted, textAlign: 'right', marginBottom: Spacing.sm },
  goalActions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  completeGoalBtn: { borderWidth: 1, borderColor: Colors.success, borderRadius: BorderRadius.sm, padding: Spacing.xs },
  completeGoalBtnText: { color: Colors.success, fontSize: Typography.size.xs, fontWeight: '600' },
  pauseGoalBtn: { borderWidth: 1, borderColor: Colors.warning, borderRadius: BorderRadius.sm, padding: Spacing.xs }, pauseGoalText: { color: '#B45309', fontSize: Typography.size.xs, fontWeight: '600' },
  resumeGoalBtn: { borderWidth: 1, borderColor: Colors.primary, borderRadius: BorderRadius.sm, padding: Spacing.xs }, resumeGoalText: { color: Colors.primary, fontSize: Typography.size.xs, fontWeight: '600' },
  deleteGoalBtn: { borderWidth: 1, borderColor: '#FECACA', borderRadius: BorderRadius.sm, padding: Spacing.xs }, deleteGoalText: { color: Colors.error, fontSize: Typography.size.xs, fontWeight: '600' },
  modal: { flex: 1, backgroundColor: Colors.bg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: Typography.size.xl, fontWeight: 'bold', color: Colors.text },
  fieldLabel: { fontSize: Typography.size.sm, fontWeight: '600', color: Colors.text, textAlign: 'right', marginBottom: Spacing.xs, marginTop: Spacing.md },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, backgroundColor: Colors.surface, fontSize: Typography.size.base, color: Colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border },
  chipText: { fontSize: Typography.size.xs, color: Colors.text },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary }, chipTextActive: { color: '#fff', fontWeight: '700' },
  saveBtn: { backgroundColor: Colors.primary, padding: Spacing.base, borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.xl },
  saveBtnText: { color: '#fff', fontSize: Typography.size.md, fontWeight: '700' },
});
