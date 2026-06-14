import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
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
import { z } from "zod";
import { FormField } from "../../components/form-field";
import { supabase } from "../../lib/supabase";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be less than 128 characters"),
    confirm_password: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Only usable once the email recovery link has established a session
  // (Supabase fires a PASSWORD_RECOVERY auth event when the deep link opens).
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(
    null
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirm_password: "" },
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasRecoverySession(!!data.session);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setHasRecoverySession(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const onSubmit = async (data: ResetPasswordInput) => {
    try {
      setIsSubmitting(true);
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });
      if (error) {
        Alert.alert("Could not update password", error.message);
        return;
      }
      Alert.alert("Password updated", "You can now use your new password.");
      router.replace("/(auth)/signin");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="flex-1 justify-center px-6 pb-12">
              <View className="items-center mb-10 mt-10">
                <View className="w-20 h-20 bg-indigo-600 rounded-full items-center justify-center mb-4">
                  <Ionicons name="key" size={36} color="white" />
                </View>
                <Text className="text-2xl font-bold text-gray-800">
                  New Password
                </Text>
              </View>

              {hasRecoverySession === false ? (
                <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <Text className="text-yellow-800">
                    Open the password reset link from your email to set a new
                    password.
                  </Text>
                  <TouchableOpacity
                    className="mt-4"
                    onPress={() => router.replace("/(auth)/signin")}
                  >
                    <Text className="text-indigo-600 font-semibold">
                      Back to Sign In
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <FormField
                    name="password"
                    control={control}
                    label="New Password"
                    placeholder="Enter a new password"
                    secureTextEntry
                    autoComplete="new-password"
                    error={errors.password?.message}
                    required
                  />
                  <FormField
                    name="confirm_password"
                    control={control}
                    label="Confirm Password"
                    placeholder="Confirm your new password"
                    secureTextEntry
                    autoComplete="new-password"
                    error={errors.confirm_password?.message}
                    required
                  />
                  <TouchableOpacity
                    className={`rounded-lg py-4 items-center mt-6 ${
                      isSubmitting ? "bg-indigo-300" : "bg-indigo-600"
                    }`}
                    onPress={handleSubmit(onSubmit)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text className="text-white font-semibold text-lg">
                        Update Password
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
