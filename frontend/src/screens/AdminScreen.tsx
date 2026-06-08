import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";

import {
  Hairstyle,
  deleteHairstyle,
  getHairstyles,
  hairImageUrl,
  updateHairstyle,
  uploadHairstyle,
} from "../api/client";

const T = {
  bg: "#ffffff",
  card: "#ffffff",
  text: "#030303",
  sub: "#6C757D",
  border: "#DEE2E6",
  green: "#1c9770",
  red: "#EF4444",
  orange: "#F97316",
  purple: "#1c9770",
  navy: "#030303",
  link: "#1c9770",
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const SIDEBAR_W = 64;
const NUM_COLS = 3;
const H_PAD = 20;
const CARD_GAP = 12;
const CONTENT_W = SCREEN_W - SIDEBAR_W;
const CARD_W = (CONTENT_W - H_PAD * 2 - CARD_GAP * (NUM_COLS - 1)) / NUM_COLS;
const IMG_H = CARD_W * 1.05;

type SortField = "id" | "name";

export default function AdminScreen() {
  const [list, setList] = useState<Hairstyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Hairstyle | null>(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [form, setForm] = useState({
    name: "",
    imageUri: null as string | null,
  });
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setList(await getHairstyles());
    setLoading(false);
  }

  const filtered = list
    .filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortField === "id") return (a.id - b.id) * dir;
      return a.name.localeCompare(b.name) * dir;
    });

  function toggleSelect(id: number) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function openAdd() {
    setEditing(null);
    setForm({ name: "", imageUri: null });
    setModal(true);
  }

  function openEdit(item: Hairstyle) {
    setEditing(item);
    setForm({ name: item.name, imageUri: null });
    setModal(true);
  }

  async function pickImage() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!res.canceled) setForm((f) => ({ ...f, imageUri: res.assets[0].uri }));
  }

  async function submit() {
    if (!form.name.trim()) return;
    if (editing) {
      await updateHairstyle(editing.id, form.name, form.imageUri ?? undefined);
    } else {
      if (!form.imageUri) return;
      await uploadHairstyle(form.name, form.imageUri);
    }
    setModal(false);
    fetchData();
  }

  async function removeOne(id: number) {
    await deleteHairstyle(id);
    fetchData();
  }

  async function removeSelected() {
    await Promise.all(selected.map((id) => deleteHairstyle(id)));
    setSelected([]);
    fetchData();
  }

  const renderCard = useCallback(
    ({ item, index }: { item: Hairstyle; index: number }) => {
      const isSelected = selected.includes(item.id);
      const col = index % NUM_COLS;
      return (
        <View
          style={[
            s.card,
            col < NUM_COLS - 1 && { marginRight: CARD_GAP },
            { marginBottom: CARD_GAP },
            isSelected && s.cardSelected,
          ]}
        >
          <Pressable
            style={s.cardImgWrap}
            onPress={() => setPreviewUri(hairImageUrl(item.image_path))}
            onLongPress={() => toggleSelect(item.id)}
          >
            <Image
              source={{ uri: hairImageUrl(item.image_path) }}
              style={s.cardImg}
              resizeMode="center"
            />
            {isSelected && <View style={s.selectedDim} />}

            <Pressable
              style={s.checkOverlay}
              onPress={() => toggleSelect(item.id)}
            >
              <View style={[s.checkbox, isSelected && s.checkboxActive]}>
                {isSelected && <Feather name="check" size={9} color="#fff" />}
              </View>
            </Pressable>
          </Pressable>

          <View style={s.cardBody}>
            <Text style={s.cardName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={s.cardId}>ID: {item.id}</Text>
          </View>

          <View style={s.cardFooter}>
            <Pressable
              style={({ pressed }) => [
                s.iconBtn,
                s.iconBtnEdit,
                pressed && s.iconBtnEditFilled,
              ]}
              onPress={() => openEdit(item)}
            >
              {({ pressed }) => (
                <Feather
                  name="edit-2"
                  size={14}
                  color={pressed ? "#fff" : T.green}
                />
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                s.iconBtn,
                s.iconBtnDel,
                pressed && s.iconBtnDelFilled,
              ]}
              onPress={() => removeOne(item.id)}
            >
              {({ pressed }) => (
                <Feather
                  name="trash-2"
                  size={14}
                  color={pressed ? "#fff" : T.orange}
                />
              )}
            </Pressable>
          </View>
        </View>
      );
    },
    [selected],
  );

  return (
    <View style={s.container}>
      <View style={s.toolbar}>
        <View style={s.toolbarGroup}>
          <Pressable
            style={({ pressed }) => [
              s.toolBtn,
              s.toolBtnGreen,
              pressed && s.toolBtnGreenFilled,
              { marginLeft: 20 },
            ]}
            onPress={openAdd}
          >
            {({ pressed }) => (
              <>
                <Feather
                  name="plus"
                  size={14}
                  color={pressed ? "#fff" : T.green}
                />
                <Text style={[s.btnTxt, { color: pressed ? "#fff" : T.green }]}>
                  {" "}
                  New
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              s.toolBtn,
              s.toolBtnRed,
              pressed && s.toolBtnRedFilled,
            ]}
            onPress={removeSelected}
          >
            {({ pressed }) => (
              <>
                <Feather
                  name="trash-2"
                  size={14}
                  color={pressed ? "#fff" : "#F87171"}
                />
                <Text
                  style={[s.btnTxt, { color: pressed ? "#fff" : "#F87171" }]}
                >
                  {" "}
                  Delete
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      <View style={s.content}>
        <View style={s.subHeader}>
          <View style={s.subHeaderLeft}>
            <Text style={s.pageTitle}>Manage Hairstyles</Text>
            {selected.length > 0 && (
              <Text style={s.selectedHint}>{selected.length} selected</Text>
            )}
          </View>

          <View style={s.subHeaderRight}>
            <Pressable
              style={s.sortBtn}
              onPress={() => toggleSort(sortField === "name" ? "id" : "name")}
            >
              <Feather name="sliders" size={13} color={T.sub} />
              <Text style={s.sortBtnTxt}>
                {" "}
                {sortField === "name" ? "Name" : "ID"}{" "}
                {sortDir === "asc" ? "↑" : "↓"}
              </Text>
            </Pressable>

            <View style={s.searchBox}>
              <Feather name="search" size={14} color={T.sub} />
              <TextInput
                placeholder="Search..."
                value={search}
                onChangeText={setSearch}
                style={s.searchInput}
                placeholderTextColor={T.sub}
              />
            </View>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator
            style={{ marginTop: 60 }}
            color={T.purple}
            size="large"
          />
        ) : filtered.length === 0 ? (
          <View style={s.empty}>
            <Feather name="inbox" size={40} color={T.border} />
            <Text style={s.emptyTxt}>No hairstyles found</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(i) => String(i.id)}
            numColumns={NUM_COLS}
            renderItem={renderCard}
            contentContainerStyle={s.grid}
            columnWrapperStyle={s.row}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <Modal visible={!!previewUri} transparent animationType="fade">
        <Pressable style={s.previewOverlay} onPress={() => setPreviewUri(null)}>
          <View style={s.previewCard}>
            <Image
              source={{ uri: previewUri ?? "" }}
              style={s.previewImg}
              resizeMode="contain"
            />
            <Pressable
              style={s.previewClose}
              onPress={() => setPreviewUri(null)}
            >
              <Feather name="x" size={14} color={T.sub} />
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={modal} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>
                {editing ? "Edit Hairstyle" : "New Hairstyle"}
              </Text>
              <Pressable onPress={() => setModal(false)}>
                <Feather name="x" size={20} color={T.sub} />
              </Pressable>
            </View>

            <Text style={s.label}>Name</Text>
            <TextInput
              placeholder="Enter hairstyle name"
              value={form.name}
              onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
              style={s.input}
              placeholderTextColor={T.sub}
            />

            <Text style={s.label}>Image</Text>
            <Pressable style={s.uploadBtn} onPress={pickImage}>
              <Feather name="image" size={16} color={T.sub} />
              <Text style={s.uploadTxt}>
                {form.imageUri ? "Image selected ✓" : "Pick image"}
              </Text>
            </Pressable>

            <View style={s.sheetFooter}>
              <Pressable style={s.cancelBtn} onPress={() => setModal(false)}>
                <Text style={s.cancelTxt}>Cancel</Text>
              </Pressable>
              <Pressable style={s.saveBtn} onPress={submit}>
                <Text style={s.saveTxt}>{editing ? "Update" : "Create"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },

  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: T.card,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: T.border,
  },
  toolbarGroup: { flexDirection: "row", gap: 10 },

  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  toolBtnGreen: { borderColor: T.green },
  toolBtnGreenFilled: { backgroundColor: T.green },
  toolBtnRed: { borderColor: "#F87171" },
  toolBtnRedFilled: { backgroundColor: "#F87171" },
  toolBtnNavy: { borderColor: T.navy },
  toolBtnNavyFilled: { backgroundColor: T.navy },
  toolBtnPurple: { borderColor: T.purple },
  toolBtnPurpleFilled: { backgroundColor: T.purple },
  btnTxt: { fontSize: 13, fontWeight: "600" },

  content: { flex: 1, paddingHorizontal: H_PAD },

  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  subHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  subHeaderRight: { flexDirection: "row", alignItems: "center", gap: 10 },

  pageTitle: { fontSize: 30, fontWeight: "700", color: T.text },
  selectedHint: { fontSize: 12, color: T.purple, fontWeight: "600" },

  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: T.card,
  },
  sortBtnTxt: { fontSize: 12, color: T.sub },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: T.card,
    gap: 6,
    minWidth: 180,
  },
  searchInput: { flex: 1, fontSize: 13, color: T.text, padding: 0 },

  grid: { paddingBottom: 24 },

  card: {
    width: CARD_W,
    backgroundColor: T.card,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#030303",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardSelected: {
    shadowColor: T.purple,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },

  cardImgWrap: {
    width: CARD_W,
    height: IMG_H,
    overflow: "hidden",
    backgroundColor: "#f0faf6",
  },
  cardImg: {
    width: CARD_W,
    height: IMG_H * 1.35,
    marginTop: 20,
  },
  selectedDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(28,151,112,0.18)",
  },

  checkOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: T.purple,
    borderColor: T.purple,
  },

  cardBody: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  cardName: {
    fontSize: 20,
    fontWeight: "700",
    color: T.text,
    letterSpacing: 0.1,
  },
  cardId: {
    fontSize: 16,
    color: T.sub,
    marginTop: 3,
  },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnEdit: { borderColor: T.green },
  iconBtnEditFilled: { backgroundColor: T.green, borderColor: T.green },
  iconBtnDel: { borderColor: T.orange },
  iconBtnDelFilled: { backgroundColor: T.orange, borderColor: T.orange },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingBottom: 80,
  },
  emptyTxt: { fontSize: 14, color: T.sub },

  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewCard: {
    width: SCREEN_W * 0.42,
    maxHeight: SCREEN_H * 0.72,
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  previewImg: {
    width: SCREEN_W * 0.42,
    height: SCREEN_H * 0.62,
  },
  previewClose: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.88)",
    alignItems: "center",
    justifyContent: "center",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: {
    width: "90%",
    maxWidth: 440,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: T.text },

  label: { fontSize: 13, fontWeight: "600", color: T.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: T.text,
    marginBottom: 16,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    backgroundColor: "#f0faf6",
  },
  uploadTxt: { fontSize: 13, color: T.sub },

  sheetFooter: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
  },
  cancelTxt: { fontSize: 14, color: T.text },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: T.purple,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: CARD_GAP,
  },
  saveTxt: { fontSize: 14, color: "#fff", fontWeight: "600" },
});
