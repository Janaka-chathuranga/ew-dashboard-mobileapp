import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  // SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../../context/auth-context";
import { SignInInputType, signInSchema } from "../../schemas/auth";

const SignIn = () => {
  const { signIn } = useSession();
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting: loading },
  } = useForm<SignInInputType>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function handleLogin(data: SignInInputType) {
    await signIn(data);
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        // className="flex-1"
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="flex-1 justify-center px-6 pb-12">
              {/* Logo/Header */}
              <View className="items-center mb-12 mt-10">
                <Image
                  source={require("../../../assets/images/logo.png")}
                  style={{ width: 160, height: 96, resizeMode: "contain" }}
                  className="mb-4"
                />
                <Text className="text-3xl font-bold text-gray-800">
                  EWIS Dashboard
                </Text>
                <Text className="text-gray-600 mt-2">
                  Track your team&rsquo;s work
                </Text>
              </View>

              {/* Login Form */}
              <View className="space-y-4">
                <View>
                  <Text className="text-gray-700 mb-2 font-medium">Email</Text>

                  <Controller
                    control={control}
                    name="email"
                    render={({ field, fieldState: { error } }) => (
                      <View className="gap-2">
                        <TextInput
                          className="border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                          placeholder="Enter your email"
                          value={field.value}
                          onChangeText={field.onChange}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          placeholderTextColor="#9CA3AF"
                        />
                        {error && (
                          <Text className="text-red-500">{error.message}</Text>
                        )}
                      </View>
                    )}
                  />
                  {/* <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#9CA3AF"
              /> */}
                </View>

                <View className="mt-4">
                  <Text className="text-gray-700 mb-2 font-medium">
                    Password
                  </Text>
                  <View className="relative">
                    <Controller
                      control={control}
                      name="password"
                      render={({ field, fieldState: { error } }) => (
                        <View className="gap-2">
                          <TextInput
                            className="border border-gray-300 rounded-lg px-4 py-3 pr-12 text-gray-800"
                            placeholder="Enter your password"
                            value={field.value}
                            onChangeText={field.onChange}
                            secureTextEntry={!showPassword}
                            placeholderTextColor="#9CA3AF"
                          />
                          {error && (
                            <Text className="text-red-500">
                              {error.message}
                            </Text>
                          )}
                        </View>
                      )}
                    />
                    <TouchableOpacity
                      className="absolute right-3 top-3"
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off" : "eye"}
                        size={24}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  className={`bg-indigo-600 rounded-lg py-4 items-center mt-6 ${
                    loading ? "opacity-70" : ""
                  }`}
                  onPress={handleSubmit(handleLogin)}
                  disabled={loading}
                >
                  <Text className="text-white font-semibold text-lg">
                    {loading ? "Signing In..." : "Sign In"}
                  </Text>
                </TouchableOpacity>

                <Link href="/(auth)/forgot-password" asChild>
                  <TouchableOpacity className="items-center mt-4">
                    <Text className="text-indigo-600 font-medium">
                      Forgot password?
                    </Text>
                  </TouchableOpacity>
                </Link>

                <View className="flex-row justify-center mt-6">
                  <Text className="text-gray-600">
                    Don&rsquo;t have an account?{" "}
                  </Text>
                  <Link href="/(auth)/signup" asChild>
                    <TouchableOpacity>
                      <Text className="text-indigo-600 font-semibold">
                        Sign Up
                      </Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
export default SignIn;
