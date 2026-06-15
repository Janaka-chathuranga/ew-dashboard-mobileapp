import { fetchCurrentUser, type CurrentUser } from "@/features/auth";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SplashScreen } from "expo-router";
import {
  createContext,
  PropsWithChildren,
  use,
  useEffect,
  useState,
} from "react";
import { Alert, AppState } from "react-native";
import { SignInInputType } from "../schemas/auth";

SplashScreen.preventAutoHideAsync(); // Prevent auto-hiding of the splash screen

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
  companyId?: string | null;
  departmentId?: string | null;
  designationId?: string | null;
}

interface AuthContextType {
  signIn: (credentials: SignInInputType) => Promise<void>;
  signUp: (userData: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  session: Session | null;
  user: CurrentUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  session: null,
  user: null,
  isLoading: false,
  isAuthenticated: false,
});

export function useSession() {
  const value = use(AuthContext);

  if (!value) {
    throw new Error("useSession must be wrapped in a <SessionProvider/>");
  }

  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();

  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  // Derive the session from Supabase Auth: read the persisted session once,
  // then keep it in sync via onAuthStateChange (sign in/out, token refresh).
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setIsSessionLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsSessionLoading(false);
      // The cached profile belongs to the previous identity — refetch it.
      queryClient.invalidateQueries({ queryKey: ["user"] });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  // Keep tokens fresh while the app is foregrounded; pause in the background
  // (Supabase's recommended Expo/AppState pattern).
  useEffect(() => {
    if (AppState.currentState === "active") {
      supabase.auth.startAutoRefresh();
    }
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });
    return () => sub.remove();
  }, []);

  // The caller's profiles row (role, org ids, permission flags). RLS-scoped.
  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ["user"],
    queryFn: fetchCurrentUser,
    enabled: !!session,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const signIn = async (credentials: SignInInputType) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });
    if (error) {
      Alert.alert("Sign in failed", error.message);
      return;
    }
    // onAuthStateChange sets the session; the (auth) layout redirects to "/".
  };

  const signUp = async ({
    email,
    password,
    displayName,
    companyId,
    departmentId,
    designationId,
  }: SignUpInput) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      // The handle_new_user trigger reads these from raw_user_meta_data and
      // seeds the profiles row (role defaults to 'member').
      options: {
        data: {
          display_name: displayName,
          company_id: companyId || null,
          department_id: departmentId || null,
          designation_id: designationId || null,
        },
      },
    });
    if (error) {
      Alert.alert("Sign up failed", error.message);
      return;
    }
    Alert.alert(
      "Account created",
      "If email confirmation is enabled, check your inbox to verify your address, then sign in."
    );
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("Sign out failed", error.message);
      return;
    }
    queryClient.clear();
    // onAuthStateChange clears the session; the (protected) layout redirects.
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      Alert.alert("Could not send reset email", error.message);
      return;
    }
    Alert.alert(
      "Check your email",
      "If an account exists for that address, a password reset link is on its way."
    );
  };

  const isAuthenticated = !!session && !!user;

  const isLoading = isSessionLoading || (!!session && isUserLoading);

  // Hide the splash screen once we know the auth state.
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return (
    <AuthContext.Provider
      value={{
        signIn,
        signUp,
        signOut,
        resetPassword,
        session,
        user: user ?? null,
        isLoading,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
