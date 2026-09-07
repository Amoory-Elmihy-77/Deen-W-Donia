import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { useAppTheme } from '../../src/theme/ThemeProvider';

function TabIcon({ emoji, label, focused, color, muted }: { emoji: string; label: string; focused: boolean; color: string; muted: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text style={{ fontSize: 10, color: focused ? color : muted, fontWeight: focused ? '700' : '400' }}>
        {label}
      </Text>
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
          height: 70,
          paddingBottom: 8,
          paddingTop: 8,
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
              width: 50, height: 50,
              borderRadius: 25,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
              elevation: 6,
            }}>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>+</Text>
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
