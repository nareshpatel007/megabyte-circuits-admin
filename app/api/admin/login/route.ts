import { NextRequest } from "next/server";
import { handleApiProxy } from "@/lib/apiProxy";

export async function POST(req: NextRequest) {
    return handleApiProxy(req, "/admin/login", "POST");
}
