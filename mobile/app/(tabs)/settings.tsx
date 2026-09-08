import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { authApi, userApi } from '../../src/services/endpoints';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { Spacing, Typography, BorderRadius } from '../../src/constants/theme';
import { ThemePreference, useAppTheme } from '../../src/theme/ThemeProvider';

export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { logout, user } = useAuthStore();
  const { colors, preference, setPreference } = useAppTheme();
  const styles = makeStyles(colors);

  const [groqKey, setGroqKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => userApi.getSettings().then((r) => r.data.data),
  });

  const aiConnected = settings?.aiSettings?.groqKeyLast4;

  const saveKeyMutation = useMutation({
    mutationFn: () => userApi.saveAiKey(groqKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setShowKeyInput(false);
      setGroqKey('');
      Alert.alert('✅ تم الاتصال!', 'تم حفظ مفتاح Groq بنجاح');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'مفتاح Groq غير صحيح';
      Alert.alert('خطأ', msg);
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: () => userApi.deleteAiKey(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      Alert.alert('تم', 'تم إزالة مفتاح Groq');
    },
  });

  const testKeyMutation = useMutation({
    mutationFn: () => userApi.testAiKey(),
    onSuccess: () => Alert.alert('✅ المفتاح يعمل', 'الاتصال بـ Groq ناجح'),
    onError: () => Alert.alert('❌ المفتاح لا يعمل', 'المفتاح إما منتهي أو غير صالح'),
  });

  const changePasswordMutation = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setShowPasswordForm(false);
      Alert.alert('تم تغيير كلمة المرور', 'كلمة مرورك الجديدة أصبحت فعّالة.');
    },
    onError: (err: any) => Alert.alert('تعذر التغيير', err?.response?.data?.message || 'تحقق من كلمة المرور الحالية وحاول مرة أخرى.'),
  });

  function changePassword() {
    if (newPassword.length < 8) return Alert.alert('كلمة المرور قصيرة', 'استخدم 8 أحرف على الأقل.');
    if (newPassword !== confirmPassword) return Alert.alert('كلمتا المرور غير متطابقتين', 'أعد كتابة كلمة المرور الجديدة.');
    changePasswordMutation.mutate();
  }

  async function chooseTheme(next: ThemePreference) {
    await setPreference(next);
    userApi.updateSettings({ theme: next }).catch(() => undefined);
  }

  async function handleLogout() {
    Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج؟', [
      { text: 'لأ', style: 'cancel' },
      {
        text: 'نعم', style: 'destructive',
        onPress: async () => { await logout(); router.replace('/(auth)/login'); },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>الإعدادات ⚙️</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الحساب</Text>
          <View style={styles.card}>
            <Text style={styles.userName}>{user?.name || 'المستخدم'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>المظهر</Text>
          <View style={styles.card}>
            <Text style={styles.themeDescription}>اختر المظهر المناسب لك. خيار النظام يتبع إعداد جهازك تلقائيًا.</Text>
            <View style={styles.themeChoices}>
              {([
                ['light', '☀️', 'فاتح'],
                ['dark', '🌙', 'داكن'],
                ['system', '📱', 'النظام'],
              ] as [ThemePreference, string, string][]).map(([value, icon, label]) => (
                <TouchableOpacity 
                  key={value} 
                  style={[styles.themeChoice, preference === value && styles.themeChoiceSelected]} 
                  onPress={() => chooseTheme(value)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.themeIcon}>{icon}</Text>
                  <Text style={[styles.themeChoiceText, preference === value && styles.themeChoiceTextSelected]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الأمان</Text>
          <View style={styles.card}>
            <View style={styles.securityHeading}>
              <View>
                <Text style={styles.securityTitle}>كلمة المرور</Text>
                <Text style={styles.securityHint}>حدّثها بانتظام للحفاظ على أمان حسابك</Text>
              </View>
              <Text style={styles.securityIcon}>🔒</Text>
            </View>
            {!showPasswordForm ? (
              <TouchableOpacity style={styles.outlineFullBtn} onPress={() => setShowPasswordForm(true)} activeOpacity={0.7}>
                <Text style={styles.outlineBtnText}>تغيير كلمة المرور</Text>
              </TouchableOpacity>
            ) : <View style={styles.passwordForm}>
              <TextInput style={styles.keyInput} value={currentPassword} onChangeText={setCurrentPassword} placeholder="كلمة المرور الحالية" placeholderTextColor={colors.textMuted} secureTextEntry textAlign="right" autoComplete="current-password" />
              <TextInput style={styles.keyInput} value={newPassword} onChangeText={setNewPassword} placeholder="كلمة المرور الجديدة (8 أحرف على الأقل)" placeholderTextColor={colors.textMuted} secureTextEntry textAlign="right" autoComplete="new-password" />
              <TextInput style={styles.keyInput} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="تأكيد كلمة المرور الجديدة" placeholderTextColor={colors.textMuted} secureTextEntry textAlign="right" autoComplete="new-password" />
              <View style={styles.aiActions}>
                <TouchableOpacity style={[styles.connectBtn, { flex: 1 }, changePasswordMutation.isPending && styles.btnDisabled]} onPress={changePassword} disabled={changePasswordMutation.isPending} activeOpacity={0.8}>
                  {changePasswordMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.connectBtnText}>حفظ التغيير</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowPasswordForm(false)} activeOpacity={0.7}>
                  <Text style={styles.outlineBtnText}>إلغاء</Text>
                </TouchableOpacity>
              </View>
            </View>}
          </View>
        </View>

        {/* AI (Groq) Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤖 الذكاء الاصطناعي (Groq)</Text>
          <View style={styles.card}>
            <View style={styles.aiStatus}>
              <View style={[styles.statusDot, { backgroundColor: aiConnected ? colors.success : colors.textMuted }]} />
              <Text style={styles.aiStatusText}>
                {aiConnected ? `متصل (••••${aiConnected})` : 'غير متصل'}
              </Text>
            </View>

            {!aiConnected ? (
              <>
                {!showKeyInput ? (
                  <TouchableOpacity style={styles.connectBtn} onPress={() => setShowKeyInput(true)} activeOpacity={0.8}>
                    <Text style={styles.connectBtnText}>🔑 ربط مفتاح Groq</Text>
                  </TouchableOpacity>
                ) : (
                  <View>
                    <TextInput
                      style={styles.keyInput}
                      placeholder="gsk_xxxxxxxxxxxxxxxx"
                      placeholderTextColor={colors.textMuted}
                      value={groqKey}
                      onChangeText={setGroqKey}
                      autoCapitalize="none"
                      secureTextEntry
                    />
                    <Text style={styles.keyHint}>
                      احصل على مفتاحك المجاني من console.groq.com/keys
                    </Text>
                    <TouchableOpacity
                      style={[styles.connectBtn, (!groqKey.startsWith('gsk_') || saveKeyMutation.isPending) && styles.btnDisabled]}
                      onPress={() => saveKeyMutation.mutate()}
                      disabled={!groqKey.startsWith('gsk_') || saveKeyMutation.isPending}
                      activeOpacity={0.8}
                    >
                      {saveKeyMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.connectBtnText}>اتصل</Text>}
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.aiActions}>
                <TouchableOpacity style={styles.outlineBtn} onPress={() => testKeyMutation.mutate()} disabled={testKeyMutation.isPending} activeOpacity={0.7}>
                  {testKeyMutation.isPending ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.outlineBtnText}>اختبر الاتصال</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.outlineBtn, { borderColor: colors.error, backgroundColor: colors.errorBg }]} onPress={() => Alert.alert('إزالة المفتاح', 'هل تريد إزالة مفتاح Groq؟', [{ text: 'لأ', style: 'cancel' }, { text: 'نعم', style: 'destructive', onPress: () => deleteKeyMutation.mutate() }])} activeOpacity={0.7}>
                  <Text style={[styles.outlineBtnText, { color: colors.errorText }]}>فصل المفتاح</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Prayer Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🕌 مواقيت الصلاة</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>المدينة</Text>
              <Text style={styles.settingValue}>{settings?.prayerSettings?.city || 'Cairo'}</Text>
            </View>
            <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.settingLabel}>طريقة الحساب</Text>
              <Text style={styles.settingValue}>{settings?.prayerSettings?.calculationMethod || 'Egypt'}</Text>
            </View>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={styles.logoutBtnText}>🚪 تسجيل الخروج</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: Spacing.base, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: Typography.size.xl, fontWeight: 'bold', color: colors.text },
  content: { padding: Spacing.base, paddingBottom: 100 },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: Typography.size.base, fontWeight: '800', color: colors.text, marginBottom: Spacing.sm, textAlign: 'right' },
  
  card: { backgroundColor: colors.card, borderRadius: BorderRadius.lg, padding: Spacing.base, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: colors.border },
  
  userName: { fontSize: Typography.size.lg, fontWeight: 'bold', color: colors.text, textAlign: 'right' },
  userEmail: { fontSize: Typography.size.sm, color: colors.textSecondary, textAlign: 'right', marginTop: 2 },
  
  aiStatus: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: Spacing.md, gap: Spacing.sm },
  statusDot: { width: 12, height: 12, borderRadius: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 1 },
  aiStatusText: { fontSize: Typography.size.base, color: colors.text, fontWeight: '600' },
  
  connectBtn: { backgroundColor: colors.primary, padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.sm, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  connectBtnText: { color: '#fff', fontWeight: '800', fontSize: Typography.size.base },
  btnDisabled: { opacity: 0.5 },
  
  keyInput: { borderWidth: 1, borderColor: colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: Typography.size.base, color: colors.text, backgroundColor: colors.inputBackground, marginBottom: Spacing.xs, minHeight: 48 },
  keyHint: { fontSize: Typography.size.xs, color: colors.textMuted, marginBottom: Spacing.sm, textAlign: 'center' },
  
  aiActions: { flexDirection: 'row-reverse', gap: Spacing.sm, marginTop: Spacing.sm },
  
  securityHeading: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  securityTitle: { color: colors.text, fontWeight: '800', fontSize: Typography.size.base, textAlign: 'right' },
  securityHint: { color: colors.textSecondary, fontSize: Typography.size.xs, marginTop: 2, textAlign: 'right' },
  securityIcon: { fontSize: 22 },
  
  outlineFullBtn: { borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface, padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center' },
  passwordForm: { gap: Spacing.sm },
  outlineBtn: { flex: 1, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface, padding: Spacing.sm, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { color: colors.primary, fontWeight: '700', fontSize: Typography.size.sm },
  
  settingRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  settingLabel: { fontSize: Typography.size.sm, color: colors.textSecondary },
  settingValue: { fontSize: Typography.size.sm, fontWeight: '700', color: colors.text },
  
  themeDescription: { fontSize: Typography.size.sm, lineHeight: 20, color: colors.textSecondary, textAlign: 'right', marginBottom: Spacing.md },
  themeChoices: { flexDirection: 'row-reverse', gap: Spacing.sm }, 
  themeChoice: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, 
  themeChoiceSelected: { borderColor: colors.primary, backgroundColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 }, 
  themeIcon: { fontSize: 24, marginBottom: Spacing.xs }, 
  themeChoiceText: { fontSize: Typography.size.xs, fontWeight: '700', color: colors.textSecondary }, 
  themeChoiceTextSelected: { color: '#fff' },
  
  logoutBtn: { padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: colors.error, backgroundColor: colors.errorBg, alignItems: 'center', marginTop: Spacing.md },
  logoutBtnText: { color: colors.errorText, fontSize: Typography.size.base, fontWeight: '800' },
});
