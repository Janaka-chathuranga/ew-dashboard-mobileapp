import { Ionicons } from "@expo/vector-icons";
import {
  type Control,
  Controller,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

interface FormMultiSelectProps<T extends FieldValues> {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  error?: string;
  items: { label: string; value: string }[];
  placeholder?: string;
  enabled?: boolean;
  allowMultiple?: boolean;
  required?: boolean;
}

export function FormMultiSelect<T extends FieldValues>({
  name,
  control,
  label,
  error,
  items,
  placeholder = "Select options",
  enabled = true,
  allowMultiple = true,
  required = false,
}: FormMultiSelectProps<T>) {
  return (
    <View className="mb-4">
      <Text className="text-gray-700 mb-2 font-medium">
        {label}
        {required && <Text className="text-red-500">*</Text>}
      </Text>
      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, value } }) => {
          const selectedValues = Array.isArray(value)
            ? (value as string[])
            : [];

          const toggleSelection = (itemValue: string) => {
            if (!enabled) return;

            if (allowMultiple) {
              const newSelection = selectedValues.includes(itemValue)
                ? selectedValues.filter((v) => v !== itemValue)
                : [...selectedValues, itemValue];
              onChange(newSelection);
            } else {
              onChange(selectedValues.includes(itemValue) ? [] : [itemValue]);
            }
          };

          return (
            <View
              className={`border rounded-lg ${
                error ? "border-red-500" : "border-gray-300"
              } ${!enabled ? "opacity-50" : ""}`}
            >
              {items.length === 0 ? (
                <View className="p-4">
                  <Text className="text-gray-500 text-center">
                    {placeholder}
                  </Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                  {items.map((item) => {
                    const isSelected = selectedValues.includes(item.value);
                    return (
                      <TouchableOpacity
                        key={item.value}
                        className={`p-4 border-b border-gray-100 flex-row items-center justify-between ${
                          isSelected ? "bg-green-50" : "bg-white"
                        }`}
                        onPress={() => toggleSelection(item.value)}
                        disabled={!enabled}
                      >
                        <Text
                          className={`flex-1 ${
                            isSelected
                              ? "text-green-700 font-medium"
                              : "text-gray-800"
                          }`}
                        >
                          {item.label}
                        </Text>
                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color="#10B981"
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
              {selectedValues.length > 0 && (
                <View className="p-2 bg-gray-50 border-t border-gray-200">
                  <Text className="text-sm text-gray-600">
                    {selectedValues.length} division
                    {selectedValues.length > 1 ? "s" : ""} selected
                  </Text>
                </View>
              )}
            </View>
          );
        }}
      />
      {error && <Text className="text-red-500 text-sm mt-1">{error}</Text>}
    </View>
  );
}
