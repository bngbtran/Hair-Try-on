import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import Sidebar, { NavKey } from "./src/components/Sidebar";
import UserScreen from "./src/screens/UserScreen";
import AdminScreen from "./src/screens/AdminScreen";

export default function App() {
  const [active, setActive] = useState<NavKey>("user");

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={s.root} edges={["top", "bottom", "left"]}>
        <View style={s.layout}>
          <Sidebar active={active} onChange={setActive} />
          <View style={s.content}>
            {active === "user" && <UserScreen />}
            {active === "admin" && <AdminScreen />}
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  layout: {
    flex: 1,
    flexDirection: "row",
  },
  content: {
    flex: 1,
  },
});
