import { SearchableSelect } from "@/components/searchable-select";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface ManagerField {
  key: string;
  label: string;
  type: "text" | "textarea" | "picker";
  required?: boolean;
  placeholder?: string;
  /** Options for picker fields. */
  items?: { label: string; value: string }[];
}

interface EntityFormModalProps {
  visible: boolean;
  title: string;
  fields: ManagerField[];
  initialValues: Record<string, string>;
  isSaving: boolean;
  /** When true, the "name" field accepts multiple entries (one per line). */
  bulk?: boolean;
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => void;
}

/**
 * A small config-driven create/edit form rendered in a bottom-sheet-style modal.
 * Used by every org-entity manager (companies, departments, groups, designations)
 * so the screens stay thin and consistent.
 */
export function EntityFormModal({
  visible,
  title,
  fields,
  initialValues,
  isSaving,
  bulk = false,
  onClose,
  onSubmit,
}: EntityFormModalProps) {
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const insets = useSafeAreaInsets();

  // Re-seed the form whenever it opens (create vs edit supplies new defaults).
  useEffect(() => {
    if (visible) setValues(initialValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const set = (key: string, v: string) => setValues((prev) => ({ ...prev, [key]: v }));

  const submit = () => {
    for (const f of fields) {
      if (f.required && !values[f.key]?.trim()) {
        Alert.alert("Required", `${f.label} is required.`);
        return;
      }
    }
    onSubmit(values);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 px-3" style={{ paddingTop: insets.top + 12 }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View className="bg-white dark:bg-gray-900 rounded-2xl max-h-[85%] overflow-hidden">
            <View className="flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1">
                {title}
              </Text>
              <TouchableOpacity onPress={onClose} className="p-1">
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              {fields.map((f) => {
                const isBulkField = bulk && f.key === "name";
                const isMultiline = f.type === "textarea" || isBulkField;
                return (
                  <View key={f.key} className="mb-4">
                    <Text className="text-gray-700 dark:text-gray-300 mb-2 font-medium">
                      {isBulkField ? `${f.label}(s)` : f.label}
                      {f.required && <Text className="text-red-500"> *</Text>}
                    </Text>
                    {f.type === "picker" ? (
                      <SearchableSelect
                        value={values[f.key] ?? ""}
                        onChange={(v) => set(f.key, v)}
                        options={f.items ?? []}
                        placeholder={f.placeholder ?? "Select an option"}
                      />
                    ) : (
                      <TextInput
                        value={values[f.key] ?? ""}
                        onChangeText={(t) => set(f.key, t)}
                        placeholder={isBulkField ? "One per line to add several" : f.placeholder}
                        placeholderTextColor="#9ca3af"
                        multiline={isMultiline}
                        className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 dark:text-gray-100"
                        style={isMultiline ? { minHeight: 80, textAlignVertical: "top" } : undefined}
                      />
                    )}
                    {isBulkField && (
                      <Text className="text-[11px] text-gray-400 mt-1">
                        Tip: enter one name per line to create multiple at once.
                      </Text>
                    )}
                  </View>
                );
              })}

              <TouchableOpacity
                onPress={submit}
                disabled={isSaving}
                className={`rounded-lg py-4 items-center mt-2 ${
                  isSaving ? "bg-indigo-300" : "bg-indigo-600"
                }`}
              >
                {isSaving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold text-lg">Save</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
