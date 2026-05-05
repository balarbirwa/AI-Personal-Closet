// app/outfits.tsx
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { generateOutfits, recordSwipe } from '../lib/api';
import { supabase } from '../lib/supabase';

const OCCASIONS = [
  { id: 'casual', label: 'Casual' },
  { id: 'office', label: 'Office' },
  { id: 'smart-casual', label: 'Smart casual' },
  { id: 'outdoor', label: 'Outdoor' },
  { id: 'formal', label: 'Formal' },
];

type Tab = 'generate' | 'saved';

export default function OutfitsScreen() {
  const [tab, setTab] = useState<Tab>('generate');
  const [occasion, setOccasion] = useState('casual');
  const [outfits, setOutfits] = useState<any[]>([]);
  const [savedOutfits, setSavedOutfits] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<'pick' | 'results'>('pick');
  const [weather, setWeather] = useState<string>('');

  useFocusEffect(
    useCallback(() => {
      if (tab === 'saved') fetchSaved();
    }, [tab])
  );

  const fetchSaved = async () => {
    const { data, error } = await supabase
      .from('saved_outfits')
      .select('*')
      .order('saved_at', { ascending: false });
    if (!error) setSavedOutfits(data || []);
  };

const getCity = async (): Promise<string> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      // Timeout after 5 seconds
      const loc = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      ]);
      const [geo] = await Location.reverseGeocodeAsync((loc as any).coords);
      if (geo?.city) return geo.city;
    }
  } catch (e) {
    console.log('Location unavailable, using fallback');
  }
  return 'New York';
};

const generate = async () => {
  setLoading(true);
  setPhase('results');
  try {
    const { data: items, error } = await supabase.from('items').select('*');
    if (error) throw error;
    if (!items || items.length < 2) {
      Alert.alert('Add more items', 'You need at least 2 items in your closet.');
      setPhase('pick');
      return;
    }

    const city = await getCity();

    const matchingItems = items.filter((i: any) => i.occasions?.includes(occasion));
    if (matchingItems.length === 0) {
      Alert.alert(
        `No ${occasion} items`,
        `You don't have any items tagged for ${occasion}. We'll suggest the closest alternatives.`,
        [
          { text: 'Cancel', onPress: () => { setPhase('pick'); setLoading(false); }, style: 'cancel' },
          { text: 'Try anyway', onPress: () => doGenerate(items, city) },
        ]
      );
      return;
    }

    await doGenerate(items, city);
      } catch (e: any) {
        Alert.alert('Generation failed', e.message);
        setPhase('pick');
      } finally {
        setLoading(false);
      }
    };

