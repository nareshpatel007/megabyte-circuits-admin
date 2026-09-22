"use client";

import React, { useState } from "react";
import { FileArchive } from "lucide-react";

interface GerberBoardPreviewProps {
    previewData?: string;
    boardName?: string;
    originalName?: string;
    pcbColor?: string;
    layers?: string | number;
    dimensions?: string;
    className?: string;
}

export default function GerberBoardPreview({
    previewData,
    boardName,
    originalName,
    pcbColor = "Green",
    layers = "2",
    dimensions,
    className = "w-full h-full"
}: GerberBoardPreviewProps) {
    const [imgError, setImgError] = useState(false);

    if (previewData && (previewData.includes("<svg") || previewData.trim().startsWith("<svg"))) {
        const svgStart = previewData.indexOf("<svg");
        const svgContent = svgStart !== -1 ? previewData.substring(svgStart) : previewData;
        return (
            <div
                className={`w-full h-full flex items-center justify-center overflow-hidden [&_svg]:w-full [&_svg]:h-full [&_svg]:object-contain ${className}`}
                dangerouslySetInnerHTML={{ __html: svgContent }}
            />
        );
    }

    const isUrl = previewData && !imgError && (
        previewData.startsWith("http://") ||
        previewData.startsWith("https://") ||
        previewData.startsWith("data:") ||
        previewData.startsWith("/") ||
        previewData.startsWith("./")
    );

    if (isUrl) {
        return (
            <img
                src={previewData}
                alt="Gerber Board Preview"
                className={`object-contain rounded-lg max-w-full max-h-full ${className}`}
                onError={() => setImgError(true)}
            />
        );
    }

    return (
        <div className={`w-full h-full flex items-center justify-center text-emerald-500/80 ${className}`}>
            <FileArchive className="w-4 h-4 shrink-0" />
        </div>
    );
}
