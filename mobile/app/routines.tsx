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
    <View style={styles.header}><TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>← رجوع</Text></TouchableOpacity><View><Text style={styles.title}>روتيناتي 🔄</Text><Text style={styles.subtitle}>عدّل أو أوقف أو احذف روتينك</Text></View></View>
    <ScrollView contentContainerStyle={styles.content}>
      {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />}
      {!isLoading && routines.length === 0 && <Text style={styles.empty}>لا توجد روتينات بعد. أضف واحدًا من صفحة «أضف جديد».</Text>}
      {routines.map((routine) => <View key={routine._id} style={[styles.card, !routine.enabled && styles.disabledCard]}>
        <View style={styles.cardTop}><View><Text style={styles.routineTitle}>{routine.title}</Text><Text style={styles.meta}>{routine.duration} دقيقة · {routine.anchor ? anchorName(routine.anchor) : 'وقت تختاره الخطة'}</Text></View><Text style={styles.status}>{routine.enabled ? 'مفعّل' : 'متوقف'}</Text></View>
        <View style={styles.actions}><TouchableOpacity style={styles.editButton} onPress={() => beginEdit(routine)}><Text style={styles.editText}>تعديل</Text></TouchableOpacity><TouchableOpacity style={styles.toggleButton} onPress={() => update.mutate({ id: routine._id, data: { enabled: !routine.enabled } })}><Text style={styles.toggleText}>{routine.enabled ? 'إيقاف' : 'تفعيل'}</Text></TouchableOpacity><TouchableOpacity style={styles.deleteButton} onPress={() => confirmDelete(routine)}><Text style={styles.deleteText}>حذف</Text></TouchableOpacity></View>
      </View>)}
    </ScrollView>
    {editing && <View style={styles.editorOverlay}><ScrollView contentContainerStyle={styles.editor}><Text style={styles.editorTitle}>تعديل الروتين</Text><Text style={styles.label}>الاسم</Text><TextInput style={styles.input} value={title} onChangeText={setTitle} textAlign="right" /><Text style={styles.label}>المدة بالدقائق</Text><TextInput style={styles.input} value={duration} onChangeText={setDuration} keyboardType="number-pad" textAlign="right" /><Text style={styles.label}>وقت الصلاة (اختياري)</Text><View style={styles.anchors}><Chip active={!anchor} label="بدون وقت محدد" onPress={() => setAnchor('')} styles={styles} />{PRAYER_ANCHORS.map(([value, label]) => <Chip key={value} active={anchor === value} label={label} onPress={() => setAnchor(value)} styles={styles} />)}</View><View style={styles.editorActions}><TouchableOpacity style={styles.cancel} onPress={() => setEditing(null)}><Text style={styles.cancelText}>إلغاء</Text></TouchableOpacity><TouchableOpacity style={styles.save} onPress={save} disabled={update.isPending}>{update.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>حفظ التعديلات</Text>}</TouchableOpacity></View></ScrollView></View>}
  </SafeAreaView>;
}

function Chip({ active, label, onPress, styles }: any) { return <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}><Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></TouchableOpacity>; }
function anchorName(anchor: string) { return PRAYER_ANCHORS.find(([value]) => value === anchor)?.[1] || anchor; }

const makeStyles = (c: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background }, header: { backgroundColor: c.surface, padding: Spacing.base, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: c.border }, back: { color: c.primary, fontWeight: '700' }, title: { color: c.text, fontSize: Typography.size.xl, fontWeight: '800', textAlign: 'right' }, subtitle: { color: c.textSecondary, fontSize: Typography.size.xs, textAlign: 'right' }, content: { padding: Spacing.base, paddingBottom: 90 }, empty: { color: c.textSecondary, textAlign: 'center', marginTop: Spacing.xl }, card: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.sm }, disabledCard: { opacity: 0.6 }, cardTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start' }, routineTitle: { color: c.text, fontSize: Typography.size.md, fontWeight: '800', textAlign: 'right' }, meta: { color: c.textSecondary, fontSize: Typography.size.xs, textAlign: 'right', marginTop: 4 }, status: { color: c.primary, fontSize: Typography.size.xs, fontWeight: '700' }, actions: { flexDirection: 'row-reverse', gap: Spacing.sm, marginTop: Spacing.md }, editButton: { flex: 1, padding: Spacing.sm, borderRadius: BorderRadius.sm, backgroundColor: c.primary, alignItems: 'center' }, editText: { color: '#fff', fontWeight: '700' }, toggleButton: { flex: 1, padding: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: c.border, alignItems: 'center' }, toggleText: { color: c.textSecondary, fontWeight: '700' }, deleteButton: { padding: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: c.error, alignItems: 'center' }, deleteText: { color: c.error, fontWeight: '700' }, editorOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.38)', justifyContent: 'flex-end' }, editor: { backgroundColor: c.background, borderTopLeftRadius: BorderRadius.lg, borderTopRightRadius: BorderRadius.lg, padding: Spacing.base, paddingBottom: 36, maxHeight: '88%' }, editorTitle: { color: c.text, fontSize: Typography.size.lg, fontWeight: '800', textAlign: 'right', marginBottom: Spacing.base }, label: { color: c.text, fontSize: Typography.size.sm, fontWeight: '700', textAlign: 'right', marginBottom: Spacing.xs, marginTop: Spacing.sm }, input: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: BorderRadius.md, color: c.text, padding: Spacing.md }, anchors: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: Spacing.sm }, chip: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }, chipActive: { backgroundColor: c.primary, borderColor: c.primary }, chipText: { color: c.textSecondary, fontSize: Typography.size.xs }, chipTextActive: { color: '#fff', fontWeight: '700' }, editorActions: { flexDirection: 'row-reverse', gap: Spacing.sm, marginTop: Spacing.xl }, save: { flex: 1, backgroundColor: c.primary, padding: Spacing.md, alignItems: 'center', borderRadius: BorderRadius.md }, saveText: { color: '#fff', fontWeight: '800' }, cancel: { padding: Spacing.md, borderWidth: 1, borderColor: c.border, borderRadius: BorderRadius.md }, cancelText: { color: c.textSecondary, fontWeight: '700' },
});
