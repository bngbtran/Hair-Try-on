import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  Hairstyle,
  getHairstyles,
  hairImageUrl,
  tryOnHairstyle,
} from "../api/client";

const { width: SW } = Dimensions.get("window");
const MAX_W = Math.min(SW, 520);
const CARD_W = Math.floor((MAX_W - 56) / 3);

/* Admin vibe */
const C = {
  bg: "#F4F6F8",
  white: "#FFFFFF",
  text: "#0F172A",
  sub: "#6C757D",
  border: "#DEE2E6",
  purple: "#6366F1",
};

export default function UserScreen() {
  const [hairstyles, setHairstyles] = useState<Hairstyle[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const [personUri, setPersonUri] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedName, setSelectedName] = useState("");

  const [busy, setBusy] = useState(false);

  const [resultUri, setResultUri] = useState<string | null>(null);
  const [resultDialog, setResultDialog] = useState(false);

  const [previewUri, setPreviewUri] = useState<string | null>(null);

  useEffect(() => {
    fetchList();
  }, []);

  async function fetchList() {
    try {
      setListLoading(true);
      setHairstyles(await getHairstyles());
    } catch {
      Alert.alert("Error", "Cannot load hairstyles");
    } finally {
      setListLoading(false);
    }
  }

  async function pickPhoto() {
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

  function downloadResult() {
    if (!resultUri) return;

    if (Platform.OS === "web") {
      const a = document.createElement("a");
      a.href = resultUri;
      a.download = "tryon-result.png";
      a.click();
    } else {
      Alert.alert("Download", "Long press image to save");
    }
  }

  async function run() {
    if (!personUri || !selectedId) return;

    setBusy(true);
    try {
      const uri = await tryOnHairstyle(personUri, selectedId);
      setResultUri(uri);
      setResultDialog(true);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setBusy(false);
    }
  }

  const renderCard = useCallback(
    ({ item }: { item: Hairstyle }) => {
      const active = item.id === selectedId;

      return (
        <Pressable
          style={({ pressed }) => [
            s.card,
            active && s.cardActive,
            pressed && s.cardPressed,
          ]}
          onPress={() => {
            setSelectedId(item.id);
            setSelectedName(item.name);
            setResultUri(null);
          }}
        >
          {/* Preview badge */}
          <Pressable
            style={s.previewBadge}
            onPress={() => setPreviewUri(hairImageUrl(item.image_path))}
          >
            <Text style={s.previewTxt}>Preview</Text>
          </Pressable>

          {active && (
            <View style={s.badge}>
              <Text style={s.badgeTxt}>✓</Text>
            </View>
          )}

          <View style={s.imgWrap}>
            <Image
              source={{ uri: hairImageUrl(item.image_path) }}
              style={s.cardImg}
              resizeMode="contain"
            />
          </View>

          <Text style={s.cardLabel} numberOfLines={1}>
            {item.name}
          </Text>
        </Pressable>
      );
    },
    [selectedId],
  );

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Upload */}
        <View style={s.block}>
          <Text style={s.label}>Your Photo</Text>

          {!personUri ? (
            <Pressable style={s.uploadBox} onPress={pickPhoto}>
              <Text style={s.uploadTxt}>📷 Select Photo</Text>
            </Pressable>
          ) : (
            <View style={s.photoCardCenter}>
              <Image
                source={{ uri: personUri }}
                style={s.photo}
                resizeMode="cover"
              />
              <Pressable style={s.changePhotoBtn} onPress={pickPhoto}>
                <Text style={s.changePhotoTxt}>📷 Change Photo</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Grid */}
        <View style={s.block}>
          <Text style={s.label}>Choose Hairstyle</Text>

          {listLoading ? (
            <ActivityIndicator color={C.purple} />
          ) : (
            <FlatList
              data={hairstyles}
              keyExtractor={(i) => String(i.id)}
              renderItem={renderCard}
              numColumns={3}
              scrollEnabled={false}
              columnWrapperStyle={s.row}
            />
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={s.footer}>
        <TouchableOpacity
          disabled={!personUri || !selectedId || busy}
          onPress={run}
          style={[s.runBtn, (!personUri || !selectedId || busy) && s.runBtnOff]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.runTxt}>✨ Try Now</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* RESULT DIALOG */}
      <Modal visible={resultDialog} transparent animationType="fade">
        <View style={s.modalBg}>
          <View style={s.modalCardCompact}>
            {/* Header */}
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Result Preview</Text>
              <Pressable onPress={() => setResultDialog(false)}>
                <Text style={s.modalXBtn}>✕</Text>
              </Pressable>
            </View>

            {/* BEFORE / AFTER */}
            <View style={s.compareRow}>
              <View style={s.compareCol}>
                <Text style={s.compareLabel}>Before</Text>
                <Pressable onPress={() => setPreviewUri(personUri)}>
                  <Image
                    source={{ uri: personUri || "" }}
                    style={s.compareImgBig}
                    resizeMode="cover"
                  />
                </Pressable>
              </View>

              <View style={s.compareCol}>
                <Text style={[s.compareLabel, { color: C.purple }]}>After</Text>
                <Pressable onPress={() => setPreviewUri(resultUri)}>
                  <Image
                    source={{ uri: resultUri || "" }}
                    style={[s.compareImgBig, s.afterBorder]}
                    resizeMode="cover"
                  />
                </Pressable>
              </View>
            </View>

            {/* ACTIONS */}
            <View style={s.modalActionsCompact}>
              <TouchableOpacity style={s.btnPrimary} onPress={downloadResult}>
                <Text style={s.btnText}>Download</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.btnGhost}
                onPress={() => setResultDialog(false)}
              >
                <Text style={s.btnGhostText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* HAIR PREVIEW MODAL — rendered last to stack on top of everything */}
      <Modal visible={!!previewUri} transparent animationType="fade">
        <Pressable style={s.modalBg} onPress={() => setPreviewUri(null)}>
          <View style={s.previewBox}>
            <Image
              source={{ uri: previewUri ?? "" }}
              style={s.previewImg}
              resizeMode="contain"
            />
            <Pressable
              style={s.previewClose}
              onPress={() => setPreviewUri(null)}
            >
              <Text style={s.previewCloseTxt}>✕</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

/* STYLE */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 120, alignItems: "center" },

  block: {
    width: "100%",
    maxWidth: MAX_W,
    paddingHorizontal: 20,
    marginTop: 24,
  },

  label: {
    fontSize: 11,
    fontWeight: "700",
    color: C.sub,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 12,
  },

  uploadBox: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
  },
  uploadTxt: { color: C.text, fontWeight: "600" },

  changePhotoBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  changePhotoTxt: { fontSize: 13, color: C.sub, fontWeight: "600" },

  photoCardCenter: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
  },
  photo: {
    width: 160,
    height: 200,
    borderRadius: 12,
  },

  row: { justifyContent: "space-between", marginBottom: 10 },

  card: {
    width: CARD_W,
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },

  cardActive: { borderColor: C.purple },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },

  imgWrap: {
    height: CARD_W,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F8FB",
  },

  cardImg: { width: "90%", height: "90%" },

  cardLabel: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    padding: 6,
  },

  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: C.purple,
    width: 18,
    height: 18,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeTxt: { color: "#fff", fontSize: 10, fontWeight: "800" },

  previewBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    zIndex: 10,
  },
  previewTxt: { color: "#fff", fontSize: 9, fontWeight: "700" },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderColor: C.border,
    padding: 14,
  },

  runBtn: {
    backgroundColor: C.purple,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  runBtnOff: { backgroundColor: "#C7C7D1" },
  runTxt: { color: "#fff", fontWeight: "700" },

  /* RESULT MODAL */
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
    color: "#0F172A",
  },
  modalImg: {
    width: "100%",
    height: 360,
    borderRadius: 12,
  },

  modalActions: {
    flexDirection: "row",
    marginTop: 12,
    gap: 10,
  },

  btnPrimary: {
    flex: 1,
    backgroundColor: C.purple,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },

  btnGhost: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  btnGhostText: { color: C.text, fontWeight: "700" },

  previewBox: {
    width: "80%",
    height: "72%",
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
  },
  previewImg: {
    width: "100%",
    height: "100%",
  },
  previewClose: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewCloseTxt: { color: "#fff", fontSize: 12, fontWeight: "700" },

  compareImgBig: {
    alignSelf: "stretch",
    aspectRatio: 3 / 4,
    borderRadius: 10,
    backgroundColor: "#F1F1F1",
  },
  modalCardCompact: {
    width: "68%",
    maxWidth: 480,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalXBtn: {
    fontSize: 16,
    color: "#6C757D",
    paddingHorizontal: 4,
  },
  compareRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },

  compareCol: {
    flex: 1,
    alignItems: "stretch",
  },

  compareLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6C757D",
    marginBottom: 6,
    textAlign: "center",
  },

  compareImg: {
    width: 90,
    height: 120,
    borderRadius: 10,
    backgroundColor: "#F1F1F1",
  },

  afterBorder: {
    borderWidth: 2,
    borderColor: "#6366F1",
  },

  compareArrow: {
    paddingHorizontal: 6,
  },

  modalActionsCompact: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
});
