import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';

import { useColorScheme } from '@/lib/useColorScheme';
import { useClientOnlyValue } from '@/lib/useClientOnlyValue';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} className="-mb-1" {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: isDark ? '#14b8a6' : '#0066FF',
        tabBarInactiveTintColor: isDark ? '#6b7280' : '#999',
        tabBarStyle: {
          backgroundColor: isDark ? '#111827' : '#ffffff',
          borderTopColor: isDark ? '#1f2937' : '#e5e7eb',
          borderTopWidth: 1,
        },
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Detailed Analytics',
          tabBarIcon: ({ color }: { color: string }) => <TabBarIcon name="bar-chart" color={color} />,
        }}
      />
    </Tabs>
  );
}

