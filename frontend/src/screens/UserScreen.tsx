import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Hairstyle, getHairstyles, hairImageUrl, tryOnHairstyle } from '../api/client';
import ImageViewer from '../components/ImageViewer';

const { width: SW } = Dimensions.get('window');
const MAX_W  = Math.min(SW, 520);
const CARD_W = Math.floor((MAX_W - 56) / 3);

const C = {
  bg:      '#F7F4F0',
  white:   '#FFFFFF',
  primary: '#18182C',
  accent:  '#4F46E5',
  border:  '#EAE5DE',
  sub:     '#9B9590',
  muted:   '#C8C2BA',
  error:   '#EF4444',
  success: '#22C55E',
};

export default function UserScreen() {
  const [hairstyles, setHairstyles]   = useState<Hairstyle[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [personUri, setPersonUri]     = useState<string | null>(null);
  const [selectedId, setSelectedId]   = useState<number | null>(null);
  const [selectedName, setSelectedName] = useState('');
  const [busy, setBusy]               = useState(false);
  const [resultUri, setResultUri]     = useState<string | null>(null);
  const [viewerUri, setViewerUri]     = useState<string | null>(null);

  useEffect(() => { fetchList(); }, []);

  async function fetchList() {
    try {
      setListLoading(true);
      setHairstyles(await getHairstyles());
    } catch {
      Alert.alert('Lỗi kết nối', 'Không thể tải danh sách kiểu tóc.\nKiểm tra backend đã chạy chưa.');
    } finally {
      setListLoading(false);
    }
  }

  async function pickPhoto() {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Cần quyền truy cập thư viện ảnh'); return; }
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (!res.canceled) {
      setPersonUri(res.assets[0].uri);
      setResultUri(null);
    }
  }

  async function run() {
    if (!personUri || !selectedId) return;
    setBusy(true);
    try {
      setResultUri(await tryOnHairstyle(personUri, selectedId));
    } catch (e: any) {
      Alert.alert('Xử lý thất bại', e.message);
    } finally {
      setBusy(false);
    }
  }

  function downloadResult() {
    if (!resultUri) return;
    if (Platform.OS === 'web') {
      const a = document.createElement('a');
      a.href = resultUri;
      a.download = 'tryon_result.png';
      a.click();
    } else {
      Alert.alert('Lưu ảnh', 'Nhấn giữ vào ảnh kết quả để lưu về thiết bị');
    }
  }

  const renderCard = useCallback(({ item }: { item: Hairstyle }) => {
    const active = item.id === selectedId;
    return (
      <Pressable
        style={({ pressed }) => [s.card, active && s.cardActive, pressed && s.cardPressed]}
        onPress={() => { setSelectedId(item.id); setSelectedName(item.name); setResultUri(null); }}
      >
        {active && (
          <View style={s.cardBadge}>
            <Text style={s.cardBadgeTxt}>✓</Text>
          </View>
        )}
        <Image
          source={{ uri: hairImageUrl(item.image_path) }}
          style={s.cardImg}
          resizeMode="contain"
        />
        <Text style={s.cardLabel} numberOfLines={1}>{item.name}</Text>
      </Pressable>
    );
  }, [selectedId]);

  const canRun = !!personUri && !!selectedId && !busy;

  /* ─────────────────────────────────────────────────── render ── */
  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Photo upload ──────────────────────────────────── */}
        <View style={s.block}>
          <SectionLabel>Ảnh của bạn</SectionLabel>

          {!personUri ? (
            <TouchableOpacity style={s.dropzone} onPress={pickPhoto} activeOpacity={0.85}>
              <View style={s.dropIcon}><Text style={{ fontSize: 28 }}>📷</Text></View>
              <Text style={s.dropTitle}>Chọn hoặc chụp ảnh</Text>
              <Text style={s.dropHint}>PNG · JPG · HEIC</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.photoCard}>
              {/* ảnh nhỏ gọn, không chiếm toàn bộ màn hình */}
              <Image source={{ uri: personUri }} style={s.photoThumb} resizeMode="cover" />
              <View style={s.photoMeta}>
                <View style={s.photoReadyBadge}>
                  <Text style={s.photoReadyTxt}>✓ Ảnh đã chọn</Text>
                </View>
                <TouchableOpacity style={s.changeBtn} onPress={pickPhoto} activeOpacity={0.8}>
                  <Text style={s.changeBtnTxt}>Đổi ảnh</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ── Hairstyle grid ─────────────────────────────────── */}
        {!resultUri && (
          <View style={s.block}>
            <View style={s.rowBetween}>
              <SectionLabel>Chọn kiểu tóc</SectionLabel>
              {selectedId !== null && (
                <Text style={s.selectedPill}>{selectedName}</Text>
              )}
            </View>

            {listLoading ? (
              <View style={s.centered}>
                <ActivityIndicator color={C.accent} size="large" />
                <Text style={s.loadingTxt}>Đang tải...</Text>
              </View>
            ) : hairstyles.length === 0 ? (
              <View style={s.centered}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>💇</Text>
                <Text style={s.emptyTxt}>Chưa có kiểu tóc nào</Text>
                <TouchableOpacity onPress={fetchList} style={s.retryBtn}>
                  <Text style={s.retryTxt}>Tải lại</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={hairstyles}
                keyExtractor={i => String(i.id)}
                renderItem={renderCard}
                numColumns={3}
                scrollEnabled={false}
                columnWrapperStyle={s.gridRow}
              />
            )}
          </View>
        )}

        {/* ── Result ─────────────────────────────────────────── */}
        {resultUri && (
          <View style={s.block}>
            <SectionLabel>Kết quả</SectionLabel>
            <Text style={s.resCaption}>
              Kiểu tóc: <Text style={s.resName}>{selectedName}</Text>
            </Text>

            <View style={s.baRow}>
              <View style={s.baCol}>
                <Text style={s.baTag}>TRƯỚC</Text>
                <Image source={{ uri: personUri! }} style={s.baImg} resizeMode="cover" />
              </View>
              <View style={s.baArrow}><Text style={{ color: C.muted, fontSize: 18 }}>→</Text></View>
              <View style={s.baCol}>
                <Text style={[s.baTag, s.baTagAfter]}>SAU</Text>
                <Pressable onPress={() => setViewerUri(resultUri)}>
                  <Image source={{ uri: resultUri }} style={[s.baImg, s.baImgAfter]} resizeMode="cover" />
                  <View style={s.zoomHint}>
                    <Text style={s.zoomHintTxt}>🔍 Nhấn để xem to</Text>
                  </View>
                </Pressable>
              </View>
            </View>

            <View style={s.resActions}>
              <TouchableOpacity style={s.btnPrimary} onPress={downloadResult} activeOpacity={0.85}>
                <Text style={s.btnPrimaryTxt}>↓ Tải xuống</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnGhost} onPress={() => setResultUri(null)} activeOpacity={0.85}>
                <Text style={s.btnGhostTxt}>Thử kiểu khác</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>

      {/* ── Image Viewer ──────────────────────────────────────── */}
      <ImageViewer
        uri={viewerUri}
        label={selectedName || 'Kết quả'}
        onClose={() => setViewerUri(null)}
        onDownload={viewerUri ? () => { downloadResult(); setViewerUri(null); } : undefined}
      />

      {/* ── Sticky footer ─────────────────────────────────────── */}
      {!resultUri && (
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.tryBtn, !canRun && s.tryBtnOff]}
            onPress={run}
            disabled={!canRun}
            activeOpacity={0.9}
          >
            {busy
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.tryBtnTxt}>
                  {!personUri ? 'Chọn ảnh để bắt đầu'
                    : !selectedId ? 'Chọn kiểu tóc'
                    : '✨  Thử ngay'}
                </Text>
            }
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text style={s.sectionLabel}>{children}</Text>;
}

