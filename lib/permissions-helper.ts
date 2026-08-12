export interface MenuRoute {
    href: string;
    permission?: string | string[];
}

export const ALL_MENU_ROUTES: MenuRoute[] = [
    { href: "/dashboard", permission: "dashboard.view" },
    { href: "/orders", permission: "orders.view" },
    { href: "/payments", permission: "payments.view" },
    { href: "/gerber-files", permission: "gerber.view" },
    { href: "/inventory", permission: "inventory.view" },
    { href: "/clients", permission: "clients.view" },
    { href: "/staff", permission: "staff.view" },
    { href: "/roles", permission: "role.view" },
    { href: "/settings", permission: ["settings.general", "settings.order_status"] },
    { href: "/settings/pcb-pricing", permission: ["settings.general"] },
    { href: "/settings/statuses", permission: ["settings.order_status"] },
];

export function getPermittedRoutes(permissions: string[] = [], role?: string): string[] {
    const isSuperAdmin = role?.toLowerCase() === "super admin";
    if (isSuperAdmin) {
        return ALL_MENU_ROUTES.map((r) => r.href);
    }

    return ALL_MENU_ROUTES.filter((r) => {
        if (!r.permission) return true;
        if (Array.isArray(r.permission)) {
            return r.permission.some((p) => permissions.includes(p));
        }
        return permissions.includes(r.permission);
    }).map((r) => r.href);
}

export function getDefaultRedirectRoute(permissions: string[] = [], role?: string): string {
    const permitted = getPermittedRoutes(permissions, role);
    if (permitted.length > 0) {
        return permitted[0];
    }
    return "/dashboard";
}
