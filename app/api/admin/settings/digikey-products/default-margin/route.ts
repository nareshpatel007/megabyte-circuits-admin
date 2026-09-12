import { NextRequest } from "next/server";
import { handleApiProxy } from "@/lib/apiProxy";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
    return handleApiProxy(req, "/admin/digikey-products/default-margin", "GET");
}

export async function POST(req: NextRequest) {
    return handleApiProxy(req, "/admin/digikey-products/default-margin", "POST");
}
