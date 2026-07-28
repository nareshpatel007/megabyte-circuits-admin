import { NextRequest } from "next/server";
import { handleApiProxy } from "@/lib/apiProxy";

export async function GET(req: NextRequest) {
    return handleApiProxy(req, "/admin/permissions", "GET");
}
