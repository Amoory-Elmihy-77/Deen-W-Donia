import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { routinesApi } from '../src/services/endpoints';
import { BorderRadius, Spacing, Typography } from '../src/constants/theme';
import { useAppTheme } from '../src/theme/ThemeProvider';

type Routine = { _id: string; title: string; duration: number; enabled: boolean; anchor?: string; schedulingType: string };

const PRAYER_ANCHORS = [
  ['after_fajr', 'بعد الفجر 🌅'], ['after_dhuhr', 'بعد الظهر 🕌'], ['before_asr', 'قبل العصر'],
  ['after_asr', 'بعد العصر 🌇'], ['after_maghrib', 'بعد المغرب 🌙'], ['after_isha', 'بعد العشاء ⭐'], ['before_sleep', 'قبل النوم 😴'],
] as const;

export default function RoutinesScreen() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Routine | null>(null);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('30');
  const [anchor, setAnchor] = useState('');

  const { data: routines = [], isLoading } = useQuery({ queryKey: ['routines'], queryFn: () => routinesApi.list().then((r) => r.data.data as Routine[]) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['routines'] });
  const update = useMutation({ mutationFn: ({ id, data }: { id: string; data: object }) => routinesApi.update(id, data), onSuccess: () => { refresh(); setEditing(null); } });
  const remove = useMutation({ mutationFn: (id: string) => routinesApi.delete(id), onSuccess: refresh });

  const beginEdit = (routine: Routine) => {
    setEditing(routine); setTitle(routine.title); setDuration(String(routine.duration)); setAnchor(routine.anchor || '');
  };
  const save = () => {
    const minutes = Number(duration);
    if (!title.trim() || !Number.isInteger(minutes) || minutes < 1 || minutes > 720) { Alert.alert('تحقق من البيانات', 'اكتب اسمًا ومدة من 1 إلى 720 دقيقة.'); return; }
    if (!editing) return;
    update.mutate({ id: editing._id, data: { title: title.trim(), duration: minutes, schedulingType: anchor ? 'prayer_anchor' : 'flexible', anchor: anchor || null } });
  };
  const confirmDelete = (routine: Routine) => Alert.alert('حذف الروتين؟', `سيتم حذف «${routine.title}» نهائيًا.`, [{ text: 'إلغاء', style: 'cancel' }, { text: 'حذف', style: 'destructive', onPress: () => remove.mutate(routine._id) }]);

  return <SafeAreaView style={styles.container} edges={['top']}>
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.back}>← رجوع</Text>
      </TouchableOpacity>
      <View>
        <Text style={styles.title}>روتيناتي 🔄</Text>
        <Text style={styles.subtitle}>عدّل أو أوقف أو احذف روتينك</Text>
      </View>
    </View>
    
    <ScrollView contentContainerStyle={styles.content}>
      {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />}
      {!isLoading && routines.length === 0 && <Text style={styles.empty}>لا توجد روتينات بعد. أضف واحدًا من صفحة «أضف جديد».</Text>}
      
      {routines.map((routine) => (
        <View key={routine._id} style={[styles.card, !routine.enabled && styles.disabledCard]}>
          <View style={styles.cardTop}>
            <View>
              <Text style={styles.routineTitle}>{routine.title}</Text>
              <Text style={styles.meta}>{routine.duration} دقيقة · {routine.anchor ? anchorName(routine.anchor) : 'وقت تختاره الخطة'}</Text>
            </View>
            <View style={[styles.statusBadge, routine.enabled ? { backgroundColor: colors.successBg } : { backgroundColor: colors.surfaceMuted }]}>
              <Text style={[styles.status, routine.enabled ? { color: colors.successText } : { color: colors.textSecondary }]}>
                {routine.enabled ? 'مفعّل' : 'متوقف'}
              </Text>
            </View>
          </View>
          
          <View style={styles.actions}>
            <TouchableOpacity style={styles.editButton} onPress={() => beginEdit(routine)} activeOpacity={0.8}>
              <Text style={styles.editText}>تعديل</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toggleButton} onPress={() => update.mutate({ id: routine._id, data: { enabled: !routine.enabled } })} activeOpacity={0.7}>
              <Text style={styles.toggleText}>{routine.enabled ? 'إيقاف' : 'تفعيل'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDelete(routine)} activeOpacity={0.7}>
              <Text style={styles.deleteText}>حذف</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
    
    {editing && (
      <View style={styles.editorOverlay}>
        <ScrollView contentContainerStyle={styles.editor} keyboardShouldPersistTaps="handled">
          <Text style={styles.editorTitle}>تعديل الروتين</Text>
          
          <Text style={styles.label}>الاسم</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} textAlign="right" placeholderTextColor={colors.textMuted} />
          
          <Text style={styles.label}>المدة بالدقائق</Text>
          <TextInput style={styles.input} value={duration} onChangeText={setDuration} keyboardType="number-pad" textAlign="right" placeholderTextColor={colors.textMuted} />
          
          <Text style={styles.label}>وقت الصلاة (اختياري)</Text>
          <View style={styles.anchors}>
            <Chip active={!anchor} label="بدون وقت محدد" onPress={() => setAnchor('')} styles={styles} />
            {PRAYER_ANCHORS.map(([value, label]) => (
              <Chip key={value} active={anchor === value} label={label} onPress={() => setAnchor(value)} styles={styles} />
            ))}
          </View>
          
          <View style={styles.editorActions}>
            <TouchableOpacity style={styles.cancel} onPress={() => setEditing(null)} activeOpacity={0.7}>
              <Text style={styles.cancelText}>إلغاء</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.save} onPress={save} disabled={update.isPending} activeOpacity={0.8}>
              {update.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>حفظ التعديلات</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    )}
  </SafeAreaView>;
}

