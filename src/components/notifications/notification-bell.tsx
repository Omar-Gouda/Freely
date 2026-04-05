"use client";

import { Bell } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";

type Notification = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

const browserAlertStorageKey = "freely:browser-alerts-enabled";
const seenNotificationStorageKey = "freely:seen-notification-ids";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [browserAlertsEnabled, setBrowserAlertsEnabled] = useState(false);
  const initialLoadRef = useRef(true);
  const unreadCount = useMemo(() => notifications.filter((item) => !item.isRead).length, [notifications]);

  useEffect(() => {
    const enabled = window.localStorage.getItem(browserAlertStorageKey) === "true";
    setBrowserAlertsEnabled(enabled && Notification.permission === "granted");
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        const nextNotifications = (payload.data ?? []) as Notification[];

        if (!cancelled) {
          setNotifications(nextNotifications);
        }

        if (!browserAlertsEnabled || Notification.permission !== "granted") {
          initialLoadRef.current = false;
          return;
        }

        const seenIds = new Set(JSON.parse(window.localStorage.getItem(seenNotificationStorageKey) ?? "[]") as string[]);
        const nextIds = nextNotifications.map((item) => item.id);

        if (!initialLoadRef.current) {
          nextNotifications
            .filter((item) => !item.isRead && !seenIds.has(item.id))
            .forEach((item) => {
              const notification = new Notification(item.title, {
                body: item.message,
                tag: item.id
              });
              notification.onclick = () => window.focus();
              seenIds.add(item.id);
            });
        }

        window.localStorage.setItem(seenNotificationStorageKey, JSON.stringify(Array.from(new Set([...Array.from(seenIds), ...nextIds])).slice(0, 100)));
        initialLoadRef.current = false;
      } catch {
        if (!cancelled) {
          setNotifications((current) => current);
        }
      }
    }

    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [browserAlertsEnabled]);

  async function enableBrowserAlerts() {
    if (!("Notification" in window)) {
      return;
    }

    const permission = await Notification.requestPermission();
    const enabled = permission === "granted";
    setBrowserAlertsEnabled(enabled);
    window.localStorage.setItem(browserAlertStorageKey, enabled ? "true" : "false");
  }

  async function markAsRead(notificationId?: string, markAll = false) {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(markAll ? { markAll: true } : { notificationId })
      });

      if (!response.ok) {
        return;
      }

      setNotifications((current) => current.map((item) => (markAll || item.id === notificationId ? { ...item, isRead: true } : item)));
    } catch {
      return;
    }
  }

  return (
    <details className="notification-bell">
      <summary className="icon-button" aria-label="Notifications">
        <Bell size={18} />
        {unreadCount ? <Badge>{unreadCount}</Badge> : null}
      </summary>
      <div className="notification-panel">
        <div className="notification-panel-header-row">
          <div className="notification-panel-header">Recent alerts</div>
          {unreadCount ? <button type="button" className="link-button" onClick={() => void markAsRead(undefined, true)}>Mark all read</button> : null}
        </div>
        <div className="notification-panel-header-row">
          <small>{browserAlertsEnabled ? "Browser alerts are enabled on this device." : "Enable browser alerts to see notification popups on this device while Freely is open."}</small>
          {!browserAlertsEnabled ? <button type="button" className="link-button" onClick={() => void enableBrowserAlerts()}>Enable</button> : null}
        </div>
        {notifications.length ? (
          notifications.map((item) => (
            <div className={`notification-item${item.isRead ? "" : " unread"}`} key={item.id}>
              <strong>{item.title}</strong>
              <p>{item.message}</p>
              <div className="notification-item-meta">
                <small>{new Date(item.createdAt).toLocaleString()}</small>
                {!item.isRead ? <button type="button" className="link-button" onClick={() => void markAsRead(item.id)}>Mark read</button> : <small>Read</small>}
              </div>
            </div>
          ))
        ) : (
          <p className="muted">No alerts yet.</p>
        )}
      </div>
    </details>
  );
}
