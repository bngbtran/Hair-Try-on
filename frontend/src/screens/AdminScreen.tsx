import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  Modal,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { hairstyleApi } from '../services/hairstyleApi';
import type { Hairstyle, HairstyleCreate } from '../types';

function HairstyleRow({
  item,
  onDelete,
  onUpload,
}: {
  item: Hairstyle;
  onDelete: (id: string) => void;
  onUpload: (id: string) => void;
}) {
  return (
    <View style={styles.row}>
      {item.thumbnail_url ? (
        <Image source={{ uri: item.thumbnail_url }} style={styles.rowThumb} />
      ) : (
        <View style={[styles.rowThumb, styles.noThumb]} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>{item.name}</Text>
        {item.color && <Text style={styles.rowMeta}>{item.color}</Text>}
        {item.style_type && <Text style={styles.rowMeta}>{item.style_type}</Text>}
      </View>
      <TouchableOpacity style={styles.actionBtn} onPress={() => onUpload(item.id)}>
        <Text style={styles.actionBtnText}>📷</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#7f1d1d' }]} onPress={() => onDelete(item.id)}>
        <Text style={styles.actionBtnText}>🗑</Text>
      </TouchableOpacity>
    </View>
  );
}

function extractErrorMsg(e: any): string {
  const detail = e?.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map((d: any) => d.msg ?? JSON.stringify(d)).join(', ');
  }
  if (typeof detail === 'string') return detail;
  return e?.message ?? 'Unknown error';
}

export default function AdminScreen() {
  const [hairstyles, setHairstyles]     = useState<Hairstyle[]>([]);
  const [loading, setLoading]           = useState(false);
  const [showModal, setShowModal]       = useState(false);
  const [form, setForm]                 = useState<HairstyleCreate>({
    name: '', description: '', color: '', style_type: '', tags: [],
  });
  const [tagsInput, setTagsInput]       = useState('');
  const [saving, setSaving]             = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setHairstyles(await hairstyleApi.list()); }
    catch { Alert.alert('Error', 'Cannot reach hairstyle service'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name.trim()) { Alert.alert('Name is required'); return; }
    setSaving(true);
    try {
      const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
      await hairstyleApi.create({ ...form, tags });
      setShowModal(false);
      setForm({ name: '', description: '', color: '', style_type: '', tags: [] });
      setTagsInput('');
      await load();
    } catch (e: any) {
      Alert.alert('Error', extractErrorMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Delete this hairstyle?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await hairstyleApi.delete(id); await load(); }
          catch { Alert.alert('Error', 'Could not delete'); }
        },
      },
    ]);
  };

  const handleUpload = async (id: string) => {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const fileName = asset.uri.split('/').pop() ?? 'image.jpg';
    try {
      await hairstyleApi.uploadImage(id, asset.uri, fileName);
      await load();
    } catch {
      Alert.alert('Error', 'Upload failed');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin · Hairstyles</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <Text style={styles.empty}>Loading…</Text>
      ) : hairstyles.length === 0 ? (
        <Text style={styles.empty}>No hairstyles yet. Tap + Add to create one.</Text>
      ) : (
        <FlatList
          data={hairstyles}
          keyExtractor={(h) => h.id}
          renderItem={({ item }) => (
            <HairstyleRow item={item} onDelete={handleDelete} onUpload={handleUpload} />
          )}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      {/* Create Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>New Hairstyle</Text>

            <TextInput
              style={styles.input}
              placeholder="Name *"
              placeholderTextColor="#555"
              value={form.name}
              onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Description"
              placeholderTextColor="#555"
              value={form.description}
              onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Color (e.g. Black, Blonde)"
              placeholderTextColor="#555"
              value={form.color}
              onChangeText={(t) => setForm((f) => ({ ...f, color: t }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Style Type (e.g. Wavy, Straight)"
              placeholderTextColor="#555"
              value={form.style_type}
              onChangeText={(t) => setForm((f) => ({ ...f, style_type: t }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Tags (comma-separated)"
              placeholderTextColor="#555"
              value={tagsInput}
              onChangeText={setTagsInput}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.5 }]}
                onPress={handleCreate}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const BLUE = '#0d47a1';
const RED  = '#c62828';

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#f0f2f5' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#dde3f0', backgroundColor: '#fff', borderTopWidth: 6, borderTopColor: BLUE },
  title:          { fontSize: 20, fontWeight: '800', color: BLUE },
  addBtn:         { backgroundColor: RED, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  addBtnText:     { color: '#fff', fontWeight: '700' },
  empty:          { color: '#999', textAlign: 'center', marginTop: 60, fontSize: 14 },
  row:            { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, gap: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2, borderLeftWidth: 4, borderLeftColor: BLUE },
  rowThumb:       { width: 56, height: 56, borderRadius: 8, resizeMode: 'cover' },
  noThumb:        { backgroundColor: '#dde3f0' },
  rowName:        { color: '#222', fontWeight: '700', fontSize: 14 },
  rowMeta:        { color: '#666', fontSize: 12 },
  actionBtn:      { width: 36, height: 36, borderRadius: 8, backgroundColor: '#e8eef8', alignItems: 'center', justifyContent: 'center' },
  actionBtnText:  { fontSize: 16 },
  // Modal
  modalBackdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalBox:       { backgroundColor: '#fff', borderRadius: 20, padding: 24, gap: 12, borderTopWidth: 6, borderTopColor: BLUE },
  modalTitle:     { fontSize: 18, fontWeight: '800', color: BLUE, marginBottom: 4 },
  input:          { backgroundColor: '#f5f7fb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: '#222', fontSize: 14, borderWidth: 1.5, borderColor: '#c5d3e8' },
  modalActions:   { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn:      { flex: 1, padding: 12, borderRadius: 10, borderWidth: 2, borderColor: BLUE, alignItems: 'center' },
  cancelBtnText:  { color: BLUE, fontWeight: '700' },
  saveBtn:        { flex: 1, padding: 12, borderRadius: 10, backgroundColor: RED, alignItems: 'center' },
  saveBtnText:    { color: '#fff', fontWeight: '700' },
});
