import { NextRequest } from "next/server";
import { handleApiProxy } from "@/lib/apiProxy";

export async function GET(req: NextRequest) {
    return handleApiProxy(req, "/admin/statuses", "GET");
}

export async function POST(req: NextRequest) {
    return handleApiProxy(req, "/admin/statuses", "POST");
}
