export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  pcbType: string;
  amount: number;
  status: 'Pending' | 'In Review' | 'Sent to JLC' | 'Manufacturing' | 'Shipped' | 'Cancelled';
  params: {
    baseMaterial: string;
    layers: number;
    dimensions: string;
    copperThickness: string;
    maskColor: string;
    surfaceFinish: string;
  };
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  gstin: string;
  address: string;
  totalOrders: number;
  totalSpent: number;
  joinedDate: string;
  status: 'Active' | 'Inactive';
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
  availableQuantity: number;
  lowStockThreshold: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

export const mockOrders: Order[] = [
  {
    id: "ORD-2023-1001", clientId: "CLI-001", clientName: "TechNova Solutions", date: "2023-10-24", pcbType: "FR4 Standard", amount: 45000, status: "Manufacturing",
    params: { baseMaterial: "FR-4 TG150", layers: 4, dimensions: "100x80", copperThickness: "1 oz", maskColor: "Green", surfaceFinish: "ENIG" }
  },
  {
    id: "ORD-2023-1002", clientId: "CLI-002", clientName: "AeroDynamics India", date: "2023-10-23", pcbType: "Aluminum", amount: 12500, status: "Pending",
    params: { baseMaterial: "Aluminum", layers: 1, dimensions: "50x50", copperThickness: "2 oz", maskColor: "White", surfaceFinish: "HASL" }
  },
  {
    id: "ORD-2023-1003", clientId: "CLI-003", clientName: "Quantum Robotics", date: "2023-10-22", pcbType: "Flex PCB", amount: 89000, status: "Sent to JLC",
    params: { baseMaterial: "Polyimide", layers: 2, dimensions: "120x40", copperThickness: "0.5 oz", maskColor: "Yellow", surfaceFinish: "Immersion Gold" }
  },
  {
    id: "ORD-2023-1004", clientId: "CLI-004", clientName: "Vidyut Electronics", date: "2023-10-21", pcbType: "FR4 Standard", amount: 22000, status: "Shipped",
    params: { baseMaterial: "FR-4 TG130", layers: 2, dimensions: "80x80", copperThickness: "1 oz", maskColor: "Red", surfaceFinish: "HASL Lead Free" }
  },
  {
    id: "ORD-2023-1005", clientId: "CLI-005", clientName: "Pinnacle IoT", date: "2023-10-21", pcbType: "High Frequency", amount: 156000, status: "In Review",
    params: { baseMaterial: "Rogers 4350B", layers: 6, dimensions: "150x100", copperThickness: "1 oz", maskColor: "Blue", surfaceFinish: "ENIG" }
  },
  {
    id: "ORD-2023-1006", clientId: "CLI-001", clientName: "TechNova Solutions", date: "2023-10-20", pcbType: "FR4 Standard", amount: 34000, status: "Cancelled",
    params: { baseMaterial: "FR-4 TG150", layers: 4, dimensions: "90x90", copperThickness: "1 oz", maskColor: "Green", surfaceFinish: "HASL" }
  },
  {
    id: "ORD-2023-1007", clientId: "CLI-006", clientName: "Spark Embedded", date: "2023-10-19", pcbType: "Rigid-Flex", amount: 112000, status: "Manufacturing",
    params: { baseMaterial: "FR4 + PI", layers: 4, dimensions: "60x40", copperThickness: "1 oz", maskColor: "Black", surfaceFinish: "ENIG" }
  },
  {
    id: "ORD-2023-1008", clientId: "CLI-007", clientName: "Nexus Hardware", date: "2023-10-18", pcbType: "FR4 Standard", amount: 18500, status: "Shipped",
    params: { baseMaterial: "FR-4 TG130", layers: 2, dimensions: "100x100", copperThickness: "1 oz", maskColor: "Green", surfaceFinish: "HASL" }
  },
  {
    id: "ORD-2023-1009", clientId: "CLI-008", clientName: "Zephyr Tech", date: "2023-10-18", pcbType: "Aluminum", amount: 27500, status: "Sent to JLC",
    params: { baseMaterial: "Aluminum", layers: 1, dimensions: "120x60", copperThickness: "2 oz", maskColor: "White", surfaceFinish: "OSP" }
  },
  {
    id: "ORD-2023-1010", clientId: "CLI-009", clientName: "Omni Circuits", date: "2023-10-17", pcbType: "HDI", amount: 210000, status: "In Review",
    params: { baseMaterial: "FR-4 TG170", layers: 8, dimensions: "200x150", copperThickness: "1 oz", maskColor: "Matte Black", surfaceFinish: "ENIG" }
  },
  {
    id: "ORD-2023-1011", clientId: "CLI-010", clientName: "Indus Controllers", date: "2023-10-16", pcbType: "FR4 Standard", amount: 4500, status: "Pending",
    params: { baseMaterial: "FR-4 TG130", layers: 2, dimensions: "50x30", copperThickness: "1 oz", maskColor: "Green", surfaceFinish: "HASL" }
  },
  {
    id: "ORD-2023-1012", clientId: "CLI-011", clientName: "Vortex Systems", date: "2023-10-15", pcbType: "Flex PCB", amount: 56000, status: "Shipped",
    params: { baseMaterial: "Polyimide", layers: 2, dimensions: "80x20", copperThickness: "0.5 oz", maskColor: "Yellow", surfaceFinish: "Immersion Gold" }
  },
  {
    id: "ORD-2023-1013", clientId: "CLI-012", clientName: "Horizon Auto", date: "2023-10-14", pcbType: "Copper Core", amount: 89000, status: "Manufacturing",
    params: { baseMaterial: "Copper Core", layers: 1, dimensions: "100x100", copperThickness: "3 oz", maskColor: "White", surfaceFinish: "OSP" }
  },
  {
    id: "ORD-2023-1014", clientId: "CLI-013", clientName: "Aura Devices", date: "2023-10-14", pcbType: "FR4 Standard", amount: 15000, status: "Shipped",
    params: { baseMaterial: "FR-4 TG150", layers: 4, dimensions: "70x70", copperThickness: "1 oz", maskColor: "Blue", surfaceFinish: "ENIG" }
  },
  {
    id: "ORD-2023-1015", clientId: "CLI-014", clientName: "Crest Electronics", date: "2023-10-13", pcbType: "High Frequency", amount: 134000, status: "Sent to JLC",
    params: { baseMaterial: "PTFE", layers: 2, dimensions: "90x60", copperThickness: "1 oz", maskColor: "None", surfaceFinish: "Immersion Silver" }
  },
  {
    id: "ORD-2023-1016", clientId: "CLI-015", clientName: "Apex Drones", date: "2023-10-12", pcbType: "FR4 Standard", amount: 32000, status: "In Review",
    params: { baseMaterial: "FR-4 TG150", layers: 4, dimensions: "110x80", copperThickness: "1 oz", maskColor: "Red", surfaceFinish: "HASL Lead Free" }
  },
  {
    id: "ORD-2023-1017", clientId: "CLI-002", clientName: "AeroDynamics India", date: "2023-10-11", pcbType: "Flex PCB", amount: 45000, status: "Cancelled",
    params: { baseMaterial: "Polyimide", layers: 2, dimensions: "150x50", copperThickness: "0.5 oz", maskColor: "Yellow", surfaceFinish: "Immersion Gold" }
  },
  {
    id: "ORD-2023-1018", clientId: "CLI-003", clientName: "Quantum Robotics", date: "2023-10-10", pcbType: "HDI", amount: 275000, status: "Shipped",
    params: { baseMaterial: "FR-4 TG170", layers: 6, dimensions: "180x120", copperThickness: "1 oz", maskColor: "Black", surfaceFinish: "ENIG" }
  },
  {
    id: "ORD-2023-1019", clientId: "CLI-005", clientName: "Pinnacle IoT", date: "2023-10-09", pcbType: "FR4 Standard", amount: 18000, status: "Pending",
    params: { baseMaterial: "FR-4 TG130", layers: 2, dimensions: "60x60", copperThickness: "1 oz", maskColor: "Green", surfaceFinish: "HASL" }
  },
  {
    id: "ORD-2023-1020", clientId: "CLI-008", clientName: "Zephyr Tech", date: "2023-10-08", pcbType: "Aluminum", amount: 21000, status: "Manufacturing",
    params: { baseMaterial: "Aluminum", layers: 1, dimensions: "80x80", copperThickness: "2 oz", maskColor: "White", surfaceFinish: "HASL" }
  }
];

