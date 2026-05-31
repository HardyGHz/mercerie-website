import { useState, useEffect, useMemo, useRef } from "react";
import { supabase, LEADS_TABLE, SCRIPTS_TABLE } from "./lib/supabase";
import {
  leads as staticLeads,
  NICHE_LABELS,
  CALL_STATUS_LABELS,
  CALL_STATUS_COLORS,
  type Lead as BaseLead,
  type Niche,
  type CallStatus,
  type Priority,
  type FirstTouch,
} from "./data/leads";

const STORAGE_KEY = "novusolv-crm-states";
const DELETED_KEY = "novusolv-crm-deleted";
const CUSTOM_KEY = "novusolv-crm-custom";
const SCRIPTS_KEY = "novusolv-crm-scripts";

const DEFAULT_SECTION_TITLES = ["Bemutatkozás", "Pitch", "Kifogás kezelés", "Záró"];

interface ScriptSection { id?: string; niche: string; idx: number; title: string; content: string; }
type ScriptsData = Record<string, ScriptSection[]>;

// Database Lead format includes state fields
export interface DbLead extends BaseLead {
  call_status: CallStatus;
  last_call: string;
  callback_date: string;
  callback_time: string;
  is_custom: boolean;
  is_deleted: boolean;
}

const NICHE_COLORS: Record<string, string> = {
  auto: "bg-blue-900/40 text-blue-300 border-blue-700/50",
  construction: "bg-orange-900/40 text-orange-300 border-orange-700/50",
  construction_other: "bg-amber-900/40 text-amber-300 border-amber-700/50",
  logistics: "bg-purple-900/40 text-purple-300 border-purple-700/50",
  spa: "bg-pink-900/40 text-pink-300 border-pink-700/50",
  vet: "bg-teal-900/40 text-teal-300 border-teal-700/50",
  dezmembrari: "bg-red-900/40 text-red-300 border-red-700/50",
};

const PRIORITY_COLORS: Record<string, string> = {
  A: "text-emerald-400 font-bold",
  B: "text-amber-400 font-bold",
  C: "text-zinc-400 font-bold",
  OP: "text-purple-400 font-bold",
  "": "text-zinc-600",
};

const PITCH_DOT: Record<string, string> = {
  Green: "bg-emerald-500",
  Yellow: "bg-amber-400",
  Red: "bg-red-500",
  "": "bg-zinc-700",
};

