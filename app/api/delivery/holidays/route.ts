import { NextRequest } from "next/server";
import { handleApiProxy } from "@/lib/apiProxy";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
    const search = req.nextUrl.search || "";
    return handleApiProxy(req, `/delivery/holidays${search}`, "GET");
}
