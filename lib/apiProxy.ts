import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || "";
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || "";

export async function handleApiProxy(
    req: NextRequest,
    endpoint: string,
    method: string = "POST",
    body?: BodyInit | null
) {
    try {
        // Validate origin
        const origin = req.headers.get("origin");
        const referer = req.headers.get("referer");

        // Remove this when we have a proper authentication system
        const isValidOrigin = origin === ALLOWED_ORIGIN || (referer && referer.startsWith(ALLOWED_ORIGIN)) || !ALLOWED_ORIGIN;

        if (!isValidOrigin && ALLOWED_ORIGIN) {
            console.error('Origin validation failed:', { origin, referer, ALLOWED_ORIGIN });
            return NextResponse.json(
                { success: false, message: "Unauthorized token" },
                { status: 403 }
            );
        }

        const clientAuth = req.headers.get("Authorization");
        const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";

        const headers: HeadersInit = {
            "Requested-Domain": ALLOWED_ORIGIN,
            "X-Api-Token": API_TOKEN,
            "Authorization": clientAuth || `Bearer ${API_TOKEN}`
        };

        if (clientIp) {
            (headers as Record<string, string>)["X-Forwarded-For"] = clientIp;
        }

        const fetchOptions: RequestInit = {
            method,
            headers,
        };

        // Don't pass a body for GET or HEAD requests
        if (method !== "GET" && method !== "HEAD") {
            // If body is provided directly (for FormData that's already been read)
            if (body) {
                fetchOptions.body = body;
                // If it's FormData, remove Content-Type to let browser set it with boundary
                if (body instanceof FormData) {
                    const headersObj = headers as Record<string, string>;
                    delete headersObj["Content-Type"];
                    fetchOptions.headers = headersObj;
                }
            } else {
                // Otherwise, read from request
                const contentType = req.headers.get("content-type");
                
                if (contentType && contentType.includes("multipart/form-data")) {
                    // Handle FormData (file uploads)
                    const formData = await req.formData();
                    fetchOptions.body = formData;
                    // Remove Content-Type to let browser set it with boundary
                    const headersObj = headers as Record<string, string>;
                    delete headersObj["Content-Type"];
                    fetchOptions.headers = headersObj;
                } else {
                    // Handle JSON
                    const requestBody = await req.json().catch(() => null);
                    if (requestBody) {
                        fetchOptions.body = JSON.stringify(requestBody);
                        const headersObj = headers as Record<string, string>;
                        headersObj["Content-Type"] = "application/json";
                        fetchOptions.headers = headersObj;
                    }
                }
            }
        }

        // Call backend API
        const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";        
        const apiRes = await fetch(`${apiUrl}${endpoint}`, fetchOptions);
        const text = await apiRes.text();

        return new NextResponse(text, {
            status: apiRes.status,
            headers: {
                "Content-Type":
                    apiRes.headers.get("content-type") || "application/json",
            },
        });
    } catch (error) {
        console.error('API Proxy error:', error);
        return NextResponse.json(
            { success: false, message: "Internal Server Error", error: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}