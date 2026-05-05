// app/_layout.tsx
import { router, Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const [session, setSession] = useState<any>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      router.replace('/auth');
    } else {
      router.replace('/');
    }
  }, [ready, session]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#E8E0D5" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          tabBarStyle: { backgroundColor: '#0D0D0D', borderTopColor: '#222' },
          tabBarActiveTintColor: '#E8E0D5',
          tabBarInactiveTintColor: '#555',
          headerStyle: { backgroundColor: '#0D0D0D' },
          headerTintColor: '#E8E0D5',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => supabase.auth.signOut()}
              style={{ marginRight: 16 }}
            >
              <Text style={{ color: '#666', fontSize: 14 }}>Sign out</Text>
            </TouchableOpacity>
          ),
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Closet', tabBarLabel: 'Closet' }} />
        <Tabs.Screen name="upload" options={{ title: 'Add Item', tabBarLabel: 'Add' }} />
        <Tabs.Screen name="outfits" options={{ title: 'Outfits', tabBarLabel: 'Outfits' }} />
        <Tabs.Screen name="auth" options={{ href: null }} />
      </Tabs>
    </>
  );
}