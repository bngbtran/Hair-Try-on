import React from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

export type NavKey = "user" | "admin";

interface NavItem {
  key: NavKey;
  icon: React.ComponentProps<typeof Feather>["name"];
}

const NAV_ITEMS: NavItem[] = [
  { key: "user",  icon: "scissors" },
  { key: "admin", icon: "grid"     },
];

interface Props {
  active: NavKey;
  onChange: (key: NavKey) => void;
}

const PURPLE = "#6366F1";
const MUTED  = "#94A3B8";
const BG     = "#FFFFFF";
const BORDER = "#F1F5F9";

export default function Sidebar({ active, onChange }: Props) {
  return (
    <View style={s.sidebar}>
      {/* Logo */}
      <View style={s.logoWrap}>
        <Image
          source={require("../../assets/images/barber.png")}
          style={s.logo}
          resizeMode="contain"
        />
      </View>

      <View style={s.divider} />

      {/* Nav items */}
      <View style={s.navList}>
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.key;
          return (
            <Pressable
              key={item.key}
              style={({ pressed }) => [
                s.navBtn,
                isActive && s.navBtnActive,
                pressed && s.navBtnPressed,
              ]}
              onPress={() => onChange(item.key)}
            >
              {/* Active indicator bar on right edge */}
              {isActive && <View style={s.activeBar} />}
              <Feather
                name={item.icon}
                size={20}
                color={isActive ? PURPLE : MUTED}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const SIDEBAR_W = 64;

const s = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_W,
    height: "100%",
    backgroundColor: BG,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    alignItems: "center",
    paddingTop: 8,
  },

  logoWrap: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  logo: {
    width: 36,
    height: 36,
  },

  divider: {
    width: 36,
    height: 1,
    backgroundColor: BORDER,
    marginBottom: 12,
  },

  navList: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    gap: 4,
    paddingTop: 4,
  },

  navBtn: {
    width: SIDEBAR_W,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  navBtnActive: {
    backgroundColor: "#EEF2FF",
  },
  navBtnPressed: {
    backgroundColor: "#F8FAFF",
  },

  activeBar: {
    position: "absolute",
    right: 0,
    top: 10,
    bottom: 10,
    width: 3,
    backgroundColor: PURPLE,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
});
