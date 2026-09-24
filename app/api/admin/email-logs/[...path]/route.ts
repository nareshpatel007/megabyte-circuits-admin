import { NextRequest } from "next/server";
import { handleApiProxy } from "@/lib/apiProxy";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function proxy(req: NextRequest) {
    const endpoint = req.nextUrl.pathname.replace(/^\/api/, "");
    return handleApiProxy(req, endpoint, req.method);
}

export async function GET(req: NextRequest) {
    return proxy(req);
}

export async function POST(req: NextRequest) {
    return proxy(req);
}

export async function PUT(req: NextRequest) {
    return proxy(req);
}

export async function DELETE(req: NextRequest) {
    return proxy(req);
}
