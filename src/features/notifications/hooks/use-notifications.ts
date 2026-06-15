import { useSession } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import {
  fetchNotifications,
  mapNotification,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "../api/notifications";

const KEY = ["notifications"];

/** The current user's recent notifications (RLS-scoped to the recipient). */
export function useNotificationsQuery() {
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: KEY,
    queryFn: () => fetchNotifications(20),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useUnreadCount() {
  const { data } = useNotificationsQuery();
  return (data ?? []).filter((n) => !n.readAt).length;
}

/**
 * Subscribe to Supabase Realtime so newly-inserted notifications arrive live
 * and update the cached list (and therefore the badge). Call this ONCE high in
 * the tree (the tabs layout). A ref guards against StrictMode double-subscribe.
 */
export function useNotificationsRealtime() {
  const { user } = useSession();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!userId || subscribedRef.current) return;
    subscribedRef.current = true;

    // No client-side `recipient_id=eq.` filter: Realtime applies the table's RLS
    // SELECT policy per subscriber, so a user only ever receives change events
    // for their own notification rows (Hard Rule #3 — RLS is the boundary). The
    // explicit postgres_changes filter was found to silently drop INSERT events
    // against this project; RLS scoping is both correct and reliable.
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const n = mapNotification(payload.new);
          queryClient.setQueryData<AppNotification[]>(KEY, (prev) => {
            const list = prev ?? [];
            if (list.some((x) => x.id === n.id)) return list;
            return [n, ...list];
          });
        }
      )
      .subscribe();

    return () => {
      subscribedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onMutate: (id) => {
      queryClient.setQueryData<AppNotification[]>(KEY, (prev) =>
        (prev ?? []).map((n) =>
          n.id === id && !n.readAt
            ? { ...n, readAt: new Date().toISOString() }
            : n
        )
      );
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onMutate: () => {
      const now = new Date().toISOString();
      queryClient.setQueryData<AppNotification[]>(KEY, (prev) =>
        (prev ?? []).map((n) => (n.readAt ? n : { ...n, readAt: now }))
      );
    },
  });
}
