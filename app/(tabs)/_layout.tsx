import { Compass, Home, Route, Send, Write } from '@/assets/icons/icon';
import { HapticTab } from '@/components/haptic-tab';
import { useTheme } from '@/theme';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.iconDefault,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Home width={22} height={22} color={focused ? theme.colors.textAccent : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="write"
        options={{
          title: 'Write',
          tabBarIcon: ({ color, focused }) => (
            <Write width={22} height={22} color={focused ? theme.colors.textAccent : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <Compass width={22} height={22} color={focused ? theme.colors.textAccent : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="directMessage"
        options={{
          title: 'DM',
          tabBarIcon: ({ color, focused }) => (
            <Send width={22} height={22} color={focused ? theme.colors.textAccent : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="route"
        options={{
          title: 'Route',
          tabBarIcon: ({ color, focused }) => (
            <Route width={22} height={22} color={focused ? theme.colors.textAccent : color} />
          ),
        }}
      />
    </Tabs>
  );
}
