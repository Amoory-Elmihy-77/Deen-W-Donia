import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { authApi } from '../../src/services/endpoints';
import { BorderRadius, Colors, Spacing, Typography } from '../../src/constants/theme';

type Step = 'email' | 'reset';

export default function ForgotPasswordScreen() {
  const router = useRouter();
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
      Alert.alert('تم التغيير', 'تقدر تسجّل الدخول بكلمة المرور الجديدة.', [{ text: 'تسجيل الدخول', onPress: () => router.replace('/(auth)/login') }]);
    } catch (error: any) {
      Alert.alert('تعذر التغيير', error?.response?.data?.message || 'تأكد من الكود وحاول مرة أخرى.');
    } finally { setLoading(false); }
  }

  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.brand}><Text style={styles.appName}>دين ودنيا</Text><Text style={styles.tagline}>نساعدك ترجع لحسابك بأمان</Text></View>
      <View style={styles.card}>
        <Text style={styles.title}>{step === 'email' ? 'نسيت كلمة المرور؟' : 'أنشئ كلمة مرور جديدة'}</Text>
        <Text style={styles.description}>{step === 'email' ? 'اكتب بريد حسابك وسنرسل لك كودًا صالحًا لمدة 15 دقيقة.' : `أدخل الكود المُرسل إلى ${email}`}</Text>
        {step === 'email' ? <Field label="البريد الإلكتروني" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" /> : <>
          <Field label="كود التأكيد" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
          <Field label="كلمة المرور الجديدة" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
          <Field label="تأكيد كلمة المرور" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoComplete="new-password" />
          <TouchableOpacity onPress={sendCode} disabled={loading}><Text style={styles.resend}>إرسال كود جديد</Text></TouchableOpacity>
        </>}
        <TouchableOpacity style={[styles.button, loading && styles.disabled]} onPress={step === 'email' ? sendCode : submitReset} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{step === 'email' ? 'إرسال الكود' : 'حفظ كلمة المرور'}</Text>}
        </TouchableOpacity>
        <Link href={'/(auth)/login' as any} asChild><TouchableOpacity style={styles.back}><Text style={styles.backText}>العودة لتسجيل الدخول</Text></TouchableOpacity></Link>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

function Field(props: any) { return <View style={styles.group}><Text style={styles.label}>{props.label}</Text><TextInput {...props} style={styles.input} placeholderTextColor={Colors.textMuted} autoCapitalize="none" textAlign="right" /></View>; }

const styles = StyleSheet.create({
  flex: { flex: 1 }, container: { flexGrow: 1, padding: Spacing.base, backgroundColor: Colors.bg, justifyContent: 'center' },
  brand: { alignItems: 'center', marginBottom: Spacing['2xl'] }, appName: { fontSize: Typography.size['3xl'], fontWeight: '800', color: Colors.primary }, tagline: { color: Colors.textSecondary, marginTop: Spacing.xs },
  card: { backgroundColor: Colors.surface, padding: Spacing.xl, borderRadius: BorderRadius.lg, shadowColor: '#0D7C66', shadowOpacity: .08, shadowRadius: 16, elevation: 3 },
  title: { fontSize: Typography.size.xl, fontWeight: '800', color: Colors.text, textAlign: 'right' }, description: { fontSize: Typography.size.sm, color: Colors.textSecondary, lineHeight: 21, textAlign: 'right', marginTop: Spacing.sm, marginBottom: Spacing.xl },
  group: { marginBottom: Spacing.md }, label: { fontSize: Typography.size.sm, fontWeight: '700', color: Colors.text, textAlign: 'right', marginBottom: Spacing.xs }, input: { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, color: Colors.text, fontSize: Typography.size.base },
  button: { backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.sm }, disabled: { opacity: .6 }, buttonText: { color: '#fff', fontWeight: '800', fontSize: Typography.size.base },
  resend: { color: Colors.primary, fontWeight: '700', textAlign: 'center', marginTop: Spacing.xs }, back: { paddingTop: Spacing.base, alignItems: 'center' }, backText: { color: Colors.textSecondary, fontSize: Typography.size.sm },
});
