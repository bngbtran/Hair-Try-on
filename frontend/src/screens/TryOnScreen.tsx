import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { hairstyleApi } from '../services/hairstyleApi';
import { faceApi } from '../services/faceApi';
import type { Hairstyle } from '../types';

// ── Palette ──────────────────────────────────────────────────────────────────
const BLUE       = '#0d47a1';
const RED        = '#c62828';
const BG         = '#f0f4fb';
const WHITE      = '#ffffff';
const TEXT       = '#1a1a2e';
const SUBTEXT    = '#64748b';
const BORDER     = '#dde6f5';

function extractErrorMsg(e: any): string {
  const detail = e?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((d: any) => d.msg ?? JSON.stringify(d)).join(', ');
  if (typeof detail === 'string') return detail;
  return e?.message ?? 'Unknown error';
}

const VIEWS = [
  { key: 'front', label: 'FRONT',  transform: []                               },
  { key: 'left',  label: 'LEFT',   transform: [{ scaleX: -1 }]                 },
  { key: 'right', label: 'RIGHT',  transform: []                                },
  { key: 'back',  label: 'BACK',   transform: [{ scaleX: -1 }, { scaleY: -1 }] },
] as { key: string; label: string; transform: any[] }[];

export default function TryOnScreen() {
  const [faceUri, setFaceUri]       = useState<string | null>(null);
  const [hairstyles, setHairstyles] = useState<Hairstyle[]>([]);
  const [selected, setSelected]     = useState<Hairstyle | null>(null);
  const [resultUri, setResultUri]   = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [errorMsg, setErrorMsg]     = useState('');
  const [search, setSearch]         = useState('');
  const [gender, setGender]         = useState<'male' | 'female' | null>(null);

  const loadHairstyles = useCallback(async () => {
    try { setHairstyles(await hairstyleApi.list()); } catch {}
  }, []);

  useEffect(() => { loadHairstyles(); }, [loadHairstyles]);

  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) setFaceUri(result.assets[0].uri);
  };

  const handleReset = () => {
    setFaceUri(null); setSelected(null); setResultUri(null);
    setErrorMsg(''); setSearch(''); setGender(null);
  };

  const handleGenerate = async () => {
    if (!faceUri)  { Alert.alert('Upload a photo first');     return; }
    if (!selected) { Alert.alert('Select a hairstyle first'); return; }
    setLoading(true); setResultUri(null); setErrorMsg('');
    try {
      await faceApi.detect(faceUri);
      setResultUri(await faceApi.tryon(faceUri, selected.id));
    } catch (e: any) {
      setErrorMsg(extractErrorMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const filtered = hairstyles.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  const isWeb = Platform.OS === 'web';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.heroRing1} />
          <View style={styles.heroRing2} />
          <View style={styles.heroAccentBlob} />

          <View style={styles.heroInner}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>✂  AI POWERED  ·  VIRTUAL TRY-ON</Text>
            </View>

            <Text style={styles.heroTitle}>Hairify</Text>

            <View style={styles.heroDivider} />

            <Text style={styles.heroSub}>
              Discover your perfect hairstyle{'\n'}before stepping into the chair
            </Text>

            <View style={styles.heroFeatures}>
              {['100+ Styles', 'AI Detection', 'Instant Result'].map(f => (
                <View key={f} style={styles.heroFeaturePill}>
                  <Text style={styles.heroFeatureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── Floating body ────────────────────────────────────────────── */}
        <View style={styles.bodyOuter}>
        <View style={[styles.body, isWeb && styles.bodyRow]}>

          {/* ── LEFT PANEL ──────────────────────────────────────────────── */}
          <View style={[styles.panel, isWeb && styles.panelLeft]}>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>YOUR PHOTO</Text>
              <Text style={styles.cardTitle}>Upload Image</Text>

              <TouchableOpacity style={styles.uploadBox} onPress={pickImage} activeOpacity={0.9}>
                {faceUri ? (
                  <Image source={{ uri: faceUri }} style={styles.uploadImg} resizeMode="cover" />
                ) : (
                  <View style={styles.uploadPlaceholderWrap}>
                    <View style={styles.uploadIconRing}>
                      <Text style={styles.uploadIcon}>📷</Text>
                    </View>
                    <Text style={styles.uploadTitle}>Drop your photo here</Text>
                    <Text style={styles.uploadHint}>or tap to browse files</Text>
                  </View>
                )}
                {faceUri && (
                  <View style={styles.uploadOverlay}>
                    <Text style={styles.uploadOverlayText}>Tap to change</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.genderRow}>
                {(['male', 'female'] as const).map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderPill, gender === g && styles.genderPillActive]}
                    onPress={() => setGender(gender === g ? null : g)}
                  >
                    <Text style={[styles.genderPillText, gender === g && styles.genderPillTextActive]}>
                      {g === 'male' ? '♂  Male' : '♀  Female'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {selected && (
              <View style={styles.selectedBanner}>
                <View style={styles.selectedDot} />
                <Text style={styles.selectedText}>
                  Selected: <Text style={styles.selectedName}>{selected.name}</Text>
                </Text>
              </View>
            )}
          </View>

          {/* ── RIGHT PANEL ─────────────────────────────────────────────── */}
          <View style={[styles.panel, styles.panelRight]}>

            {/* Library */}
            <View style={styles.card}>
              <View style={[styles.topBar, isWeb && styles.topBarWeb]}>
                <View>
                  <Text style={styles.cardLabel}>BROWSE</Text>
                  <Text style={styles.cardTitle}>Hairstyle Library</Text>
                </View>
                <View style={styles.searchWrap}>
                  <Text style={styles.searchIcon}>🔍</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search style..."
                    placeholderTextColor={SUBTEXT}
                    value={search}
                    onChangeText={setSearch}
                  />
                </View>
              </View>

              <View style={styles.hairGrid}>
                {filtered.map(h => (
                  <TouchableOpacity
                    key={h.id}
                    style={[styles.hairCard, selected?.id === h.id && styles.hairCardActive]}
                    onPress={() => setSelected(h)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.hairImageWrap}>
                      {h.thumbnail_url ? (
                        <Image source={{ uri: h.thumbnail_url }} style={styles.hairThumb} resizeMode="cover" />
                      ) : (
                        <View style={styles.hairPlaceholder}>
                          <Text style={styles.hairPlaceholderIcon}>💇</Text>
                        </View>
                      )}
                      {selected?.id === h.id && (
                        <View style={styles.hairCheckBadge}>
                          <Text style={styles.hairCheckText}>✓</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.hairName} numberOfLines={1}>{h.name}</Text>
                    {h.color && (
                      <View style={styles.hairColorPill}>
                        <Text style={styles.hairColorText}>{h.color}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
                {filtered.length === 0 && (
                  <Text style={styles.emptyText}>
                    {hairstyles.length === 0
                      ? 'No hairstyles yet — add some in Admin tab.'
                      : 'No results found.'}
                  </Text>
                )}
              </View>
            </View>

            {/* Action bar */}
            <View style={styles.actionBar}>
              {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
                  <Text style={styles.resetBtnText}>↺  Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.generateBtn, loading && styles.btnDisabled]}
                  onPress={handleGenerate}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.generateBtnText}>✨  Generate Result</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>

            {/* Results */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>OUTPUT</Text>
              <Text style={styles.cardTitle}>Multi-View Result</Text>
              <View style={styles.resultGrid}>
                {VIEWS.map(({ key, label, transform }) => (
                  <View key={key} style={styles.resultTile}>
                    <View style={styles.resultImageWrap}>
                      {resultUri ? (
                        <Image
                          source={{ uri: resultUri }}
                          style={[styles.resultImg, transform.length > 0 && { transform }]}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.resultPlaceholderWrap}>
                          <Text style={styles.resultPlaceholderIcon}>🪞</Text>
                        </View>
                      )}
                      <View style={styles.resultLabelOverlay}>
                        <Text style={styles.resultLabelText}>{label}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

          </View>
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: BG },
  scrollContent: { paddingBottom: 80 },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    backgroundColor: BLUE,
    paddingTop: 44,
    paddingBottom: 56,
    paddingHorizontal: 32,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  heroGlow: {
    position: 'absolute', top: -80, right: -80,
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: 'rgba(198,40,40,0.18)',
    zIndex: 1,
  },
  heroRing1: {
    position: 'absolute', left: -70, top: -70,
    width: 260, height: 260, borderRadius: 130,
    borderWidth: 36, borderColor: 'rgba(255,255,255,0.05)',
    zIndex: 1,
  },
  heroRing2: {
    position: 'absolute', right: 40, bottom: -140,
    width: 300, height: 300, borderRadius: 150,
    borderWidth: 44, borderColor: 'rgba(255,255,255,0.04)',
    zIndex: 1,
  },
  heroAccentBlob: {
    position: 'absolute', left: 30, bottom: -60,
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(198,40,40,0.12)',
    zIndex: 1,
  },
  heroInner: {
    position: 'relative', zIndex: 2, alignItems: 'center',
  },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 16, paddingVertical: 6,
    marginBottom: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  heroBadgeText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11, fontWeight: '700', letterSpacing: 2,
  },
  heroTitle: {
    fontSize: 54, fontWeight: '900',
    color: WHITE, letterSpacing: -2, lineHeight: 58,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 20,
  },
  heroDivider: {
    width: 48, height: 3, borderRadius: 2,
    backgroundColor: RED,
    marginTop: 14, marginBottom: 14,
  },
  heroSub: {
    fontSize: 15, color: 'rgba(255,255,255,0.65)',
    fontWeight: '400', textAlign: 'center',
    lineHeight: 24, letterSpacing: 0.2,
  },
  heroFeatures: {
    flexDirection: 'row', gap: 8,
    marginTop: 22, flexWrap: 'wrap', justifyContent: 'center',
  },
  heroFeaturePill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  heroFeatureText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },

  // ── Body ──────────────────────────────────────────────────────────────────
  // Web: centred max-width column; cards float over the hero via negative marginTop
  bodyOuter: {
    alignItems: 'center',
  },
  body: {
    flexDirection: 'column',
    width: '100%',
    maxWidth: 1300,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 16,
    marginTop: -28,
  },
  bodyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 20 },
  panel:      { flexDirection: 'column', gap: 16 },
  panelLeft:  { width: 320, flexShrink: 0 },
  panelRight: { flex: 1 },

  // ── Cards ─────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: WHITE,
    borderRadius: 24, padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08, shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24, elevation: 8,
  },
  cardLabel: {
    fontSize: 10, fontWeight: '800', color: RED,
    letterSpacing: 2.5, marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18, fontWeight: '800', color: TEXT, marginBottom: 18,
  },

  // ── Upload ────────────────────────────────────────────────────────────────
  uploadBox: {
    borderWidth: 1.5, borderColor: BORDER,
    borderStyle: 'dashed',
    borderRadius: 20, height: 260,
    overflow: 'hidden', backgroundColor: BG,
    position: 'relative',
  },
  uploadImg: { width: '100%', height: '100%' },
  uploadPlaceholderWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  uploadIconRing: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: WHITE,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: BLUE, shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 5,
    marginBottom: 2,
  },
  uploadIcon:       { fontSize: 28 },
  uploadTitle:      { color: TEXT, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  uploadHint:       { color: SUBTEXT, fontSize: 12, textAlign: 'center' },
  uploadOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(13,71,161,0.62)',
    paddingVertical: 9, alignItems: 'center',
  },
  uploadOverlayText: { color: WHITE, fontSize: 12, fontWeight: '600', letterSpacing: 0.4 },

  // ── Gender pills ──────────────────────────────────────────────────────────
  genderRow:            { flexDirection: 'row', gap: 10, marginTop: 16 },
  genderPill: {
    flex: 1, paddingVertical: 11, borderRadius: 999,
    borderWidth: 1.5, borderColor: BORDER,
    alignItems: 'center', backgroundColor: WHITE,
  },
  genderPillActive:     { backgroundColor: BLUE, borderColor: BLUE },
  genderPillText:       { color: SUBTEXT, fontWeight: '600', fontSize: 14 },
  genderPillTextActive: { color: WHITE, fontWeight: '700' },

  // ── Selected banner ───────────────────────────────────────────────────────
  selectedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: WHITE, borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 14, elevation: 5,
  },
  selectedDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: RED },
  selectedText: { color: SUBTEXT, fontSize: 13 },
  selectedName: { color: TEXT, fontWeight: '700' },

  // ── Top bar ───────────────────────────────────────────────────────────────
  topBar:    { flexDirection: 'column', gap: 14, marginBottom: 18 },
  topBarWeb: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between', gap: 16, marginBottom: 18,
  },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: BG, borderRadius: 12,
    paddingHorizontal: 12, gap: 8,
    borderWidth: 1.5, borderColor: BORDER, minWidth: 220,
  },
  searchIcon:  { fontSize: 14 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: TEXT },

  // ── Hair grid ─────────────────────────────────────────────────────────────
  hairGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 4 },
  hairCard: {
    width: 155,
    backgroundColor: WHITE, borderRadius: 20, padding: 10,
    borderWidth: 1.5, borderColor: BORDER,
    shadowColor: BLUE, shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 }, shadowRadius: 16, elevation: 5,
  },
  hairCardActive: {
    borderColor: RED, borderWidth: 2,
    shadowColor: RED, shadowOpacity: 0.15,
    transform: [{ scale: 1.03 }],
  },
  hairImageWrap:       { position: 'relative', borderRadius: 14, overflow: 'hidden', marginBottom: 8 },
  hairThumb:           { width: '100%', height: 120, borderRadius: 14 },
  hairPlaceholder: {
    width: '100%', height: 120, borderRadius: 14,
    backgroundColor: '#e8eef8',
    alignItems: 'center', justifyContent: 'center',
  },
  hairPlaceholderIcon: { fontSize: 30 },
  hairCheckBadge: {
    position: 'absolute', top: 6, right: 6,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: RED, alignItems: 'center', justifyContent: 'center',
    shadowColor: RED, shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 5, elevation: 4,
  },
  hairCheckText:  { color: WHITE, fontSize: 12, fontWeight: '900' },
  hairName: {
    fontSize: 12, fontWeight: '700', color: TEXT,
    textAlign: 'center', marginBottom: 5,
  },
  hairColorPill: {
    alignSelf: 'center',
    backgroundColor: '#e8eef8',
    borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3,
  },
  hairColorText:  { fontSize: 11, color: BLUE, fontWeight: '600' },
  emptyText: {
    color: SUBTEXT, fontSize: 13, textAlign: 'center',
    paddingVertical: 32, flex: 1,
  },

  // ── Action bar ────────────────────────────────────────────────────────────
  actionBar: {
    backgroundColor: WHITE,
    borderRadius: 24, padding: 16, gap: 10,
    shadowColor: '#000', shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 8 }, shadowRadius: 24, elevation: 8,
  },
  errorText:  { color: RED, fontSize: 12, textAlign: 'center' },
  actionRow:  { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  resetBtn: {
    paddingHorizontal: 22, paddingVertical: 13, borderRadius: 999,
    borderWidth: 1.5, borderColor: BORDER, backgroundColor: WHITE,
  },
  resetBtnText: { color: TEXT, fontWeight: '700', fontSize: 14 },
  generateBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 999,
    backgroundColor: RED, alignItems: 'center', justifyContent: 'center',
    shadowColor: RED, shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, elevation: 8,
  },
  generateBtnText: {
    color: WHITE, fontWeight: '800', fontSize: 15, letterSpacing: 0.4,
  },
  btnDisabled: { opacity: 0.5 },

  // ── Results ───────────────────────────────────────────────────────────────
  resultGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  resultTile: { flex: 1, minWidth: 155 },
  resultImageWrap: {
    borderRadius: 20, overflow: 'hidden',
    height: 200, backgroundColor: '#e8eef8',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000', shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 6 }, shadowRadius: 18, elevation: 5,
  },
  resultImg: { width: '100%', height: '100%' },
  resultPlaceholderWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  resultPlaceholderIcon: { fontSize: 34, opacity: 0.3 },
  resultLabelOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(13,71,161,0.7)',
    paddingVertical: 8, alignItems: 'center',
  },
  resultLabelText: {
    color: WHITE, fontSize: 11, fontWeight: '800', letterSpacing: 2,
  },
});
