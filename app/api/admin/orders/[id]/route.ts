import { NextRequest } from "next/server";
import { handleApiProxy } from "@/lib/apiProxy";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    return handleApiProxy(req, `/admin/orders/${params.id}`, "GET");
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    return handleApiProxy(req, `/admin/orders/${params.id}`, "PUT");
}
