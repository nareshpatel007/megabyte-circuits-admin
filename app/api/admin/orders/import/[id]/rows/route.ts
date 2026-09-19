import { NextRequest } from "next/server";
import { handleApiProxy } from "@/lib/apiProxy";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const url = new URL(req.url);
    const searchParams = url.searchParams.toString();
    const endpoint = `/admin/orders/import/${id}/rows${searchParams ? `?${searchParams}` : ''}`;
    return handleApiProxy(req, endpoint, "GET");
}
