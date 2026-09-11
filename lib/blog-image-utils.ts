export interface BlogImageObject {
    type?: "imagekit" | "base64" | "url";
    url: string;
    fileId?: string;
    alt?: string;
}

export function parseBlogImage(input: any): BlogImageObject | null {
    if (!input) return null;

    if (typeof input === "object" && input !== null) {
        if (input.url) {
            const urlStr = String(input.url);
            const isBase64 = urlStr.startsWith("data:image/");
            const isIk = urlStr.includes("ik.imagekit.io");
            return {
                type: input.type || (isBase64 ? "base64" : isIk ? "imagekit" : "url"),
                url: urlStr,
                fileId: input.fileId || input.file_id,
                alt: input.alt || "",
            };
        }
    }

    if (typeof input === "string") {
        const trimmed = input.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith("{")) {
            try {
                const parsed = JSON.parse(trimmed);
                return parseBlogImage(parsed);
            } catch {
                // Not valid JSON, proceed as plain string
            }
        }

        const isBase64 = trimmed.startsWith("data:image/");
        const isIk = trimmed.includes("ik.imagekit.io");
        return {
            type: isBase64 ? "base64" : isIk ? "imagekit" : "url",
            url: trimmed,
        };
    }

    return null;
}

export function getBlogImageUrl(input: any, defaultFallback = ""): string {
    const parsed = parseBlogImage(input);
    return parsed?.url || defaultFallback;
}

export function getBlogImageFileId(input: any): string | undefined {
    const parsed = parseBlogImage(input);
    return parsed?.fileId;
}

export function isBase64Image(input: any): boolean {
    const parsed = parseBlogImage(input);
    return parsed?.type === "base64" || Boolean(parsed?.url?.startsWith("data:image/"));
}
