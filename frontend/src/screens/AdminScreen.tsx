import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Hairstyle,
  deleteHairstyle,
  getHairstyles,
  hairImageUrl,
  updateHairstyle,
  uploadHairstyle,
} from '../api/client';
import ImageViewer from '../components/ImageViewer';

const C = {
  bg:      '#F7F4F0',
  white:   '#FFFFFF',
  primary: '#18182C',
  accent:  '#4F46E5',
  border:  '#EAE5DE',
  sub:     '#9B9590',
  muted:   '#C8C2BA',
  error:   '#EF4444',
  warn:    '#F59E0B',
  success: '#22C55E',
};

interface FormState { name: string; imageUri: string | null }

export default function AdminScreen() {
  const [list, setList]         = useState<Hairstyle[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState<Hairstyle | null>(null);
  const [form, setForm]         = useState<FormState>({ name: '', imageUri: null });
  const [viewerUri, setViewerUri]   = useState<string | null>(null);
  const [viewerLabel, setViewerLabel] = useState('');

  useEffect(() => { fetchList(); }, []);

  async function fetchList() {
    try {
      setLoading(true);
      setList(await getHairstyles());
    } catch {
      Alert.alert('Lỗi kết nối', 'Không thể tải danh sách.\nKiểm tra backend đã chạy chưa.');
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditing(null);
    setForm({ name: '', imageUri: null });
    setModal(true);
  }

  function openEdit(item: Hairstyle) {
    setEditing(item);
    setForm({ name: item.name, imageUri: null });
    setModal(true);
  }

  async function pickImage() {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Cần quyền truy cập thư viện ảnh'); return; }
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.92,
    });
    if (!res.canceled) setForm(f => ({ ...f, imageUri: res.assets[0].uri }));
  }

  async function submit() {
    if (!form.name.trim()) { Alert.alert('Thiếu thông tin', 'Nhập tên kiểu tóc'); return; }
    if (!editing && !form.imageUri) { Alert.alert('Thiếu thông tin', 'Chọn ảnh kiểu tóc'); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateHairstyle(editing.id, form.name.trim(), form.imageUri ?? undefined);
      } else {
        await uploadHairstyle(form.name.trim(), form.imageUri!);
      }
      setModal(false);
      await fetchList();
    } catch (e: any) {
      Alert.alert('Lỗi', e.message);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(item: Hairstyle) {
    Alert.alert('Xoá kiểu tóc', `Xoá "${item.name}"?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá', style: 'destructive',
        onPress: async () => {
          try { await deleteHairstyle(item.id); await fetchList(); }
          catch (e: any) { Alert.alert('Lỗi', e.message); }
        },
      },
    ]);
  }

  const renderItem = useCallback(({ item }: { item: Hairstyle }) => {
    const date = item.created_at?.split('.')?.[0] ?? '';
    return (
      <View style={s.card}>
        <Pressable onPress={() => { setViewerUri(hairImageUrl(item.image_path)); setViewerLabel(item.name); }}>
          <Image source={{ uri: hairImageUrl(item.image_path) }} style={s.thumb} resizeMode="contain" />
        </Pressable>
        <View style={s.cardBody}>
          <Text style={s.cardName}>{item.name}</Text>
          <Text style={s.cardId}>ID · {item.id}</Text>
          {!!date && <Text style={s.cardDate}>{date}</Text>}
        </View>
        <View style={s.cardActions}>
          <Pressable style={({ pressed }) => [s.iconBtn, s.editBtn, pressed && s.pressed]}
            onPress={() => openEdit(item)}>
            <Text style={s.iconBtnTxt}>✏️</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [s.iconBtn, s.delBtn, pressed && s.pressed]}
            onPress={() => confirmDelete(item)}>
            <Text style={s.iconBtnTxt}>🗑</Text>
          </Pressable>
        </View>
      </View>
    );
  }, []);

  /* ───────────────────────────────────────── render ── */
  return (
    <View style={s.root}>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={C.accent} size="large" />
          <Text style={s.loadTxt}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={i => String(i.id)}
          renderItem={renderItem}
          contentContainerStyle={s.listPad}
          ListEmptyComponent={
            <View style={s.centered}>
              <Text style={{ fontSize: 40, marginBottom: 10 }}>💇</Text>
              <Text style={s.emptyTxt}>Chưa có kiểu tóc nào</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {/* Image Viewer */}
      <ImageViewer
        uri={viewerUri}
        label={viewerLabel}
        onClose={() => setViewerUri(null)}
      />

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={openAdd} activeOpacity={0.85}>
        <Text style={s.fabTxt}>＋  Thêm mới</Text>
      </TouchableOpacity>

      {/* ── Add / Edit Modal ──────────────────────────────── */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView
          style={s.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={s.backdrop} onPress={() => setModal(false)} />

          <View style={s.sheet}>
            <View style={s.handle} />

            <Text style={s.sheetTitle}>
              {editing ? '✏️  Cập nhật kiểu tóc' : '＋  Thêm kiểu tóc mới'}
            </Text>

            {/* Tên */}
            <Text style={s.fieldLabel}>
              Tên kiểu tóc <Text style={{ color: C.error }}>*</Text>
            </Text>
            <TextInput
              style={s.input}
              placeholder="VD: Tóc bob ngắn"
              placeholderTextColor={C.muted}
              value={form.name}
              onChangeText={t => setForm(f => ({ ...f, name: t }))}
              returnKeyType="done"
            />

            {/* Ảnh */}
            <Text style={s.fieldLabel}>
              Ảnh kiểu tóc{' '}
              {!editing
                ? <Text style={{ color: C.error }}>*</Text>
                : <Text style={{ color: C.sub, fontWeight: '400' }}>(bỏ trống = giữ nguyên)</Text>
              }
            </Text>

            <Pressable
              style={({ pressed }) => [s.imgPick, pressed && s.pressed]}
              onPress={pickImage}
            >
              {form.imageUri ? (
                <View style={s.imgPickPreviewWrap}>
                  <Image source={{ uri: form.imageUri }} style={s.imgPickPreview} resizeMode="cover" />
                  <View style={s.imgPickOverlay}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Đổi ảnh</Text>
                  </View>
                </View>
              ) : (
                <View style={s.imgPickEmpty}>
                  <Text style={{ fontSize: 28 }}>📷</Text>
                  <Text style={s.imgPickTxt}>Nhấn để chọn ảnh</Text>
                </View>
              )}
            </Pressable>

            {/* Buttons */}
            <View style={s.sheetBtns}>
              <TouchableOpacity style={s.btnCancel} onPress={() => setModal(false)}>
                <Text style={s.btnCancelTxt}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnSave, saving && { opacity: 0.7 }]}
                onPress={submit}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.btnSaveTxt}>{editing ? 'Cập nhật' : 'Upload & Tách tóc'}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/* ──────────────────────────────────────── styles ── */
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  listPad: { padding: 16, paddingBottom: 100 },
  centered:{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadTxt: { marginTop: 12, color: C.sub, fontSize: 13 },
  emptyTxt:{ color: C.sub, fontSize: 14, marginTop: 4 },

  /* Card */
  card: {
    backgroundColor: C.white, borderRadius: 18, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  thumb:       { width: 64, height: 80, borderRadius: 12, backgroundColor: '#EEE9E2' },
  cardBody:    { flex: 1, gap: 2 },
  cardName:    { fontSize: 15, fontWeight: '700', color: C.primary },
  cardId:      { fontSize: 11, color: C.sub },
  cardDate:    { fontSize: 11, color: C.muted },
  cardActions: { gap: 8 },
  iconBtn:     { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  editBtn:     { backgroundColor: '#FEF3C7' },
  delBtn:      { backgroundColor: '#FEE2E2' },
  iconBtnTxt:  { fontSize: 16 },
  pressed:     { opacity: 0.7, transform: [{ scale: 0.95 }] },

  /* FAB */
  fab: {
    position: 'absolute', bottom: 24, alignSelf: 'center',
    backgroundColor: C.accent, borderRadius: 30,
    paddingHorizontal: 28, paddingVertical: 15,
    shadowColor: C.accent, shadowOpacity: 0.45, shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }, elevation: 10,
  },
  fabTxt: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },

  /* Modal */
  overlay:  { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
  },
  handle:     { width: 36, height: 4, backgroundColor: '#DDD', borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: C.primary, marginBottom: 22 },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 8 },
  input: {
    backgroundColor: '#FAFAF8', borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: C.primary, marginBottom: 18,
  },

  imgPick: {
    borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: C.muted,
    height: 130, overflow: 'hidden', marginBottom: 24,
  },
  imgPickPreviewWrap: { flex: 1 },
  imgPickPreview: { width: '100%', height: '100%' },
  imgPickOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  imgPickEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  imgPickTxt:   { fontSize: 13, color: C.sub, fontWeight: '600' },

  sheetBtns:    { flexDirection: 'row', gap: 12 },
  btnCancel: {
    flex: 1, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  btnCancelTxt: { fontSize: 14, fontWeight: '700', color: '#777' },
  btnSave: {
    flex: 2, backgroundColor: C.accent, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: C.accent, shadowOpacity: 0.35,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  btnSaveTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
