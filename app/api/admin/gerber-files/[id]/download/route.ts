import { NextRequest } from "next/server";
import { handleApiProxy } from "@/lib/apiProxy";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    return handleApiProxy(req, `/admin/gerber-files/${id}/download`, "GET");
}
