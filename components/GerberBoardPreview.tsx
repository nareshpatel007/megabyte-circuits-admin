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

    const colorKey = (pcbColor || "green").toLowerCase();
    const theme = COLOR_MAP[colorKey] || COLOR_MAP.green;
    const nameToDisplay = originalName || boardName || "PCB BOARD";

    return (
        <svg viewBox="0 0 200 200" className={`object-contain rounded-xl shadow-md ${className}`}>
            <defs>
                <linearGradient id="goldPadAdmin" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f6e05e" />
                    <stop offset="50%" stopColor="#d69e2e" />
                    <stop offset="100%" stopColor="#975a16" />
                </linearGradient>
                <linearGradient id="boardShineAdmin" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
                    <stop offset="70%" stopColor="#ffffff" stopOpacity="0.0" />
                </linearGradient>
            </defs>

            {/* PCB Substrate */}
            <rect width="200" height="200" rx="14" fill={theme.bg} />
            <rect x="4" y="4" width="192" height="192" rx="10" fill="url(#boardShineAdmin)" />
            <rect x="6" y="6" width="188" height="188" rx="8" fill="none" stroke={theme.border} strokeWidth="1.5" strokeDasharray="6 3" />

            {/* Corner Mounting Holes */}
            {[
                { cx: 18, cy: 18 },
                { cx: 182, cy: 18 },
                { cx: 18, cy: 182 },
                { cx: 182, cy: 182 },
            ].map((hole, i) => (
                <g key={i}>
                    <circle cx={hole.cx} cy={hole.cy} r="9" fill="url(#goldPadAdmin)" />
                    <circle cx={hole.cx} cy={hole.cy} r="6" fill="#0f172a" />
                </g>
            ))}

            {/* Copper Routing Traces */}
            <path d="M 30 30 L 30 65 L 70 65 M 70 65 L 70 90" fill="none" stroke="url(#goldPadAdmin)" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
            <path d="M 170 30 L 170 60 L 130 60 M 130 60 L 130 85" fill="none" stroke="url(#goldPadAdmin)" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
            <path d="M 30 170 L 30 135 L 70 135 M 70 135 L 70 110" fill="none" stroke="url(#goldPadAdmin)" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
            <path d="M 170 170 L 170 140 L 130 140" fill="none" stroke="url(#goldPadAdmin)" strokeWidth="2" strokeLinecap="round" opacity="0.9" />

            {/* Main IC Footprint (QFP / QFN Package) */}
            <rect x="65" y="65" width="70" height="70" rx="3" fill="#1e293b" stroke={theme.silk} strokeWidth="1" />
            <circle cx="73" cy="73" r="2.5" fill={theme.silk} />

            {/* IC Pin Pads */}
            {[73, 83, 93, 103, 113, 123].map((pos) => (
                <React.Fragment key={pos}>
                    <line x1={pos} y1="52" x2={pos} y2="62" stroke="url(#goldPadAdmin)" strokeWidth="3.5" strokeLinecap="round" />
                    <line x1={pos} y1="138" x2={pos} y2="148" stroke="url(#goldPadAdmin)" strokeWidth="3.5" strokeLinecap="round" />
                    <line x1="52" y1={pos} x2="62" y2={pos} stroke="url(#goldPadAdmin)" strokeWidth="3.5" strokeLinecap="round" />
                    <line x1="138" y1={pos} x2="148" y2={pos} stroke="url(#goldPadAdmin)" strokeWidth="3.5" strokeLinecap="round" />
                </React.Fragment>
            ))}

            {/* SMD Components */}
            {[
                { x: 30, y: 75, label: "C1" },
                { x: 30, y: 105, label: "R1" },
                { x: 155, y: 75, label: "C2" },
                { x: 155, y: 105, label: "R2" },
            ].map((comp, idx) => (
                <g key={idx}>
                    <rect x={comp.x - 2} y={comp.y - 8} width="12" height="16" fill="#334155" rx="1" />
                    <rect x={comp.x - 2} y={comp.y - 8} width="12" height="4" fill="url(#goldPadAdmin)" />
                    <rect x={comp.x - 2} y={comp.y + 4} width="12" height="4" fill="url(#goldPadAdmin)" />
                    <text x={comp.x + 14} y={comp.y + 3} fill={theme.silk} fontSize="7" fontWeight="bold" opacity="0.8">
                        {comp.label}
                    </text>
                </g>
            ))}

            {/* Silkscreen Center Marking & Board Details */}
            <text x="100" y="98" fill={theme.silk} fontSize="11" fontWeight="900" textAnchor="middle" opacity="0.95">
                U1
            </text>
            <text x="100" y="109" fill={theme.silk} fontSize="6" fontWeight="bold" textAnchor="middle" opacity="0.7">
                MEGABYTE PCB
            </text>

            {/* Board Title Silkscreen */}
            <text x="100" y="172" fill={theme.silk} fontSize="8" fontWeight="800" textAnchor="middle" opacity="0.95">
                {nameToDisplay.length > 22 ? nameToDisplay.substring(0, 20) + "..." : nameToDisplay}
            </text>

            {/* Layers / Spec Badge */}
            <text x="100" y="184" fill={theme.silk} fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle" opacity="0.8">
                {layers} LAYER {dimensions ? `| ${dimensions}` : ""}
            </text>
        </svg>
    );
}
