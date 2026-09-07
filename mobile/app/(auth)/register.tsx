import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { Colors, Spacing, Typography, BorderRadius } from '../../src/constants/theme';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const router = useRouter();

  async function handleRegister() {
    if (!name || !email || !password) {
      Alert.alert('خطأ', 'من فضلك اكمل كل البيانات');
      return;
    }
    if (password.length < 8) {
      Alert.alert('خطأ', 'كلمة المرور لازم تكون 8 حروف على الأقل');
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim().toLowerCase(), password);
      router.replace('/onboarding');
    } catch {
      Alert.alert('فشل التسجيل', 'البريد الإلكتروني ده مسجل قبل كده');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.appName}>دين ودنيا</Text>
          <Text style={styles.tagline}>ابدأ رحلتك</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>إنشاء حساب جديد ✨</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>الاسم</Text>
            <TextInput
              style={styles.input}
              placeholder="اسمك"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

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
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>كلمة المرور</Text>
            <TextInput
              style={styles.input}
              placeholder="8 حروف على الأقل"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ابدأ رحلتي</Text>}
          </TouchableOpacity>

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.linkRow}>
              <Text style={styles.linkText}>عندك حساب؟ <Text style={styles.linkBold}>سجل الدخول</Text></Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: Colors.bg, padding: Spacing.base },
  header: { alignItems: 'center', paddingTop: 60, paddingBottom: Spacing['2xl'] },
  appName: { fontSize: Typography.size['3xl'], fontWeight: 'bold', color: Colors.primary, marginBottom: Spacing.xs },
  tagline: { fontSize: Typography.size.base, color: Colors.textSecondary },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.xl,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  title: { fontSize: Typography.size.xl, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.xl, textAlign: 'right' },
  inputGroup: { marginBottom: Spacing.md },
  label: { fontSize: Typography.size.sm, fontWeight: '600', color: Colors.text, marginBottom: Spacing.xs, textAlign: 'right' },
  input: {
    backgroundColor: Colors.bg, borderRadius: BorderRadius.md, borderWidth: 1,
    borderColor: Colors.border, padding: Spacing.md, fontSize: Typography.size.base,
    color: Colors.text, textAlign: 'right',
  },
  button: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.base },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: Typography.size.md, fontWeight: '700' },
  linkRow: { alignItems: 'center', marginTop: Spacing.base },
  linkText: { color: Colors.textSecondary, fontSize: Typography.size.sm, textAlign: 'center' },
  linkBold: { color: Colors.primary, fontWeight: '700' },
});
