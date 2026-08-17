import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { hasAnyPermission, type PermissionValue } from "@/lib/permissions";

interface PermissionRouteProps {
  permission?: PermissionValue | PermissionValue[];
  children: ReactNode;
}

export function PermissionRoute({ permission, children }: PermissionRouteProps) {
  const { permissions } = useAuth();

  if (!hasAnyPermission(permissions, permission)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Card className="w-full max-w-md border-destructive/30 shadow-sm">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="rounded-full bg-destructive/10 p-3 text-destructive">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">Acces refuse</h1>
              <p className="text-sm text-muted-foreground">
                Vous n'avez pas les permissions necessaires pour acceder a cette page.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/">Retour au tableau de bord</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}