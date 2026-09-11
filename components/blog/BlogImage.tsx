import React from "react";
import { getBlogImageUrl, isBase64Image } from "@/lib/blog-image-utils";

interface BlogImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src?: any;
    alt?: string;
    fallbackSrc?: string;
}

export function BlogImage({
    src,
    alt = "Blog image",
    fallbackSrc = "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop",
    className = "",
    ...props
}: BlogImageProps) {
    const imageUrl = getBlogImageUrl(src, fallbackSrc);

    return (
        <img
            src={imageUrl || fallbackSrc}
            alt={alt}
            className={className}
            onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== fallbackSrc) {
                    target.src = fallbackSrc;
                }
            }}
            {...props}
        />
    );
}