export const mockClients: Client[] = [
  { id: "CLI-001", name: "TechNova Solutions", email: "procurement@technova.in", phone: "+91 98765 43210", gstin: "27AADCB2230M1Z2", address: "Mumbai, Maharashtra", totalOrders: 12, totalSpent: 450000, joinedDate: "2022-01-15", status: "Active" },
  { id: "CLI-002", name: "AeroDynamics India", email: "supply@aerodynamics.in", phone: "+91 98765 43211", gstin: "29AABCA1122N1Z5", address: "Bengaluru, Karnataka", totalOrders: 5, totalSpent: 125000, joinedDate: "2022-03-22", status: "Active" },
  { id: "CLI-003", name: "Quantum Robotics", email: "hello@quantumrobo.com", phone: "+91 98765 43212", gstin: "33AAECQ3344P1Z8", address: "Chennai, Karnataka", totalOrders: 8, totalSpent: 680000, joinedDate: "2021-11-05", status: "Active" },
  { id: "CLI-004", name: "Vidyut Electronics", email: "sales@vidyutelec.in", phone: "+91 98765 43213", gstin: "07AABCV4455Q1Z3", address: "Delhi, NCR", totalOrders: 15, totalSpent: 320000, joinedDate: "2021-08-19", status: "Active" },
  { id: "CLI-005", name: "Pinnacle IoT", email: "contact@pinnacleiot.com", phone: "+91 98765 43214", gstin: "36AABCP5566R1Z9", address: "Hyderabad, Telangana", totalOrders: 22, totalSpent: 890000, joinedDate: "2020-05-11", status: "Active" },
  { id: "CLI-006", name: "Spark Embedded", email: "info@sparkembedded.in", phone: "+91 98765 43215", gstin: "24AABCS6677S1Z4", address: "Ahmedabad, Gujarat", totalOrders: 3, totalSpent: 112000, joinedDate: "2023-02-14", status: "Active" },
  { id: "CLI-007", name: "Nexus Hardware", email: "admin@nexushw.in", phone: "+91 98765 43216", gstin: "09AABCN7788T1Z6", address: "Noida, UP", totalOrders: 6, totalSpent: 95000, joinedDate: "2022-09-30", status: "Inactive" },
  { id: "CLI-008", name: "Zephyr Tech", email: "purchasing@zephyrtech.in", phone: "+91 98765 43217", gstin: "33AABCZ8899U1Z7", address: "Coimbatore, TN", totalOrders: 9, totalSpent: 215000, joinedDate: "2022-06-18", status: "Active" },
  { id: "CLI-009", name: "Omni Circuits", email: "sourcing@omnicircuits.com", phone: "+91 98765 43218", gstin: "27AABCO9900V1Z1", address: "Pune, Maharashtra", totalOrders: 4, totalSpent: 350000, joinedDate: "2023-01-05", status: "Active" },
  { id: "CLI-010", name: "Indus Controllers", email: "hello@indusctrl.in", phone: "+91 98765 43219", gstin: "06AABCI0011W1Z2", address: "Gurugram, UP", totalOrders: 18, totalSpent: 245000, joinedDate: "2021-04-25", status: "Active" },
  { id: "CLI-011", name: "Vortex Systems", email: "components@vortexsys.in", phone: "+91 98765 43220", gstin: "32AABCV1122X1Z3", address: "Kochi, Kerala", totalOrders: 7, totalSpent: 178000, joinedDate: "2022-12-12", status: "Inactive" },
  { id: "CLI-012", name: "Horizon Auto", email: "auto@horizon.in", phone: "+91 98765 43221", gstin: "03AABCH2233Y1Z4", address: "Ludhiana, TN", totalOrders: 2, totalSpent: 145000, joinedDate: "2023-05-08", status: "Active" },
  { id: "CLI-013", name: "Aura Devices", email: "info@auradevices.com", phone: "+91 98765 43222", gstin: "29AABCA3344Z1Z5", address: "Mysuru, Punjab", totalOrders: 11, totalSpent: 290000, joinedDate: "2022-08-20", status: "Active" },
  { id: "CLI-014", name: "Crest Electronics", email: "sales@crestelec.in", phone: "+91 98765 43223", gstin: "08AABCC4455A1Z6", address: "Jaipur, Punjab", totalOrders: 5, totalSpent: 210000, joinedDate: "2023-03-17", status: "Active" },
  { id: "CLI-015", name: "Apex Drones", email: "procure@apexdrones.in", phone: "+91 98765 43224", gstin: "27AABCA5566B1Z7", address: "Nagpur, Maharashtra", totalOrders: 14, totalSpent: 420000, joinedDate: "2021-10-29", status: "Active" }
];