/* ──────────────────────────────────────────── styles ── */
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 110, alignItems: 'center' },
  block:  { width: '100%', maxWidth: MAX_W, paddingHorizontal: 20, marginTop: 24 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.4,
    textTransform: 'uppercase', color: C.sub, marginBottom: 12,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  selectedPill: {
    fontSize: 11, color: C.accent, fontWeight: '700',
    backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 20,
  },

  /* Drop zone */
  dropzone: {
    backgroundColor: C.white, borderRadius: 18,
    borderWidth: 2, borderStyle: 'dashed', borderColor: C.muted,
    paddingVertical: 32, alignItems: 'center', gap: 6,
  },
  dropIcon:  { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F0EDF8', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  dropTitle: { fontSize: 15, fontWeight: '700', color: C.primary },
  dropHint:  { fontSize: 12, color: C.sub },

  /* Photo card — ảnh nhỏ gọn bên trái, info bên phải */
  photoCard: {
    backgroundColor: C.white, borderRadius: 18, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 12,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  photoThumb: {
    width: 80, height: 100,          // nhỏ gọn, không chiếm toàn màn hình
    borderRadius: 12, backgroundColor: '#EDE8E2',
  },
  photoMeta: { flex: 1, gap: 10 },
  photoReadyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDF4', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  photoReadyTxt: { fontSize: 12, color: C.success, fontWeight: '700' },
  changeBtn: {
    alignSelf: 'flex-start',
    backgroundColor: C.primary, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  changeBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },

  /* Grid */
  gridRow: { justifyContent: 'flex-start', gap: 8, marginBottom: 8 },
  card: {
    width: CARD_W, borderRadius: 14, overflow: 'hidden',
    backgroundColor: C.white,
    borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
    position: 'relative',
  },
  cardActive:  { borderColor: C.accent, shadowColor: C.accent, shadowOpacity: 0.25, shadowRadius: 8 },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  cardBadge: {
    position: 'absolute', top: 5, right: 5, zIndex: 2,
    backgroundColor: C.accent, borderRadius: 10,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
  },
  cardBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  cardImg:      { width: '100%', height: CARD_W, backgroundColor: '#F5F3EF' },
  cardLabel:    { fontSize: 10, textAlign: 'center', paddingVertical: 5, paddingHorizontal: 3, color: '#555' },

  /* Loading / empty */
  centered:   { alignItems: 'center', paddingVertical: 32 },
  loadingTxt: { marginTop: 10, fontSize: 13, color: C.sub },
  emptyTxt:   { fontSize: 14, color: C.sub },
  retryBtn:   { marginTop: 12, backgroundColor: C.primary, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 },
  retryTxt:   { color: '#fff', fontSize: 13, fontWeight: '600' },

  /* Result */
  resCaption: { fontSize: 13, color: '#666', marginBottom: 16 },
  resName:    { fontWeight: '700', color: C.primary },
  baRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  baArrow: { paddingTop: 20 },
  baCol:  { flex: 1 },
  baTag:  {
    fontSize: 10, fontWeight: '700', letterSpacing: 1,
    color: C.sub, textAlign: 'center', marginBottom: 6,
  },
  baTagAfter: { color: C.accent },
  baImg:  {
    width: '100%', aspectRatio: 3 / 4,
    borderRadius: 16, backgroundColor: '#EDE8E2',
  },
  baImgAfter: {
    borderWidth: 3, borderColor: C.accent,
    shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  zoomHint: {
    position: 'absolute', bottom: 8, left: 0, right: 0,
    alignItems: 'center',
  },
  zoomHintTxt: {
    fontSize: 10, color: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, overflow: 'hidden',
  },
  resActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  btnPrimary: {
    flex: 1, backgroundColor: C.primary, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: C.primary, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  btnPrimaryTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnGhost: {
    flex: 1, backgroundColor: 'transparent', borderRadius: 14,
    borderWidth: 1.5, borderColor: C.primary, paddingVertical: 14, alignItems: 'center',
  },
  btnGhostTxt: { color: C.primary, fontSize: 14, fontWeight: '700' },

  /* Footer */
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.white,
    paddingHorizontal: 20, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    borderTopWidth: 1, borderTopColor: C.border,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 }, elevation: 12,
  },
  tryBtn: {
    backgroundColor: C.accent, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: C.accent, shadowOpacity: 0.4,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  tryBtnOff: { backgroundColor: C.muted, shadowOpacity: 0 },
  tryBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});
