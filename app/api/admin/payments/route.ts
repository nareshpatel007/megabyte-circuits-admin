import { NextRequest } from "next/server";
import { handleApiProxy } from "@/lib/apiProxy";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const queryString = url.search;
    return handleApiProxy(req, `/admin/payments${queryString}`, "GET");
}
