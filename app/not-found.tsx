import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6 text-center">
            <h1 className="text-4xl font-extrabold text-emerald-600 mb-2">404 - Page Not Found</h1>
            <p className="text-sm text-muted-foreground mb-6 font-medium">The requested admin route or resource could not be found.</p>
            <Link
                href="/dashboard"
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-xl shadow-sm transition-all text-xs"
            >
                Return to Dashboard
            </Link>
        </div>
    );
}
