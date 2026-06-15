import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface SelectOption {
  label: string;
  value: string;
  /** Optional secondary line (also included in the search). */
  description?: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  enabled?: boolean;
  error?: boolean;
  allowClear?: boolean;
}

/**
 * A reliable, always-searchable single-select. Renders a tappable field that
 * opens a full-screen modal with a search box + list. Replaces
 * react-native-element-dropdown, whose overlay misbehaved inside modals/scroll
 * views (selections silently not registering).
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  enabled = true,
  error = false,
  allowClear = true,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const insets = useSafeAreaInsets();

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.description ?? "").toLowerCase().includes(q)
    );
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <TouchableOpacity
        disabled={!enabled}
        activeOpacity={0.7}
        onPress={() => setOpen(true)}
        className={`flex-row items-center border rounded-lg px-3 ${
          error ? "border-red-500" : "border-gray-300 dark:border-gray-600"
        } ${enabled ? "" : "opacity-50"}`}
        style={{ height: 50 }}
      >
        <Text
          className={`flex-1 ${
            selected
              ? "text-gray-900 dark:text-gray-100"
              : "text-gray-400 dark:text-gray-500"
          }`}
          numberOfLines={1}
        >
          {selected?.label ?? placeholder}
        </Text>
        {allowClear && selected && enabled ? (
          <TouchableOpacity onPress={() => onChange("")} hitSlop={8} className="pr-1">
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        ) : (
          <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
        )}
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        {/* Anchored near the top so the on-screen keyboard (which opens for the
            search box) never covers the options list. */}
        <Pressable
          className="flex-1 bg-black/40 px-3"
          style={{ paddingTop: insets.top + 12 }}
          onPress={close}
        >
          <Pressable
            className="bg-white dark:bg-gray-900 rounded-2xl max-h-[75%] overflow-hidden"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-center px-4 pt-4 pb-2">
              <View className="flex-1 flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-lg px-3">
                <Ionicons name="search" size={18} color="#9CA3AF" />
                <TextInput
                  autoFocus
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search…"
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 py-2.5 px-2 text-gray-900 dark:text-gray-100"
                />
              </View>
              <TouchableOpacity onPress={close} className="pl-3">
                <Text className="text-indigo-600 dark:text-indigo-400 font-medium">
                  Done
                </Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(o) => o.value}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No matches
                </Text>
              }
              renderItem={({ item }) => {
                const active = item.value === value;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      onChange(item.value);
                      close();
                    }}
                    className={`flex-row items-center px-4 py-3.5 border-b border-gray-50 dark:border-gray-800 ${
                      active ? "bg-indigo-50 dark:bg-indigo-900/20" : ""
                    }`}
                  >
                    <View className="flex-1">
                      <Text
                        className={`${
                          active
                            ? "text-indigo-700 dark:text-indigo-300 font-medium"
                            : "text-gray-900 dark:text-gray-100"
                        }`}
                      >
                        {item.label}
                      </Text>
                      {!!item.description && (
                        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {item.description}
                        </Text>
                      )}
                    </View>
                    {active && (
                      <Ionicons name="checkmark" size={20} color="#4f46e5" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
