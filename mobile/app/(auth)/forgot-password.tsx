import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { authApi } from '../../src/services/endpoints';
import { BorderRadius, Spacing, Typography } from '../../src/constants/theme';
import { useAppTheme } from '../../src/theme/ThemeProvider';

type Step = 'email' | 'reset';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    if (!/^\S+@\S+\.\S+$/.test(email)) return Alert.alert('تحقق من البريد', 'اكتب بريدًا إلكترونيًا صحيحًا.');
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      setStep('reset');
      Alert.alert('تم الإرسال', 'لو الحساب موجود، هيوصلك كود من 6 أرقام على البريد.');
    } catch (error: any) {
      Alert.alert('تعذر الإرسال', error?.response?.data?.message || 'حاول مرة أخرى لاحقًا.');
    } finally { setLoading(false); }
  }

  async function submitReset() {
    if (!/^\d{6}$/.test(code)) return Alert.alert('تحقق من الكود', 'الكود يتكوّن من 6 أرقام.');
    if (password.length < 8) return Alert.alert('كلمة المرور قصيرة', 'استخدم 8 أحرف على الأقل.');
    if (password !== confirmPassword) return Alert.alert('كلمتا المرور غير متطابقتين', 'أعد كتابة كلمة المرور نفسها.');
    setLoading(true);
    try {
      await authApi.resetPassword({ email: email.trim().toLowerCase(), code, password });
      Alert.alert('تم التغيير ✅', 'تقدر تسجّل الدخول بكلمة المرور الجديدة.', [{ text: 'تسجيل الدخول', onPress: () => router.replace('/(auth)/login') }]);
    } catch (error: any) {
      Alert.alert('تعذر التغيير', error?.response?.data?.message || 'تأكد من الكود وحاول مرة أخرى.');
    } finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <Text style={[styles.appName, { color: colors.primary }]}>دين ودنيا</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>نساعدك ترجع لحسابك بأمان</Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            {step === 'email' ? 'نسيت كلمة المرور؟ 🔑' : 'أنشئ كلمة مرور جديدة'}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {step === 'email'
              ? 'اكتب بريد حسابك وسنرسل لك كودًا صالحًا لمدة 15 دقيقة.'
              : `أدخل الكود المُرسل إلى ${email}`}
          </Text>

          {step === 'email' ? (
            <Field label="البريد الإلكتروني" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" colors={colors} styles={styles} />
          ) : (
            <>
              <Field label="كود التأكيد (6 أرقام)" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} colors={colors} styles={styles} />
              <Field label="كلمة المرور الجديدة" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" colors={colors} styles={styles} />
              <Field label="تأكيد كلمة المرور" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoComplete="new-password" colors={colors} styles={styles} />
              <TouchableOpacity onPress={sendCode} disabled={loading} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.resend, { color: colors.primary }]}>إرسال كود جديد</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, loading && styles.disabled]}
            onPress={step === 'email' ? sendCode : submitReset}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>{step === 'email' ? 'إرسال الكود' : 'حفظ كلمة المرور'}</Text>
            }
          </TouchableOpacity>

          <Link href={'/(auth)/login' as any} asChild>
            <TouchableOpacity style={styles.back} activeOpacity={0.7}>
              <Text style={[styles.backText, { color: colors.textSecondary }]}>← العودة لتسجيل الدخول</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, colors, styles, ...props }: any) {
  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        textAlign="right"
      />
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  container: { flexGrow: 1, padding: Spacing.base, justifyContent: 'center' },
  brand: { alignItems: 'center', marginBottom: Spacing['2xl'] },
  appName: { fontSize: Typography.size['2xl'], fontWeight: '800' },
  tagline: { marginTop: Spacing.xs, fontSize: Typography.size.sm },
  card: {
    padding: Spacing.xl, borderRadius: BorderRadius.lg, borderWidth: 1,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, elevation: 3,
  },
  title: { fontSize: Typography.size.xl, fontWeight: '800', textAlign: 'right' },
  description: { fontSize: Typography.size.sm, lineHeight: 22, textAlign: 'right', marginTop: Spacing.sm, marginBottom: Spacing.xl },
  group: { marginBottom: Spacing.md },
  label: { fontSize: Typography.size.sm, fontWeight: '700', textAlign: 'right', marginBottom: Spacing.xs },
  input: {
    borderWidth: 1, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    fontSize: Typography.size.base, minHeight: 50,
  },
  button: { paddingVertical: 15, borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.sm },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: Typography.size.base },
  resend: { fontWeight: '700', textAlign: 'center', marginTop: Spacing.xs, paddingVertical: Spacing.xs },
  back: { paddingTop: Spacing.base, alignItems: 'center' },
  backText: { fontSize: Typography.size.sm },
});
