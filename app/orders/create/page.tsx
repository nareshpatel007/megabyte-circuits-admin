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
    ShieldCheck,
    Search,
    ChevronsUpDown
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import JSZip from "jszip";
import PCBPreviewCanvas from "@/components/PCBPreviewCanvas";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
    const [dimensionUnit, setDimensionUnit] = useState<string>("mm");
    const [quantity, setQuantity] = useState<string>("5");
    const [material, setMaterial] = useState<string>("FR-4");
    const [thickness, setThickness] = useState<string>("1.6mm");
    const [surfaceFinish, setSurfaceFinish] = useState<string>("HASL(Leaded)");
    const [solderMask, setSolderMask] = useState<string>("Green");
    const [pcbColorHex, setPcbColorHex] = useState<string>("#52c41a");
    const [silkscreen, setSilkscreen] = useState<string>("White");
    const [copperWeight, setCopperWeight] = useState<string>("1 oz");
    const [productType, setProductType] = useState<string>("Industrial/Consumer electronics");
    const [differentDesign, setDifferentDesign] = useState<string>("1");
    const [deliveryFormat, setDeliveryFormat] = useState<string>("Single PCB");
    const [materialType, setMaterialType] = useState<string>("FR-4");
    const [goldThickness, setGoldThickness] = useState<string>("1 U*");
    const [viaCovering, setViaCovering] = useState<string>("Not Specified");
    const [viaPlating, setViaPlating] = useState<string>("Not Specified");
    const [minHole, setMinHole] = useState<string>("0.3mm");
    const [confirmFile, setConfirmFile] = useState<string>("No");
    const [markOnPcb, setMarkOnPcb] = useState<string>("Remove Mark");
    const [elecTest, setElecTest] = useState<string>("Flying Probe Fully Test");
    const [goldFingers, setGoldFingers] = useState<string>("No");
    const [castellated, setCastellated] = useState<string>("No");
    const [edgePlating, setEdgePlating] = useState<string>("No");
    const [blindSlots, setBlindSlots] = useState<string>("No");
    const [ulMarking, setUlMarking] = useState<string>("No");
    const [humidity, setHumidity] = useState<string>("No");
    const [kelvinTest, setKelvinTest] = useState<string>("No");
    const [paperBetween, setPaperBetween] = useState<string>("No");
    const [appearanceQuality, setAppearanceQuality] = useState<string>("IPC Class 2 Standard");
    const [silkscreenTech, setSilkscreenTech] = useState<string>("Ink-jet Printing Silkscreen");
    const [inspectionReport, setInspectionReport] = useState<string>("No");
    const [pcbRemark, setPcbRemark] = useState<string>("");

    // Delivery Calendar Matrix Selection State
    const [selectedDay, setSelectedDay] = useState<number>(3);
    const [pricingConfig, setPricingConfig] = useState<{ fixedCosts: any; priceTiers: any } | null>(null);

    // Gerber File & Analysis State
    const [gerberFile, setGerberFile] = useState<File | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [detectionAlert, setDetectionAlert] = useState<string | null>(null);
    const [detectedLayers, setDetectedLayers] = useState<DetectedLayerItem[]>([]);

    // Existing Client Gerber Files State
    const [clientGerberFiles, setClientGerberFiles] = useState<any[]>([]);
    const [loadingClientGerbers, setLoadingClientGerbers] = useState(false);
    const [selectedGerberFileId, setSelectedGerberFileId] = useState<string>("");
    const [gerberMode, setGerberMode] = useState<"select" | "upload">("upload");

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

    // Client Search & Combobox State
    const [clientComboboxOpen, setClientComboboxOpen] = useState(false);
    const [clientSearch, setClientSearch] = useState("");
    const [debouncedClientSearch, setDebouncedClientSearch] = useState("");

    // Fetch dynamic pricing configuration from backend API
    useEffect(() => {
        let active = true;
        async function fetchPricingConfig() {
            try {
                const res = await fetch("/api/pcb-pricing");
                const json = await res.json();
                if (active && json.success && json.data) {
                    setPricingConfig(json.data);
                }
            } catch (err) {
                console.error("Failed to load PCB pricing configuration from API:", err);
            }
        }
        fetchPricingConfig();
        return () => { active = false; };
    }, []);

    const getPriceTiers = (mask: string, weight: string, thicknessVal: number, customTiers?: any) => {
        if (!customTiers) return null;
        const isThickness1_6 = Math.abs(thicknessVal - 1.6) < 0.01;
        const thicknessKey = isThickness1_6 ? 1.6 : 'other';

        return customTiers[mask]?.[weight]?.[thicknessKey] ?? customTiers[mask]?.[weight]?.['other'] ?? customTiers['Other']?.[weight]?.['other'] ?? null;
    };

    // Calculate dynamic 20-day options based on PCB Quote matrix logic
    const getLeadTimePricing = () => {
        const layers = parseInt(layerCount, 10) || 1;
        const unitMultiplier = dimensionUnit === "inches" ? 25.4 : 1;
        const length = (parseFloat(boardWidth) || 0) * unitMultiplier;
        const width = (parseFloat(boardLength) || 0) * unitMultiplier;
        const qty = Math.max(parseInt(quantity, 10) || 3, 3);
        const maskKey = solderMask === "Green" ? "Green" : "Other";
        const cWeight = copperWeight.replace(" ", "");
        const rawThicknessStr = (thickness || "1.6").toString().replace(/[^0-9.]/g, "");
        const thickVal = parseFloat(rawThicknessStr) || 1.6;

        if (length <= 0 || width <= 0 || qty <= 0) {
            return { options: [], showContact: false, totalAreaInSqM: 0 };
        }

        const areaPerBoard = (length * width) / 1000000;
        const totalAreaInSqM = areaPerBoard * qty;
        const areaInSqCm = totalAreaInSqM * 10000;

        const fixedCosts: Record<string, Record<number, number>> = pricingConfig?.fixedCosts || {
            '1': { 1: 3100, 3: 2100, 5: 1600, 7: 1500, 10: 1400, 20: 1000 },
            '2': { 1: 8100, 3: 4100, 5: 2600, 7: 2200, 10: 1900, 20: 1400 },
            '4': { 20: 6000 },
            '6': { 20: 7000 },
            '8': { 20: 8000 },
            '10': { 20: 9000 }
        };

        const priceTiers = getPriceTiers(maskKey, cWeight, thickVal, pricingConfig?.priceTiers);
        if (!priceTiers) {
            return { options: [], showContact: false, totalAreaInSqM };
        }

        let tierKey = "";
        if (totalAreaInSqM <= 0.5) tierKey = "0.5 or less";
        else if (totalAreaInSqM <= 1) tierKey = "0.51 to 1";
        else if (totalAreaInSqM <= 2) tierKey = "1.01 to 2";
        else if (totalAreaInSqM <= 3) tierKey = "2.01 to 3";
        else if (totalAreaInSqM <= 9.99) tierKey = "3.01 to 9.99";
        else {
            return { options: [], showContact: true, totalAreaInSqM };
        }

        const applicablePrices = priceTiers[layers.toString()]?.[tierKey];
        if (!applicablePrices) {
            return { options: [], showContact: false, totalAreaInSqM };
        }

        const daysList = [1, 3, 5, 7, 10, 20];
        const options = daysList.map((day, idx) => {
            let costPerSqCm = applicablePrices[idx];
            if (day === 20) {
                costPerSqCm = (layers >= 4 && layers <= 10)
                    ? applicablePrices[0]
                    : (applicablePrices[4] ?? applicablePrices[0]) * 0.85;
            }

            const fixedCost = fixedCosts[layers.toString()]?.[day];
            if (fixedCost === undefined) {
                return { day, unitPrice: "0.00", orderValue: "0.00", visible: false };
            }
            const variableCost = areaInSqCm * costPerSqCm;
            const totalCost = fixedCost + variableCost;
            const uPrice = totalCost / qty;

            return {
                day,
                unitPrice: uPrice.toFixed(2),
                orderValue: totalCost.toFixed(2),
                visible: true
            };
        });

        let showContact = false;
        if (layers >= 4 && layers <= 10) {
            options.forEach(opt => {
                if (opt.day !== 20) opt.visible = false;
            });
        } else if (layers === 1 || layers === 2) {
            if (layers === 2 && totalAreaInSqM > 7) {
                options.forEach(opt => opt.visible = false);
                showContact = true;
            } else if (layers === 1 && totalAreaInSqM > 10) {
                options.forEach(opt => opt.visible = false);
                showContact = true;
            } else {
                if (layers === 2) {
                    if (totalAreaInSqM > 2) {
                        options.forEach(opt => { if ([1, 3, 5].includes(opt.day)) opt.visible = false; });
                    } else if (totalAreaInSqM > 1.5) {
                        options.forEach(opt => { if ([1, 3].includes(opt.day)) opt.visible = false; });
                    } else if (totalAreaInSqM > 1) {
                        options.forEach(opt => { if (opt.day === 1) opt.visible = false; });
                    }
                } else if (layers === 1) {
                    if (totalAreaInSqM > 5) {
                        options.forEach(opt => { if ([1, 3, 5].includes(opt.day)) opt.visible = false; });
                    } else if (totalAreaInSqM > 3) {
                        options.forEach(opt => { if ([1, 3].includes(opt.day)) opt.visible = false; });
                    } else if (totalAreaInSqM > 2) {
                        options.forEach(opt => { if (opt.day === 1) opt.visible = false; });
                    }
                }
            }
        }

        return { options, showContact, totalAreaInSqM };
    };

    // Debounce search effect (400ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedClientSearch(clientSearch);
        }, 400);
        return () => clearTimeout(timer);
    }, [clientSearch]);

    // Fetch clients for dropdown
    const fetchClientsList = async (autoSelectId?: number, queryStr: string = debouncedClientSearch) => {
        setLoadingClients(true);
        try {
            const token = localStorage.getItem("admin_token");
            let url = "/api/admin/users";
            if (queryStr.trim()) {
                url += `?search=${encodeURIComponent(queryStr.trim())}&q=${encodeURIComponent(queryStr.trim())}`;
            }
            const res = await fetch(url, {
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
                        fetchClientGerbers(newlyAdded.id.toString());
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
        fetchClientsList(undefined, debouncedClientSearch);
    }, [debouncedClientSearch]);

    useEffect(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        setDeliveryDate(d.toISOString().split("T")[0]);
    }, []);

    // Fetch Gerber files for selected client
    const fetchClientGerbers = async (clientId: string) => {
        if (!clientId) {
            setClientGerberFiles([]);
            setSelectedGerberFileId("");
            setGerberMode("upload");
            return;
        }
        setLoadingClientGerbers(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/gerber-files?type=client`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status && Array.isArray(data.data)) {
                // Filter gerber files for this client
                const filtered = data.data.filter((g: any) => g.user_id?.toString() === clientId.toString());
                setClientGerberFiles(filtered);
                if (filtered.length > 0) {
                    setGerberMode("select");
                    setSelectedGerberFileId(filtered[0].id.toString());
                } else {
                    setGerberMode("upload");
                    setSelectedGerberFileId("");
                }
            } else {
                setClientGerberFiles([]);
                setGerberMode("upload");
                setSelectedGerberFileId("");
            }
        } catch (err) {
            console.error("Failed to fetch client gerber files:", err);
            setClientGerberFiles([]);
            setGerberMode("upload");
        } finally {
            setLoadingClientGerbers(false);
        }
    };

    // Handle Client Dropdown Selection
    const handleClientSelect = (clientIdStr: string) => {
        setSelectedClientId(clientIdStr);
        setGerberFile(null);
        setDetectionAlert(null);
        setDetectedLayers([]);
        if (!clientIdStr) {
            setCustomerName("");
            setUserEmail("");
            setUserMobile("");
            setCompanyName("");
            setClientGerberFiles([]);
            setSelectedGerberFileId("");
            setGerberMode("upload");
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
        fetchClientGerbers(clientIdStr);
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

    // Calculate Price & Delivery Date based on Matrix Lead-Time Calculator
    useEffect(() => {
        const { options } = getLeadTimePricing();
        const qtyPcs = parseInt(quantity, 10) || 5;

        // Try to match selectedDay option
        let matched = options.find((o) => o.day === selectedDay && o.visible);
        if (!matched) {
            matched = options.find((o) => o.visible);
        }

        if (matched) {
            setOrderValue(matched.orderValue);
            setUnitPrice(matched.unitPrice);

            // Compute delivery date string
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + matched.day);
            setDeliveryDate(targetDate.toISOString().split("T")[0]);
        } else {
            // Fallback calculation if out of bounds matrix range
            const len = parseFloat(boardWidth) || 100;
            const wid = parseFloat(boardLength) || 100;
            const defaultTotal = Math.max(500, Math.round(((len * wid) / 100 * 0.45 + (parseInt(layerCount) || 2) * 45) * qtyPcs));
            setOrderValue(defaultTotal.toString());
            setUnitPrice((defaultTotal / qtyPcs).toFixed(2));
        }
    }, [boardLength, boardWidth, quantity, layerCount, material, thickness, surfaceFinish, copperWeight, solderMask, selectedDay, pricingConfig]);

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
            formData.append("dimension_unit", dimensionUnit);
            formData.append("quantity", quantity);
            formData.append("material", material);
            formData.append("thickness", thickness);
            formData.append("surface_finish", surfaceFinish);
            formData.append("solder_mask", solderMask);
            formData.append("silkscreen", silkscreen);
            formData.append("copper_weight", copperWeight);

            // Extended Quote Specs Metas
            formData.append("product_type", productType);
            formData.append("different_design", differentDesign);
            formData.append("delivery_format", deliveryFormat);
            formData.append("material_type", materialType);
            formData.append("gold_thickness", goldThickness);
            formData.append("via_covering", viaCovering);
            formData.append("via_plating", viaPlating);
            formData.append("min_hole", minHole);
            formData.append("confirm_file", confirmFile);
            formData.append("mark_on_pcb", markOnPcb);
            formData.append("elec_test", elecTest);
            formData.append("gold_fingers", goldFingers);
            formData.append("castellated", castellated);
            formData.append("edge_plating", edgePlating);
            formData.append("blind_slots", blindSlots);
            formData.append("ul_marking", ulMarking);
            formData.append("humidity", humidity);
            formData.append("kelvin_test", kelvinTest);
            formData.append("paper_between", paperBetween);
            formData.append("appearance_quality", appearanceQuality);
            formData.append("silkscreen_tech", silkscreenTech);
            formData.append("inspection_report", inspectionReport);
            if (pcbRemark) formData.append("pcb_remark", pcbRemark);
            formData.append("lead_time_days", selectedDay.toString());

            // Financials
            formData.append("unit_price", unitPrice);
            formData.append("order_value", orderValue);
            if (deliveryDate) {
                formData.append("delivery_date", deliveryDate);
            }

            // Payment
            formData.append("payment_status", paymentCompleted ? "completed" : "pending");
            formData.append("payment_method", paymentMethod);

            // Gerber File (Upload new file or select existing client file)
            if (gerberMode === "select" && selectedGerberFileId) {
                formData.append("gerber_file_id", selectedGerberFileId);
            } else if (gerberFile) {
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

                        {/* Client Searchable Dropdown (shadcn/ui Combobox) */}
                        <div className="w-full max-w-xl">
                            <label className="text-xs font-bold text-muted-foreground block mb-1.5">
                                Select Client Account <span className="text-red-500">*</span>
                            </label>
                            <input type="hidden" name="selectedClientId" value={selectedClientId} required />

                            <Popover open={clientComboboxOpen} onOpenChange={setClientComboboxOpen}>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        role="combobox"
                                        aria-expanded={clientComboboxOpen}
                                        className="w-full h-11 px-3.5 flex items-center justify-between rounded-xl bg-card border border-border/80 text-xs font-semibold text-foreground hover:bg-accent/40 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-xs transition-all"
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <User className="w-4 h-4 text-emerald-500 shrink-0" />
                                            <span className="truncate">
                                                {selectedClientId ? (() => {
                                                    const selected = clients.find(c => c.id.toString() === selectedClientId);
                                                    if (!selected) return "Select Client Account...";
                                                    const name = selected.name || `${selected.first_name || ''} ${selected.last_name || ''}`.trim();
                                                    return `${name} (${selected.email})${selected.company_name ? ` - ${selected.company_name}` : ''}`;
                                                })() : "Search or select client account..."}
                                            </span>
                                        </div>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-muted-foreground" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-2xl border-border/80 shadow-xl overflow-hidden bg-card text-foreground" align="start">
                                    <Command shouldFilter={false}>
                                        <CommandInput
                                            placeholder="Search client by name, email, phone..."
                                            value={clientSearch}
                                            onValueChange={(val) => setClientSearch(val)}
                                            className="h-10 text-xs font-semibold"
                                        />
                                        <CommandList className="max-h-64 overflow-y-auto">
                                            {loadingClients ? (
                                                <div className="flex items-center justify-center p-4 text-xs font-bold text-muted-foreground gap-2">
                                                    <RefreshCw className="w-4 h-4 text-emerald-500 animate-spin" />
                                                    Searching clients...
                                                </div>
                                            ) : clients.length === 0 ? (
                                                <CommandEmpty className="py-4 text-center text-xs font-medium text-muted-foreground">
                                                    No clients found.
                                                </CommandEmpty>
                                            ) : (
                                                <CommandGroup>
                                                    {(() => {
                                                        let displayList = clients;
                                                        if (!debouncedClientSearch.trim()) {
                                                            displayList = clients.slice(0, 10);
                                                            if (selectedClientId && !displayList.some(c => c.id.toString() === selectedClientId)) {
                                                                const selectedObj = clients.find(c => c.id.toString() === selectedClientId);
                                                                if (selectedObj) displayList = [selectedObj, ...displayList];
                                                            }
                                                        }
                                                        return displayList.map((c) => {
                                                            const isSelected = selectedClientId === c.id.toString();
                                                            const clientName = c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim();
                                                            return (
                                                                <CommandItem
                                                                    key={c.id}
                                                                    value={c.id.toString()}
                                                                    onSelect={() => {
                                                                        handleClientSelect(c.id.toString());
                                                                        setClientComboboxOpen(false);
                                                                    }}
                                                                    className="flex items-center justify-between px-3 py-2.5 text-xs font-medium cursor-pointer hover:bg-accent/60 transition-colors"
                                                                >
                                                                    <div className="flex flex-col gap-0.5 truncate pr-2">
                                                                        <span className="font-bold text-foreground truncate">
                                                                            {clientName} {c.company_name ? `(${c.company_name})` : ''}
                                                                        </span>
                                                                        <span className="text-[11px] text-muted-foreground truncate">
                                                                            {c.email} {c.phone_number ? `· ${c.phone_number}` : ''}
                                                                        </span>
                                                                    </div>
                                                                    {isSelected && <Check className="h-4 w-4 text-emerald-500 shrink-0 ml-2" />}
                                                                </CommandItem>
                                                            );
                                                        });
                                                    })()}
                                                </CommandGroup>
                                            )}
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <p className="text-[11px] text-muted-foreground font-medium mt-1.5">
                                {debouncedClientSearch.trim()
                                    ? `Showing search results for "${debouncedClientSearch}" (${clients.length} found)`
                                    : `Showing first ${Math.min(10, clients.length)} of ${clients.length} clients. Type inside dropdown search to filter dynamically.`}
                            </p>
                        </div>
                    </div>

                    {/* Section 2: PCB Specifications */}
                    <div className="bg-card border border-border/80 rounded-xl p-6 shadow-xs space-y-5">
                        <div className="flex items-center justify-between border-b border-border/60 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                                    <Layers className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">2. PCB Specifications</h3>
                                    <p className="text-xs text-muted-foreground font-medium">Configure detailed board parameters matching Quote page specifications</p>
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

                        {/* Core Quote Options Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Base Material */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Base Material</label>
                                <Select value={material} onValueChange={(val) => {
                                    setMaterial(val);
                                    if (val === "Flex") {
                                        setMaterialType("Polyimide (PI)");
                                        setThickness("0.12mm");
                                        setSurfaceFinish("ENIG");
                                        setCopperWeight("0.5 oz");
                                    } else if (val === "Rogers") {
                                        setMaterialType("RO4350B(Dk=3.48,Df=0.0037)");
                                        setThickness("1.6mm");
                                    } else if (val === "PTFE Teflon") {
                                        setMaterialType("ZYF300CA-P(Dk=3.0,Df=0.0016)");
                                        setThickness("1.6mm");
                                    } else {
                                        setMaterialType("FR4-TG135");
                                        setThickness("1.6mm");
                                    }
                                }}>
                                    <SelectTrigger className="w-full h-10 rounded-xl bg-muted/30 dark:bg-muted/20 border-border/80 text-xs font-semibold text-foreground">
                                        <SelectValue placeholder="Select Base Material" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="FR-4">FR-4 Standard</SelectItem>
                                        <SelectItem value="Flex">Flex (FPC)</SelectItem>
                                        <SelectItem value="Rogers">Rogers Ceramic</SelectItem>
                                        <SelectItem value="PTFE Teflon">PTFE Teflon</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Layer Count */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Layer Count</label>
                                <Select value={layerCount} onValueChange={setLayerCount}>
                                    <SelectTrigger className="w-full h-10 rounded-xl bg-muted/30 dark:bg-muted/20 border-border/80 text-xs font-semibold text-foreground">
                                        <SelectValue placeholder="Select Layers" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1 Layer</SelectItem>
                                        <SelectItem value="2">2 Layers</SelectItem>
                                        <SelectItem value="4">4 Layers</SelectItem>
                                        <SelectItem value="6">6 Layers (High Precision)</SelectItem>
                                        <SelectItem value="8">8 Layers (High Precision)</SelectItem>
                                        <SelectItem value="10">10 Layers (High Precision)</SelectItem>
                                        <SelectItem value="12">12 Layers (High Precision)</SelectItem>
                                        <SelectItem value="14">14 Layers (High Precision)</SelectItem>
                                        <SelectItem value="16">16 Layers (High Precision)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Dimensions */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Dimensions (L x W)</label>
                                <div className="flex items-center gap-1.5">
                                    <Input
                                        type="number"
                                        placeholder="Length"
                                        value={boardLength}
                                        onChange={(e) => setBoardLength(e.target.value)}
                                        className="h-10 rounded-xl bg-muted/30 dark:bg-muted/20 border-border/80 text-xs font-semibold text-foreground"
                                    />
                                    <span className="text-xs text-muted-foreground font-bold">x</span>
                                    <Input
                                        type="number"
                                        placeholder="Width"
                                        value={boardWidth}
                                        onChange={(e) => setBoardWidth(e.target.value)}
                                        className="h-10 rounded-xl bg-muted/30 dark:bg-muted/20 border-border/80 text-xs font-semibold text-foreground"
                                    />
                                    <Select value={dimensionUnit} onValueChange={setDimensionUnit}>
                                        <SelectTrigger className="w-20 h-10 rounded-xl bg-muted/30 dark:bg-muted/20 border-border/80 text-xs font-semibold text-foreground">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="mm">mm</SelectItem>
                                            <SelectItem value="inches">inches</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Quantity */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Quantity (Pcs)</label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="h-10 rounded-xl bg-muted/30 dark:bg-muted/20 border-border/80 text-xs font-semibold text-foreground"
                                />
                            </div>

                            {/* Product Type */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Product Type</label>
                                <Select value={productType} onValueChange={setProductType}>
                                    <SelectTrigger className="w-full h-10 rounded-xl bg-muted/30 dark:bg-muted/20 border-border/80 text-xs font-semibold text-foreground">
                                        <SelectValue placeholder="Select Product Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Industrial/Consumer electronics">Industrial / Consumer Electronics</SelectItem>
                                        <SelectItem value="Aerospace">Aerospace</SelectItem>
                                        <SelectItem value="Medical">Medical</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Different Design */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Different Design Count</label>
                                <Select value={differentDesign} onValueChange={setDifferentDesign}>
                                    <SelectTrigger className="w-full h-10 rounded-xl bg-muted/30 dark:bg-muted/20 border-border/80 text-xs font-semibold text-foreground">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1 Design</SelectItem>
                                        <SelectItem value="2">2 Designs</SelectItem>
                                        <SelectItem value="3">3 Designs</SelectItem>
                                        <SelectItem value="4">4 Designs</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Delivery Format */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Delivery Format</label>
                                <Select value={deliveryFormat} onValueChange={setDeliveryFormat}>
                                    <SelectTrigger className="w-full h-10 rounded-xl bg-muted/30 dark:bg-muted/20 border-border/80 text-xs font-semibold text-foreground">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Single PCB">Single PCB</SelectItem>
                                        <SelectItem value="Panel by Customer">Panel by Customer</SelectItem>
                                        <SelectItem value="Panel by Megabyte Circuit">Panel by Megabyte Circuit</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Board Thickness */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Board Thickness</label>
                                <Select value={thickness} onValueChange={setThickness}>
                                    <SelectTrigger className="w-full h-10 rounded-xl bg-muted/30 dark:bg-muted/20 border-border/80 text-xs font-semibold text-foreground">
                                        <SelectValue placeholder="Select Thickness" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {material === "Flex" ? (
                                            <>
                                                <SelectItem value="0.11mm">0.11 mm</SelectItem>
                                                <SelectItem value="0.12mm">0.12 mm</SelectItem>
                                                <SelectItem value="0.2mm">0.2 mm</SelectItem>
                                            </>
                                        ) : material === "Rogers" ? (
                                            <>
                                                <SelectItem value="0.51mm">0.51 mm</SelectItem>
                                                <SelectItem value="0.76mm">0.76 mm</SelectItem>
                                                <SelectItem value="1.52mm">1.52 mm</SelectItem>
                                            </>
                                        ) : (
                                            <>
                                                <SelectItem value="0.6mm">0.6 mm</SelectItem>
                                                <SelectItem value="0.8mm">0.8 mm</SelectItem>
                                                <SelectItem value="1.0mm">1.0 mm</SelectItem>
                                                <SelectItem value="1.2mm">1.2 mm</SelectItem>
                                                <SelectItem value="1.6mm">1.6 mm</SelectItem>
                                                <SelectItem value="2.0mm">2.0 mm</SelectItem>
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Solder Mask Color */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Solder Mask Color</label>
                                <Select value={solderMask} onValueChange={(val) => {
                                    setSolderMask(val);
                                    const mapHex: Record<string, string> = { Green: "#52c41a", Red: "#f5222d", Blue: "#1677ff", Black: "#000000", White: "#ffffff", Yellow: "#fadb14", Purple: "#722ed1" };
                                    setPcbColorHex(mapHex[val] || "#52c41a");
                                }}>
                                    <SelectTrigger className="w-full h-10 rounded-xl bg-muted/30 dark:bg-muted/20 border-border/80 text-xs font-semibold text-foreground">
                                        <SelectValue placeholder="Select Solder Mask Color" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Green">Green</SelectItem>
                                        <SelectItem value="Red">Red</SelectItem>
                                        <SelectItem value="Blue">Blue</SelectItem>
                                        <SelectItem value="Black">Black</SelectItem>
                                        <SelectItem value="White">White</SelectItem>
                                        <SelectItem value="Yellow">Yellow</SelectItem>
                                        <SelectItem value="Purple">Purple</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Silkscreen Color */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Silkscreen Color</label>
                                <Select value={silkscreen} onValueChange={setSilkscreen}>
                                    <SelectTrigger className="w-full h-10 rounded-xl bg-muted/30 dark:bg-muted/20 border-border/80 text-xs font-semibold text-foreground">
                                        <SelectValue placeholder="Select Silkscreen Color" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="White">White</SelectItem>
                                        <SelectItem value="Black">Black</SelectItem>
                                        <SelectItem value="None">None</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Surface Finish */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Surface Finish</label>
                                <Select value={surfaceFinish} onValueChange={setSurfaceFinish}>
                                    <SelectTrigger className="w-full h-10 rounded-xl bg-muted/30 dark:bg-muted/20 border-border/80 text-xs font-semibold text-foreground">
                                        <SelectValue placeholder="Select Surface Finish" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="HASL(Leaded)">HASL (Leaded)</SelectItem>
                                        <SelectItem value="LeadFree HASL">LeadFree HASL</SelectItem>
                                        <SelectItem value="ENIG">ENIG (Immersion Gold)</SelectItem>
                                        <SelectItem value="OSP">OSP</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Outer Copper Weight */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Outer Copper Weight</label>
                                <Select value={copperWeight} onValueChange={setCopperWeight}>
                                    <SelectTrigger className="w-full h-10 rounded-xl bg-muted/30 dark:bg-muted/20 border-border/80 text-xs font-semibold text-foreground">
                                        <SelectValue placeholder="Select Copper Weight" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1 oz">1 oz</SelectItem>
                                        <SelectItem value="2 oz">2 oz</SelectItem>
                                        {material === "Flex" && <SelectItem value="0.5 oz">0.5 oz</SelectItem>}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Material Type */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Material Type</label>
                                <Select value={materialType} onValueChange={setMaterialType}>
                                    <SelectTrigger className="w-full h-10 rounded-xl bg-muted/30 dark:bg-muted/20 border-border/80 text-xs font-semibold text-foreground">
                                        <SelectValue placeholder="Select Material Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="FR-4">FR-4</SelectItem>
                                        <SelectItem value="Flex">Flex</SelectItem>
                                        <SelectItem value="Rogers">Rogers</SelectItem>
                                        <SelectItem value="PTFE Teflon">PTFE Teflon</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Via Covering */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Via Covering</label>
                                <Select value={viaCovering} onValueChange={setViaCovering}>
                                    <SelectTrigger className="w-full h-10 rounded-xl bg-muted/30 dark:bg-muted/20 border-border/80 text-xs font-semibold text-foreground">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Tented">Tented</SelectItem>
                                        <SelectItem value="Untented">Untented</SelectItem>
                                        <SelectItem value="Plugged">Plugged</SelectItem>
                                        <SelectItem value="Epoxy Filled & Capped">Epoxy Filled & Capped</SelectItem>
                                        <SelectItem value="Not Specified">Not Specified</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Via Plating Method */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Via Plating Method</label>
                                <Select value={viaPlating} onValueChange={setViaPlating}>
                                    <SelectTrigger className="w-full h-10 rounded-xl bg-muted/30 dark:bg-muted/20 border-border/80 text-xs font-semibold text-foreground">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Not Specified">Not Specified</SelectItem>
                                        <SelectItem value="Conductive Adhesive">Conductive Adhesive</SelectItem>
                                        <SelectItem value="Horizontal Electroless Copper Plating">Horizontal Electroless Copper Plating</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Min Hole Size */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Min Via Hole Size</label>
                                <Select value={minHole} onValueChange={setMinHole}>
                                    <SelectTrigger className="w-full h-10 rounded-xl bg-muted/30 dark:bg-muted/20 border-border/80 text-xs font-semibold text-foreground">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0.3mm/(0.4/0.45mm)">0.3mm / (0.4/0.45mm)</SelectItem>
                                        <SelectItem value="0.25mm/(0.35/0.4mm)">0.25mm / (0.35/0.4mm)</SelectItem>
                                        <SelectItem value="0.2mm/(0.3/0.35mm)">0.2mm / (0.3/0.35mm)</SelectItem>
                                        <SelectItem value="0.15mm/(0.25/0.3mm)">0.15mm / (0.25/0.3mm)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Electrical Test */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Electrical Test</label>
                                <Select value={elecTest} onValueChange={setElecTest}>
                                    <SelectTrigger className="w-full h-10 rounded-xl bg-muted/30 dark:bg-muted/20 border-border/80 text-xs font-semibold text-foreground">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Flying Probe Fully Test">Flying Probe Fully Test</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Mark on PCB */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Mark on PCB</label>
                                <Select value={markOnPcb} onValueChange={setMarkOnPcb}>
                                    <SelectTrigger className="w-full h-10 rounded-xl bg-muted/30 dark:bg-muted/20 border-border/80 text-xs font-semibold text-foreground">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Remove Mark">Remove Mark</SelectItem>
                                        <SelectItem value="2D barcode (Serial Number)">2D barcode (Serial Number)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Additional Boolean Badges Grid */}
                        <div className="pt-3 border-t border-border/60">
                            <h4 className="text-xs font-bold text-muted-foreground mb-2.5">High-Spec & Quality Options</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { label: "Gold Fingers", state: goldFingers, setState: setGoldFingers },
                                    { label: "Castellated Holes", state: castellated, setState: setCastellated },
                                    { label: "Edge Plating", state: edgePlating, setState: setEdgePlating },
                                    { label: "Blind Slots", state: blindSlots, setState: setBlindSlots },
                                    { label: "Humidity Card", state: humidity, setState: setHumidity },
                                    { label: "Kelvin Test", state: kelvinTest, setState: setKelvinTest },
                                    { label: "Paper Between PCBs", state: paperBetween, setState: setPaperBetween },
                                    { label: "Confirm Production File", state: confirmFile, setState: setConfirmFile }
                                ].map((opt, idx) => (
                                    <label key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-muted/20 hover:bg-muted/40 border border-border/60 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={opt.state === "Yes"}
                                            onChange={(e) => opt.setState(e.target.checked ? "Yes" : "No")}
                                            className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                                        />
                                        <span className="text-xs font-semibold text-foreground">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Special PCB Remarks */}
                        <div className="pt-2">
                            <label className="text-xs font-bold text-muted-foreground block mb-1">PCB Remarks / Custom Specifications</label>
                            <Input
                                type="text"
                                placeholder="Add optional manufacturing remarks or instructions..."
                                value={pcbRemark}
                                onChange={(e) => setPcbRemark(e.target.value)}
                                className="h-10 rounded-xl bg-muted/30 dark:bg-muted/20 border-border/80 text-xs font-medium text-foreground"
                            />
                        </div>
                    </div>
                    {/* Section 3: Gerber File Selection / Upload Section */}
                    <div className="bg-card border border-border/80 rounded-xl p-6 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/60 pb-3 gap-2">
                            <div>
                                <h3 className="text-sm font-bold text-foreground">3. Gerber File Selection / Upload</h3>
                                <p className="text-xs text-muted-foreground font-medium">
                                    Select an existing client Gerber file or upload a new ZIP/RAR archive
                                </p>
                            </div>
                            {clientGerberFiles.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setGerberMode("select");
                                            if (clientGerberFiles.length > 0 && !selectedGerberFileId) {
                                                setSelectedGerberFileId(clientGerberFiles[0].id.toString());
                                            }
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${gerberMode === "select" ? "bg-emerald-500 text-white shadow-xs" : "bg-muted/50 hover:bg-muted text-muted-foreground"}`}
                                    >
                                        Select Existing File ({clientGerberFiles.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setGerberMode("upload")}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${gerberMode === "upload" ? "bg-emerald-500 text-white shadow-xs" : "bg-muted/50 hover:bg-muted text-muted-foreground"}`}
                                    >
                                        + Upload New File
                                    </button>
                                </div>
                            )}
                        </div>

                        {loadingClientGerbers ? (
                            <div className="p-6 flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground">
                                <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                                Checking client Gerber files...
                            </div>
                        ) : gerberMode === "select" && clientGerberFiles.length > 0 ? (
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-muted-foreground block">Select Existing Gerber File for Client</label>
                                <Select
                                    value={selectedGerberFileId}
                                    onValueChange={(val) => setSelectedGerberFileId(val)}
                                >
                                    <SelectTrigger className="w-full h-11 rounded-xl bg-muted/30 dark:bg-muted/20 border-border/80 text-xs font-semibold text-foreground">
                                        <SelectValue placeholder="Choose a Gerber file" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clientGerberFiles.map((gf) => (
                                            <SelectItem key={gf.id} value={gf.id.toString()} className="text-xs">
                                                <div className="flex items-center gap-2">
                                                    <FileArchive className="w-4 h-4 text-emerald-500 shrink-0" />
                                                    <span className="font-bold">{gf.original_name || gf.file_name}</span>
                                                    <span className="text-muted-foreground">({gf.file_size || 'N/A'}) — {new Date(gf.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                        <span>Selected Gerber file will be linked to this new order upon submission.</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setGerberMode("upload")}
                                        className="text-xs font-bold underline hover:text-emerald-800 dark:hover:text-emerald-100 cursor-pointer"
                                    >
                                        Upload New File Instead
                                    </button>
                                </div>
                            </div>
                        ) : !gerberFile ? (
                            /* Upload Zone */
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
                        ) : (
                            /* Simple File Uploaded Card (No Canvas Live Preview) */
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-extrabold text-foreground">{gerberFile.name}</h4>
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500 text-white">
                                                File Uploaded
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                            Size: {(gerberFile.size / (1024 * 1024)).toFixed(2)} MB • Auto-detected: {layerCount} Layers ({boardWidth} x {boardLength} mm)
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border/80 hover:bg-muted text-foreground text-xs font-bold transition-colors cursor-pointer"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
                                        Re-upload
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
                                        <X className="w-3.5 h-3.5" />
                                        Remove
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 4: Financials & Payment Record (Including Integrated Delivery Calendar) */}
                    <div className="bg-card border border-border/80 rounded-xl p-6 shadow-xs space-y-5">
                        <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                                <CreditCard className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-foreground">4. Financials & Payment Record</h3>
                                <p className="text-xs text-muted-foreground font-medium">Select delivery lead time, review calculated pricing, set expected delivery date, and record manual payment</p>
                            </div>
                        </div>

                        {/* Integrated 20-Day Delivery Lead Time Calendar Selector */}
                        <div className="bg-muted/20 border border-border/80 p-4 rounded-xl space-y-3">
                            {(() => {
                                const { options, showContact } = getLeadTimePricing();

                                if (showContact) {
                                    return (
                                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-center shadow-xs">
                                            <p className="text-xs font-bold text-red-800">For larger bulk PCB orders, please contact customer support directly.</p>
                                        </div>
                                    );
                                }

                                const unitMultiplier = dimensionUnit === "inches" ? 25.4 : 1;
                                const length = (parseFloat(boardWidth) || 0) * unitMultiplier;
                                const width = (parseFloat(boardLength) || 0) * unitMultiplier;
                                const qty = Math.max(parseInt(quantity, 10) || 3, 3);
                                const layers = parseInt(layerCount, 10) || 1;

                                const defaultOrderValue = Math.max(Math.round(length * width * 0.05 * qty), 100);
                                const defaultUnitPrice = (defaultOrderValue / qty).toFixed(2);
                                const getOption = (dayNum: number) => options.find(o => o.day === dayNum && o.visible);

                                const next20Days = Array.from({ length: 20 }, (_, i) => {
                                    const daysAhead = i + 1;
                                    const date = new Date();
                                    date.setDate(date.getDate() + daysAhead);

                                    let matchedOrderValue = defaultOrderValue;
                                    let matchedUnitPrice = parseFloat(defaultUnitPrice);
                                    let visible = false;

                                    if (layers >= 4 && layers <= 10) {
                                        const opt20 = getOption(20);
                                        if (opt20) {
                                            matchedOrderValue = parseFloat(opt20.orderValue);
                                            matchedUnitPrice = parseFloat(opt20.unitPrice);
                                            visible = true;
                                        }
                                    } else {
                                        const interpolate = (d1: number, d2: number, ratio: number = 0.5) => {
                                            const o1 = getOption(d1);
                                            const o2 = getOption(d2);
                                            if (o1 && o2) {
                                                const val1 = parseFloat(o1.orderValue);
                                                const val2 = parseFloat(o2.orderValue);
                                                const u1 = parseFloat(o1.unitPrice);
                                                const u2 = parseFloat(o2.unitPrice);
                                                return {
                                                    orderValue: val1 + (val2 - val1) * ratio,
                                                    unitPrice: u1 + (u2 - u1) * ratio,
                                                    visible: true
                                                };
                                            } else if (o2) {
                                                return { orderValue: parseFloat(o2.orderValue), unitPrice: parseFloat(o2.unitPrice), visible: true };
                                            } else if (o1) {
                                                return { orderValue: parseFloat(o1.orderValue), unitPrice: parseFloat(o1.unitPrice), visible: true };
                                            }
                                            return null;
                                        };

                                        if (daysAhead === 1) {
                                            const o = getOption(1);
                                            if (o) { matchedOrderValue = parseFloat(o.orderValue); matchedUnitPrice = parseFloat(o.unitPrice); visible = true; }
                                        } else if (daysAhead === 2) {
                                            const res = interpolate(1, 3, 0.5);
                                            if (res) { matchedOrderValue = res.orderValue; matchedUnitPrice = res.unitPrice; visible = res.visible; }
                                        } else if (daysAhead === 3) {
                                            const o = getOption(3);
                                            if (o) { matchedOrderValue = parseFloat(o.orderValue); matchedUnitPrice = parseFloat(o.unitPrice); visible = true; }
                                        } else if (daysAhead === 4) {
                                            const res = interpolate(3, 5, 0.5);
                                            if (res) { matchedOrderValue = res.orderValue; matchedUnitPrice = res.unitPrice; visible = res.visible; }
                                        } else if (daysAhead === 5) {
                                            const o = getOption(5);
                                            if (o) { matchedOrderValue = parseFloat(o.orderValue); matchedUnitPrice = parseFloat(o.unitPrice); visible = true; }
                                        } else if (daysAhead === 6) {
                                            const res = interpolate(5, 7, 0.5);
                                            if (res) { matchedOrderValue = res.orderValue; matchedUnitPrice = res.unitPrice; visible = res.visible; }
                                        } else if (daysAhead === 7) {
                                            const o = getOption(7);
                                            if (o) { matchedOrderValue = parseFloat(o.orderValue); matchedUnitPrice = parseFloat(o.unitPrice); visible = true; }
                                        } else if (daysAhead === 8) {
                                            const res = interpolate(7, 10, 1 / 3);
                                            if (res) { matchedOrderValue = res.orderValue; matchedUnitPrice = res.unitPrice; visible = res.visible; }
                                        } else if (daysAhead === 9) {
                                            const res = interpolate(7, 10, 2 / 3);
                                            if (res) { matchedOrderValue = res.orderValue; matchedUnitPrice = res.unitPrice; visible = res.visible; }
                                        } else if (daysAhead >= 10 && daysAhead <= 20) {
                                            const ratio = (daysAhead - 10) / 10;
                                            const res = interpolate(10, 20, ratio);
                                            if (res) { matchedOrderValue = res.orderValue; matchedUnitPrice = res.unitPrice; visible = res.visible; }
                                        }
                                    }

                                    return {
                                        day: daysAhead,
                                        dateNum: date.getDate(),
                                        monthStr: date.toLocaleDateString("en-IN", { month: "short" }),
                                        fullMonthYear: date.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
                                        weekday: date.toLocaleDateString("en-IN", { weekday: "short" }),
                                        formattedDate: date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
                                        orderValue: matchedOrderValue.toFixed(2),
                                        unitPrice: matchedUnitPrice.toFixed(2),
                                        visible
                                    };
                                });

                                const uniqueMonths = Array.from(new Set(next20Days.map(item => item.fullMonthYear)));
                                const calendarHeaderTitle = uniqueMonths.length > 1
                                    ? `${uniqueMonths[0]} - ${uniqueMonths[uniqueMonths.length - 1]}`
                                    : uniqueMonths[0] || new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });

                                return (
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between pb-2 border-b border-border/60">
                                            <div>
                                                <h4 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block ring-2 ring-emerald-500/30" />
                                                    Select Delivery Date & Lead Time
                                                </h4>
                                            </div>
                                            <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border border-emerald-500/30">
                                                {calendarHeaderTitle}
                                            </div>
                                        </div>

                                        {/* 20-Day Interactive Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2">
                                            {next20Days.map((item) => {
                                                const isSelected = selectedDay === item.day;
                                                return (
                                                    <div
                                                        key={item.day}
                                                        onClick={() => {
                                                            if (item.visible) {
                                                                setSelectedDay(item.day);
                                                                setOrderValue(item.orderValue);
                                                                setUnitPrice(item.unitPrice);
                                                                const d = new Date();
                                                                d.setDate(d.getDate() + item.day);
                                                                setDeliveryDate(d.toISOString().split("T")[0]);
                                                            }
                                                        }}
                                                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer select-none flex flex-col justify-between ${!item.visible
                                                            ? "opacity-30 bg-muted/20 border-border/40 cursor-not-allowed"
                                                            : isSelected
                                                                ? "bg-emerald-500 text-white border-emerald-600 shadow-md scale-105"
                                                                : "bg-card hover:bg-emerald-500/10 border-border/80 text-foreground"
                                                            }`}
                                                    >
                                                        <div className="text-[10px] font-bold uppercase opacity-80">{item.weekday}</div>
                                                        <div className="text-base font-black my-0.5">{item.dateNum}</div>
                                                        <div className="text-[10px] font-semibold opacity-90">{item.monthStr}</div>
                                                        <div className={`mt-1 pt-1 border-t text-[11px] font-extrabold ${isSelected ? "border-white/30 text-white" : "border-border/60 text-emerald-600 dark:text-emerald-400"}`}>
                                                            ₹{item.orderValue}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}
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
                                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                            <SelectTrigger className="w-full h-10 rounded-xl bg-card border-border/80 text-xs font-semibold text-foreground">
                                                <SelectValue placeholder="Select Payment Method" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Bank Transfer / NEFT">Bank Transfer / NEFT / RTGS</SelectItem>
                                                <SelectItem value="Cash / Admin Manual">Cash / Admin Manual</SelectItem>
                                                <SelectItem value="UPI / QR">UPI / QR Code</SelectItem>
                                                <SelectItem value="Razorpay Online">Razorpay Online</SelectItem>
                                                <SelectItem value="Credit / Debit Card">Credit / Debit Card</SelectItem>
                                            </SelectContent>
                                        </Select>
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
                                        <Input
                                            type="text"
                                            placeholder="First Name"
                                            value={newClientFirstName}
                                            onChange={(e) => setNewClientFirstName(e.target.value)}
                                            required
                                            className="h-9 rounded-xl bg-muted/30 dark:bg-muted/20 border-border/80 text-xs font-semibold text-foreground"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground block mb-1">
                                            Last Name
                                        </label>
                                        <Input
                                            type="text"
                                            placeholder="Last Name"
                                            value={newClientLastName}
                                            onChange={(e) => setNewClientLastName(e.target.value)}
                                            className="h-9 rounded-xl bg-muted/30 dark:bg-muted/20 border-border/80 text-xs font-semibold text-foreground"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-muted-foreground block mb-1">
                                        Email Address <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        type="email"
                                        placeholder="client@example.com"
                                        value={newClientEmail}
                                        onChange={(e) => setNewClientEmail(e.target.value)}
                                        required
                                        className="h-9 rounded-xl bg-muted/30 dark:bg-muted/20 border-border/80 text-xs font-semibold text-foreground"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground block mb-1">
                                            Phone Number
                                        </label>
                                        <Input
                                            type="text"
                                            placeholder="+91 9876543210"
                                            value={newClientPhone}
                                            onChange={(e) => setNewClientPhone(e.target.value)}
                                            className="h-9 rounded-xl bg-muted/30 dark:bg-muted/20 border-border/80 text-xs font-semibold text-foreground"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground block mb-1">
                                            Company Name
                                        </label>
                                        <Input
                                            type="text"
                                            placeholder="Company (Optional)"
                                            value={newClientCompany}
                                            onChange={(e) => setNewClientCompany(e.target.value)}
                                            className="h-9 rounded-xl bg-muted/30 dark:bg-muted/20 border-border/80 text-xs font-semibold text-foreground"
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
