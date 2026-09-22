import { NextRequest, NextResponse } from "next/server";
import { handleApiProxy } from "@/lib/apiProxy";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json(
                { success: false, error: "No file provided." },
                { status: 400 }
            );
        }

        // Validate File Size (100 MB max)
        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json(
                { success: false, error: "File size exceeds 100 MB limit." },
                { status: 400 }
            );
        }

        // Validate Extension
        const extension = file.name.split(".").pop()?.toLowerCase();
        if (extension !== "zip" && extension !== "rar") {
            return NextResponse.json(
                { success: false, error: "Only ZIP and RAR archives are supported." },
                { status: 400 }
            );
        }

        return handleApiProxy(req, "/api/upload", "POST", formData);

    } catch (err: any) {
        console.error("Upload API Error:", err);
        return NextResponse.json(
            { success: false, error: err.message || "Failed to process Gerber upload." },
            { status: 500 }
        );
    }
}