export const mockInventory: InventoryItem[] = [
  { id: "INV-001", name: "10kΩ 0603 Resistor", sku: "RES-10K-0603", unitPrice: 0.15, availableQuantity: 50000, lowStockThreshold: 10000, status: "In Stock" },
  { id: "INV-002", name: "100nF 0402 Capacitor", sku: "CAP-100N-0402", unitPrice: 0.20, availableQuantity: 8500, lowStockThreshold: 10000, status: "Low Stock" },
  { id: "INV-003", name: "ESP32-WROOM-32D", sku: "IC-ESP32-WR", unitPrice: 285.00, availableQuantity: 450, lowStockThreshold: 500, status: "Low Stock" },
  { id: "INV-004", name: "STM32F103C8T6", sku: "IC-STM32-F1", unitPrice: 145.50, availableQuantity: 1200, lowStockThreshold: 300, status: "In Stock" },
  { id: "INV-005", name: "LM317 Voltage Regulator", sku: "IC-LM317-SOT", unitPrice: 12.00, availableQuantity: 8500, lowStockThreshold: 2000, status: "In Stock" },
  { id: "INV-006", name: "2x20 Pin Header Female", sku: "CON-2X20-F", unitPrice: 18.50, availableQuantity: 120, lowStockThreshold: 500, status: "Low Stock" },
  { id: "INV-007", name: "USB Type-C Connector", sku: "CON-USBC-SMD", unitPrice: 22.00, availableQuantity: 3400, lowStockThreshold: 1000, status: "In Stock" },
  { id: "INV-008", name: "Micro USB Connector", sku: "CON-MUSB-SMD", unitPrice: 15.00, availableQuantity: 0, lowStockThreshold: 500, status: "Out of Stock" },
  { id: "INV-009", name: "ATmega328P-AU", sku: "IC-ATM328P", unitPrice: 185.00, availableQuantity: 800, lowStockThreshold: 200, status: "In Stock" },
  { id: "INV-010", name: "NE555 Linear Regulator", sku: "IC-NE555-DIP", unitPrice: 8.50, availableQuantity: 15000, lowStockThreshold: 5000, status: "In Stock" },
  { id: "INV-011", name: "1uF 0805 Capacitor", sku: "CAP-1U-0805", unitPrice: 0.25, availableQuantity: 22000, lowStockThreshold: 5000, status: "In Stock" },
  { id: "INV-012", name: "4.7kΩ 0805 Resistor", sku: "RES-4K7-0805", unitPrice: 0.18, availableQuantity: 18000, lowStockThreshold: 5000, status: "In Stock" },
  { id: "INV-013", name: "BSS138 Timer IC", sku: "IC-BSS138-SOT", unitPrice: 5.00, availableQuantity: 4200, lowStockThreshold: 1000, status: "In Stock" },
  { id: "INV-014", name: "WS2812B RGB LED", sku: "LED-WS2812B", unitPrice: 8.00, availableQuantity: 6500, lowStockThreshold: 2000, status: "In Stock" },
  { id: "INV-015", name: "CH340G USB to Serial", sku: "IC-CH340G", unitPrice: 45.00, availableQuantity: 150, lowStockThreshold: 500, status: "Low Stock" },
  { id: "INV-016", name: "Tactile Push Button 6x6", sku: "SW-TACT-6X6", unitPrice: 2.50, availableQuantity: 12000, lowStockThreshold: 3000, status: "In Stock" },
  { id: "INV-017", name: "Slide Switch SPDT", sku: "SW-SLIDE-SPDT", unitPrice: 4.00, availableQuantity: 4500, lowStockThreshold: 1000, status: "In Stock" },
  { id: "INV-018", name: "1N4148 Diode", sku: "DIO-1N4148-SMD", unitPrice: 0.80, availableQuantity: 28000, lowStockThreshold: 8000, status: "In Stock" },
  { id: "INV-019", name: "SS34 MOSFET", sku: "FET-SS34-SMA", unitPrice: 3.50, availableQuantity: 9000, lowStockThreshold: 2000, status: "In Stock" },
  { id: "INV-020", name: "CR2032 Battery Holder", sku: "HLD-CR2032-SMD", unitPrice: 14.00, availableQuantity: 80, lowStockThreshold: 300, status: "Low Stock" }
];

