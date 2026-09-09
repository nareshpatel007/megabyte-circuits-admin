import { NextRequest } from "next/server";
import { handleApiProxy } from "@/lib/apiProxy";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return handleApiProxy(req, `/admin/blog-tags/${id}`, "DELETE");
}
