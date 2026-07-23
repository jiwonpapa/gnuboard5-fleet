import type { LucideIcon } from "lucide-react";

export type NavigationDelivery = "api_excluded" | "api_ready" | "implemented";

export type NavigationItem = {
  aliases?: string[];
  apiTargets?: string[];
  delivery: NavigationDelivery;
  description: string;
  icon: LucideIcon;
  label: string;
  legacySource: string;
  note?: string;
  to: string;
};

export type NavigationGroup = {
  description: string;
  icon: LucideIcon;
  id: string;
  items: NavigationItem[];
  label: string;
  showInPrimaryNav?: boolean;
};
