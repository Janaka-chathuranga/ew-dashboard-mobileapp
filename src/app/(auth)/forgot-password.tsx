import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  ActivityIndicator,
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
import { useSession } from "../../context/auth-context";
import {
  ForgotPasswordInputType,
  forgotPasswordSchema,
} from "../../schemas/auth";

export default function ForgotPassword() {
  const { resetPassword } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInputType>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordInputType) => {
    try {
      setIsSubmitting(true);
      await resetPassword(data.email);
      router.back();
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
                  <Ionicons name="lock-closed" size={36} color="white" />
                </View>
                <Text className="text-2xl font-bold text-gray-800">
                  Reset Password
                </Text>
                <Text className="text-gray-600 mt-2 text-center">
                  Enter your email and we&rsquo;ll send you a reset link.
                </Text>
              </View>

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
                    Send Reset Link
                  </Text>
                )}
              </TouchableOpacity>

              <View className="flex-row justify-center mt-6">
                <Link href="/(auth)/signin" asChild>
                  <TouchableOpacity>
                    <Text className="text-indigo-600 font-semibold">
                      Back to Sign In
                    </Text>
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
