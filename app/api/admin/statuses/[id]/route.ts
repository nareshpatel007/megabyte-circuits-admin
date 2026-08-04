import { NextRequest } from "next/server";
import { handleApiProxy } from "@/lib/apiProxy";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return handleApiProxy(req, `/admin/statuses/${id}`, "PUT");
}

export async function DELETE(req: NextRequest, context: any) {
    const params = await context.params;
    return handleApiProxy(req, `/admin/statuses/${params?.id}`, "DELETE");
}
