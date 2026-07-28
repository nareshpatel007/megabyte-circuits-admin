import { NextRequest } from "next/server";
import { handleApiProxy } from "@/lib/apiProxy";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return handleApiProxy(req, `/admin/staff/${id}`, "PUT");
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return handleApiProxy(req, `/admin/staff/${id}`, "DELETE");
}
