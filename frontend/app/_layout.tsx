import { Tabs } from 'expo-router';
import { Text } from 'react-native';

const BLUE = '#0d47a1';
const RED  = '#c62828';

export default function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e0e0e0',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: BLUE,
        tabBarInactiveTintColor: '#aaa',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Try On',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>{'✂️'}</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>{'⚙️'}</Text>
          ),
        }}
      />
    </Tabs>
  );
}