const ALL_NICHES: Niche[] = ["auto", "construction", "construction_other", "logistics", "spa", "vet", "dezmembrari"];
const ALL_STATUSES: CallStatus[] = ["new", "no_answer", "callback", "interested", "not_interested", "won", "wrong_number"];
const PRIORITY_ORDER: Record<string, number> = { A: 0, B: 1, C: 2, OP: 3, "": 4 };
type SortCol = "priority" | "call_status" | "last_call" | "";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}
function formatHuDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${y}.${m}.${d}`;
}

export default function App() {
  const [leads, setLeads] = useState<DbLead[]>([]);
  const [scripts, setScripts] = useState<ScriptsData>(
    Object.fromEntries(ALL_NICHES.map(n => [n, []]))
  );
  const [loading, setLoading] = useState(true);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterNiche, setFilterNiche] = useState<Niche | "all">("all");
  const [filterStatus, setFilterStatus] = useState<CallStatus | "all">("all");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [filterTouch, setFilterTouch] = useState<"all" | "Email" | "Phone">("all");
  const [filterCallback, setFilterCallback] = useState(false);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState("");
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [emailValue, setEmailValue] = useState("");
  const [editingPhone, setEditingPhone] = useState<string | null>(null);
  const [phoneValue, setPhoneValue] = useState("");
  const [editingCallback, setEditingCallback] = useState<string | null>(null);
  const [callbackDtValue, setCallbackDtValue] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLead, setNewLead] = useState<Partial<DbLead>>({ niche: "auto", priority: "B", first_touch: "Phone", pitch_status: "" });
  const [bulkStatus, setBulkStatus] = useState<CallStatus>("no_answer");
  const [activeTab, setActiveTab] = useState<"leads" | "scripts">("leads");
  const scrollPos = useRef<Record<string, number>>({ leads: 0, scripts: 0 });

  const [scriptNiche, setScriptNiche] = useState<Niche>("auto");
  const [editingSection, setEditingSection] = useState<{ id?: string; idx: number; field: "title" | "content" } | null>(null);
  const [sectionDraft, setSectionDraft] = useState("");
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [leadsRes, scriptsRes] = await Promise.all([
          supabase.from(LEADS_TABLE).select("*"),
      supabase.from(SCRIPTS_TABLE).select("*").order("idx", { ascending: true })
    ]);

    if (leadsRes.error) console.error("Error fetching leads", leadsRes.error);
    if (scriptsRes.error) console.error("Error fetching scripts", scriptsRes.error);

    let dbLeads = leadsRes.data as DbLead[] || [];
    
    // Auto migration if empty
    if (dbLeads.length === 0 && !leadsRes.error) {
      dbLeads = await runMigration();
    }

    setLeads(dbLeads.filter(l => !l.is_deleted));

    const dbScripts = scriptsRes.data as ScriptSection[] || [];
    const groupedScripts: ScriptsData = Object.fromEntries(ALL_NICHES.map(n => [n, []]));
    dbScripts.forEach(s => {
      if (groupedScripts[s.niche]) groupedScripts[s.niche].push(s);
    });
    setScripts(groupedScripts);

    setLoading(false);
  }

  async function runMigration(): Promise<DbLead[]> {
    setMigrating(true);
    try {
      // 1. Read localStorage
      const localStates = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const localDeleted = new Set(JSON.parse(localStorage.getItem(DELETED_KEY) || "[]"));
      const localCustom = JSON.parse(localStorage.getItem(CUSTOM_KEY) || "[]");
      const localScripts = JSON.parse(localStorage.getItem(SCRIPTS_KEY) || "{}");

      // 2. Prepare Leads
      const combinedLeads = [...staticLeads, ...localCustom];
      const leadsToInsert = combinedLeads.map(l => {
        const s = localStates[l.id] || {};
        return {
          id: l.id,
          niche: l.niche,
          priority: l.priority,
          company: l.company,
          city: l.city,
          phone: s.phone || l.phone,
          email: s.email || l.email,
          website: l.website,
          rating: l.rating,
          reviews: l.reviews,
          first_touch: s.touch || l.firstTouch,
          pitch_status: l.pitchStatus,
          outreach_angle: l.outreachAngle,
          call_status: s.callStatus || "new",
          notes: s.notes || "",
          last_call: s.lastCall || "",
          callback_date: s.callbackDate || "",
          callback_time: s.callbackTime || "",
          is_custom: l.id.startsWith("custom_"),
          is_deleted: localDeleted.has(l.id)
        };
      });

      // Insert in chunks to avoid payload limits
      const chunkSize = 100;
      for (let i = 0; i < leadsToInsert.length; i += chunkSize) {
        const chunk = leadsToInsert.slice(i, i + chunkSize);
        await supabase.from(LEADS_TABLE).upsert(chunk);
      }

      // 3. Prepare Scripts
      const scriptsToInsert: Omit<ScriptSection, "id">[] = [];
      ALL_NICHES.forEach(niche => {
        const nicheScripts = localScripts[niche] || DEFAULT_SECTION_TITLES.map(t => ({ title: t, content: "" }));
        nicheScripts.forEach((s: any, idx: number) => {
          scriptsToInsert.push({ niche, idx, title: s.title, content: s.content });
        });
      });
      await supabase.from(SCRIPTS_TABLE).upsert(scriptsToInsert);

      console.log("Migration complete");
      const { data } = await supabase.from(LEADS_TABLE).select("*");
      return data || [];
    } catch (e) {
      console.error("Migration failed", e);
      return [];
    } finally {
      setMigrating(false);
    }
  }

  async function forceSync() {
    if(confirm("Ezzel minden lokális böngésző adat felülírja a felhőben lévő adatokat. Folytatod?")) {
      const data = await runMigration();
      setLeads(data.filter(l => !l.is_deleted));
    }
  }

  function updateLeadLocal(id: string, updates: Partial<DbLead>) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  }

  async function updateLeadDB(id: string, updates: Partial<DbLead>) {
    updateLeadLocal(id, updates);
    const { error } = await supabase.from(LEADS_TABLE).update(updates).eq("id", id);
    if (error) console.error("Error updating lead", error);
  }

  function switchTab(tab: "leads" | "scripts") {
    scrollPos.current[activeTab] = window.scrollY;
    setActiveTab(tab);
  }

  useEffect(() => {
    window.scrollTo(0, scrollPos.current[activeTab] || 0);
  }, [activeTab]);

  async function updateScriptContent(niche: string, idx: number, field: "title" | "content", value: string) {
    const section = scripts[niche][idx];
    if (!section) return;

    setScripts(prev => {
      const next = { ...prev };
      next[niche][idx] = { ...section, [field]: value };
      return next;
    });

    if (section.id) {
      await supabase.from(SCRIPTS_TABLE).update({ [field]: value }).eq("id", section.id);
    } else {
      const { data, error } = await supabase.from(SCRIPTS_TABLE).insert({ niche, idx, title: section.title, content: section.content }).select().single();
      if (data && !error) {
         setScripts(prev => {
            const next = { ...prev };
            next[niche][idx].id = data.id;
            return next;
         });
      }
    }
  }

  async function addSection(niche: string) {
    const idx = scripts[niche].length;
    const newSection = { niche, idx, title: "Új szakasz", content: "" };
    
    setScripts(prev => {
      const next = { ...prev };
      next[niche] = [...next[niche], newSection];
      return next;
    });

    const { data } = await supabase.from(SCRIPTS_TABLE).insert(newSection).select().single();
    if (data) {
      setScripts(prev => {
        const next = { ...prev };
        next[niche][idx].id = data.id;
        return next;
      });
    }

    setEditingSection({ idx, field: "content" });
    setSectionDraft("");
  }

  async function deleteSection(niche: string, idx: number) {
    const section = scripts[niche][idx];
    setScripts(prev => {
      const next = { ...prev };
      next[niche] = next[niche].filter((_, i) => i !== idx);
      return next;
    });
    
    if (section.id) {
      await supabase.from(SCRIPTS_TABLE).delete().eq("id", section.id);
    }
  }

  function updateStatus(id: string, call_status: CallStatus) {
    updateLeadDB(id, { call_status, last_call: new Date().toLocaleDateString("hu-HU") });
  }

  function saveNote(id: string) {
    updateLeadDB(id, { notes: noteValue });
    setEditingNote(null);
  }

  function saveEmail(id: string) {
    updateLeadDB(id, { email: emailValue });
    setEditingEmail(null);
  }

  function savePhone(id: string) {
    updateLeadDB(id, { phone: phoneValue });
    setEditingPhone(null);
  }

  function updateTouch(id: string, first_touch: FirstTouch) {
    updateLeadDB(id, { first_touch });
  }

  function saveCallback(id: string, dt: string) {
    const date = dt.substring(0, 10);
    const time = dt.length > 10 ? dt.substring(11, 16) : "";
    updateLeadDB(id, { callback_date: date, callback_time: time });
    setEditingCallback(null);
  }

  function getCbDtValue(l: DbLead): string {
    if (!l.callback_date) return "";
    return l.callback_date + (l.callback_time ? `T${l.callback_time}` : "T09:00");
  }

  async function bulkDelete() {
    const idsToUpdate = Array.from(selectedIds);
    setLeads(prev => prev.filter(l => !idsToUpdate.includes(l.id)));
    setSelectedIds(new Set());
    
    await supabase.from(LEADS_TABLE).update({ is_deleted: true }).in("id", idsToUpdate);
  }

  async function bulkApplyStatus() {
    const today = new Date().toLocaleDateString("hu-HU");
    const idsToUpdate = Array.from(selectedIds);
    
    setLeads(prev => prev.map(l => idsToUpdate.includes(l.id) ? { ...l, call_status: bulkStatus, last_call: today } : l));
    setSelectedIds(new Set());

    await supabase.from(LEADS_TABLE).update({ call_status: bulkStatus, last_call: today }).in("id", idsToUpdate);
  }

  async function addCustomLead() {
    if (!newLead.company?.trim()) return;
    const lead: DbLead = {
      id: `custom_${Date.now()}`,
      niche: (newLead.niche as Niche) || "auto",
      priority: (newLead.priority as Priority) || "",
      company: newLead.company || "",
      city: newLead.city || "",
      phone: newLead.phone || "",
      email: newLead.email || "",
      website: newLead.website || "",
      rating: "",
      reviews: "",
      first_touch: (newLead.first_touch as "Email" | "Phone" | "") || "",
      pitch_status: (newLead.pitch_status as "Green" | "Yellow" | "Red" | "") || "",
      outreach_angle: newLead.outreach_angle || "",
      call_status: "new",
      notes: newLead.notes || "",
      last_call: "",
      callback_date: "",
      callback_time: "",
      is_custom: true,
      is_deleted: false
    };
    
    setLeads(prev => [...prev, lead]);
    setShowAddModal(false);
    setNewLead({ niche: "auto", priority: "B", first_touch: "Phone", pitch_status: "" });

    await supabase.from(LEADS_TABLE).insert([lead]);
  }

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  }

  const filtered = useMemo(() => {
    const today = todayISO();
    let result = leads.filter(l => {
      if (filterNiche !== "all" && l.niche !== filterNiche) return false;
      if (filterStatus !== "all" && l.call_status !== filterStatus) return false;
      if (filterPriority !== "all" && l.priority !== filterPriority) return false;
      if (filterTouch !== "all" && l.first_touch !== filterTouch) return false;
      if (filterCallback) {
        const cb = l.callback_date || "";
        if (!cb || cb <= today) return false;
      }
      if (search && !l.company.toLowerCase().includes(search.toLowerCase()) && !l.phone.includes(search)) return false;
      return true;
    });

    if (sortCol) {
      result = [...result].sort((a, b) => {
        let av = "", bv = "";
        if (sortCol === "priority") {
          av = String(PRIORITY_ORDER[a.priority] ?? 4);
          bv = String(PRIORITY_ORDER[b.priority] ?? 4);
        } else if (sortCol === "call_status") {
          const order: Record<CallStatus, number> = { new: 0, callback: 1, interested: 2, no_answer: 3, not_interested: 4, won: 5, wrong_number: 6 };
          av = String(order[a.call_status]);
          bv = String(order[b.call_status]);
        } else if (sortCol === "last_call") {
          av = a.last_call || "";
          bv = b.last_call || "";
        }
        const cmp = av.localeCompare(bv);
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [leads, filterNiche, filterStatus, filterPriority, filterTouch, filterCallback, search, sortCol, sortDir]);

  function toggleSelectAll() {
    if (filtered.length > 0 && filtered.every(l => selectedIds.has(l.id))) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filtered.forEach(l => next.delete(l.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filtered.forEach(l => next.add(l.id));
        return next;
      });
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const stats = useMemo(() => {
    const total = leads.length;
    const byStatus: Record<CallStatus, number> = { new: 0, no_answer: 0, callback: 0, interested: 0, not_interested: 0, won: 0, wrong_number: 0 };
    const byNiche: Partial<Record<Niche, number>> = {};
    leads.forEach(l => {
      if(byStatus[l.call_status] !== undefined) byStatus[l.call_status]++;
      byNiche[l.niche] = (byNiche[l.niche] || 0) + 1;
    });
    return { total, byStatus, byNiche };
  }, [leads]);

  const hasFilters = filterNiche !== "all" || filterStatus !== "all" || filterPriority !== "all" || filterTouch !== "all" || search || filterCallback;

  function SortBtn({ col }: { col: Exclude<SortCol, ""> }) {
    const active = sortCol === col;
    return (
      <button onClick={() => handleSort(col)} className="ml-1 text-zinc-600 hover:text-zinc-400 text-[10px]">
        {active ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
      </button>
    );
  }

  if (loading || migrating) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
      {migrating ? "Adatok migrálása Supabase-be..." : "Adatok betöltése..."}
    </div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100" style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace" }}>
      {/* Header */}
      <header className="sticky top-0 z-20 bg-zinc-950 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-xs text-zinc-500 tracking-widest uppercase">Novusolv</span>
            <h1 className="text-xl font-bold tracking-tight text-white mt-0.5">Cold Call Dashboard</h1>
          </div>
          <nav className="flex gap-1">
            {(["leads", "scripts"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => switchTab(tab)}
                className={`px-4 py-1.5 rounded text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab === "leads" ? "Leadek" : "Scriptek"}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {activeTab === "leads" && (
            <button
              onClick={() => setShowAddModal(true)}
              className="text-xs border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-zinc-100 rounded px-3 py-1.5 transition-colors"
            >
              + Lead hozzáadása
            </button>
          )}
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-zinc-500">total lead</div>
          </div>
        </div>
      </header>

      <div className={activeTab === "leads" ? "" : "hidden"}>
      {/* Stats Bar */}
      <div className="border-b border-zinc-800 px-6 py-3 flex gap-3 overflow-x-auto">
        {ALL_STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
            className={`flex flex-col items-center min-w-[80px] px-3 py-2 rounded border transition-all ${
              filterStatus === s ? "border-zinc-500 bg-zinc-800" : "border-zinc-800 hover:border-zinc-700"
            }`}
          >
            <span className="text-xl font-bold">{stats.byStatus[s]}</span>
            <span className="text-[10px] text-zinc-500 mt-0.5 text-center leading-tight">{CALL_STATUS_LABELS[s]}</span>
          </button>
        ))}
        <div className="w-px bg-zinc-800 mx-1 self-stretch" />
        {ALL_NICHES.map(n => (
          <button
            key={n}
            onClick={() => setFilterNiche(filterNiche === n ? "all" : n)}
            className={`flex flex-col items-center min-w-[70px] px-3 py-2 rounded border transition-all ${
              filterNiche === n ? "border-zinc-500 bg-zinc-800" : "border-zinc-800 hover:border-zinc-700"
            }`}
          >
            <span className="text-xl font-bold">{stats.byNiche[n] || 0}</span>
            <span className="text-[10px] text-zinc-500 mt-0.5">{NICHE_LABELS[n]}</span>
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="px-6 py-3 border-b border-zinc-800 flex gap-3 flex-wrap items-center">
        <input
          type="text"
          placeholder="Keresés..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 w-44"
        />
        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value as Priority | "all")}
          className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
        >
          <option value="all">Minden prioritás</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="OP">Other Potential</option>
          <option value="">Nincs</option>
        </select>
        <select
          value={filterTouch}
          onChange={e => setFilterTouch(e.target.value as "all" | "Email" | "Phone")}
          className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
        >
          <option value="all">Email + Telefon</option>
          <option value="Email">Csak Email</option>
          <option value="Phone">Csak Telefon</option>
        </select>
        <button
          onClick={() => setFilterCallback(f => !f)}
          className={`text-xs border rounded px-3 py-1.5 transition-colors ${
            filterCallback
              ? "border-amber-600 bg-amber-900/30 text-amber-300"
              : "border-zinc-700 text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Esedékes visszahívás
        </button>
        {hasFilters && (
          <button
            onClick={() => { setFilterNiche("all"); setFilterStatus("all"); setFilterPriority("all"); setFilterTouch("all"); setSearch(""); setFilterCallback(false); }}
            className="text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-700 rounded px-2 py-1.5 transition-colors"
          >
            Reset
          </button>
        )}
        <span className="text-xs text-zinc-600 ml-auto">{filtered.length} lead</span>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="px-6 py-2 bg-zinc-900 border-b border-zinc-700 flex items-center gap-3">
          <span className="text-xs text-zinc-400 font-bold">{selectedIds.size} kiválasztva</span>
          <div className="flex items-center gap-1">
            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value as CallStatus)}
              className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none"
            >
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>{CALL_STATUS_LABELS[s]}</option>
              ))}
            </select>
            <button
              onClick={bulkApplyStatus}
              className="text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded px-3 py-1 transition-colors"
            >
              Alkalmaz
            </button>
          </div>
          <button
            onClick={bulkDelete}
            className="text-xs border border-red-800 hover:border-red-600 text-red-400 hover:text-red-300 rounded px-3 py-1 transition-colors"
          >
            Törlés
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-zinc-600 hover:text-zinc-400 ml-auto"
          >
            Kijelölés törlése
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] text-zinc-500 uppercase tracking-wider border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
              <th className="px-3 py-2 w-8">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && filtered.every(l => selectedIds.has(l.id))}
                  onChange={toggleSelectAll}
                  className="accent-zinc-400 cursor-pointer"
                />
              </th>
              <th className="text-left px-4 py-2 font-medium">Niche</th>
              <th className="text-left px-2 py-2 font-medium">
                P <SortBtn col="priority" />
              </th>
              <th className="text-left px-4 py-2 font-medium">Cég</th>
              <th className="text-left px-4 py-2 font-medium">Telefon</th>
              <th className="text-left px-4 py-2 font-medium">Email</th>
              <th className="text-left px-4 py-2 font-medium">Website</th>
              <th className="text-left px-2 py-2 font-medium">Touch</th>
              <th className="text-left px-2 py-2 font-medium">Pitch</th>
              <th className="text-left px-4 py-2 font-medium">
                Státusz <SortBtn col="call_status" />
              </th>
              <th className="text-left px-4 py-2 font-medium">Note</th>
              <th className="text-left px-4 py-2 font-medium">
                Hívva <SortBtn col="last_call" />
              </th>
              <th className="text-left px-4 py-2 font-medium">Visszahívás</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(lead => {
              const isSelected = selectedIds.has(lead.id);
              const cbDate = (lead.callback_date || "").substring(0, 10);
              const cbOverdue = cbDate && cbDate <= todayISO();
              return (
                <tr
                  key={lead.id}
                  onClick={() => setActiveLeadId(id => id === lead.id ? null : lead.id)}
                  className={`border-b transition-colors cursor-pointer ${
                    activeLeadId === lead.id
                      ? "border-b-zinc-900 outline outline-1 outline-blue-500 bg-blue-950/30"
                      : isSelected
                      ? "border-b-zinc-900 bg-zinc-800/50"
                      : "border-b-zinc-900 hover:bg-zinc-900/50"
                  }`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(lead.id)}
                      className="accent-zinc-400 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${NICHE_COLORS[lead.niche] || "bg-zinc-800/40 text-zinc-400 border-zinc-700/50"}`}>
                      {NICHE_LABELS[lead.niche] || lead.niche}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <span className={`text-xs ${PRIORITY_COLORS[lead.priority]}`}>{lead.priority || "·"}</span>
                  </td>
                  <td className="px-4 py-2 max-w-[200px]">
                    <div className="font-medium text-zinc-100 truncate" title={lead.company}>{lead.company}</div>
                    {lead.city && <div className="text-[11px] text-zinc-600">{lead.city}</div>}
                  </td>
                  <td className="px-4 py-2 text-xs whitespace-nowrap">
                    {editingPhone === lead.id ? (
                      <div className="flex gap-1">
                        <input
                          autoFocus
                          value={phoneValue}
                          onChange={e => setPhoneValue(e.target.value)}
                          onBlur={() => savePhone(lead.id)}
                          onKeyDown={e => { if (e.key === "Enter") savePhone(lead.id); if (e.key === "Escape") setEditingPhone(null); }}
                          className="bg-zinc-800 border border-zinc-600 rounded px-2 py-0.5 text-xs text-zinc-100 focus:outline-none w-36"
                        />
                        <button onClick={() => savePhone(lead.id)} className="text-xs text-emerald-400 hover:text-emerald-300 px-1">✓</button>
                        <button onClick={() => setEditingPhone(null)} className="text-xs text-zinc-500 hover:text-zinc-300 px-1">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingPhone(lead.id); setPhoneValue(lead.phone); }}
                        className="text-zinc-400 hover:text-zinc-200 text-left"
                      >
                        {lead.phone || <span className="text-zinc-700">—</span>}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs max-w-[220px]">
                    {editingEmail === lead.id ? (
                      <div className="flex gap-1">
                        <input
                          autoFocus
                          value={emailValue}
                          onChange={e => setEmailValue(e.target.value)}
                          onBlur={() => saveEmail(lead.id)}
                          onKeyDown={e => { if (e.key === "Enter") saveEmail(lead.id); if (e.key === "Escape") setEditingEmail(null); }}
                          className="bg-zinc-800 border border-zinc-600 rounded px-2 py-0.5 text-xs text-zinc-100 focus:outline-none w-48"
                        />
                        <button onClick={() => saveEmail(lead.id)} className="text-xs text-emerald-400 hover:text-emerald-300 px-1">✓</button>
                        <button onClick={() => setEditingEmail(null)} className="text-xs text-zinc-500 hover:text-zinc-300 px-1">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingEmail(lead.id); setEmailValue(lead.email); }}
                        className="text-zinc-500 hover:text-zinc-300 truncate max-w-[210px] text-left block w-full"
                      >
                        {lead.email || <span className="text-zinc-700">—</span>}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs whitespace-nowrap">
                    {lead.website
                      ? <a
                          href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 hover:underline"
                        >
                          {lead.website.replace(/^https?:\/\//, "")}
                        </a>
                      : <span className="text-zinc-700">—</span>
                    }
                  </td>
                  <td className="px-2 py-2 text-center">
                    {(() => {
                      const cycle: FirstTouch[] = ["Email", "Phone", "In Person", ""];
                      const current = lead.first_touch;
                      const next = cycle[(cycle.indexOf(current) + 1) % cycle.length];
                      const label: Record<string, string> = { Email: "✉", Phone: "☎", "In Person": "🤝", "": "—" };
                      const color: Record<string, string> = { Email: "text-blue-400", Phone: "text-amber-400", "In Person": "text-emerald-400", "": "text-zinc-700" };
                      return (
                         <button
                           onClick={() => updateTouch(lead.id, next)}
                           title={current || "—"}
                           className={`text-sm hover:opacity-70 transition-opacity ${color[current]}`}
                         >
                           {label[current]}
                         </button>
                      );
                    })()}
                  </td>
                  <td className="px-2 py-2">
                    <div className={`w-2 h-2 rounded-full mx-auto ${PITCH_DOT[lead.pitch_status]}`} title={lead.pitch_status || "N/A"} />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={lead.call_status}
                      onChange={e => updateStatus(lead.id, e.target.value as CallStatus)}
                      className={`text-[11px] px-2 py-1 rounded cursor-pointer focus:outline-none ${CALL_STATUS_COLORS[lead.call_status]}`}
                    >
                      {ALL_STATUSES.map(s => (
                        <option key={s} value={s} className="bg-zinc-900 text-zinc-100">
                          {CALL_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 w-48">
                    {editingNote === lead.id ? (
                      <div className="flex gap-1 items-center">
                        <input
                          autoFocus
                          value={noteValue}
                          onChange={e => setNoteValue(e.target.value)}
                          onBlur={() => saveNote(lead.id)}
                          onKeyDown={e => {
                            if (e.key === "Enter") saveNote(lead.id);
                            if (e.key === "Escape") setEditingNote(null);
                          }}
                          className="bg-zinc-800 border border-zinc-600 rounded px-2 py-0.5 text-xs text-zinc-100 focus:outline-none flex-1 min-w-0"
                        />
                        <button onMouseDown={e => e.preventDefault()} onClick={() => saveNote(lead.id)} className="text-xs text-emerald-400 hover:text-emerald-300 px-1">✓</button>
                        <button onMouseDown={e => e.preventDefault()} onClick={() => setEditingNote(null)} className="text-xs text-zinc-500 hover:text-zinc-300 px-1">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingNote(lead.id); setNoteValue(lead.notes); }}
                        className="text-xs text-zinc-500 hover:text-zinc-300 truncate max-w-[140px] text-left block w-full"
                      >
                        {lead.notes || <span className="text-zinc-700 italic">+ note</span>}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2 text-[11px] text-zinc-600 whitespace-nowrap">
                    {lead.last_call || "—"}
                  </td>
                  <td className="px-4 py-2 text-[11px] whitespace-nowrap">
                    {editingCallback === lead.id ? (
                      <input
                        autoFocus
                        type="datetime-local"
                        value={callbackDtValue}
                        onChange={e => setCallbackDtValue(e.target.value)}
                        onBlur={() => saveCallback(lead.id, callbackDtValue)}
                        onKeyDown={e => {
                          if (e.key === "Enter") saveCallback(lead.id, callbackDtValue);
                          if (e.key === "Escape") setEditingCallback(null);
                        }}
                        className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-zinc-400 [color-scheme:dark]"
                      />
                    ) : (
                      <button
                        onClick={() => { setEditingCallback(lead.id); setCallbackDtValue(getCbDtValue(lead)); }}
                        className={`${cbOverdue ? "text-amber-400" : cbDate ? "text-zinc-400" : "text-zinc-700"} hover:text-zinc-300`}
                      >
                        {cbDate ? `${formatHuDate(cbDate)}${lead.callback_time ? ` ${lead.callback_time}` : ""}` : "—"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-zinc-600">Nincs találat.</div>
        )}
      </div>
      </div>

      {/* Scripts Tab */}
      <div className={activeTab === "scripts" ? "flex" : "hidden"} style={{ height: "calc(100vh - 73px)" }}>
          {/* Niche Sidebar */}
          <div className="w-44 border-r border-zinc-800 flex flex-col gap-1 p-3 overflow-y-auto shrink-0">
            {ALL_NICHES.map(n => (
              <button
                key={n}
                onClick={() => { setScriptNiche(n); setEditingSection(null); }}
                className={`text-left px-3 py-2 rounded transition-colors ${
                  scriptNiche === n ? "bg-zinc-800" : "hover:bg-zinc-900"
                }`}
              >
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${NICHE_COLORS[n]}`}>
                  {NICHE_LABELS[n]}
                </span>
              </button>
            ))}
          </div>

          {/* Script Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-5">
              {scripts[scriptNiche]?.map((section, idx) => (
                <div key={idx} className="border border-zinc-800 rounded-lg overflow-hidden">
                  {/* Section Title */}
                  <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
                    {editingSection?.idx === idx && editingSection?.field === "title" ? (
                      <input
                        autoFocus
                        value={sectionDraft}
                        onChange={e => setSectionDraft(e.target.value)}
                        onBlur={() => { updateScriptContent(scriptNiche, idx, "title", sectionDraft); setEditingSection(null); }}
                        onKeyDown={e => {
                          if (e.key === "Enter" || e.key === "Escape") {
                            updateScriptContent(scriptNiche, idx, "title", sectionDraft);
                            setEditingSection(null);
                          }
                        }}
                        className="bg-transparent text-sm font-bold text-zinc-300 uppercase tracking-wider focus:outline-none flex-1"
                      />
                    ) : (
                      <button
                        onClick={() => { setEditingSection({ idx, field: "title" }); setSectionDraft(section.title); }}
                        className="text-sm font-bold text-zinc-400 uppercase tracking-wider hover:text-zinc-200 text-left"
                      >
                        {section.title}
                      </button>
                    )}
                    <button
                      onClick={() => deleteSection(scriptNiche, idx)}
                      className="text-zinc-700 hover:text-red-400 text-xs ml-4 transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Section Content */}
                  {editingSection?.idx === idx && editingSection?.field === "content" ? (
                    <textarea
                      autoFocus
                      value={sectionDraft}
                      onChange={e => setSectionDraft(e.target.value)}
                      onBlur={() => { updateScriptContent(scriptNiche, idx, "content", sectionDraft); setEditingSection(null); }}
                      onKeyDown={e => {
                        if (e.key === "Escape") {
                          updateScriptContent(scriptNiche, idx, "content", sectionDraft);
                          setEditingSection(null);
                        }
                      }}
                      className="w-full bg-zinc-900 text-zinc-300 p-4 min-h-[120px] focus:outline-none resize-y"
                    />
                  ) : (
                    <div
                      onClick={() => { setEditingSection({ idx, field: "content" }); setSectionDraft(section.content); }}
                      className="p-4 bg-zinc-950 text-zinc-300 min-h-[80px] whitespace-pre-wrap cursor-text hover:bg-zinc-900/50 transition-colors"
                    >
                      {section.content || <span className="text-zinc-700 italic">Kattints a szerkesztéshez...</span>}
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={() => addSection(scriptNiche)}
                className="w-full py-3 border border-dashed border-zinc-800 text-zinc-600 hover:text-zinc-400 hover:border-zinc-600 rounded-lg transition-colors text-sm"
              >
                + Új szakasz
              </button>
            </div>
          </div>
        </div>

        {/* Add Lead Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md shadow-2xl">
              <h2 className="text-lg font-bold mb-4">Új lead hozzáadása</h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[11px] text-zinc-500 uppercase block mb-1">Niche</label>
                    <select
                      value={newLead.niche}
                      onChange={e => setNewLead({...newLead, niche: e.target.value as Niche})}
                      className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-1.5 text-sm"
                    >
                      {ALL_NICHES.map(n => <option key={n} value={n}>{NICHE_LABELS[n]}</option>)}
                    </select>
                  </div>
                  <div className="w-32">
                    <label className="text-[11px] text-zinc-500 uppercase block mb-1">Prioritás</label>
                    <select
                      value={newLead.priority}
                      onChange={e => setNewLead({...newLead, priority: e.target.value as Priority})}
                      className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-1.5 text-sm"
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="OP">OP</option>
                      <option value="">Nincs</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 uppercase block mb-1">Cégnév</label>
                  <input
                    value={newLead.company || ""}
                    onChange={e => setNewLead({...newLead, company: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-zinc-400"
                    placeholder="Pl. Kovács Kft."
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[11px] text-zinc-500 uppercase block mb-1">Város</label>
                    <input
                      value={newLead.city || ""}
                      onChange={e => setNewLead({...newLead, city: e.target.value})}
                      className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-zinc-400"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] text-zinc-500 uppercase block mb-1">Telefon</label>
                    <input
                      value={newLead.phone || ""}
                      onChange={e => setNewLead({...newLead, phone: e.target.value})}
                      className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-zinc-400"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[11px] text-zinc-500 uppercase block mb-1">Email</label>
                    <input
                      value={newLead.email || ""}
                      onChange={e => setNewLead({...newLead, email: e.target.value})}
                      className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-zinc-400"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] text-zinc-500 uppercase block mb-1">Weboldal</label>
                    <input
                      value={newLead.website || ""}
                      onChange={e => setNewLead({...newLead, website: e.target.value})}
                      className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-zinc-400"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
                  >
                    Mégse
                  </button>
                  <button
                    onClick={addCustomLead}
                    disabled={!newLead.company?.trim()}
                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50"
                  >
                    Hozzáadás
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
