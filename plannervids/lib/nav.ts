export interface NavItem {
  label: string;
  href: string;
}

// Section 42 of the product spec, in order.
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/app/dashboard" },
  { label: "Calendar", href: "/app/calendar" },
  { label: "Content Studio", href: "/app/content-studio" },
  { label: "Short Factory", href: "/app/short-factory" },
  { label: "Campaigns", href: "/app/campaigns" },
  { label: "Products", href: "/app/products" },
  { label: "Brands", href: "/app/brands" },
  { label: "Social Accounts", href: "/app/social-accounts" },
  { label: "Media Library", href: "/app/media-library" },
  { label: "Approvals", href: "/app/approvals" },
  { label: "Analytics", href: "/app/analytics" },
  { label: "Links", href: "/app/links" },
  { label: "Automations", href: "/app/automations" },
  { label: "AI Costs", href: "/app/ai-costs" },
  { label: "Logs", href: "/app/logs" },
  { label: "Settings", href: "/app/settings" },
];
