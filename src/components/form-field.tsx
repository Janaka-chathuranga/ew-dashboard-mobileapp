import {
  type Control,
  Controller,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Text, TextInput, type TextInputProps, View } from "react-native";

interface FormFieldProps<T extends FieldValues>
  extends Omit<TextInputProps, "value" | "onChangeText"> {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  error?: string;
  required?: boolean;
}

export function FormField<T extends FieldValues>({
  name,
  control,
  label,
  error,
  required = false,
  editable = true,
  ...textInputProps
}: FormFieldProps<T>) {
  return (
    <View className="mb-4">
      <Text className="text-gray-700 mb-2 font-medium">
        {label}
        {required && <Text className="text-red-500 ml-1">*</Text>}
      </Text>
      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            className={`border rounded-lg px-4 py-3 text-gray-800 ${
              // !textInputProps.editable
              !editable
                ? "border-gray-200 bg-gray-100 text-gray-500"
                : error
                ? "border-red-500 bg-red-50"
                : "border-gray-300 bg-white"
            }`}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value || ""}
            placeholderTextColor="#9CA3AF"
            editable={editable}
            {...textInputProps}
          />
        )}
      />
      {error && (
        <View className="flex-row items-center mt-1">
          <Text className="text-red-500 text-sm">{error}</Text>
        </View>
      )}
    </View>
  );
}
