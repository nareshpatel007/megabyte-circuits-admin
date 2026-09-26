export interface StatusColorItem {
    color?: string | null;
    name?: string | null;
}

export const PREDEFINED_STATUS_COLORS: Record<string, string> = {
    "pending": "#a855f7",            // Soft Violet
    "hold": "#e11d48",               // Rose Red
    "cam": "#0284c7",                // Ocean Blue
    "cam engineering": "#0284c7",    // Ocean Blue
    "cam done": "#10b981",           // Emerald Green
    "filming": "#f59e0b",            // Amber Orange
    "traveler": "#84cc16",           // Lime Green
    "drilling": "#8b5cf6",           // Purple
    "outside drill": "#d97706",      // Golden Amber
    "drill done": "#06b6d4",         // Cyan
    "blackhole": "#334155",          // Slate
    "dh": "#f97316",                 // Vivid Orange
    "dh done": "#14b8a6",            // Teal
    "under process": "#3b82f6",      // Blue
    "dh exposer": "#ea580c",         // Deep Orange
    "final cutting": "#ec4899",      // Pink
    "devloping": "#06b6d4",          // Cyan
    "developing": "#06b6d4",         // Cyan
    "plating": "#6366f1",            // Indigo
    "plating qc": "#4f46e5",         // Dark Indigo
    "devloping qc": "#0891b2",       // Dark Cyan
    "etching": "#d97706",            // Amber
    "etch qc": "#b45309",            // Dark Amber
    "masking": "#2563eb",            // Royal Blue
    "masking exposer": "#1d4ed8",    // Deep Blue
    "hal/tin": "#0d9488",            // Teal
    "silk": "#f43f5e",               // Rose
    "vgroove": "#7c3aed",            // Deep Purple
    "rout": "#dc2626",               // Crimson Red
    "rout done": "#059669",          // Cyan / Dark Emerald
    "ready to ship": "#0f766e",      // Dark Teal
    "bbt": "#c026d3",                // Fuchsia
    "bbt-mqc": "#a21caf",            // Dark Fuchsia
    "final qc": "#059669",           // Emerald
    "move": "#64748b",               // Slate
    "fpt": "#ef4444",                // Bright Red
    "completed": "#16a34a",          // Forest Green
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
    const cleanName = (statusName || "").trim().toLowerCase();

    // 1. Check predefined color map for exact/known status names first
    if (cleanName && PREDEFINED_STATUS_COLORS[cleanName]) {
        return PREDEFINED_STATUS_COLORS[cleanName];
    }

    // 2. Check if matchedStatus has a custom non-default color (not default emerald fallback #10b981 / white / black / transparent)
    if (
        matchedStatus?.color &&
        matchedStatus.color !== "#ffffff" &&
        matchedStatus.color !== "#000000" &&
        matchedStatus.color.toLowerCase() !== "transparent" &&
        matchedStatus.color !== "#10b981"
    ) {
        return matchedStatus.color;
    }

    // 3. Fallback to distinct palette based on index or string hash
    const strHash = cleanName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const paletteIndex = index > 0 ? index : strHash;
    return DISTINCT_PALETTE[Math.abs(paletteIndex) % DISTINCT_PALETTE.length];
}

