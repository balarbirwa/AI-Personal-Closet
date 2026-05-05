// app/auth.tsx
import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert('Check your email', 'We sent you a confirmation link.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace('/');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Smart Closet</Text>
        <Text style={styles.subtitle}>Your AI personal stylist</Text>

        <View style={styles.modeSwitcher}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}
            onPress={() => setMode('login')}
          >
            <Text style={[styles.modeBtnText, mode === 'login' && styles.modeBtnTextActive]}>
              Log in
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'signup' && styles.modeBtnActive]}
            onPress={() => setMode('signup')}
          >
            <Text style={[styles.modeBtnText, mode === 'signup' && styles.modeBtnTextActive]}>
              Sign up
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#555"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#555"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.primaryBtn} onPress={handleAuth} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#0D0D0D" />
            : <Text style={styles.primaryBtnText}>{mode === 'login' ? 'Log in' : 'Create account'}</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  content: { flex: 1, justifyContent: 'center', padding: 28 },
  title: { color: '#E8E0D5', fontSize: 32, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#666', fontSize: 16, textAlign: 'center', marginBottom: 48 },
  modeSwitcher: { flexDirection: 'row', backgroundColor: '#1A1A1A', borderRadius: 12, padding: 4, marginBottom: 24 },
  modeBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#E8E0D5' },
  modeBtnText: { color: '#555', fontSize: 15, fontWeight: '600' },
  modeBtnTextActive: { color: '#0D0D0D' },
  input: {
    backgroundColor: '#1A1A1A', borderRadius: 12, padding: 16,
    color: '#E8E0D5', fontSize: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  primaryBtn: {
    backgroundColor: '#E8E0D5', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  primaryBtnText: { color: '#0D0D0D', fontSize: 16, fontWeight: '700' },
});