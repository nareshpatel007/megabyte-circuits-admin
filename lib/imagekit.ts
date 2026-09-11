import ImageKit from "imagekit";

export interface ImageKitUploadResult {
    status: boolean;
    url?: string;
    fileId?: string;
    name?: string;
    message?: string;
}

export function getImageKitConfig() {
    const publicKey = process.env.IMAGEKIT_PUBLIC_KEY || "";
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || "";
    const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/8xe0dth2o";
    const storagePath = process.env.IMAGEKIT_STORAGE_PATH || "/Megabyte";

    return {
        publicKey,
        privateKey,
        urlEndpoint,
        storagePath,
        isConfigured: Boolean(publicKey && privateKey && urlEndpoint),
    };
}

let imagekitInstance: ImageKit | null = null;

export function getImageKitInstance(): ImageKit | null {
    const config = getImageKitConfig();
    if (!config.isConfigured) {
        return null;
    }
    if (!imagekitInstance) {
        imagekitInstance = new ImageKit({
            publicKey: config.publicKey,
            privateKey: config.privateKey,
            urlEndpoint: config.urlEndpoint,
        });
    }
    return imagekitInstance;
}

export function validateImageFile(file: { name: string; size: number; type: string }): { valid: boolean; error?: string } {
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
        return { valid: false, error: "Image size is too large. Maximum allowed size is 5MB." };
    }

    const allowedExtensions = ["jpg", "jpeg", "png", "webp", "gif", "svg"];
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const allowedMimeTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/svg+xml",
    ];

    if (!allowedExtensions.includes(ext) && !allowedMimeTypes.includes(file.type)) {
        return { valid: false, error: "Unsupported image format. Allowed formats: JPG, PNG, WEBP, GIF, SVG." };
    }

    return { valid: true };
}

export async function uploadBlogImage(
    buffer: Buffer,
    fileName: string,
    folder?: string
): Promise<ImageKitUploadResult> {
    const imagekit = getImageKitInstance();
    const config = getImageKitConfig();

    if (!imagekit) {
        return {
            status: false,
            message: "ImageKit configuration is missing on server. Please check environment variables.",
        };
    }

    const targetFolder = folder || `${config.storagePath}/blogs`;

    try {
        const response = await imagekit.upload({
            file: buffer,
            fileName,
            folder: targetFolder,
            useUniqueFileName: true,
        });

        return {
            status: true,
            url: response.url,
            fileId: response.fileId,
            name: response.name,
        };
    } catch (err: any) {
        console.error("ImageKit Upload Error:", err);
        return {
            status: false,
            message: err?.message || "Image upload failed. Please try again.",
        };
    }
}

export async function deleteBlogImage(fileId: string): Promise<{ status: boolean; message?: string }> {
    if (!fileId) {
        return { status: false, message: "No file ID provided." };
    }

    const imagekit = getImageKitInstance();
    if (!imagekit) {
        return { status: false, message: "ImageKit configuration missing." };
    }

    try {
        await imagekit.deleteFile(fileId);
        return { status: true };
    } catch (err: any) {
        console.error("ImageKit Delete Error:", err);
        return { status: false, message: err?.message || "Failed to delete ImageKit image." };
    }
}