const doGenerate = async (items: any[], city: string) => {
  try {
    const result = await generateOutfits({ items, occasion, city });

    if (!result.outfits || result.outfits.length === 0) {
      Alert.alert('No outfits found', `Couldn't build a ${occasion} outfit. Try a different occasion.`);
      setPhase('pick');
      return;
    }

    const hydrated = result.outfits.map((outfit: any) => ({
      ...outfit,
      itemDetails: items.filter((i: any) => outfit.item_ids.includes(i.id)),
    }));
    if (result.weather) setWeather(result.weather);
    setOutfits(hydrated);
    setCurrentIndex(0);
  } catch (e: any) {
    Alert.alert('Generation failed', e.message);
    setPhase('pick');
  } finally {
    setLoading(false);
  }
};

  const handleSwipe = async (signal: 'liked' | 'disliked' | 'saved') => {
    const outfit = outfits[currentIndex];
    if (!outfit) return;

    recordSwipe({ outfit_id: outfit.outfit_id, signal, item_ids: outfit.item_ids }).catch(console.error);

    // Save to Supabase if loved
    if (signal === 'saved') {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('saved_outfits').insert({
        user_id: user?.id,
        outfit_id: outfit.outfit_id,
        item_ids: outfit.item_ids,
        item_details: outfit.itemDetails,
        rationale: outfit.rationale,
        vibe: outfit.vibe,
        occasion,
      });
    }

    if (currentIndex < outfits.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Reset immediately so screen doesn't stagnate
      setPhase('pick');
      setOutfits([]);
      setCurrentIndex(0);
      setTimeout(() => {
        Alert.alert('All done!', 'Generate more outfits or check your saved looks.', [
          { text: 'Generate more' },
          { text: 'View saved', onPress: () => { setTab('saved'); fetchSaved(); } },
        ]);
      }, 300);
    }
  };

  const deleteSaved = (id: string) => {
    Alert.alert('Remove outfit', 'Remove this from your saved outfits?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          await supabase.from('saved_outfits').delete().eq('id', id);
          fetchSaved();
        },
      },
    ]);
  };

  // ── Tab bar ──────────────────────────────────────────────────
  const TabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tabBtn, tab === 'generate' && styles.tabBtnActive]}
        onPress={() => setTab('generate')}
      >
        <Text style={[styles.tabBtnText, tab === 'generate' && styles.tabBtnTextActive]}>Generate</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabBtn, tab === 'saved' && styles.tabBtnActive]}
        onPress={() => { setTab('saved'); fetchSaved(); }}
      >
        <Text style={[styles.tabBtnText, tab === 'saved' && styles.tabBtnTextActive]}>Saved</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Saved outfits tab ────────────────────────────────────────
  if (tab === 'saved') {
    return (
      <View style={styles.container}>
        <TabBar />
        {savedOutfits.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>No saved outfits yet</Text>
            <Text style={styles.emptySubtitle}>Tap the star when generating outfits to save them here</Text>
          </View>
        ) : (
          <FlatList
            data={savedOutfits}
            keyExtractor={(o) => o.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item: outfit }) => (
              <TouchableOpacity style={styles.savedCard} onLongPress={() => deleteSaved(outfit.id)} activeOpacity={0.8}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.savedItemRow}>
                  {(outfit.item_details || []).map((item: any) => (
                    <View key={item.id} style={styles.savedItemThumb}>
                      <Image source={{ uri: item.image_url }} style={styles.savedItemImg} />
                      <Text style={styles.savedItemLabel} numberOfLines={1}>{item.type}</Text>
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.savedMeta}>
                  <Text style={styles.savedVibe}>{outfit.vibe}</Text>
                  
                  <Text style={styles.savedOccasion}>{outfit.occasion}</Text>
                </View>
                <Text style={styles.savedRationale}>{outfit.rationale}</Text>
                <Text style={styles.savedHint}>Hold to remove</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    );
  }

  // ── Occasion picker ──────────────────────────────────────────
  if (phase === 'pick') {
    return (
      <View style={styles.container}>
        <TabBar />
        <ScrollView contentContainerStyle={styles.pickContent}>
          <Text style={styles.heading}>What's the occasion?</Text>
          {OCCASIONS.map((o) => (
            <TouchableOpacity
              key={o.id}
              style={[styles.occasionBtn, occasion === o.id && styles.occasionActive]}
              onPress={() => setOccasion(o.id)}
            >
              <Text style={[styles.occasionText, occasion === o.id && styles.occasionTextActive]}>{o.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.generateBtn} onPress={generate}>
            <Text style={styles.generateBtnText}>Generate outfits</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.container}>
        <TabBar />
        <View style={styles.center}>
          <ActivityIndicator color="#E8E0D5" size="large" />
          <Text style={styles.loadingText}>Styling your wardrobe...</Text>
        </View>
      </View>
    );
  }

  // ── Outfit cards ─────────────────────────────────────────────
  const outfit = outfits[currentIndex];
  if (!outfit) return null;

  return (
    <View style={styles.container}>
      <TabBar />
      <ScrollView contentContainerStyle={styles.cardContent}>
        <Text style={styles.counter}>{currentIndex + 1} / {outfits.length}</Text>
        <Text style={styles.vibe}>{outfit.vibe}</Text>
        {weather ? (
          <View style={styles.weatherBadge}>
            <Text style={styles.weatherText}>🌤 {weather}</Text>
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemRow}>
          {outfit.itemDetails?.map((item: any) => (
            <View key={item.id} style={styles.itemCard}>
              <Image source={{ uri: item.image_url }} style={styles.itemImage} />
              <Text style={styles.itemLabel} numberOfLines={1}>{item.type}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.rationaleBox}>
          <Text style={styles.rationaleText}>{outfit.rationale}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.rejectBtn} onPress={() => handleSwipe('disliked')}>
            <Text style={styles.rejectBtnText}>✕  Pass</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={() => handleSwipe('saved')}>
            <Text style={styles.saveBtnText}>★  Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptBtn} onPress={() => handleSwipe('liked')}>
            <Text style={styles.acceptBtnText}>✓  Love it</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => { setPhase('pick'); setOutfits([]); }} style={styles.backLink}>
          <Text style={styles.backLinkText}>Change occasion</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  emptyTitle: { color: '#E8E0D5', fontSize: 20, fontWeight: '600' },
  emptySubtitle: { color: '#666', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#E8E0D5' },
  tabBtnText: { color: '#555', fontSize: 15 },
  tabBtnTextActive: { color: '#E8E0D5', fontWeight: '600' },
  pickContent: { padding: 20 },
  heading: { color: '#E8E0D5', fontSize: 24, fontWeight: '700', marginBottom: 24, marginTop: 8 },
  occasionBtn: { padding: 18, borderRadius: 12, marginBottom: 10, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A' },
  occasionActive: { backgroundColor: '#E8E0D5', borderColor: '#E8E0D5' },
  occasionText: { color: '#888', fontSize: 17 },
  occasionTextActive: { color: '#0D0D0D', fontWeight: '700' },
  generateBtn: { backgroundColor: '#E8E0D5', borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 16 },
  generateBtnText: { color: '#0D0D0D', fontSize: 17, fontWeight: '700' },
  loadingText: { color: '#888', fontSize: 15 },
  cardContent: { padding: 20, paddingBottom: 40 },
  counter: { color: '#555', fontSize: 12, textAlign: 'center', marginBottom: 4 },
  vibe: { color: '#E8E0D5', fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 20, textTransform: 'capitalize' },
  itemRow: { marginBottom: 20 },
  itemCard: { marginRight: 12, width: 130 },
  itemImage: { width: 130, height: 160, borderRadius: 10, backgroundColor: '#1A1A1A' },
  itemLabel: { color: '#888', fontSize: 11, marginTop: 6, textAlign: 'center' },
  rationaleBox: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 16, marginBottom: 24 },
  rationaleText: { color: '#B0A898', fontSize: 15, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  rejectBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#1A1A1A', alignItems: 'center', borderWidth: 1, borderColor: '#3A1A1A' },
  rejectBtnText: { color: '#E24B4A', fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#1A1A1A', alignItems: 'center', borderWidth: 1, borderColor: '#2A2A1A' },
  saveBtnText: { color: '#EF9F27', fontSize: 15, fontWeight: '600' },
  acceptBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#1A2A1A', alignItems: 'center', borderWidth: 1, borderColor: '#1A3A1A' },
  acceptBtnText: { color: '#5DCAA5', fontSize: 15, fontWeight: '600' },
  backLink: { alignItems: 'center', padding: 12 },
  backLinkText: { color: '#555', fontSize: 14 },
  savedCard: { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, marginBottom: 16 },
  savedItemRow: { marginBottom: 12 },
  savedItemThumb: { marginRight: 10, width: 90 },
  savedItemImg: { width: 90, height: 110, borderRadius: 8, backgroundColor: '#2A2A2A' },
  savedItemLabel: { color: '#777', fontSize: 10, marginTop: 4, textAlign: 'center' },
  savedMeta: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  savedVibe: { color: '#E8E0D5', fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  savedOccasion: { color: '#666', fontSize: 14 },
  savedRationale: { color: '#888', fontSize: 13, lineHeight: 18 },
  savedHint: { color: '#333', fontSize: 11, marginTop: 8, textAlign: 'right' },
  weatherBadge: { backgroundColor: '#0F1A2A', borderRadius: 10, padding: 10, marginBottom: 16, alignItems: 'center' },
weatherText: { color: '#5DCAA5', fontSize: 13 },
});