import { NextRequest } from "next/server";
import { handleApiProxy } from "@/lib/apiProxy";

export async function GET(req: NextRequest) {
    return handleApiProxy(req, "/admin/staff", "GET");
}

export async function POST(req: NextRequest) {
    return handleApiProxy(req, "/admin/staff", "POST");
}
