import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { Colors, Spacing, Typography, BorderRadius } from '../../src/constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('خطأ', 'من فضلك ادخل البريد الإلكتروني وكلمة المرور');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)/home');
    } catch {
      Alert.alert('فشل تسجيل الدخول', 'البريد الإلكتروني أو كلمة المرور غلط');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>دين ودنيا</Text>
          <Text style={styles.tagline}>نظّم يومك بين الدين والدنيا</Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.title}>أهلاً بعودتك 👋</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>البريد الإلكتروني</Text>
            <TextInput
              style={styles.input}
              placeholder="example@email.com"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <Link href={'/(auth)/forgot-password' as any} asChild>
            <TouchableOpacity style={styles.forgotLink}>
              <Text style={styles.forgotText}>نسيت كلمة المرور؟</Text>
            </TouchableOpacity>
          </Link>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>كلمة المرور</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>تسجيل الدخول</Text>
            )}
          </TouchableOpacity>

          <Link href="/(auth)/register" asChild>
            <TouchableOpacity style={styles.linkRow}>
              <Text style={styles.linkText}>مش عندك حساب؟ <Text style={styles.linkBold}>سجّل دلوقتي</Text></Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: Colors.bg, padding: Spacing.base },
  header: { alignItems: 'center', paddingTop: 80, paddingBottom: Spacing['2xl'] },
  appName: {
    fontSize: Typography.size['3xl'],
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  tagline: { fontSize: Typography.size.base, color: Colors.textSecondary, textAlign: 'center' },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  title: {
    fontSize: Typography.size.xl,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.xl,
    textAlign: 'right',
  },
  inputGroup: { marginBottom: Spacing.md },
  label: {
    fontSize: Typography.size.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
    textAlign: 'right',
  },
  input: {
    backgroundColor: Colors.bg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    fontSize: Typography.size.base,
    color: Colors.text,
    textAlign: 'right',
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.base,
  },
  buttonDisabled: { opacity: 0.6 },
  forgotLink: { alignSelf: 'flex-end', paddingVertical: Spacing.xs },
  forgotText: { color: Colors.primary, fontSize: Typography.size.sm, fontWeight: '700' },
  buttonText: { color: '#fff', fontSize: Typography.size.md, fontWeight: '700' },
  linkRow: { alignItems: 'center', marginTop: Spacing.base },
  linkText: { color: Colors.textSecondary, fontSize: Typography.size.sm, textAlign: 'center' },
  linkBold: { color: Colors.primary, fontWeight: '700' },
});
