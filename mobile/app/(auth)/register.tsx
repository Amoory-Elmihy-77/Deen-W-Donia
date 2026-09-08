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

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);

  async function handleRegister() {
    if (!name || !email || !password) {
      Alert.alert('بيانات ناقصة', 'من فضلك أكمل كل البيانات');
      return;
    }
    if (password.length < 8) {
      Alert.alert('كلمة مرور قصيرة', 'استخدم 8 أحرف على الأقل لحماية حسابك.');
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim().toLowerCase(), password);
      router.replace('/onboarding');
    } catch {
      Alert.alert('تعذر إنشاء الحساب', 'هذا البريد الإلكتروني مسجل بالفعل. جرب تسجيل الدخول.');
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
          <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
            <Text style={styles.logoText}>☪</Text>
          </View>
          <Text style={[styles.appName, { color: colors.primary }]}>دين ودنيا</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>ابدأ رحلتك نحو يوم متوازن</Text>
        </View>

        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>إنشاء حساب جديد ✨</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>الاسم</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              placeholder="اسمك الكريم"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

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
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>كلمة المرور</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              placeholder="8 أحرف على الأقل"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ابدأ رحلتي 🚀</Text>}
          </TouchableOpacity>

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.linkRow} activeOpacity={0.7}>
              <Text style={[styles.linkText, { color: colors.textSecondary }]}>
                عندك حساب؟{' '}
                <Text style={[styles.linkBold, { color: colors.primary }]}>سجل الدخول</Text>
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
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
  },
  logoText: { fontSize: 32, color: '#fff' },
  appName: { fontSize: Typography.size['2xl'], fontWeight: 'bold', marginBottom: Spacing.xs },
  tagline: { fontSize: Typography.size.sm, textAlign: 'center' },
  card: {
    borderRadius: BorderRadius.lg, padding: Spacing.xl, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  title: { fontSize: Typography.size.xl, fontWeight: 'bold', marginBottom: Spacing.xl, textAlign: 'right' },
  inputGroup: { marginBottom: Spacing.md },
  label: { fontSize: Typography.size.sm, fontWeight: '600', marginBottom: Spacing.xs, textAlign: 'right' },
  input: {
    borderRadius: BorderRadius.md, borderWidth: 1,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    fontSize: Typography.size.base, textAlign: 'right', minHeight: 50,
  },
  button: { borderRadius: BorderRadius.md, paddingVertical: 15, alignItems: 'center', marginTop: Spacing.base },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: Typography.size.md, fontWeight: '700' },
  linkRow: { alignItems: 'center', marginTop: Spacing.lg, paddingVertical: Spacing.xs },
  linkText: { fontSize: Typography.size.sm, textAlign: 'center' },
  linkBold: { fontWeight: '700' },
});
