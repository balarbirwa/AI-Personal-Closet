// app/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
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
    if (!session) router.replace('/auth');
    else router.replace('/');
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
          // Tab bar styling
          tabBarStyle: {
            backgroundColor: '#0D0D0D',
            borderTopColor: '#1A1A1A',
            borderTopWidth: 1,
            height: 88,
            paddingBottom: 28,
            paddingTop: 12,
          },
          tabBarActiveTintColor: '#E8E0D5',
          tabBarInactiveTintColor: '#444',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 4,
          },
          // Header styling
          headerStyle: {
            backgroundColor: '#0D0D0D',
            shadowColor: 'transparent',
            elevation: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#1A1A1A',
          },
          headerTintColor: '#E8E0D5',
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: '700',
            letterSpacing: 0.5,
          },
          headerRight: () => (
            <TouchableOpacity
              onPress={() => supabase.auth.signOut()}
              style={{ marginRight: 16, padding: 4 }}
            >
              <Ionicons name="log-out-outline" size={22} color="#555" />
            </TouchableOpacity>
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'My Closet',
            tabBarLabel: 'Closet',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'shirt' : 'shirt-outline'}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="upload"
          options={{
            title: 'Add Item',
            tabBarLabel: 'Add',
            tabBarIcon: ({ color, focused }) => (
              <View style={{
                backgroundColor: focused ? '#E8E0D5' : '#1A1A1A',
                borderRadius: 16,
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 4,
                borderWidth: 1,
                borderColor: focused ? '#E8E0D5' : '#2A2A2A',
              }}>
                <Ionicons
                  name="add"
                  size={26}
                  color={focused ? '#0D0D0D' : '#888'}
                />
              </View>
            ),
            tabBarLabel: () => null,
          }}
        />
        <Tabs.Screen
          name="outfits"
          options={{
            title: 'Outfits',
            tabBarLabel: 'Outfits',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'sparkles' : 'sparkles-outline'}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="auth"
          options={{ href: null }}
        />
      </Tabs>
    </>
  );
}