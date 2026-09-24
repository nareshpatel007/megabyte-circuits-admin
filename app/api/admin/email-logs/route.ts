import { NextRequest } from "next/server";
import { handleApiProxy } from "@/lib/apiProxy";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
    return handleApiProxy(req, "/admin/email-logs", "GET");
}

export async function POST(req: NextRequest) {
    return handleApiProxy(req, "/admin/email-logs", "POST");
}

export async function DELETE(req: NextRequest) {
    return handleApiProxy(req, "/admin/email-logs", "DELETE");
}
