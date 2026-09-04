import React, { useState, useEffect, useReducer, useMemo, useCallback } from "react";
import {
  LayoutDashboard, Users, FileText, FileClock, ShoppingCart, Receipt,
  TrendingUp, Settings as SettingsIcon, Search, Plus, X, Trash2, Edit3,
  Download, Building2, ChevronDown, AlertTriangle, CheckCircle2, Clock,
  Send, Eye, Coins, ArrowRightLeft, Command, Bell, ArrowUpRight, ArrowDownRight,
  ClipboardList, Truck, FolderKanban, Mountain, MapPin, Target, Scale,
  ShieldCheck, KeyRound, LogOut, Lock, History, UserPlus, Landmark, Factory, Database, HelpCircle,
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
  partial: { label: "Capitalizada parcial", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  capitalized: { label: "Capitalizada", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  paid: { label: "Pagada", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};
/* ============================ Recursos Humanos — parámetros legales ============================ */
/* IMPORTANTE: UF, UTM, topes y montos cambian periódicamente. Se editan en el módulo RR.HH. */
const HR_DEFAULT_PARAMS = {
  vigencia: "2026-01",
  uf: 39500,                 // valor UF — actualizar mensualmente
  utm: 69000,                // valor UTM — actualizar mensualmente
  imm: 529000,               // ingreso mínimo mensual
  topeImponibleUF: 87.8,     // tope AFP y salud
  topeAFCUF: 131.9,          // tope seguro de cesantía
  tasaAFPBase: 10,           // cotización obligatoria AFP
  tasaSalud: 7,              // cotización salud
  tasaAFCIndefinidoTrab: 0.6,
  tasaAFCIndefinidoEmp: 2.4,
  tasaAFCPlazoFijoEmp: 3.0,
  tasaSIS: 1.88,             // cargo empleador
  tasaMutual: 0.9,           // cargo empleador (básica)
  tasaSanna: 0.03,           // cargo empleador
  tasaReformaEmp: 1.0,       // aporte adicional empleador (Ley 21.735, gradual)
  jornadaSemanal: 42,        // Ley 40 horas: 44 (2024), 42 (2026), 40 (2028)
  gratificacionTopeIMM: 4.75, // tope legal anual (art. 50 CT)
  // Asignación familiar — tramos por renta (montos por carga)
  asigFamiliar: [
    { hasta: 620251, monto: 22007 },
    { hasta: 905941, monto: 13505 },
    { hasta: 1412957, monto: 4267 },
    { hasta: Infinity, monto: 0 },
  ],
  // Impuesto único 2ª categoría — tramos en UTM (factor y rebaja en UTM)
  tramosImpuesto: [
    { desde: 0, hasta: 13.5, factor: 0, rebaja: 0 },
    { desde: 13.5, hasta: 30, factor: 0.04, rebaja: 0.54 },
    { desde: 30, hasta: 50, factor: 0.08, rebaja: 1.74 },
    { desde: 50, hasta: 70, factor: 0.135, rebaja: 4.49 },
    { desde: 70, hasta: 90, factor: 0.23, rebaja: 11.14 },
    { desde: 90, hasta: 120, factor: 0.304, rebaja: 17.80 },
    { desde: 120, hasta: 310, factor: 0.35, rebaja: 23.32 },
    { desde: 310, hasta: Infinity, factor: 0.40, rebaja: 38.82 },
  ],
};
const AFP_LIST = [
  { name: "Capital", comision: 1.44 }, { name: "Cuprum", comision: 1.44 },
  { name: "Habitat", comision: 1.27 }, { name: "Modelo", comision: 0.58 },
  { name: "PlanVital", comision: 1.16 }, { name: "ProVida", comision: 1.45 },
  { name: "Uno", comision: 0.49 },
];
const CONTRACT_TYPES = ["Indefinido", "Plazo fijo", "Por obra o faena"];
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

/* Motor de cálculo de la liquidación */
function calcPayslip(emp, mov, P) {
  const r = (n) => Math.round(n || 0);
  const dias = Math.min(30, Math.max(0, Number(mov.dias_trabajados ?? 30)));
  const base = r((Number(emp.sueldo_base) || 0) * dias / 30);

  // Horas extra: horas mensuales = jornada semanal × 30/7
  const horasMes = (Number(emp.jornada_semanal) || P.jornadaSemanal) * 30 / 7;
  const valorHE = horasMes > 0 ? ((Number(emp.sueldo_base) || 0) / horasMes) * 1.5 : 0;
  const horasExtra = r(valorHE * (Number(mov.horas_extra) || 0));

  const comisiones = Number(mov.comisiones) || 0;
  const bonos = Number(mov.bonos_imponibles) || 0;

  // Gratificación legal art. 50: 25% de lo devengado, tope 4,75 IMM / 12
  const baseGrat = base + horasExtra + comisiones + bonos;
  const topeGrat = (P.gratificacionTopeIMM * P.imm) / 12;
  const gratificacion = emp.gratificacion ? r(Math.min(baseGrat * 0.25, topeGrat)) : 0;

  const totalImponible = base + horasExtra + comisiones + bonos + gratificacion;

  // Topes
  const topeImp = r(P.topeImponibleUF * P.uf);
  const topeAFC = r(P.topeAFCUF * P.uf);
  const imponibleAFP = Math.min(totalImponible, topeImp);
  const imponibleAFC = Math.min(totalImponible, topeAFC);

  // AFP
  const comisionAFP = Number(emp.afp_comision) || 0;
  const afpObligatoria = r(imponibleAFP * P.tasaAFPBase / 100);
  const afpComision = r(imponibleAFP * comisionAFP / 100);
  const totalAFP = afpObligatoria + afpComision;

  // Salud
  const saludLegal = r(imponibleAFP * P.tasaSalud / 100);
  let saludTotal = saludLegal, saludAdicional = 0;
  if (emp.salud_sistema === "Isapre") {
    const pactado = emp.plan_isapre_uf ? r((Number(emp.plan_isapre_uf) || 0) * P.uf) : r(Number(emp.plan_isapre_pesos) || 0);
    saludTotal = Math.max(saludLegal, pactado);
    saludAdicional = saludTotal - saludLegal;
  }

  // Seguro de cesantía (trabajador solo en contrato indefinido)
  const afcTrab = emp.tipo_contrato === "Indefinido" ? r(imponibleAFC * P.tasaAFCIndefinidoTrab / 100) : 0;

  const totalPrevisional = totalAFP + saludTotal + afcTrab;

  // APV (rebaja la base tributable en régimen A/B — se descuenta antes del impuesto)
  const apv = Number(mov.apv) || 0;

  // Impuesto único de 2ª categoría
  const baseTributable = Math.max(0, totalImponible - totalPrevisional - apv);
  const baseUTM = P.utm > 0 ? baseTributable / P.utm : 0;
  const tramo = P.tramosImpuesto.find((t) => baseUTM > t.desde && baseUTM <= t.hasta) || P.tramosImpuesto[0];
  const impuesto = r(Math.max(0, baseTributable * tramo.factor - tramo.rebaja * P.utm));

  // Asignación familiar según tramo de renta
  const tramoAF = P.asigFamiliar.find((t) => totalImponible <= t.hasta) || { monto: 0 };
  const asignacionFamiliar = r(tramoAF.monto * (Number(emp.cargas_familiares) || 0));

  // No imponibles
  const colacion = r((Number(emp.colacion) || 0) * dias / 30);
  const movilizacion = r((Number(emp.movilizacion) || 0) * dias / 30);
  const otrosNoImp = Number(mov.otros_no_imponibles) || 0;
  const totalNoImponible = colacion + movilizacion + asignacionFamiliar + otrosNoImp;

  // Otros descuentos
  const anticipos = Number(mov.anticipos) || 0;
  const prestamos = Number(mov.prestamos) || 0;
  const otrosDesc = Number(mov.otros_descuentos) || 0;

  const totalHaberes = totalImponible + totalNoImponible;
  const totalDescuentos = totalPrevisional + impuesto + apv + anticipos + prestamos + otrosDesc;
  const liquido = totalHaberes - totalDescuentos;

  // Aportes de cargo del empleador
  const sis = r(imponibleAFP * P.tasaSIS / 100);
  const afcEmp = r(imponibleAFC * (emp.tipo_contrato === "Indefinido" ? P.tasaAFCIndefinidoEmp : P.tasaAFCPlazoFijoEmp) / 100);
  const mutual = r(totalImponible * P.tasaMutual / 100);
  const sanna = r(totalImponible * P.tasaSanna / 100);
  const reforma = r(imponibleAFP * (P.tasaReformaEmp || 0) / 100);
  const totalEmpleador = sis + afcEmp + mutual + sanna + reforma;

  return {
    dias, base, horasExtra, valorHE: r(valorHE), comisiones, bonos, gratificacion, totalImponible,
    topeImp, imponibleAFP, imponibleAFC, afpObligatoria, afpComision, totalAFP,
    saludLegal, saludTotal, saludAdicional, afcTrab, totalPrevisional,
    apv, baseTributable, impuesto, tramoNum: P.tramosImpuesto.indexOf(tramo) + 1,
    colacion, movilizacion, asignacionFamiliar, otrosNoImp, totalNoImponible,
    anticipos, prestamos, otrosDesc, totalHaberes, totalDescuentos, liquido,
    sis, afcEmp, mutual, sanna, reforma, totalEmpleador, costoEmpresa: totalHaberes + totalEmpleador,
  };
}

const CAP_MECHANISMS = ["Acciones serie D", "Aporte de capital", "Dación en pago / compensación", "Otro"];

/* Retención de boletas de honorarios — tasas por año (Ley 21.133) */
const RETENTION_RATES = { 2020: 10.75, 2021: 11.5, 2022: 12.25, 2023: 13, 2024: 13.75, 2025: 14.5, 2026: 15.25, 2027: 16, 2028: 17 };
const retentionRateFor = (dateStr) => {
  const y = new Date(dateStr || Date.now()).getFullYear();
  if (RETENTION_RATES[y] != null) return RETENTION_RATES[y];
  return y < 2020 ? 10 : 17; // 17% es la tasa final desde 2028
};const CAP_DOC_TYPES = ["Escritura pública", "Acta de junta de accionistas", "Certificado de emisión de acciones", "Contrato", "Comprobante contable", "Otro"];

/* Helpers de capitalización de deuda */
const capTotal = (d) => (d.capitalizations || []).reduce((s, c) => s + (c.amount || 0), 0);
const capToEquity = (d) => (d.capitalizations || []).reduce((s, c) => s + (c.deducts_annual ? 0 : c.amount || 0), 0);
const debtBalance = (d) => Math.max(0, (d.amount || 0) - capTotal(d));
// Monto que sigue impactando el resultado anual (lo capitalizado a patrimonio deja de descontar)
const debtEffective = (d) => Math.max(0, (d.amount || 0) - capToEquity(d));
const debtStatus = (d) => {
  if (d.status === "paid") return "paid";
  const t = capTotal(d);
  if (t <= 0) return "pending";
  return t >= (d.amount || 0) ? "capitalized" : "partial";
};
const MODULE_CATALOG = [
  ["dashboard", "Dashboard"], ["projects", "Proyectos"], ["clients", "Clientes"], ["suppliers", "Proveedores"],
  ["invoices", "Facturas"], ["quotes", "Presupuestos"], ["purchase-orders", "Órdenes de compra"],
  ["purchases", "Compras"], ["expenses", "Gastos"], ["other-income", "Otros ingresos"],
  ["carry-debt", "Deuda de arrastre"], ["loans", "Préstamos e inversiones"], ["hr", "Recursos humanos"], ["reports", "Informes"], ["settings", "Configuración"],
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
  const company = {
    company_id: cid, name: CONSA.legal, rut: "",
    address: `${CONSA.address}, ${CONSA.city}`, notification_email: CONSA.email,
    primary_color: CONSA.orange, secondary_color: CONSA.maroon, accent_color: ACCENT,
  };
  // Único usuario inicial: el Master crea el resto desde el módulo Usuarios.
  const appUsers = [
    { user_id: uid("user"), name: "Master CONSA", email: "master@consa.cl", password: "consa2026", role: "master", modules: [], active: true, created_at: new Date().toISOString() },
  ];
  return {
    company, clients: [], suppliers: [], invoices: [], quotes: [], expenses: [], purchases: [],
    purchaseOrders: [], projects: [], otherIncome: [], carryDebt: [], loansInvestments: [],
    employees: [], payslips: [], hrParams: HR_DEFAULT_PARAMS,
    appUsers, session: null, activity: [],
  };
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
    case "RESTORE": return { ...a.payload, session: a.session ?? null };
    case "HRPARAMS": return { ...state, hrParams: a.params };
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

/* ============================ Identidad corporativa ============================ */
const CONSA = {
  legal: "CONSORCIO SALINERO DEL TARAPACÁ S.A.",
  short: "CONSA",
  address: "Las Bellotas 199, Oficina 62",
  city: "Providencia, Santiago, Región Metropolitana",
  email: "contacto@consa.cl",
  web: "www.grupoconsa.cl",
  orange: "#FE4101",
  maroon: "#820503",
};
const BRAND_ORANGE = [254, 65, 1];
const BRAND_MAROON = [130, 5, 3];
const LOGO_RATIO = 0.7903; // ancho / alto
const LOGO_B64 = "data:image/jpeg;base64,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";

/* ============================ Motor de PDF corporativo ============================ */
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
const pdfDate = (d) => (d ? new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" }) : "—");

const PW = 210, PH = 297, PM = 16; // A4 en mm

// Encabezado corporativo: logo + razón social + bloque de documento
function pdfHeader(doc, { title, number, meta = [] }) {
  const logoH = 22, logoW = logoH * LOGO_RATIO;
  try { doc.addImage(LOGO_B64, "JPEG", PM, 12, logoW, logoH); } catch (_) {}

  const tx = PM + logoW + 6;
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...BRAND_MAROON);
  doc.text(CONSA.legal, tx, 17);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.8); doc.setTextColor(110, 116, 124);
  doc.text(CONSA.address, tx, 22);
  doc.text(CONSA.city, tx, 25.8);
  doc.text(`${CONSA.email}  ·  ${CONSA.web}`, tx, 29.6);

  // Bloque del documento (derecha)
  const bw = 56, bx = PW - PM - bw;
  doc.setFillColor(...BRAND_MAROON); doc.roundedRect(bx, 12, bw, 17, 2, 2, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
  doc.text(title.toUpperCase(), bx + bw / 2, 18.5, { align: "center" });
  doc.setFontSize(12); doc.setTextColor(255, 214, 200);
  doc.text(String(number || ""), bx + bw / 2, 25.5, { align: "center" });

  // Banda bicolor
  doc.setFillColor(...BRAND_ORANGE); doc.rect(PM, 37, (PW - 2 * PM) * 0.42, 1.4, "F");
  doc.setFillColor(...BRAND_MAROON); doc.rect(PM + (PW - 2 * PM) * 0.42, 37, (PW - 2 * PM) * 0.58, 1.4, "F");

  let y = 45;
  if (meta.length) {
    doc.setFontSize(8.5);
    meta.forEach(([k, v]) => {
      const val = String(v);
      doc.setFont("helvetica", "bold");
      const vw = doc.getTextWidth(val);
      doc.setFont("helvetica", "normal"); doc.setTextColor(130, 136, 144);
      doc.text(`${k}:`, PW - PM - vw - 3, y, { align: "right" });
      doc.setFont("helvetica", "bold"); doc.setTextColor(60, 66, 74);
      doc.text(val, PW - PM, y, { align: "right" });
      y += 4.6;
    });
  }
  return Math.max(y, 45);
}

// Bloque de contraparte (cliente o proveedor)
function pdfParty(doc, y, label, party) {
  doc.setFillColor(248, 249, 251); doc.roundedRect(PM, y, 92, 26, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...BRAND_ORANGE);
  doc.text(label.toUpperCase(), PM + 5, y + 6);
  doc.setFontSize(10); doc.setTextColor(35, 41, 48);
  doc.text(String(party.name || "—").slice(0, 42), PM + 5, y + 12.5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(110, 116, 124);
  let ly = y + 17.5;
  [party.rut, party.email, party.address].filter(Boolean).forEach((l) => {
    doc.text(String(l).slice(0, 52), PM + 5, ly); ly += 4;
  });
  return y + 32;
}

// Tabla de ítems
function pdfItems(doc, y, items) {
  const cQ = 118, cP = 152, cT = PW - PM;
  doc.setFillColor(...BRAND_MAROON); doc.rect(PM, y, PW - 2 * PM, 8, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
  doc.text("DESCRIPCIÓN", PM + 4, y + 5.4);
  doc.text("CANT.", cQ, y + 5.4, { align: "right" });
  doc.text("P. UNITARIO", cP, y + 5.4, { align: "right" });
  doc.text("IMPORTE", cT - 4, y + 5.4, { align: "right" });
  y += 8;

  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  items.forEach((it, i) => {
    if (y > 245) { doc.addPage(); y = 25; }
    if (i % 2 === 1) { doc.setFillColor(250, 251, 252); doc.rect(PM, y, PW - 2 * PM, 7.5, "F"); }
    doc.setTextColor(55, 61, 68);
    doc.text(String(it.description || "—").slice(0, 58), PM + 4, y + 5.2);
    doc.setTextColor(90, 96, 104);
    doc.text(String(it.quantity), cQ, y + 5.2, { align: "right" });
    doc.text(pdfMoney(it.price), cP, y + 5.2, { align: "right" });
    doc.setTextColor(35, 41, 48); doc.setFont("helvetica", "bold");
    doc.text(pdfMoney(it.quantity * it.price), cT - 4, y + 5.2, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 7.5;
  });
  doc.setDrawColor(228, 231, 235); doc.setLineWidth(0.3); doc.line(PM, y, PW - PM, y);
  return y + 6;
}

// Totales
function pdfTotals(doc, y, { subtotal, tax, total, taxed = true }) {
  const bx = PW - PM - 72;
  const line = (label, val, opt = {}) => {
    doc.setFont("helvetica", opt.bold ? "bold" : "normal"); doc.setFontSize(opt.size || 9);
    doc.setTextColor(...(opt.color || [95, 101, 109]));
    doc.text(label, bx + 4, y + 5.2); doc.text(val, PW - PM - 4, y + 5.2, { align: "right" });
    y += opt.h || 6.5;
  };
  line("Subtotal neto", pdfMoney(subtotal));
  if (taxed) line("IVA 19%", pdfMoney(tax));
  else line("IVA", "Exento");
  doc.setFillColor(...BRAND_MAROON); doc.roundedRect(bx, y, 72, 11, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
  doc.text("TOTAL", bx + 4, y + 7.3); doc.text(pdfMoney(total), PW - PM - 4, y + 7.3, { align: "right" });
  return y + 17;
}

// Notas
function pdfNotes(doc, y, notes) {
  if (!notes) return y;
  if (y > 250) { doc.addPage(); y = 25; }
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...BRAND_ORANGE);
  doc.text("OBSERVACIONES", PM, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(95, 101, 109);
  doc.text(doc.splitTextToSize(String(notes), PW - 2 * PM), PM, y + 5);
  return y + 14;
}

// Pie de página en todas las hojas
function pdfFooter(doc) {
  const n = doc.internal.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BRAND_ORANGE); doc.setLineWidth(0.6); doc.line(PM, PH - 18, PW - PM, PH - 18);
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...BRAND_MAROON);
    doc.text(CONSA.legal, PM, PH - 13.5);
    doc.setFont("helvetica", "normal"); doc.setTextColor(130, 136, 144);
    doc.text(`${CONSA.address}, ${CONSA.city}  ·  ${CONSA.email}  ·  ${CONSA.web}`, PM, PH - 9.8);
    doc.text(`Página ${i} de ${n}`, PW - PM, PH - 9.8, { align: "right" });
  }
}

/* ---------- Documentos ---------- */
async function generateInvoicePDF(inv) {
  const JsPDF = await ensureJsPDF();
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  let y = pdfHeader(doc, {
    title: DTE_TYPES[inv.tipo_dte] || "Factura", number: inv.invoice_number,
    meta: [["Fecha de emisión", pdfDate(inv.created_at)], ["Vencimiento", pdfDate(inv.due_date)], ["Estado", (INVOICE_STATUS[inv.status] || {}).label || "—"]],
  });
  y = pdfParty(doc, y, "Facturar a", { name: inv.client_name });
  y = pdfItems(doc, y, inv.items || []);
  y = pdfTotals(doc, y, { subtotal: inv.subtotal, tax: inv.tax_total, total: inv.total, taxed: inv.taxed !== false });
  pdfNotes(doc, y, inv.notes);
  pdfFooter(doc);
  doc.save(`${inv.invoice_number}.pdf`);
}

async function generateQuotePDF(q) {
  const JsPDF = await ensureJsPDF();
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  let y = pdfHeader(doc, {
    title: "Presupuesto", number: q.quote_number,
    meta: [["Fecha de emisión", pdfDate(q.created_at)], ["Válido hasta", pdfDate(q.valid_until)], ["Estado", (QUOTE_STATUS[q.status] || {}).label || "—"]],
  });
  y = pdfParty(doc, y, "Presentado a", { name: q.client_name });
  y = pdfItems(doc, y, q.items || []);
  y = pdfTotals(doc, y, { subtotal: q.subtotal, tax: q.tax_total, total: q.total, taxed: q.taxed !== false });
  y = pdfNotes(doc, y, q.notes);
  if (y < 245) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); doc.setTextColor(140, 146, 154);
    doc.text("Este documento constituye una propuesta comercial y no representa un documento tributario.", PM, y + 2);
  }
  pdfFooter(doc);
  doc.save(`${q.quote_number}.pdf`);
}

async function generatePOPDF(po) {
  const JsPDF = await ensureJsPDF();
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  let y = pdfHeader(doc, {
    title: "Orden de Compra", number: po.po_number,
    meta: [["Fecha de emisión", pdfDate(po.created_at)], ["Fecha de entrega", pdfDate(po.delivery_date)], ["Estado", (PO_STATUS[po.status] || {}).label || "—"]],
  });
  y = pdfParty(doc, y, "Proveedor", { name: po.supplier_name, rut: po.supplier_rut, email: po.supplier_email, address: po.supplier_address });
  y = pdfItems(doc, y, po.items || []);
  y = pdfTotals(doc, y, { subtotal: po.subtotal, tax: po.tax_total, total: po.total, taxed: po.taxed !== false });
  y = pdfNotes(doc, y, po.notes);
  if (y < 240) {
    doc.setFillColor(248, 249, 251); doc.roundedRect(PM, y, PW - 2 * PM, 16, 2, 2, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...BRAND_ORANGE);
    doc.text("CONDICIONES", PM + 4, y + 5.5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(110, 116, 124);
    doc.text("La facturación debe hacer referencia al número de esta orden de compra. Los despachos fuera de", PM + 4, y + 10);
    doc.text("la fecha indicada requieren autorización previa por escrito.", PM + 4, y + 13.5);
  }
  pdfFooter(doc);
  doc.save(`${po.po_number}.pdf`);
}

async function generatePayslipPDF({ emp, mov, l, periodo, company }) {
  const JsPDF = await ensureJsPDF();
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const [yy, mm] = periodo.split("-");
  const periodoLabel = `${MESES[Number(mm) - 1]} de ${yy}`;
  let y = pdfHeader(doc, { title: "Liquidación de Sueldo", number: periodoLabel.toUpperCase(), meta: [] });

  // Datos del trabajador
  doc.setFillColor(248, 249, 251); doc.roundedRect(PM, y, PW - 2 * PM, 24, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...BRAND_ORANGE);
  doc.text("TRABAJADOR", PM + 5, y + 6);
  doc.setFontSize(10.5); doc.setTextColor(35, 41, 48);
  doc.text(String(emp.nombre || "").slice(0, 45), PM + 5, y + 12.5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(110, 116, 124);
  doc.text(`RUT ${emp.rut || "—"}  ·  ${emp.cargo || "—"}`, PM + 5, y + 18);
  doc.text(`Ingreso: ${emp.fecha_ingreso ? pdfDate(emp.fecha_ingreso) : "—"}`, PM + 5, y + 22);
  const cx = PW / 2 + 6;
  doc.text(`Contrato: ${emp.tipo_contrato || "—"}`, cx, y + 12.5);
  doc.text(`AFP ${emp.afp || "—"}  ·  Salud: ${emp.salud_sistema || "—"}`, cx, y + 18);
  doc.text(`Días trabajados: ${l.dias}  ·  Cargas: ${emp.cargas_familiares || 0}`, cx, y + 22);
  y += 30;

  // Dos columnas: haberes / descuentos
  const colW = (PW - 2 * PM - 6) / 2;
  const xH = PM, xD = PM + colW + 6;
  const headCol = (x, title, color) => {
    doc.setFillColor(...color); doc.rect(x, y, colW, 7, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(255, 255, 255);
    doc.text(title, x + 3, y + 4.8);
  };
  headCol(xH, "HABERES", BRAND_MAROON); headCol(xD, "DESCUENTOS", [90, 96, 104]);
  let yH = y + 7, yD = y + 7;
  const put = (x, yy2, label, val, opt = {}) => {
    doc.setFont("helvetica", opt.bold ? "bold" : "normal"); doc.setFontSize(opt.size || 8.5);
    doc.setTextColor(...(opt.color || [71, 77, 85]));
    doc.text(label, x + 3, yy2 + 4.6); doc.text(pdfMoney(val), x + colW - 3, yy2 + 4.6, { align: "right" });
    return yy2 + 5.8;
  };
  const sep = (x, yy2) => { doc.setDrawColor(228, 231, 235); doc.setLineWidth(0.2); doc.line(x + 2, yy2 + 1, x + colW - 2, yy2 + 1); return yy2 + 2; };

  yH = put(xH, yH, "Sueldo base", l.base);
  if (l.horasExtra) yH = put(xH, yH, `Horas extra (${mov.horas_extra} hrs)`, l.horasExtra);
  if (l.comisiones) yH = put(xH, yH, "Comisiones", l.comisiones);
  if (l.bonos) yH = put(xH, yH, "Bonos imponibles", l.bonos);
  if (l.gratificacion) yH = put(xH, yH, "Gratificación legal (art. 50)", l.gratificacion);
  yH = sep(xH, yH);
  yH = put(xH, yH, "Total imponible", l.totalImponible, { bold: true, color: BRAND_MAROON });
  yH += 2;
  if (l.colacion) yH = put(xH, yH, "Colación", l.colacion);
  if (l.movilizacion) yH = put(xH, yH, "Movilización", l.movilizacion);
  if (l.asignacionFamiliar) yH = put(xH, yH, `Asignación familiar (${emp.cargas_familiares})`, l.asignacionFamiliar);
  if (l.otrosNoImp) yH = put(xH, yH, "Otros no imponibles", l.otrosNoImp);
  yH = sep(xH, yH);
  yH = put(xH, yH, "Total no imponible", l.totalNoImponible, { bold: true });

  yD = put(xD, yD, `AFP ${emp.afp || ""} (${(HR_NUM(emp.afp_comision) + 10).toFixed(2)}%)`, l.totalAFP);
  yD = put(xD, yD, emp.salud_sistema === "Isapre" ? "Isapre (plan pactado)" : "Fonasa 7%", l.saludTotal);
  if (l.afcTrab) yD = put(xD, yD, "Seguro de cesantía 0,6%", l.afcTrab);
  yD = sep(xD, yD);
  yD = put(xD, yD, "Total previsional", l.totalPrevisional, { bold: true });
  yD += 2;
  if (l.apv) yD = put(xD, yD, "APV", l.apv);
  if (l.impuesto) yD = put(xD, yD, `Impuesto único (tramo ${l.tramoNum})`, l.impuesto);
  if (l.anticipos) yD = put(xD, yD, "Anticipos", l.anticipos);
  if (l.prestamos) yD = put(xD, yD, "Préstamos", l.prestamos);
  if (l.otrosDesc) yD = put(xD, yD, "Otros descuentos", l.otrosDesc);
  yD = sep(xD, yD);
  yD = put(xD, yD, "Total descuentos", l.totalDescuentos, { bold: true, color: [185, 28, 28] });

  y = Math.max(yH, yD) + 6;

  // Totales
  doc.setFillColor(246, 247, 249); doc.roundedRect(PM, y, PW - 2 * PM, 9, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(71, 77, 85);
  doc.text("TOTAL HABERES", PM + 4, y + 6); doc.text(pdfMoney(l.totalHaberes), PM + colW - 3, y + 6, { align: "right" });
  doc.text("TOTAL DESCUENTOS", xD + 3, y + 6); doc.text(pdfMoney(l.totalDescuentos), PW - PM - 4, y + 6, { align: "right" });
  y += 13;
  doc.setFillColor(...BRAND_MAROON); doc.roundedRect(PM, y, PW - 2 * PM, 13, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(255, 255, 255);
  doc.text("LÍQUIDO A PAGAR", PM + 5, y + 8.6);
  doc.text(pdfMoney(l.liquido), PW - PM - 5, y + 8.6, { align: "right" });
  y += 20;

  // Aportes empleador
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...BRAND_ORANGE);
  doc.text("APORTES DE CARGO DEL EMPLEADOR (no se descuentan al trabajador)", PM, y); y += 5;
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(110, 116, 124);
  const ap = [["SIS", l.sis], ["Cesantía", l.afcEmp], ["Mutual", l.mutual], ["Ley SANNA", l.sanna], ["Aporte reforma", l.reforma]].filter(([, v]) => v > 0);
  let ax = PM;
  ap.forEach(([k, v]) => { doc.text(`${k}: ${pdfMoney(v)}`, ax, y); ax += (PW - 2 * PM) / Math.max(ap.length, 1); });
  y += 5;
  doc.setFont("helvetica", "bold"); doc.setTextColor(71, 77, 85);
  doc.text(`Costo total empresa: ${pdfMoney(l.costoEmpresa)}`, PM, y);
  y += 14;

  // Firmas
  if (y < 240) {
    doc.setDrawColor(150, 155, 160); doc.setLineWidth(0.3);
    doc.line(PM + 8, y + 12, PM + 68, y + 12);
    doc.line(PW - PM - 68, y + 12, PW - PM - 8, y + 12);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(110, 116, 124);
    doc.text("Empleador", PM + 38, y + 16, { align: "center" });
    doc.text(String(emp.nombre || "").slice(0, 34), PW - PM - 38, y + 16, { align: "center" });
    doc.text(`RUT ${emp.rut || ""}`, PW - PM - 38, y + 19.5, { align: "center" });
    y += 26;
    doc.setFontSize(7); doc.setTextColor(140, 146, 154);
    doc.text("Certifico que he recibido de mi empleador el saldo líquido indicado y no tengo cargo ni cobro alguno posterior que hacer,", PM, y);
    doc.text("por ningún concepto derivado del período de pago señalado.", PM, y + 3.4);
  }
  pdfFooter(doc);
  doc.save(`liquidacion_${(emp.nombre || "trabajador").replace(/\s+/g, "_")}_${periodo}.pdf`);
}
const HR_NUM = (v) => Number(v) || 0;

async function generateIncomeStatementPDF(d) {
  const JsPDF = await ensureJsPDF();
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  let y = pdfHeader(doc, {
    title: "Estado de Resultado", number: "",
    meta: [["Periodo", d.periodLabel], ["Emitido", pdfDate(new Date())]],
  });
  y += 2;

  const line = (yy) => { doc.setDrawColor(228, 231, 235); doc.setLineWidth(0.2); doc.line(PM, yy, PW - PM, yy); };
  const row = (label, value, opt = {}) => {
    if (y > 258) { doc.addPage(); y = 25; }
    doc.setFont("helvetica", opt.bold ? "bold" : "normal"); doc.setFontSize(opt.size || 9.5);
    doc.setTextColor(...(opt.color || [71, 77, 85]));
    doc.text(label, PM + (opt.indent || 0), y); doc.text(value, PW - PM, y, { align: "right" }); y += 6.6;
  };
  const section = (t) => {
    if (y > 250) { doc.addPage(); y = 25; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...BRAND_ORANGE);
    doc.text(t.toUpperCase(), PM, y); y += 2; line(y); y += 5.5;
  };
  const band = (color) => { doc.setFillColor(...color); doc.roundedRect(PM, y - 4.8, PW - 2 * PM, 10.5, 2, 2, "F"); };

  section("Ingresos");
  row("Facturación", pdfMoney(d.facturado));
  row("Otros ingresos", pdfMoney(d.otrosIngresos));
  row("Total ingresos", pdfMoney(d.ingresos), { bold: true, color: BRAND_MAROON });
  y += 3;
  section("Egresos");
  row("Gastos operacionales", pdfMoney(d.gastos));
  row("Compras", pdfMoney(d.compras));
  row("Total egresos", pdfMoney(d.gastos + d.compras), { bold: true, color: [185, 28, 28] });
  y += 4;
  band([246, 247, 249]);
  row("Resultado operacional", pdfMoney(d.neto), { bold: true, color: d.neto >= 0 ? [4, 120, 87] : [185, 28, 28], size: 10.5 });
  y += 4;
  section("Impuesto al valor agregado");
  row("IVA débito (ventas)", pdfMoney(d.ivaDebito));
  row("IVA crédito (compras)", pdfMoney(d.ivaCredito));
  row("IVA a pagar al SII", pdfMoney(Math.max(0, d.ivaDebito - d.ivaCredito)), { bold: true, color: BRAND_MAROON });
  if (d.retencionesPeriodo > 0) {
    y += 3; section("Retenciones de honorarios");
    row(`Retenido en ${d.retPurCount} boleta(s) - a enterar al SII`, pdfMoney(d.retencionesPeriodo), { bold: true, color: [124, 58, 237] });
  }

  if (d.showAnnual) {
    y += 4; section("Ajustes de consolidación anual");
    if (d.includeCarry) {
      row(`(-) Deuda de arrastre (${d.coveredYears.join(", ")})`, pdfMoney(d.carryForPeriod), { color: [180, 83, 9] });
      if (d.carryCapitalized > 0) row("      Capitalizado a patrimonio (no descuenta)", pdfMoney(d.carryCapitalized), { color: [4, 120, 87], size: 8.5 });
    }
    if (d.includeLoans) row(`(-) Préstamos e inversiones (${d.coveredYears.join(", ")})`, pdfMoney(d.loansForPeriod), { color: [180, 83, 9] });
    y += 1; band(d.resultadoAnual >= 0 ? [236, 253, 245] : [254, 242, 242]);
    row("Resultado anual", pdfMoney(d.resultadoAnual), { bold: true, color: d.resultadoAnual >= 0 ? [4, 120, 87] : [185, 28, 28], size: 10.5 });
  }

  if (d.mode === "aggregate" && d.monthly.length) {
    y += 6; if (y > 235) { doc.addPage(); y = 25; }
    section("Detalle mensual (operacional)");
    const c2 = 105, c3 = 150, c4 = PW - PM;
    doc.setFillColor(...BRAND_MAROON); doc.rect(PM, y - 4.5, PW - 2 * PM, 7, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(255, 255, 255);
    doc.text("MES", PM + 3, y); doc.text("INGRESOS", c2, y, { align: "right" });
    doc.text("EGRESOS", c3, y, { align: "right" }); doc.text("NETO", c4 - 3, y, { align: "right" });
    y += 7;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    d.monthly.forEach((m, i) => {
      if (y > 268) { doc.addPage(); y = 25; }
      if (i % 2 === 1) { doc.setFillColor(250, 251, 252); doc.rect(PM, y - 4.3, PW - 2 * PM, 6.5, "F"); }
      doc.setTextColor(71, 77, 85);
      doc.text(String(m.label), PM + 3, y);
      doc.text(pdfMoney(m.ingresos), c2, y, { align: "right" });
      doc.text(pdfMoney(m.gastos + m.compras), c3, y, { align: "right" });
      doc.setTextColor(...(m.neto >= 0 ? [4, 120, 87] : [185, 28, 28]));
      doc.text(pdfMoney(m.neto), c4 - 3, y, { align: "right" });
      y += 6.5;
    });
  }
  pdfFooter(doc);
  doc.save(`estado_resultado_${d.fileTag}.pdf`);
}

// Respaldo imprimible si el entorno bloquea jsPDF
function printFallback(title, bodyHtml) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>body{font-family:Arial,Helvetica,sans-serif;color:#23292f;margin:28px}
  table{width:100%;border-collapse:collapse;margin:8px 0}td,th{padding:7px 4px;border-bottom:1px solid #eee;font-size:13px}
  th{background:#820503;color:#fff;text-align:left}.hd{border-bottom:3px solid #FE4101;padding-bottom:12px;margin-bottom:16px}
  .lg{color:#820503;font-size:17px;font-weight:700}.sec{color:#FE4101;font-size:11px;text-transform:uppercase;font-weight:700;margin-top:18px}
  .ft{margin-top:28px;border-top:2px solid #FE4101;padding-top:8px;font-size:10px;color:#888}</style></head><body>
  <div class="hd"><div class="lg">${CONSA.legal}</div>
  <div style="font-size:11px;color:#777">${CONSA.address}, ${CONSA.city} · ${CONSA.email} · ${CONSA.web}</div></div>
  ${bodyHtml}
  <div class="ft">${CONSA.legal} · ${CONSA.address}, ${CONSA.city} · ${CONSA.email} · ${CONSA.web}</div>
  <script>window.onload=function(){window.print()}<\/script></body></html>`;
  const w = window.open("", "_blank");
  if (!w) throw new Error("popup blocked");
  w.document.write(html); w.document.close();
}
function printIncomeStatement(d) {
  const r = (l, v, b) => `<tr><td>${l}</td><td style="text-align:right${b ? ";font-weight:700" : ""}">${pdfMoney(v)}</td></tr>`;
  printFallback("Estado de Resultado", `<h2 style="margin:0">Estado de Resultado</h2><div style="color:#777;font-size:12px">${d.periodLabel}</div>
  <div class="sec">Ingresos</div><table>${r("Facturación", d.facturado)}${r("Otros ingresos", d.otrosIngresos)}${r("Total ingresos", d.ingresos, true)}</table>
  <div class="sec">Egresos</div><table>${r("Gastos operacionales", d.gastos)}${r("Compras", d.compras)}${r("Total egresos", d.gastos + d.compras, true)}</table>
  <table>${r("Resultado operacional", d.neto, true)}</table>
  <div class="sec">IVA</div><table>${r("IVA débito", d.ivaDebito)}${r("IVA crédito", d.ivaCredito)}${r("IVA a pagar al SII", Math.max(0, d.ivaDebito - d.ivaCredito), true)}</table>
  ${d.showAnnual ? `<div class="sec">Ajustes de consolidación anual (${d.coveredYears.join(", ")})</div><table>${d.includeCarry ? r("(−) Deuda de arrastre", d.carryForPeriod) : ""}${d.includeLoans ? r("(−) Préstamos e inversiones", d.loansForPeriod) : ""}${r("Resultado anual", d.resultadoAnual, true)}</table>` : ""}`);
}
function printDocFallback(kind, docu) {
  const items = (docu.items || []).map((it) => `<tr><td>${it.description}</td><td style="text-align:right">${it.quantity}</td><td style="text-align:right">${pdfMoney(it.price)}</td><td style="text-align:right">${pdfMoney(it.quantity * it.price)}</td></tr>`).join("");
  const num = docu.invoice_number || docu.quote_number || docu.po_number || "";
  const party = docu.client_name || docu.supplier_name || "";
  printFallback(`${kind} ${num}`, `<h2 style="margin:0">${kind} ${num}</h2>
  <div style="color:#777;font-size:12px;margin-bottom:8px">${party}</div>
  <table><tr><th>Descripción</th><th style="text-align:right">Cant.</th><th style="text-align:right">P. unit.</th><th style="text-align:right">Importe</th></tr>${items}</table>
  <table style="width:280px;margin-left:auto"><tr><td>Subtotal</td><td style="text-align:right">${pdfMoney(docu.subtotal)}</td></tr>
  <tr><td>${docu.taxed === false ? "IVA (exento)" : "IVA 19%"}</td><td style="text-align:right">${docu.taxed === false ? "—" : pdfMoney(docu.tax_total)}</td></tr>
  <tr><td style="font-weight:700">Total</td><td style="text-align:right;font-weight:700">${pdfMoney(docu.total)}</td></tr></table>`);
}
// Envoltorio: intenta PDF, cae a ventana imprimible
async function downloadDoc(kind, docu) {
  const gen = { factura: generateInvoicePDF, presupuesto: generateQuotePDF, orden: generatePOPDF }[kind];
  const label = { factura: "Factura", presupuesto: "Presupuesto", orden: "Orden de Compra" }[kind];
  try { await gen(docu); }
  catch (e) { try { printDocFallback(label, docu); } catch (_) { alert("No se pudo generar el PDF en este entorno."); } }
}

/* ============================ Dashboard ============================ */
function Dashboard({ state, go }) {
  const { invoices, expenses, purchases } = state;
  const otherIncome = state.otherIncome || [];
  const now = Date.now();
  const totalFacturado = invoices.reduce((s, i) => s + i.total, 0);
  const otrosIngresos = otherIncome.reduce((s, o) => s + o.amount, 0);
  const ingresosTotales = totalFacturado + otrosIngresos;
  const totalPagado = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const totalPendiente = totalFacturado - totalPagado;
  const totalGastos = expenses.reduce((s, e) => s + e.amount, 0) + purchases.reduce((s, p) => s + p.total, 0);
  const ivaDebito = invoices.reduce((s, i) => s + i.tax_total, 0) + otherIncome.reduce((s, o) => s + (o.taxed ? o.tax_amount || 0 : 0), 0);
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
      const facturacion = invoices.filter((i) => bucket(i.created_at) === m.key).reduce((s, i) => s + i.total, 0);
      const otros = otherIncome.filter((o) => bucket(o.date) === m.key).reduce((s, o) => s + o.amount, 0);
      const compras = purchases.filter((p) => bucket(p.date) === m.key).reduce((s, p) => s + p.total, 0);
      const gastos = expenses.filter((e) => bucket(e.date) === m.key).reduce((s, e) => s + e.amount, 0);
      const ivaD = invoices.filter((i) => bucket(i.created_at) === m.key).reduce((s, i) => s + i.tax_total, 0) + otherIncome.filter((o) => bucket(o.date) === m.key).reduce((s, o) => s + (o.taxed ? o.tax_amount || 0 : 0), 0);
      const ivaC = purchases.filter((p) => bucket(p.date) === m.key).reduce((s, p) => s + p.tax_amount, 0);
      return { name: m.label, "Facturación": facturacion, "Otros ingresos": otros, Compras: compras, Gastos: gastos, "Balance IVA": ivaD - ivaC };
    });
  }, [invoices, purchases, expenses, otherIncome]);

  const topClients = useMemo(() => {
    const map = {};
    invoices.forEach((i) => { map[i.client_name] = (map[i.client_name] || 0) + i.total; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));
  }, [invoices]);

  const statusData = Object.keys(INVOICE_STATUS).map((k) => ({
    name: INVOICE_STATUS[k].label, value: invoices.filter((i) => i.status === k).length,
  })).filter((d) => d.value);
  const PIE = [COPPER, NAVY, ACCENT, "#10B981", "#8B5422"];

  const Metric = ({ icon: Icon, label, value, tone, delta, sub }) => (
    <Card className="p-5 relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-[0.06] group-hover:opacity-10 transition" style={{ background: tone }} />
      <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide">
        <Icon size={15} style={{ color: tone }} /> {label}
      </div>
      <div className="mt-2 text-2xl font-bold" style={{ color: NAVY }}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
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
        <Metric icon={Coins} label="Ingresos totales" value={clp(ingresosTotales)} tone={COPPER} sub={`Facturación ${clp(totalFacturado)} · Otros ${clp(otrosIngresos)}`} />
        <Metric icon={TrendingUp} label="Otros ingresos" value={clp(otrosIngresos)} tone="#10B981" sub="Créditos, activos, asociaciones" />
        <Metric icon={Clock} label="Por cobrar" value={clp(totalPendiente)} tone={ACCENT} sub={`Pagado ${clp(totalPagado)}`} />
        <Metric icon={Receipt} label="Gastos + compras" value={clp(totalGastos)} tone={NAVY} delta={3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold" style={{ color: NAVY }}>Ingresos · Compras · Gastos</h3>
            <span className="text-xs text-slate-400">últimos 6 meses</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={months} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => clp(v)} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Facturación" stackId="ing" fill={COPPER} />
              <Bar dataKey="Otros ingresos" stackId="ing" fill="#10B981" radius={[4, 4, 0, 0]} />
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

/* ============================ Suppliers ============================ */
function Suppliers({ state, dispatch }) {
  const [q, setQ] = useState("");
  const [flag, setFlag] = useState("all"); // all | compliance | risk | noncompliance
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const suppliers = state.suppliers || [];
  const cats = ["Insumos", "Maquinaria", "EPP", "Servicios", "Transporte", "Combustibles", "Otros"];
  const blank = { supplier_id: "", company_id: state.company.company_id, name: "", rut: "", email: "", phone: "", address: "", category: "Insumos", compliance: false, risk_matrix: false, honorarios: false, notes: "" };
  const [form, setForm] = useState(blank);
  const rutOk = form.rut === "" || validRut(form.rut);

  const openNew = () => { setForm({ ...blank, supplier_id: uid("sup") }); setEdit(null); setOpen(true); };
  const openEdit = (s) => { setForm(s); setEdit(s.supplier_id); setOpen(true); };
  const save = () => {
    if (!form.name || !validRut(form.rut)) return;
    const item = { ...form, rut: formatRut(form.rut) };
    dispatch({ type: "UPSERT", coll: "suppliers", item, key: "supplier_id" });
    dispatch({ type: "LOG", msg: `${edit ? "actualizó" : "creó"} el proveedor ${item.name}${item.compliance ? " · compliance ✓" : ""}${item.risk_matrix ? " · en matriz de riesgo" : ""}` });
    setOpen(false);
  };
  const remove = (s) => { dispatch({ type: "DELETE", coll: "suppliers", id: s.supplier_id, key: "supplier_id" }); dispatch({ type: "LOG", msg: `eliminó el proveedor ${s.name}` }); };

  const list = suppliers
    .filter((s) => flag === "all" || (flag === "compliance" && s.compliance) || (flag === "noncompliance" && !s.compliance) || (flag === "risk" && s.risk_matrix))
    .filter((s) => [s.name, s.rut, s.email, s.category].join(" ").toLowerCase().includes(q.toLowerCase()));
  const withCompliance = suppliers.filter((s) => s.compliance).length;
  const inRisk = suppliers.filter((s) => s.risk_matrix).length;

  return (
    <div>
      <Toolbar query={q} setQuery={setQ} placeholder="Buscar por nombre, RUT o categoría…" onAdd={openNew} addLabel="Nuevo proveedor"
        onExport={() => exportCSV("proveedores_consa.csv", list.map((s) => ({ nombre: s.name, rut: s.rut, categoria: s.category, email: s.email, telefono: s.phone, compliance: s.compliance ? "Sí" : "No", matriz_riesgo: s.risk_matrix ? "Sí" : "No", boleta_honorarios: s.honorarios ? "Sí" : "No", direccion: s.address })))} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <Card className="p-4"><div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Proveedores</div><div className="mt-1 text-xl font-bold" style={{ color: NAVY }}>{suppliers.length}</div></Card>
        <Card className="p-4"><div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Con compliance</div><div className="mt-1 text-xl font-bold" style={{ color: "#047857" }}>{withCompliance}</div></Card>
        <Card className="p-4"><div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">En matriz de riesgo</div><div className="mt-1 text-xl font-bold" style={{ color: "#b45309" }}>{inRisk}</div></Card>
      </div>

      <div className="flex gap-1.5 mb-4 flex-wrap">
        {[["all", "Todos"], ["compliance", "Con compliance"], ["noncompliance", "Sin compliance"], ["risk", "En matriz de riesgo"]].map(([k, label]) => (
          <button key={k} onClick={() => setFlag(k)}
            className={`px-3 h-8 rounded-lg text-xs font-semibold border transition ${flag === k ? "text-white border-transparent" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
            style={flag === k ? { background: NAVY } : {}}>{label}</button>
        ))}
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider">
            <th className="text-left font-semibold px-4 py-3">Proveedor</th>
            <th className="text-left font-semibold px-4 py-3">RUT</th>
            <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Categoría</th>
            <th className="text-left font-semibold px-4 py-3">Compliance</th>
            <th className="text-left font-semibold px-4 py-3">Matriz de riesgo</th>
            <th className="px-4 py-3"></th>
          </tr></thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.supplier_id} className="border-t border-slate-100 hover:bg-slate-50/60 transition">
                <td className="px-4 py-3"><div className="font-semibold text-slate-800">{s.name}</div><div className="text-xs text-slate-400">{s.email}</div></td>
                <td className="px-4 py-3 text-slate-600 tabular-nums">{s.rut}</td>
                <td className="px-4 py-3 hidden md:table-cell"><span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{s.category}</span>{s.honorarios && <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-blue-50 text-blue-700 border-blue-200">Honorarios</span>}</td>
                <td className="px-4 py-3">{s.compliance
                  ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200"><ShieldCheck size={12} /> Sí</span>
                  : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-100 text-slate-500 border-slate-200">No</span>}</td>
                <td className="px-4 py-3">{s.risk_matrix
                  ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200"><AlertTriangle size={12} /> Sí</span>
                  : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-100 text-slate-500 border-slate-200">No</span>}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Edit3 size={15} /></button>
                  <button onClick={() => remove(s)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Sin proveedores en esta vista.</td></tr>}
          </tbody>
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={edit ? "Editar proveedor" : "Nuevo proveedor"} wide>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Field label="Razón social / Nombre"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field></div>
          <Field label="RUT" hint={!rutOk ? "RUT inválido (dígito verificador)" : "Se valida con módulo 11"}>
            <input className={`${inputCls} ${!rutOk ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""}`} value={form.rut} onChange={(e) => setForm({ ...form, rut: e.target.value })} onBlur={(e) => e.target.value && setForm({ ...form, rut: formatRut(e.target.value) })} placeholder="76.800.900-1" />
          </Field>
          <Field label="Categoría"><select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{cats.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Email"><input className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Teléfono"><input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Dirección"><input className={inputCls} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field></div>
          <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className={`flex items-center gap-3 rounded-lg border px-3 py-3 cursor-pointer transition ${form.compliance ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200 hover:bg-slate-50"}`}>
              <input type="checkbox" checked={form.compliance} onChange={(e) => setForm({ ...form, compliance: e.target.checked })} className="w-4 h-4 accent-emerald-600" />
              <div><div className="text-sm font-medium text-slate-800 flex items-center gap-1.5"><ShieldCheck size={15} className="text-emerald-600" /> Tiene compliance</div><div className="text-xs text-slate-400">Cumple due diligence / documentación</div></div>
            </label>
            <label className={`flex items-center gap-3 rounded-lg border px-3 py-3 cursor-pointer transition ${form.risk_matrix ? "border-amber-300 bg-amber-50/50" : "border-slate-200 hover:bg-slate-50"}`}>
              <input type="checkbox" checked={form.risk_matrix} onChange={(e) => setForm({ ...form, risk_matrix: e.target.checked })} className="w-4 h-4 accent-amber-600" />
              <div><div className="text-sm font-medium text-slate-800 flex items-center gap-1.5"><AlertTriangle size={15} className="text-amber-600" /> En matriz de riesgo</div><div className="text-xs text-slate-400">Integrado a la matriz de la empresa</div></div>
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className={`flex items-center gap-3 rounded-lg border px-3 py-3 cursor-pointer transition ${form.honorarios ? "border-blue-300 bg-blue-50/50" : "border-slate-200 hover:bg-slate-50"}`}>
              <input type="checkbox" checked={form.honorarios} onChange={(e) => setForm({ ...form, honorarios: e.target.checked })} className="w-4 h-4 accent-blue-600" />
              <div><div className="text-sm font-medium text-slate-800 flex items-center gap-1.5"><FileText size={15} className="text-blue-600" /> Emite boleta de honorarios</div><div className="text-xs text-slate-400">Exento de IVA - al elegirlo en compras u ordenes, el IVA se desactiva solo</div></div>
            </label>
          </div>
          <div className="sm:col-span-2"><Field label="Notas"><textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#B87333] min-h-[64px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field></div>
        </div>
        <div className="flex justify-end gap-2 mt-6"><BtnGhost onClick={() => setOpen(false)}>Cancelar</BtnGhost><BtnPrimary onClick={save} disabled={!form.name || !validRut(form.rut)}>Guardar proveedor</BtnPrimary></div>
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
  const taxed = form.taxed !== false;
  const tax = taxed ? Math.round(subtotal * 0.19) : 0;
  const total = subtotal + tax;
  const client = clients.find((c) => c.client_id === form.client_id);

  const save = () => {
    if (!form.client_id || !form.items.length) return;
    onSave({ ...form, taxed, client_name: client?.name || "", subtotal, tax_total: tax, total });
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
            <select className={inputCls} value={form.tipo_dte} onChange={(e) => { const t = Number(e.target.value); setForm({ ...form, tipo_dte: t, taxed: t === 34 ? false : form.taxed }); }}>
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
        <div className="w-full sm:w-64 space-y-2 self-end">
          <label className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm transition ${taxed ? "border-slate-200 bg-white" : "border-blue-300 bg-blue-50/50"}`}>
            <span className="flex items-center gap-2 text-slate-700">
              <input type="checkbox" checked={taxed} onChange={(e) => setForm({ ...form, taxed: e.target.checked })} className="w-4 h-4 accent-[#B87333]" />
              Afecto a IVA
            </span>
            {!taxed && <span className="text-xs font-medium text-blue-700">Exento</span>}
          </label>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="tabular-nums">{clp(subtotal)}</span></div>
            <div className="flex justify-between text-slate-600"><span>{taxed ? "IVA 19%" : "IVA (exento)"}</span><span className="tabular-nums">{taxed ? clp(tax) : "—"}</span></div>
            <div className="flex justify-between font-bold pt-1.5 border-t border-slate-200" style={{ color: NAVY }}><span>Total</span><span className="tabular-nums">{clp(total)}</span></div>
          </div>
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
    setInitial({ _new: true, invoice_id: uid("inv"), company_id: state.company.company_id, client_id: "", client_name: "", invoice_number: num, folio: num.split("-")[1], tipo_dte: 33, project_id: "", taxed: true, items: [{ description: "", quantity: 1, price: 0, tax_rate: 19 }], status: "draft", created_at: new Date().toISOString(), due_date: "", notes: "" });
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
                    <button onClick={() => downloadDoc("factura", i)} title="Descargar PDF" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Download size={15} /></button>
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
        <div className="px-6 py-5 bg-white flex justify-between items-start gap-4 border-b-4" style={{ borderColor: CONSA.orange }}>
          <div className="flex items-start gap-3">
            <img src={LOGO_B64} alt="CONSA" className="w-12 shrink-0" />
            <div>
              <div className="font-bold text-sm" style={{ color: CONSA.maroon }}>{CONSA.legal}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{CONSA.address}</div>
              <div className="text-[11px] text-slate-500">{CONSA.city}</div>
              <div className="text-[11px] text-slate-500">{CONSA.email} · {CONSA.web}</div>
            </div>
          </div>
          <div className="text-right shrink-0 rounded-lg px-3 py-2" style={{ background: CONSA.maroon }}>
            <div className="text-[9px] uppercase tracking-widest text-white/80">{DTE_TYPES[inv.tipo_dte]}</div>
            <div className="text-base font-bold text-white">{inv.invoice_number}</div>
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
              <div className="flex justify-between text-slate-600"><span>{inv.taxed === false ? "IVA (exento)" : "IVA 19%"}</span><span className="tabular-nums">{inv.taxed === false ? "—" : clp(inv.tax_total)}</span></div>
              <div className="flex justify-between font-bold text-base pt-2 border-t-2" style={{ borderColor: COPPER, color: NAVY }}><span>Total</span><span className="tabular-nums">{clp(inv.total)}</span></div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <BtnGhost onClick={() => downloadDoc("factura", inv)}><Download size={16} /> Descargar PDF</BtnGhost>
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
    setInitial({ _new: true, quote_id: uid("quote"), company_id: state.company.company_id, client_id: "", client_name: "", quote_number: num, project_id: "", taxed: true, items: [{ description: "", quantity: 1, price: 0, tax_rate: 19 }], status: "draft", valid_until: "", created_at: new Date().toISOString(), notes: "" });
    setOpen(true);
  };
  const save = (item) => { const { _new, ...clean } = item; dispatch({ type: "UPSERT", coll: "quotes", item: clean, key: "quote_id" }); dispatch({ type: "LOG", msg: `${_new ? "creó" : "actualizó"} el presupuesto ${clean.quote_number}` }); setOpen(false); };
  const convert = (qte) => {
    const nums = state.invoices.map((i) => parseInt(i.invoice_number.split("-")[1] || "0", 10)).filter(Boolean);
    const num = `F-${String((Math.max(0, ...nums) + 1)).padStart(6, "0")}`;
    const inv = { invoice_id: uid("inv"), company_id: qte.company_id, client_id: qte.client_id, client_name: qte.client_name, invoice_number: num, folio: num.split("-")[1], tipo_dte: qte.taxed === false ? 34 : 33, taxed: qte.taxed !== false, project_id: qte.project_id || "", items: qte.items, subtotal: qte.subtotal, tax_total: qte.tax_total, total: qte.total, status: "draft", created_at: new Date().toISOString(), due_date: new Date(Date.now() + 30 * 864e5).toISOString(), notes: `Convertido desde ${qte.quote_number}` };
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
                  <button onClick={() => downloadDoc("presupuesto", x)} title="Descargar PDF" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Download size={15} /></button>
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
function POEditor({ open, onClose, onSave, initial, projects = [], suppliers = [] }) {
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  if (!open) return null;
  const setItem = (idx, patch) => setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }));
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { description: "", quantity: 1, price: 0, tax_rate: 19 }] }));
  const delItem = (idx) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const subtotal = form.items.reduce((s, i) => s + i.quantity * i.price, 0);
  const taxed = form.taxed !== false;
  const tax = taxed ? Math.round(subtotal * 0.19) : 0;
  const total = subtotal + tax;
  const rutOk = !form.supplier_rut || validRut(form.supplier_rut);
  const save = () => { if (!form.supplier_name || !form.items.length) return; onSave({ ...form, taxed, subtotal, tax_total: tax, total, supplier_rut: form.supplier_rut ? formatRut(form.supplier_rut) : "" }); };

  return (
    <Modal open={open} onClose={onClose} wide title={form._new ? "Nueva orden de compra" : "Editar orden de compra"}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-3"><Field label="Proveedor del registro (opcional)">
          <select className={inputCls} value={form.supplier_id || ""} onChange={(e) => {
            const s = suppliers.find((x) => x.supplier_id === e.target.value);
            setForm((f) => ({ ...f, supplier_id: e.target.value, ...(s ? { supplier_name: s.name, supplier_rut: s.rut, supplier_email: s.email || "", supplier_address: s.address || "", taxed: !s.honorarios } : {}) }));
          }}>
            <option value="">— Ingreso manual —</option>
            {suppliers.map((s) => <option key={s.supplier_id} value={s.supplier_id}>{s.name}{s.compliance ? " · compliance ✓" : ""}{s.risk_matrix ? " · riesgo" : ""}</option>)}
          </select>
        </Field></div>
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
        <div className="w-full sm:w-64 space-y-2 self-end">
          <label className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm transition ${taxed ? "border-slate-200 bg-white" : "border-blue-300 bg-blue-50/50"}`}>
            <span className="flex items-center gap-2 text-slate-700">
              <input type="checkbox" checked={taxed} onChange={(e) => setForm({ ...form, taxed: e.target.checked })} className="w-4 h-4 accent-[#B87333]" />
              Afecto a IVA
            </span>
            {!taxed && <span className="text-xs font-medium text-blue-700">Exento</span>}
          </label>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="tabular-nums">{clp(subtotal)}</span></div>
            <div className="flex justify-between text-slate-600"><span>{taxed ? "IVA 19%" : "IVA (exento)"}</span><span className="tabular-nums">{taxed ? clp(tax) : "—"}</span></div>
            <div className="flex justify-between font-bold pt-1.5 border-t border-slate-200" style={{ color: NAVY }}><span>Total</span><span className="tabular-nums">{clp(total)}</span></div>
          </div>
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
        <div className="px-6 py-5 bg-white flex justify-between items-start gap-4 border-b-4" style={{ borderColor: CONSA.orange }}>
          <div className="flex items-start gap-3">
            <img src={LOGO_B64} alt="CONSA" className="w-12 shrink-0" />
            <div>
              <div className="font-bold text-sm" style={{ color: CONSA.maroon }}>{CONSA.legal}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{CONSA.address}</div>
              <div className="text-[11px] text-slate-500">{CONSA.city}</div>
              <div className="text-[11px] text-slate-500">{CONSA.email} · {CONSA.web}</div>
            </div>
          </div>
          <div className="text-right shrink-0 rounded-lg px-3 py-2" style={{ background: CONSA.maroon }}>
            <div className="text-[9px] uppercase tracking-widest text-white/80">Orden de Compra</div>
            <div className="text-base font-bold text-white">{po.po_number}</div>
          </div>
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
            <div className="flex justify-between text-slate-600"><span>{po.taxed === false ? "IVA (exento)" : "IVA 19%"}</span><span className="tabular-nums">{po.taxed === false ? "—" : clp(po.tax_total)}</span></div>
            <div className="flex justify-between font-bold text-base pt-2 border-t-2" style={{ borderColor: COPPER, color: NAVY }}><span>Total</span><span className="tabular-nums">{clp(po.total)}</span></div>
          </div></div>
          {po.notes && <div className="mt-4 text-xs text-slate-500 border-t border-slate-100 pt-3">{po.notes}</div>}
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5"><BtnGhost onClick={() => downloadDoc("orden", po)}><Download size={16} /> Descargar PDF</BtnGhost><BtnPrimary onClick={onClose}>Cerrar</BtnPrimary></div>
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
    setInitial({ _new: true, po_id: uid("po"), company_id: state.company.company_id, supplier_id: "", supplier_name: "", supplier_rut: "", supplier_email: "", supplier_address: "", po_number: nextNumber(), project_id: "", taxed: true, items: [{ description: "", quantity: 1, price: 0, tax_rate: 19 }], status: "draft", delivery_date: "", created_at: new Date().toISOString(), notes: "" });
    setOpen(true);
  };
  const openEdit = (po) => { setInitial({ ...po, _new: false }); setOpen(true); };
  const save = (item) => { const { _new, ...clean } = item; dispatch({ type: "UPSERT", coll: "purchaseOrders", item: clean, key: "po_id" }); dispatch({ type: "LOG", msg: `${_new ? "creó" : "actualizó"} la orden de compra ${clean.po_number}` }); setOpen(false); };
  const setStatus = (po, status) => { dispatch({ type: "UPSERT", coll: "purchaseOrders", item: { ...po, status }, key: "po_id" }); dispatch({ type: "LOG", msg: `cambió la OC ${po.po_number} a ${PO_STATUS[status].label}` }); };
  const receive = (po) => {
    // Al recibir, registra automáticamente la compra con IVA crédito
    dispatch({ type: "UPSERT", coll: "purchaseOrders", item: { ...po, status: "received" }, key: "po_id" });
    const purchase = { purchase_id: uid("purchase"), company_id: po.company_id, supplier_name: po.supplier_name, supplier_rut: po.supplier_rut, doc_type: po.taxed === false ? "Boleta de honorarios" : "Factura", category: "Inventario", taxed: po.taxed !== false, net_amount: po.subtotal, tax_amount: po.tax_total, total: po.total, date: new Date().toISOString(), po_ref: po.po_number, project_id: po.project_id || "" };
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
        onExport={() => exportCSV("ordenes_compra_consa.csv", list.map((o) => ({ numero: o.po_number, proveedor: o.supplier_name, rut: o.supplier_rut, afecto_iva: o.taxed === false ? "No" : "Sí", neto: o.subtotal, iva: o.tax_total, total: o.total, estado: PO_STATUS[o.status].label, entrega: shortDate(o.delivery_date) })))} />
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
                  <button onClick={() => downloadDoc("orden", o)} title="Descargar PDF" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Download size={15} /></button>
                  <button onClick={() => openEdit(o)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Edit3 size={15} /></button>
                  <button onClick={() => remove(o)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Sin órdenes de compra en esta vista.</td></tr>}
          </tbody>
        </table>
      </Card>
      {initial && <POEditor open={open} onClose={() => setOpen(false)} onSave={save} initial={initial} projects={state.projects} suppliers={state.suppliers} />}
      <POPreview po={preview} company={state.company} onClose={() => setPreview(null)} />
    </div>
  );
}

/* ============================ Purchases ============================ */
function Purchases({ state, dispatch }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const blank = { purchase_id: "", company_id: state.company.company_id, supplier_id: "", supplier_name: "", supplier_rut: "", doc_type: "Factura", category: "Inventario", project_id: "", taxed: true, retention_applies: false, retention_rate: retentionRateFor(todayISO()), net_amount: 0, tax_amount: 0, total: 0, date: todayISO() };
  const [form, setForm] = useState(blank);
  const net = Number(form.net_amount) || 0; const iva = form.taxed ? Math.round(net * 0.19) : 0;
  const isHonorarios = form.doc_type === "Boleta de honorarios";
  const retRate = Number(form.retention_rate) || 0;
  const retencion = form.retention_applies ? Math.round(net * retRate / 100) : 0;
  const liquido = net + iva - retencion;
  const openNew = () => { setForm({ ...blank, purchase_id: uid("purchase") }); setOpen(true); };
  const save = () => {
    if (!form.supplier_name || !net) return;
    const item = { ...form, net_amount: net, tax_amount: iva, retention_rate: retRate, retention_amount: retencion, net_payable: liquido, total: net + iva, date: new Date(form.date).toISOString(), supplier_rut: form.supplier_rut ? formatRut(form.supplier_rut) : "" };
    dispatch({ type: "UPSERT", coll: "purchases", item, key: "purchase_id" });
    dispatch({ type: "LOG", msg: `registró compra a ${item.supplier_name}${item.taxed ? "" : " (exenta de IVA)"}` });
    setOpen(false);
  };
  const remove = (p) => dispatch({ type: "DELETE", coll: "purchases", id: p.purchase_id, key: "purchase_id" });
  const list = state.purchases.filter((p) => [p.supplier_name, p.category].join(" ").toLowerCase().includes(q.toLowerCase()));
  // Retenciones del mes en curso
  const nowM = new Date().toISOString().slice(0, 7);
  const retMes = state.purchases.filter((p) => (p.retention_amount || 0) > 0 && new Date(p.date).toISOString().slice(0, 7) === nowM);
  const retMesTotal = retMes.reduce((s, p) => s + (p.retention_amount || 0), 0);
  const retMesBruto = retMes.reduce((s, p) => s + (p.net_amount || 0), 0);
  const mesLabel = new Date().toLocaleDateString("es-CL", { month: "long", year: "numeric" });

  return (
    <div>
      {retMes.length > 0 && (
        <Card className="p-4 mb-5 border-violet-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#7c3aed" }}>Retenciones del mes · {mesLabel}</div>
              <div className="text-sm text-slate-500 mt-0.5">{retMes.length} boleta{retMes.length !== 1 ? "s" : ""} de honorarios · bruto {clp(retMesBruto)}</div>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-right"><div className="text-[11px] text-slate-400 uppercase tracking-wide">A enterar al SII</div>
                <div className="text-xl font-bold tabular-nums" style={{ color: "#7c3aed" }}>{clp(retMesTotal)}</div></div>
              <BtnGhost onClick={() => exportCSV(`retenciones_${nowM}_consa.csv`, retMes.map((p) => ({ fecha: shortDate(p.date), proveedor: p.supplier_name, rut: p.supplier_rut, bruto: p.net_amount, tasa: p.retention_rate + "%", retencion: p.retention_amount, liquido_pagado: p.net_payable })))}>
                <Download size={16} /> Detalle
              </BtnGhost>
            </div>
          </div>
        </Card>
      )}
      <Toolbar query={q} setQuery={setQ} placeholder="Buscar por proveedor…" onAdd={openNew} addLabel="Nueva compra"
        onExport={() => exportCSV("compras_consa.csv", list.map((p) => ({ proveedor: p.supplier_name, rut: p.supplier_rut, tipo: p.doc_type, categoria: p.category, afecto_iva: p.taxed === false ? "No" : "Sí", neto: p.net_amount, iva: p.tax_amount, total: p.total, tasa_retencion: p.retention_amount ? p.retention_rate + "%" : "", retencion: p.retention_amount || 0, liquido_a_pagar: p.net_payable != null ? p.net_payable : p.total, fecha: shortDate(p.date) })))} />
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
                <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell">{p.taxed === false || !p.tax_amount ? <span className="text-xs font-medium text-blue-700">Exento</span> : <span className="text-slate-500">{clp(p.tax_amount)}</span>}</td>
                <td className="px-4 py-3 text-right"><div className="font-semibold tabular-nums" style={{ color: NAVY }}>{clp(p.total)}</div>
                  {p.retention_amount > 0 && <div className="text-[11px]" style={{ color: "#7c3aed" }}>Líquido {clp(p.net_payable)}</div>}</td>
                <td className="px-4 py-3 text-right"><button onClick={() => remove(p)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={15} /></button></td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Sin compras registradas.</td></tr>}
          </tbody>
        </table>
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="Nueva compra">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Field label="Proveedor del registro (opcional)">
            <select className={inputCls} value={form.supplier_id || ""} onChange={(e) => {
              const s = (state.suppliers || []).find((x) => x.supplier_id === e.target.value);
              setForm((f) => ({ ...f, supplier_id: e.target.value, ...(s ? { supplier_name: s.name, supplier_rut: s.rut, taxed: !s.honorarios, doc_type: s.honorarios ? "Boleta de honorarios" : f.doc_type, retention_applies: s.honorarios ? true : f.retention_applies, retention_rate: s.honorarios ? retentionRateFor(f.date) : f.retention_rate } : {}) }));
            }}>
              <option value="">— Ingreso manual —</option>
              {(state.suppliers || []).map((s) => <option key={s.supplier_id} value={s.supplier_id}>{s.name}{s.compliance ? " · compliance ✓" : ""}{s.risk_matrix ? " · riesgo" : ""}</option>)}
            </select>
          </Field></div>
          <div className="sm:col-span-2"><Field label="Proveedor"><input className={inputCls} value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} autoFocus /></Field></div>
          <Field label="RUT proveedor"><input className={inputCls} value={form.supplier_rut} onChange={(e) => setForm({ ...form, supplier_rut: e.target.value })} placeholder="76.800.900-1" /></Field>
          <Field label="Tipo documento"><select className={inputCls} value={form.doc_type} onChange={(e) => { const t = e.target.value; const h = t === "Boleta de honorarios"; setForm({ ...form, doc_type: t, taxed: h ? false : form.taxed, retention_applies: h ? true : false, retention_rate: h ? retentionRateFor(form.date) : form.retention_rate }); }}>{["Factura", "Boleta", "Boleta de honorarios", "Nota de Crédito"].map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Categoría"><select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{["General", "Inventario", "Servicios", "Activos Fijos", "Otros"].map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Fecha"><input type="date" className={inputCls} value={form.date?.slice(0, 10)} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Proyecto / Mina">
            <select className={inputCls} value={form.project_id || ""} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
              <option value="">— Sin proyecto —</option>
              {(state.projects || []).map((p) => <option key={p.project_id} value={p.project_id}>{p.name} · {p.code}</option>)}
            </select>
          </Field></div>
          <Field label="Monto neto"><input type="number" className={inputCls} value={form.net_amount} onChange={(e) => setForm({ ...form, net_amount: e.target.value })} /></Field>
          <div className="sm:col-span-2">
            <label className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition ${form.taxed ? "border-slate-200 bg-slate-50" : "border-blue-300 bg-blue-50/50"}`}>
              <span className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.taxed} onChange={(e) => setForm({ ...form, taxed: e.target.checked })} className="w-4 h-4 accent-[#B87333]" />
                Afecto a IVA (19%)
                {!form.taxed && <span className="text-xs font-medium text-blue-700">· Exento (boleta de honorarios u otro)</span>}
              </span>
              <span className="font-semibold tabular-nums shrink-0" style={{ color: form.taxed ? NAVY : "#1d4ed8" }}>{form.taxed ? clp(iva) : "Exento"}</span>
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition ${form.retention_applies ? "border-violet-300 bg-violet-50/50" : "border-slate-200 hover:bg-slate-50"}`}>
              <span className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.retention_applies} onChange={(e) => setForm({ ...form, retention_applies: e.target.checked, retention_rate: e.target.checked ? retentionRateFor(form.date) : form.retention_rate })} className="w-4 h-4 accent-violet-600" />
                Aplicar retención de honorarios
              </span>
              {form.retention_applies && (
                <span className="flex items-center gap-2 shrink-0" onClick={(e) => e.preventDefault()}>
                  <input type="number" step="0.25" value={form.retention_rate} onChange={(e) => setForm({ ...form, retention_rate: e.target.value })}
                    className="w-20 h-8 rounded-md border border-slate-300 px-2 text-sm text-right outline-none focus:border-violet-500" />
                  <span className="text-sm text-slate-500">%</span>
                </span>
              )}
            </label>
            {form.retention_applies && (
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm space-y-1">
                <div className="flex justify-between text-slate-600"><span>Honorario bruto</span><span className="tabular-nums">{clp(net)}</span></div>
                {form.taxed && <div className="flex justify-between text-slate-600"><span>IVA 19%</span><span className="tabular-nums">{clp(iva)}</span></div>}
                <div className="flex justify-between text-slate-600"><span>(−) Retención {retRate}%</span><span className="tabular-nums" style={{ color: "#7c3aed" }}>{clp(retencion)}</span></div>
                <div className="flex justify-between font-bold pt-1.5 border-t border-slate-200" style={{ color: NAVY }}><span>Líquido a pagar</span><span className="tabular-nums">{clp(liquido)}</span></div>
                <div className="text-[11px] text-slate-400 pt-1">La retención se entera al SII; el gasto sigue siendo el bruto.</div>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center mt-5">
          <div className="text-sm text-slate-500">Total: <span className="font-bold text-base" style={{ color: NAVY }}>{clp(net + iva)}</span>
            {form.retention_applies && retencion > 0 && <span className="ml-3">Líquido: <span className="font-bold" style={{ color: "#7c3aed" }}>{clp(liquido)}</span></span>}</div>
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
/* ---------- Capitalización de deuda ---------- */
function CapitalizeModal({ open, onClose, onSave, debt }) {
  const blank = {
    cap_id: "", date: todayISO(), mechanism: "Acciones serie D", mechanism_other: "",
    amount: 0, counterparty: "", share_series: "D", share_count: 0, share_price: 0,
    reason: "", details: "", deducts_annual: false, documents: [],
  };
  const [f, setF] = useState(blank);
  useEffect(() => { if (open && debt) setF({ ...blank, cap_id: uid("cap"), counterparty: debt.creditor || "", amount: debtBalance(debt) }); }, [open, debt]);
  if (!open || !debt) return null;

  const saldo = debtBalance(debt);
  const amount = Number(f.amount) || 0;
  const isShares = f.mechanism === "Acciones serie D";
  const sharesValue = (Number(f.share_count) || 0) * (Number(f.share_price) || 0);
  const sharesMismatch = isShares && Number(f.share_count) > 0 && Number(f.share_price) > 0 && Math.abs(sharesValue - amount) > 1;
  const overBalance = amount > saldo;
  const valid = amount > 0 && !overBalance && f.reason.trim() && (f.mechanism !== "Otro" || f.mechanism_other.trim());

  const addDoc = () => setF((x) => ({ ...x, documents: [...x.documents, { doc_id: uid("doc"), type: "Escritura pública", number: "", date: "", issuer: "", url: "" }] }));
  const setDoc = (i, patch) => setF((x) => ({ ...x, documents: x.documents.map((d, j) => (j === i ? { ...d, ...patch } : d)) }));
  const delDoc = (i) => setF((x) => ({ ...x, documents: x.documents.filter((_, j) => j !== i) }));
  const useSharesValue = () => setF((x) => ({ ...x, amount: sharesValue }));

  return (
    <Modal open={open} onClose={onClose} wide title="Capitalizar deuda">
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 mb-5">
        <div className="font-semibold text-slate-800">{debt.description}</div>
        <div className="text-xs text-slate-500 mt-0.5">{debt.creditor} · Año {debt.year}</div>
        <div className="flex gap-5 mt-2 text-sm">
          <div><span className="text-slate-500">Monto original: </span><span className="font-semibold tabular-nums" style={{ color: NAVY }}>{clp(debt.amount)}</span></div>
          <div><span className="text-slate-500">Ya capitalizado: </span><span className="font-semibold tabular-nums" style={{ color: "#7c3aed" }}>{clp(capTotal(debt))}</span></div>
          <div><span className="text-slate-500">Saldo: </span><span className="font-semibold tabular-nums" style={{ color: "#b45309" }}>{clp(saldo)}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Fecha de capitalización"><input type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Mecanismo">
          <select className={inputCls} value={f.mechanism} onChange={(e) => setF({ ...f, mechanism: e.target.value })}>
            {CAP_MECHANISMS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Field>
        {f.mechanism === "Otro" && (
          <div className="sm:col-span-2"><Field label="Especificar mecanismo"><input className={inputCls} value={f.mechanism_other} onChange={(e) => setF({ ...f, mechanism_other: e.target.value })} placeholder="Describe el mecanismo utilizado" /></Field></div>
        )}
        <Field label="Monto a capitalizar" hint={overBalance ? `No puede exceder el saldo de ${clp(saldo)}` : `Saldo disponible: ${clp(saldo)}`}>
          <input type="number" className={`${inputCls} ${overBalance ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""}`} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        </Field>
        <Field label="Contraparte / beneficiario"><input className={inputCls} value={f.counterparty} onChange={(e) => setF({ ...f, counterparty: e.target.value })} placeholder="Quién recibe las acciones o el pago" /></Field>
      </div>

      {isShares && (
        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: COPPER }}>Detalle de la emisión</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Serie"><input className={inputCls} value={f.share_series} onChange={(e) => setF({ ...f, share_series: e.target.value })} placeholder="D" /></Field>
            <Field label="N° de acciones"><input type="number" className={inputCls} value={f.share_count} onChange={(e) => setF({ ...f, share_count: e.target.value })} /></Field>
            <Field label="Precio por acción"><input type="number" className={inputCls} value={f.share_price} onChange={(e) => setF({ ...f, share_price: e.target.value })} /></Field>
          </div>
          {sharesValue > 0 && (
            <div className={`mt-3 flex items-center justify-between rounded-lg px-3 py-2 text-sm ${sharesMismatch ? "bg-amber-50 border border-amber-200" : "bg-slate-50"}`}>
              <span className="text-slate-600">Valor de la emisión: <span className="font-semibold tabular-nums" style={{ color: NAVY }}>{clp(sharesValue)}</span>
                {sharesMismatch && <span className="text-amber-700"> · no coincide con el monto capitalizado</span>}</span>
              {sharesMismatch && <button onClick={useSharesValue} className="text-xs font-semibold" style={{ color: COPPER }}>Usar este monto</button>}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 mt-4">
        <Field label="Motivo de la capitalización"><input className={inputCls} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Ej: acuerdo de junta extraordinaria para fortalecer patrimonio" /></Field>
        <Field label="Detalles y observaciones"><textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#B87333] min-h-[80px]" value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} placeholder="Condiciones acordadas, antecedentes, participantes…" /></Field>
      </div>

      {/* Tratamiento contable */}
      <div className="mt-4 rounded-xl border border-slate-200 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COPPER }}>Tratamiento en la rentabilidad anual</div>
        <div className="space-y-2">
          <label className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition ${!f.deducts_annual ? "border-[#B87333] bg-[#FFF0E0]/40" : "border-slate-200 hover:bg-slate-50"}`}>
            <input type="radio" checked={!f.deducts_annual} onChange={() => setF({ ...f, deducts_annual: false })} className="w-4 h-4 mt-0.5 accent-[#B87333]" />
            <div><div className="text-sm font-medium text-slate-800">Deja de descontar (pasa a patrimonio)</div><div className="text-xs text-slate-400">El monto capitalizado ya no reduce el resultado anual</div></div>
          </label>
          <label className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition ${f.deducts_annual ? "border-[#B87333] bg-[#FFF0E0]/40" : "border-slate-200 hover:bg-slate-50"}`}>
            <input type="radio" checked={f.deducts_annual} onChange={() => setF({ ...f, deducts_annual: true })} className="w-4 h-4 mt-0.5 accent-[#B87333]" />
            <div><div className="text-sm font-medium text-slate-800">Sigue descontando</div><div className="text-xs text-slate-400">Se mantiene como carga en el resultado del año</div></div>
          </label>
        </div>
      </div>

      {/* Documentos de respaldo */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Documentos de respaldo</span>
          <button onClick={addDoc} className="text-xs font-semibold inline-flex items-center gap-1" style={{ color: COPPER }}><Plus size={13} /> Agregar documento</button>
        </div>
        {f.documents.length === 0 && <div className="text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg py-4 text-center">Sin documentos registrados.</div>}
        {f.documents.map((d, i) => (
          <div key={d.doc_id} className="rounded-lg border border-slate-200 p-3 mb-2">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <select className={inputCls} value={d.type} onChange={(e) => setDoc(i, { type: e.target.value })}>{CAP_DOC_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
              <input className={inputCls} value={d.number} onChange={(e) => setDoc(i, { number: e.target.value })} placeholder="N° / repertorio" />
              <input type="date" className={inputCls} value={d.date} onChange={(e) => setDoc(i, { date: e.target.value })} />
              <input className={inputCls} value={d.issuer} onChange={(e) => setDoc(i, { issuer: e.target.value })} placeholder="Emisor / notaría" />
            </div>
            <div className="flex gap-2 mt-2">
              <input className={inputCls} value={d.url} onChange={(e) => setDoc(i, { url: e.target.value })} placeholder="Enlace al documento (opcional)" />
              <button onClick={() => delDoc(i)} className="p-2 rounded-lg hover:bg-red-50 text-red-400 shrink-0"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
        <div className="text-sm text-slate-500">Saldo tras capitalizar: <span className="font-bold" style={{ color: NAVY }}>{clp(Math.max(0, saldo - amount))}</span></div>
        <div className="flex gap-2"><BtnGhost onClick={onClose}>Cancelar</BtnGhost>
          <BtnPrimary onClick={() => onSave({ ...f, amount, share_count: Number(f.share_count) || 0, share_price: Number(f.share_price) || 0, created_at: new Date().toISOString() })} disabled={!valid}>Registrar capitalización</BtnPrimary></div>
      </div>
    </Modal>
  );
}

function CapHistoryModal({ debt, onClose, onDelete }) {
  if (!debt) return null;
  const caps = debt.capitalizations || [];
  return (
    <Modal open={!!debt} onClose={onClose} wide title="Historial de capitalizaciones">
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 mb-4">
        <div className="font-semibold text-slate-800">{debt.description}</div>
        <div className="flex flex-wrap gap-5 mt-2 text-sm">
          <div><span className="text-slate-500">Original: </span><span className="font-semibold tabular-nums">{clp(debt.amount)}</span></div>
          <div><span className="text-slate-500">Capitalizado: </span><span className="font-semibold tabular-nums" style={{ color: "#7c3aed" }}>{clp(capTotal(debt))}</span></div>
          <div><span className="text-slate-500">A patrimonio: </span><span className="font-semibold tabular-nums" style={{ color: "#047857" }}>{clp(capToEquity(debt))}</span></div>
          <div><span className="text-slate-500">Saldo: </span><span className="font-semibold tabular-nums" style={{ color: "#b45309" }}>{clp(debtBalance(debt))}</span></div>
        </div>
      </div>
      {!caps.length && <div className="text-center text-slate-400 py-8">Esta deuda aún no tiene capitalizaciones.</div>}
      <div className="space-y-3">
        {caps.map((c) => (
          <div key={c.cap_id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold tabular-nums" style={{ color: NAVY }}>{clp(c.amount)}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-violet-50 text-violet-700 border-violet-200">{c.mechanism === "Otro" ? c.mechanism_other : c.mechanism}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.deducts_annual ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                    {c.deducts_annual ? "Sigue descontando" : "A patrimonio"}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">{shortDate(c.date)}{c.counterparty ? ` · ${c.counterparty}` : ""}</div>
              </div>
              <button onClick={() => onDelete(c)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 shrink-0"><Trash2 size={15} /></button>
            </div>
            {(c.share_count > 0) && (
              <div className="mt-2 text-sm text-slate-600">Emisión: <span className="font-medium">{c.share_count.toLocaleString("es-CL")} acciones serie {c.share_series}</span> a {clp(c.share_price)} c/u</div>
            )}
            {c.reason && <div className="mt-2 text-sm"><span className="text-slate-400 text-xs uppercase tracking-wide">Motivo · </span><span className="text-slate-700">{c.reason}</span></div>}
            {c.details && <div className="mt-1 text-sm text-slate-600">{c.details}</div>}
            {(c.documents || []).length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1.5">Documentos de respaldo</div>
                {c.documents.map((d) => (
                  <div key={d.doc_id} className="text-sm text-slate-600 flex items-center gap-2 py-0.5">
                    <FileText size={13} className="text-slate-400 shrink-0" />
                    <span>{d.type}{d.number ? ` N° ${d.number}` : ""}{d.issuer ? ` · ${d.issuer}` : ""}{d.date ? ` · ${shortDate(d.date)}` : ""}</span>
                    {d.url && <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold" style={{ color: COPPER }}>Ver</a>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-5"><BtnPrimary onClick={onClose}>Cerrar</BtnPrimary></div>
    </Modal>
  );
}

function CarryDebt({ state, dispatch }) {
  const [q, setQ] = useState("");
  const [yearF, setYearF] = useState("all");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const debts = state.carryDebt || [];
  const curYear = new Date().getFullYear();
  const blank = { debt_id: "", company_id: state.company.company_id, year: curYear, description: "", creditor: "", amount: 0, date: todayISO(), status: "pending", notes: "" };
  const [form, setForm] = useState(blank);
  const [capTarget, setCapTarget] = useState(null);
  const [histTarget, setHistTarget] = useState(null);

  const saveCap = (cap) => {
    const d = capTarget;
    const updated = { ...d, capitalizations: [...(d.capitalizations || []), cap] };
    dispatch({ type: "UPSERT", coll: "carryDebt", item: updated, key: "debt_id" });
    dispatch({ type: "LOG", msg: `capitalizó ${clp(cap.amount)} de la deuda "${d.description}" vía ${cap.mechanism === "Otro" ? cap.mechanism_other : cap.mechanism}${cap.deducts_annual ? "" : " (a patrimonio)"}` });
    setCapTarget(null);
  };
  const deleteCap = (cap) => {
    const d = histTarget;
    const updated = { ...d, capitalizations: (d.capitalizations || []).filter((c) => c.cap_id !== cap.cap_id) };
    dispatch({ type: "UPSERT", coll: "carryDebt", item: updated, key: "debt_id" });
    dispatch({ type: "LOG", msg: `revirtió una capitalización de ${clp(cap.amount)} en "${d.description}"` });
    setHistTarget(updated);
  };

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
  const capitalizado = list.reduce((s, d) => s + capTotal(d), 0);
  const pendiente = list.filter((d) => d.status !== "paid").reduce((s, d) => s + debtBalance(d), 0);
  const aPatrimonio = list.reduce((s, d) => s + capToEquity(d), 0);

  return (
    <div>
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 mb-5">
        <Scale size={18} className="text-slate-500 mt-0.5 shrink-0" />
        <p className="text-sm text-slate-600">Pasivo de consolidación <span className="font-semibold">anual</span>. No afecta la rentabilidad mensual; su efecto se refleja en el resultado del año. En Informes puedes activar <span className="font-medium">"Incluir deuda de arrastre"</span> para verlo en el consolidado.</p>
      </div>
      <Toolbar query={q} setQuery={setQ} placeholder="Buscar por descripción, acreedor o año…" onAdd={openNew} addLabel="Nueva deuda"
        onExport={() => exportCSV("deuda_arrastre_consa.csv", list.map((d) => ({ anio: d.year, descripcion: d.description, acreedor: d.creditor, monto: d.amount, capitalizado: capTotal(d), capitalizado_a_patrimonio: capToEquity(d), saldo: debtBalance(d), monto_que_descuenta: debtEffective(d), estado: CARRY_STATUS[debtStatus(d)].label, mecanismos: (d.capitalizations || []).map((c) => c.mechanism === "Otro" ? c.mechanism_other : c.mechanism).join(" | "), fecha: d.date ? shortDate(d.date) : "" })))} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <Card className="p-4"><div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total registrado</div><div className="mt-1 text-xl font-bold tabular-nums" style={{ color: NAVY }}>{clp(total)}</div></Card>
        <Card className="p-4"><div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Capitalizado</div><div className="mt-1 text-xl font-bold tabular-nums" style={{ color: "#7c3aed" }}>{clp(capitalizado)}</div><div className="text-[11px] text-slate-400 mt-0.5">{clp(aPatrimonio)} a patrimonio</div></Card>
        <Card className="p-4"><div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Saldo pendiente</div><div className="mt-1 text-xl font-bold tabular-nums" style={{ color: "#b45309" }}>{clp(pendiente)}</div></Card>
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
            <th className="text-left font-semibold px-4 py-3 hidden lg:table-cell">Acreedor</th>
            <th className="text-left font-semibold px-4 py-3">Estado</th>
            <th className="text-right font-semibold px-4 py-3">Monto</th>
            <th className="text-right font-semibold px-4 py-3 hidden md:table-cell">Capitalizado</th>
            <th className="text-right font-semibold px-4 py-3">Saldo</th>
            <th className="px-4 py-3"></th>
          </tr></thead>
          <tbody>
            {list.map((d) => {
              const ct = capTotal(d), bal = debtBalance(d), st = debtStatus(d);
              return (
                <tr key={d.debt_id} className="border-t border-slate-100 hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3 font-bold" style={{ color: COPPER }}>{d.year}</td>
                  <td className="px-4 py-3"><div className="font-semibold text-slate-800">{d.description}</div>{d.notes && <div className="text-xs text-slate-400">{d.notes}</div>}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-slate-600">{d.creditor}</td>
                  <td className="px-4 py-3"><Badge map={CARRY_STATUS} value={st} /></td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">{clp(d.amount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums hidden md:table-cell">
                    {ct > 0 ? (
                      <button onClick={() => setHistTarget(d)} className="font-semibold hover:underline" style={{ color: "#7c3aed" }}>{clp(ct)}</button>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums" style={{ color: bal > 0 ? NAVY : "#047857" }}>{clp(bal)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {bal > 0 && d.status !== "paid" && (
                      <button onClick={() => setCapTarget(d)} title="Capitalizar deuda"
                        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-semibold border border-violet-300 text-violet-700 hover:bg-violet-50 mr-1"><Landmark size={13} /> Capitalizar</button>
                    )}
                    {ct > 0 && <button onClick={() => setHistTarget(d)} title="Ver historial" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><History size={15} /></button>}
                    <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Edit3 size={15} /></button>
                    <button onClick={() => remove(d)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={15} /></button>
                  </td>
                </tr>
              );
            })}
            {!list.length && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Sin deuda de arrastre registrada.</td></tr>}
          </tbody>
          {list.length > 0 && <tfoot><tr className="border-t-2 border-slate-200">
            <td colSpan={4} className="px-4 py-3 font-semibold text-slate-500">Total {yearF !== "all" ? yearF : ""}</td>
            <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-600">{clp(total)}</td>
            <td className="px-4 py-3 text-right font-bold tabular-nums hidden md:table-cell" style={{ color: "#7c3aed" }}>{clp(capitalizado)}</td>
            <td className="px-4 py-3 text-right font-bold tabular-nums" style={{ color: NAVY }}>{clp(list.reduce((s, d) => s + debtBalance(d), 0))}</td>
            <td></td>
          </tr></tfoot>}
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={edit ? "Editar deuda de arrastre" : "Nueva deuda de arrastre"}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Año de consolidación"><input type="number" className={inputCls} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder={String(curYear)} /></Field>
          <Field label="Estado" hint="Los estados de capitalización se calculan solos"><select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="pending">Pendiente</option><option value="paid">Pagada</option></select></Field>
          <div className="sm:col-span-2"><Field label="Descripción"><input className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} autoFocus /></Field></div>
          <Field label="Acreedor"><input className={inputCls} value={form.creditor} onChange={(e) => setForm({ ...form, creditor: e.target.value })} placeholder="Banco, proveedor, socio…" /></Field>
          <Field label="Monto"><input type="number" className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          <Field label="Fecha origen (opcional)"><input type="date" className={inputCls} value={form.date?.slice(0, 10) || ""} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Notas"><textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#B87333] min-h-[64px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field></div>
        </div>
        <div className="flex justify-end gap-2 mt-6"><BtnGhost onClick={() => setOpen(false)}>Cancelar</BtnGhost><BtnPrimary onClick={save} disabled={!form.description || !form.amount}>Guardar</BtnPrimary></div>
      </Modal>
      <CapitalizeModal open={!!capTarget} debt={capTarget} onClose={() => setCapTarget(null)} onSave={saveCap} />
      <CapHistoryModal debt={histTarget} onClose={() => setHistTarget(null)} onDelete={deleteCap} />
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
  const retPur = pur.filter((p) => (p.retention_amount || 0) > 0);
  const retencionesPeriodo = retPur.reduce((s, p) => s + (p.retention_amount || 0), 0);
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
  const carryDebtsInPeriod = (state.carryDebt || []).filter((d) => coveredYears.includes(d.year));
  const carryForPeriod = carryDebtsInPeriod.reduce((s, d) => s + debtEffective(d), 0);
  const carryCapitalized = carryDebtsInPeriod.reduce((s, d) => s + capToEquity(d), 0);
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
        if (includeCarry) rows.push({ mes: `Deuda de arrastre neta (${coveredYears.join("/")})`, ingresos: "", gastos: "", compras: "", resultado_neto: -carryForPeriod, iva_debito: "", iva_credito: "", balance_iva: "" });
        if (includeCarry && carryCapitalized > 0) rows.push({ mes: "Capitalizado a patrimonio (no descuenta)", ingresos: "", gastos: "", compras: "", resultado_neto: carryCapitalized, iva_debito: "", iva_credito: "", balance_iva: "" });
        if (includeLoans) rows.push({ mes: `Préstamos e inversiones (${coveredYears.join("/")})`, ingresos: "", gastos: "", compras: "", resultado_neto: -loansForPeriod, iva_debito: "", iva_credito: "", balance_iva: "" });
        rows.push({ mes: "RESULTADO ANUAL", ingresos: "", gastos: "", compras: "", resultado_neto: resultadoAnual, iva_debito: "", iva_credito: "", balance_iva: "" });
      }
      exportCSV(`informe_mensual_consa.csv`, rows);
    } else {
      exportCSV(`informe_${mode === "month" ? month : "periodo"}_consa.csv`, [{
        periodo: periodLabel, facturacion: facturado, otros_ingresos: otrosIngresos, total_ingresos: ingresos, cobrado, por_cobrar: facturado - cobrado, gastos, compras,
        resultado_operacional: neto,
        ...(includeCarry ? { deuda_arrastre_neta: carryForPeriod, capitalizado_a_patrimonio: carryCapitalized } : {}),
        ...(includeLoans ? { prestamos_inversiones: loansForPeriod } : {}),
        ...(showAnnual ? { resultado_anual: resultadoAnual } : {}),
        iva_debito: ivaDebito, iva_credito: ivaCredito, iva_a_pagar: Math.max(0, ivaDebito - ivaCredito), retenciones_honorarios: retencionesPeriodo,
      }]);
    }
  };

  const handlePDF = async () => {
    setPdfBusy(true);
    const data = {
      company: state.company, periodLabel, facturado, otrosIngresos, ingresos, gastos, compras, neto,
      ivaDebito, ivaCredito, retencionesPeriodo, retPurCount: retPur.length, includeCarry, carryForPeriod, carryCapitalized, includeLoans, loansForPeriod, showAnnual, resultadoAnual, coveredYears, monthly, mode,
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
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#7c3aed" }}>Retenciones de honorarios</div>
                <div className="text-[11px] text-slate-400">{retPur.length} boleta{retPur.length !== 1 ? "s" : ""} en el periodo</div>
              </div>
              <div className="text-lg font-bold tabular-nums" style={{ color: "#7c3aed" }}>{clp(retencionesPeriodo)}</div>
            </div>
            {retencionesPeriodo > 0 && (
              <button onClick={() => exportCSV(`retenciones_periodo_consa.csv`, retPur.map((p) => ({ fecha: shortDate(p.date), proveedor: p.supplier_name, rut: p.supplier_rut, bruto: p.net_amount, tasa: p.retention_rate + "%", retencion: p.retention_amount, liquido_pagado: p.net_payable })))}
                className="mt-2 text-xs font-semibold" style={{ color: COPPER }}>Descargar detalle para el F29 →</button>
            )}
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
                <span className="text-slate-600">(−) Deuda de arrastre{carryCapitalized > 0 && <span className="text-xs text-slate-400"> · neta de capitalización</span>}</span>
                <span className="font-semibold tabular-nums" style={{ color: "#b45309" }}>{clp(carryForPeriod)}</span>
              </div>
            )}
            {includeCarry && carryCapitalized > 0 && (
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500 text-sm pl-4">Capitalizado a patrimonio (no descuenta)</span>
                <span className="font-medium tabular-nums text-sm" style={{ color: "#047857" }}>{clp(carryCapitalized)}</span>
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
    ...(canSee({ to: "suppliers" }) ? (state.suppliers || []).filter((s) => q && s.name.toLowerCase().includes(q.toLowerCase())).map((s) => ({ label: s.name, to: "suppliers", icon: Factory, kind: "Proveedor" })) : []),
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
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="bg-white rounded-2xl p-3 shadow-lg"><img src={LOGO_B64} alt="CONSA" className="w-20" /></div>
          <div className="text-center">
            <div className="text-white font-bold">{CONSA.legal}</div>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: ACCENT }}>Sistema de Administración</div>
          </div>
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
            Acceso inicial Master: <span className="font-mono text-slate-600">master@consa.cl</span> / <span className="font-mono text-slate-600">consa2026</span>
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
  const blank = { user_id: "", name: "", email: "", password: "", role: "user", modules: ["dashboard"], active: true, can_backup_export: false, can_backup_import: false };
  const [form, setForm] = useState(blank);
  const [backupFor, setBackupFor] = useState(null);

  const saveBackupPerms = (u, perms) => {
    dispatch({ type: "UPSERT", coll: "appUsers", item: { ...u, ...perms }, key: "user_id" });
    const desc = [perms.can_backup_export && "descargar", perms.can_backup_import && "restaurar"].filter(Boolean).join(" y ");
    dispatch({ type: "LOG", msg: desc ? `otorgó a ${u.name} permiso para ${desc} respaldos` : `retiró a ${u.name} los permisos de respaldo` });
    setBackupFor(null);
  };

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
            <th className="text-left font-semibold px-4 py-3 hidden lg:table-cell">Respaldos</th>
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
                <td className="px-4 py-3 hidden lg:table-cell">
                  {u.role === "master" ? <span className="text-xs text-slate-400">Total</span> : (
                    <div className="flex gap-1">
                      {u.can_backup_export && <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">Descarga</span>}
                      {u.can_backup_import && <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border bg-amber-50 text-amber-700 border-amber-200">Restaura</span>}
                      {!u.can_backup_export && !u.can_backup_import && <span className="text-xs text-slate-300">—</span>}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(u)} disabled={u.user_id === me.user_id}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${u.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"} disabled:opacity-60`}>
                    {u.active ? "Activo" : "Inactivo"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {u.role !== "master" && (
                    <button onClick={() => setBackupFor(u)} title="Permisos de respaldo" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Database size={15} /></button>
                  )}
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

      <BackupPermsModal user={backupFor} onClose={() => setBackupFor(null)} onSave={saveBackupPerms} />
    </div>
  );
}

/* Permisos de respaldo por usuario */
function BackupPermsModal({ user, onClose, onSave }) {
  const [exp, setExp] = useState(false);
  const [imp, setImp] = useState(false);
  useEffect(() => { if (user) { setExp(!!user.can_backup_export); setImp(!!user.can_backup_import); } }, [user]);
  if (!user) return null;
  const Toggle = ({ on, set, tone, icon: Icon, title, desc }) => (
    <label className={`flex items-start gap-3 rounded-lg border px-3 py-3 cursor-pointer transition ${on ? tone : "border-slate-200 hover:bg-slate-50"}`}>
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} className="w-4 h-4 mt-0.5 accent-[#B87333]" />
      <div><div className="text-sm font-medium text-slate-800 flex items-center gap-1.5"><Icon size={15} /> {title}</div>
        <div className="text-xs text-slate-400 mt-0.5">{desc}</div></div>
    </label>
  );
  return (
    <Modal open={!!user} onClose={onClose} title="Permisos de respaldo">
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 mb-4">
        <div className="font-semibold text-slate-800">{user.name}</div>
        <div className="text-xs text-slate-500">{user.email}</div>
      </div>
      <div className="space-y-2">
        <Toggle on={exp} set={setExp} tone="border-emerald-300 bg-emerald-50/50" icon={Download}
          title="Descargar respaldos" desc="Puede generar y bajar el archivo JSON con la base de datos" />
        <Toggle on={imp} set={setImp} tone="border-amber-300 bg-amber-50/50" icon={History}
          title="Cargar y restaurar respaldos" desc="Puede reemplazar toda la base de datos desde un archivo" />
      </div>
      {imp && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800">Restaurar sustituye todos los datos del sistema. Otórgalo solo a personas de confianza.</p>
        </div>
      )}
      {!exp && !imp && <p className="mt-3 text-xs text-slate-400">Sin ninguno de los dos permisos, el módulo Respaldo no aparece para este usuario.</p>}
      <div className="flex justify-end gap-2 mt-6">
        <BtnGhost onClick={onClose}>Cancelar</BtnGhost>
        <BtnPrimary onClick={() => onSave(user, { can_backup_export: exp, can_backup_import: imp })}>Guardar permisos</BtnPrimary>
      </div>
    </Modal>
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

/* ============================ Recursos Humanos ============================ */
function HR({ state, dispatch }) {
  const [tab, setTab] = useState("workers");
  const P = { ...HR_DEFAULT_PARAMS, ...(state.hrParams || {}) };
  const employees = state.employees || [];
  const payslips = state.payslips || [];

  return (
    <div>
      <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 mb-5">
        {[["workers", "Trabajadores"], ["payslips", "Liquidaciones"], ["params", "Parámetros"]].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 h-9 rounded-md text-sm font-semibold transition ${tab === k ? "text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            style={tab === k ? { background: COPPER } : {}}>{label}</button>
        ))}
      </div>
      {tab === "workers" && <HRWorkers state={state} dispatch={dispatch} P={P} />}
      {tab === "payslips" && <HRPayslips state={state} dispatch={dispatch} P={P} employees={employees} payslips={payslips} />}
      {tab === "params" && <HRParams state={state} dispatch={dispatch} P={P} />}
    </div>
  );
}

function HRWorkers({ state, dispatch, P }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const employees = state.employees || [];
  const blank = {
    employee_id: "", company_id: state.company.company_id, nombre: "", rut: "", cargo: "",
    fecha_ingreso: todayISO(), tipo_contrato: "Indefinido", sueldo_base: 0, jornada_semanal: P.jornadaSemanal,
    afp: "Modelo", afp_comision: 0.58, salud_sistema: "Fonasa", plan_isapre_uf: 0,
    cargas_familiares: 0, gratificacion: true, colacion: 0, movilizacion: 0,
    email: "", telefono: "", banco: "", cuenta: "", activo: true, notas: "",
  };
  const [form, setForm] = useState(blank);
  const rutOk = form.rut === "" || validRut(form.rut);

  const openNew = () => { setForm({ ...blank, employee_id: uid("emp") }); setEdit(null); setOpen(true); };
  const openEdit = (e) => { setForm(e); setEdit(e.employee_id); setOpen(true); };
  const save = () => {
    if (!form.nombre || !validRut(form.rut)) return;
    const item = { ...form, rut: formatRut(form.rut), sueldo_base: Number(form.sueldo_base) || 0 };
    dispatch({ type: "UPSERT", coll: "employees", item, key: "employee_id" });
    dispatch({ type: "LOG", msg: `${edit ? "actualizó" : "incorporó"} al trabajador ${item.nombre}` });
    setOpen(false);
  };
  const remove = (e) => { dispatch({ type: "DELETE", coll: "employees", id: e.employee_id, key: "employee_id" }); dispatch({ type: "LOG", msg: `eliminó al trabajador ${e.nombre}` }); };

  const list = employees.filter((e) => [e.nombre, e.rut, e.cargo].join(" ").toLowerCase().includes(q.toLowerCase()));
  const activos = employees.filter((e) => e.activo !== false);
  const masaSalarial = activos.reduce((s, e) => s + (Number(e.sueldo_base) || 0), 0);

  return (
    <div>
      <Toolbar query={q} setQuery={setQ} placeholder="Buscar por nombre, RUT o cargo…" onAdd={openNew} addLabel="Nuevo trabajador"
        onExport={() => exportCSV("trabajadores_consa.csv", list.map((e) => ({ nombre: e.nombre, rut: e.rut, cargo: e.cargo, ingreso: shortDate(e.fecha_ingreso), contrato: e.tipo_contrato, sueldo_base: e.sueldo_base, afp: e.afp, salud: e.salud_sistema, cargas: e.cargas_familiares, activo: e.activo === false ? "No" : "Sí" })))} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <Card className="p-4"><div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Dotación activa</div><div className="mt-1 text-xl font-bold" style={{ color: NAVY }}>{activos.length}</div></Card>
        <Card className="p-4"><div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Masa salarial base</div><div className="mt-1 text-xl font-bold tabular-nums" style={{ color: COPPER }}>{clp(masaSalarial)}</div></Card>
        <Card className="p-4"><div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cargas familiares</div><div className="mt-1 text-xl font-bold" style={{ color: NAVY }}>{activos.reduce((s, e) => s + (Number(e.cargas_familiares) || 0), 0)}</div></Card>
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider">
            <th className="text-left font-semibold px-4 py-3">Trabajador</th>
            <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Cargo</th>
            <th className="text-left font-semibold px-4 py-3 hidden lg:table-cell">Contrato</th>
            <th className="text-left font-semibold px-4 py-3 hidden lg:table-cell">Previsión</th>
            <th className="text-right font-semibold px-4 py-3">Sueldo base</th>
            <th className="px-4 py-3"></th>
          </tr></thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.employee_id} className="border-t border-slate-100 hover:bg-slate-50/60 transition">
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-800 flex items-center gap-2">{e.nombre}
                    {e.activo === false && <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">Inactivo</span>}</div>
                  <div className="text-xs text-slate-400">{e.rut}</div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-slate-600">{e.cargo}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-slate-500 text-xs">{e.tipo_contrato}<div className="text-slate-400">{shortDate(e.fecha_ingreso)}</div></td>
                <td className="px-4 py-3 hidden lg:table-cell text-slate-500 text-xs">AFP {e.afp}<div className="text-slate-400">{e.salud_sistema}</div></td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums" style={{ color: NAVY }}>{clp(e.sueldo_base)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Edit3 size={15} /></button>
                  <button onClick={() => remove(e)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Sin trabajadores registrados.</td></tr>}
          </tbody>
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} wide title={edit ? "Editar trabajador" : "Nuevo trabajador"}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre completo"><input className={inputCls} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} autoFocus /></Field>
          <Field label="RUT" hint={!rutOk ? "RUT inválido" : undefined}>
            <input className={`${inputCls} ${!rutOk ? "border-red-400" : ""}`} value={form.rut} onChange={(e) => setForm({ ...form, rut: e.target.value })} onBlur={(e) => e.target.value && setForm({ ...form, rut: formatRut(e.target.value) })} placeholder="12.345.678-5" />
          </Field>
          <Field label="Cargo"><input className={inputCls} value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></Field>
          <Field label="Fecha de ingreso"><input type="date" className={inputCls} value={form.fecha_ingreso?.slice(0, 10)} onChange={(e) => setForm({ ...form, fecha_ingreso: e.target.value })} /></Field>
          <Field label="Tipo de contrato"><select className={inputCls} value={form.tipo_contrato} onChange={(e) => setForm({ ...form, tipo_contrato: e.target.value })}>{CONTRACT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Jornada semanal (horas)"><input type="number" className={inputCls} value={form.jornada_semanal} onChange={(e) => setForm({ ...form, jornada_semanal: Number(e.target.value) })} /></Field>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: COPPER }}>Remuneración</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Sueldo base"><input type="number" className={inputCls} value={form.sueldo_base} onChange={(e) => setForm({ ...form, sueldo_base: e.target.value })} /></Field>
            <Field label="Colación (mensual)"><input type="number" className={inputCls} value={form.colacion} onChange={(e) => setForm({ ...form, colacion: e.target.value })} /></Field>
            <Field label="Movilización (mensual)"><input type="number" className={inputCls} value={form.movilizacion} onChange={(e) => setForm({ ...form, movilizacion: e.target.value })} /></Field>
          </div>
          <label className="flex items-center gap-2 mt-3 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.gratificacion} onChange={(e) => setForm({ ...form, gratificacion: e.target.checked })} className="w-4 h-4 accent-[#B87333]" />
            Paga gratificación legal (25% con tope {P.gratificacionTopeIMM} IMM anuales)
          </label>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: COPPER }}>Previsión</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="AFP">
              <select className={inputCls} value={form.afp} onChange={(e) => { const a = AFP_LIST.find((x) => x.name === e.target.value); setForm({ ...form, afp: e.target.value, afp_comision: a ? a.comision : form.afp_comision }); }}>
                {AFP_LIST.map((a) => <option key={a.name}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="Comisión AFP (%)" hint="Editable si la tasa cambió"><input type="number" step="0.01" className={inputCls} value={form.afp_comision} onChange={(e) => setForm({ ...form, afp_comision: e.target.value })} /></Field>
            <Field label="Sistema de salud"><select className={inputCls} value={form.salud_sistema} onChange={(e) => setForm({ ...form, salud_sistema: e.target.value })}><option>Fonasa</option><option>Isapre</option></select></Field>
            {form.salud_sistema === "Isapre"
              ? <Field label="Plan pactado (UF)"><input type="number" step="0.01" className={inputCls} value={form.plan_isapre_uf} onChange={(e) => setForm({ ...form, plan_isapre_uf: e.target.value })} /></Field>
              : <Field label="Cargas familiares"><input type="number" className={inputCls} value={form.cargas_familiares} onChange={(e) => setForm({ ...form, cargas_familiares: e.target.value })} /></Field>}
            {form.salud_sistema === "Isapre" && <Field label="Cargas familiares"><input type="number" className={inputCls} value={form.cargas_familiares} onChange={(e) => setForm({ ...form, cargas_familiares: e.target.value })} /></Field>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Field label="Email"><input className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Teléfono"><input className={inputCls} value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></Field>
          <Field label="Banco"><input className={inputCls} value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })} /></Field>
          <Field label="N° de cuenta"><input className={inputCls} value={form.cuenta} onChange={(e) => setForm({ ...form, cuenta: e.target.value })} /></Field>
        </div>
        <label className="flex items-center gap-2 mt-4 text-sm text-slate-700 cursor-pointer">
          <input type="checkbox" checked={form.activo !== false} onChange={(e) => setForm({ ...form, activo: e.target.checked })} className="w-4 h-4 accent-[#B87333]" />
          Trabajador activo
        </label>
        <div className="flex justify-end gap-2 mt-6"><BtnGhost onClick={() => setOpen(false)}>Cancelar</BtnGhost><BtnPrimary onClick={save} disabled={!form.nombre || !validRut(form.rut)}>Guardar trabajador</BtnPrimary></div>
      </Modal>
    </div>
  );
}

function HRPayslips({ state, dispatch, P, employees, payslips }) {
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7));
  const [target, setTarget] = useState(null);
  const activos = employees.filter((e) => e.activo !== false);
  const delMes = payslips.filter((p) => p.periodo === periodo);
  const emitida = (id) => delMes.find((p) => p.employee_id === id);

  const periodos = useMemo(() => {
    const out = []; for (let k = 0; k < 18; k++) { const d = new Date(); d.setMonth(d.getMonth() - k); out.push(d.toISOString().slice(0, 7)); }
    return out;
  }, []);
  const label = (p) => { const [y, m] = p.split("-"); return `${MESES[Number(m) - 1]} ${y}`; };

  const totales = delMes.reduce((a, p) => ({
    liquido: a.liquido + p.calc.liquido, haberes: a.haberes + p.calc.totalHaberes,
    desc: a.desc + p.calc.totalDescuentos, costo: a.costo + p.calc.costoEmpresa,
  }), { liquido: 0, haberes: 0, desc: 0, costo: 0 });

  const removePs = (p) => { dispatch({ type: "DELETE", coll: "payslips", id: p.payslip_id, key: "payslip_id" }); dispatch({ type: "LOG", msg: `anuló la liquidación de ${p.emp.nombre} (${label(p.periodo)})` }); };
  const download = async (p) => {
    try { await generatePayslipPDF({ emp: p.emp, mov: p.mov, l: p.calc, periodo: p.periodo, company: state.company }); }
    catch (e) { alert("No se pudo generar el PDF en este entorno."); }
  };

  return (
    <div>
      <Card className="p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-end justify-between">
          <div className="w-56"><Field label="Período de liquidación">
            <select className={inputCls} value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
              {periodos.map((p) => <option key={p} value={p}>{label(p)}</option>)}
            </select>
          </Field></div>
          <div className="flex flex-wrap gap-5 text-sm">
            <div><div className="text-xs text-slate-400 uppercase tracking-wide">Emitidas</div><div className="font-bold" style={{ color: NAVY }}>{delMes.length} de {activos.length}</div></div>
            <div><div className="text-xs text-slate-400 uppercase tracking-wide">Total líquido</div><div className="font-bold tabular-nums" style={{ color: COPPER }}>{clp(totales.liquido)}</div></div>
            <div><div className="text-xs text-slate-400 uppercase tracking-wide">Costo empresa</div><div className="font-bold tabular-nums" style={{ color: NAVY }}>{clp(totales.costo)}</div></div>
            {delMes.length > 0 && <BtnGhost onClick={() => exportCSV(`libro_remuneraciones_${periodo}.csv`, delMes.map((p) => ({ trabajador: p.emp.nombre, rut: p.emp.rut, dias: p.calc.dias, imponible: p.calc.totalImponible, no_imponible: p.calc.totalNoImponible, total_haberes: p.calc.totalHaberes, afp: p.calc.totalAFP, salud: p.calc.saludTotal, cesantia: p.calc.afcTrab, impuesto: p.calc.impuesto, otros_descuentos: p.calc.anticipos + p.calc.prestamos + p.calc.otrosDesc, total_descuentos: p.calc.totalDescuentos, liquido: p.calc.liquido, costo_empresa: p.calc.costoEmpresa })))}><Download size={16} /> Libro de remuneraciones</BtnGhost>}
          </div>
        </div>
      </Card>

      <Card>
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider">
            <th className="text-left font-semibold px-4 py-3">Trabajador</th>
            <th className="text-right font-semibold px-4 py-3 hidden md:table-cell">Haberes</th>
            <th className="text-right font-semibold px-4 py-3 hidden md:table-cell">Descuentos</th>
            <th className="text-right font-semibold px-4 py-3">Líquido</th>
            <th className="text-left font-semibold px-4 py-3">Estado</th>
            <th className="px-4 py-3"></th>
          </tr></thead>
          <tbody>
            {activos.map((e) => {
              const ps = emitida(e.employee_id);
              return (
                <tr key={e.employee_id} className="border-t border-slate-100 hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3"><div className="font-semibold text-slate-800">{e.nombre}</div><div className="text-xs text-slate-400">{e.cargo || e.rut}</div></td>
                  <td className="px-4 py-3 text-right tabular-nums hidden md:table-cell text-slate-600">{ps ? clp(ps.calc.totalHaberes) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums hidden md:table-cell text-slate-600">{ps ? clp(ps.calc.totalDescuentos) : "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums" style={{ color: NAVY }}>{ps ? clp(ps.calc.liquido) : "—"}</td>
                  <td className="px-4 py-3">{ps
                    ? <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">Emitida</span>
                    : <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-100 text-slate-500 border-slate-200">Pendiente</span>}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {ps ? (<>
                      <button onClick={() => download(ps)} title="Descargar PDF" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Download size={15} /></button>
                      <button onClick={() => setTarget({ emp: e, existing: ps })} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Edit3 size={15} /></button>
                      <button onClick={() => removePs(ps)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={15} /></button>
                    </>) : (
                      <button onClick={() => setTarget({ emp: e, existing: null })}
                        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-semibold border border-[#B87333]" style={{ color: COPPER }}>
                        <Plus size={13} /> Liquidar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!activos.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Registra trabajadores para emitir liquidaciones.</td></tr>}
          </tbody>
        </table>
      </Card>

      {target && <PayslipModal target={target} periodo={periodo} P={P} company={state.company}
        onClose={() => setTarget(null)}
        onSave={(mov, calc) => {
          const item = { payslip_id: target.existing?.payslip_id || uid("ps"), company_id: state.company.company_id,
            employee_id: target.emp.employee_id, periodo, emp: target.emp, mov, calc, params: P, created_at: new Date().toISOString() };
          dispatch({ type: "UPSERT", coll: "payslips", item, key: "payslip_id" });
          dispatch({ type: "LOG", msg: `emitió la liquidación de ${target.emp.nombre} (${label(periodo)}) por ${clp(calc.liquido)}` });
          setTarget(null);
        }} />}
    </div>
  );
}

function PayslipModal({ target, periodo, P, company, onClose, onSave }) {
  const emp = target.emp;
  const blank = { dias_trabajados: 30, horas_extra: 0, comisiones: 0, bonos_imponibles: 0, otros_no_imponibles: 0, apv: 0, anticipos: 0, prestamos: 0, otros_descuentos: 0 };
  const [mov, setMov] = useState(target.existing?.mov || blank);
  const l = calcPayslip(emp, mov, P);
  const set = (k, v) => setMov({ ...mov, [k]: v });
  const N = ({ label: lb, k, step }) => (
    <Field label={lb}><input type="number" step={step} className={inputCls} value={mov[k]} onChange={(e) => set(k, e.target.value)} /></Field>
  );
  const Row = ({ label: lb, val, bold, tone, small }) => (
    <div className={`flex justify-between ${small ? "text-xs" : "text-sm"} py-1 ${bold ? "font-bold border-t border-slate-200 pt-1.5 mt-1" : ""}`}>
      <span className={bold ? "" : "text-slate-600"} style={bold ? { color: NAVY } : {}}>{lb}</span>
      <span className="tabular-nums" style={{ color: tone || (bold ? NAVY : "#475569") }}>{clp(val)}</span>
    </div>
  );
  const [y, m] = periodo.split("-");

  return (
    <Modal open wide onClose={onClose} title={`Liquidación · ${emp.nombre} · ${MESES[Number(m) - 1]} ${y}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COPPER }}>Movimientos del mes</div>
          <div className="grid grid-cols-2 gap-3">
            <N label="Días trabajados" k="dias_trabajados" />
            <N label="Horas extra" k="horas_extra" step="0.5" />
            <N label="Comisiones" k="comisiones" />
            <N label="Bonos imponibles" k="bonos_imponibles" />
            <N label="Otros no imponibles" k="otros_no_imponibles" />
            <N label="APV" k="apv" />
            <N label="Anticipos" k="anticipos" />
            <N label="Préstamos" k="prestamos" />
            <N label="Otros descuentos" k="otros_descuentos" />
          </div>
          <div className="mt-3 text-xs text-slate-400">Valor hora extra: <span className="font-semibold text-slate-600">{clp(l.valorHE)}</span> · jornada {emp.jornada_semanal || P.jornadaSemanal} hrs</div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: COPPER }}>Haberes</div>
          <Row label="Sueldo base" val={l.base} />
          {l.horasExtra > 0 && <Row label="Horas extra" val={l.horasExtra} />}
          {l.comisiones > 0 && <Row label="Comisiones" val={l.comisiones} />}
          {l.bonos > 0 && <Row label="Bonos imponibles" val={l.bonos} />}
          {l.gratificacion > 0 && <Row label="Gratificación legal" val={l.gratificacion} />}
          <Row label="Total imponible" val={l.totalImponible} bold />
          {l.colacion > 0 && <Row label="Colación" val={l.colacion} small />}
          {l.movilizacion > 0 && <Row label="Movilización" val={l.movilizacion} small />}
          {l.asignacionFamiliar > 0 && <Row label="Asignación familiar" val={l.asignacionFamiliar} small />}
          {l.otrosNoImp > 0 && <Row label="Otros no imponibles" val={l.otrosNoImp} small />}
          <Row label="Total haberes" val={l.totalHaberes} bold />

          <div className="text-xs font-semibold uppercase tracking-wide mt-4 mb-1" style={{ color: COPPER }}>Descuentos</div>
          <Row label={`AFP ${emp.afp} (${(10 + Number(emp.afp_comision || 0)).toFixed(2)}%)`} val={l.totalAFP} />
          <Row label={emp.salud_sistema === "Isapre" ? "Isapre" : "Fonasa 7%"} val={l.saludTotal} />
          {l.afcTrab > 0 && <Row label="Seguro cesantía 0,6%" val={l.afcTrab} />}
          {l.apv > 0 && <Row label="APV" val={l.apv} />}
          {l.impuesto > 0 && <Row label={`Impuesto único (tramo ${l.tramoNum})`} val={l.impuesto} />}
          {l.anticipos > 0 && <Row label="Anticipos" val={l.anticipos} />}
          {l.prestamos > 0 && <Row label="Préstamos" val={l.prestamos} />}
          {l.otrosDesc > 0 && <Row label="Otros descuentos" val={l.otrosDesc} />}
          <Row label="Total descuentos" val={l.totalDescuentos} bold tone="#b91c1c" />

          <div className="rounded-lg px-3 py-2.5 mt-3 flex justify-between items-center" style={{ background: CONSA.maroon }}>
            <span className="text-white font-bold text-sm">LÍQUIDO A PAGAR</span>
            <span className="text-white font-bold tabular-nums">{clp(l.liquido)}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex justify-between">
            <span>Aportes empleador: {clp(l.totalEmpleador)}</span>
            <span>Costo empresa: <span className="font-semibold text-slate-600">{clp(l.costoEmpresa)}</span></span>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <BtnGhost onClick={onClose}>Cancelar</BtnGhost>
        <BtnPrimary onClick={() => onSave(mov, l)}>{target.existing ? "Actualizar" : "Emitir"} liquidación</BtnPrimary>
      </div>
    </Modal>
  );
}

function HRParams({ state, dispatch, P }) {
  const [f, setF] = useState(P);
  const save = () => { dispatch({ type: "HRPARAMS", params: { ...f } }); dispatch({ type: "LOG", msg: `actualizó los parámetros previsionales (vigencia ${f.vigencia})` }); };
  const N = ({ label: lb, k, step, hint }) => (
    <Field label={lb} hint={hint}><input type="number" step={step || "any"} className={inputCls} value={f[k]} onChange={(e) => setF({ ...f, [k]: Number(e.target.value) })} /></Field>
  );
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800">La UF y la UTM cambian todos los meses, y los topes, tasas y tramos se reajustan por ley. <span className="font-semibold">Verifica estos valores antes de emitir liquidaciones</span> — el cálculo es tan correcto como los parámetros que ingreses. Fuentes: SII (UTM, tramos), Previred (UF, topes), Dirección del Trabajo.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-bold mb-4" style={{ color: NAVY }}>Indicadores del mes</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Vigencia"><input className={inputCls} value={f.vigencia} onChange={(e) => setF({ ...f, vigencia: e.target.value })} placeholder="2026-09" /></Field>
            <N label="Valor UF" k="uf" />
            <N label="Valor UTM" k="utm" />
            <N label="Ingreso mínimo (IMM)" k="imm" />
            <N label="Tope imponible (UF)" k="topeImponibleUF" step="0.1" hint={`= ${clp(Math.round(f.topeImponibleUF * f.uf))}`} />
            <N label="Tope cesantía (UF)" k="topeAFCUF" step="0.1" hint={`= ${clp(Math.round(f.topeAFCUF * f.uf))}`} />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold mb-4" style={{ color: NAVY }}>Tasas legales (%)</h3>
          <div className="grid grid-cols-2 gap-4">
            <N label="AFP obligatoria" k="tasaAFPBase" step="0.01" />
            <N label="Salud" k="tasaSalud" step="0.01" />
            <N label="Cesantía trabajador" k="tasaAFCIndefinidoTrab" step="0.01" />
            <N label="Cesantía empleador (indef.)" k="tasaAFCIndefinidoEmp" step="0.01" />
            <N label="Cesantía empleador (plazo fijo)" k="tasaAFCPlazoFijoEmp" step="0.01" />
            <N label="SIS (empleador)" k="tasaSIS" step="0.01" />
            <N label="Mutual (empleador)" k="tasaMutual" step="0.01" />
            <N label="Ley SANNA" k="tasaSanna" step="0.01" />
            <N label="Aporte reforma previsional" k="tasaReformaEmp" step="0.01" hint="Ley 21.735, gradual" />
            <N label="Jornada semanal (hrs)" k="jornadaSemanal" step="1" hint="44 · 42 · 40 según año" />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold mb-1" style={{ color: NAVY }}>Asignación familiar</h3>
          <p className="text-xs text-slate-400 mb-3">Monto por carga según renta imponible</p>
          {f.asigFamiliar.map((t, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <span className="text-xs text-slate-500 w-16">Tramo {String.fromCharCode(65 + i)}</span>
              <input type="number" className={`${inputCls} flex-1`} value={t.hasta === Infinity ? "" : t.hasta} placeholder="Sin tope"
                onChange={(e) => { const v = e.target.value === "" ? Infinity : Number(e.target.value); setF({ ...f, asigFamiliar: f.asigFamiliar.map((x, j) => j === i ? { ...x, hasta: v } : x) }); }} />
              <input type="number" className={`${inputCls} w-28`} value={t.monto}
                onChange={(e) => setF({ ...f, asigFamiliar: f.asigFamiliar.map((x, j) => j === i ? { ...x, monto: Number(e.target.value) } : x) })} />
            </div>
          ))}
        </Card>

        <Card className="p-6">
          <h3 className="font-bold mb-1" style={{ color: NAVY }}>Impuesto único 2ª categoría</h3>
          <p className="text-xs text-slate-400 mb-3">Tramos en UTM · factor y rebaja</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-slate-400"><th className="text-left py-1">Desde</th><th className="text-left">Hasta</th><th className="text-left">Factor</th><th className="text-left">Rebaja</th></tr></thead>
              <tbody>
                {f.tramosImpuesto.map((t, i) => (
                  <tr key={i}>
                    <td className="py-0.5 pr-1"><input type="number" step="0.1" className="w-full h-8 rounded border border-slate-200 px-1.5" value={t.desde} onChange={(e) => setF({ ...f, tramosImpuesto: f.tramosImpuesto.map((x, j) => j === i ? { ...x, desde: Number(e.target.value) } : x) })} /></td>
                    <td className="py-0.5 pr-1"><input type="number" step="0.1" className="w-full h-8 rounded border border-slate-200 px-1.5" value={t.hasta === Infinity ? "" : t.hasta} placeholder="∞" onChange={(e) => { const v = e.target.value === "" ? Infinity : Number(e.target.value); setF({ ...f, tramosImpuesto: f.tramosImpuesto.map((x, j) => j === i ? { ...x, hasta: v } : x) }); }} /></td>
                    <td className="py-0.5 pr-1"><input type="number" step="0.001" className="w-full h-8 rounded border border-slate-200 px-1.5" value={t.factor} onChange={(e) => setF({ ...f, tramosImpuesto: f.tramosImpuesto.map((x, j) => j === i ? { ...x, factor: Number(e.target.value) } : x) })} /></td>
                    <td className="py-0.5"><input type="number" step="0.01" className="w-full h-8 rounded border border-slate-200 px-1.5" value={t.rebaja} onChange={(e) => setF({ ...f, tramosImpuesto: f.tramosImpuesto.map((x, j) => j === i ? { ...x, rebaja: Number(e.target.value) } : x) })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <div className="flex justify-end gap-2">
        <BtnGhost onClick={() => setF(HR_DEFAULT_PARAMS)}>Restaurar valores por defecto</BtnGhost>
        <BtnPrimary onClick={save}>Guardar parámetros</BtnPrimary>
      </div>
    </div>
  );
}

/* ============================ Manual de uso por módulo ============================ */
const MANUALS = {
  dashboard: {
    intro: "Vista consolidada de la situación financiera: ingresos, egresos y balance de IVA en un solo lugar.",
    steps: [
      "Las tarjetas superiores muestran ingresos totales (facturación + otros ingresos), otros ingresos por separado, lo pendiente por cobrar y el total de gastos y compras.",
      "El gráfico apila la facturación y los otros ingresos por mes, junto a compras y gastos de los últimos 6 meses.",
      "El balance de IVA compara el débito (ventas) con el crédito (compras) e indica el monto a pagar al SII.",
      "Si hay facturas vencidas aparece un aviso ámbar arriba, con acceso directo a la cobranza.",
    ],
    faqs: [
      { q: "¿Por qué el total facturado no coincide con lo cobrado?", a: "El facturado incluye todas las facturas emitidas; lo cobrado solo las marcadas como Pagadas. La diferencia es tu cuenta por cobrar." },
      { q: "¿Los otros ingresos afectan el IVA?", a: "Solo los que marcaste como afectos a IVA, típicamente una venta de activos. Un crédito o un aporte de socio no genera IVA débito." },
      { q: "¿El dashboard incluye la deuda de arrastre?", a: "No. Esa cuenta y los préstamos consolidan anualmente y solo aparecen en Informes al activar sus interruptores." },
    ],
  },
  projects: {
    intro: "Cada proyecto o mina funciona como centro de costos: agrupa lo facturado y lo gastado para mostrarte el margen real.",
    steps: [
      "Crea el proyecto con nombre, código, mandante, ubicación, presupuesto y fecha de inicio.",
      "Al cargar facturas, presupuestos, órdenes de compra, compras, gastos u otros ingresos, selecciona el proyecto en el campo 'Proyecto / Mina'.",
      "Haz clic en la tarjeta del proyecto para ver el detalle: facturado, otros ingresos, gastado, margen y todos los documentos asociados.",
      "La barra de presupuesto cambia a ámbar sobre el 70% y a rojo sobre el 90% de consumo.",
    ],
    faqs: [
      { q: "¿Puedo asociar un documento después de crearlo?", a: "Sí. Edita el documento y elige el proyecto en el selector; el detalle se actualiza al instante." },
      { q: "¿Qué pasa si no asigno proyecto?", a: "El documento queda como 'Sin proyecto'. Sigue contando en los informes generales, pero no en el margen de ningún proyecto." },
      { q: "¿El margen considera el IVA?", a: "Usa los totales de los documentos. Para comparar márgenes entre proyectos, mantén un criterio uniforme al cargarlos." },
    ],
  },
  clients: {
    intro: "Cartera de clientes con validación automática del RUT chileno.",
    steps: [
      "Crea el cliente con razón social, RUT, contacto y dirección.",
      "El RUT se valida con módulo 11 y se formatea solo al salir del campo.",
      "Los clientes aparecen luego en los selectores de facturas y presupuestos.",
    ],
    faqs: [
      { q: "¿Por qué rechaza un RUT?", a: "El dígito verificador no corresponde al número. Revísalo: el sistema aplica el cálculo oficial de módulo 11." },
      { q: "¿Puedo eliminar un cliente con facturas emitidas?", a: "Sí, pero las facturas conservan el nombre registrado al emitirlas. Es preferible mantenerlo para no perder la trazabilidad." },
    ],
  },
  suppliers: {
    intro: "Registro de proveedores con control de compliance y matriz de riesgo.",
    steps: [
      "Crea el proveedor con razón social, RUT, categoría y contacto.",
      "Marca 'Tiene compliance' si cumple la due diligence, y 'En matriz de riesgo' si está integrado a la matriz de la empresa.",
      "Marca 'Emite boleta de honorarios' si es un profesional exento de IVA.",
      "Al emitir una orden de compra o registrar una compra, selecciónalo y los datos se completan solos.",
    ],
    faqs: [
      { q: "¿Qué pasa si marco 'boleta de honorarios'?", a: "Al elegir ese proveedor, el IVA se desactiva automáticamente y se activa la retención de honorarios con la tasa del año." },
      { q: "¿El sistema bloquea proveedores sin compliance?", a: "No, los marcadores son informativos: aparecen junto al nombre en los selectores para que decidas con la información a la vista." },
    ],
  },
  invoices: {
    intro: "Emisión de facturas con tipo de documento tributario, seguimiento de estados y cobranza.",
    steps: [
      "Crea la factura eligiendo cliente, tipo de DTE, vencimiento y proyecto.",
      "Agrega los ítems con descripción, cantidad y precio unitario; el IVA se calcula solo.",
      "Desmarca 'Afecto a IVA' para una factura exenta. Al elegir DTE 34 se desactiva automáticamente.",
      "Cambia el estado desde la tabla: Borrador, Enviada, Vista o Pagada.",
      "Descarga el PDF con el botón de descarga, o haz clic en el folio para ver la vista previa.",
    ],
    faqs: [
      { q: "¿Esto emite el DTE ante el SII?", a: "No. El sistema registra y genera el documento en PDF, pero la emisión electrónica ante el SII requiere la integración del backend." },
      { q: "¿Cómo marco una factura vencida?", a: "Se marca sola: si la fecha de vencimiento pasó y no está Pagada, aparece en rojo y en el aviso del dashboard." },
      { q: "¿La numeración es automática?", a: "Sí, correlativa desde F-000001, pero puedes editarla al crear la factura." },
    ],
  },
  quotes: {
    intro: "Presupuestos y cotizaciones, con conversión directa a factura.",
    steps: [
      "Crea el presupuesto con cliente, validez, proyecto e ítems.",
      "Actualiza el estado según avance: Borrador, Enviado, Aceptado o Rechazado.",
      "Al aceptarse, usa el botón 'Facturar' para convertirlo en factura arrastrando ítems, montos y proyecto.",
      "Descarga el PDF, que indica que es una propuesta comercial y no un documento tributario.",
    ],
    faqs: [
      { q: "¿Qué pasa con el presupuesto al facturarlo?", a: "Queda con estado 'Convertido' y se crea una factura en Borrador para que la revises antes de emitirla." },
      { q: "¿Se puede convertir dos veces?", a: "No. Una vez convertido, el botón desaparece para evitar facturas duplicadas." },
    ],
  },
  "purchase-orders": {
    intro: "Órdenes de compra a proveedores, con recepción y generación automática de la compra.",
    steps: [
      "Crea la orden seleccionando el proveedor del registro; sus datos se completan solos.",
      "Agrega los ítems y define la fecha de entrega esperada y el proyecto.",
      "Avanza el estado: Borrador, Enviada, Confirmada, Recibida o Cancelada.",
      "Al presionar 'Recibir', la orden se marca como recibida y se genera automáticamente la compra con su IVA crédito.",
    ],
    faqs: [
      { q: "¿Debo registrar la compra por separado?", a: "No. El botón 'Recibir' la crea por ti, con el proveedor, montos, proyecto y condición de IVA heredados." },
      { q: "¿Cómo emito una orden exenta de IVA?", a: "Desmarca 'Afecto a IVA' junto al recuadro de totales, o elige un proveedor marcado como boleta de honorarios." },
    ],
  },
  purchases: {
    intro: "Registro de compras con separación del IVA crédito y retención de honorarios.",
    steps: [
      "Registra la compra eligiendo el proveedor, tipo de documento, categoría, proyecto y monto neto.",
      "El IVA se calcula al 19%; desmárcalo si el documento es exento.",
      "Si es boleta de honorarios, se activa la retención con la tasa del año y se muestra el líquido a pagar.",
      "El panel superior consolida las retenciones del mes para tu declaración.",
    ],
    faqs: [
      { q: "¿La retención reduce el gasto?", a: "No. El gasto sigue siendo el bruto; la retención solo divide el pago entre el profesional y el SII." },
      { q: "¿De dónde sale la tasa de retención?", a: "Del año del documento, según la escala de la Ley 21.133 (2025: 14,5%, 2026: 15,25%, hasta 17% en 2028). Es editable." },
      { q: "¿Dónde veo el detalle para el F29?", a: "En el panel de retenciones del mes con el botón 'Detalle', o en Informes para cualquier período." },
    ],
  },
  expenses: {
    intro: "Gastos operacionales por categoría, sin IVA crédito asociado.",
    steps: [
      "Registra el gasto con descripción, categoría, proveedor, monto, fecha y proyecto.",
      "Usa las categorías para analizar la estructura de costos en Informes.",
    ],
    faqs: [
      { q: "¿Cuándo uso Gastos y cuándo Compras?", a: "Compras es para documentos con IVA crédito que quieres recuperar. Gastos es para desembolsos operacionales sin ese tratamiento." },
    ],
  },
  "other-income": {
    intro: "Ingresos que no provienen de facturación: créditos, asociaciones comerciales, venta de activos y otros títulos.",
    steps: [
      "Elige el tipo de ingreso, la fuente o contraparte, el monto y la fecha.",
      "Marca 'Afecto a IVA' cuando corresponda, típicamente en una venta de activos.",
      "Asócialo a un proyecto si el ingreso pertenece a una faena determinada.",
    ],
    faqs: [
      { q: "¿Un crédito bancario lleva IVA?", a: "No. Tampoco un aporte de socio. La venta de un activo sí suele estar afecta." },
      { q: "¿Se suman al resultado?", a: "Sí, entran en los ingresos totales del dashboard y de Informes, junto a la facturación." },
    ],
  },
  "carry-debt": {
    intro: "Pasivo de consolidación anual. No afecta la rentabilidad mensual, solo el resultado del año.",
    steps: [
      "Registra la deuda indicando el año de consolidación, acreedor, monto y estado.",
      "Usa 'Capitalizar' para convertir la deuda en patrimonio: acciones serie D, aporte de capital, dación en pago u otro mecanismo.",
      "El formulario de capitalización pide fecha, monto (total o parcial), motivo, detalles y documentos de respaldo.",
      "Define en cada capitalización si el monto deja de descontar o sigue afectando el resultado anual.",
      "En Informes, activa 'Incluir deuda de arrastre' para ver el efecto en la rentabilidad del año.",
    ],
    faqs: [
      { q: "¿Por qué no aparece en el resultado mensual?", a: "Por diseño: es una cuenta de consolidación anual. Los meses muestran solo el resultado operacional." },
      { q: "¿Puedo capitalizar solo una parte?", a: "Sí. El sistema controla el saldo y la deuda queda como 'Capitalizada parcial' hasta cubrirla por completo." },
      { q: "¿Qué significa 'pasa a patrimonio'?", a: "Que ese monto deja de descontar del resultado anual, porque la deuda se convirtió en capital." },
      { q: "¿Puedo revertir una capitalización?", a: "Sí, desde el historial. El saldo se recalcula automáticamente." },
    ],
  },
  loans: {
    intro: "Histórico de préstamos e inversiones que CONSA ha efectuado a terceros. Consolida anualmente.",
    steps: [
      "Registra el tipo (préstamo o inversión), la fecha del egreso, el beneficiario con su RUT y el monto.",
      "Indica el objetivo del egreso y agrega notas con condiciones, garantías o plazos.",
      "Actualiza el estado: Vigente, Recuperado o Incobrable.",
      "En Informes, activa 'Incluir préstamos e inversiones' para reflejarlo en el resultado anual.",
    ],
    faqs: [
      { q: "¿Afecta el resultado mensual?", a: "No. Igual que la deuda de arrastre, su efecto se aplica al resultado del año y solo si activas el interruptor." },
      { q: "¿Puedo filtrar por año?", a: "Sí, por año del egreso y por tipo, con los botones sobre la tabla." },
    ],
  },
  hr: {
    intro: "Trabajadores, liquidaciones mensuales y parámetros previsionales.",
    steps: [
      "En Trabajadores, crea la ficha con contrato, sueldo base, AFP, sistema de salud, cargas familiares y haberes fijos.",
      "En Parámetros, actualiza UF, UTM, topes y tasas antes de liquidar. Cambian todos los meses.",
      "En Liquidaciones, elige el período y presiona 'Liquidar' junto al trabajador.",
      "Ingresa los movimientos del mes: días trabajados, horas extra, bonos, anticipos y descuentos. El cálculo se actualiza en vivo.",
      "Emite la liquidación y descarga el PDF, o exporta el libro de remuneraciones del mes.",
    ],
    faqs: [
      { q: "¿Los parámetros vienen actualizados?", a: "No necesariamente. Los valores precargados son referenciales: verifica UF, UTM y topes en Previred y el SII antes de liquidar." },
      { q: "¿Cómo se calcula la gratificación?", a: "Artículo 50 del Código del Trabajo: 25% de lo devengado, con tope de 4,75 ingresos mínimos anuales dividido en 12." },
      { q: "¿Y el valor de la hora extra?", a: "Sueldo base dividido por las horas mensuales (jornada semanal × 30/7), con recargo del 50%." },
      { q: "¿Descuenta el seguro de cesantía a todos?", a: "Solo el 0,6% del trabajador con contrato indefinido. En plazo fijo lo paga íntegro el empleador." },
      { q: "¿Qué es el costo empresa?", a: "El total de haberes más los aportes del empleador: SIS, cesantía, mutual, Ley SANNA y aporte de la reforma." },
    ],
  },
  reports: {
    intro: "Estado de resultado por período, con desglose mensual y PDF descargable.",
    steps: [
      "Elige el modo: Mensual para un mes puntual, o Agregado para un rango con desglose mes a mes.",
      "Revisa ingresos, egresos, resultado operacional y balance de IVA del período.",
      "Activa los interruptores de deuda de arrastre y préstamos para ver la rentabilidad anual ajustada.",
      "Descarga el estado de resultado en PDF o exporta el detalle en CSV.",
    ],
    faqs: [
      { q: "¿Por qué el resultado anual difiere del operacional?", a: "Porque descuenta la deuda de arrastre y los préstamos del año, que no se prorratean por mes." },
      { q: "¿El PDF respeta los interruptores?", a: "Sí. Solo incluye las líneas de consolidación anual que tengas activadas." },
      { q: "¿Dónde veo las retenciones?", a: "En la tarjeta de IVA, con enlace para descargar el detalle del período para el F29." },
    ],
  },
  settings: {
    intro: "Datos de la empresa, colores de los documentos y actividad reciente.",
    steps: [
      "Actualiza razón social, RUT, dirección y correo de notificaciones.",
      "Ajusta los colores del branding; la vista previa muestra cómo se verán los documentos.",
    ],
    faqs: [
      { q: "¿Los colores cambian los PDF?", a: "Los PDF usan la identidad corporativa de CONSA con el logotipo. Los colores afectan las vistas en pantalla." },
    ],
  },
  users: {
    intro: "Gestión de accesos: quién entra al sistema y a qué módulos.",
    steps: [
      "Crea el usuario con nombre, email y contraseña.",
      "Elige el rol: Master tiene acceso total; Usuario accede solo a los módulos que marques.",
      "Usa el botón de base de datos para asignar permisos de respaldo: descargar y restaurar son independientes.",
      "Desactiva un usuario en lugar de eliminarlo si el retiro puede ser temporal.",
    ],
    faqs: [
      { q: "¿Puedo dejar a alguien solo con lectura?", a: "Aún no. Los permisos son por módulo: quien accede a un módulo puede operar en él." },
      { q: "¿Por qué no puedo eliminarme?", a: "Como protección, para no dejar el sistema sin administrador activo." },
      { q: "¿Las contraseñas son seguras?", a: "En esta versión se guardan en el navegador sin cifrar. No uses claves reales hasta migrar al backend." },
    ],
  },
  log: {
    intro: "Bitácora de todas las gestiones realizadas en el sistema.",
    steps: [
      "Consulta fecha, usuario y descripción de cada acción.",
      "Busca por usuario o por tipo de gestión y exporta el registro en CSV.",
    ],
    faqs: [
      { q: "¿Qué queda registrado?", a: "Inicios y cierres de sesión, creación, edición y eliminación en todos los módulos, cambios de permisos, capitalizaciones y respaldos." },
      { q: "¿Se puede borrar la bitácora?", a: "No desde la interfaz. Solo se reemplaza al restaurar un respaldo completo." },
    ],
  },
  backup: {
    intro: "Descarga y restauración de la base de datos completa.",
    steps: [
      "Presiona 'Descargar respaldo JSON' para bajar todos los datos del sistema.",
      "Guarda el archivo fuera del equipo: en la nube o en un disco externo.",
      "Para restaurar, carga el archivo, revisa el resumen de contenido y confirma.",
    ],
    faqs: [
      { q: "¿Con qué frecuencia debo respaldar?", a: "Al menos una vez por semana, y siempre antes de restaurar otro respaldo o de un cambio importante." },
      { q: "¿Restaurar borra lo actual?", a: "Sí, reemplaza toda la base de datos. Por eso pide una confirmación explícita indicando cuántos registros se perderán." },
      { q: "¿Por qué es tan importante?", a: "Los datos viven en este navegador. Si se borran los datos del sitio o cambias de equipo, el respaldo es la única forma de recuperarlos." },
    ],
  },
};

function HelpModal({ open, onClose, route, title }) {
  const [openFaq, setOpenFaq] = useState(null);
  useEffect(() => { if (open) setOpenFaq(null); }, [open, route]);
  if (!open) return null;
  const m = MANUALS[route];
  return (
    <Modal open={open} onClose={onClose} wide title={`Manual · ${title}`}>
      {!m ? (
        <div className="text-center text-slate-400 py-8">Este módulo aún no tiene manual.</div>
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-slate-600 leading-relaxed">{m.intro}</p>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COPPER }}>Cómo se usa</div>
            <ol className="space-y-2">
              {m.steps.map((st, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-700">
                  <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white mt-0.5" style={{ background: COPPER }}>{i + 1}</span>
                  <span className="leading-relaxed">{st}</span>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COPPER }}>Respuestas rápidas</div>
            <div className="space-y-1.5">
              {m.faqs.map((f, i) => (
                <div key={i} className="rounded-lg border border-slate-200 overflow-hidden">
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition">
                    <span className="text-sm font-medium text-slate-700">{f.q}</span>
                    <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                  </button>
                  {openFaq === i && <div className="px-3 pb-3 pt-0 text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">{f.a}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-end mt-6"><BtnPrimary onClick={onClose}>Entendido</BtnPrimary></div>
    </Modal>
  );
}

/* ============================ Respaldo ============================ */
const BACKUP_COLLECTIONS = [
  ["clients", "Clientes"], ["suppliers", "Proveedores"], ["projects", "Proyectos"],
  ["invoices", "Facturas"], ["quotes", "Presupuestos"], ["purchaseOrders", "Órdenes de compra"],
  ["purchases", "Compras"], ["expenses", "Gastos"], ["otherIncome", "Otros ingresos"],
  ["carryDebt", "Deuda de arrastre"], ["loansInvestments", "Préstamos e inversiones"],
  ["employees", "Trabajadores"], ["payslips", "Liquidaciones"], ["appUsers", "Usuarios"], ["activity", "Bitácora"],
];
const BACKUP_VERSION = 1;

function Backup({ state, dispatch, me, canExport = true, canImport = true }) {
  const [file, setFile] = useState(null);      // { data, name, error }
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState("");

  const counts = BACKUP_COLLECTIONS.map(([k, label]) => [label, (state[k] || []).length]);
  const totalRecords = counts.reduce((s, [, n]) => s + n, 0);

  const doExport = () => {
    const { session, ...data } = state;
    const payload = {
      _meta: {
        app: "ERP CONSA", version: BACKUP_VERSION,
        generated_at: new Date().toISOString(),
        generated_by: me?.email || "",
        company: state.company?.name || "",
        records: Object.fromEntries(BACKUP_COLLECTIONS.map(([k]) => [k, (state[k] || []).length])),
      },
      data,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `respaldo_consa_${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
    dispatch({ type: "LOG", msg: `descargó un respaldo de la base de datos (${totalRecords} registros)` });
    setDone("Respaldo descargado correctamente.");
    setTimeout(() => setDone(""), 4000);
  };

  const readFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(r.result);
        const data = parsed?.data && parsed?._meta ? parsed.data : parsed;
        if (!data || typeof data !== "object" || !data.company || !Array.isArray(data.appUsers)) {
          setFile({ name: f.name, error: "El archivo no tiene la estructura de un respaldo del sistema." });
          return;
        }
        setFile({ name: f.name, data, meta: parsed._meta || null });
      } catch (_) {
        setFile({ name: f.name, error: "El archivo no es un JSON válido." });
      }
    };
    r.onerror = () => setFile({ name: f.name, error: "No se pudo leer el archivo." });
    r.readAsText(f);
  };

  const doRestore = () => {
    const d = file.data;
    // Mantener la sesión sólo si el usuario actual sigue existiendo en el respaldo
    const stillThere = (d.appUsers || []).find((u) => u.email?.toLowerCase() === me?.email?.toLowerCase() && u.active);
    const session = stillThere ? { user_id: stillThere.user_id, name: stillThere.name, email: stillThere.email, role: stillThere.role } : null;
    dispatch({ type: "RESTORE", payload: d, session });
    if (session) dispatch({ type: "LOG", msg: `restauró la base de datos desde el respaldo "${file.name}"` });
    setFile(null); setConfirming(false);
  };

  const fileCounts = file?.data ? BACKUP_COLLECTIONS.map(([k, label]) => [label, (file.data[k] || []).length]) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800">Los datos viven en este navegador. {canExport ? "Descarga un respaldo con regularidad y guárdalo fuera del equipo: " : ""}si se borran los datos del navegador o cambias de dispositivo, el respaldo es la única forma de recuperar la información.</p>
      </div>

      <div className={`grid grid-cols-1 gap-6 ${canExport && canImport ? "lg:grid-cols-2" : "max-w-2xl"}`}>
        {canExport && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <Download size={18} style={{ color: COPPER }} />
            <h3 className="font-bold" style={{ color: NAVY }}>Descargar respaldo</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">Genera un archivo JSON con toda la base de datos.</p>
          <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 mb-4 max-h-64 overflow-y-auto">
            {counts.map(([label, n]) => (
              <div key={label} className="flex justify-between px-3 py-1.5 text-sm">
                <span className="text-slate-600">{label}</span><span className="font-semibold tabular-nums text-slate-700">{n}</span>
              </div>
            ))}
            <div className="flex justify-between px-3 py-2 text-sm bg-slate-50">
              <span className="font-semibold text-slate-700">Total de registros</span><span className="font-bold tabular-nums" style={{ color: NAVY }}>{totalRecords}</span>
            </div>
          </div>
          <BtnPrimary onClick={doExport} className="w-full justify-center"><Download size={16} /> Descargar respaldo JSON</BtnPrimary>
          {done && <div className="mt-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{done}</div>}
        </Card>
        )}

        {canImport && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <History size={18} style={{ color: COPPER }} />
            <h3 className="font-bold" style={{ color: NAVY }}>Restaurar desde respaldo</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">Carga un archivo JSON previamente descargado.</p>

          <label className="block rounded-xl border-2 border-dashed border-slate-300 hover:border-[#B87333] transition cursor-pointer px-4 py-8 text-center">
            <input type="file" accept="application/json,.json" onChange={readFile} className="hidden" />
            <FileText size={26} className="mx-auto text-slate-400 mb-2" />
            <div className="text-sm font-medium text-slate-700">Seleccionar archivo de respaldo</div>
            <div className="text-xs text-slate-400 mt-0.5">Formato .json</div>
          </label>

          {file?.error && (
            <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <span className="font-medium">{file.name}</span> — {file.error}
            </div>
          )}

          {file?.data && !confirming && (
            <div className="mt-4 rounded-xl border border-slate-200 p-4">
              <div className="font-semibold text-slate-800 text-sm">{file.name}</div>
              {file.meta && (
                <div className="text-xs text-slate-400 mt-0.5">
                  Generado el {new Date(file.meta.generated_at).toLocaleString("es-CL")}{file.meta.generated_by ? ` por ${file.meta.generated_by}` : ""}
                </div>
              )}
              <div className="grid grid-cols-2 gap-x-4 mt-3 text-sm">
                {fileCounts.filter(([, n]) => n > 0).map(([label, n]) => (
                  <div key={label} className="flex justify-between py-0.5"><span className="text-slate-500">{label}</span><span className="font-medium tabular-nums text-slate-700">{n}</span></div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <BtnGhost onClick={() => setFile(null)} className="flex-1 justify-center">Cancelar</BtnGhost>
                <BtnPrimary onClick={() => setConfirming(true)} className="flex-1 justify-center">Continuar</BtnPrimary>
              </div>
            </div>
          )}

          {file?.data && confirming && (
            <div className="mt-4 rounded-xl border-2 border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle size={18} className="text-red-600 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-red-800 text-sm">Esta acción reemplaza toda la base de datos</div>
                  <p className="text-sm text-red-700 mt-1">Los {totalRecords} registros actuales se perderán y serán sustituidos por el contenido del respaldo. No se puede deshacer.</p>
                  <p className="text-xs text-red-600 mt-2">Si aún no lo has hecho, descarga primero un respaldo del estado actual.</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <BtnGhost onClick={() => setConfirming(false)} className="flex-1 justify-center">Volver</BtnGhost>
                <button onClick={doRestore} className="flex-1 h-10 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition">Sí, restaurar ahora</button>
              </div>
            </div>
          )}
        </Card>
        )}
      </div>
    </div>
  );
}

/* ============================ Shell ============================ */
const NAV = [
  { label: "Dashboard", to: "dashboard", icon: LayoutDashboard },
  { label: "Proyectos", to: "projects", icon: FolderKanban },
  { label: "Clientes", to: "clients", icon: Users },
  { label: "Proveedores", to: "suppliers", icon: Factory },
  { label: "Facturas", to: "invoices", icon: FileText },
  { label: "Presupuestos", to: "quotes", icon: FileClock },
  { label: "Órdenes de compra", to: "purchase-orders", icon: ClipboardList },
  { label: "Compras", to: "purchases", icon: ShoppingCart },
  { label: "Gastos", to: "expenses", icon: Receipt },
  { label: "Otros ingresos", to: "other-income", icon: Coins },
  { label: "Deuda de arrastre", to: "carry-debt", icon: Scale },
  { label: "Préstamos e inversiones", to: "loans", icon: Landmark },
  { label: "Recursos humanos", to: "hr", icon: UserPlus },
  { label: "Informes", to: "reports", icon: TrendingUp },
  { label: "Configuración", to: "settings", icon: SettingsIcon },
  { label: "Usuarios", to: "users", icon: ShieldCheck, master: true },
  { label: "Registro", to: "log", icon: History, master: true },
  { label: "Respaldo", to: "backup", icon: Database },
];

export default function App() {
  const [state, dispatch] = useReducer(reducer, null, () => seed());
  const [route, setRoute] = useState("dashboard");
  const [loaded, setLoaded] = useState(false);
  const [palette, setPalette] = useState(false);
  const [help, setHelp] = useState(false);
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
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); }
      if (e.key === "F1") { e.preventDefault(); setHelp(true); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const go = useCallback((r) => { setRoute(r); setMobileNav(false); }, []);

  // Autenticación y permisos
  const me = (state.appUsers || []).find((u) => u.user_id === state.session?.user_id) || null;
  const isMaster = me?.role === "master";
  const canBackupExport = isMaster || !!me?.can_backup_export;
  const canBackupImport = isMaster || !!me?.can_backup_import;
  const canSee = useCallback((n) => {
    if (n.to === "backup") return canBackupExport || canBackupImport;
    return n.master ? isMaster : (isMaster || (me?.modules || []).includes(n.to));
  }, [isMaster, me, canBackupExport, canBackupImport]);
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
      case "suppliers": return <Suppliers state={state} dispatch={dispatch} />;
      case "invoices": return <Invoices state={state} dispatch={dispatch} />;
      case "quotes": return <Quotes state={state} dispatch={dispatch} />;
      case "purchase-orders": return <PurchaseOrders state={state} dispatch={dispatch} />;
      case "purchases": return <Purchases state={state} dispatch={dispatch} />;
      case "expenses": return <Expenses state={state} dispatch={dispatch} />;
      case "other-income": return <OtherIncome state={state} dispatch={dispatch} />;
      case "carry-debt": return <CarryDebt state={state} dispatch={dispatch} />;
      case "loans": return <LoansInvestments state={state} dispatch={dispatch} />;
      case "hr": return <HR state={state} dispatch={dispatch} />;
      case "reports": return <Reports state={state} />;
      case "settings": return <SettingsPage state={state} dispatch={dispatch} />;
      case "users": return isMaster ? <AppUsers state={state} dispatch={dispatch} me={me} /> : null;
      case "log": return isMaster ? <LogView state={state} /> : null;
      case "backup": return (canBackupExport || canBackupImport) ? <Backup state={state} dispatch={dispatch} me={me} canExport={canBackupExport} canImport={canBackupImport} /> : null;
      default: return null;
    }
  };

  const Sidebar = ({ mobile }) => (
    <aside className={`${mobile ? "w-64" : "w-64 hidden lg:flex"} flex-col shrink-0`} style={{ background: NAVY }}>
      <div className="px-5 py-5 flex items-center gap-3 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 p-1">
          <img src={LOGO_B64} alt="CONSA" className="max-w-full max-h-full object-contain" />
        </div>
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
          <button onClick={() => setHelp(true)} title="Manual de este módulo (F1)"
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-medium transition hover:bg-[#FFF0E0]"
            style={{ borderColor: "#e8c9a3", color: COPPER_DK }}>
            <HelpCircle size={16} /> <span className="hidden sm:inline">Manual</span>
          </button>
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
                {effectiveRoute === "suppliers" && "Registro de proveedores, compliance y matriz de riesgo"}
                {effectiveRoute === "invoices" && "Emisión, estados y cobranza"}
                {effectiveRoute === "quotes" && "Presupuestos y conversión a factura"}
                {effectiveRoute === "purchase-orders" && "Órdenes a proveedores con recepción y PDF"}
                {effectiveRoute === "purchases" && "Compras con separación de IVA crédito"}
                {effectiveRoute === "expenses" && "Gastos operacionales por categoría"}
                {effectiveRoute === "other-income" && "Créditos, asociaciones, venta de activos y otros"}
                {effectiveRoute === "carry-debt" && "Pasivo de consolidación anual"}
                {effectiveRoute === "loans" && "Histórico de préstamos e inversiones a terceros"}
                {effectiveRoute === "hr" && "Trabajadores, liquidaciones y parámetros previsionales"}
                {effectiveRoute === "reports" && "Ingresos, egresos y resultado neto"}
                {effectiveRoute === "settings" && "Empresa, branding y auditoría"}
                {effectiveRoute === "users" && "Gestión de accesos y permisos por módulo"}
                {effectiveRoute === "log" && "Bitácora de todas las gestiones del sistema"}
                {effectiveRoute === "backup" && "Descarga y restauración de la base de datos"}
              </p>
            </div>
            <Page />
          </div>
        </main>
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} go={go} state={state} canSee={canSee} />
      <HelpModal open={help} onClose={() => setHelp(false)} route={effectiveRoute} title={title} />
    </div>
  );
}