export type StaffRole = 'Floor Supervisor' | 'QA Engineer' | 'Dispatch Staff' | 'Procurement' | 'Production Lead' | 'Assembly Technician';
export type StaffStatus = 'Active' | 'Inactive' | 'On Leave';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  department: string;
  shift: 'Morning' | 'Evening' | 'Night';
  joinedDate: string;
  status: StaffStatus;
  mobileAccess: boolean;
  lastActive: string;
  avatar: string;
}

export const mockStaff: StaffMember[] = [
  { id: "STF-001", name: "Rajesh Kumar", email: "rajesh.k@pcbmfg.in", phone: "+91 98001 11001", role: "Floor Supervisor", department: "Production", shift: "Morning", joinedDate: "2020-03-12", status: "Active", mobileAccess: true, lastActive: "2024-01-15 09:42", avatar: "RK" },
  { id: "STF-002", name: "Priya Sharma", email: "priya.s@pcbmfg.in", phone: "+91 98001 11002", role: "QA Engineer", department: "Quality", shift: "Morning", joinedDate: "2021-06-01", status: "Active", mobileAccess: true, lastActive: "2024-01-15 10:15", avatar: "PS" },
  { id: "STF-003", name: "Amit Patel", email: "amit.p@pcbmfg.in", phone: "+91 98001 11003", role: "Dispatch Staff", department: "Logistics", shift: "Morning", joinedDate: "2022-01-15", status: "Active", mobileAccess: true, lastActive: "2024-01-14 17:30", avatar: "AP" },
  { id: "STF-004", name: "Sunita Verma", email: "sunita.v@pcbmfg.in", phone: "+91 98001 11004", role: "Procurement", department: "Supply Chain", shift: "Morning", joinedDate: "2019-11-20", status: "Active", mobileAccess: false, lastActive: "2024-01-13 14:00", avatar: "SV" },
  { id: "STF-005", name: "Deepak Singh", email: "deepak.s@pcbmfg.in", phone: "+91 98001 11005", role: "Production Lead", department: "Production", shift: "Evening", joinedDate: "2020-07-05", status: "Active", mobileAccess: true, lastActive: "2024-01-15 19:55", avatar: "DS" },
  { id: "STF-006", name: "Meena Iyer", email: "meena.i@pcbmfg.in", phone: "+91 98001 11006", role: "QA Engineer", department: "Quality", shift: "Evening", joinedDate: "2022-04-18", status: "Active", mobileAccess: true, lastActive: "2024-01-15 20:10", avatar: "MI" },
  { id: "STF-007", name: "Rohit Mishra", email: "rohit.m@pcbmfg.in", phone: "+91 98001 11007", role: "Assembly Technician", department: "Production", shift: "Morning", joinedDate: "2023-02-10", status: "Active", mobileAccess: false, lastActive: "2024-01-12 16:45", avatar: "RM" },
  { id: "STF-008", name: "Kavitha Nair", email: "kavitha.n@pcbmfg.in", phone: "+91 98001 11008", role: "Floor Supervisor", department: "Production", shift: "Night", joinedDate: "2021-09-22", status: "Active", mobileAccess: true, lastActive: "2024-01-15 02:30", avatar: "KN" },
  { id: "STF-009", name: "Sanjay Gupta", email: "sanjay.g@pcbmfg.in", phone: "+91 98001 11009", role: "Dispatch Staff", department: "Logistics", shift: "Evening", joinedDate: "2022-08-03", status: "On Leave", mobileAccess: true, lastActive: "2024-01-10 11:00", avatar: "SG" },
  { id: "STF-010", name: "Anita Rao", email: "anita.r@pcbmfg.in", phone: "+91 98001 11010", role: "Procurement", department: "Supply Chain", shift: "Morning", joinedDate: "2020-12-14", status: "Active", mobileAccess: false, lastActive: "2024-01-15 13:20", avatar: "AR" },
  { id: "STF-011", name: "Vikram Joshi", email: "vikram.j@pcbmfg.in", phone: "+91 98001 11011", role: "Production Lead", department: "Production", shift: "Night", joinedDate: "2019-06-30", status: "Inactive", mobileAccess: false, lastActive: "2023-12-28 22:00", avatar: "VJ" },
  { id: "STF-012", name: "Lakshmi Pillai", email: "lakshmi.p@pcbmfg.in", phone: "+91 98001 11012", role: "Assembly Technician", department: "Production", shift: "Morning", joinedDate: "2023-07-19", status: "Active", mobileAccess: true, lastActive: "2024-01-15 08:55", avatar: "LP" },
];

