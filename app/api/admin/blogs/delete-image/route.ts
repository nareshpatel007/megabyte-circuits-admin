import { NextRequest, NextResponse } from "next/server";
import { deleteBlogImage } from "@/lib/imagekit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const { fileId } = body;

        if (!fileId || typeof fileId !== "string" || fileId.startsWith("data:image")) {
            return NextResponse.json(
                { status: false, message: "Invalid or Base64 file ID provided." },
                { status: 400 }
            );
        }

        const result = await deleteBlogImage(fileId);

        if (!result.status) {
            return NextResponse.json(
                { status: false, message: result.message || "Failed to delete ImageKit image." },
                { status: 500 }
            );
        }

        return NextResponse.json({
            status: true,
            message: "ImageKit image deleted successfully.",
        });
    } catch (error: any) {
        console.error("Delete image route error:", error);
        return NextResponse.json(
            { status: false, message: error?.message || "Server error while deleting image." },
            { status: 500 }
        );
    }
}
