"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationsRead,
} from "../lib/api";
import { LuminaIcon } from "./lumina-icon";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  success: "check_circle",
  info: "info",
  warning: "warning",
  review_reminder: "fact_check",
  error: "error",
};

const TYPE_COLORS: Record<string, string> = {
  success: "text-teal bg-teal/10",
  info: "text-primary bg-primary/10",
  warning: "text-saffron bg-saffron/10",
  review_reminder: "text-ink bg-ink/10",
  error: "text-error bg-error/10",
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} 小时前`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} 天前`;
}

export function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  async function loadNotifications() {
    setLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data.items);
      setUnreadCount(data.unreadCount);
    } catch {
      // Ignore errors silently
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  async function handleMarkRead(id: string) {
    try {
      await markNotificationsRead([id]);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Ignore
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Ignore
    }
  }

  return (
    <div className="relative">
      <button
        aria-label="通知"
        className="relative flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant opacity-70 transition hover:bg-surface-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <LuminaIcon name="notifications" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-outline-variant/25 bg-surface shadow-xl sm:w-96">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-outline-variant/25 px-4 py-3">
              <h3 className="text-sm font-bold text-ink">通知</h3>
              {unreadCount > 0 && (
                <button
                  className="text-xs font-medium text-primary hover:text-primary/80"
                  onClick={handleMarkAllRead}
                  type="button"
                >
                  全部已读
                </button>
              )}
            </div>

            {/* Content */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <LuminaIcon className="text-[40px] text-on-surface-variant/40" name="notifications_none" />
                  <p className="mt-3 text-sm text-on-surface-variant">暂无通知</p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const icon = TYPE_ICONS[notification.type] ?? "info";
                  const color = TYPE_COLORS[notification.type] ?? TYPE_COLORS.info;
                  const content = (
                    <div
                      className={`flex gap-3 px-4 py-3 transition hover:bg-surface-container/50 ${
                        !notification.isRead ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color}`}>
                        <LuminaIcon className="text-[18px]" name={icon} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${!notification.isRead ? "font-semibold text-ink" : "text-on-surface"}`}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-on-surface-variant line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-[11px] text-on-surface-variant/60">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  );

                  if (notification.link) {
                    return (
                      <Link
                        key={notification.id}
                        href={notification.link}
                        onClick={() => {
                          if (!notification.isRead) handleMarkRead(notification.id);
                          setIsOpen(false);
                        }}
                      >
                        {content}
                      </Link>
                    );
                  }
                  return (
                    <div
                      key={notification.id}
                      onClick={() => {
                        if (!notification.isRead) handleMarkRead(notification.id);
                      }}
                    >
                      {content}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
