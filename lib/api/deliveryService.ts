export interface PublicHoliday {
    id: number;
    date: string; // YYYY-MM-DD
    name: string;
    day_of_week: string;
    description: string | null;
}

export async function fetchPublicHolidays(startDate?: string, endDate?: string): Promise<PublicHoliday[]> {
    try {
        const query = new URLSearchParams();
        if (startDate) query.append("start_date", startDate);
        if (endDate) query.append("end_date", endDate);

        const res = await fetch(`/api/delivery/holidays?${query.toString()}`);
        if (!res.ok) return [];

        const data = await res.json();
        if (data.success && Array.isArray(data.holidays)) {
            return data.holidays;
        }
        return [];
    } catch (err) {
        console.error("Failed to fetch public holidays:", err);
        return [];
    }
}

/**
 * Calculate dynamic quotation date (Today + 12 days, skipping Sundays and public holidays)
 */
export function getJlcpcbQuotationDate(startDate: Date = new Date(), holidays: PublicHoliday[] = []): Date {
    const target = new Date(startDate.getTime());
    target.setDate(target.getDate() + 12);

    const holidayIsoList = (holidays || []).map(h => (typeof h?.date === "string" ? h.date.split("T")[0] : ""));

    const isNonWorking = (d: Date) => {
        if (d.getDay() === 0) return true; // Sunday
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const iso = `${yyyy}-${mm}-${dd}`;
        return holidayIsoList.includes(iso);
    };

    while (isNonWorking(target)) {
        target.setDate(target.getDate() + 1);
    }

    return target;
}
