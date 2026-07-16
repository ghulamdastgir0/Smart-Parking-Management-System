"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";

function initials(firstName?: string, lastName?: string): string {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Deliberate hydration guard: theme isn't known until mounted client-side.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (isLoading || !user) {
    return <Skeleton className="h-96 w-full max-w-lg rounded-xl" />;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader title="Profile" />

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <Avatar size="lg" className="size-16">
            <AvatarFallback className="text-lg">
              {initials(user.firstName, user.lastName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-heading text-xl font-semibold">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge>{user.role}</Badge>
            <Badge variant="success">Active</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Member since {formatDate(user.createdAt)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <h2 className="font-heading font-medium">Preferences</h2>
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">Theme</p>
            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors",
                    mounted && theme === opt.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  <opt.icon className="size-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
