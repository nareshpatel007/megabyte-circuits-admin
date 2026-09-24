"use client";

import React, { useState } from "react";
import { FileArchive } from "lucide-react";

interface GerberBoardPreviewProps {
    gerberFileId?: number | string;
    previewData?: string;
    boardName?: string;
    originalName?: string;
    pcbColor?: string;
    layers?: string | number;
    dimensions?: string;
    className?: string;
}

export default function GerberBoardPreview({
    gerberFileId,
    previewData,
    boardName,
    originalName,
    pcbColor = "Green",
    layers = "2",
    dimensions,
    className = "w-full h-full"
}: GerberBoardPreviewProps) {
    const [imgError, setImgError] = useState(false);
    const colorMapHex: Record<string, string> = {
        "#52c41a": "green",
        "#722ed1": "purple",
        "#f5222d": "red",
        "#fadb14": "yellow",
        "#1677ff": "blue",
        "#ffffff": "white",
        "#000000": "black"
    };

    const rawColor = (pcbColor || "green").toLowerCase().trim();
    const colorSlug = colorMapHex[rawColor] || rawColor;
    const validColors = ["green", "purple", "red", "yellow", "blue", "white", "black"];
    const effectiveColor = validColors.includes(colorSlug) ? colorSlug : "green";

    let effectiveSrc = previewData;
    if (gerberFileId) {
        if (!effectiveSrc || effectiveSrc.includes("/preview/front") || effectiveSrc.startsWith("/projects/")) {
            effectiveSrc = `/api/gerber/${gerberFileId}/preview/front?color=${effectiveColor}`;
        }
    } else if (effectiveSrc && effectiveSrc.includes("/preview/front")) {
        if (effectiveSrc.includes("?color=")) {
            effectiveSrc = effectiveSrc.replace(/\?color=[a-z]+/, `?color=${effectiveColor}`);
        } else {
            effectiveSrc = `${effectiveSrc}?color=${effectiveColor}`;
        }
    }

    if (effectiveSrc && (effectiveSrc.includes("<svg") || effectiveSrc.trim().startsWith("<svg"))) {
        const svgStart = effectiveSrc.indexOf("<svg");
        const svgContent = svgStart !== -1 ? effectiveSrc.substring(svgStart) : effectiveSrc;
        return (
            <div
                className={`w-full h-full flex items-center justify-center overflow-hidden [&_svg]:w-full [&_svg]:h-full [&_svg]:object-contain ${className}`}
                dangerouslySetInnerHTML={{ __html: svgContent }}
            />
        );
    }

    const isUrl = effectiveSrc && !imgError && (
        effectiveSrc.startsWith("http://") ||
        effectiveSrc.startsWith("https://") ||
        effectiveSrc.startsWith("data:") ||
        effectiveSrc.startsWith("/") ||
        effectiveSrc.startsWith("./")
    );

    if (isUrl) {
        return (
            <img
                src={effectiveSrc}
                alt="Gerber Board Preview"
                className={`object-contain rounded-lg max-w-full max-h-full ${className}`}
                onError={() => {
                    if (gerberFileId && effectiveSrc !== `/api/gerber/${gerberFileId}/preview/front`) {
                        setImgError(false);
                        effectiveSrc = `/api/gerber/${gerberFileId}/preview/front`;
                    } else {
                        setImgError(true);
                    }
                }}
            />
        );
    }

    return (
        <div className={`w-full h-full flex items-center justify-center text-emerald-500/80 ${className}`}>
            <FileArchive className="w-4 h-4 shrink-0" />
        </div>
    );
}
