import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../../src/theme/ThemeProvider';
import { Spacing } from '../../src/constants/theme';

function TabIcon({ emoji, label, focused, color, muted }: { emoji: string; label: string; focused: boolean; color: string; muted: string }) {
  return (
    <View style={styles.iconContainer}>
      <View style={[styles.iconBadge, focused && { backgroundColor: color + '20' }]}>
        <Text style={[styles.emoji, focused && { opacity: 1 }]}>{emoji}</Text>
      </View>
      <Text style={[styles.label, { color: focused ? color : muted, fontWeight: focused ? '700' : '500' }]}>
        {label}
      </Text>
      {focused && <View style={[styles.activeIndicator, { backgroundColor: color }]} />}
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useAppTheme();
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 65,
          paddingBottom: 5,
          paddingTop: 5,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="الرئيسية" focused={focused} color={colors.primary} muted={colors.textMuted} />,
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'الأهداف',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🎯" label="الأهداف" focused={focused} color={colors.primary} muted={colors.textMuted} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'أضف',
          tabBarIcon: ({ focused }) => (
            <View style={{
              backgroundColor: colors.primary,
              width: 52, height: 52,
              borderRadius: 26,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              borderWidth: 4,
              borderColor: colors.surface,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}>
              <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold', marginTop: -2 }}>+</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'التقدم',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📊" label="التقدم" focused={focused} color={colors.primary} muted={colors.textMuted} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'الإعدادات',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" label="الإعدادات" focused={focused} color={colors.primary} muted={colors.textMuted} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: { 
    alignItems: 'center', 
    justifyContent: 'center',
    width: 60,
    height: 50,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  emoji: { 
    fontSize: 18,
    opacity: 0.7, // Muted by default, full opacity when focused
  },
  label: { 
    fontSize: 10,
    textAlign: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    top: -8,
    width: 24,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
});
