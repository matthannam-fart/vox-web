import { useCallback, useEffect, useRef } from "react";

export const useNotifications = () => {
  const permissionRef = useRef<NotificationPermission>("default");

  useEffect(() => {
    if ("Notification" in window) {
      permissionRef.current = Notification.permission;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    const result = await Notification.requestPermission();
    permissionRef.current = result;
    return result === "granted";
  }, []);

  const notify = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!("Notification" in window)) return;
      if (Notification.permission !== "granted") return;
      // Only notify when tab is not focused
      if (document.hasFocus()) return;
      return new Notification(title, {
        icon: "/icons/icon-192.png",
        ...options,
      });
    },
    [],
  );

  return { requestPermission, notify };
};
