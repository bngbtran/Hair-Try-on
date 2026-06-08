import React from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Props {
  uri: string | null;
  label?: string;
  onClose: () => void;
  onDownload?: () => void;
}

export default function ImageViewer({
  uri,
  label,
  onClose,
  onDownload,
}: Props) {
  if (!uri) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Image source={{ uri }} style={s.img} resizeMode="contain" />

        <View style={s.topBar}>
          {label ? (
            <Text style={s.label} numberOfLines={1}>
              {label}
            </Text>
          ) : (
            <View />
          )}
          <TouchableOpacity
            style={s.closeBtn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={s.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        {onDownload && (
          <View style={s.bottomBar}>
            <TouchableOpacity
              style={s.dlBtn}
              onPress={onDownload}
              activeOpacity={0.85}
            >
              <Text style={s.dlTxt}>↓ Tải xuống</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },

  img: {
    width: "100%",
    height: "100%",
    ...(Platform.OS === "web" ? { pointerEvents: "none" as any } : {}),
  },

  topBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 20,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    marginRight: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeTxt: { color: "#fff", fontSize: 16, fontWeight: "700" },

  bottomBar: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 44 : 24,
    left: 24,
    right: 24,
  },
  dlBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  dlTxt: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
