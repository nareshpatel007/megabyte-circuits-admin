"use client";

import React from "react";

interface GerberBoardPreviewProps {
    previewData?: string;
    boardName?: string;
    originalName?: string;
    pcbColor?: string;
    layers?: string | number;
    dimensions?: string;
    className?: string;
}

const COLOR_MAP: Record<string, { bg: string; border: string; silk: string }> = {
    green: { bg: "#0c3b19", border: "#22863a", silk: "#ffffff" },
    red: { bg: "#4a0b0b", border: "#a82424", silk: "#ffffff" },
    blue: { bg: "#092247", border: "#1f5ab2", silk: "#ffffff" },
    black: { bg: "#121314", border: "#383b40", silk: "#e2e8f0" },
    white: { bg: "#f0f4f8", border: "#cbd5e1", silk: "#1e293b" },
    yellow: { bg: "#524408", border: "#a38b18", silk: "#ffffff" },
    purple: { bg: "#2d0b45", border: "#7924b2", silk: "#ffffff" },
};

export default function GerberBoardPreview({
    previewData,
    boardName,
    originalName,
    pcbColor = "Green",
    layers = "2",
    dimensions,
    className = "w-full h-full"
}: GerberBoardPreviewProps) {
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

    if (previewData && (previewData.startsWith("http") || previewData.startsWith("data:"))) {
        return (
            <img
                src={previewData}
                alt="Gerber Board Preview"
                className={`object-contain rounded-xl ${className}`}
            />
        );
    }

    return (
        <div className={`w-full h-full flex items-center justify-center text-center text-muted-foreground font-medium text-xs ${className}`}>
            No preview detected
        </div>
    );
}
