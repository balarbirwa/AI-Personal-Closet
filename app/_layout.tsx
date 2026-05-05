// app/_layout.tsx
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: '#0D0D0D',
            borderTopColor: '#222',
          },
          tabBarActiveTintColor: '#E8E0D5',
          tabBarInactiveTintColor: '#555',
          headerStyle: { backgroundColor: '#0D0D0D' },
          headerTintColor: '#E8E0D5',
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Closet', tabBarLabel: 'Closet' }}
        />
        <Tabs.Screen
          name="upload"
          options={{ title: 'Add Item', tabBarLabel: 'Add' }}
        />
        <Tabs.Screen
          name="outfits"
          options={{ title: 'Outfits', tabBarLabel: 'Outfits' }}
        />
      </Tabs>
    </>
  );
}
