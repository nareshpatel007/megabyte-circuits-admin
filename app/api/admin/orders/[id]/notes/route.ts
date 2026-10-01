import { NextRequest } from "next/server";
import { handleApiProxy } from "@/lib/apiProxy";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest, context: any) {
    const params = await context.params;
    return handleApiProxy(req, `/admin/orders/${params?.id}/notes`, "GET");
}

export async function POST(req: NextRequest, context: any) {
    const params = await context.params;
    return handleApiProxy(req, `/admin/orders/${params?.id}/notes`, "POST");
}

export async function DELETE(req: NextRequest, context: any) {
    const params = await context.params;
    const url = new URL(req.url);
    const noteId = url.searchParams.get("noteId") || params?.id;
    return handleApiProxy(req, `/admin/orders/notes/${noteId}`, "DELETE");
}

