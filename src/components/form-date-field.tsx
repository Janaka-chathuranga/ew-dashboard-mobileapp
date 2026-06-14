import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  type Control,
  Controller,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { Calendar } from "react-native-calendars";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface FormDateFieldProps<T extends FieldValues> {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  error?: string;
  placeholder?: string;
}

/** A date input backed by a calendar modal; stores a YYYY-MM-DD string. */
export function FormDateField<T extends FieldValues>({
  name,
  control,
  label,
  error,
  placeholder = "Select date",
}: FormDateFieldProps<T>) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <View className="mb-4">
      <Text className="text-gray-700 mb-2 font-medium">{label}</Text>
      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, value } }) => (
          <>
            <TouchableOpacity
              onPress={() => setOpen(true)}
              className={`flex-row items-center border rounded-lg px-3 ${
                error ? "border-red-500" : "border-gray-300 dark:border-gray-600"
              }`}
              style={{ height: 50 }}
            >
              <Ionicons name="calendar-outline" size={18} color="#4f46e5" />
              <Text
                className={`flex-1 ml-2 ${
                  value
                    ? "text-gray-900 dark:text-gray-100"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {value || placeholder}
              </Text>
              {value ? (
                <TouchableOpacity onPress={() => onChange("")} hitSlop={8}>
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
              onRequestClose={() => setOpen(false)}
            >
              <Pressable
                className="flex-1 bg-black/40 px-3"
                style={{ paddingTop: insets.top + 12 }}
                onPress={() => setOpen(false)}
              >
                <Pressable
                  className="bg-white dark:bg-gray-900 rounded-2xl p-3"
                  onPress={(e) => e.stopPropagation()}
                >
                  <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2 px-1">
                    {label}
                  </Text>
                  <Calendar
                    current={value || undefined}
                    markedDates={
                      value
                        ? { [value]: { selected: true, selectedColor: "#4f46e5" } }
                        : {}
                    }
                    onDayPress={(d) => {
                      onChange(d.dateString);
                      setOpen(false);
                    }}
                    theme={{ todayTextColor: "#4f46e5", arrowColor: "#4f46e5" }}
                  />
                </Pressable>
              </Pressable>
            </Modal>
          </>
        )}
      />
      {error && <Text className="text-red-500 text-sm mt-1">{error}</Text>}
    </View>
  );
}
