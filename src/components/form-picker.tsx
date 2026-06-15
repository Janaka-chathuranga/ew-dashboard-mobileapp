import {
  type Control,
  Controller,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Text, View } from "react-native";
import { SearchableSelect } from "./searchable-select";

interface FormPickerProps<T extends FieldValues> {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  error?: string;
  items: { label: string; value: string; description?: string }[];
  placeholder?: string;
  enabled?: boolean;
  required: boolean;
}

export function FormPicker<T extends FieldValues>({
  name,
  control,
  label,
  error,
  items,
  placeholder = "Select an option",
  enabled = true,
  required = false,
}: FormPickerProps<T>) {
  return (
    <View className="mb-4">
      <Text className="text-gray-700 mb-2 font-medium">
        {label}
        {required && <Text className="text-red-500">*</Text>}
      </Text>
      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, value } }) => (
          <SearchableSelect
            value={value ?? ""}
            onChange={onChange}
            options={items}
            placeholder={placeholder}
            enabled={enabled}
            error={!!error}
          />
        )}
      />
      {error && <Text className="text-red-500 text-sm mt-1">{error}</Text>}
    </View>
  );
}
