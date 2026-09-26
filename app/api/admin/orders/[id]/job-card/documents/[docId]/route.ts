import { NextRequest } from "next/server";
import { handleApiProxy } from "@/lib/apiProxy";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function DELETE(req: NextRequest, context: any) {
    const params = await context.params;
    return handleApiProxy(req, `/admin/orders/${params?.id}/job-card/documents/${params?.docId}`, "DELETE");
}
