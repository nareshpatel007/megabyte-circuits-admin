export interface StatusColorItem {
    color?: string | null;
    name?: string | null;
}

export const PREDEFINED_STATUS_COLORS: Record<string, string> = {
    "pending": "#a855f7",            // Soft Violet
    "cam engineering": "#0284c7",    // Ocean Blue
    "cam done": "#10b981",           // Emerald Green
    "in production": "#f59e0b",      // Amber Orange
    "drilling": "#8b5cf6",           // Purple
    "outside drill": "#d97706",      // Golden Amber
    "masking exposer": "#2563eb",    // Royal Blue
    "dh exposer": "#f97316",         // Vivid Orange
    "rout": "#dc2626",               // Crimson Red
    "rout done": "#06b6d4",          // Cyan
    "vgroove": "#6366f1",            // Indigo
    "fpt": "#ef4444",                // Bright Red
    "hal/tin": "#14b8a6",            // Teal
    "final cutting": "#ec4899",      // Pink
    "traveler": "#84cc16",           // Lime Green
    "hold": "#e11d48",               // Rose Red
    "ready to ship": "#0d9488",      // Dark Teal
    "completed": "#059669",          // Deep Emerald Green
    "shipped": "#16a34a",            // Forest Green
    "delivered": "#15803d",          // Dark Forest Green
    "cancelled": "#64748b",          // Slate Gray
    "canceled": "#64748b",           // Slate Gray
};

export const DISTINCT_PALETTE: string[] = [
    "#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#ef4444", "#06b6d4",
    "#84cc16", "#e11d48", "#a855f7", "#059669", "#d97706", "#2563eb", "#f97316",
    "#dc2626", "#6366f1", "#14b8a6", "#0d9488", "#16a34a", "#64748b", "#0284c7"
];

export function getStatusColor(
    statusName?: string | null,
    matchedStatus?: StatusColorItem | null,
    index: number = 0
): string {
    if (
        matchedStatus?.color &&
        matchedStatus.color !== "#ffffff" &&
        matchedStatus.color !== "#000000" &&
        matchedStatus.color.toLowerCase() !== "transparent"
    ) {
        return matchedStatus.color;
    }

    const cleanName = (statusName || "").trim().toLowerCase();
    if (PREDEFINED_STATUS_COLORS[cleanName]) {
        return PREDEFINED_STATUS_COLORS[cleanName];
    }

    return DISTINCT_PALETTE[Math.abs(index) % DISTINCT_PALETTE.length];
}
