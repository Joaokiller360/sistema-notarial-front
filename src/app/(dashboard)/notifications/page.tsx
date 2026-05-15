"use client";

import { useState } from "react";
import { Send, History, Inbox, ClipboardList, ClipboardCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import {
  SendNotificationForm,
  NotificationHistory,
  NotificationInbox,
  TaskAssignForm,
  MyTasksList,
} from "@/components/notifications";
import { useNotifications } from "@/hooks";
import { usePermissions } from "@/hooks";
import { cn } from "@/lib/utils";

type SenderTab = "send" | "history" | "inbox" | "assign-task" | "my-tasks";
type UserTab   = "inbox" | "my-tasks";

export default function NotificationsPage() {
  const { unreadCount, pendingTaskCount } = useNotifications();
  const { isSuperAdmin, isNotario } = usePermissions();

  const isSender = isSuperAdmin() || isNotario();

  const [senderTab, setSenderTab] = useState<SenderTab>("send");
  const [userTab,   setUserTab]   = useState<UserTab>("inbox");

  /* ── Tabs config ─────────────────────────────────────── */

  const SENDER_TABS: { id: SenderTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: "send",        label: "Enviar",            icon: Send          },
    { id: "history",     label: "Historial enviados", icon: History       },
    { id: "inbox",       label: "Mi bandeja",         icon: Inbox,        badge: unreadCount    },
    { id: "assign-task", label: "Asignar tarea",      icon: ClipboardList },
    { id: "my-tasks",    label: "Tareas",             icon: ClipboardCheck, badge: pendingTaskCount },
  ];

  const USER_TABS: { id: UserTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: "inbox",    label: "Mi bandeja", icon: Inbox,         badge: unreadCount     },
    { id: "my-tasks", label: "Mis tareas", icon: ClipboardCheck, badge: pendingTaskCount },
  ];

  /* ── Render ─────────────────────────────────────────── */

  const renderTabBar = <T extends string>(
    tabs: { id: T; label: string; icon: React.ElementType; badge?: number }[],
    active: T,
    onChange: (id: T) => void
  ) => (
    <div className="flex border-b border-border overflow-x-auto scrollbar-none">
      {tabs.map(({ id, label, icon: Icon, badge }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={cn(
              "relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap",
              "border-b-2 -mb-px shrink-0",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
            {badge !== undefined && badge > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notificaciones y Tareas"
        description="Centro de gestión de notificaciones y asignación de tareas"
      />

      {isSender ? (
        <div className="space-y-4">
          {renderTabBar(SENDER_TABS, senderTab, setSenderTab)}

          {senderTab === "send"        && <SendNotificationForm />}
          {senderTab === "history"     && <NotificationHistory />}
          {senderTab === "inbox"       && <NotificationInbox />}
          {senderTab === "assign-task" && <TaskAssignForm />}
          {senderTab === "my-tasks"    && <MyTasksList />}
        </div>
      ) : (
        <div className="space-y-4">
          {renderTabBar(USER_TABS, userTab, setUserTab)}

          {userTab === "inbox"    && <NotificationInbox />}
          {userTab === "my-tasks" && <MyTasksList />}
        </div>
      )}
    </div>
  );
}
