import { NextRequest } from "next/server";
import { handleApiProxy } from "@/lib/apiProxy";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; rowId: string }> }) {
    const { id, rowId } = await params;
    return handleApiProxy(req, `/admin/orders/import/${id}/rows/${rowId}`, "PUT");
}
