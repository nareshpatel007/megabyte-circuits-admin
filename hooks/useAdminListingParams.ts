"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";

export interface ListingParamsConfig<T extends Record<string, any>> {
    defaultParams?: Partial<T>;
    allowedLimits?: number[];
    resetPageOnFilterChange?: boolean;
}

export function useAdminListingParams<T extends Record<string, any>>(config: ListingParamsConfig<T> = {}) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const [, startTransition] = useTransition();

    const {
        defaultParams = {} as Partial<T>,
        allowedLimits = [10, 15, 25, 50, 100],
        resetPageOnFilterChange = true
    } = config;

    // Helper to get raw parameter from searchParams
    const getParam = useCallback(
        (key: string, fallback: any = ""): any => {
            if (!searchParams) return fallback;
            const val = searchParams.get(key);
            if (val === null || val === undefined) return fallback;
            return val;
        },
        [searchParams]
    );

    // Get current page (validated >= 1)
    const page = (() => {
        const p = parseInt(getParam("page", "1"), 10);
        return isNaN(p) || p < 1 ? 1 : p;
    })();

    // Get current limit / per_page
    const getLimit = (key: string = "per_page", defaultLimit: number = 10): number => {
        const raw = getParam(key, String(defaultLimit));
        const parsed = parseInt(raw, 10);
        if (isNaN(parsed) || parsed < 1) return defaultLimit;
        if (allowedLimits.length > 0 && !allowedLimits.includes(parsed)) {
            // Pick closest allowed limit if custom invalid
            return defaultLimit;
        }
        return parsed;
    };

    // Update query params in URL
    const updateParams = useCallback(
        (newParams: Record<string, any>, options?: { replace?: boolean; push?: boolean; resetPage?: boolean }) => {
            if (!searchParams) return;

            const params = new URLSearchParams(searchParams.toString());
            const shouldResetPage = options?.resetPage ?? resetPageOnFilterChange;

            let filterChanged = false;

            Object.entries(newParams).forEach(([key, value]) => {
                const existingVal = params.get(key);
                const strVal = value !== null && value !== undefined ? String(value).trim() : "";

                // Check if filter value actually changed (ignoring page param itself)
                if (key !== "page" && existingVal !== strVal) {
                    filterChanged = true;
                }

                // If value is default ('all', empty string, null, undefined), clean it up from URL
                if (
                    strVal === "" ||
                    strVal.toLowerCase() === "all" ||
                    value === null ||
                    value === undefined
                ) {
                    params.delete(key);
                } else {
                    params.set(key, strVal);
                }
            });

            // If a filter changed and page was not explicitly set in newParams, reset page to 1
            if (shouldResetPage && filterChanged && !("page" in newParams)) {
                params.delete("page"); // page 1 is default, omit from URL for clean links
            } else if (newParams.page === 1 || newParams.page === "1") {
                params.delete("page");
            }

            const queryString = params.toString();
            const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;

            startTransition(() => {
                if (options?.push) {
                    router.push(targetUrl, { scroll: false });
                } else {
                    router.replace(targetUrl, { scroll: false });
                }
            });
        },
        [searchParams, pathname, router, resetPageOnFilterChange]
    );

    // Clear all listing filters from URL
    const clearFilters = useCallback(
        (preserveKeys: string[] = ["per_page", "limit"]) => {
            if (!searchParams) return;
            const params = new URLSearchParams();
            preserveKeys.forEach((key) => {
                const val = searchParams.get(key);
                if (val) params.set(key, val);
            });
            const queryString = params.toString();
            const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;

            startTransition(() => {
                router.replace(targetUrl, { scroll: false });
            });
        },
        [searchParams, pathname, router]
    );

    return {
        searchParams,
        getParam,
        page,
        getLimit,
        updateParams,
        clearFilters,
    };
}
