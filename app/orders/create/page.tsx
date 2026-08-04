"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import {
    ArrowLeft,
    Upload,
    CheckCircle2,
    Users,
    User,
    Mail,
    Phone,
    Building,
    FileArchive,
    CreditCard,
    Layers,
    RefreshCw,
    X,
    UserPlus,
    Sparkles,
    Check,
    FileText,
    RotateCcw,
    ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import JSZip from "jszip";
import PCBPreviewCanvas from "@/components/PCBPreviewCanvas";

interface ClientUser {
    id: number;
    name: string;
    first_name?: string;
    last_name?: string;
    email: string;
    phone_number?: string;
    company_name?: string;
}

interface DetectedLayerItem {
    name: string;
    status: "detected" | "not_detected";
    filename?: string;
}

const GERBER_PATTERNS = {
    topCopper: /\.(gtl|g1|top|cmp)$/i,
    bottomCopper: /\.(gbl|g2|bot|sol)$/i,
    topSolderMask: /\.(gts|tsm|stp)$/i,
    bottomSolderMask: /\.(gbs|bsm|sbs)$/i,
    topSilkscreen: /\.(gto|tsk|plc|sst)$/i,
    bottomSilkscreen: /\.(gbo|bsk|pls|ssb)$/i,
    drills: /\.(drl|txt|xln|tap|drd)$/i,
    outline: /\.(gml|gko|outline|dim|gbr)$/i
};

