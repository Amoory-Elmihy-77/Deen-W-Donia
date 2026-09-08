import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { Spacing, Typography, BorderRadius } from '../../src/constants/theme';
import { useAppTheme } from '../../src/theme/ThemeProvider';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('بيانات ناقصة', 'من فضلك ادخل البريد الإلكتروني وكلمة المرور');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)/home');
    } catch {
      Alert.alert('فشل تسجيل الدخول', 'البريد الإلكتروني أو كلمة المرور غير صحيحة. تحقق وحاول مجددًا.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>☪</Text>
          </View>
          <Text style={styles.appName}>دين ودنيا</Text>
          <Text style={styles.tagline}>نظّم يومك بين الدين والدنيا</Text>
        </View>

        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>أهلاً بعودتك 👋</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>البريد الإلكتروني</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              placeholder="example@email.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>كلمة المرور</Text>
              <Link href={'/(auth)/forgot-password' as any} asChild>
                <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.forgotText, { color: colors.primary }]}>نسيت كلمة المرور؟</Text>
                </TouchableOpacity>
              </Link>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>تسجيل الدخول</Text>
            )}
          </TouchableOpacity>

          <Link href="/(auth)/register" asChild>
            <TouchableOpacity style={styles.linkRow} activeOpacity={0.7}>
              <Text style={[styles.linkText, { color: colors.textSecondary }]}>
                مش عندك حساب؟{' '}
                <Text style={[styles.linkBold, { color: colors.primary }]}>سجّل دلوقتي</Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  container: { flexGrow: 1, padding: Spacing.base, justifyContent: 'center' },
  header: { alignItems: 'center', paddingTop: 32, paddingBottom: Spacing['2xl'] },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  logoText: { fontSize: 32, color: '#fff' },
  appName: { fontSize: Typography.size['2xl'], fontWeight: 'bold', color: colors.primary, marginBottom: Spacing.xs },
  tagline: { fontSize: Typography.size.sm, color: colors.textSecondary, textAlign: 'center' },
  card: {
    borderRadius: BorderRadius.lg, padding: Spacing.xl,
    borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  title: { fontSize: Typography.size.xl, fontWeight: 'bold', marginBottom: Spacing.xl, textAlign: 'right' },
  inputGroup: { marginBottom: Spacing.md },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  label: { fontSize: Typography.size.sm, fontWeight: '600' },
  forgotText: { fontSize: Typography.size.xs, fontWeight: '700' },
  input: {
    borderRadius: BorderRadius.md, borderWidth: 1,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    fontSize: Typography.size.base, textAlign: 'right',
    minHeight: 50,
  },
  button: {
    borderRadius: BorderRadius.md, paddingVertical: 15,
    alignItems: 'center', marginTop: Spacing.base,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: Typography.size.md, fontWeight: '700' },
  linkRow: { alignItems: 'center', marginTop: Spacing.lg, paddingVertical: Spacing.xs },
  linkText: { fontSize: Typography.size.sm, textAlign: 'center' },
  linkBold: { fontWeight: '700' },
});
