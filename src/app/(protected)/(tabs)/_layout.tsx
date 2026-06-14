import { useNotificationsRealtime } from "@/features/notifications";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Filled icon when active, outline when inactive — the modern social-app look
// (Instagram / Facebook): icon-forward, a soft "pill" highlight behind the
// active tab, and a tiny label underneath.
const TABS: Record<
  string,
  { label: string; on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap }
> = {
  index: { label: "Masters", on: "grid", off: "grid-outline" },
  dashboard: { label: "Dashboard", on: "people", off: "people-outline" },
  board: { label: "Board", on: "albums", off: "albums-outline" },
  reports: { label: "Reports", on: "bar-chart", off: "bar-chart-outline" },
  profile: { label: "Profile", on: "person-circle", off: "person-circle-outline" },
};

const ACTIVE = "#4f46e5";
const INACTIVE = "#9CA3AF";

function ModernTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800"
      style={{ paddingBottom: Math.max(insets.bottom, 10), paddingTop: 8 }}
    >
      {state.routes.map((route, index) => {
        const meta = TABS[route.name];
        if (!meta) return null;
        const focused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            className="flex-1 items-center justify-center"
          >
            <View
              className={`px-5 py-1 rounded-full ${
                focused ? "bg-indigo-50 dark:bg-indigo-900/40" : ""
              }`}
            >
              <Ionicons
                name={focused ? meta.on : meta.off}
                size={23}
                color={focused ? ACTIVE : INACTIVE}
              />
            </View>
            <Text
              className={`text-[10px] mt-0.5 ${
                focused
                  ? "text-indigo-600 dark:text-indigo-400 font-semibold"
                  : "text-gray-400"
              }`}
            >
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  // Subscribe once here so notification badges update live across the app
  // (the bell lives in each screen header and reads the shared cached list).
  useNotificationsRealtime();

  return (
    <Tabs
      tabBar={(props) => <ModernTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Masters" }} />
      <Tabs.Screen name="dashboard" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="board" options={{ title: "Board" }} />
      <Tabs.Screen name="reports" options={{ title: "Reports" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
