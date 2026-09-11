import { NextRequest, NextResponse } from "next/server";
import { uploadBlogImage, validateImageFile } from "@/lib/imagekit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = (formData.get("image") || formData.get("file")) as File | null;

        if (!file) {
            return NextResponse.json(
                { status: false, message: "No image file provided." },
                { status: 400 }
            );
        }

        // Validate image file type and size
        const validation = validateImageFile({
            name: file.name,
            size: file.size,
            type: file.type,
        });

        if (!validation.valid) {
            return NextResponse.json(
                { status: false, message: validation.error },
                { status: 400 }
            );
        }

        // Read file bytes into Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to ImageKit
        const uploadResult = await uploadBlogImage(buffer, file.name);

        if (!uploadResult.status || !uploadResult.url) {
            return NextResponse.json(
                { status: false, message: uploadResult.message || "Image upload failed." },
                { status: 500 }
            );
        }

        return NextResponse.json({
            status: true,
            url: uploadResult.url,
            fileId: uploadResult.fileId,
            type: "imagekit",
            name: uploadResult.name,
            // also provide 'location' if rich text editor expects location
            location: uploadResult.url,
        });
    } catch (error: any) {
        console.error("Upload route error:", error);
        return NextResponse.json(
            { status: false, message: error?.message || "Server error while uploading image." },
            { status: 500 }
        );
    }
}
