import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../src/services/endpoints';
import { Colors, Spacing, Typography, BorderRadius } from '../src/constants/theme';

export default function OnboardingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [city, setCity] = useState('Cairo'); // Default, in real app would use location or picker

  const saveSettings = useMutation({
    mutationFn: () => userApi.updateSettings({ prayerSettings: { city, calculationMethod: 'Egypt' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      router.replace('/(tabs)/home');
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>أهلاً بك في دين ودنيا ✨</Text>
        <Text style={styles.subtitle}>عشان نبدأ نرتب يومك صح، محتاجين نضبط مواقيت الصلاة.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>المدينة الحالية</Text>
          <Text style={styles.value}>القاهرة (Cairo)</Text>
          <Text style={styles.hint}>نقدر نغيرها بعدين من الإعدادات</Text>
        </View>

        <TouchableOpacity 
          style={styles.button}
          onPress={() => saveSettings.mutate()}
          disabled={saveSettings.isPending}
        >
          {saveSettings.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>يلا نبدأ 🚀</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { flex: 1, padding: Spacing.xl, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: Typography.size['2xl'], fontWeight: 'bold', color: Colors.primary, marginBottom: Spacing.md, textAlign: 'center' },
  subtitle: { fontSize: Typography.size.base, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl },
  card: { backgroundColor: Colors.surface, padding: Spacing.xl, borderRadius: BorderRadius.lg, width: '100%', alignItems: 'center', marginBottom: Spacing.xl, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  label: { fontSize: Typography.size.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  value: { fontSize: Typography.size.xl, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.sm },
  hint: { fontSize: Typography.size.xs, color: Colors.textMuted },
  button: { backgroundColor: Colors.primary, width: '100%', padding: Spacing.lg, borderRadius: BorderRadius.md, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: Typography.size.md, fontWeight: '700' },
});