export interface StaffActivity {
  id: string;
  timestamp: string;
  orderId: string;
  clientName: string;
  action: 'Status Update' | 'Payment Marked' | 'Invoice Sent' | 'Order Viewed' | 'Dispatch Confirmed' | 'QC Passed' | 'QC Failed';
  detail: string;
  from?: string;
  to?: string;
}

export const mockStaffActivity: Record<string, StaffActivity[]> = {
  "STF-001": [
    { id: "a1", timestamp: "2024-01-15 09:42", orderId: "ORD-2023-1001", clientName: "TechNova Solutions", action: "Status Update", detail: "Changed order status", from: "In Review", to: "Manufacturing" },
    { id: "a2", timestamp: "2024-01-15 09:15", orderId: "ORD-2023-1007", clientName: "Spark Embedded", action: "Order Viewed", detail: "Viewed order details on mobile app" },
    { id: "a3", timestamp: "2024-01-14 17:30", orderId: "ORD-2023-1013", clientName: "Horizon Auto", action: "Status Update", detail: "Changed order status", from: "Pending", to: "In Review" },
    { id: "a4", timestamp: "2024-01-14 14:10", orderId: "ORD-2023-1004", clientName: "Vidyut Electronics", action: "Dispatch Confirmed", detail: "Confirmed dispatch and updated tracking" },
    { id: "a5", timestamp: "2024-01-13 11:00", orderId: "ORD-2023-1020", clientName: "Zephyr Tech", action: "Status Update", detail: "Changed order status", from: "Sent to JLC", to: "Manufacturing" },
    { id: "a6", timestamp: "2024-01-12 10:30", orderId: "ORD-2023-1009", clientName: "Zephyr Tech", action: "Status Update", detail: "Changed order status", from: "Manufacturing", to: "Shipped" },
    { id: "a7", timestamp: "2024-01-11 16:45", orderId: "ORD-2023-1002", clientName: "AeroDynamics India", action: "Order Viewed", detail: "Reviewed order specs on mobile" },
    { id: "a8", timestamp: "2024-01-10 09:20", orderId: "ORD-2023-1015", clientName: "Crest Electronics", action: "Status Update", detail: "Changed order status", from: "Pending", to: "Sent to JLC" },
  ],
  "STF-002": [
    { id: "b1", timestamp: "2024-01-15 10:15", orderId: "ORD-2023-1003", clientName: "Quantum Robotics", action: "QC Passed", detail: "Quality check passed — 100% board continuity verified" },
    { id: "b2", timestamp: "2024-01-15 09:50", orderId: "ORD-2023-1007", clientName: "Spark Embedded", action: "QC Passed", detail: "Quality check passed — impedance within spec" },
    { id: "b3", timestamp: "2024-01-14 15:30", orderId: "ORD-2023-1010", clientName: "Omni Circuits", action: "QC Failed", detail: "Quality check failed — solder mask alignment issue detected" },
    { id: "b4", timestamp: "2024-01-14 11:00", orderId: "ORD-2023-1005", clientName: "Pinnacle IoT", action: "Order Viewed", detail: "Reviewed BOM and specifications" },
    { id: "b5", timestamp: "2024-01-13 14:20", orderId: "ORD-2023-1018", clientName: "Quantum Robotics", action: "QC Passed", detail: "Final inspection passed — HDI layers verified" },
    { id: "b6", timestamp: "2024-01-12 10:00", orderId: "ORD-2023-1012", clientName: "Vortex Systems", action: "Status Update", detail: "Changed order status", from: "Manufacturing", to: "Shipped" },
  ],
  "STF-003": [
    { id: "c1", timestamp: "2024-01-14 17:30", orderId: "ORD-2023-1004", clientName: "Vidyut Electronics", action: "Dispatch Confirmed", detail: "Dispatched via BlueDart — AWB 12345678" },
    { id: "c2", timestamp: "2024-01-14 15:00", orderId: "ORD-2023-1008", clientName: "Nexus Hardware", action: "Dispatch Confirmed", detail: "Dispatched via DTDC — AWB 87654321" },
    { id: "c3", timestamp: "2024-01-13 16:45", orderId: "ORD-2023-1012", clientName: "Vortex Systems", action: "Status Update", detail: "Changed order status", from: "Manufacturing", to: "Shipped" },
    { id: "c4", timestamp: "2024-01-13 12:30", orderId: "ORD-2023-1014", clientName: "Aura Devices", action: "Invoice Sent", detail: "Invoice emailed to client" },
    { id: "c5", timestamp: "2024-01-12 09:00", orderId: "ORD-2023-1018", clientName: "Quantum Robotics", action: "Dispatch Confirmed", detail: "Dispatched via FedEx — Tracking: 999123456" },
    { id: "c6", timestamp: "2024-01-11 17:00", orderId: "ORD-2023-1003", clientName: "Quantum Robotics", action: "Order Viewed", detail: "Verified packaging dimensions" },
  ],
  "STF-005": [
    { id: "e1", timestamp: "2024-01-15 19:55", orderId: "ORD-2023-1020", clientName: "Zephyr Tech", action: "Status Update", detail: "Changed order status", from: "In Review", to: "Manufacturing" },
    { id: "e2", timestamp: "2024-01-15 18:30", orderId: "ORD-2023-1013", clientName: "Horizon Auto", action: "Status Update", detail: "Changed order status", from: "Sent to JLC", to: "Manufacturing" },
    { id: "e3", timestamp: "2024-01-14 20:10", orderId: "ORD-2023-1001", clientName: "TechNova Solutions", action: "Order Viewed", detail: "Reviewed production schedule and layer stack" },
    { id: "e4", timestamp: "2024-01-14 19:00", orderId: "ORD-2023-1007", clientName: "Spark Embedded", action: "Status Update", detail: "Changed order status", from: "Pending", to: "In Review" },
    { id: "e5", timestamp: "2024-01-13 21:30", orderId: "ORD-2023-1010", clientName: "Omni Circuits", action: "Status Update", detail: "Changed order status", from: "In Review", to: "Sent to JLC" },
    { id: "e6", timestamp: "2024-01-12 18:45", orderId: "ORD-2023-1005", clientName: "Pinnacle IoT", action: "Order Viewed", detail: "Cross-checked Rogers 4350B specs" },
    { id: "e7", timestamp: "2024-01-11 20:00", orderId: "ORD-2023-1015", clientName: "Crest Electronics", action: "Status Update", detail: "Changed order status", from: "Manufacturing", to: "Shipped" },
  ],
  "STF-006": [
    { id: "f1", timestamp: "2024-01-15 20:10", orderId: "ORD-2023-1003", clientName: "Quantum Robotics", action: "QC Passed", detail: "Flex PCB bend test passed — 500 cycle flex verified" },
    { id: "f2", timestamp: "2024-01-15 19:40", orderId: "ORD-2023-1005", clientName: "Pinnacle IoT", action: "QC Failed", detail: "Via fill incomplete on layer 3 — returned to rework" },
    { id: "f3", timestamp: "2024-01-14 21:00", orderId: "ORD-2023-1016", clientName: "Apex Drones", action: "QC Passed", detail: "IPC Class 2 inspection passed" },
    { id: "f4", timestamp: "2024-01-13 20:30", orderId: "ORD-2023-1007", clientName: "Spark Embedded", action: "Status Update", detail: "Changed order status", from: "Manufacturing", to: "Shipped" },
    { id: "f5", timestamp: "2024-01-12 19:15", orderId: "ORD-2023-1001", clientName: "TechNova Solutions", action: "QC Passed", detail: "ENIG finish thickness verified — 2–4 μin" },
  ],
  "STF-008": [
    { id: "h1", timestamp: "2024-01-15 02:30", orderId: "ORD-2023-1010", clientName: "Omni Circuits", action: "Status Update", detail: "Changed order status", from: "Sent to JLC", to: "Manufacturing" },
    { id: "h2", timestamp: "2024-01-15 01:00", orderId: "ORD-2023-1018", clientName: "Quantum Robotics", action: "Order Viewed", detail: "Reviewed overnight production queue" },
    { id: "h3", timestamp: "2024-01-14 23:30", orderId: "ORD-2023-1005", clientName: "Pinnacle IoT", action: "Status Update", detail: "Changed order status", from: "In Review", to: "Sent to JLC" },
    { id: "h4", timestamp: "2024-01-14 22:00", orderId: "ORD-2023-1013", clientName: "Horizon Auto", action: "Dispatch Confirmed", detail: "Night shift dispatch via Speed Post — EMS 998877" },
    { id: "h5", timestamp: "2024-01-13 03:00", orderId: "ORD-2023-1020", clientName: "Zephyr Tech", action: "Status Update", detail: "Changed order status", from: "Pending", to: "In Review" },
    { id: "h6", timestamp: "2024-01-12 01:45", orderId: "ORD-2023-1009", clientName: "Zephyr Tech", action: "Order Viewed", detail: "Verified aluminum substrate specification" },
  ],
  "STF-009": [
    { id: "i1", timestamp: "2024-01-10 11:00", orderId: "ORD-2023-1004", clientName: "Vidyut Electronics", action: "Dispatch Confirmed", detail: "Dispatched via BlueDart before going on leave" },
    { id: "i2", timestamp: "2024-01-10 10:30", orderId: "ORD-2023-1008", clientName: "Nexus Hardware", action: "Invoice Sent", detail: "Invoice emailed to client before leave" },
    { id: "i3", timestamp: "2024-01-09 17:00", orderId: "ORD-2023-1014", clientName: "Aura Devices", action: "Dispatch Confirmed", detail: "Dispatched via DTDC — AWB 456789" },
  ],
  "STF-012": [
    { id: "l1", timestamp: "2024-01-15 08:55", orderId: "ORD-2023-1001", clientName: "TechNova Solutions", action: "Order Viewed", detail: "Reviewed SMT assembly parameters" },
    { id: "l2", timestamp: "2024-01-15 08:20", orderId: "ORD-2023-1007", clientName: "Spark Embedded", action: "Status Update", detail: "Changed order status", from: "In Review", to: "Manufacturing" },
    { id: "l3", timestamp: "2024-01-14 16:00", orderId: "ORD-2023-1013", clientName: "Horizon Auto", action: "Order Viewed", detail: "Checked copper core bonding specs" },
    { id: "l4", timestamp: "2024-01-13 09:30", orderId: "ORD-2023-1003", clientName: "Quantum Robotics", action: "Order Viewed", detail: "Reviewed flex PCB assembly steps" },
  ],
};

