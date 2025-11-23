import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "accent" | "success";
}

export function StatCard({ title, value, icon: Icon, trend, variant = "default" }: StatCardProps) {
  const variantClasses = {
    default: "bg-card",
    primary: "bg-gradient-primary",
    accent: "bg-gradient-accent",
    success: "bg-success",
  };

  const iconBgClasses = {
    default: "bg-primary/10 text-primary",
    primary: "bg-white/20 text-white",
    accent: "bg-white/20 text-white",
    success: "bg-white/20 text-white",
  };

  const textClasses = variant === "default" ? "text-card-foreground" : "text-white";
  const mutedTextClasses = variant === "default" ? "text-muted-foreground" : "text-white/80";

  return (
    <Card className={`${variantClasses[variant]} border-0 shadow-md hover:shadow-lg transition-all duration-200`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className={`text-sm font-medium ${mutedTextClasses}`}>
              {title}
            </p>
            <p className={`text-3xl font-bold ${textClasses}`}>
              {value}
            </p>
            {trend && (
              <p className={`text-xs ${mutedTextClasses}`}>
                <span className={trend.isPositive ? "text-success" : "text-destructive"}>
                  {trend.value}
                </span>
                {" "}vs mois dernier
              </p>
            )}
          </div>
          <div className={`rounded-lg p-3 ${iconBgClasses[variant]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
