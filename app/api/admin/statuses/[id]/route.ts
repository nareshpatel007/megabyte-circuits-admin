import { NextRequest } from "next/server";
import { handleApiProxy } from "@/lib/apiProxy";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    return handleApiProxy(req, `/admin/statuses/${params.id}`, "PUT");
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    return handleApiProxy(req, `/admin/statuses/${params.id}`, "DELETE");
}