export const mockRevenueData = [
  { date: "Oct 01", revenue: 85000 },
  { date: "Oct 02", revenue: 92000 },
  { date: "Oct 03", revenue: 78000 },
  { date: "Oct 04", revenue: 110000 },
  { date: "Oct 05", revenue: 125000 },
  { date: "Oct 06", revenue: 145000 },
  { date: "Oct 07", revenue: 98000 },
  { date: "Oct 08", revenue: 105000 },
  { date: "Oct 09", revenue: 112000 },
  { date: "Oct 10", revenue: 135000 },
  { date: "Oct 11", revenue: 155000 },
  { date: "Oct 12", revenue: 142000 },
  { date: "Oct 13", revenue: 128000 },
  { date: "Oct 14", revenue: 165000 },
  { date: "Oct 15", revenue: 185000 },
  { date: "Oct 16", revenue: 172000 },
  { date: "Oct 17", revenue: 158000 },
  { date: "Oct 18", revenue: 195000 },
  { date: "Oct 19", revenue: 215000 },
  { date: "Oct 20", revenue: 205000 },
  { date: "Oct 21", revenue: 198000 },
  { date: "Oct 22", revenue: 235000 },
  { date: "Oct 23", revenue: 245000 },
  { date: "Oct 24", revenue: 228000 }
];
