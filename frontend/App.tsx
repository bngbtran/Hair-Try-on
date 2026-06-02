import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform, Text, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import UserScreen from './src/screens/UserScreen';
import AdminScreen from './src/screens/AdminScreen';

const Tab = createBottomTabNavigator();

const ICON: Record<string, string> = {
  'Thử tóc': '💇',
  'Admin':   '⚙️',
};

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: () => (
              <Text style={{ fontSize: 20 }}>{ICON[route.name]}</Text>
            ),
            tabBarActiveTintColor: '#4F46E5',
            tabBarInactiveTintColor: '#9B9590',
            tabBarStyle: {
              backgroundColor: '#FFFFFF',
              borderTopColor: '#EAE5DE',
              height: Platform.OS === 'ios' ? 88 : 64,
              paddingBottom: Platform.OS === 'ios' ? 28 : 10,
              paddingTop: 8,
            },
            tabBarLabelStyle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
            headerStyle: { backgroundColor: '#18182C' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '800', fontSize: 17, letterSpacing: 0.3 },
          })}
        >
          <Tab.Screen
            name="Thử tóc"
            component={UserScreen}
            options={{
              title: 'Hair Try-On',
              headerTitle: () => (
                <Image
                  source={require('./assets/images/barber.png')}
                  style={{ width: 120, height: 36, resizeMode: 'contain' }}
                />
              ),
            }}
          />
          <Tab.Screen
            name="Admin"
            component={AdminScreen}
            options={{ title: 'Admin', headerTitle: 'Quản lý kiểu tóc' }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