export default function CreateOrderPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [loadingClients, setLoadingClients] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [clients, setClients] = useState<ClientUser[]>([]);

    // Selected Client
    const [selectedClientId, setSelectedClientId] = useState<string>("");

    // Contact Details (filled from client or edited)
    const [customerName, setCustomerName] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [userMobile, setUserMobile] = useState("");
    const [companyName, setCompanyName] = useState("");

    // Quick Add Client Modal State
    const [quickAddOpen, setQuickAddOpen] = useState(false);
    const [addingClient, setAddingClient] = useState(false);
    const [newClientFirstName, setNewClientFirstName] = useState("");
    const [newClientLastName, setNewClientLastName] = useState("");
    const [newClientEmail, setNewClientEmail] = useState("");
    const [newClientPhone, setNewClientPhone] = useState("");
    const [newClientCompany, setNewClientCompany] = useState("");
    const [newClientPassword, setNewClientPassword] = useState("Client@123");

    // PCB Specifications (Quote Home Page fields)
    const [layerCount, setLayerCount] = useState<string>("2");
    const [boardLength, setBoardLength] = useState<string>("100");
    const [boardWidth, setBoardWidth] = useState<string>("100");
    const [quantity, setQuantity] = useState<string>("5");
    const [material, setMaterial] = useState<string>("FR4");
    const [thickness, setThickness] = useState<string>("1.6");
    const [surfaceFinish, setSurfaceFinish] = useState<string>("HASL with lead");
    const [solderMask, setSolderMask] = useState<string>("Green");
    const [silkscreen, setSilkscreen] = useState<string>("White");
    const [copperWeight, setCopperWeight] = useState<string>("1 oz");

    // Gerber File & Analysis State
    const [gerberFile, setGerberFile] = useState<File | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [detectionAlert, setDetectionAlert] = useState<string | null>(null);
    const [detectedLayers, setDetectedLayers] = useState<DetectedLayerItem[]>([]);

    // Interactive Canvas Layer Toggles
    const [activeLayers, setActiveLayers] = useState({
        outline: true,
        topCopper: true,
        bottomCopper: true,
        solderMask: true,
        silkscreen: true,
        drills: true
    });

    // Pricing & Delivery
    const [unitPrice, setUnitPrice] = useState<string>("500");
    const [orderValue, setOrderValue] = useState<string>("2500");
    const [deliveryDate, setDeliveryDate] = useState<string>("");

    // Manual Payment
    const [paymentCompleted, setPaymentCompleted] = useState<boolean>(false);
    const [paymentMethod, setPaymentMethod] = useState<string>("Cash / Admin Manual");

    // Fetch clients for dropdown
    const fetchClientsList = async (autoSelectId?: number) => {
        setLoadingClients(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/users", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status || data.success) {
                const list: ClientUser[] = data.data || data.users || [];
                setClients(list);

                if (autoSelectId) {
                    const newlyAdded = list.find((c) => c.id === autoSelectId);
                    if (newlyAdded) {
                        setSelectedClientId(newlyAdded.id.toString());
                        const fullName = newlyAdded.name || `${newlyAdded.first_name || ''} ${newlyAdded.last_name || ''}`.trim();
                        setCustomerName(fullName);
                        setUserEmail(newlyAdded.email || "");
                        setUserMobile(newlyAdded.phone_number || "");
                        setCompanyName(newlyAdded.company_name || "");
                    }
                }
            }
        } catch (err) {
            console.error("Failed to load clients list:", err);
        } finally {
            setLoadingClients(false);
        }
    };

    useEffect(() => {
        fetchClientsList();

        const d = new Date();
        d.setDate(d.getDate() + 7);
        setDeliveryDate(d.toISOString().split("T")[0]);
    }, []);

    // Handle Client Dropdown Selection
    const handleClientSelect = (clientIdStr: string) => {
        setSelectedClientId(clientIdStr);
        if (!clientIdStr) {
            setCustomerName("");
            setUserEmail("");
            setUserMobile("");
            setCompanyName("");
            return;
        }
        const found = clients.find((c) => c.id.toString() === clientIdStr);
        if (found) {
            const fullName = found.name || `${found.first_name || ''} ${found.last_name || ''}`.trim();
            setCustomerName(fullName);
            setUserEmail(found.email || "");
            setUserMobile(found.phone_number || "");
            setCompanyName(found.company_name || "");
        }
    };

    // Quick Add Client Submit Handler
    const handleQuickAddClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClientEmail.trim()) {
            toast.error("Email address is required");
            return;
        }
        if (!newClientFirstName.trim() && !newClientLastName.trim()) {
            toast.error("Client name is required");
            return;
        }

        setAddingClient(true);
        try {
            const token = localStorage.getItem("admin_token");
            const fullName = `${newClientFirstName} ${newClientLastName}`.trim();
            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: fullName,
                    first_name: newClientFirstName,
                    last_name: newClientLastName,
                    email: newClientEmail.trim(),
                    phone_number: newClientPhone.trim(),
                    company_name: newClientCompany.trim(),
                    password: newClientPassword || "Client@123"
                })
            });

            const data = await res.json();
            if (res.ok && (data.status || data.success)) {
                toast.success(`Client ${fullName} created successfully!`);
                setQuickAddOpen(false);
                setNewClientFirstName("");
                setNewClientLastName("");
                setNewClientEmail("");
                setNewClientPhone("");
                setNewClientCompany("");

                const createdId = data.data?.id || data.user?.id;
                await fetchClientsList(createdId);
            } else {
                toast.error(data.message || "Failed to add client");
            }
        } catch (err) {
            console.error("Quick add client error:", err);
            toast.error("An error occurred while adding client");
        } finally {
            setAddingClient(false);
        }
    };

    // Calculate Price based on PCB Quote Calculator Formula
    useEffect(() => {
        const lengthMm = parseFloat(boardLength) || 100;
        const widthMm = parseFloat(boardWidth) || 100;
        const qtyPcs = parseInt(quantity) || 5;
        const layers = parseInt(layerCount) || 2;

        const areaCm2 = (lengthMm * widthMm) / 100;

        let layerMult = 1.2;
        if (layers === 1) layerMult = 1.0;
        else if (layers === 4) layerMult = 2.0;
        else if (layers === 6) layerMult = 3.5;
        else if (layers === 8) layerMult = 5.0;

        let matMult = 1.0;
        if (material.includes("Aluminum")) matMult = 1.3;
        else if (material.includes("High TG")) matMult = 1.4;
        else if (material.includes("Rogers")) matMult = 3.0;

        let thickMult = 1.0;
        if (thickness === "0.8" || thickness === "1.0" || thickness === "1.2") thickMult = 1.1;
        else if (thickness === "2.0") thickMult = 1.25;

        let finishMult = 1.0;
        if (surfaceFinish.includes("Lead-free")) finishMult = 1.15;
        else if (surfaceFinish.includes("ENIG")) finishMult = 1.5;

        let copperMult = copperWeight === "2 oz" ? 1.35 : 1.0;

        const baseCostPerBoard = (areaCm2 * 0.45 + layers * 45) * matMult * thickMult * finishMult * copperMult;
        const calculatedTotal = Math.max(500, Math.round(baseCostPerBoard * qtyPcs * layerMult));
        const calculatedUnit = Math.round((calculatedTotal / qtyPcs) * 100) / 100;

        setOrderValue(calculatedTotal.toString());
        setUnitPrice(calculatedUnit.toString());
    }, [boardLength, boardWidth, quantity, layerCount, material, thickness, surfaceFinish, copperWeight]);

    // Handle Gerber File Analysis & Layer/Dimension Extraction (Quote Page Logic)
    const handleFileValidation = async (file: File) => {
        setGerberFile(file);
        setDetectionAlert(null);

        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        if (fileExtension !== 'zip' && fileExtension !== 'rar') {
            toast.error("Please upload a Gerber file in .zip or .rar format.");
            return;
        }

        setIsValidating(true);

        if (fileExtension === 'zip') {
            try {
                const zip = await JSZip.loadAsync(file);
                const fileNames = Object.keys(zip.files);

                const layersObj = {
                    topCopper: { name: "Top Copper Layer", detected: false, file: "" },
                    bottomCopper: { name: "Bottom Copper Layer", detected: false, file: "" },
                    topSolderMask: { name: "Top Solder Mask", detected: false, file: "" },
                    bottomSolderMask: { name: "Bottom Solder Mask", detected: false, file: "" },
                    topSilkscreen: { name: "Top Silkscreen", detected: false, file: "" },
                    bottomSilkscreen: { name: "Bottom Silkscreen", detected: false, file: "" },
                    drills: { name: "Drill Holes", detected: false, file: "" },
                    outline: { name: "Board Outline", detected: false, file: "" }
                };

                let gerberCount = 0;

                fileNames.forEach(name => {
                    if (zip.files[name].dir) return;

                    const lowerName = name.toLowerCase();
                    if (GERBER_PATTERNS.topCopper.test(name)) {
                        layersObj.topCopper.detected = true;
                        layersObj.topCopper.file = name;
                        gerberCount++;
                    } else if (GERBER_PATTERNS.bottomCopper.test(name)) {
                        layersObj.bottomCopper.detected = true;
                        layersObj.bottomCopper.file = name;
                        gerberCount++;
                    } else if (GERBER_PATTERNS.topSolderMask.test(name)) {
                        layersObj.topSolderMask.detected = true;
                        layersObj.topSolderMask.file = name;
                        gerberCount++;
                    } else if (GERBER_PATTERNS.bottomSolderMask.test(name)) {
                        layersObj.bottomSolderMask.detected = true;
                        layersObj.bottomSolderMask.file = name;
                        gerberCount++;
                    } else if (GERBER_PATTERNS.topSilkscreen.test(name)) {
                        layersObj.topSilkscreen.detected = true;
                        layersObj.topSilkscreen.file = name;
                        gerberCount++;
                    } else if (GERBER_PATTERNS.bottomSilkscreen.test(name)) {
                        layersObj.bottomSilkscreen.detected = true;
                        layersObj.bottomSilkscreen.file = name;
                        gerberCount++;
                    } else if (GERBER_PATTERNS.drills.test(name)) {
                        layersObj.drills.detected = true;
                        layersObj.drills.file = name;
                        gerberCount++;
                    } else if (GERBER_PATTERNS.outline.test(name) || lowerName.endsWith('.gbr')) {
                        layersObj.outline.detected = true;
                        layersObj.outline.file = name;
                        gerberCount++;
                    }
                });

                const detectedArray: DetectedLayerItem[] = Object.entries(layersObj).map(([_, val]) => ({
                    name: val.name,
                    status: val.detected ? "detected" as const : "not_detected" as const,
                    filename: val.file || undefined
                }));
                setDetectedLayers(detectedArray);

                // Auto-detect Layer Count
                let copperLayersCount = 0;
                if (layersObj.topCopper.detected) copperLayersCount++;
                if (layersObj.bottomCopper.detected) copperLayersCount++;
                const finalLayersCount = copperLayersCount > 0 ? copperLayersCount.toString() : "2";
                setLayerCount(finalLayersCount);

                // Parse Board Outline coordinates for dimensions
                let parsedWidth = 91.62;
                let parsedHeight = 54.35;

                if (layersObj.outline.file) {
                    try {
                        const outlineContent = await zip.files[layersObj.outline.file].async("string");

                        let isMetric = true;
                        if (outlineContent.includes("G70") || outlineContent.includes("%MOIN*%")) {
                            isMetric = false;
                        }

                        let divisor = 10000;
                        const formatMatch = outlineContent.match(/%FSLAX(\d)(\d)Y/i);
                        if (formatMatch) {
                            divisor = Math.pow(10, parseInt(formatMatch[2], 10));
                        }

                        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                        let currentX = 0, currentY = 0;

                        const lines = outlineContent.split('\n');
                        lines.forEach(line => {
                            const xMatch = line.match(/X(-?\d+)/i);
                            const yMatch = line.match(/Y(-?\d+)/i);

                            if (xMatch) currentX = parseInt(xMatch[1], 10) / divisor;
                            if (yMatch) currentY = parseInt(yMatch[1], 10) / divisor;

                            if (xMatch || yMatch) {
                                if (currentX < minX) minX = currentX;
                                if (currentX > maxX) maxX = currentX;
                                if (currentY < minY) minY = currentY;
                                if (currentY > maxY) maxY = currentY;
                            }
                        });

                        if (minX !== Infinity && maxX !== -Infinity && minY !== Infinity && maxY !== -Infinity) {
                            let w = maxX - minX;
                            let h = maxY - minY;

                            if (!isMetric) {
                                w = w * 25.4;
                                h = h * 25.4;
                            }

                            if (w > 1 && h > 1 && w < 1000 && h < 1000) {
                                parsedWidth = parseFloat(w.toFixed(2));
                                parsedHeight = parseFloat(h.toFixed(2));
                            }
                        }
                    } catch (e) {
                        console.error("Failed to parse outline coordinates", e);
                    }
                }

                setBoardLength(parsedHeight.toString());
                setBoardWidth(parsedWidth.toString());
                toast.success("Gerber ZIP file parsed & board parameters auto-detected!");
            } catch (err) {
                console.error("ZIP validation error:", err);
                toast.error("Failed to parse ZIP archive.");
            }
        }
        setIsValidating(false);
    };

    // Handle Submit Form
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClientId) {
            toast.error("Please select a client or click '+ Quick Add Client'");
            return;
        }

        setSubmitting(true);
        try {
            const selectedClientObj = clients.find((c) => c.id.toString() === selectedClientId);
            const defaultBoardName = gerberFile ? gerberFile.name.replace(/\.[^/.]+$/, "") : `${selectedClientObj?.name || 'PCB'}_Order`;

            const formData = new FormData();
            formData.append("board_name", defaultBoardName);
            formData.append("user_id", selectedClientId);
            formData.append("customer_name", customerName);
            formData.append("user_email", userEmail);
            formData.append("user_mobile", userMobile);
            formData.append("company_name", companyName);

            // PCB Parameters
            formData.append("layers", layerCount);
            formData.append("dimensions_length", boardLength);
            formData.append("dimensions_width", boardWidth);
            formData.append("quantity", quantity);
            formData.append("material", material);
            formData.append("thickness", thickness);
            formData.append("surface_finish", surfaceFinish);
            formData.append("solder_mask", solderMask);
            formData.append("silkscreen", silkscreen);
            formData.append("copper_weight", copperWeight);

            // Financials
            formData.append("unit_price", unitPrice);
            formData.append("order_value", orderValue);
            if (deliveryDate) {
                formData.append("delivery_date", deliveryDate);
            }

            // Payment
            formData.append("payment_status", paymentCompleted ? "completed" : "pending");
            formData.append("payment_method", paymentMethod);

            // Gerber File
            if (gerberFile) {
                formData.append("gerber_file", gerberFile);
            }

            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/orders", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            const data = await res.json();
            if (res.ok && (data.status || data.success)) {
                toast.success(`Order ${data.data?.order_number || ''} created successfully!`);
                router.push("/orders");
            } else {
                toast.error(data.message || "Failed to create order");
            }
        } catch (err) {
            console.error("Order creation error:", err);
            toast.error("An error occurred while creating the order");
        } finally {
            setSubmitting(false);
        }
    };

    const backButton = (
        <Link
            href="/orders"
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border/80 hover:bg-muted text-foreground rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            Back to Orders
        </Link>
    );

    return (
        <DashboardLayout
            title="Create New Order"
            subtitle="Manually create a PCB order with parameters, client selection, Gerber upload, and payment status"
            action={backButton}
        >
            {/* Hidden File Input for Re-uploading Gerber */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".zip,.rar,.7z,.gz"
                onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                        handleFileValidation(e.target.files[0]);
                    }
                }}
                className="hidden"
            />

            <div className="space-y-6 w-full pb-12">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Section 1: Client Selection & Quick Add */}
                    <div className="bg-card border border-border/80 rounded-xl p-6 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/60 pb-3 gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">1. Select Client Account</h3>
                                    <p className="text-xs text-muted-foreground font-medium">Select a registered client or add a new client quickly</p>
                                </div>
                            </div>

                            {/* Quick Add Client Button */}
                            <button
                                type="button"
                                onClick={() => setQuickAddOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-colors cursor-pointer"
                            >
                                <UserPlus className="w-4 h-4" />
                                + Quick Add Client
                            </button>
                        </div>

                        {/* Client Dropdown */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">
                                    Select Client <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={selectedClientId}
                                    onChange={(e) => handleClientSelect(e.target.value)}
                                    required
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/80 text-xs font-semibold text-foreground focus:outline-none focus:border-emerald-500 cursor-pointer shadow-xs"
                                >
                                    <option value="">-- Select Client Account --</option>
                                    {clients.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim()} ({c.email}) {c.company_name ? `- ${c.company_name}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Selected Client Contact Details (Auto-filled) */}
                        {selectedClientId && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-border/40 bg-muted/10 p-4 rounded-xl">
                                <div>
                                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">Customer Name</label>
                                    <input
                                        type="text"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="w-full px-3 py-1.5 rounded-lg bg-card border border-border/80 text-xs font-semibold text-foreground focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={userEmail}
                                        onChange={(e) => setUserEmail(e.target.value)}
                                        className="w-full px-3 py-1.5 rounded-lg bg-card border border-border/80 text-xs font-semibold text-foreground focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">Phone Number</label>
                                    <input
                                        type="text"
                                        value={userMobile}
                                        onChange={(e) => setUserMobile(e.target.value)}
                                        className="w-full px-3 py-1.5 rounded-lg bg-card border border-border/80 text-xs font-semibold text-foreground focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">Company Name</label>
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className="w-full px-3 py-1.5 rounded-lg bg-card border border-border/80 text-xs font-semibold text-foreground focus:outline-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 2: PCB Specifications */}
                    <div className="bg-card border border-border/80 rounded-xl p-6 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-border/60 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                                    <Layers className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">2. PCB Specifications</h3>
                                    <p className="text-xs text-muted-foreground font-medium">Configure board parameters</p>
                                </div>
                            </div>
                        </div>

                        {/* Gerber Analysis Alert */}
                        {detectionAlert && (
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                                <Sparkles className="w-4 h-4 shrink-0" />
                                <span>{detectionAlert}</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Layers */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Layer Count</label>
                                <select
                                    value={layerCount}
                                    onChange={(e) => setLayerCount(e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/80 text-xs font-semibold text-foreground focus:outline-none focus:border-emerald-500 shadow-xs"
                                >
                                    <option value="1">1 Layer</option>
                                    <option value="2">2 Layers</option>
                                    <option value="4">4 Layers</option>
                                    <option value="6">6 Layers</option>
                                    <option value="8">8 Layers</option>
                                </select>
                            </div>

                            {/* Dimensions */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Dimensions (L x W mm)</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        placeholder="Length"
                                        value={boardLength}
                                        onChange={(e) => setBoardLength(e.target.value)}
                                        className="w-full px-3.5 py-2 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/80 text-xs font-semibold text-foreground focus:outline-none focus:border-emerald-500 shadow-xs"
                                    />
                                    <span className="text-xs text-muted-foreground font-bold">x</span>
                                    <input
                                        type="number"
                                        placeholder="Width"
                                        value={boardWidth}
                                        onChange={(e) => setBoardWidth(e.target.value)}
                                        className="w-full px-3.5 py-2 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/80 text-xs font-semibold text-foreground focus:outline-none focus:border-emerald-500 shadow-xs"
                                    />
                                </div>
                            </div>

                            {/* Quantity */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Quantity (Pcs)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/80 text-xs font-semibold text-foreground focus:outline-none focus:border-emerald-500 shadow-xs"
                                />
                            </div>

                            {/* Material */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Material</label>
                                <select
                                    value={material}
                                    onChange={(e) => setMaterial(e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/80 text-xs font-semibold text-foreground focus:outline-none focus:border-emerald-500 shadow-xs"
                                >
                                    <option value="FR4">FR4 Standard</option>
                                    <option value="Aluminum">Aluminum Core</option>
                                    <option value="High TG FR4">High TG FR-4</option>
                                    <option value="Rogers">Rogers Ceramic</option>
                                </select>
                            </div>

                            {/* Thickness */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Board Thickness</label>
                                <select
                                    value={thickness}
                                    onChange={(e) => setThickness(e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/80 text-xs font-semibold text-foreground focus:outline-none focus:border-emerald-500 shadow-xs"
                                >
                                    <option value="0.6">0.6 mm</option>
                                    <option value="0.8">0.8 mm</option>
                                    <option value="1.0">1.0 mm</option>
                                    <option value="1.2">1.2 mm</option>
                                    <option value="1.6">1.6 mm</option>
                                    <option value="2.0">2.0 mm</option>
                                </select>
                            </div>

                            {/* Surface Finish */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Surface Finish</label>
                                <select
                                    value={surfaceFinish}
                                    onChange={(e) => setSurfaceFinish(e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/80 text-xs font-semibold text-foreground focus:outline-none focus:border-emerald-500 shadow-xs"
                                >
                                    <option value="HASL with lead">HASL with lead</option>
                                    <option value="Lead-free HASL">Lead-free HASL</option>
                                    <option value="ENIG / Immersion Gold">ENIG (Immersion Gold)</option>
                                </select>
                            </div>

                            {/* Solder Mask Color */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Solder Mask Color</label>
                                <select
                                    value={solderMask}
                                    onChange={(e) => setSolderMask(e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/80 text-xs font-semibold text-foreground focus:outline-none focus:border-emerald-500 shadow-xs"
                                >
                                    <option value="Green">Green</option>
                                    <option value="Red">Red</option>
                                    <option value="Blue">Blue</option>
                                    <option value="Black">Black</option>
                                    <option value="White">White</option>
                                    <option value="Yellow">Yellow</option>
                                </select>
                            </div>

                            {/* Silkscreen Color */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Silkscreen Color</label>
                                <select
                                    value={silkscreen}
                                    onChange={(e) => setSilkscreen(e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/80 text-xs font-semibold text-foreground focus:outline-none focus:border-emerald-500 shadow-xs"
                                >
                                    <option value="White">White</option>
                                    <option value="Black">Black</option>
                                    <option value="None">None</option>
                                </select>
                            </div>

                            {/* Copper Weight */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Outer Copper Weight</label>
                                <select
                                    value={copperWeight}
                                    onChange={(e) => setCopperWeight(e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/80 text-xs font-semibold text-foreground focus:outline-none focus:border-emerald-500 shadow-xs"
                                >
                                    <option value="1 oz">1 oz</option>
                                    <option value="2 oz">2 oz</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Gerber Upload Zone OR Full Preview Section (Quote Page Layout) */}
                    {!gerberFile ? (
                        /* Upload Zone (Shown when NO file uploaded) */
                        <div className="bg-card border border-border/80 rounded-xl p-6 shadow-xs space-y-4">
                            <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">3. Upload Gerber File</h3>
                                    <p className="text-xs text-muted-foreground font-medium">Upload Gerber ZIP file to analyze parameters and generate live board preview</p>
                                </div>
                            </div>

                            <div className="border-2 border-dashed border-border/80 hover:border-emerald-500/50 rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors bg-muted/10">
                                <FileArchive className="w-12 h-12 text-emerald-500 mb-3" />
                                {isValidating ? (
                                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-500">
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                        Validating & extracting Gerber files...
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                                        >
                                            <Upload className="w-4 h-4" />
                                            Add Gerber File
                                        </button>
                                        <p className="text-xs text-muted-foreground">Only accept zip or rar archives, Max 100 MB</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Full Width Gerber Verification Review & Live Preview Section (Quote Page Design) */
                        <div className="bg-card border border-border/80 rounded-xl p-6 shadow-xs space-y-6">
                            {/* Review Header Bar with Re-upload Button */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/60 pb-4 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-base font-extrabold text-foreground">{gerberFile.name}</h3>
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                Verified & Analyzed
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                            {(gerberFile.size / (1024 * 1024)).toFixed(2)} MB • Auto-filled parameters: {layerCount} Layers ({boardWidth} x {boardLength} mm)
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons: Re-upload Gerber & Remove File */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/60 hover:bg-muted border border-border/80 text-foreground text-xs font-bold transition-colors cursor-pointer"
                                    >
                                        <RotateCcw className="w-4 h-4 text-emerald-500" />
                                        Re-upload Gerber File
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setGerberFile(null);
                                            setDetectionAlert(null);
                                            setDetectedLayers([]);
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold transition-colors cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                        Remove
                                    </button>
                                </div>
                            </div>

                            {/* Full Section Grid: Layer Inspection vs PCB Canvas Visualizer */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Left Side: Detected Archive Layers & Controls (5 Cols) */}
                                <div className="lg:col-span-5 space-y-4">
                                    {/* Detected Archive Layers List */}
                                    <div className="bg-muted/20 border border-border/80 rounded-xl p-4 space-y-3">
                                        <h4 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                            <span>Detected Archive Layers</span>
                                            <span className="text-emerald-500 font-mono text-[10px]">
                                                {detectedLayers.filter(l => l.status === 'detected').length} Layers Detected
                                            </span>
                                        </h4>

                                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                            {detectedLayers.map((layer, index) => (
                                                <div key={index} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-b-0 text-xs">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className={`w-2 h-2 rounded-full shrink-0 ${layer.status === 'detected' ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                                                        <span className="font-semibold text-foreground truncate">{layer.name}</span>
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[140px]" title={layer.filename}>
                                                        {layer.filename ? layer.filename.split('/').pop() : "Not Found"}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Interactive Visualizer Controls */}
                                    <div className="bg-muted/20 border border-border/80 rounded-xl p-4 space-y-3">
                                        <h4 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">
                                            Visualizer Controls
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {Object.entries({
                                                outline: "Board Outline",
                                                topCopper: "Top Copper",
                                                bottomCopper: "Bottom Copper",
                                                solderMask: "Solder Mask Grid",
                                                silkscreen: "Silkscreen Layer",
                                                drills: "Drill Holes"
                                            }).map(([key, label]) => (
                                                <label key={key} className="flex items-center gap-2 cursor-pointer py-1.5 px-2 rounded-lg hover:bg-muted/40 transition-colors select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={(activeLayers as any)[key]}
                                                        onChange={(e) => setActiveLayers(prev => ({ ...prev, [key]: e.target.checked }))}
                                                        className="rounded text-emerald-500 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                                                    />
                                                    <span className="text-xs text-foreground font-semibold">{label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Full Interactive PCB Preview Canvas (7 Cols) */}
                                <div className="lg:col-span-7 flex flex-col justify-center">
                                    <PCBPreviewCanvas
                                        pcbColor={solderMask}
                                        activeLayers={activeLayers}
                                        widthMm={boardWidth}
                                        heightMm={boardLength}
                                        layersCount={layerCount}
                                        boardName={gerberFile ? gerberFile.name.replace(/\.[^/.]+$/, "") : "PCB BOARD"}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Section 4: Pricing & Payment Record */}
                    <div className="bg-card border border-border/80 rounded-xl p-6 shadow-xs space-y-4">
                        <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                                <CreditCard className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-foreground">4. Financials & Payment Record</h3>
                                <p className="text-xs text-muted-foreground font-medium">Review calculated pricing, set expected delivery date, and record manual payment</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Unit Price (₹)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={unitPrice}
                                    onChange={(e) => setUnitPrice(e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/80 text-xs font-bold text-foreground focus:outline-none focus:border-emerald-500 shadow-xs"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Total Order Value (₹)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={orderValue}
                                    onChange={(e) => setOrderValue(e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/80 text-xs font-black text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-emerald-500 shadow-xs"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Expected Delivery Date</label>
                                <input
                                    type="date"
                                    value={deliveryDate}
                                    onChange={(e) => setDeliveryDate(e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/80 text-xs font-semibold text-foreground focus:outline-none focus:border-emerald-500 shadow-xs"
                                />
                            </div>
                        </div>

                        {/* Manual Payment Section */}
                        <div className="pt-2 border-t border-border/60 space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={paymentCompleted}
                                    onChange={(e) => setPaymentCompleted(e.target.checked)}
                                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 border-border/80 bg-muted/30 cursor-pointer"
                                />
                                <span className="text-xs font-bold text-foreground">Mark Payment Completed Manually</span>
                            </label>

                            {paymentCompleted && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 border border-border/80 p-4 rounded-xl">
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground block mb-1">Payment Method</label>
                                        <select
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="w-full px-3.5 py-2 rounded-xl bg-card border border-border/80 text-xs font-semibold text-foreground focus:outline-none focus:border-emerald-500 shadow-xs"
                                        >
                                            <option value="Bank Transfer / NEFT">Bank Transfer / NEFT / RTGS</option>
                                            <option value="Cash / Admin Manual">Cash / Admin Manual</option>
                                            <option value="UPI / QR">UPI / QR Code</option>
                                            <option value="Razorpay Online">Razorpay Online</option>
                                            <option value="Credit / Debit Card">Credit / Debit Card</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col justify-end text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                                        ✓ A transaction record for ₹{orderValue} will be automatically generated and linked with this order.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Submit Bar */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/80">
                        <Link
                            href="/orders"
                            className="px-5 py-2.5 bg-muted hover:bg-muted/80 text-foreground rounded-xl text-xs font-bold transition-colors"
                        >
                            Cancel
                        </Link>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                            {submitting ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Creating Order...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Submit & Create Order
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Quick Add Client Modal */}
                {quickAddOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
                        <div className="bg-card border border-border/80 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-border/60 pb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                                        <UserPlus className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-extrabold text-foreground">Quick Add Client</h3>
                                        <p className="text-xs text-muted-foreground font-medium">Add minimum required client details</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setQuickAddOpen(false)}
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleQuickAddClient} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground block mb-1">
                                            First Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="First Name"
                                            value={newClientFirstName}
                                            onChange={(e) => setNewClientFirstName(e.target.value)}
                                            required
                                            className="w-full px-3.5 py-2 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/80 text-xs font-semibold text-foreground focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground block mb-1">
                                            Last Name
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Last Name"
                                            value={newClientLastName}
                                            onChange={(e) => setNewClientLastName(e.target.value)}
                                            className="w-full px-3.5 py-2 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/80 text-xs font-semibold text-foreground focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-muted-foreground block mb-1">
                                        Email Address <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="client@example.com"
                                        value={newClientEmail}
                                        onChange={(e) => setNewClientEmail(e.target.value)}
                                        required
                                        className="w-full px-3.5 py-2 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/80 text-xs font-semibold text-foreground focus:outline-none focus:border-emerald-500"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground block mb-1">
                                            Phone Number
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="+91 9876543210"
                                            value={newClientPhone}
                                            onChange={(e) => setNewClientPhone(e.target.value)}
                                            className="w-full px-3.5 py-2 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/80 text-xs font-semibold text-foreground focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground block mb-1">
                                            Company Name
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Company (Optional)"
                                            value={newClientCompany}
                                            onChange={(e) => setNewClientCompany(e.target.value)}
                                            className="w-full px-3.5 py-2 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/80 text-xs font-semibold text-foreground focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/80">
                                    <button
                                        type="button"
                                        onClick={() => setQuickAddOpen(false)}
                                        disabled={addingClient}
                                        className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={addingClient}
                                        className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                                    >
                                        {addingClient ? (
                                            <>
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                Adding Client...
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus className="w-3.5 h-3.5" />
                                                Add & Select Client
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
