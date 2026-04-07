// app/index.tsx  (Closet tab)
import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Image, StyleSheet,
  TouchableOpacity, ActivityIndicator, Modal,
  ScrollView, Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase, Item } from '../lib/supabase';

const OCCASIONS = ['casual', 'office', 'smart-casual', 'outdoor', 'athletic', 'formal'];
const SEASONS = ['spring', 'summer', 'fall', 'winter'];

export default function ClosetScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Item | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => { fetchItems(); }, [])
  );

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('items').select('*').order('created_at', { ascending: false });
    if (error) console.error(error);
    else setItems(data || []);
    setLoading(false);
  };

  const openItem = (item: Item) => {
    setSelected(item);
    setEditing({ occasions: [...(item.occasions || [])], seasons: [...(item.seasons || [])] });
  };

  const closeModal = () => {
    setSelected(null);
    setEditing(null);
  };

  const toggleTag = (field: 'occasions' | 'seasons', value: string) => {
    setEditing((prev: any) => {
      const arr: string[] = prev[field] || [];
      return { ...prev, [field]: arr.includes(value) ? arr.filter((v: string) => v !== value) : [...arr, value] };
    });
  };

  const saveEdits = async () => {
    if (!selected || !editing) return;
    setSaving(true);
    const { error } = await supabase.from('items').update({
      occasions: editing.occasions,
      seasons: editing.seasons,
    }).eq('id', selected.id);
    if (error) { Alert.alert('Save failed', error.message); }
    else {
      await fetchItems();
      closeModal();
    }
    setSaving(false);
  };

  const deleteItem = () => {
    Alert.alert(
      'Delete item',
      `Remove "${selected?.type}" from your closet?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            if (!selected) return;
            await supabase.from('items').delete().eq('id', selected.id);
            // Also delete the image from storage
            const fileName = selected.image_url.split('/').pop();
            if (fileName) await supabase.storage.from('garments').remove([fileName]);
            await fetchItems();
            closeModal();
          },
        },
      ]
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#E8E0D5" /></View>;
  }

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Your closet is empty</Text>
        <Text style={styles.emptySubtitle}>Tap Add to photograph your first item</Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openItem(item)} activeOpacity={0.75}>
            <Image source={{ uri: item.image_url }} style={styles.image} />
            <View style={styles.info}>
              <Text style={styles.itemType} numberOfLines={1}>{item.type}</Text>
              <Text style={styles.itemColor}>{item.primary_color}</Text>
              <View style={styles.tags}>
                {item.occasions?.slice(0, 2).map((o) => (
                  <View key={o} style={styles.tag}><Text style={styles.tagText}>{o}</Text></View>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Edit modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeModal}>
        <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal}>
              <Text style={styles.cancelBtn}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit item</Text>
            <TouchableOpacity onPress={saveEdits} disabled={saving}>
              {saving ? <ActivityIndicator color="#5DCAA5" /> : <Text style={styles.saveBtn}>Save</Text>}
            </TouchableOpacity>
          </View>

          {selected && (
            <>
              <Image source={{ uri: selected.image_url }} style={styles.modalImage} />
              <Text style={styles.modalItemName}>{selected.type}</Text>
              <Text style={styles.modalItemSub}>{selected.primary_color} · formality {selected.formality}/5</Text>

              <Text style={styles.sectionLabel}>Occasions</Text>
              <View style={styles.chipRow}>
                {OCCASIONS.map((o) => (
                  <TouchableOpacity
                    key={o}
                    style={[styles.chip, editing?.occasions?.includes(o) && styles.chipActive]}
                    onPress={() => toggleTag('occasions', o)}
                  >
                    <Text style={[styles.chipText, editing?.occasions?.includes(o) && styles.chipTextActive]}>{o}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionLabel}>Seasons</Text>
              <View style={styles.chipRow}>
                {SEASONS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, editing?.seasons?.includes(s) && styles.chipActive]}
                    onPress={() => toggleTag('seasons', s)}
                  >
                    <Text style={[styles.chipText, editing?.seasons?.includes(s) && styles.chipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.deleteBtn} onPress={deleteItem}>
                <Text style={styles.deleteBtnText}>Remove from closet</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { color: '#E8E0D5', fontSize: 20, fontWeight: '600', marginBottom: 8 },
  emptySubtitle: { color: '#666', fontSize: 15, textAlign: 'center' },
  grid: { padding: 12, backgroundColor: '#0D0D0D' },
  card: { flex: 1, margin: 6, backgroundColor: '#1A1A1A', borderRadius: 12, overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 3 / 4 },
  info: { padding: 10 },
  itemType: { color: '#E8E0D5', fontSize: 13, fontWeight: '600' },
  itemColor: { color: '#888', fontSize: 12, marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 4 },
  tag: { backgroundColor: '#2A2A2A', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { color: '#999', fontSize: 10 },
  modal: { flex: 1, backgroundColor: '#0D0D0D' },
  modalContent: { padding: 20, paddingBottom: 48 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: '#E8E0D5', fontSize: 16, fontWeight: '600' },
  cancelBtn: { color: '#888', fontSize: 16 },
  saveBtn: { color: '#5DCAA5', fontSize: 16, fontWeight: '600' },
  modalImage: { width: '100%', aspectRatio: 3 / 4, borderRadius: 16, marginBottom: 16, backgroundColor: '#1A1A1A' },
  modalItemName: { color: '#E8E0D5', fontSize: 22, fontWeight: '700' },
  modalItemSub: { color: '#888', fontSize: 14, marginTop: 4, marginBottom: 24 },
  sectionLabel: { color: '#666', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginTop: 16, marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A' },
  chipActive: { backgroundColor: '#E8E0D5', borderColor: '#E8E0D5' },
  chipText: { color: '#777', fontSize: 13 },
  chipTextActive: { color: '#0D0D0D', fontWeight: '600' },
  deleteBtn: { marginTop: 32, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3A1A1A', alignItems: 'center' },
  deleteBtnText: { color: '#E24B4A', fontSize: 15, fontWeight: '600' },
});