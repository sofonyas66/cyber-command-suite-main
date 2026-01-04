import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Bell, Check, ShieldAlert, AlertTriangle, Server, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface NotificationsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const notifications = [
  {
    id: "1",
    type: "vulnerability",
    title: "Critical vulnerability detected",
    message: "CVE-2024-1234 found on 3 production servers",
    time: new Date(Date.now() - 1000 * 60 * 30),
    read: false,
  },
  {
    id: "2",
    type: "incident",
    title: "New incident created",
    message: "INC-2024-0042: Suspicious login attempts",
    time: new Date(Date.now() - 1000 * 60 * 60 * 2),
    read: false,
  },
  {
    id: "3",
    type: "asset",
    title: "Asset offline",
    message: "webserver-prod-03 has been offline for 15 minutes",
    time: new Date(Date.now() - 1000 * 60 * 60 * 4),
    read: true,
  },
];

const getIcon = (type: string) => {
  switch (type) {
    case "vulnerability":
      return <ShieldAlert className="h-4 w-4 text-destructive" />;
    case "incident":
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    case "asset":
      return <Server className="h-4 w-4 text-primary" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

export default function NotificationsPanel({ open, onOpenChange }: NotificationsPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </SheetTitle>
            <Button variant="ghost" size="sm" className="text-xs">
              Mark all as read
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No notifications</p>
              <p className="text-sm">You're all caught up!</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "p-3 rounded-lg border transition-colors cursor-pointer",
                  notification.read
                    ? "bg-muted/30 border-transparent"
                    : "bg-card border-border hover:border-primary/30"
                )}
              >
                <div className="flex gap-3">
                  <div className="mt-0.5">{getIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm font-medium", !notification.read && "text-foreground")}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1.5">
                      {format(notification.time, "MMM d, h:mm a")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 mt-2 ml-7">
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    <Check className="h-3 w-3 mr-1" />
                    Mark read
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
                    <Trash2 className="h-3 w-3 mr-1" />
                    Dismiss
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
