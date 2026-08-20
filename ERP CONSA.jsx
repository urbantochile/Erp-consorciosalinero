import React, { useState, useEffect, useReducer, useMemo, useCallback } from "react";
import {
  LayoutDashboard, Users, FileText, FileClock, ShoppingCart, Receipt,
  TrendingUp, Settings as SettingsIcon, Search, Plus, X, Trash2, Edit3,
  Download, Building2, ChevronDown, AlertTriangle, CheckCircle2, Clock,
  Send, Eye, Coins, ArrowRightLeft, Command, Bell, ArrowUpRight, ArrowDownRight,
  ClipboardList, Truck, FolderKanban, Mountain, MapPin, Target, Scale,
  ShieldCheck, KeyRound, LogOut, Lock, History, UserPlus, Landmark,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";

/* ============================ Theme ============================ */
const COPPER = "#B87333";
const COPPER_DK = "#8B5422";
const NAVY = "#1A2B3C";
const NAVY_DK = "#0F1A24";
const ACCENT = "#FFB347";

/* ============================ Helpers ============================ */
const clp = (n) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n || 0);
const shortDate = (d) => (d ? new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const uid = (p) => `${p}_${Math.random().toString(36).slice(2, 10)}`;
const todayISO = () => new Date().toISOString().slice(0, 10);

// Chilean RUT — módulo 11
function cleanRut(r) { return (r || "").replace(/[^0-9kK]/g, "").toUpperCase(); }
function formatRut(r) {
  const c = cleanRut(r);
  if (c.length < 2) return c;
  const body = c.slice(0, -1), dv = c.slice(-1);
  return body.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + dv;
}
function validRut(r) {
  const c = cleanRut(r);
  if (c.length < 2) return false;
  const body = c.slice(0, -1), dv = c.slice(-1);
  let sum = 0, mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const res = 11 - (sum % 11);
  const dvCalc = res === 11 ? "0" : res === 10 ? "K" : String(res);
  return dvCalc === dv;
}

const DTE_TYPES = {
  33: "Factura Electrónica",
  34: "Factura Exenta",
  39: "Boleta Electrónica",
  61: "Nota de Crédito",
  56: "Nota de Débito",
};

const INVOICE_STATUS = {
  draft: { label: "Borrador", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  sent: { label: "Enviada", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  viewed: { label: "Vista", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  paid: { label: "Pagada", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};
const QUOTE_STATUS = {
  draft: { label: "Borrador", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  sent: { label: "Enviado", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  accepted: { label: "Aceptado", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Rechazado", cls: "bg-red-50 text-red-700 border-red-200" },
  converted: { label: "Convertido", cls: "bg-[#FFF0E0] text-[#8B5422] border-[#e8c9a3]" },
};
const PO_STATUS = {
  draft: { label: "Borrador", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  sent: { label: "Enviada", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  confirmed: { label: "Confirmada", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  received: { label: "Recibida", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Cancelada", cls: "bg-red-50 text-red-700 border-red-200" },
};
const PROJECT_STATUS = {
  active: { label: "Activo", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  paused: { label: "En pausa", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  closed: { label: "Cerrado", cls: "bg-slate-100 text-slate-600 border-slate-200" },
};
const INCOME_CATEGORIES = ["Crédito", "Asociación comercial", "Venta de activos", "Otros títulos", "Otros"];
const INCOME_CAT_STYLE = {
  "Crédito": "bg-blue-50 text-blue-700 border-blue-200",
  "Asociación comercial": "bg-violet-50 text-violet-700 border-violet-200",
  "Venta de activos": "bg-[#FFF0E0] text-[#8B5422] border-[#e8c9a3]",
  "Otros títulos": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Otros": "bg-slate-100 text-slate-600 border-slate-200",
};
const CARRY_STATUS = {
  pending: { label: "Pendiente", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  paid: { label: "Pagada", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};
const MODULE_CATALOG = [
  ["dashboard", "Dashboard"], ["projects", "Proyectos"], ["clients", "Clientes"],
  ["invoices", "Facturas"], ["quotes", "Presupuestos"], ["purchase-orders", "Órdenes de compra"],
  ["purchases", "Compras"], ["expenses", "Gastos"], ["other-income", "Otros ingresos"],
  ["carry-debt", "Deuda de arrastre"], ["loans", "Préstamos e inversiones"], ["reports", "Informes"], ["settings", "Configuración"],
];
const LOAN_TYPES = ["Préstamo", "Inversión"];
const LOAN_STATUS = {
  active: { label: "Vigente", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  recovered: { label: "Recuperado", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  writeoff: { label: "Incobrable", cls: "bg-red-50 text-red-700 border-red-200" },
};

/* ============================ Seed data ============================ */
function seed() {
  const cid = "company_consa";
  const clients = [
    { client_id: uid("client"), company_id: cid, name: "Minera Los Andes SpA", rut: "76.543.210-9", email: "pagos@losandes.cl", phone: "+56 2 2345 6789", address: "Av. Apoquindo 4500, Las Condes" },
    { client_id: uid("client"), company_id: cid, name: "Constructora del Valle Ltda", rut: "77.111.222-3", email: "finanzas@cvalle.cl", phone: "+56 51 220 1122", address: "Balmaceda 1200, La Serena" },
    { client_id: uid("client"), company_id: cid, name: "Agrícola Elqui S.A.", rut: "78.999.000-K", email: "contabilidad@agroelqui.cl", phone: "+56 51 245 8080", address: "Ruta 41 Km 12, Vicuña" },
    { client_id: uid("client"), company_id: cid, name: "Transportes Cordillera EIRL", rut: "76.222.333-4", email: "admin@tcordillera.cl", phone: "+56 2 2987 6543", address: "Panamericana Norte 8800, Quilicura" },
  ];
  const mkItems = (rows) => rows.map(([description, quantity, price]) => ({ description, quantity, price, tax_rate: 19 }));
  const totals = (items) => {
    const subtotal = items.reduce((s, i) => s + i.quantity * i.price, 0);
    const tax_total = Math.round(subtotal * 0.19);
    return { subtotal, tax_total, total: subtotal + tax_total };
  };
  const mkInv = (client, number, status, items, daysAgo, dueInDays, dte = 33) => {
    const it = mkItems(items); const t = totals(it);
    const created = new Date(Date.now() - daysAgo * 864e5).toISOString();
    return {
      invoice_id: uid("inv"), company_id: cid, client_id: client.client_id, client_name: client.name,
      invoice_number: number, tipo_dte: dte, folio: number.split("-")[1], items: it, ...t,
      status, created_at: created,
      due_date: new Date(Date.now() + dueInDays * 864e5).toISOString(),
      paid_at: status === "paid" ? created : null, notes: "",
    };
  };
  const invoices = [
    mkInv(clients[0], "F-001045", "paid", [["Servicio de consultoría técnica", 1, 3200000], ["Informe geotécnico", 2, 850000]], 42, -12),
    mkInv(clients[1], "F-001046", "sent", [["Arriendo de maquinaria", 3, 1200000]], 8, 22),
    mkInv(clients[2], "F-001047", "viewed", [["Asesoría contable mensual", 1, 780000]], 20, -5),
    mkInv(clients[3], "F-001048", "paid", [["Flete carga sobredimensionada", 4, 620000]], 15, 15),
    mkInv(clients[0], "F-001049", "draft", [["Estudio de impacto ambiental", 1, 5400000]], 2, 30),
    mkInv(clients[1], "F-001050", "sent", [["Supervisión de obra", 6, 480000]], 33, -2),
  ];
  const quotes = [
    (() => { const it = mkItems([["Diseño de planta piloto", 1, 8900000]]); const t = totals(it);
      return { quote_id: uid("quote"), company_id: cid, client_id: clients[2].client_id, client_name: clients[2].name, quote_number: "P-000210", items: it, ...t, status: "sent", valid_until: new Date(Date.now() + 20 * 864e5).toISOString(), created_at: new Date(Date.now() - 5 * 864e5).toISOString(), notes: "" }; })(),
    (() => { const it = mkItems([["Mantención preventiva anual", 12, 340000]]); const t = totals(it);
      return { quote_id: uid("quote"), company_id: cid, client_id: clients[3].client_id, client_name: clients[3].name, quote_number: "P-000211", items: it, ...t, status: "accepted", valid_until: new Date(Date.now() + 10 * 864e5).toISOString(), created_at: new Date(Date.now() - 12 * 864e5).toISOString(), notes: "" }; })(),
  ];
  const expenses = [
    { expense_id: uid("exp"), company_id: cid, category: "Software", description: "Suscripción ERP anual", amount: 1290000, date: new Date(Date.now() - 10 * 864e5).toISOString(), vendor: "Cloud Systems SpA" },
    { expense_id: uid("exp"), company_id: cid, category: "Servicios", description: "Servicios legales", amount: 850000, date: new Date(Date.now() - 25 * 864e5).toISOString(), vendor: "Estudio Jurídico Norte" },
    { expense_id: uid("exp"), company_id: cid, category: "Transporte", description: "Combustible flota", amount: 620000, date: new Date(Date.now() - 4 * 864e5).toISOString(), vendor: "Copec" },
  ];
  const purchases = [
    (() => { const net = 2400000; const iva = Math.round(net * 0.19);
      return { purchase_id: uid("purchase"), company_id: cid, supplier_name: "Ferretería Industrial Ltda", supplier_rut: "76.800.900-1", doc_type: "Factura", category: "Inventario", net_amount: net, tax_amount: iva, total: net + iva, date: new Date(Date.now() - 7 * 864e5).toISOString() }; })(),
    (() => { const net = 1150000; const iva = Math.round(net * 0.19);
      return { purchase_id: uid("purchase"), company_id: cid, supplier_name: "Equipos Mineros del Norte", supplier_rut: "77.500.100-5", doc_type: "Factura", category: "Activos Fijos", net_amount: net, tax_amount: iva, total: net + iva, date: new Date(Date.now() - 18 * 864e5).toISOString() }; })(),
  ];
  const company = {
    company_id: cid, name: "CONSA Ingeniería SpA", rut: "76.100.200-3",
    address: "Av. Francisco de Aguirre 550, La Serena", notification_email: "facturacion@consa.cl",
    primary_color: COPPER, secondary_color: NAVY, accent_color: ACCENT,
  };
  const mkPO = (supplier, rut, email, number, status, items, daysAgo, deliveryInDays) => {
    const it = mkItems(items); const t = totals(it);
    return {
      po_id: uid("po"), company_id: cid, supplier_name: supplier, supplier_rut: rut, supplier_email: email,
      supplier_address: "", po_number: number, items: it, ...t, status,
      delivery_date: new Date(Date.now() + deliveryInDays * 864e5).toISOString(),
      created_at: new Date(Date.now() - daysAgo * 864e5).toISOString(), notes: "",
    };
  };
  const purchaseOrders = [
    mkPO("Ferretería Industrial Ltda", "76.800.900-1", "ventas@ferrind.cl", "OC-000320", "confirmed", [["Perfiles de acero estructural", 40, 68000], ["Pernos de anclaje M20", 200, 2400]], 6, 8),
    mkPO("Equipos Mineros del Norte", "77.500.100-5", "cotizaciones@eqmn.cl", "OC-000321", "sent", [["Bomba hidráulica 15HP", 2, 1850000]], 3, 15),
    mkPO("Suministros El Faro SpA", "78.220.440-2", "contacto@elfaro.cl", "OC-000322", "draft", [["EPP dotación anual", 25, 95000]], 1, 20),
  ];
  const projects = [
    { project_id: uid("proj"), company_id: cid, name: "Mina El Peñón", code: "MEP-24", client_id: clients[0].client_id, location: "Antofagasta, Región de Antofagasta", status: "active", budget: 45000000, start_date: new Date(Date.now() - 90 * 864e5).toISOString(), description: "Servicios de ingeniería y supervisión geotécnica en rajo." },
    { project_id: uid("proj"), company_id: cid, name: "Planta Valle Elqui", code: "PVE-24", client_id: clients[2].client_id, location: "Vicuña, Región de Coquimbo", status: "active", budget: 28000000, start_date: new Date(Date.now() - 45 * 864e5).toISOString(), description: "Diseño y montaje de planta piloto de procesamiento agrícola." },
    { project_id: uid("proj"), company_id: cid, name: "Ampliación Ruta 41", code: "R41-23", client_id: clients[1].client_id, location: "La Serena, Región de Coquimbo", status: "paused", budget: 60000000, start_date: new Date(Date.now() - 200 * 864e5).toISOString(), description: "Supervisión de obras viales y control de calidad." },
  ];
  // Asociar documentos de ejemplo a proyectos
  invoices[0].project_id = projects[0].project_id;
  invoices[2].project_id = projects[1].project_id;
  invoices[4].project_id = projects[0].project_id;
  invoices[5].project_id = projects[2].project_id;
  purchases[0].project_id = projects[0].project_id;
  purchases[1].project_id = projects[1].project_id;
  purchaseOrders[0].project_id = projects[0].project_id;
  purchaseOrders[1].project_id = projects[1].project_id;
  expenses[0].project_id = projects[1].project_id;
  expenses[2].project_id = projects[0].project_id;
  const otherIncome = [
    { income_id: uid("inc"), company_id: cid, category: "Venta de activos", description: "Venta camioneta Hilux 2019", amount: 12500000, date: new Date(Date.now() - 20 * 864e5).toISOString(), source: "Automotora Norte", project_id: "", taxed: true, tax_amount: Math.round(12500000 * 0.19) },
    { income_id: uid("inc"), company_id: cid, category: "Crédito", description: "Línea de crédito capital de trabajo", amount: 30000000, date: new Date(Date.now() - 35 * 864e5).toISOString(), source: "Banco Estado", project_id: "", taxed: false, tax_amount: 0 },
    { income_id: uid("inc"), company_id: cid, category: "Asociación comercial", description: "Aporte socio operación conjunta", amount: 8000000, date: new Date(Date.now() - 12 * 864e5).toISOString(), source: "Ingeniería Andina SpA", project_id: projects[0].project_id, taxed: false, tax_amount: 0 },
  ];
  const carryDebt = [
    { debt_id: uid("debt"), company_id: cid, year: 2025, description: "Saldo impago proveedores cierre 2024", creditor: "Varios proveedores", amount: 18500000, date: new Date("2025-01-15").toISOString(), status: "pending", notes: "Arrastre desde ejercicio 2024" },
    { debt_id: uid("debt"), company_id: cid, year: 2025, description: "Préstamo socio pendiente", creditor: "Socio fundador", amount: 9000000, date: new Date("2025-03-01").toISOString(), status: "pending", notes: "" },
    { debt_id: uid("debt"), company_id: cid, year: 2026, description: "Cuota crédito bancario arrastrada", creditor: "Banco Estado", amount: 6200000, date: new Date("2026-01-10").toISOString(), status: "paid", notes: "" },
  ];
  const loansInvestments = [
    { loan_id: uid("loan"), company_id: cid, type: "Préstamo", date: new Date("2024-06-15").toISOString(), beneficiary: "Constructora del Valle Ltda", rut: "77.111.222-3", amount: 15000000, objective: "Capital de trabajo para obra conjunta", status: "active", notes: "Pagaré a 18 meses, tasa 1,2% mensual." },
    { loan_id: uid("loan"), company_id: cid, type: "Inversión", date: new Date("2025-03-10").toISOString(), beneficiary: "GeoTech SpA", rut: "77.888.999-0", amount: 25000000, objective: "Participación 8% en desarrollo de software minero", status: "active", notes: "" },
    { loan_id: uid("loan"), company_id: cid, type: "Préstamo", date: new Date("2025-11-20").toISOString(), beneficiary: "Juan Pérez Soto", rut: "12.345.678-5", amount: 4000000, objective: "Anticipo a socio operador", status: "recovered", notes: "Devuelto en enero 2026." },
  ];
  const appUsers = [
    { user_id: uid("user"), name: "Master CONSA", email: "master@consa.cl", password: "consa2026", role: "master", modules: [], active: true, created_at: new Date(Date.now() - 120 * 864e5).toISOString() },
    { user_id: uid("user"), name: "Diego Salas", email: "diego@consa.cl", password: "diego123", role: "user", modules: ["dashboard", "clients", "invoices", "quotes", "reports"], active: true, created_at: new Date(Date.now() - 30 * 864e5).toISOString() },
  ];
  const activity = [
    { id: uid("act"), when: new Date(Date.now() - 2 * 36e5).toISOString(), who: "Carolina Reyes", action: "marcó como pagada la factura F-001048" },
    { id: uid("act"), when: new Date(Date.now() - 6 * 36e5).toISOString(), who: "Diego Salas", action: "creó el presupuesto P-000211" },
    { id: uid("act"), when: new Date(Date.now() - 26 * 36e5).toISOString(), who: "Carolina Reyes", action: "registró una compra a Ferretería Industrial" },
  ];
  return { company, clients, invoices, quotes, expenses, purchases, purchaseOrders, projects, otherIncome, carryDebt, loansInvestments, appUsers, session: null, activity };
}

/* ============================ Reducer ============================ */
const STORE_KEY = "consa:erp:v1";
function reducer(state, a) {
  switch (a.type) {
    case "LOAD": return a.payload;
    case "UPSERT": {
      const { coll, item, key } = a;
      const exists = state[coll].some((x) => x[key] === item[key]);
      const list = exists ? state[coll].map((x) => (x[key] === item[key] ? item : x)) : [item, ...state[coll]];
      return { ...state, [coll]: list };
    }
    case "DELETE": {
      const { coll, id, key } = a;
      return { ...state, [coll]: state[coll].filter((x) => x[key] !== id) };
    }
    case "LOG":
      return { ...state, activity: [{ id: uid("act"), when: new Date().toISOString(), who: state.session?.name || "Sistema", action: a.msg }, ...state.activity].slice(0, 200) };
    case "LOGIN": return { ...state, session: a.session };
    case "LOGOUT": return { ...state, session: null };
    case "COMPANY": return { ...state, company: { ...state.company, ...a.patch } };
    default: return state;
  }
}

/* ============================ Small UI atoms ============================ */
const Badge = ({ map, value }) => {
  const s = map[value] || { label: value, cls: "bg-slate-100 text-slate-600 border-slate-200" };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>{s.label}</span>;
};

const Field = ({ label, children, hint }) => (
  <label className="block">
    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
    <div className="mt-1">{children}</div>
    {hint && <span className="text-xs text-slate-400 mt-1 block">{hint}</span>}
  </label>
);

const inputCls =
  "w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#B87333] focus:ring-2 focus:ring-[#B87333]/20 transition";

function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 overflow-y-auto"
      style={{ background: "rgba(15,26,36,0.55)", backdropFilter: "blur(4px)" }} onMouseDown={onClose}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? "max-w-3xl" : "max-w-lg"} my-4`}
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold" style={{ color: NAVY }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X size={18} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

const BtnPrimary = ({ children, ...p }) => (
  <button {...p} className={`inline-flex items-center gap-2 h-10 px-4 rounded-lg text-white text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 ${p.className || ""}`}
    style={{ background: COPPER }}
    onMouseEnter={(e) => (e.currentTarget.style.background = COPPER_DK)}
    onMouseLeave={(e) => (e.currentTarget.style.background = COPPER)}>{children}</button>
);
const BtnGhost = ({ children, ...p }) => (
  <button {...p} className={`inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition ${p.className || ""}`}>{children}</button>
);

function Toolbar({ query, setQuery, placeholder, onAdd, addLabel, onExport }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-5">
      <div className="relative flex-1 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder}
          className="w-full h-10 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:bg-white focus:border-[#B87333] transition" />
      </div>
      <div className="flex gap-2">
        {onExport && <BtnGhost onClick={onExport}><Download size={16} /> CSV</BtnGhost>}
        {onAdd && <BtnPrimary onClick={onAdd}><Plus size={16} /> {addLabel}</BtnPrimary>}
      </div>
    </div>
  );
}

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>{children}</div>
);

/* ============================ CSV export ============================ */
function exportCSV(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ============================ PDF: Estado de Resultado ============================ */
function hexToRgb(hex) {
  const h = (hex || "#000000").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src; s.onload = () => resolve(); s.onerror = () => reject(new Error("script load failed"));
    document.body.appendChild(s);
  });
}
async function ensureJsPDF() {
  if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  if (!window.jspdf?.jsPDF) throw new Error("jsPDF no disponible");
  return window.jspdf.jsPDF;
}
const pdfMoney = (n) => "$" + Math.round(n || 0).toLocaleString("es-CL");

async function generateIncomeStatementPDF(d) {
  const JsPDF = await ensureJsPDF();
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 15;
  const navy = hexToRgb(d.company.secondary_color || "#1A2B3C");
  const copper = hexToRgb(d.company.primary_color || "#B87333");
  const accent = hexToRgb(d.company.accent_color || "#FFB347");
  let y = 48;

  // Encabezado
  doc.setFillColor(...navy); doc.rect(0, 0, W, 34, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text(d.company.name, M, 15);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(`${d.company.rut} · ${d.company.address}`, M, 21);
  doc.setTextColor(...accent); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("ESTADO DE RESULTADO", W - M, 14, { align: "right" });
  doc.setTextColor(225, 225, 225); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(d.periodLabel, W - M, 21, { align: "right" });
  doc.setFontSize(8); doc.text(d.includeCarry ? "Incluye deuda de arrastre" : "Resultado operacional", W - M, 27, { align: "right" });

  const line = (yy) => { doc.setDrawColor(225, 228, 232); doc.setLineWidth(0.2); doc.line(M, yy, W - M, yy); };
  const row = (label, value, opt = {}) => {
    const { bold, color, size = 10, indent = 0 } = opt;
    doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size);
    doc.setTextColor(...(color || [71, 85, 105]));
    doc.text(label, M + indent, y); doc.text(value, W - M, y, { align: "right" }); y += 6.5;
  };
  const section = (t) => { doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...copper); doc.text(t.toUpperCase(), M, y); y += 2; line(y); y += 5.5; };
  const box = (color) => { doc.setFillColor(...color); doc.roundedRect(M, y - 4.5, W - 2 * M, 10.5, 2, 2, "F"); };

  section("Ingresos");
  row("Facturación", pdfMoney(d.facturado));
  row("Otros ingresos", pdfMoney(d.otrosIngresos));
  row("Total ingresos", pdfMoney(d.ingresos), { bold: true, color: navy });
  y += 3;
  section("Egresos");
  row("Gastos operacionales", pdfMoney(d.gastos));
  row("Compras", pdfMoney(d.compras));
  row("Total egresos", pdfMoney(d.gastos + d.compras), { bold: true, color: [185, 28, 28] });
  y += 4;
  box([245, 247, 249]); row("Resultado operacional", pdfMoney(d.neto), { bold: true, color: d.neto >= 0 ? [4, 120, 87] : [185, 28, 28], size: 11 });
  y += 4;
  section("Impuesto al valor agregado");
  row("IVA débito (ventas)", pdfMoney(d.ivaDebito));
  row("IVA crédito (compras)", pdfMoney(d.ivaCredito));
  row("IVA a pagar al SII", pdfMoney(Math.max(0, d.ivaDebito - d.ivaCredito)), { bold: true, color: navy });

  if (d.showAnnual) {
    y += 4; section("Ajustes de consolidación anual");
    if (d.includeCarry) row(`(−) Deuda de arrastre (${d.coveredYears.join(", ")})`, pdfMoney(d.carryForPeriod), { color: [180, 83, 9] });
    if (d.includeLoans) row(`(−) Préstamos e inversiones (${d.coveredYears.join(", ")})`, pdfMoney(d.loansForPeriod), { color: [180, 83, 9] });
    y += 1; box(d.resultadoAnual >= 0 ? [236, 253, 245] : [254, 242, 242]);
    row("Resultado anual", pdfMoney(d.resultadoAnual), { bold: true, color: d.resultadoAnual >= 0 ? [4, 120, 87] : [185, 28, 28], size: 11 });
  }

  if (d.mode === "aggregate" && d.monthly.length) {
    y += 6; if (y > 245) { doc.addPage(); y = 20; }
    section("Detalle mensual (operacional)");
    const c2 = 105, c3 = 150, c4 = W - M;
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(120, 130, 140);
    doc.text("Mes", M, y); doc.text("Ingresos", c2, y, { align: "right" }); doc.text("Egresos", c3, y, { align: "right" }); doc.text("Neto", c4, y, { align: "right" });
    y += 1.5; line(y); y += 4.5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    d.monthly.forEach((m) => {
      if (y > 282) { doc.addPage(); y = 20; }
      doc.setTextColor(71, 85, 105);
      doc.text(String(m.label), M, y); doc.text(pdfMoney(m.ingresos), c2, y, { align: "right" }); doc.text(pdfMoney(m.gastos + m.compras), c3, y, { align: "right" });
      doc.setTextColor(...(m.neto >= 0 ? [4, 120, 87] : [185, 28, 28])); doc.text(pdfMoney(m.neto), c4, y, { align: "right" });
      y += 5.5;
    });
  }

  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(150, 155, 160);
  doc.text(`Generado el ${new Date().toLocaleString("es-CL")} · CONSA — Sistema de administración`, M, 290);
  doc.save(`estado_resultado_${d.fileTag}.pdf`);
}

// Respaldo si el entorno bloquea la carga de jsPDF: ventana imprimible.
function printIncomeStatement(d) {
  const r = (l, v, b) => `<tr><td>${l}</td><td style="text-align:right${b ? ";font-weight:700" : ""}">${pdfMoney(v)}</td></tr>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Estado de Resultado</title>
  <style>body{font-family:Arial,Helvetica,sans-serif;color:#1A2B3C;margin:32px}h1{font-size:18px;margin:0}table{width:100%;border-collapse:collapse;margin:8px 0}td{padding:6px 0;border-bottom:1px solid #eee}.hd{background:#1A2B3C;color:#fff;padding:16px;border-radius:8px;display:flex;justify-content:space-between}.sec{color:#B87333;font-size:11px;text-transform:uppercase;font-weight:700;margin-top:16px}</style></head><body>
  <div class="hd"><div><h1>${d.company.name}</h1><div style="font-size:11px;opacity:.85">${d.company.rut} · ${d.company.address}</div></div>
  <div style="text-align:right"><div style="color:#FFB347;font-weight:700">ESTADO DE RESULTADO</div><div style="font-size:11px">${d.periodLabel}</div></div></div>
  <div class="sec">Ingresos</div><table>${r("Facturación", d.facturado)}${r("Otros ingresos", d.otrosIngresos)}${r("Total ingresos", d.ingresos, true)}</table>
  <div class="sec">Egresos</div><table>${r("Gastos operacionales", d.gastos)}${r("Compras", d.compras)}${r("Total egresos", d.gastos + d.compras, true)}</table>
  <table>${r("Resultado operacional", d.neto, true)}</table>
  <div class="sec">IVA</div><table>${r("IVA débito", d.ivaDebito)}${r("IVA crédito", d.ivaCredito)}${r("IVA a pagar al SII", Math.max(0, d.ivaDebito - d.ivaCredito), true)}</table>
  ${d.showAnnual ? `<div class="sec">Ajustes de consolidación anual (${d.coveredYears.join(", ")})</div><table>${d.includeCarry ? r("(−) Deuda de arrastre", d.carryForPeriod) : ""}${d.includeLoans ? r("(−) Préstamos e inversiones", d.loansForPeriod) : ""}${r("Resultado anual", d.resultadoAnual, true)}</table>` : ""}
  <p style="font-size:10px;color:#999;margin-top:24px">Generado el ${new Date().toLocaleString("es-CL")} · CONSA</p>
  <script>window.onload=function(){window.print()}</script></body></html>`;
  const w = window.open("", "_blank");
  if (!w) throw new Error("popup blocked");
  w.document.write(html); w.document.close();
}

/* ============================ Dashboard ============================ */
function Dashboard({ state, go }) {
  const { invoices, expenses, purchases } = state;
  const now = Date.now();
  const totalFacturado = invoices.reduce((s, i) => s + i.total, 0);
  const totalPagado = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const totalPendiente = totalFacturado - totalPagado;
  const totalGastos = expenses.reduce((s, e) => s + e.amount, 0) + purchases.reduce((s, p) => s + p.total, 0);
  const ivaDebito = invoices.reduce((s, i) => s + i.tax_total, 0);
  const ivaCredito = purchases.reduce((s, p) => s + p.tax_amount, 0);

  const overdue = invoices.filter((i) => i.status !== "paid" && new Date(i.due_date).getTime() < now);

  const months = useMemo(() => {
    const arr = [];
    for (let k = 5; k >= 0; k--) {
      const d = new Date(); d.setMonth(d.getMonth() - k);
      arr.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("es-CL", { month: "short" }) });
    }
    const bucket = (dateStr) => { const d = new Date(dateStr); return `${d.getFullYear()}-${d.getMonth()}`; };
    return arr.map((m) => {
      const ventas = invoices.filter((i) => bucket(i.created_at) === m.key).reduce((s, i) => s + i.total, 0);
      const compras = purchases.filter((p) => bucket(p.date) === m.key).reduce((s, p) => s + p.total, 0);
      const gastos = expenses.filter((e) => bucket(e.date) === m.key).reduce((s, e) => s + e.amount, 0);
      const ivaD = invoices.filter((i) => bucket(i.created_at) === m.key).reduce((s, i) => s + i.tax_total, 0);
      const ivaC = purchases.filter((p) => bucket(p.date) === m.key).reduce((s, p) => s + p.tax_amount, 0);
      return { name: m.label, Ventas: ventas, Compras: compras, Gastos: gastos, "Balance IVA": ivaD - ivaC };
    });
  }, [invoices, purchases, expenses]);

  const topClients = useMemo(() => {
    const map = {};
    invoices.forEach((i) => { map[i.client_name] = (map[i.client_name] || 0) + i.total; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));
  }, [invoices]);

  const statusData = Object.keys(INVOICE_STATUS).map((k) => ({
    name: INVOICE_STATUS[k].label, value: invoices.filter((i) => i.status === k).length,
  })).filter((d) => d.value);
  const PIE = [COPPER, NAVY, ACCENT, "#10B981", "#8B5422"];

  const Metric = ({ icon: Icon, label, value, tone, delta }) => (
    <Card className="p-5 relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-[0.06] group-hover:opacity-10 transition" style={{ background: tone }} />
      <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide">
        <Icon size={15} style={{ color: tone }} /> {label}
      </div>
      <div className="mt-2 text-2xl font-bold" style={{ color: NAVY }}>{value}</div>
      {delta != null && (
        <div className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          {delta >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{Math.abs(delta)}% vs mes anterior
        </div>
      )}
    </Card>
  );

  return (
    <div className="space-y-6">
      {overdue.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Bell size={18} className="text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-800">
            <span className="font-semibold">{overdue.length} factura{overdue.length > 1 ? "s" : ""} vencida{overdue.length > 1 ? "s" : ""}</span>{" "}
            por {clp(overdue.reduce((s, i) => s + i.total, 0))}.{" "}
            <button onClick={() => go("invoices")} className="underline font-medium hover:text-amber-900">Revisar cobranza</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric icon={FileText} label="Total facturado" value={clp(totalFacturado)} tone={COPPER} delta={12} />
        <Metric icon={CheckCircle2} label="Total pagado" value={clp(totalPagado)} tone="#10B981" delta={8} />
        <Metric icon={Clock} label="Total pendiente" value={clp(totalPendiente)} tone={ACCENT} delta={-4} />
        <Metric icon={Receipt} label="Gastos + compras" value={clp(totalGastos)} tone={NAVY} delta={3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold" style={{ color: NAVY }}>Ventas · Compras · Gastos</h3>
            <span className="text-xs text-slate-400">últimos 6 meses</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={months} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => clp(v)} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Ventas" fill={COPPER} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Compras" fill={NAVY} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Gastos" fill={ACCENT} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold mb-1" style={{ color: NAVY }}>Balance de IVA</h3>
          <div className="flex items-center gap-4 mb-3">
            <div>
              <div className="text-xs text-slate-400">Débito</div>
              <div className="font-bold text-sm" style={{ color: COPPER }}>{clp(ivaDebito)}</div>
            </div>
            <ArrowRightLeft size={16} className="text-slate-300" />
            <div>
              <div className="text-xs text-slate-400">Crédito</div>
              <div className="font-bold text-sm" style={{ color: NAVY }}>{clp(ivaCredito)}</div>
            </div>
          </div>
          <div className="rounded-xl px-3 py-2 mb-3" style={{ background: ivaDebito - ivaCredito >= 0 ? "#FFF0E0" : "#ecfdf5" }}>
            <div className="text-xs text-slate-500">A pagar al SII</div>
            <div className="font-bold" style={{ color: ivaDebito - ivaCredito >= 0 ? COPPER_DK : "#047857" }}>
              {clp(Math.max(0, ivaDebito - ivaCredito))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={months}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => clp(v)} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Line type="monotone" dataKey="Balance IVA" stroke={COPPER} strokeWidth={2.5} dot={{ r: 3, fill: COPPER }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold" style={{ color: NAVY }}>Top 5 clientes</h3>
            <button onClick={() => go("clients")} className="text-xs font-semibold" style={{ color: COPPER }}>Ver clientes →</button>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={topClients} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f6" />
              <XAxis type="number" tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => clp(v)} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Bar dataKey="value" fill={COPPER} radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold mb-3" style={{ color: NAVY }}>Facturas por estado</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                {statusData.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {statusData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE[i % PIE.length] }} />{d.name}
                </span>
                <span className="font-semibold text-slate-700">{d.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ============================ Clients ============================ */
function Clients({ state, dispatch }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const blank = { client_id: "", company_id: state.company.company_id, name: "", rut: "", email: "", phone: "", address: "" };
  const [form, setForm] = useState(blank);

  const rutOk = form.rut === "" || validRut(form.rut);
  const list = state.clients.filter((c) =>
    [c.name, c.rut, c.email].join(" ").toLowerCase().includes(q.toLowerCase()));

  const openNew = () => { setForm({ ...blank, client_id: uid("client") }); setEdit(null); setOpen(true); };
  const openEdit = (c) => { setForm(c); setEdit(c.client_id); setOpen(true); };
  const save = () => {
    if (!form.name || !validRut(form.rut)) return;
    const item = { ...form, rut: formatRut(form.rut) };
    dispatch({ type: "UPSERT", coll: "clients", item, key: "client_id" });
    dispatch({ type: "LOG", msg: `${edit ? "actualizó" : "creó"} el cliente ${item.name}` });
    setOpen(false);
  };
  const remove = (c) => {
    dispatch({ type: "DELETE", coll: "clients", id: c.client_id, key: "client_id" });
    dispatch({ type: "LOG", msg: `eliminó el cliente ${c.name}` });
  };

  return (
    <div>
      <Toolbar query={q} setQuery={setQ} placeholder="Buscar por nombre, RUT o email…" onAdd={openNew} addLabel="Nuevo cliente"
        onExport={() => exportCSV("clientes_consa.csv", list.map(({ client_id, company_id, ...r }) => r))} />
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider">
              <th className="text-left font-semibold px-4 py-3">Cliente</th>
              <th className="text-left font-semibold px-4 py-3">RUT</th>
              <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Contacto</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.client_id} className="border-t border-slate-100 hover:bg-slate-50/60 transition">
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-800">{c.name}</div>
                  <div className="text-xs text-slate-400 md:hidden">{c.email}</div>
                </td>
                <td className="px-4 py-3 text-slate-600 tabular-nums">{c.rut}</td>
                <td className="px-4 py-3 hidden md:table-cell text-slate-600">
                  <div>{c.email}</div><div className="text-xs text-slate-400">{c.phone}</div>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Edit3 size={15} /></button>
                  <button onClick={() => remove(c)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">Sin clientes. Crea el primero para empezar.</td></tr>}
          </tbody>
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={edit ? "Editar cliente" : "Nuevo cliente"}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Field label="Razón social / Nombre">
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </Field></div>
          <Field label="RUT" hint={!rutOk ? "RUT inválido (dígito verificador)" : "Se valida con módulo 11"}>
            <input className={`${inputCls} ${!rutOk ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""}`}
              value={form.rut} onChange={(e) => setForm({ ...form, rut: e.target.value })}
              onBlur={(e) => e.target.value && setForm({ ...form, rut: formatRut(e.target.value) })} placeholder="76.100.200-3" />
          </Field>
          <Field label="Teléfono"><input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><input className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Dirección">
            <input className={inputCls} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field></div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <BtnGhost onClick={() => setOpen(false)}>Cancelar</BtnGhost>
          <BtnPrimary onClick={save} disabled={!form.name || !validRut(form.rut)}>Guardar cliente</BtnPrimary>
        </div>
      </Modal>
    </div>
  );
}

/* ============================ Invoice / Quote editor ============================ */
function DocEditor({ open, onClose, onSave, clients, projects = [], initial, kind }) {
  const isQuote = kind === "quote";
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  if (!open) return null;

  const setItem = (idx, patch) => setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }));
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { description: "", quantity: 1, price: 0, tax_rate: 19 }] }));
  const delItem = (idx) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const subtotal = form.items.reduce((s, i) => s + i.quantity * i.price, 0);
  const tax = Math.round(subtotal * 0.19);
  const total = subtotal + tax;
  const client = clients.find((c) => c.client_id === form.client_id);

  const save = () => {
    if (!form.client_id || !form.items.length) return;
    onSave({ ...form, client_name: client?.name || "", subtotal, tax_total: tax, total });
  };

  return (
    <Modal open={open} onClose={onClose} wide title={isQuote ? (form._new ? "Nuevo presupuesto" : "Editar presupuesto") : (form._new ? "Nueva factura" : "Editar factura")}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2"><Field label="Cliente">
          <select className={inputCls} value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
            <option value="">Seleccionar…</option>
            {clients.map((c) => <option key={c.client_id} value={c.client_id}>{c.name}</option>)}
          </select>
        </Field></div>
        <Field label={isQuote ? "N° presupuesto" : "N° / Folio"}>
          <input className={inputCls} value={isQuote ? form.quote_number : form.invoice_number}
            onChange={(e) => setForm(isQuote ? { ...form, quote_number: e.target.value } : { ...form, invoice_number: e.target.value })} />
        </Field>
        {!isQuote && (
          <Field label="Tipo DTE (SII)">
            <select className={inputCls} value={form.tipo_dte} onChange={(e) => setForm({ ...form, tipo_dte: Number(e.target.value) })}>
              {Object.entries(DTE_TYPES).map(([k, v]) => <option key={k} value={k}>{k} · {v}</option>)}
            </select>
          </Field>
        )}
        <Field label={isQuote ? "Válido hasta" : "Vencimiento"}>
          <input type="date" className={inputCls}
            value={(isQuote ? form.valid_until : form.due_date)?.slice(0, 10) || ""}
            onChange={(e) => setForm(isQuote ? { ...form, valid_until: e.target.value } : { ...form, due_date: e.target.value })} />
        </Field>
        <div className={isQuote ? "sm:col-span-2" : "sm:col-span-3"}><Field label="Proyecto / Mina">
          <select className={inputCls} value={form.project_id || ""} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
            <option value="">— Sin proyecto —</option>
            {projects.map((p) => <option key={p.project_id} value={p.project_id}>{p.name} · {p.code}</option>)}
          </select>
        </Field></div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ítems</span>
          <button onClick={addItem} className="text-xs font-semibold inline-flex items-center gap-1" style={{ color: COPPER }}><Plus size={13} /> Agregar ítem</button>
        </div>
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
            <div className="col-span-6">Descripción</div><div className="col-span-2 text-right">Cantidad</div>
            <div className="col-span-3 text-right">Precio unit.</div><div className="col-span-1"></div>
          </div>
          {form.items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-slate-100 items-center">
              <input className="col-span-6 h-9 rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-[#B87333]"
                value={it.description} placeholder="Detalle del servicio o producto"
                onChange={(e) => setItem(idx, { description: e.target.value })} />
              <input type="number" className="col-span-2 h-9 rounded-md border border-slate-200 px-2 text-sm text-right outline-none focus:border-[#B87333]"
                value={it.quantity} onChange={(e) => setItem(idx, { quantity: Number(e.target.value) })} />
              <input type="number" className="col-span-3 h-9 rounded-md border border-slate-200 px-2 text-sm text-right outline-none focus:border-[#B87333]"
                value={it.price} onChange={(e) => setItem(idx, { price: Number(e.target.value) })} />
              <button onClick={() => delItem(idx)} className="col-span-1 text-slate-400 hover:text-red-500 flex justify-center"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4 mt-5">
        <div className="flex-1"><Field label="Notas">
          <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#B87333] min-h-[76px]"
            value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Condiciones, referencias…" />
        </Field></div>
        <div className="w-full sm:w-56 rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-1.5 text-sm self-end">
          <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="tabular-nums">{clp(subtotal)}</span></div>
          <div className="flex justify-between text-slate-600"><span>IVA 19%</span><span className="tabular-nums">{clp(tax)}</span></div>
          <div className="flex justify-between font-bold pt-1.5 border-t border-slate-200" style={{ color: NAVY }}><span>Total</span><span className="tabular-nums">{clp(total)}</span></div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <BtnGhost onClick={onClose}>Cancelar</BtnGhost>
        <BtnPrimary onClick={save} disabled={!form.client_id || !form.items.length}>Guardar</BtnPrimary>
      </div>
    </Modal>
  );
}

/* ============================ Invoices ============================ */
function Invoices({ state, dispatch }) {
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState(null);
  const [preview, setPreview] = useState(null);

  const nextNumber = () => {
    const nums = state.invoices.map((i) => parseInt(i.invoice_number.split("-")[1] || "0", 10)).filter(Boolean);
    return `F-${String((Math.max(0, ...nums) + 1)).padStart(6, "0")}`;
  };
  const openNew = () => {
    const num = nextNumber();
    setInitial({ _new: true, invoice_id: uid("inv"), company_id: state.company.company_id, client_id: "", client_name: "", invoice_number: num, folio: num.split("-")[1], tipo_dte: 33, project_id: "", items: [{ description: "", quantity: 1, price: 0, tax_rate: 19 }], status: "draft", created_at: new Date().toISOString(), due_date: "", notes: "" });
    setOpen(true);
  };
  const openEdit = (inv) => { setInitial({ ...inv, _new: false }); setOpen(true); };
  const save = (item) => {
    const { _new, ...clean } = item;
    dispatch({ type: "UPSERT", coll: "invoices", item: clean, key: "invoice_id" });
    dispatch({ type: "LOG", msg: `${_new ? "creó" : "actualizó"} la factura ${clean.invoice_number}` });
    setOpen(false);
  };
  const setStatus = (inv, status) => {
    dispatch({ type: "UPSERT", coll: "invoices", item: { ...inv, status, paid_at: status === "paid" ? new Date().toISOString() : inv.paid_at }, key: "invoice_id" });
    dispatch({ type: "LOG", msg: `cambió la factura ${inv.invoice_number} a ${INVOICE_STATUS[status].label}` });
  };
  const remove = (inv) => { dispatch({ type: "DELETE", coll: "invoices", id: inv.invoice_id, key: "invoice_id" }); dispatch({ type: "LOG", msg: `eliminó la factura ${inv.invoice_number}` }); };

  const now = Date.now();
  const list = state.invoices
    .filter((i) => statusF === "all" || i.status === statusF)
    .filter((i) => [i.invoice_number, i.client_name].join(" ").toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <Toolbar query={q} setQuery={setQ} placeholder="Buscar por folio o cliente…" onAdd={openNew} addLabel="Nueva factura"
        onExport={() => exportCSV("facturas_consa.csv", list.map((i) => ({ folio: i.invoice_number, tipo_dte: DTE_TYPES[i.tipo_dte], cliente: i.client_name, total: i.total, estado: INVOICE_STATUS[i.status].label, emitida: shortDate(i.created_at), vence: shortDate(i.due_date) })))} />
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {[["all", "Todas"], ...Object.entries(INVOICE_STATUS).map(([k, v]) => [k, v.label])].map(([k, label]) => (
          <button key={k} onClick={() => setStatusF(k)}
            className={`px-3 h-8 rounded-lg text-xs font-semibold border transition ${statusF === k ? "text-white border-transparent" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
            style={statusF === k ? { background: NAVY } : {}}>{label}</button>
        ))}
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider">
              <th className="text-left font-semibold px-4 py-3">Folio</th>
              <th className="text-left font-semibold px-4 py-3">Cliente</th>
              <th className="text-right font-semibold px-4 py-3">Total</th>
              <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Vence</th>
              <th className="text-left font-semibold px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((i) => {
              const overdue = i.status !== "paid" && new Date(i.due_date).getTime() < now;
              return (
                <tr key={i.invoice_id} className="border-t border-slate-100 hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3">
                    <button onClick={() => setPreview(i)} className="font-semibold hover:underline" style={{ color: COPPER }}>{i.invoice_number}</button>
                    <div className="text-[11px] text-slate-400">{DTE_TYPES[i.tipo_dte]}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{i.client_name}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums" style={{ color: NAVY }}>{clp(i.total)}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={overdue ? "text-red-600 font-medium" : "text-slate-500"}>{shortDate(i.due_date)}</span>
                    {overdue && <span className="ml-1 text-[10px] text-red-500 font-semibold">VENCIDA</span>}
                  </td>
                  <td className="px-4 py-3"><Badge map={INVOICE_STATUS} value={i.status} /></td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <select value={i.status} onChange={(e) => setStatus(i, e.target.value)}
                      className="h-8 rounded-lg border border-slate-200 text-xs px-1.5 mr-1 outline-none focus:border-[#B87333]">
                      {Object.entries(INVOICE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <button onClick={() => openEdit(i)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Edit3 size={15} /></button>
                    <button onClick={() => remove(i)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={15} /></button>
                  </td>
                </tr>
              );
            })}
            {!list.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Sin facturas en esta vista.</td></tr>}
          </tbody>
        </table>
      </Card>

      {initial && <DocEditor open={open} onClose={() => setOpen(false)} onSave={save} clients={state.clients} projects={state.projects} initial={initial} kind="invoice" />}
      <InvoicePreview inv={preview} company={state.company} onClose={() => setPreview(null)} />
    </div>
  );
}

function InvoicePreview({ inv, company, onClose }) {
  if (!inv) return null;
  return (
    <Modal open={!!inv} onClose={onClose} wide title={`${inv.invoice_number} · ${DTE_TYPES[inv.tipo_dte]}`}>
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 text-white flex justify-between items-start" style={{ background: NAVY }}>
          <div>
            <div className="text-lg font-bold">{company.name}</div>
            <div className="text-xs opacity-80">{company.rut} · {company.address}</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-widest opacity-70">{DTE_TYPES[inv.tipo_dte]}</div>
            <div className="text-xl font-bold" style={{ color: ACCENT }}>{inv.invoice_number}</div>
          </div>
        </div>
        <div className="px-8 py-6 bg-white">
          <div className="flex justify-between mb-6 text-sm">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Facturar a</div>
              <div className="font-semibold text-slate-800">{inv.client_name}</div>
            </div>
            <div className="text-right">
              <div className="text-slate-500">Emitida: <span className="font-medium text-slate-700">{shortDate(inv.created_at)}</span></div>
              <div className="text-slate-500">Vence: <span className="font-medium text-slate-700">{shortDate(inv.due_date)}</span></div>
            </div>
          </div>
          <table className="w-full text-sm mb-4">
            <thead><tr className="border-b-2" style={{ borderColor: COPPER }}>
              <th className="text-left py-2 text-slate-500 font-semibold">Descripción</th>
              <th className="text-right py-2 text-slate-500 font-semibold">Cant.</th>
              <th className="text-right py-2 text-slate-500 font-semibold">Precio</th>
              <th className="text-right py-2 text-slate-500 font-semibold">Importe</th>
            </tr></thead>
            <tbody>
              {inv.items.map((it, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-2 text-slate-700">{it.description}</td>
                  <td className="py-2 text-right text-slate-600 tabular-nums">{it.quantity}</td>
                  <td className="py-2 text-right text-slate-600 tabular-nums">{clp(it.price)}</td>
                  <td className="py-2 text-right font-medium text-slate-800 tabular-nums">{clp(it.quantity * it.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end">
            <div className="w-64 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="tabular-nums">{clp(inv.subtotal)}</span></div>
              <div className="flex justify-between text-slate-600"><span>IVA 19%</span><span className="tabular-nums">{clp(inv.tax_total)}</span></div>
              <div className="flex justify-between font-bold text-base pt-2 border-t-2" style={{ borderColor: COPPER, color: NAVY }}><span>Total</span><span className="tabular-nums">{clp(inv.total)}</span></div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <BtnGhost onClick={() => window.print()}><Download size={16} /> Imprimir / PDF</BtnGhost>
        <BtnPrimary onClick={onClose}><Send size={16} /> Cerrar</BtnPrimary>
      </div>
    </Modal>
  );
}

/* ============================ Quotes ============================ */
function Quotes({ state, dispatch }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState(null);

  const openNew = () => {
    const nums = state.quotes.map((x) => parseInt(x.quote_number.split("-")[1] || "0", 10)).filter(Boolean);
    const num = `P-${String((Math.max(0, ...nums) + 1)).padStart(6, "0")}`;
    setInitial({ _new: true, quote_id: uid("quote"), company_id: state.company.company_id, client_id: "", client_name: "", quote_number: num, project_id: "", items: [{ description: "", quantity: 1, price: 0, tax_rate: 19 }], status: "draft", valid_until: "", created_at: new Date().toISOString(), notes: "" });
    setOpen(true);
  };
  const save = (item) => { const { _new, ...clean } = item; dispatch({ type: "UPSERT", coll: "quotes", item: clean, key: "quote_id" }); dispatch({ type: "LOG", msg: `${_new ? "creó" : "actualizó"} el presupuesto ${clean.quote_number}` }); setOpen(false); };
  const convert = (qte) => {
    const nums = state.invoices.map((i) => parseInt(i.invoice_number.split("-")[1] || "0", 10)).filter(Boolean);
    const num = `F-${String((Math.max(0, ...nums) + 1)).padStart(6, "0")}`;
    const inv = { invoice_id: uid("inv"), company_id: qte.company_id, client_id: qte.client_id, client_name: qte.client_name, invoice_number: num, folio: num.split("-")[1], tipo_dte: 33, project_id: qte.project_id || "", items: qte.items, subtotal: qte.subtotal, tax_total: qte.tax_total, total: qte.total, status: "draft", created_at: new Date().toISOString(), due_date: new Date(Date.now() + 30 * 864e5).toISOString(), notes: `Convertido desde ${qte.quote_number}` };
    dispatch({ type: "UPSERT", coll: "invoices", item: inv, key: "invoice_id" });
    dispatch({ type: "UPSERT", coll: "quotes", item: { ...qte, status: "converted" }, key: "quote_id" });
    dispatch({ type: "LOG", msg: `convirtió ${qte.quote_number} en factura ${num}` });
  };
  const remove = (qte) => { dispatch({ type: "DELETE", coll: "quotes", id: qte.quote_id, key: "quote_id" }); dispatch({ type: "LOG", msg: `eliminó el presupuesto ${qte.quote_number}` }); };

  const list = state.quotes.filter((x) => [x.quote_number, x.client_name].join(" ").toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <Toolbar query={q} setQuery={setQ} placeholder="Buscar presupuestos…" onAdd={openNew} addLabel="Nuevo presupuesto"
        onExport={() => exportCSV("presupuestos_consa.csv", list.map((x) => ({ numero: x.quote_number, cliente: x.client_name, total: x.total, estado: QUOTE_STATUS[x.status].label, valido_hasta: shortDate(x.valid_until) })))} />
      <Card>
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider">
            <th className="text-left font-semibold px-4 py-3">N°</th><th className="text-left font-semibold px-4 py-3">Cliente</th>
            <th className="text-right font-semibold px-4 py-3">Total</th><th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Válido hasta</th>
            <th className="text-left font-semibold px-4 py-3">Estado</th><th className="px-4 py-3"></th>
          </tr></thead>
          <tbody>
            {list.map((x) => (
              <tr key={x.quote_id} className="border-t border-slate-100 hover:bg-slate-50/60 transition">
                <td className="px-4 py-3 font-semibold" style={{ color: COPPER }}>{x.quote_number}</td>
                <td className="px-4 py-3 text-slate-700">{x.client_name}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums" style={{ color: NAVY }}>{clp(x.total)}</td>
                <td className="px-4 py-3 hidden md:table-cell text-slate-500">{shortDate(x.valid_until)}</td>
                <td className="px-4 py-3"><Badge map={QUOTE_STATUS} value={x.status} /></td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {x.status !== "converted" && (
                    <button onClick={() => convert(x)} title="Convertir a factura"
                      className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-semibold border border-[#B87333] mr-1" style={{ color: COPPER }}>
                      <ArrowRightLeft size={13} /> Facturar
                    </button>
                  )}
                  <button onClick={() => remove(x)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Sin presupuestos.</td></tr>}
          </tbody>
        </table>
      </Card>
      {initial && <DocEditor open={open} onClose={() => setOpen(false)} onSave={save} clients={state.clients} projects={state.projects} initial={initial} kind="quote" />}
    </div>
  );
}

/* ============================ Purchase Orders ============================ */
function POEditor({ open, onClose, onSave, initial, projects = [] }) {
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  if (!open) return null;
  const setItem = (idx, patch) => setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }));
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { description: "", quantity: 1, price: 0, tax_rate: 19 }] }));
  const delItem = (idx) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const subtotal = form.items.reduce((s, i) => s + i.quantity * i.price, 0);
  const tax = Math.round(subtotal * 0.19);
  const total = subtotal + tax;
  const rutOk = !form.supplier_rut || validRut(form.supplier_rut);
  const save = () => { if (!form.supplier_name || !form.items.length) return; onSave({ ...form, subtotal, tax_total: tax, total, supplier_rut: form.supplier_rut ? formatRut(form.supplier_rut) : "" }); };

  return (
    <Modal open={open} onClose={onClose} wide title={form._new ? "Nueva orden de compra" : "Editar orden de compra"}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2"><Field label="Proveedor">
          <input className={inputCls} value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} autoFocus placeholder="Razón social del proveedor" />
        </Field></div>
        <Field label="N° orden"><input className={inputCls} value={form.po_number} onChange={(e) => setForm({ ...form, po_number: e.target.value })} /></Field>
        <Field label="RUT proveedor" hint={!rutOk ? "RUT inválido" : undefined}>
          <input className={`${inputCls} ${!rutOk ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""}`}
            value={form.supplier_rut} onChange={(e) => setForm({ ...form, supplier_rut: e.target.value })}
            onBlur={(e) => e.target.value && setForm({ ...form, supplier_rut: formatRut(e.target.value) })} placeholder="76.800.900-1" />
        </Field>
        <Field label="Email proveedor"><input className={inputCls} value={form.supplier_email} onChange={(e) => setForm({ ...form, supplier_email: e.target.value })} /></Field>
        <Field label="Fecha de entrega"><input type="date" className={inputCls} value={form.delivery_date?.slice(0, 10) || ""} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="Proyecto / Mina">
          <select className={inputCls} value={form.project_id || ""} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
            <option value="">— Sin proyecto —</option>
            {projects.map((p) => <option key={p.project_id} value={p.project_id}>{p.name} · {p.code}</option>)}
          </select>
        </Field></div>
        <div className="sm:col-span-1"><Field label="Dirección del proveedor"><input className={inputCls} value={form.supplier_address} onChange={(e) => setForm({ ...form, supplier_address: e.target.value })} /></Field></div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ítems solicitados</span>
          <button onClick={addItem} className="text-xs font-semibold inline-flex items-center gap-1" style={{ color: COPPER }}><Plus size={13} /> Agregar ítem</button>
        </div>
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
            <div className="col-span-6">Descripción</div><div className="col-span-2 text-right">Cantidad</div>
            <div className="col-span-3 text-right">Precio unit.</div><div className="col-span-1"></div>
          </div>
          {form.items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-slate-100 items-center">
              <input className="col-span-6 h-9 rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-[#B87333]" value={it.description} placeholder="Producto o insumo" onChange={(e) => setItem(idx, { description: e.target.value })} />
              <input type="number" className="col-span-2 h-9 rounded-md border border-slate-200 px-2 text-sm text-right outline-none focus:border-[#B87333]" value={it.quantity} onChange={(e) => setItem(idx, { quantity: Number(e.target.value) })} />
              <input type="number" className="col-span-3 h-9 rounded-md border border-slate-200 px-2 text-sm text-right outline-none focus:border-[#B87333]" value={it.price} onChange={(e) => setItem(idx, { price: Number(e.target.value) })} />
              <button onClick={() => delItem(idx)} className="col-span-1 text-slate-400 hover:text-red-500 flex justify-center"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4 mt-5">
        <div className="flex-1"><Field label="Notas"><textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#B87333] min-h-[76px]" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Condiciones de entrega, referencias…" /></Field></div>
        <div className="w-full sm:w-56 rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-1.5 text-sm self-end">
          <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="tabular-nums">{clp(subtotal)}</span></div>
          <div className="flex justify-between text-slate-600"><span>IVA 19%</span><span className="tabular-nums">{clp(tax)}</span></div>
          <div className="flex justify-between font-bold pt-1.5 border-t border-slate-200" style={{ color: NAVY }}><span>Total</span><span className="tabular-nums">{clp(total)}</span></div>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-6"><BtnGhost onClick={onClose}>Cancelar</BtnGhost><BtnPrimary onClick={save} disabled={!form.supplier_name || !form.items.length}>Guardar orden</BtnPrimary></div>
    </Modal>
  );
}

function POPreview({ po, company, onClose }) {
  if (!po) return null;
  return (
    <Modal open={!!po} onClose={onClose} wide title={`${po.po_number} · Orden de compra`}>
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 text-white flex justify-between items-start" style={{ background: NAVY }}>
          <div><div className="text-lg font-bold">{company.name}</div><div className="text-xs opacity-80">{company.rut} · {company.address}</div></div>
          <div className="text-right"><div className="text-xs uppercase tracking-widest opacity-70">Orden de Compra</div><div className="text-xl font-bold" style={{ color: ACCENT }}>{po.po_number}</div></div>
        </div>
        <div className="px-8 py-6 bg-white">
          <div className="flex justify-between mb-6 text-sm">
            <div><div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Proveedor</div>
              <div className="font-semibold text-slate-800">{po.supplier_name}</div>
              <div className="text-slate-500">{po.supplier_rut}</div>{po.supplier_email && <div className="text-slate-500">{po.supplier_email}</div>}</div>
            <div className="text-right"><div className="text-slate-500">Emitida: <span className="font-medium text-slate-700">{shortDate(po.created_at)}</span></div>
              <div className="text-slate-500">Entrega: <span className="font-medium text-slate-700">{shortDate(po.delivery_date)}</span></div>
              <div className="mt-1"><Badge map={PO_STATUS} value={po.status} /></div></div>
          </div>
          <table className="w-full text-sm mb-4">
            <thead><tr className="border-b-2" style={{ borderColor: COPPER }}>
              <th className="text-left py-2 text-slate-500 font-semibold">Descripción</th><th className="text-right py-2 text-slate-500 font-semibold">Cant.</th>
              <th className="text-right py-2 text-slate-500 font-semibold">Precio</th><th className="text-right py-2 text-slate-500 font-semibold">Importe</th>
            </tr></thead>
            <tbody>{po.items.map((it, i) => (
              <tr key={i} className="border-b border-slate-100"><td className="py-2 text-slate-700">{it.description}</td>
                <td className="py-2 text-right text-slate-600 tabular-nums">{it.quantity}</td><td className="py-2 text-right text-slate-600 tabular-nums">{clp(it.price)}</td>
                <td className="py-2 text-right font-medium text-slate-800 tabular-nums">{clp(it.quantity * it.price)}</td></tr>
            ))}</tbody>
          </table>
          <div className="flex justify-end"><div className="w-64 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="tabular-nums">{clp(po.subtotal)}</span></div>
            <div className="flex justify-between text-slate-600"><span>IVA 19%</span><span className="tabular-nums">{clp(po.tax_total)}</span></div>
            <div className="flex justify-between font-bold text-base pt-2 border-t-2" style={{ borderColor: COPPER, color: NAVY }}><span>Total</span><span className="tabular-nums">{clp(po.total)}</span></div>
          </div></div>
          {po.notes && <div className="mt-4 text-xs text-slate-500 border-t border-slate-100 pt-3">{po.notes}</div>}
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5"><BtnGhost onClick={() => window.print()}><Download size={16} /> Imprimir / PDF</BtnGhost><BtnPrimary onClick={onClose}>Cerrar</BtnPrimary></div>
    </Modal>
  );
}

function PurchaseOrders({ state, dispatch }) {
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState(null);
  const [preview, setPreview] = useState(null);
  const orders = state.purchaseOrders || [];

  const nextNumber = () => {
    const nums = orders.map((o) => parseInt(o.po_number.split("-")[1] || "0", 10)).filter(Boolean);
    return `OC-${String((Math.max(0, ...nums) + 1)).padStart(6, "0")}`;
  };
  const openNew = () => {
    setInitial({ _new: true, po_id: uid("po"), company_id: state.company.company_id, supplier_name: "", supplier_rut: "", supplier_email: "", supplier_address: "", po_number: nextNumber(), project_id: "", items: [{ description: "", quantity: 1, price: 0, tax_rate: 19 }], status: "draft", delivery_date: "", created_at: new Date().toISOString(), notes: "" });
    setOpen(true);
  };
  const openEdit = (po) => { setInitial({ ...po, _new: false }); setOpen(true); };
  const save = (item) => { const { _new, ...clean } = item; dispatch({ type: "UPSERT", coll: "purchaseOrders", item: clean, key: "po_id" }); dispatch({ type: "LOG", msg: `${_new ? "creó" : "actualizó"} la orden de compra ${clean.po_number}` }); setOpen(false); };
  const setStatus = (po, status) => { dispatch({ type: "UPSERT", coll: "purchaseOrders", item: { ...po, status }, key: "po_id" }); dispatch({ type: "LOG", msg: `cambió la OC ${po.po_number} a ${PO_STATUS[status].label}` }); };
  const receive = (po) => {
    // Al recibir, registra automáticamente la compra con IVA crédito
    dispatch({ type: "UPSERT", coll: "purchaseOrders", item: { ...po, status: "received" }, key: "po_id" });
    const purchase = { purchase_id: uid("purchase"), company_id: po.company_id, supplier_name: po.supplier_name, supplier_rut: po.supplier_rut, doc_type: "Factura", category: "Inventario", net_amount: po.subtotal, tax_amount: po.tax_total, total: po.total, date: new Date().toISOString(), po_ref: po.po_number, project_id: po.project_id || "" };
    dispatch({ type: "UPSERT", coll: "purchases", item: purchase, key: "purchase_id" });
    dispatch({ type: "LOG", msg: `recibió la OC ${po.po_number} y generó la compra asociada` });
  };
  const remove = (po) => { dispatch({ type: "DELETE", coll: "purchaseOrders", id: po.po_id, key: "po_id" }); dispatch({ type: "LOG", msg: `eliminó la OC ${po.po_number}` }); };

  const list = orders
    .filter((o) => statusF === "all" || o.status === statusF)
    .filter((o) => [o.po_number, o.supplier_name].join(" ").toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <Toolbar query={q} setQuery={setQ} placeholder="Buscar por N° o proveedor…" onAdd={openNew} addLabel="Nueva orden"
        onExport={() => exportCSV("ordenes_compra_consa.csv", list.map((o) => ({ numero: o.po_number, proveedor: o.supplier_name, rut: o.supplier_rut, total: o.total, estado: PO_STATUS[o.status].label, entrega: shortDate(o.delivery_date) })))} />
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {[["all", "Todas"], ...Object.entries(PO_STATUS).map(([k, v]) => [k, v.label])].map(([k, label]) => (
          <button key={k} onClick={() => setStatusF(k)}
            className={`px-3 h-8 rounded-lg text-xs font-semibold border transition ${statusF === k ? "text-white border-transparent" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
            style={statusF === k ? { background: NAVY } : {}}>{label}</button>
        ))}
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider">
            <th className="text-left font-semibold px-4 py-3">N°</th><th className="text-left font-semibold px-4 py-3">Proveedor</th>
            <th className="text-right font-semibold px-4 py-3">Total</th><th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Entrega</th>
            <th className="text-left font-semibold px-4 py-3">Estado</th><th className="px-4 py-3"></th>
          </tr></thead>
          <tbody>
            {list.map((o) => (
              <tr key={o.po_id} className="border-t border-slate-100 hover:bg-slate-50/60 transition">
                <td className="px-4 py-3"><button onClick={() => setPreview(o)} className="font-semibold hover:underline" style={{ color: COPPER }}>{o.po_number}</button></td>
                <td className="px-4 py-3 text-slate-700">{o.supplier_name}<div className="text-xs text-slate-400">{o.supplier_rut}</div></td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums" style={{ color: NAVY }}>{clp(o.total)}</td>
                <td className="px-4 py-3 hidden md:table-cell text-slate-500">{shortDate(o.delivery_date)}</td>
                <td className="px-4 py-3"><Badge map={PO_STATUS} value={o.status} /></td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {o.status !== "received" && o.status !== "cancelled" && (
                    <button onClick={() => receive(o)} title="Marcar recibida y generar compra"
                      className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-semibold border border-emerald-300 text-emerald-700 hover:bg-emerald-50 mr-1"><Truck size={13} /> Recibir</button>
                  )}
                  <select value={o.status} onChange={(e) => setStatus(o, e.target.value)} className="h-8 rounded-lg border border-slate-200 text-xs px-1.5 mr-1 outline-none focus:border-[#B87333]">
                    {Object.entries(PO_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <button onClick={() => openEdit(o)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Edit3 size={15} /></button>
                  <button onClick={() => remove(o)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Sin órdenes de compra en esta vista.</td></tr>}
          </tbody>
        </table>
      </Card>
      {initial && <POEditor open={open} onClose={() => setOpen(false)} onSave={save} initial={initial} projects={state.projects} />}
      <POPreview po={preview} company={state.company} onClose={() => setPreview(null)} />
    </div>
  );
}

/* ============================ Purchases ============================ */
function Purchases({ state, dispatch }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const blank = { purchase_id: "", company_id: state.company.company_id, supplier_name: "", supplier_rut: "", doc_type: "Factura", category: "Inventario", project_id: "", net_amount: 0, tax_amount: 0, total: 0, date: todayISO() };
  const [form, setForm] = useState(blank);
  const net = Number(form.net_amount) || 0; const iva = Math.round(net * 0.19);
  const openNew = () => { setForm({ ...blank, purchase_id: uid("purchase") }); setOpen(true); };
  const save = () => {
    if (!form.supplier_name || !net) return;
    const item = { ...form, net_amount: net, tax_amount: iva, total: net + iva, date: new Date(form.date).toISOString(), supplier_rut: form.supplier_rut ? formatRut(form.supplier_rut) : "" };
    dispatch({ type: "UPSERT", coll: "purchases", item, key: "purchase_id" });
    dispatch({ type: "LOG", msg: `registró compra a ${item.supplier_name}` });
    setOpen(false);
  };
  const remove = (p) => dispatch({ type: "DELETE", coll: "purchases", id: p.purchase_id, key: "purchase_id" });
  const list = state.purchases.filter((p) => [p.supplier_name, p.category].join(" ").toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <Toolbar query={q} setQuery={setQ} placeholder="Buscar por proveedor…" onAdd={openNew} addLabel="Nueva compra"
        onExport={() => exportCSV("compras_consa.csv", list.map((p) => ({ proveedor: p.supplier_name, rut: p.supplier_rut, tipo: p.doc_type, categoria: p.category, neto: p.net_amount, iva: p.tax_amount, total: p.total, fecha: shortDate(p.date) })))} />
      <Card>
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider">
            <th className="text-left font-semibold px-4 py-3">Proveedor</th><th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Categoría</th>
            <th className="text-right font-semibold px-4 py-3">Neto</th><th className="text-right font-semibold px-4 py-3 hidden sm:table-cell">IVA</th>
            <th className="text-right font-semibold px-4 py-3">Total</th><th className="px-4 py-3"></th>
          </tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.purchase_id} className="border-t border-slate-100 hover:bg-slate-50/60 transition">
                <td className="px-4 py-3"><div className="font-semibold text-slate-800">{p.supplier_name}</div><div className="text-xs text-slate-400">{p.doc_type} · {shortDate(p.date)}</div></td>
                <td className="px-4 py-3 hidden md:table-cell text-slate-600">{p.category}</td>
                <td className="px-4 py-3 text-right text-slate-600 tabular-nums">{clp(p.net_amount)}</td>
                <td className="px-4 py-3 text-right text-slate-500 tabular-nums hidden sm:table-cell">{clp(p.tax_amount)}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums" style={{ color: NAVY }}>{clp(p.total)}</td>
                <td className="px-4 py-3 text-right"><button onClick={() => remove(p)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={15} /></button></td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Sin compras registradas.</td></tr>}
          </tbody>
        </table>
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="Nueva compra">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Field label="Proveedor"><input className={inputCls} value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} autoFocus /></Field></div>
          <Field label="RUT proveedor"><input className={inputCls} value={form.supplier_rut} onChange={(e) => setForm({ ...form, supplier_rut: e.target.value })} placeholder="76.800.900-1" /></Field>
          <Field label="Tipo documento"><select className={inputCls} value={form.doc_type} onChange={(e) => setForm({ ...form, doc_type: e.target.value })}>{["Factura", "Boleta", "Nota de Crédito"].map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Categoría"><select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{["General", "Inventario", "Servicios", "Activos Fijos", "Otros"].map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Fecha"><input type="date" className={inputCls} value={form.date?.slice(0, 10)} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Proyecto / Mina">
            <select className={inputCls} value={form.project_id || ""} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
              <option value="">— Sin proyecto —</option>
              {(state.projects || []).map((p) => <option key={p.project_id} value={p.project_id}>{p.name} · {p.code}</option>)}
            </select>
          </Field></div>
          <Field label="Monto neto"><input type="number" className={inputCls} value={form.net_amount} onChange={(e) => setForm({ ...form, net_amount: e.target.value })} /></Field>
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 flex items-center justify-between text-sm"><span className="text-slate-500">IVA 19%</span><span className="font-semibold tabular-nums" style={{ color: NAVY }}>{clp(iva)}</span></div>
        </div>
        <div className="flex justify-between items-center mt-5">
          <div className="text-sm text-slate-500">Total: <span className="font-bold text-base" style={{ color: NAVY }}>{clp(net + iva)}</span></div>
          <div className="flex gap-2"><BtnGhost onClick={() => setOpen(false)}>Cancelar</BtnGhost><BtnPrimary onClick={save} disabled={!form.supplier_name || !net}>Guardar</BtnPrimary></div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================ Expenses ============================ */
function Expenses({ state, dispatch }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const cats = ["Suministros", "Servicios", "Transporte", "Marketing", "Software", "Equipos", "Otros"];
  const blank = { expense_id: "", company_id: state.company.company_id, category: "Servicios", description: "", amount: 0, date: todayISO(), vendor: "", project_id: "" };
  const [form, setForm] = useState(blank);
  const openNew = () => { setForm({ ...blank, expense_id: uid("exp") }); setOpen(true); };
  const save = () => { if (!form.description || !form.amount) return; const item = { ...form, amount: Number(form.amount), date: new Date(form.date).toISOString() }; dispatch({ type: "UPSERT", coll: "expenses", item, key: "expense_id" }); dispatch({ type: "LOG", msg: `registró gasto: ${item.description}` }); setOpen(false); };
  const remove = (e) => dispatch({ type: "DELETE", coll: "expenses", id: e.expense_id, key: "expense_id" });
  const list = state.expenses.filter((e) => [e.description, e.category, e.vendor].join(" ").toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <Toolbar query={q} setQuery={setQ} placeholder="Buscar gastos…" onAdd={openNew} addLabel="Nuevo gasto"
        onExport={() => exportCSV("gastos_consa.csv", list.map((e) => ({ descripcion: e.description, categoria: e.category, proveedor: e.vendor, monto: e.amount, fecha: shortDate(e.date) })))} />
      <Card>
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider">
            <th className="text-left font-semibold px-4 py-3">Descripción</th><th className="text-left font-semibold px-4 py-3">Categoría</th>
            <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Fecha</th><th className="text-right font-semibold px-4 py-3">Monto</th><th className="px-4 py-3"></th>
          </tr></thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.expense_id} className="border-t border-slate-100 hover:bg-slate-50/60 transition">
                <td className="px-4 py-3"><div className="font-semibold text-slate-800">{e.description}</div>{e.vendor && <div className="text-xs text-slate-400">{e.vendor}</div>}</td>
                <td className="px-4 py-3"><span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{e.category}</span></td>
                <td className="px-4 py-3 hidden md:table-cell text-slate-500">{shortDate(e.date)}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums" style={{ color: NAVY }}>{clp(e.amount)}</td>
                <td className="px-4 py-3 text-right"><button onClick={() => remove(e)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={15} /></button></td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Sin gastos.</td></tr>}
          </tbody>
        </table>
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo gasto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Field label="Descripción"><input className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} autoFocus /></Field></div>
          <Field label="Categoría"><select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{cats.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Proveedor"><input className={inputCls} value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} /></Field>
          <Field label="Monto"><input type="number" className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          <Field label="Fecha"><input type="date" className={inputCls} value={form.date?.slice(0, 10)} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Proyecto / Mina">
            <select className={inputCls} value={form.project_id || ""} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
              <option value="">— Sin proyecto —</option>
              {(state.projects || []).map((p) => <option key={p.project_id} value={p.project_id}>{p.name} · {p.code}</option>)}
            </select>
          </Field></div>
        </div>
        <div className="flex justify-end gap-2 mt-6"><BtnGhost onClick={() => setOpen(false)}>Cancelar</BtnGhost><BtnPrimary onClick={save} disabled={!form.description || !form.amount}>Guardar</BtnPrimary></div>
      </Modal>
    </div>
  );
}

/* ============================ Other income ============================ */
function OtherIncome({ state, dispatch }) {
  const [q, setQ] = useState("");
  const [catF, setCatF] = useState("all");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const income = state.otherIncome || [];
  const blank = { income_id: "", company_id: state.company.company_id, category: "Crédito", description: "", amount: 0, date: todayISO(), source: "", project_id: "", taxed: false, tax_amount: 0 };
  const [form, setForm] = useState(blank);
  const iva = form.taxed ? Math.round((Number(form.amount) || 0) * 0.19) : 0;

  const openNew = () => { setForm({ ...blank, income_id: uid("inc") }); setEdit(null); setOpen(true); };
  const openEdit = (r) => { setForm(r); setEdit(r.income_id); setOpen(true); };
  const save = () => {
    if (!form.description || !form.amount) return;
    const amount = Number(form.amount);
    const item = { ...form, amount, tax_amount: form.taxed ? Math.round(amount * 0.19) : 0, date: new Date(form.date).toISOString() };
    dispatch({ type: "UPSERT", coll: "otherIncome", item, key: "income_id" });
    dispatch({ type: "LOG", msg: `${edit ? "actualizó" : "registró"} otro ingreso: ${item.description}` });
    setOpen(false);
  };
  const remove = (r) => { dispatch({ type: "DELETE", coll: "otherIncome", id: r.income_id, key: "income_id" }); dispatch({ type: "LOG", msg: `eliminó otro ingreso: ${r.description}` }); };

  const projName = (pid) => (state.projects || []).find((p) => p.project_id === pid)?.name;
  const list = income
    .filter((r) => catF === "all" || r.category === catF)
    .filter((r) => [r.description, r.source, r.category].join(" ").toLowerCase().includes(q.toLowerCase()));
  const total = list.reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <Toolbar query={q} setQuery={setQ} placeholder="Buscar por descripción, fuente o tipo…" onAdd={openNew} addLabel="Nuevo ingreso"
        onExport={() => exportCSV("otros_ingresos_consa.csv", list.map((r) => ({ tipo: r.category, descripcion: r.description, fuente: r.source, proyecto: projName(r.project_id) || "", monto: r.amount, afecto_iva: r.taxed ? "Sí" : "No", iva: r.tax_amount, fecha: shortDate(r.date) })))} />
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {[["all", "Todos"], ...INCOME_CATEGORIES.map((c) => [c, c])].map(([k, label]) => (
          <button key={k} onClick={() => setCatF(k)}
            className={`px-3 h-8 rounded-lg text-xs font-semibold border transition ${catF === k ? "text-white border-transparent" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
            style={catF === k ? { background: NAVY } : {}}>{label}</button>
        ))}
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider">
            <th className="text-left font-semibold px-4 py-3">Descripción</th>
            <th className="text-left font-semibold px-4 py-3">Tipo</th>
            <th className="text-left font-semibold px-4 py-3 hidden lg:table-cell">Proyecto</th>
            <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Fecha</th>
            <th className="text-right font-semibold px-4 py-3">Monto</th>
            <th className="px-4 py-3"></th>
          </tr></thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.income_id} className="border-t border-slate-100 hover:bg-slate-50/60 transition">
                <td className="px-4 py-3"><div className="font-semibold text-slate-800">{r.description}</div>{r.source && <div className="text-xs text-slate-400">{r.source}</div>}</td>
                <td className="px-4 py-3"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${INCOME_CAT_STYLE[r.category] || INCOME_CAT_STYLE.Otros}`}>{r.category}</span></td>
                <td className="px-4 py-3 hidden lg:table-cell text-slate-500">{projName(r.project_id) || <span className="text-slate-300">—</span>}</td>
                <td className="px-4 py-3 hidden md:table-cell text-slate-500">{shortDate(r.date)}</td>
                <td className="px-4 py-3 text-right"><div className="font-semibold tabular-nums" style={{ color: NAVY }}>{clp(r.amount)}</div>{r.taxed && <div className="text-[11px] text-slate-400">IVA {clp(r.tax_amount)}</div>}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Edit3 size={15} /></button>
                  <button onClick={() => remove(r)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Sin otros ingresos en esta vista.</td></tr>}
          </tbody>
          {list.length > 0 && <tfoot><tr className="border-t-2 border-slate-200"><td colSpan={4} className="px-4 py-3 font-semibold text-slate-500">Total</td><td className="px-4 py-3 text-right font-bold tabular-nums" style={{ color: COPPER }}>{clp(total)}</td><td></td></tr></tfoot>}
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={edit ? "Editar ingreso" : "Nuevo ingreso"}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Tipo de ingreso"><select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{INCOME_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Fuente / Contraparte"><input className={inputCls} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Banco, socio, comprador…" /></Field>
          <div className="sm:col-span-2"><Field label="Descripción"><input className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} autoFocus /></Field></div>
          <Field label="Monto"><input type="number" className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          <Field label="Fecha"><input type="date" className={inputCls} value={form.date?.slice(0, 10)} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Proyecto / Mina (opcional)">
            <select className={inputCls} value={form.project_id || ""} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
              <option value="">— Sin proyecto —</option>
              {(state.projects || []).map((p) => <option key={p.project_id} value={p.project_id}>{p.name} · {p.code}</option>)}
            </select>
          </Field></div>
          <div className="sm:col-span-2 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={form.taxed} onChange={(e) => setForm({ ...form, taxed: e.target.checked })} className="w-4 h-4 accent-[#B87333]" />
              Afecto a IVA (19%)
            </label>
            {form.taxed && <span className="text-sm text-slate-500">IVA débito: <span className="font-semibold" style={{ color: NAVY }}>{clp(iva)}</span></span>}
          </div>
        </div>
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-slate-500">Total {form.taxed ? "(con IVA)" : ""}: <span className="font-bold text-base" style={{ color: NAVY }}>{clp((Number(form.amount) || 0) + iva)}</span></div>
          <div className="flex gap-2"><BtnGhost onClick={() => setOpen(false)}>Cancelar</BtnGhost><BtnPrimary onClick={save} disabled={!form.description || !form.amount}>Guardar</BtnPrimary></div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================ Projects ============================ */
function projectRollup(state, pid) {
  const inv = state.invoices.filter((i) => i.project_id === pid);
  const pur = state.purchases.filter((p) => p.project_id === pid);
  const exp = state.expenses.filter((e) => e.project_id === pid);
  const pos = (state.purchaseOrders || []).filter((o) => o.project_id === pid);
  const oth = (state.otherIncome || []).filter((o) => o.project_id === pid);
  const facturado = inv.reduce((s, i) => s + i.total, 0);
  const cobrado = inv.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const otros = oth.reduce((s, o) => s + o.amount, 0);
  const gastado = pur.reduce((s, p) => s + p.total, 0) + exp.reduce((s, e) => s + e.amount, 0);
  return { inv, pur, exp, pos, oth, facturado, cobrado, otros, ingresos: facturado + otros, gastado, margen: facturado + otros - gastado };
}

function ProjectDetail({ state, project, onBack }) {
  const r = projectRollup(state, project.project_id);
  const client = state.clients.find((c) => c.client_id === project.client_id);
  const budgetUse = project.budget ? Math.min(100, Math.round((r.gastado / project.budget) * 100)) : 0;
  const Metric = ({ label, value, tone }) => (
    <Card className="p-5"><div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="mt-1.5 text-2xl font-bold tabular-nums" style={{ color: tone || NAVY }}>{value}</div></Card>
  );
  const DocList = ({ title, rows, cols }) => (
    <Card className="p-5">
      <h3 className="font-bold mb-3" style={{ color: NAVY }}>{title}</h3>
      {rows.length ? (
        <table className="w-full text-sm">
          <tbody>{rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0">
              {cols(row).map((c, j) => <td key={j} className={`py-2 ${j === 0 ? "font-medium text-slate-700" : "text-right tabular-nums text-slate-600"}`}>{c}</td>)}
            </tr>
          ))}</tbody>
        </table>
      ) : <div className="text-sm text-slate-400 py-4 text-center">Sin registros asociados.</div>}
    </Card>
  );
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm font-semibold inline-flex items-center gap-1.5" style={{ color: COPPER }}>← Volver a proyectos</button>
      <Card className="p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-40 opacity-[0.05]" style={{ background: `linear-gradient(135deg, ${COPPER}, ${NAVY})` }} />
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${COPPER}, ${COPPER_DK})` }}><Mountain size={22} className="text-white" /></div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold" style={{ color: NAVY }}>{project.name}</h2>
                <Badge map={PROJECT_STATUS} value={project.status} />
              </div>
              <div className="text-sm text-slate-500 mt-0.5">{project.code}{client ? ` · ${client.name}` : ""}</div>
              {project.location && <div className="text-xs text-slate-400 mt-1 flex items-center gap-1"><MapPin size={12} /> {project.location}</div>}
              {project.description && <p className="text-sm text-slate-600 mt-2 max-w-xl">{project.description}</p>}
            </div>
          </div>
          <div className="text-sm text-slate-500 sm:text-right">Inicio: <span className="font-medium text-slate-700">{shortDate(project.start_date)}</span></div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="Facturado" value={clp(r.facturado)} tone={COPPER} />
        <Metric label="Otros ingresos" value={clp(r.otros)} tone="#10B981" />
        <Metric label="Gastado" value={clp(r.gastado)} tone={NAVY} />
        <Metric label="Margen" value={clp(r.margen)} tone={r.margen >= 0 ? "#047857" : "#b91c1c"} />
      </div>

      {project.budget > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold" style={{ color: NAVY }}>Uso del presupuesto</h3>
            <span className="text-sm text-slate-500">{clp(r.gastado)} de {clp(project.budget)}</span>
          </div>
          <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${budgetUse}%`, background: budgetUse > 90 ? "#EF4444" : budgetUse > 70 ? ACCENT : COPPER }} />
          </div>
          <div className="text-xs text-slate-400 mt-1.5">{budgetUse}% consumido · {clp(Math.max(0, project.budget - r.gastado))} disponible</div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DocList title="Facturas" rows={r.inv} cols={(i) => [i.invoice_number + " · " + i.client_name, clp(i.total)]} />
        <DocList title="Órdenes de compra" rows={r.pos} cols={(o) => [o.po_number + " · " + o.supplier_name, clp(o.total)]} />
        <DocList title="Compras" rows={r.pur} cols={(p) => [p.supplier_name, clp(p.total)]} />
        <DocList title="Gastos" rows={r.exp} cols={(e) => [e.description, clp(e.amount)]} />
        <DocList title="Otros ingresos" rows={r.oth} cols={(o) => [o.description + " · " + o.category, clp(o.amount)]} />
      </div>
    </div>
  );
}

function Projects({ state, dispatch }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const projects = state.projects || [];
  const blank = { project_id: "", company_id: state.company.company_id, name: "", code: "", client_id: "", location: "", status: "active", budget: 0, start_date: todayISO(), description: "" };
  const [form, setForm] = useState(blank);

  const selected = projects.find((p) => p.project_id === sel);
  if (selected) return <ProjectDetail state={state} project={selected} onBack={() => setSel(null)} />;

  const openNew = () => { setForm({ ...blank, project_id: uid("proj") }); setEdit(null); setOpen(true); };
  const openEdit = (p) => { setForm(p); setEdit(p.project_id); setOpen(true); };
  const save = () => {
    if (!form.name) return;
    const item = { ...form, budget: Number(form.budget) || 0, start_date: new Date(form.start_date).toISOString() };
    dispatch({ type: "UPSERT", coll: "projects", item, key: "project_id" });
    dispatch({ type: "LOG", msg: `${edit ? "actualizó" : "creó"} el proyecto ${item.name}` });
    setOpen(false);
  };
  const remove = (p) => { dispatch({ type: "DELETE", coll: "projects", id: p.project_id, key: "project_id" }); dispatch({ type: "LOG", msg: `eliminó el proyecto ${p.name}` }); };

  const list = projects.filter((p) => [p.name, p.code, p.location].join(" ").toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <Toolbar query={q} setQuery={setQ} placeholder="Buscar proyecto o mina…" onAdd={openNew} addLabel="Nuevo proyecto"
        onExport={() => exportCSV("proyectos_consa.csv", list.map((p) => { const r = projectRollup(state, p.project_id); return { proyecto: p.name, codigo: p.code, ubicacion: p.location, estado: PROJECT_STATUS[p.status].label, presupuesto: p.budget, facturado: r.facturado, gastado: r.gastado, margen: r.margen }; }))} />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {list.map((p) => {
          const r = projectRollup(state, p.project_id);
          const client = state.clients.find((c) => c.client_id === p.client_id);
          const budgetUse = p.budget ? Math.min(100, Math.round((r.gastado / p.budget) * 100)) : 0;
          return (
            <Card key={p.project_id} className="p-5 hover:shadow-md transition group cursor-pointer" >
              <div onClick={() => setSel(p.project_id)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${COPPER}, ${COPPER_DK})` }}><Mountain size={18} className="text-white" /></div>
                    <div>
                      <div className="font-bold leading-tight" style={{ color: NAVY }}>{p.name}</div>
                      <div className="text-xs text-slate-400">{p.code}</div>
                    </div>
                  </div>
                  <Badge map={PROJECT_STATUS} value={p.status} />
                </div>
                {p.location && <div className="text-xs text-slate-400 mt-3 flex items-center gap-1"><MapPin size={12} /> {p.location}</div>}
                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div><div className="text-[10px] uppercase tracking-wide text-slate-400">Facturado</div><div className="text-sm font-bold tabular-nums" style={{ color: COPPER }}>{clp(r.facturado)}</div></div>
                  <div><div className="text-[10px] uppercase tracking-wide text-slate-400">Gastado</div><div className="text-sm font-bold tabular-nums" style={{ color: NAVY }}>{clp(r.gastado)}</div></div>
                  <div><div className="text-[10px] uppercase tracking-wide text-slate-400">Margen</div><div className="text-sm font-bold tabular-nums" style={{ color: r.margen >= 0 ? "#047857" : "#b91c1c" }}>{clp(r.margen)}</div></div>
                </div>
                {p.budget > 0 && (
                  <div className="mt-4">
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${budgetUse}%`, background: budgetUse > 90 ? "#EF4444" : budgetUse > 70 ? ACCENT : COPPER }} />
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">{budgetUse}% del presupuesto ({clp(p.budget)})</div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-1 mt-3 pt-3 border-t border-slate-100">
                <button onClick={() => setSel(p.project_id)} className="text-xs font-semibold px-2 py-1 rounded-lg hover:bg-slate-50" style={{ color: COPPER }}>Ver detalle →</button>
                <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Edit3 size={14} /></button>
                <button onClick={() => remove(p)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={14} /></button>
              </div>
            </Card>
          );
        })}
        {!list.length && <Card className="p-10 text-center text-slate-400 md:col-span-2 xl:col-span-3">Sin proyectos. Crea el primero para empezar a asociar documentos.</Card>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={edit ? "Editar proyecto" : "Nuevo proyecto"}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Field label="Nombre del proyecto / mina"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus placeholder="Ej: Mina El Peñón" /></Field></div>
          <Field label="Código"><input className={inputCls} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="MEP-24" /></Field>
          <Field label="Estado"><select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
          <Field label="Cliente (mandante)"><select className={inputCls} value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}><option value="">— Ninguno —</option>{state.clients.map((c) => <option key={c.client_id} value={c.client_id}>{c.name}</option>)}</select></Field>
          <Field label="Fecha de inicio"><input type="date" className={inputCls} value={form.start_date?.slice(0, 10)} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Ubicación"><input className={inputCls} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Comuna, Región" /></Field></div>
          <div className="sm:col-span-2"><Field label="Presupuesto (CLP)"><input type="number" className={inputCls} value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></Field></div>
          <div className="sm:col-span-2"><Field label="Descripción"><textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#B87333] min-h-[70px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
        </div>
        <div className="flex justify-end gap-2 mt-6"><BtnGhost onClick={() => setOpen(false)}>Cancelar</BtnGhost><BtnPrimary onClick={save} disabled={!form.name}>Guardar proyecto</BtnPrimary></div>
      </Modal>
    </div>
  );
}

/* ============================ Carry-over debt (liabilities) ============================ */
function CarryDebt({ state, dispatch }) {
  const [q, setQ] = useState("");
  const [yearF, setYearF] = useState("all");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const debts = state.carryDebt || [];
  const curYear = new Date().getFullYear();
  const blank = { debt_id: "", company_id: state.company.company_id, year: curYear, description: "", creditor: "", amount: 0, date: todayISO(), status: "pending", notes: "" };
  const [form, setForm] = useState(blank);

  const years = [...new Set(debts.map((d) => d.year))].sort((a, b) => b - a);
  const openNew = () => { setForm({ ...blank, debt_id: uid("debt") }); setEdit(null); setOpen(true); };
  const openEdit = (d) => { setForm(d); setEdit(d.debt_id); setOpen(true); };
  const save = () => {
    if (!form.description || !form.amount) return;
    const item = { ...form, year: Number(form.year), amount: Number(form.amount), date: form.date ? new Date(form.date).toISOString() : null };
    dispatch({ type: "UPSERT", coll: "carryDebt", item, key: "debt_id" });
    dispatch({ type: "LOG", msg: `${edit ? "actualizó" : "registró"} deuda de arrastre: ${item.description}` });
    setOpen(false);
  };
  const remove = (d) => { dispatch({ type: "DELETE", coll: "carryDebt", id: d.debt_id, key: "debt_id" }); dispatch({ type: "LOG", msg: `eliminó deuda de arrastre: ${d.description}` }); };

  const list = debts
    .filter((d) => yearF === "all" || d.year === Number(yearF))
    .filter((d) => [d.description, d.creditor, String(d.year)].join(" ").toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.year - a.year);
  const total = list.reduce((s, d) => s + d.amount, 0);
  const pendiente = list.filter((d) => d.status === "pending").reduce((s, d) => s + d.amount, 0);

  return (
    <div>
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 mb-5">
        <Scale size={18} className="text-slate-500 mt-0.5 shrink-0" />
        <p className="text-sm text-slate-600">Pasivo de consolidación <span className="font-semibold">anual</span>. No afecta la rentabilidad mensual; su efecto se refleja en el resultado del año. En Informes puedes activar <span className="font-medium">"Incluir deuda de arrastre"</span> para verlo en el consolidado.</p>
      </div>
      <Toolbar query={q} setQuery={setQ} placeholder="Buscar por descripción, acreedor o año…" onAdd={openNew} addLabel="Nueva deuda"
        onExport={() => exportCSV("deuda_arrastre_consa.csv", list.map((d) => ({ anio: d.year, descripcion: d.description, acreedor: d.creditor, monto: d.amount, estado: CARRY_STATUS[d.status].label, fecha: d.date ? shortDate(d.date) : "" })))} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <Card className="p-4"><div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total registrado</div><div className="mt-1 text-xl font-bold tabular-nums" style={{ color: NAVY }}>{clp(total)}</div></Card>
        <Card className="p-4"><div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pendiente de pago</div><div className="mt-1 text-xl font-bold tabular-nums" style={{ color: "#b45309" }}>{clp(pendiente)}</div></Card>
        <Card className="p-4"><div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Años con deuda</div><div className="mt-1 text-xl font-bold" style={{ color: NAVY }}>{years.length}</div></Card>
      </div>

      <div className="flex gap-1.5 mb-4 flex-wrap">
        {[["all", "Todos los años"], ...years.map((y) => [String(y), String(y)])].map(([k, label]) => (
          <button key={k} onClick={() => setYearF(k)}
            className={`px-3 h-8 rounded-lg text-xs font-semibold border transition ${yearF === k ? "text-white border-transparent" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
            style={yearF === k ? { background: NAVY } : {}}>{label}</button>
        ))}
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider">
            <th className="text-left font-semibold px-4 py-3">Año</th>
            <th className="text-left font-semibold px-4 py-3">Descripción</th>
            <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Acreedor</th>
            <th className="text-left font-semibold px-4 py-3">Estado</th>
            <th className="text-right font-semibold px-4 py-3">Monto</th>
            <th className="px-4 py-3"></th>
          </tr></thead>
          <tbody>
            {list.map((d) => (
              <tr key={d.debt_id} className="border-t border-slate-100 hover:bg-slate-50/60 transition">
                <td className="px-4 py-3 font-bold" style={{ color: COPPER }}>{d.year}</td>
                <td className="px-4 py-3"><div className="font-semibold text-slate-800">{d.description}</div>{d.notes && <div className="text-xs text-slate-400">{d.notes}</div>}</td>
                <td className="px-4 py-3 hidden md:table-cell text-slate-600">{d.creditor}</td>
                <td className="px-4 py-3"><Badge map={CARRY_STATUS} value={d.status} /></td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums" style={{ color: NAVY }}>{clp(d.amount)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Edit3 size={15} /></button>
                  <button onClick={() => remove(d)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Sin deuda de arrastre registrada.</td></tr>}
          </tbody>
          {list.length > 0 && <tfoot><tr className="border-t-2 border-slate-200"><td colSpan={4} className="px-4 py-3 font-semibold text-slate-500">Total {yearF !== "all" ? yearF : ""}</td><td className="px-4 py-3 text-right font-bold tabular-nums" style={{ color: NAVY }}>{clp(total)}</td><td></td></tr></tfoot>}
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={edit ? "Editar deuda de arrastre" : "Nueva deuda de arrastre"}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Año de consolidación"><input type="number" className={inputCls} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder={String(curYear)} /></Field>
          <Field label="Estado"><select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{Object.entries(CARRY_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
          <div className="sm:col-span-2"><Field label="Descripción"><input className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} autoFocus /></Field></div>
          <Field label="Acreedor"><input className={inputCls} value={form.creditor} onChange={(e) => setForm({ ...form, creditor: e.target.value })} placeholder="Banco, proveedor, socio…" /></Field>
          <Field label="Monto"><input type="number" className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          <Field label="Fecha origen (opcional)"><input type="date" className={inputCls} value={form.date?.slice(0, 10) || ""} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Notas"><textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#B87333] min-h-[64px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field></div>
        </div>
        <div className="flex justify-end gap-2 mt-6"><BtnGhost onClick={() => setOpen(false)}>Cancelar</BtnGhost><BtnPrimary onClick={save} disabled={!form.description || !form.amount}>Guardar</BtnPrimary></div>
      </Modal>
    </div>
  );
}

/* ============================ Loans & investments (annual) ============================ */
function LoansInvestments({ state, dispatch }) {
  const [q, setQ] = useState("");
  const [yearF, setYearF] = useState("all");
  const [typeF, setTypeF] = useState("all");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const items = state.loansInvestments || [];
  const blank = { loan_id: "", company_id: state.company.company_id, type: "Préstamo", date: todayISO(), beneficiary: "", rut: "", amount: 0, objective: "", status: "active", notes: "" };
  const [form, setForm] = useState(blank);
  const rutOk = !form.rut || validRut(form.rut);

  const years = [...new Set(items.map((d) => new Date(d.date).getFullYear()))].sort((a, b) => b - a);
  const openNew = () => { setForm({ ...blank, loan_id: uid("loan") }); setEdit(null); setOpen(true); };
  const openEdit = (d) => { setForm(d); setEdit(d.loan_id); setOpen(true); };
  const save = () => {
    if (!form.beneficiary || !form.amount || !validRut(form.rut || "0-0") && form.rut) return;
    const item = { ...form, amount: Number(form.amount), rut: form.rut ? formatRut(form.rut) : "", date: new Date(form.date).toISOString() };
    dispatch({ type: "UPSERT", coll: "loansInvestments", item, key: "loan_id" });
    dispatch({ type: "LOG", msg: `${edit ? "actualizó" : "registró"} ${item.type.toLowerCase()} a ${item.beneficiary} por ${clp(item.amount)}` });
    setOpen(false);
  };
  const remove = (d) => { dispatch({ type: "DELETE", coll: "loansInvestments", id: d.loan_id, key: "loan_id" }); dispatch({ type: "LOG", msg: `eliminó ${d.type.toLowerCase()} a ${d.beneficiary}` }); };

  const list = items
    .filter((d) => yearF === "all" || new Date(d.date).getFullYear() === Number(yearF))
    .filter((d) => typeF === "all" || d.type === typeF)
    .filter((d) => [d.beneficiary, d.rut, d.objective, d.type].join(" ").toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const total = list.reduce((s, d) => s + d.amount, 0);
  const vigente = list.filter((d) => d.status === "active").reduce((s, d) => s + d.amount, 0);

  return (
    <div>
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 mb-5">
        <Landmark size={18} className="text-slate-500 mt-0.5 shrink-0" />
        <p className="text-sm text-slate-600">Histórico de préstamos e inversiones a terceros. Consolidación <span className="font-semibold">anual</span>: no afecta la rentabilidad mensual. En Informes puedes activar <span className="font-medium">"Incluir préstamos e inversiones"</span> para reflejarlo en el resultado del año.</p>
      </div>
      <Toolbar query={q} setQuery={setQ} placeholder="Buscar por beneficiario, RUT u objetivo…" onAdd={openNew} addLabel="Nuevo registro"
        onExport={() => exportCSV("prestamos_inversiones_consa.csv", list.map((d) => ({ tipo: d.type, fecha_egreso: shortDate(d.date), beneficiario: d.beneficiary, rut: d.rut, monto: d.amount, objetivo: d.objective, estado: LOAN_STATUS[d.status].label, notas: d.notes })))} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <Card className="p-4"><div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total histórico</div><div className="mt-1 text-xl font-bold tabular-nums" style={{ color: NAVY }}>{clp(total)}</div></Card>
        <Card className="p-4"><div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Vigente</div><div className="mt-1 text-xl font-bold tabular-nums" style={{ color: "#1d4ed8" }}>{clp(vigente)}</div></Card>
        <Card className="p-4"><div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Registros</div><div className="mt-1 text-xl font-bold" style={{ color: NAVY }}>{list.length}</div></Card>
      </div>

      <div className="flex gap-1.5 mb-4 flex-wrap items-center">
        {[["all", "Todos"], ...LOAN_TYPES.map((t) => [t, t])].map(([k, label]) => (
          <button key={k} onClick={() => setTypeF(k)}
            className={`px-3 h-8 rounded-lg text-xs font-semibold border transition ${typeF === k ? "text-white border-transparent" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
            style={typeF === k ? { background: COPPER } : {}}>{label}</button>
        ))}
        <span className="w-px h-5 bg-slate-200 mx-1" />
        {[["all", "Todos los años"], ...years.map((y) => [String(y), String(y)])].map(([k, label]) => (
          <button key={k} onClick={() => setYearF(k)}
            className={`px-3 h-8 rounded-lg text-xs font-semibold border transition ${yearF === k ? "text-white border-transparent" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
            style={yearF === k ? { background: NAVY } : {}}>{label}</button>
        ))}
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider">
            <th className="text-left font-semibold px-4 py-3">Beneficiario</th>
            <th className="text-left font-semibold px-4 py-3">Tipo</th>
            <th className="text-left font-semibold px-4 py-3 hidden lg:table-cell">Objetivo</th>
            <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Egreso</th>
            <th className="text-left font-semibold px-4 py-3">Estado</th>
            <th className="text-right font-semibold px-4 py-3">Monto</th>
            <th className="px-4 py-3"></th>
          </tr></thead>
          <tbody>
            {list.map((d) => (
              <tr key={d.loan_id} className="border-t border-slate-100 hover:bg-slate-50/60 transition">
                <td className="px-4 py-3"><div className="font-semibold text-slate-800">{d.beneficiary}</div><div className="text-xs text-slate-400">{d.rut}</div></td>
                <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${d.type === "Inversión" ? "bg-violet-50 text-violet-700 border-violet-200" : "bg-[#FFF0E0] text-[#8B5422] border-[#e8c9a3]"}`}>{d.type}</span></td>
                <td className="px-4 py-3 hidden lg:table-cell text-slate-600 max-w-xs truncate">{d.objective}</td>
                <td className="px-4 py-3 hidden md:table-cell text-slate-500">{shortDate(d.date)}</td>
                <td className="px-4 py-3"><Badge map={LOAN_STATUS} value={d.status} /></td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums" style={{ color: NAVY }}>{clp(d.amount)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Edit3 size={15} /></button>
                  <button onClick={() => remove(d)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Sin préstamos ni inversiones registrados.</td></tr>}
          </tbody>
          {list.length > 0 && <tfoot><tr className="border-t-2 border-slate-200"><td colSpan={5} className="px-4 py-3 font-semibold text-slate-500">Total {yearF !== "all" ? yearF : ""}</td><td className="px-4 py-3 text-right font-bold tabular-nums" style={{ color: NAVY }}>{clp(total)}</td><td></td></tr></tfoot>}
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={edit ? "Editar registro" : "Nuevo préstamo / inversión"} wide>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Tipo"><select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{LOAN_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Fecha del egreso"><input type="date" className={inputCls} value={form.date?.slice(0, 10)} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Beneficiario (a quién)"><input className={inputCls} value={form.beneficiary} onChange={(e) => setForm({ ...form, beneficiary: e.target.value })} autoFocus placeholder="Persona o empresa" /></Field>
          <Field label="Identificación (RUT)" hint={!rutOk ? "RUT inválido" : undefined}>
            <input className={`${inputCls} ${!rutOk ? "border-red-400" : ""}`} value={form.rut} onChange={(e) => setForm({ ...form, rut: e.target.value })} onBlur={(e) => e.target.value && setForm({ ...form, rut: formatRut(e.target.value) })} placeholder="12.345.678-5" />
          </Field>
          <Field label="Monto del egreso"><input type="number" className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          <Field label="Estado"><select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{Object.entries(LOAN_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
          <div className="sm:col-span-2"><Field label="Objetivo de la inversión / egreso"><input className={inputCls} value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="Propósito del préstamo o la inversión" /></Field></div>
          <div className="sm:col-span-2"><Field label="Notas y observaciones"><textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#B87333] min-h-[80px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Condiciones, garantías, plazos, seguimiento…" /></Field></div>
        </div>
        <div className="flex justify-end gap-2 mt-6"><BtnGhost onClick={() => setOpen(false)}>Cancelar</BtnGhost><BtnPrimary onClick={save} disabled={!form.beneficiary || !form.amount || !rutOk}>Guardar</BtnPrimary></div>
      </Modal>
    </div>
  );
}

/* ============================ Reports ============================ */
function Reports({ state }) {
  const [mode, setMode] = useState("aggregate"); // "month" | "aggregate"
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [includeCarry, setIncludeCarry] = useState(false);
  const [includeLoans, setIncludeLoans] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const inPeriod = useCallback((dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (mode === "month") return d.toISOString().slice(0, 7) === month;
    if (from && d < new Date(from)) return false;
    if (to && d > new Date(new Date(to).getTime() + 864e5 - 1)) return false;
    return true;
  }, [mode, month, from, to]);

  const inv = state.invoices.filter((i) => inPeriod(i.created_at));
  const exp = state.expenses.filter((e) => inPeriod(e.date));
  const pur = state.purchases.filter((p) => inPeriod(p.date));
  const oth = (state.otherIncome || []).filter((o) => inPeriod(o.date));

  const facturado = inv.reduce((s, i) => s + i.total, 0);
  const otrosIngresos = oth.reduce((s, o) => s + o.amount, 0);
  const ingresos = facturado + otrosIngresos;
  const cobrado = inv.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const gastos = exp.reduce((s, e) => s + e.amount, 0);
  const compras = pur.reduce((s, p) => s + p.total, 0);
  const ivaDebito = inv.reduce((s, i) => s + i.tax_total, 0) + oth.reduce((s, o) => s + (o.taxed ? o.tax_amount || 0 : 0), 0);
  const ivaCredito = pur.reduce((s, p) => s + p.tax_amount, 0);
  const neto = ingresos - gastos - compras;

  // Deuda de arrastre: consolidación ANUAL. No entra al cálculo mensual; solo al resultado del/los año(s) del periodo.
  const coveredYears = useMemo(() => {
    if (mode === "month") return [Number(month.slice(0, 4))];
    const cd = state.carryDebt || [];
    if (!from && !to) return [...new Set(cd.map((d) => d.year))];
    const y1 = from ? new Date(from).getFullYear() : new Date().getFullYear();
    const y2 = to ? new Date(to).getFullYear() : new Date().getFullYear();
    const out = []; for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) out.push(y);
    return out;
  }, [mode, month, from, to, state.carryDebt]);
  const carryForPeriod = (state.carryDebt || []).filter((d) => coveredYears.includes(d.year)).reduce((s, d) => s + d.amount, 0);
  const loansForPeriod = (state.loansInvestments || []).filter((l) => coveredYears.includes(new Date(l.date).getFullYear())).reduce((s, l) => s + l.amount, 0);
  const annualDeductions = (includeCarry ? carryForPeriod : 0) + (includeLoans ? loansForPeriod : 0);
  const resultadoAnual = neto - annualDeductions;
  const showAnnual = includeCarry || includeLoans;

  // Desglose mensual para modo agregado
  const monthly = useMemo(() => {
    if (mode !== "aggregate") return [];
    const map = {};
    const bump = (dateStr, field, val) => {
      const key = new Date(dateStr).toISOString().slice(0, 7);
      map[key] = map[key] || { key, ingresos: 0, gastos: 0, compras: 0, ivaD: 0, ivaC: 0 };
      map[key][field] += val;
    };
    inv.forEach((i) => { bump(i.created_at, "ingresos", i.total); bump(i.created_at, "ivaD", i.tax_total); });
    oth.forEach((o) => { bump(o.date, "ingresos", o.amount); if (o.taxed) bump(o.date, "ivaD", o.tax_amount || 0); });
    exp.forEach((e) => bump(e.date, "gastos", e.amount));
    pur.forEach((p) => { bump(p.date, "compras", p.total); bump(p.date, "ivaC", p.tax_amount); });
    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key)).map((m) => ({
      ...m, neto: m.ingresos - m.gastos - m.compras, ivaBalance: m.ivaD - m.ivaC,
      label: new Date(m.key + "-01").toLocaleDateString("es-CL", { month: "short", year: "2-digit" }),
    }));
  }, [mode, inv, exp, pur, oth]);

  const periodLabel = mode === "month"
    ? new Date(month + "-01").toLocaleDateString("es-CL", { month: "long", year: "numeric" })
    : (from || to) ? `${from ? shortDate(from) : "inicio"} — ${to ? shortDate(to) : "hoy"}` : "Todo el histórico";

  const exportReport = () => {
    if (mode === "aggregate" && monthly.length) {
      const rows = monthly.map((m) => ({
        mes: m.label, ingresos: m.ingresos, gastos: m.gastos, compras: m.compras,
        resultado_neto: m.neto, iva_debito: m.ivaD, iva_credito: m.ivaC, balance_iva: m.ivaBalance,
      }));
      if (showAnnual) {
        if (includeCarry) rows.push({ mes: `Deuda de arrastre (${coveredYears.join("/")})`, ingresos: "", gastos: "", compras: "", resultado_neto: -carryForPeriod, iva_debito: "", iva_credito: "", balance_iva: "" });
        if (includeLoans) rows.push({ mes: `Préstamos e inversiones (${coveredYears.join("/")})`, ingresos: "", gastos: "", compras: "", resultado_neto: -loansForPeriod, iva_debito: "", iva_credito: "", balance_iva: "" });
        rows.push({ mes: "RESULTADO ANUAL", ingresos: "", gastos: "", compras: "", resultado_neto: resultadoAnual, iva_debito: "", iva_credito: "", balance_iva: "" });
      }
      exportCSV(`informe_mensual_consa.csv`, rows);
    } else {
      exportCSV(`informe_${mode === "month" ? month : "periodo"}_consa.csv`, [{
        periodo: periodLabel, facturacion: facturado, otros_ingresos: otrosIngresos, total_ingresos: ingresos, cobrado, por_cobrar: facturado - cobrado, gastos, compras,
        resultado_operacional: neto,
        ...(includeCarry ? { deuda_arrastre: carryForPeriod } : {}),
        ...(includeLoans ? { prestamos_inversiones: loansForPeriod } : {}),
        ...(showAnnual ? { resultado_anual: resultadoAnual } : {}),
        iva_debito: ivaDebito, iva_credito: ivaCredito, iva_a_pagar: Math.max(0, ivaDebito - ivaCredito),
      }]);
    }
  };

  const handlePDF = async () => {
    setPdfBusy(true);
    const data = {
      company: state.company, periodLabel, facturado, otrosIngresos, ingresos, gastos, compras, neto,
      ivaDebito, ivaCredito, includeCarry, carryForPeriod, includeLoans, loansForPeriod, showAnnual, resultadoAnual, coveredYears, monthly, mode,
      fileTag: mode === "month" ? month : (from || to ? `${from || "inicio"}_a_${to || "hoy"}` : "historico"),
    };
    try { await generateIncomeStatementPDF(data); }
    catch (e) {
      try { printIncomeStatement(data); }
      catch (_) { alert("No se pudo generar el PDF en este entorno. Puedes usar Exportar CSV, o generarlo desde la app una vez portada a tu stack."); }
    } finally { setPdfBusy(false); }
  };

  const Row = ({ label, value, tone }) => (
    <div className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
      <span className="text-slate-600">{label}</span><span className="font-bold tabular-nums" style={{ color: tone || NAVY }}>{clp(value)}</span>
    </div>
  );

  const months12 = useMemo(() => {
    const out = [];
    for (let k = 0; k < 12; k++) { const d = new Date(); d.setMonth(d.getMonth() - k); out.push(d.toISOString().slice(0, 7)); }
    return out;
  }, []);

  return (
    <div className="space-y-6">
      {/* Controles de periodo */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              {[["aggregate", "Agregado"], ["month", "Mensual"]].map(([k, label]) => (
                <button key={k} onClick={() => setMode(k)}
                  className={`px-4 h-9 rounded-md text-sm font-semibold transition ${mode === k ? "text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                  style={mode === k ? { background: COPPER } : {}}>{label}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {mode === "month" ? (
              <div className="w-48"><Field label="Mes">
                <select className={inputCls} value={month} onChange={(e) => setMonth(e.target.value)}>
                  {months12.map((m) => <option key={m} value={m}>{new Date(m + "-01").toLocaleDateString("es-CL", { month: "long", year: "numeric" })}</option>)}
                </select>
              </Field></div>
            ) : (
              <>
                <div className="w-40"><Field label="Desde"><input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} /></Field></div>
                <div className="w-40"><Field label="Hasta"><input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} /></Field></div>
                {(from || to) && <BtnGhost onClick={() => { setFrom(""); setTo(""); }} className="h-10">Limpiar</BtnGhost>}
              </>
            )}
            <BtnGhost onClick={handlePDF} disabled={pdfBusy} className="h-10"><FileText size={16} /> {pdfBusy ? "Generando…" : "Estado de resultado (PDF)"}</BtnGhost>
            <BtnPrimary onClick={exportReport} className="h-10"><Download size={16} /> Exportar</BtnPrimary>
          </div>
        </div>
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-sm text-slate-400">Periodo: <span className="font-semibold text-slate-600 capitalize">{periodLabel}</span></div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={includeCarry} onChange={(e) => setIncludeCarry(e.target.checked)} className="w-4 h-4 accent-[#B87333]" />
              Incluir deuda de arrastre
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={includeLoans} onChange={(e) => setIncludeLoans(e.target.checked)} className="w-4 h-4 accent-[#B87333]" />
              Incluir préstamos e inversiones
            </label>
            <span className="text-xs text-slate-400">(efecto anual)</span>
          </div>
        </div>
      </Card>

      {/* Resúmenes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-bold mb-3" style={{ color: NAVY }}>Resumen de ingresos</h3>
          <Row label="Facturación" value={facturado} tone={COPPER} />
          <Row label="Otros ingresos" value={otrosIngresos} tone="#10B981" />
          <Row label="Total ingresos" value={ingresos} tone={NAVY} />
          <Row label="Cobrado (facturas)" value={cobrado} tone="#10B981" />
          <Row label="Por cobrar" value={facturado - cobrado} tone={ACCENT} />
        </Card>
        <Card className="p-6">
          <h3 className="font-bold mb-3" style={{ color: NAVY }}>Resumen de egresos</h3>
          <Row label="Gastos operacionales" value={gastos} />
          <Row label="Compras" value={compras} />
          <Row label="Total egresos" value={gastos + compras} tone="#EF4444" />
        </Card>
      </div>

      {/* IVA + resultado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="font-bold mb-3" style={{ color: NAVY }}>Balance de IVA</h3>
          <Row label="IVA débito (ventas)" value={ivaDebito} tone={COPPER} />
          <Row label="IVA crédito (compras)" value={ivaCredito} tone={NAVY} />
          <div className="mt-3 rounded-xl px-4 py-3" style={{ background: ivaDebito - ivaCredito >= 0 ? "#FFF0E0" : "#ecfdf5" }}>
            <div className="text-xs text-slate-500">A pagar al SII</div>
            <div className="text-xl font-bold" style={{ color: ivaDebito - ivaCredito >= 0 ? COPPER_DK : "#047857" }}>{clp(Math.max(0, ivaDebito - ivaCredito))}</div>
          </div>
        </Card>
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-bold mb-3" style={{ color: NAVY }}>Resultado neto</h3>
          <div className="rounded-xl p-6 flex items-center justify-between h-[calc(100%-2.5rem)]" style={{ background: neto >= 0 ? "#ecfdf5" : "#fef2f2" }}>
            <div><div className="text-sm text-slate-500">Ingresos (fact. + otros) − Gastos − Compras</div>
              <div className="text-3xl font-bold mt-1" style={{ color: neto >= 0 ? "#047857" : "#b91c1c" }}>{clp(neto)}</div>
              <div className="text-xs text-slate-400 mt-1">{inv.length} facturas · {oth.length} otros ingresos · {pur.length} compras · {exp.length} gastos</div></div>
            <TrendingUp size={44} style={{ color: neto >= 0 ? "#10B981" : "#EF4444", opacity: 0.5 }} />
          </div>
        </Card>
      </div>

      {/* Rentabilidad anual con ajustes de consolidación */}
      {showAnnual && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <Scale size={18} style={{ color: COPPER }} />
            <h3 className="font-bold" style={{ color: NAVY }}>Rentabilidad anual (ajustes de consolidación)</h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">Consolidación anual · años considerados: <span className="font-semibold text-slate-600">{coveredYears.join(", ") || "—"}</span>. Estos ítems no se prorratean por mes; se aplican al resultado del año.</p>
          <div className="max-w-md space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Resultado operacional</span>
              <span className="font-bold tabular-nums" style={{ color: neto >= 0 ? "#047857" : "#b91c1c" }}>{clp(neto)}</span>
            </div>
            {includeCarry && (
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-600">(−) Deuda de arrastre</span>
                <span className="font-semibold tabular-nums" style={{ color: "#b45309" }}>{clp(carryForPeriod)}</span>
              </div>
            )}
            {includeLoans && (
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-600">(−) Préstamos e inversiones</span>
                <span className="font-semibold tabular-nums" style={{ color: "#b45309" }}>{clp(loansForPeriod)}</span>
              </div>
            )}
            <div className="flex justify-between items-center rounded-xl px-4 py-3 mt-1" style={{ background: resultadoAnual >= 0 ? "#ecfdf5" : "#fef2f2" }}>
              <span className="font-semibold" style={{ color: NAVY }}>Resultado anual</span>
              <span className="text-lg font-bold tabular-nums" style={{ color: resultadoAnual >= 0 ? "#047857" : "#b91c1c" }}>{clp(resultadoAnual)}</span>
            </div>
          </div>
        </Card>
      )}
      {mode === "aggregate" && monthly.length > 0 && (
        <Card className="p-6">
          <h3 className="font-bold mb-4" style={{ color: NAVY }}>Evolución mensual</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => clp(v)} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="ingresos" name="Ingresos" fill={COPPER} radius={[4, 4, 0, 0]} />
              <Bar dataKey="gastos" name="Gastos" fill={ACCENT} radius={[4, 4, 0, 0]} />
              <Bar dataKey="compras" name="Compras" fill={NAVY} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider">
                <th className="text-left font-semibold px-3 py-2">Mes</th>
                <th className="text-right font-semibold px-3 py-2">Ingresos</th>
                <th className="text-right font-semibold px-3 py-2">Egresos</th>
                <th className="text-right font-semibold px-3 py-2">Neto</th>
                <th className="text-right font-semibold px-3 py-2">Balance IVA</th>
              </tr></thead>
              <tbody>
                {monthly.map((m) => (
                  <tr key={m.key} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-700 capitalize">{m.label}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">{clp(m.ingresos)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">{clp(m.gastos + m.compras)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold" style={{ color: m.neto >= 0 ? "#047857" : "#b91c1c" }}>{clp(m.neto)}</td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: NAVY }}>{clp(m.ivaBalance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="border-t-2 border-slate-200 font-bold" style={{ color: NAVY }}>
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2 text-right tabular-nums">{clp(ingresos)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{clp(gastos + compras)}</td>
                <td className="px-3 py-2 text-right tabular-nums" style={{ color: neto >= 0 ? "#047857" : "#b91c1c" }}>{clp(neto)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{clp(ivaDebito - ivaCredito)}</td>
              </tr></tfoot>
            </table>
          </div>
        </Card>
      )}

      {(mode === "month" ? (inv.length + exp.length + pur.length + oth.length === 0) : false) && (
        <Card className="p-10 text-center text-slate-400">Sin movimientos registrados en {periodLabel}.</Card>
      )}
    </div>
  );
}

/* ============================ Settings ============================ */
function SettingsPage({ state, dispatch }) {
  const c = state.company;
  const set = (patch) => dispatch({ type: "COMPANY", patch });
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h3 className="font-bold mb-4" style={{ color: NAVY }}>Datos de la empresa</h3>
        <div className="space-y-4">
          <Field label="Razón social"><input className={inputCls} value={c.name} onChange={(e) => set({ name: e.target.value })} /></Field>
          <Field label="RUT"><input className={inputCls} value={c.rut} onChange={(e) => set({ rut: e.target.value })} onBlur={(e) => e.target.value && set({ rut: formatRut(e.target.value) })} /></Field>
          <Field label="Dirección"><input className={inputCls} value={c.address} onChange={(e) => set({ address: e.target.value })} /></Field>
          <Field label="Email de notificaciones"><input className={inputCls} value={c.notification_email} onChange={(e) => set({ notification_email: e.target.value })} /></Field>
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="font-bold mb-1" style={{ color: NAVY }}>Branding de documentos</h3>
        <p className="text-xs text-slate-400 mb-4">Los colores se aplican a la vista previa de facturas y PDFs.</p>
        <div className="space-y-4">
          {[["primary_color", "Color principal"], ["secondary_color", "Color secundario"], ["accent_color", "Color de acento"]].map(([k, label]) => (
            <div key={k} className="flex items-center justify-between">
              <span className="text-sm text-slate-600">{label}</span>
              <div className="flex items-center gap-2">
                <input type="color" value={c[k]} onChange={(e) => set({ [k]: e.target.value })} className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer" />
                <span className="text-xs font-mono text-slate-500 w-16">{c[k]}</span>
              </div>
            </div>
          ))}
          <div className="rounded-xl p-4 mt-2" style={{ background: c.secondary_color }}>
            <div className="text-white font-bold">{c.name}</div>
            <div className="text-xs" style={{ color: c.accent_color }}>Vista previa de encabezado</div>
            <div className="mt-2 inline-block px-3 py-1 rounded-lg text-white text-xs font-semibold" style={{ background: c.primary_color }}>Botón primario</div>
          </div>
        </div>
      </Card>
      <Card className="p-6 lg:col-span-2">
        <h3 className="font-bold mb-3" style={{ color: NAVY }}>Actividad reciente</h3>
        <div className="space-y-2">
          {state.activity.map((a) => (
            <div key={a.id} className="flex items-start gap-3 text-sm py-1.5">
              <div className="w-1.5 h-1.5 rounded-full mt-2" style={{ background: COPPER }} />
              <div><span className="font-medium text-slate-700">{a.who}</span> <span className="text-slate-500">{a.action}</span>
                <div className="text-xs text-slate-400">{new Date(a.when).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ============================ Command palette ============================ */
function CommandPalette({ open, onClose, go, state, canSee = () => true }) {
  const [q, setQ] = useState("");
  useEffect(() => { if (open) setQ(""); }, [open]);
  const nav = NAV.filter(canSee);
  const results = [
    ...nav.filter((n) => n.label.toLowerCase().includes(q.toLowerCase())).map((n) => ({ ...n, kind: "Ir a" })),
    ...(canSee({ to: "clients" }) ? state.clients.filter((c) => q && c.name.toLowerCase().includes(q.toLowerCase())).map((c) => ({ label: c.name, to: "clients", icon: Users, kind: "Cliente" })) : []),
    ...(canSee({ to: "projects" }) ? (state.projects || []).filter((p) => q && [p.name, p.code].join(" ").toLowerCase().includes(q.toLowerCase())).map((p) => ({ label: `${p.name} · ${p.code}`, to: "projects", icon: FolderKanban, kind: "Proyecto" })) : []),
    ...(canSee({ to: "invoices" }) ? state.invoices.filter((i) => q && [i.invoice_number, i.client_name].join(" ").toLowerCase().includes(q.toLowerCase())).map((i) => ({ label: `${i.invoice_number} · ${i.client_name}`, to: "invoices", icon: FileText, kind: "Factura" })) : []),
  ].slice(0, 8);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-24 px-4" style={{ background: "rgba(15,26,36,0.5)", backdropFilter: "blur(4px)" }} onMouseDown={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 border-b border-slate-100">
          <Search size={18} className="text-slate-400" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar o navegar…" className="flex-1 h-14 outline-none text-sm" />
          <kbd className="text-[10px] text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-2">
          {results.map((r, i) => (
            <button key={i} onClick={() => { go(r.to); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left transition">
              <r.icon size={16} className="text-slate-400" />
              <span className="flex-1 text-sm text-slate-700">{r.label}</span>
              <span className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{r.kind}</span>
            </button>
          ))}
          {!results.length && <div className="px-4 py-8 text-center text-sm text-slate-400">Sin resultados</div>}
        </div>
      </div>
    </div>
  );
}

/* ============================ Auth: Login ============================ */
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = () => { if (!onLogin(email.trim(), password)) setError("Credenciales incorrectas o usuario inactivo."); };
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_DK})`, fontFamily: "Inter, ui-sans-serif, system-ui" }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white text-lg" style={{ background: `linear-gradient(135deg, ${COPPER}, ${COPPER_DK})` }}>C</div>
          <div><div className="text-white font-bold text-lg leading-tight">CONSA</div><div className="text-[10px] uppercase tracking-widest" style={{ color: ACCENT }}>Administración</div></div>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h1 className="text-lg font-bold" style={{ color: NAVY }}>Iniciar sesión</h1>
          <p className="text-sm text-slate-400 mb-4">Acceso al sistema de administración</p>
          <div className="space-y-3">
            <Field label="Email"><input className={inputCls} value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="tu@consa.cl" autoFocus /></Field>
            <Field label="Contraseña"><input type="password" className={inputCls} value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="••••••••" /></Field>
            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
            <BtnPrimary onClick={submit} className="w-full justify-center"><Lock size={16} /> Entrar</BtnPrimary>
          </div>
          <div className="mt-4 text-xs text-slate-400 border-t border-slate-100 pt-3 leading-relaxed">
            Demo · Master: <span className="font-mono text-slate-600">master@consa.cl</span> / <span className="font-mono text-slate-600">consa2026</span>
          </div>
        </div>
        <p className="text-center text-[11px] text-slate-400 mt-4">Prototipo · autenticación de demostración (no usar claves reales)</p>
      </div>
    </div>
  );
}

/* ============================ Master: Usuarios ============================ */
function AppUsers({ state, dispatch, me }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const users = state.appUsers || [];
  const blank = { user_id: "", name: "", email: "", password: "", role: "user", modules: ["dashboard"], active: true };
  const [form, setForm] = useState(blank);

  const openNew = () => { setForm({ ...blank, user_id: uid("user") }); setEdit(null); setOpen(true); };
  const openEdit = (u) => { setForm({ ...u, password: "" }); setEdit(u.user_id); setOpen(true); };
  const toggleMod = (k) => setForm((f) => ({ ...f, modules: f.modules.includes(k) ? f.modules.filter((x) => x !== k) : [...f.modules, k] }));
  const emailTaken = users.some((u) => u.email.toLowerCase() === form.email.trim().toLowerCase() && u.user_id !== form.user_id);
  const save = () => {
    if (!form.name || !form.email || emailTaken) return;
    if (!edit && !form.password) return;
    const existing = users.find((u) => u.user_id === form.user_id);
    const item = { ...form, email: form.email.trim().toLowerCase(), password: form.password || existing?.password || "", modules: form.role === "master" ? [] : form.modules, created_at: existing?.created_at || new Date().toISOString() };
    dispatch({ type: "UPSERT", coll: "appUsers", item, key: "user_id" });
    dispatch({ type: "LOG", msg: `${edit ? "actualizó" : "creó"} al usuario ${item.name} · ${item.role === "master" ? "Master (acceso total)" : "módulos: " + (item.modules.map((m) => (MODULE_CATALOG.find((c) => c[0] === m) || [m, m])[1]).join(", ") || "ninguno")}` });
    setOpen(false);
  };
  const remove = (u) => { if (u.user_id === me.user_id) return; dispatch({ type: "DELETE", coll: "appUsers", id: u.user_id, key: "user_id" }); dispatch({ type: "LOG", msg: `eliminó al usuario ${u.name}` }); };
  const toggleActive = (u) => { if (u.user_id === me.user_id) return; dispatch({ type: "UPSERT", coll: "appUsers", item: { ...u, active: !u.active }, key: "user_id" }); dispatch({ type: "LOG", msg: `${u.active ? "desactivó" : "activó"} al usuario ${u.name}` }); };

  const list = users.filter((u) => [u.name, u.email].join(" ").toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <Toolbar query={q} setQuery={setQ} placeholder="Buscar usuario…" onAdd={openNew} addLabel="Nuevo usuario" />
      <Card>
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider">
            <th className="text-left font-semibold px-4 py-3">Usuario</th>
            <th className="text-left font-semibold px-4 py-3">Rol</th>
            <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Acceso</th>
            <th className="text-left font-semibold px-4 py-3">Estado</th>
            <th className="px-4 py-3"></th>
          </tr></thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.user_id} className="border-t border-slate-100 hover:bg-slate-50/60 transition">
                <td className="px-4 py-3"><div className="font-semibold text-slate-800">{u.name}{u.user_id === me.user_id && <span className="ml-2 text-[10px] text-slate-400">(tú)</span>}</div><div className="text-xs text-slate-400">{u.email}</div></td>
                <td className="px-4 py-3">{u.role === "master"
                  ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-[#e8c9a3] bg-[#FFF0E0] text-[#8B5422]"><ShieldCheck size={12} /> Master</span>
                  : <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Usuario</span>}</td>
                <td className="px-4 py-3 hidden md:table-cell text-slate-500 text-xs">{u.role === "master" ? "Todos los módulos" : `${u.modules.length} módulo${u.modules.length !== 1 ? "s" : ""}`}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(u)} disabled={u.user_id === me.user_id}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${u.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"} disabled:opacity-60`}>
                    {u.active ? "Activo" : "Inactivo"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Edit3 size={15} /></button>
                  <button onClick={() => remove(u)} disabled={u.user_id === me.user_id} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 disabled:opacity-30"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={edit ? "Editar usuario" : "Nuevo usuario"} wide>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
          <Field label="Email" hint={emailTaken ? "Ese email ya está en uso" : undefined}><input className={`${inputCls} ${emailTaken ? "border-red-400" : ""}`} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="usuario@consa.cl" /></Field>
          <Field label={edit ? "Nueva contraseña (opcional)" : "Contraseña"}><input type="password" className={inputCls} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={edit ? "Dejar en blanco para mantener" : "••••••••"} /></Field>
          <Field label="Rol"><select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="user">Usuario (acceso por módulos)</option>
            <option value="master">Master (acceso total)</option>
          </select></Field>
        </div>
        {form.role === "user" && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Módulos con acceso</span>
              <div className="flex gap-2 text-xs">
                <button onClick={() => setForm((f) => ({ ...f, modules: MODULE_CATALOG.map((c) => c[0]) }))} className="font-semibold" style={{ color: COPPER }}>Todos</button>
                <span className="text-slate-300">·</span>
                <button onClick={() => setForm((f) => ({ ...f, modules: [] }))} className="font-semibold text-slate-500">Ninguno</button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MODULE_CATALOG.map(([k, label]) => (
                <label key={k} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition ${form.modules.includes(k) ? "border-[#B87333] bg-[#FFF0E0]/40 text-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                  <input type="checkbox" checked={form.modules.includes(k)} onChange={() => toggleMod(k)} className="w-4 h-4 accent-[#B87333]" />{label}
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 mt-6"><BtnGhost onClick={() => setOpen(false)}>Cancelar</BtnGhost><BtnPrimary onClick={save} disabled={!form.name || !form.email || emailTaken || (!edit && !form.password)}>Guardar usuario</BtnPrimary></div>
      </Modal>
    </div>
  );
}

/* ============================ Master: Registro (bitácora) ============================ */
function LogView({ state }) {
  const [q, setQ] = useState("");
  const list = state.activity.filter((a) => [a.who, a.action].join(" ").toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <Toolbar query={q} setQuery={setQ} placeholder="Buscar en la bitácora…"
        onExport={() => exportCSV("bitacora_consa.csv", list.map((a) => ({ fecha: new Date(a.when).toLocaleString("es-CL"), usuario: a.who, gestion: a.action })))} />
      <Card>
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider">
            <th className="text-left font-semibold px-4 py-3">Fecha y hora</th>
            <th className="text-left font-semibold px-4 py-3">Usuario</th>
            <th className="text-left font-semibold px-4 py-3">Gestión</th>
          </tr></thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition">
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(a.when).toLocaleString("es-CL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">{a.who}</td>
                <td className="px-4 py-3 text-slate-600">{a.action}</td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={3} className="px-4 py-10 text-center text-slate-400">Sin gestiones registradas.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ============================ Shell ============================ */
const NAV = [
  { label: "Dashboard", to: "dashboard", icon: LayoutDashboard },
  { label: "Proyectos", to: "projects", icon: FolderKanban },
  { label: "Clientes", to: "clients", icon: Users },
  { label: "Facturas", to: "invoices", icon: FileText },
  { label: "Presupuestos", to: "quotes", icon: FileClock },
  { label: "Órdenes de compra", to: "purchase-orders", icon: ClipboardList },
  { label: "Compras", to: "purchases", icon: ShoppingCart },
  { label: "Gastos", to: "expenses", icon: Receipt },
  { label: "Otros ingresos", to: "other-income", icon: Coins },
  { label: "Deuda de arrastre", to: "carry-debt", icon: Scale },
  { label: "Préstamos e inversiones", to: "loans", icon: Landmark },
  { label: "Informes", to: "reports", icon: TrendingUp },
  { label: "Configuración", to: "settings", icon: SettingsIcon },
  { label: "Usuarios", to: "users", icon: ShieldCheck, master: true },
  { label: "Registro", to: "log", icon: History, master: true },
];

export default function App() {
  const [state, dispatch] = useReducer(reducer, null, () => seed());
  const [route, setRoute] = useState("dashboard");
  const [loaded, setLoaded] = useState(false);
  const [palette, setPalette] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  // Load from persistent storage
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage?.get(STORE_KEY);
        if (r?.value) dispatch({ type: "LOAD", payload: { ...seed(), ...JSON.parse(r.value) } });
      } catch { /* first run */ }
      setLoaded(true);
    })();
  }, []);
  // Persist on change
  useEffect(() => {
    if (!loaded) return;
    (async () => { try { await window.storage?.set(STORE_KEY, JSON.stringify(state)); } catch {} })();
  }, [state, loaded]);
  // Cmd+K
  useEffect(() => {
    const h = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const go = useCallback((r) => { setRoute(r); setMobileNav(false); }, []);

  // Autenticación y permisos
  const me = (state.appUsers || []).find((u) => u.user_id === state.session?.user_id) || null;
  const isMaster = me?.role === "master";
  const canSee = useCallback((n) => (n.master ? isMaster : (isMaster || (me?.modules || []).includes(n.to))), [isMaster, me]);
  const navItems = NAV.filter(canSee);
  const firstAllowed = isMaster ? "dashboard" : ((me?.modules || [])[0] || "dashboard");
  const routeAllowed = navItems.some((n) => n.to === route);
  const effectiveRoute = routeAllowed ? route : firstAllowed;

  const handleLogin = (email, password) => {
    const u = (state.appUsers || []).find((x) => x.email.toLowerCase() === email.toLowerCase() && x.password === password && x.active);
    if (!u) return false;
    dispatch({ type: "LOGIN", session: { user_id: u.user_id, name: u.name, email: u.email, role: u.role } });
    dispatch({ type: "LOG", msg: "inició sesión" });
    setRoute(u.role === "master" ? "dashboard" : (u.modules || [])[0] || "dashboard");
    return true;
  };
  const handleLogout = () => { dispatch({ type: "LOG", msg: "cerró sesión" }); dispatch({ type: "LOGOUT" }); };

  const title = NAV.find((n) => n.to === effectiveRoute)?.label || "";

  const Page = () => {
    switch (effectiveRoute) {
      case "dashboard": return <Dashboard state={state} go={go} />;
      case "projects": return <Projects state={state} dispatch={dispatch} />;
      case "clients": return <Clients state={state} dispatch={dispatch} />;
      case "invoices": return <Invoices state={state} dispatch={dispatch} />;
      case "quotes": return <Quotes state={state} dispatch={dispatch} />;
      case "purchase-orders": return <PurchaseOrders state={state} dispatch={dispatch} />;
      case "purchases": return <Purchases state={state} dispatch={dispatch} />;
      case "expenses": return <Expenses state={state} dispatch={dispatch} />;
      case "other-income": return <OtherIncome state={state} dispatch={dispatch} />;
      case "carry-debt": return <CarryDebt state={state} dispatch={dispatch} />;
      case "loans": return <LoansInvestments state={state} dispatch={dispatch} />;
      case "reports": return <Reports state={state} />;
      case "settings": return <SettingsPage state={state} dispatch={dispatch} />;
      case "users": return isMaster ? <AppUsers state={state} dispatch={dispatch} me={me} /> : null;
      case "log": return isMaster ? <LogView state={state} /> : null;
      default: return null;
    }
  };

  const Sidebar = ({ mobile }) => (
    <aside className={`${mobile ? "w-64" : "w-64 hidden lg:flex"} flex-col shrink-0`} style={{ background: NAVY }}>
      <div className="px-5 py-5 flex items-center gap-3 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shrink-0" style={{ background: `linear-gradient(135deg, ${COPPER}, ${COPPER_DK})` }}>C</div>
        <div>
          <div className="text-white font-bold leading-tight">CONSA</div>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: ACCENT }}>Administración</div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((n) => {
          const active = effectiveRoute === n.to;
          return (
            <button key={n.to} onClick={() => go(n.to)}
              className={`w-full flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium transition ${active ? "text-white shadow-md" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
              style={active ? { background: COPPER } : {}}>
              <n.icon size={17} />{n.label}
            </button>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center justify-between gap-2 px-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-semibold shrink-0">{(me?.name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
            <div className="text-xs min-w-0"><div className="text-white font-medium truncate">{me?.name}</div><div className="text-slate-400 capitalize">{isMaster ? "Master" : "Usuario"}</div></div>
          </div>
          <button onClick={handleLogout} title="Cerrar sesión" className="p-1.5 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white shrink-0"><LogOut size={16} /></button>
        </div>
      </div>
    </aside>
  );

  if (!loaded) return <div className="min-h-screen" style={{ background: NAVY }} />;
  if (!me) return <Login onLogin={handleLogin} />;

  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: "Inter, ui-sans-serif, system-ui", background: "#F4F6F8" }}>
      <Sidebar />
      {mobileNav && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNav(false)} />
          <div className="relative z-10"><Sidebar mobile /></div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center gap-3 px-4 sm:px-6 shrink-0">
          <button onClick={() => setMobileNav(true)} className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"><LayoutDashboard size={18} /></button>
          <div className="flex items-center gap-2">
            <Building2 size={18} style={{ color: COPPER }} />
            <button className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 h-9 px-2 rounded-lg transition">
              {state.company.name} <ChevronDown size={14} className="text-slate-400" />
            </button>
          </div>
          <div className="flex-1" />
          <button onClick={() => setPalette(true)}
            className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 text-slate-400 text-sm hover:bg-slate-50 transition">
            <Search size={15} /> Buscar <kbd className="ml-6 text-[10px] border border-slate-200 rounded px-1.5 py-0.5 flex items-center gap-0.5"><Command size={9} />K</kbd>
          </button>
          <button onClick={() => setPalette(true)} className="sm:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-500"><Search size={18} /></button>
        </header>

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold" style={{ color: NAVY, fontFamily: "Manrope, Inter, sans-serif" }}>{title}</h1>
              <p className="text-sm text-slate-400 mt-0.5">
                {effectiveRoute === "dashboard" && "Visión consolidada de ventas, compras e IVA"}
                {effectiveRoute === "projects" && "Proyectos y minas como centros de costo"}
                {effectiveRoute === "clients" && "Cartera de clientes con validación de RUT"}
                {effectiveRoute === "invoices" && "Emisión, estados y cobranza"}
                {effectiveRoute === "quotes" && "Presupuestos y conversión a factura"}
                {effectiveRoute === "purchase-orders" && "Órdenes a proveedores con recepción y PDF"}
                {effectiveRoute === "purchases" && "Compras con separación de IVA crédito"}
                {effectiveRoute === "expenses" && "Gastos operacionales por categoría"}
                {effectiveRoute === "other-income" && "Créditos, asociaciones, venta de activos y otros"}
                {effectiveRoute === "carry-debt" && "Pasivo de consolidación anual"}
                {effectiveRoute === "loans" && "Histórico de préstamos e inversiones a terceros"}
                {effectiveRoute === "reports" && "Ingresos, egresos y resultado neto"}
                {effectiveRoute === "settings" && "Empresa, branding y auditoría"}
                {effectiveRoute === "users" && "Gestión de accesos y permisos por módulo"}
                {effectiveRoute === "log" && "Bitácora de todas las gestiones del sistema"}
              </p>
            </div>
            <Page />
          </div>
        </main>
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} go={go} state={state} canSee={canSee} />
    </div>
  );
}
