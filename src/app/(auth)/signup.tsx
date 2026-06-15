import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Link, router } from "expo-router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FormField } from "../../components/form-field";
import { FormPicker } from "../../components/form-picker";
import { useSession } from "../../context/auth-context";
import {
  fetchCompanies,
  fetchDepartments,
  fetchDesignations,
} from "../../features/org";
import { SignUpInputType, signUpSchema } from "../../schemas/auth";

export default function SignUp() {
  const { signUp } = useSession();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SignUpInputType>({
    resolver: zodResolver(signUpSchema),
    mode: "onChange",
    defaultValues: {
      display_name: "",
      email: "",
      password: "",
      confirm_password: "",
      company_id: "",
      department_id: "",
      designation_id: "",
    },
  });

  const companyId = watch("company_id");

  // Companies/departments/designations are anon-readable (RLS policies for the
  // registration form), so these load before sign-in.
  const { data: companies = [] } = useQuery({
    queryKey: ["signup-companies"],
    queryFn: fetchCompanies,
    staleTime: 5 * 60 * 1000,
  });
  const { data: departments = [] } = useQuery({
    queryKey: ["signup-departments", companyId ?? "all"],
    queryFn: () => fetchDepartments(companyId || undefined),
    staleTime: 5 * 60 * 1000,
  });
  const { data: designations = [] } = useQuery({
    queryKey: ["signup-designations"],
    queryFn: fetchDesignations,
    staleTime: 5 * 60 * 1000,
  });

  // Reset department when the company changes.
  useEffect(() => {
    setValue("department_id", "");
  }, [companyId, setValue]);

  const onSubmit = async (data: SignUpInputType) => {
    await signUp({
      email: data.email,
      password: data.password,
      displayName: data.display_name,
      companyId: data.company_id || null,
      departmentId: data.department_id || null,
      designationId: data.designation_id || null,
    });
    reset();
    router.push("/(auth)/signin");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="flex-1 justify-center px-6 py-8">
              {/* Header */}
              <View className="items-center mb-8 mt-4">
                <Image
                  source={require("../../../assets/images/logo.png")}
                  style={{ width: 120, height: 72, resizeMode: "contain" }}
                />
                <Text className="text-2xl font-bold text-gray-800 mt-3">
                  Create Account
                </Text>
                <Text className="text-gray-600 mt-1">Join the EWIS Dashboard</Text>
              </View>

              <FormField
                name="display_name"
                control={control}
                label="Full Name"
                placeholder="Your name"
                autoComplete="name"
                error={errors.display_name?.message}
                required
              />
              <FormField
                name="email"
                control={control}
                label="Email"
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={errors.email?.message}
                required
              />
              <FormField
                name="password"
                control={control}
                label="Password"
                placeholder="Enter your password"
                secureTextEntry
                autoComplete="new-password"
                error={errors.password?.message}
                required
              />
              <FormField
                name="confirm_password"
                control={control}
                label="Confirm Password"
                placeholder="Confirm your password"
                secureTextEntry
                autoComplete="new-password"
                error={errors.confirm_password?.message}
                required
              />

              <FormPicker
                name="company_id"
                control={control}
                label="Company"
                placeholder="Select company"
                items={companies.map((c) => ({ label: c.name, value: c.id }))}
                required={false}
              />
              <FormPicker
                name="department_id"
                control={control}
                label="Department"
                placeholder="Select department"
                items={departments.map((d) => ({ label: d.name, value: d.id }))}
                enabled={!!companyId}
                required={false}
              />
              <FormPicker
                name="designation_id"
                control={control}
                label="Designation"
                placeholder="Select designation"
                items={designations.map((d) => ({ label: d.name, value: d.id }))}
                required={false}
              />

              <TouchableOpacity
                className={`rounded-lg py-4 items-center mt-2 ${
                  isSubmitting ? "bg-indigo-300" : "bg-indigo-600"
                }`}
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting}
                accessibilityLabel="Create account"
              >
                {isSubmitting ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator size="small" color="white" />
                    <Text className="text-white font-semibold text-lg ml-2">
                      Creating Account...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-white font-semibold text-lg">
                    Create Account
                  </Text>
                )}
              </TouchableOpacity>

              <View className="flex-row justify-center mt-6">
                <Text className="text-gray-600">Already have an account? </Text>
                <Link href="/(auth)/signin" asChild>
                  <TouchableOpacity>
                    <Text className="text-indigo-600 font-semibold">Sign In</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