function Chip({ active, label, onPress, styles }: any) { 
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  ); 
}

function anchorName(anchor: string) { return PRAYER_ANCHORS.find(([value]) => value === anchor)?.[1] || anchor; }

const makeStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, 
  header: { backgroundColor: colors.surface, padding: Spacing.base, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border }, 
  back: { color: colors.primary, fontWeight: '700' }, 
  title: { color: colors.text, fontSize: Typography.size.xl, fontWeight: '800', textAlign: 'right' }, 
  subtitle: { color: colors.textSecondary, fontSize: Typography.size.xs, textAlign: 'right' }, 
  content: { padding: Spacing.base, paddingBottom: 90 }, 
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl }, 
  
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }, 
  disabledCard: { opacity: 0.6, backgroundColor: colors.surface }, 
  cardTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start' }, 
  routineTitle: { color: colors.text, fontSize: Typography.size.md, fontWeight: '800', textAlign: 'right' }, 
  meta: { color: colors.textSecondary, fontSize: Typography.size.xs, textAlign: 'right', marginTop: 4 }, 
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  status: { fontSize: Typography.size.xs, fontWeight: '700' }, 
  
  actions: { flexDirection: 'row-reverse', gap: Spacing.sm, marginTop: Spacing.md }, 
  editButton: { flex: 1, padding: Spacing.sm, borderRadius: BorderRadius.sm, backgroundColor: colors.primary, alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 1 }, 
  editText: { color: '#fff', fontWeight: '700' }, 
  toggleButton: { flex: 1, padding: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' }, 
  toggleText: { color: colors.textSecondary, fontWeight: '700' }, 
  deleteButton: { padding: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: colors.error, backgroundColor: colors.errorBg, alignItems: 'center' }, 
  deleteText: { color: colors.errorText, fontWeight: '700' }, 
  
  editorOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', elevation: 10, zIndex: 10 }, 
  editor: { backgroundColor: colors.background, borderTopLeftRadius: BorderRadius.lg, borderTopRightRadius: BorderRadius.lg, padding: Spacing.lg, paddingBottom: 36, maxHeight: '88%' }, 
  editorTitle: { color: colors.text, fontSize: Typography.size.lg, fontWeight: '800', textAlign: 'right', marginBottom: Spacing.base }, 
  label: { color: colors.text, fontSize: Typography.size.sm, fontWeight: '700', textAlign: 'right', marginBottom: Spacing.xs, marginTop: Spacing.sm }, 
  input: { backgroundColor: colors.inputBackground, borderColor: colors.border, borderWidth: 1, borderRadius: BorderRadius.md, color: colors.text, padding: Spacing.md, minHeight: 48 }, 
  
  anchors: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: Spacing.sm }, 
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, 
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary }, 
  chipText: { color: colors.textSecondary, fontSize: Typography.size.xs }, 
  chipTextActive: { color: '#fff', fontWeight: '700' }, 
  
  editorActions: { flexDirection: 'row-reverse', gap: Spacing.sm, marginTop: Spacing.xl }, 
  save: { flex: 1, backgroundColor: colors.primary, padding: Spacing.md, alignItems: 'center', borderRadius: BorderRadius.md, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }, 
  saveText: { color: '#fff', fontWeight: '800', fontSize: Typography.size.md }, 
  cancel: { padding: Spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: BorderRadius.md, alignItems: 'center', backgroundColor: colors.surface }, 
  cancelText: { color: colors.textSecondary, fontWeight: '700', fontSize: Typography.size.md },
});
