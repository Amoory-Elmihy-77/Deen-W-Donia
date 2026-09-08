import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../src/services/endpoints';
import { Spacing, Typography, BorderRadius } from '../src/constants/theme';
import { useAppTheme } from '../src/theme/ThemeProvider';

export default function OnboardingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);

  const saveSettings = useMutation({
    mutationFn: () => userApi.updateSettings({ prayerSettings: { city: 'Cairo', calculationMethod: 'Egypt' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      router.replace('/(tabs)/home');
    },
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Brand */}
        <View style={styles.brandSection}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
            <Text style={styles.logoEmoji}>☪</Text>
          </View>
          <Text style={[styles.appName, { color: colors.primary }]}>دين ودنيا</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>رحلتك نحو يوم متوازن بدأت</Text>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>أهلاً بك ✨</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          عشان نبدأ نرتب يومك صح، محتاجين نضبط مواقيت الصلاة على حسب مدينتك.
        </Text>

        {/* City Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconRow]}>
            <Text style={styles.cardIcon}>🕌</Text>
          </View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>المدينة الحالية</Text>
          <Text style={[styles.value, { color: colors.text }]}>القاهرة — Cairo</Text>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            يمكنك تغييرها لاحقًا من الإعدادات
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }, saveSettings.isPending && styles.buttonDisabled]}
          onPress={() => saveSettings.mutate()}
          disabled={saveSettings.isPending}
          activeOpacity={0.85}
        >
          {saveSettings.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>يلا نبدأ 🚀</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: Spacing.xl, justifyContent: 'center', alignItems: 'center' },
  brandSection: { alignItems: 'center', marginBottom: Spacing['2xl'] },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
  },
  logoEmoji: { fontSize: 36, color: '#fff' },
  appName: { fontSize: Typography.size['2xl'], fontWeight: 'bold', marginBottom: Spacing.xs },
  tagline: { fontSize: Typography.size.sm },
  title: { fontSize: Typography.size['2xl'], fontWeight: '800', marginBottom: Spacing.sm, textAlign: 'center' },
  subtitle: { fontSize: Typography.size.base, textAlign: 'center', lineHeight: 24, marginBottom: Spacing['2xl'] },
  card: {
    width: '100%', padding: Spacing.xl, borderRadius: BorderRadius.lg,
    alignItems: 'center', marginBottom: Spacing['2xl'],
    borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  iconRow: { marginBottom: Spacing.md },
  cardIcon: { fontSize: 40 },
  label: { fontSize: Typography.size.sm, marginBottom: Spacing.xs },
  value: { fontSize: Typography.size.xl, fontWeight: 'bold', marginBottom: Spacing.sm },
  hint: { fontSize: Typography.size.xs, textAlign: 'center' },
  button: { width: '100%', paddingVertical: 16, borderRadius: BorderRadius.md, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: Typography.size.md, fontWeight: '700' },
});
