"use client";

import React, { useRef, useEffect } from "react";

interface PCBPreviewCanvasProps {
    pcbColor: string;
    activeLayers: {
        outline: boolean;
        topCopper: boolean;
        bottomCopper: boolean;
        solderMask: boolean;
        silkscreen: boolean;
        drills: boolean;
    };
    widthMm?: string;
    heightMm?: string;
    layersCount?: string;
    boardName?: string;
}

const COLOR_HEX_MAP: Record<string, string> = {
    Green: "#0c3b19",
    Red: "#4a0b0b",
    Blue: "#092247",
    Black: "#121314",
    White: "#f0f4f8",
    Yellow: "#524408",
};

export default function PCBPreviewCanvas({
    pcbColor,
    activeLayers,
    widthMm = "100",
    heightMm = "100",
    layersCount = "2",
    boardName = "PCB BOARD"
}: PCBPreviewCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const boardBgColor = COLOR_HEX_MAP[pcbColor] || COLOR_HEX_MAP.Green;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw PCB Board base
        if (activeLayers.outline) {
            ctx.fillStyle = boardBgColor;
            ctx.beginPath();
            if (typeof ctx.roundRect === "function") {
                ctx.roundRect(15, 15, canvas.width - 30, canvas.height - 30, 16);
            } else {
                ctx.rect(15, 15, canvas.width - 30, canvas.height - 30);
            }
            ctx.fill();

            // Draw gold/solder mask border outline
            ctx.strokeStyle = "#d4af37"; // gold outline
            ctx.lineWidth = 3;
            ctx.stroke();
        } else {
            // Draw background if outline is disabled
            ctx.fillStyle = "#1e293b";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Draw Solder Mask grid texture if enabled
        if (activeLayers.solderMask && activeLayers.outline) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
            for (let x = 30; x < canvas.width - 30; x += 25) {
                for (let y = 30; y < canvas.height - 30; y += 25) {
                    ctx.beginPath();
                    ctx.arc(x, y, 1, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Draw Bottom Copper Layer (cyan/blue traces underneath)
        if (activeLayers.bottomCopper) {
            ctx.strokeStyle = "rgba(0, 191, 255, 0.35)";
            ctx.lineWidth = 2.5;
            ctx.beginPath();

            // Bottom Trace 1
            ctx.moveTo(50, 100);
            ctx.lineTo(140, 140);
            ctx.lineTo(canvas.width / 2, canvas.height / 2 - 20);

            // Bottom Trace 2
            ctx.moveTo(canvas.width - 50, canvas.height - 100);
            ctx.lineTo(canvas.width - 120, canvas.height - 140);
            ctx.lineTo(canvas.width / 2 + 20, canvas.height / 2 + 20);

            ctx.stroke();
        }

        // Draw Top Copper Layer (gold traces and pads)
        if (activeLayers.topCopper) {
            ctx.fillStyle = "#e5c158"; // gold color
            ctx.strokeStyle = "#e5c158";

            // IC 1 (Microcontroller pads in center)
            const icX = canvas.width / 2;
            const icY = canvas.height / 2;
            ctx.fillRect(icX - 35, icY - 35, 70, 70);

            // Draw pins
            for (let i = -25; i <= 25; i += 12) {
                ctx.fillRect(icX + i - 3, icY - 48, 6, 10); // top pins
                ctx.fillRect(icX + i - 3, icY + 38, 6, 10); // bottom pins
                ctx.fillRect(icX - 48, icY + i - 3, 10, 6); // left pins
                ctx.fillRect(icX + 38, icY + i - 3, 10, 6); // right pins
            }

            // Draw copper traces (Top Copper)
            ctx.lineWidth = 2.5;
            ctx.beginPath();

            ctx.moveTo(50, 60);
            ctx.lineTo(130, 60);
            ctx.lineTo(icX - 25, icY - 45);

            ctx.moveTo(50, 90);
            ctx.lineTo(90, 90);
            ctx.lineTo(90, 160);
            ctx.lineTo(icX - 45, icY);

            ctx.moveTo(canvas.width - 50, 60);
            ctx.lineTo(canvas.width - 130, 60);
            ctx.lineTo(icX + 25, icY - 45);

            ctx.moveTo(70, canvas.height - 70);
            ctx.lineTo(160, canvas.height - 70);
            ctx.lineTo(icX - 15, icY + 35);

            ctx.stroke();

            // Draw pads at trace ends
            ctx.beginPath();
            ctx.arc(50, 60, 4, 0, Math.PI * 2);
            ctx.arc(50, 90, 4, 0, Math.PI * 2);
            ctx.arc(canvas.width - 50, 60, 4, 0, Math.PI * 2);
            ctx.arc(70, canvas.height - 70, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw Drill Holes (Drills)
        if (activeLayers.drills) {
            ctx.fillStyle = "#0f172a"; // dark drill hole color
            const drillsList = [
                [35, 35], [canvas.width - 35, 35],
                [35, canvas.height - 35], [canvas.width - 35, canvas.height - 35],
                [50, 60], [50, 90], [canvas.width - 50, 60], [70, canvas.height - 70]
            ];
            drillsList.forEach(([x, y]) => {
                ctx.beginPath();
                ctx.arc(x, y, 2.5, 0, Math.PI * 2);
                ctx.fill();

                // Add silver annular ring around drill
                ctx.strokeStyle = "#94a3b8";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.stroke();
            });
        }

        // Draw Silkscreen (Text & Component Outlines)
        if (activeLayers.silkscreen) {
            const isDarkText = pcbColor === "White" || pcbColor === "Yellow";
            ctx.fillStyle = isDarkText ? "#0f172a" : "#ffffff";
            ctx.strokeStyle = isDarkText ? "#0f172a" : "#ffffff";
            ctx.lineWidth = 1.2;

            // Draw IC silkscreen outlines
            const icX = canvas.width / 2;
            const icY = canvas.height / 2;
            ctx.strokeRect(icX - 42, icY - 42, 84, 84);

            // Draw pin 1 indicator dot
            ctx.beginPath();
            ctx.arc(icX - 35, icY - 35, 2, 0, Math.PI * 2);
            ctx.fill();

            // Text labels
            ctx.font = "bold 9px sans-serif";
            ctx.fillText("U1 (MCU)", icX - 22, icY - 2);
            ctx.fillText("R1", 55, 52);
            ctx.fillText("R2", 55, 82);
            ctx.fillText("C1", canvas.width - 65, 52);
            ctx.fillText("J1", 55, canvas.height - 58);

            // Draw component outline boxes
            ctx.strokeRect(42, 52, 16, 16);
            ctx.strokeRect(42, 82, 16, 16);
            ctx.strokeRect(canvas.width - 58, 52, 16, 16);

            // Large logo/label
            ctx.font = "bold 11px sans-serif";
            ctx.fillText("MEGABYTE CIRCUITS", icX - 60, icY - 95);

            ctx.beginPath();
            ctx.moveTo(icX - 60, icY - 90);
            ctx.lineTo(icX + 60, icY - 90);
            ctx.stroke();
        }
    }, [pcbColor, activeLayers, widthMm, heightMm, layersCount, boardName]);

    return (
        <div className="relative border border-slate-700/80 rounded-xl overflow-hidden bg-[#0f172a] flex items-center justify-center p-4 min-h-[300px] shadow-inner">
            <canvas
                ref={canvasRef}
                width={480}
                height={300}
                className="max-w-full h-auto object-contain rounded-lg shadow-2xl"
            />
            <div className="absolute bottom-2 right-2 bg-slate-900/90 backdrop-blur-xs border border-slate-700/60 text-[10px] font-mono text-emerald-400 px-2.5 py-1 rounded-md shadow-xs">
                {layersCount} LAYERS • {widthMm} x {heightMm} mm
            </div>
        </div>
    );
}
