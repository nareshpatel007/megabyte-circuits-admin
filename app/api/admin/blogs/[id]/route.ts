import { NextRequest } from "next/server";
import { handleApiProxy } from "@/lib/apiProxy";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return handleApiProxy(req, `/admin/blogs/${id}`, "GET");
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return handleApiProxy(req, `/admin/blogs/${id}`, "PUT");
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return handleApiProxy(req, `/admin/blogs/${id}`, "DELETE");
}
