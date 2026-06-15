import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EntityFormModal, type ManagerField } from "./entity-form-modal";

interface OrgManagerScreenProps<T extends { id: string }> {
  title: string;
  /** Full entity rows used both for display and for seeding the edit form. */
  rows: T[];
  getName: (row: T) => string;
  getSubtitle?: (row: T) => string | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
  isRefetching: boolean;
  fields: ManagerField[];
  /** Map a row (or null for "create") to the modal's initial field values. */
  toFormValues: (row: T | null) => Record<string, string>;
  onCreate: (values: Record<string, string>, done: () => void) => void;
  onUpdate: (id: string, values: Record<string, string>, done: () => void) => void;
  onDelete: (row: T, done: () => void) => void;
  isSaving: boolean;
  /** When false the list is read-only (no add / edit / delete affordances). */
  canWrite: boolean;
  /** Whether this actor may delete a mapped (in-use) item (admin / permitted head). */
  canDeleteMapped?: boolean;
  /** Returns true if the row is referenced by other records. */
  checkInUse?: (row: T) => Promise<boolean>;
  emptyLabel?: string;
}

export function OrgManagerScreen<T extends { id: string }>({
  title,
  rows,
  getName,
  getSubtitle,
  isLoading,
  isError,
  error,
  refetch,
  isRefetching,
  fields,
  toFormValues,
  onCreate,
  onUpdate,
  onDelete,
  isSaving,
  canWrite,
  canDeleteMapped = false,
  checkInUse,
  emptyLabel = "Nothing here yet.",
}: OrgManagerScreenProps<T>) {
  const singular = title.replace(/s$/, "");
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (row: T) => {
    setEditing(row);
    setModalOpen(true);
  };
  const close = () => setModalOpen(false);

  const handleSubmit = (values: Record<string, string>) => {
    const wasEditing = !!editing;
    const done = () => {
      close();
      Alert.alert("Success", `${singular} ${wasEditing ? "updated" : "created"}.`);
    };
    if (editing) onUpdate(editing.id, values, done);
    else onCreate(values, done);
  };

  const doDelete = (row: T) => {
    onDelete(row, () => Alert.alert("Deleted", `${singular} deleted.`));
  };

  const confirmDelete = async (row: T) => {
    let inUse = false;
    if (checkInUse) {
      try {
        inUse = await checkInUse(row);
      } catch {
        inUse = false;
      }
    }
    if (inUse && !canDeleteMapped) {
      Alert.alert(
        "Can't delete",
        `${getName(row)} is in use by other records, so it can't be deleted.`
      );
      return;
    }
    Alert.alert(
      `Delete ${getName(row)}?`,
      inUse
        ? "This item is in use. Deleting it will also remove the records linked to it. Continue?"
        : "This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => doDelete(row) },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={["top"]}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#4f46e5" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 ml-2">
          {title}
        </Text>
        <View className="flex-1" />
        {canWrite && (
          <TouchableOpacity
            onPress={openCreate}
            className="flex-row items-center bg-indigo-600 px-3 py-1.5 rounded-lg"
          >
            <Ionicons name="add" size={18} color="white" />
            <Text className="text-white font-medium ml-1">Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-5">
          <Ionicons name="cloud-offline-outline" size={48} color="#9CA3AF" />
          <Text className="text-gray-600 dark:text-gray-300 mt-3 text-center">
            {error instanceof Error ? error.message : "Failed to load."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          ListEmptyComponent={
            <Text className="text-center text-gray-500 dark:text-gray-400 mt-10">
              {emptyLabel}
            </Text>
          }
          renderItem={({ item }) => {
            const subtitle = getSubtitle?.(item);
            return (
              <TouchableOpacity
                disabled={!canWrite}
                onPress={() => openEdit(item)}
                activeOpacity={0.7}
                className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl p-3.5 mb-2.5 border border-gray-100 dark:border-gray-700"
              >
                <View className="flex-1">
                  <Text className="text-gray-900 dark:text-gray-100 font-medium">
                    {getName(item)}
                  </Text>
                  {!!subtitle && (
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {subtitle}
                    </Text>
                  )}
                </View>
                {canWrite && (
                  <TouchableOpacity
                    onPress={() => confirmDelete(item)}
                    className="p-2 ml-2"
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      <EntityFormModal
        visible={modalOpen}
        title={`${editing ? "Edit" : "New"} ${singular}`}
        fields={fields}
        initialValues={toFormValues(editing)}
        isSaving={isSaving}
        bulk={!editing}
        onClose={close}
        onSubmit={handleSubmit}
      />
    </SafeAreaView>
  );
}
