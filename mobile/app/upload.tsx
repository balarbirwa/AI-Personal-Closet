// app/upload.tsx
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator, Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { tagItem } from '../lib/api';
import { supabase } from '../lib/supabase';

const OCCASIONS = ['casual', 'office', 'smart-casual', 'outdoor', 'athletic', 'formal'];
const SEASONS = ['spring', 'summer', 'fall', 'winter'];

export default function UploadScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [tags, setTags] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const resetToFresh = () => {
    setImageUri(null);
    setTags(null);
    setLoading(false);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Camera permission required'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (!result.canceled) { const uri = result.assets[0].uri; setImageUri(uri); setTags(null); await analyzeImage(uri); }
  };

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (!result.canceled) { const uri = result.assets[0].uri; setImageUri(uri); setTags(null); await analyzeImage(uri); }
  };

  const analyzeImage = async (uri: string) => {
    setLoading(true);
    try {
      const result = await tagItem(uri);
      setTags(result);
    } catch (e) {
      Alert.alert('Analysis failed', 'Could not analyze the image. Is your API running?');
      resetToFresh();
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (field: 'occasions' | 'seasons', value: string) => {
    setTags((prev: any) => {
      const arr: string[] = prev[field] || [];
      return { ...prev, [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  };

  const saveItem = async () => {
    if (!imageUri || !tags) return;
    setSaving(true);
    try {
      const fileName = `${Date.now()}.jpg`;
      const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
      const { error: uploadError } = await supabase.storage.from('garments').upload(fileName, decode(base64), { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('garments').getPublicUrl(fileName);
      const { data: { user } } = await supabase.auth.getUser();
      const { error: dbError } = await supabase.from('items').insert({
        user_id: user?.id,
        image_url: urlData.publicUrl,
        type: tags.type,
        primary_color: tags.primary_color,
        formality: tags.formality,
        occasions: tags.occasions,
        seasons: tags.seasons,
        style_tags: tags.style_tags || [],
      });
      if (dbError) throw dbError;
      setSavedCount((c) => c + 1);
      resetToFresh();
    } catch (e: any) {
      Alert.alert('Save failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!imageUri && !loading) {
    return (
      <View style={styles.container}>
        {savedCount > 0 && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>{savedCount} item{savedCount !== 1 ? 's' : ''} added to your closet</Text>
          </View>
        )}
        <View style={styles.photoArea}>
          <Text style={styles.photoHint}>Photograph a garment on a flat surface or hanger</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={pickImage}>
            <Text style={styles.primaryBtnText}>Open Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={pickFromLibrary}>
            <Text style={styles.secondaryBtnText}>Choose from Library</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        {imageUri && <Image source={{ uri: imageUri }} style={styles.previewSmall} />}
        <View style={styles.analysisBox}>
          <ActivityIndicator color="#E8E0D5" />
          <Text style={styles.analysisText}>Analyzing garment...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
      <Image source={{ uri: imageUri! }} style={styles.preview} />
      <View style={styles.tagsSection}>
        <Text style={styles.sectionLabel}>Detected item</Text>
        <View style={styles.mainTag}>
          <Text style={styles.mainTagText}>{tags?.type}</Text>
          <Text style={styles.mainTagSub}>{tags?.primary_color} · formality {tags?.formality}/5</Text>
        </View>
        <Text style={styles.sectionLabel}>Occasions</Text>
        <View style={styles.chipRow}>
          {OCCASIONS.map((o) => (
            <TouchableOpacity key={o} style={[styles.chip, tags?.occasions?.includes(o) && styles.chipActive]} onPress={() => toggleTag('occasions', o)}>
              <Text style={[styles.chipText, tags?.occasions?.includes(o) && styles.chipTextActive]}>{o}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.sectionLabel}>Seasons</Text>
        <View style={styles.chipRow}>
          {SEASONS.map((s) => (
            <TouchableOpacity key={s} style={[styles.chip, tags?.seasons?.includes(s) && styles.chipActive]} onPress={() => toggleTag('seasons', s)}>
              <Text style={[styles.chipText, tags?.seasons?.includes(s) && styles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={saveItem} disabled={saving}>
          {saving ? <ActivityIndicator color="#0D0D0D" /> : <Text style={styles.primaryBtnText}>Save to closet</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={resetToFresh}>
          <Text style={styles.secondaryBtnText}>Retake photo</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'center', padding: 20 },
  scrollContainer: { flex: 1, backgroundColor: '#0D0D0D' },
  content: { padding: 20, paddingBottom: 40 },
  successBanner: { backgroundColor: '#0F2A1A', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 32, borderWidth: 1, borderColor: '#1D9E75' },
  successText: { color: '#5DCAA5', fontSize: 14, textAlign: 'center' },
  photoArea: { alignItems: 'center', width: '100%' },
  photoHint: { color: '#666', fontSize: 14, textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  preview: { width: '100%', aspectRatio: 3 / 4, borderRadius: 16, marginBottom: 24, backgroundColor: '#1A1A1A' },
  previewSmall: { width: 160, height: 200, borderRadius: 12, marginBottom: 24, backgroundColor: '#1A1A1A' },
  analysisBox: { alignItems: 'center', gap: 12 },
  analysisText: { color: '#888', fontSize: 14 },
  tagsSection: { gap: 12 },
  sectionLabel: { color: '#666', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 },
  mainTag: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 16, marginBottom: 4 },
  mainTagText: { color: '#E8E0D5', fontSize: 18, fontWeight: '600' },
  mainTagSub: { color: '#888', fontSize: 13, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A' },
  chipActive: { backgroundColor: '#E8E0D5', borderColor: '#E8E0D5' },
  chipText: { color: '#777', fontSize: 13 },
  chipTextActive: { color: '#0D0D0D', fontWeight: '600' },
  primaryBtn: { backgroundColor: '#E8E0D5', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  primaryBtnText: { color: '#0D0D0D', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { backgroundColor: 'transparent', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A' },
  secondaryBtnText: { color: '#888', fontSize: 15 },
});