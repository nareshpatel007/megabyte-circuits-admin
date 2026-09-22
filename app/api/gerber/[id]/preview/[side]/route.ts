import { NextRequest } from "next/server";
import { handleApiProxy } from "@/lib/apiProxy";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; side: string }> }
) {
    const { id, side } = await params;
    return handleApiProxy(req, `/api/gerber/${id}/preview/${side}`, "GET");
}
