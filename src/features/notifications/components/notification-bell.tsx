import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsQuery,
  useUnreadCount,
} from "../hooks/use-notifications";
import type { AppNotification } from "../api/notifications";

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function notificationText(n: AppNotification): string {
  if (n.title) return n.title;
  const t = n.type.replace(/[_.]/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Header bell with an unread badge. Tapping opens a popup of recent
 * notifications; tapping a notification marks it read and — if it points at an
 * issue — opens that task. Realtime + the cached list are owned by the tabs
 * layout (useNotificationsRealtime is mounted once there).
 */
export function NotificationBell({ color = "#ffffff" }: { color?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const { data: notifications = [] } = useNotificationsQuery();
  const unread = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const onPressItem = (n: AppNotification) => {
    if (!n.readAt) markRead.mutate(n.id);
    setOpen(false);
    if (n.issueId) router.push(`/issues/${n.issueId}`);
  };

  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} className="p-1" hitSlop={8}>
        <Ionicons name="notifications-outline" size={24} color={color} />
        {unread > 0 && (
          <View className="absolute -right-0.5 -top-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 items-center justify-center">
            <Text className="text-[10px] font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable className="flex-1 bg-black/40" onPress={() => setOpen(false)}>
          <Pressable
            className="absolute right-3 w-[88%] max-w-[380px] max-h-[70%] bg-white dark:bg-gray-900 rounded-2xl overflow-hidden"
            style={{ top: insets.top + 12 }}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 flex-1">
                Notifications
              </Text>
              {unread > 0 && (
                <TouchableOpacity onPress={() => markAll.mutate()}>
                  <Text className="text-indigo-600 dark:text-indigo-400 text-sm font-medium">
                    Mark all read
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={notifications}
              keyExtractor={(n) => String(n.id)}
              ListEmptyComponent={
                <View className="items-center py-12">
                  <Ionicons
                    name="notifications-off-outline"
                    size={40}
                    color="#D1D5DB"
                  />
                  <Text className="text-gray-500 dark:text-gray-400 mt-2">
                    You are all caught up
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => onPressItem(item)}
                  activeOpacity={0.7}
                  className={`flex-row items-start px-4 py-3 border-b border-gray-50 dark:border-gray-800 ${
                    item.readAt ? "" : "bg-indigo-50/60 dark:bg-indigo-900/20"
                  }`}
                >
                  {!item.readAt && (
                    <View className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 mr-2" />
                  )}
                  <View className="flex-1">
                    <Text
                      className="text-sm text-gray-900 dark:text-gray-100"
                      numberOfLines={2}
                    >
                      {notificationText(item)}
                    </Text>
                    <View className="flex-row items-center mt-1">
                      {!!item.issueKey && (
                        <Text className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mr-2">
                          {item.issueKey}
                        </Text>
                      )}
                      <Text className="text-[11px] text-gray-400">
                        {relativeTime(item.createdAt)}
                      </Text>
                    </View>
                  </View>
                  {!!item.issueId && (
                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                  )}
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
