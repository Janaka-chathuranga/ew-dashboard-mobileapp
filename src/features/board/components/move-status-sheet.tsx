import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface MoveOption {
  value: string;
  label: string;
}

/** Bottom-sheet list of statuses/categories to move an issue into. */
export function MoveStatusSheet({
  visible,
  title,
  options,
  currentValue,
  onSelect,
  onClose,
  isMoving,
}: {
  visible: boolean;
  title: string;
  options: MoveOption[];
  currentValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  isMoving?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable
          className="bg-white dark:bg-gray-800 rounded-t-2xl p-4"
          style={{ paddingBottom: insets.bottom + 16 }}
          onPress={(e) => e.stopPropagation()}
        >
          <View className="items-center mb-2">
            <View className="h-1 w-10 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </View>
          <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {title}
          </Text>

          {isMoving ? (
            <View className="py-6 items-center">
              <ActivityIndicator color="#4f46e5" />
            </View>
          ) : (
            options.map((opt) => {
              const active = opt.value === currentValue;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => onSelect(opt.value)}
                  className="flex-row items-center py-3.5 px-2 rounded-lg active:bg-gray-100 dark:active:bg-gray-700"
                >
                  <Ionicons
                    name={active ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={active ? "#4f46e5" : "#9CA3AF"}
                  />
                  <Text
                    className={`ml-3 text-base ${
                      active
                        ? "text-indigo-600 dark:text-indigo-300 font-medium"
                        : "text-gray-800 dark:text-gray-100"
                    }`}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
