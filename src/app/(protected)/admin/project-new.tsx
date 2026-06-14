import { SearchableSelect } from "@/components/searchable-select";
import { useSession } from "@/context/auth-context";
import { useCompanies } from "@/features/org";
import { useCreateProject } from "@/features/projects";
import { useUsers } from "@/features/users/api/users";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function ReadOnlyRow({ label, value }: { label: string; value: string | null }) {
  return (
    <View className="flex-row justify-between py-0.5">
      <Text className="text-xs text-gray-500 dark:text-gray-400">{label}</Text>
      <Text className="text-xs text-gray-800 dark:text-gray-200 font-medium ml-3 flex-1 text-right">
        {value || "—"}
      </Text>
    </View>
  );
}

export default function NewProjectScreen() {
  const router = useRouter();
  const { user } = useSession();
  const canCreate =
    user?.role === "admin" ||
    user?.role === "team-lead" ||
    !!user?.canCreateProjects;

  const create = useCreateProject();
  const { data: companies = [] } = useCompanies();
  const { data: users = [] } = useUsers();

  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [leadUserId, setLeadUserId] = useState("");
  const [companyId, setCompanyId] = useState("");

  const selectedLead = users.find((u) => u.id === leadUserId);

  if (user && !canCreate) {
    return <Redirect href="/(protected)/projects" />;
  }

  const onSubmit = () => {
    const k = key.trim().toUpperCase();
    if (!k) return Alert.alert("Required", "Project key is required (e.g. PROJ).");
    if (!name.trim()) return Alert.alert("Required", "Project name is required.");
    create.mutate(
      {
        key: k,
        name: name.trim(),
        description: description.trim() || null,
        leadUserId: leadUserId || null,
        companyId: companyId || null,
      },
      {
        onSuccess: ({ id }) => {
          Alert.alert("Success", "Project created.");
          router.replace(`/projects/${id}`);
        },
        onError: (e) =>
          Alert.alert(
            "Could not create project",
            e instanceof Error ? e.message : "Unknown error"
          ),
      }
    );
  };

  const Label = ({ text, req }: { text: string; req?: boolean }) => (
    <Text className="text-gray-700 dark:text-gray-300 mb-2 font-medium">
      {text}
      {req && <Text className="text-red-500"> *</Text>}
    </Text>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={["top"]}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="close" size={26} color="#4f46e5" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 ml-2">
          New Project
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-4">
            <Label text="Project Key" req />
            <TextInput
              value={key}
              onChangeText={(t) => setKey(t.toUpperCase())}
              placeholder="e.g. PROJ"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 dark:text-gray-100"
            />
            <Text className="text-xs text-gray-500 mt-1">
              Used to prefix task IDs (PROJ-1, PROJ-2…).
            </Text>
          </View>

          <View className="mb-4">
            <Label text="Name" req />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Project name"
              placeholderTextColor="#9ca3af"
              className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 dark:text-gray-100"
            />
          </View>

          <View className="mb-4">
            <Label text="Description" />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Optional"
              placeholderTextColor="#9ca3af"
              multiline
              className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900 dark:text-gray-100"
              style={{ minHeight: 80, textAlignVertical: "top" }}
            />
          </View>

          <View className="mb-4">
            <Label text="Project Lead" />
            <SearchableSelect
              value={leadUserId}
              onChange={setLeadUserId}
              options={users.map((u) => ({
                label: u.displayName,
                value: u.id,
                description: u.designationName ?? undefined,
              }))}
              placeholder="Search by name or designation"
            />
            {selectedLead && (
              <View className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 mt-2">
                <ReadOnlyRow label="Company" value={selectedLead.companyName} />
                <ReadOnlyRow label="Department" value={selectedLead.departmentName} />
                <ReadOnlyRow label="Designation" value={selectedLead.designationName} />
              </View>
            )}
          </View>

          <View className="mb-4">
            <Label text="Company" />
            <SearchableSelect
              value={companyId}
              onChange={setCompanyId}
              options={companies.map((c) => ({ label: c.name, value: c.id }))}
              placeholder="Select company (optional)"
            />
          </View>

          <TouchableOpacity
            onPress={onSubmit}
            disabled={create.isPending}
            className={`rounded-lg py-4 items-center mt-2 ${
              create.isPending ? "bg-indigo-300" : "bg-indigo-600"
            }`}
          >
            {create.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-lg">
                Create Project
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
