"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Download, Upload, Trash2, Sun, Moon } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useTheme } from "next-themes";

const STORAGE_KEY = "dozzy_trade_journal_v1";

function uid() {
    // Generate valid UUID v4 for Supabase compatibility
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
}

function clampNum(n: unknown, fallback = 0) {
    const x = Number(n);
    return Number.isFinite(x) ? x : fallback;
}

function toISO(d: number | string | Date) {
    return new Date(d).toISOString();
}

function formatMoney(amount: number, currency: string) {
    const val = clampNum(amount, 0);
    return `${currency} ${val.toFixed(2)}`;
}

interface TradeScreenshot { name: string; dataUrl: string; }

interface TradeEntry {
    id: string; title: string; tradeType: "R_F" | "TOUCHED"; market: string; timeframe: string;
    direction: "Rise" | "Fall" | "N/A"; stake: number; payout: number; profit: number;
    outcome: "Win" | "Loss" | "BE"; entryTimeISO: string; notes: string; whatISaw: string;
    whatWorked: string; whatDidnt: string; tags: string[]; strategyId?: string;
    screenshots?: TradeScreenshot[]; createdAtISO: string; updatedAtISO: string;
    confidence: number;
}

interface Strategy {
    id: string; name: string; summary: string; trigger: string; confirmation: string;
    riskRules: string; execution: string; avoid: string; examples: string; tags: string[];
    isTop: boolean; createdAtISO: string; updatedAtISO: string;
    exampleImages: string[];
}

interface AppState { entries: TradeEntry[]; strategies: Strategy[]; settings: { currency: string }; }

function defaultState(): AppState {
    return {
        entries: [],
        strategies: [{
            id: uid(), name: "Volatility Spike Fade (example)",
            summary: "A simple example: after an exaggerated move, wait for exhaustion and fade back to mean.",
            trigger: "A sudden spike that stretches 2–3 candles beyond recent range.",
            confirmation: "Momentum slows + wick rejection + volume/tempo reduces.",
            riskRules: "1–2 entries max. If second entry fails, stop.",
            execution: "Enter on the first clear rejection.",
            avoid: "Avoid during major news spikes.",
            examples: "Write your best examples here.",
            tags: ["mean-reversion", "patience"], isTop: true,
            createdAtISO: toISO(Date.now()), updatedAtISO: toISO(Date.now()),
            exampleImages: [],
        }],
        settings: { currency: "$" },
    };
}

function safeParseJSON(str: string) { try { return JSON.parse(str); } catch { return null; } }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateState(raw: any): AppState {
    if (!raw || typeof raw !== "object") return defaultState();
    const state = defaultState();
    const entries = Array.isArray(raw.entries) ? raw.entries : [];
    const strategies = Array.isArray(raw.strategies) ? raw.strategies : state.strategies;
    const settings = raw.settings && typeof raw.settings === "object" ? raw.settings : state.settings;
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        entries: entries.map((e: any) => ({
            id: String(e.id ?? uid()), title: String(e.title ?? ""),
            tradeType: e.tradeType === "TOUCHED" ? "TOUCHED" : "R_F",
            market: String(e.market ?? ""), timeframe: String(e.timeframe ?? ""),
            direction: e.direction === "Rise" || e.direction === "Fall" ? e.direction : "N/A",
            stake: clampNum(e.stake, 0), payout: clampNum(e.payout, 0), profit: clampNum(e.profit, 0),
            outcome: e.outcome === "Win" || e.outcome === "Loss" || e.outcome === "BE" ? e.outcome : "BE",
            entryTimeISO: String(e.entryTimeISO ?? toISO(Date.now())), notes: String(e.notes ?? ""),
            whatISaw: String(e.whatISaw ?? ""), whatWorked: String(e.whatWorked ?? ""),
            whatDidnt: String(e.whatDidnt ?? ""),
            tags: Array.isArray(e.tags) ? e.tags.map(String) : [],
            strategyId: e.strategyId ? String(e.strategyId) : undefined,
            screenshots: Array.isArray(e.screenshots)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ? e.screenshots.filter((s: any) => s && typeof s === "object")
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .map((s: any) => ({ name: String(s.name ?? "image"), dataUrl: String(s.dataUrl ?? "") }))
                    .filter((s: TradeScreenshot) => s.dataUrl.startsWith("data:image"))
                : [],
            createdAtISO: String(e.createdAtISO ?? toISO(Date.now())),
            updatedAtISO: String(e.updatedAtISO ?? toISO(Date.now())),
            confidence: Math.max(1, Math.min(5, clampNum(e.confidence, 3))),
        })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        strategies: strategies.map((s: any) => ({
            id: String(s.id ?? uid()), name: String(s.name ?? "Untitled strategy"),
            summary: String(s.summary ?? ""), trigger: String(s.trigger ?? ""),
            confirmation: String(s.confirmation ?? ""), riskRules: String(s.riskRules ?? ""),
            execution: String(s.execution ?? ""), avoid: String(s.avoid ?? ""),
            examples: String(s.examples ?? ""),
            tags: Array.isArray(s.tags) ? s.tags.map(String) : [], isTop: Boolean(s.isTop),
            createdAtISO: String(s.createdAtISO ?? toISO(Date.now())),
            updatedAtISO: String(s.updatedAtISO ?? toISO(Date.now())),
            exampleImages: Array.isArray(s.exampleImages) ? s.exampleImages.filter((u: unknown) => typeof u === "string" && String(u).startsWith("http")) : [],
        })),
        settings: { currency: typeof settings.currency === "string" && settings.currency.length <= 4 ? settings.currency : "$" },
    };
}

// Map frontend camelCase to DB snake_case
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEntryToDB(e: TradeEntry): any {
    return {
        id: e.id, title: e.title, trade_type: e.tradeType, market: e.market, timeframe: e.timeframe,
        direction: e.direction, stake: e.stake, payout: e.payout, profit: e.profit, outcome: e.outcome,
        entry_time_iso: e.entryTimeISO, notes: e.notes, what_i_saw: e.whatISaw, what_worked: e.whatWorked,
        what_didnt: e.whatDidnt, tags: e.tags, strategy_id: e.strategyId || null,
        screenshots: e.screenshots, confidence: e.confidence, created_at: e.createdAtISO, updated_at: e.updatedAtISO
    };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDBToEntry(d: any): TradeEntry {
    return {
        id: d.id, title: d.title, tradeType: d.trade_type, market: d.market, timeframe: d.timeframe,
        direction: d.direction, stake: Number(d.stake), payout: Number(d.payout), profit: Number(d.profit),
        outcome: d.outcome, entryTimeISO: d.entry_time_iso, notes: d.notes, whatISaw: d.what_i_saw,
        whatWorked: d.what_worked, whatDidnt: d.what_didnt, tags: d.tags || [],
        strategyId: d.strategy_id || undefined, screenshots: d.screenshots || [],
        confidence: d.confidence || 3, createdAtISO: d.created_at, updatedAtISO: d.updated_at
    };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapStrategyToDB(s: Strategy): any {
    return {
        id: s.id, name: s.name, summary: s.summary, trigger: s.trigger, confirmation: s.confirmation,
        risk_rules: s.riskRules, execution: s.execution, avoid: s.avoid, examples: s.examples, tags: s.tags,
        is_top: s.isTop, created_at: s.createdAtISO, updated_at: s.updatedAtISO,
        example_images: s.exampleImages || []
    };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDBToStrategy(d: any): Strategy {
    return {
        id: d.id, name: d.name, summary: d.summary, trigger: d.trigger, confirmation: d.confirmation,
        riskRules: d.risk_rules, execution: d.execution, avoid: d.avoid, examples: d.examples, tags: d.tags || [],
        isTop: d.is_top, createdAtISO: d.created_at, updatedAtISO: d.updated_at,
        exampleImages: d.example_images || []
    };
}

// New Hook: Sync with Supabase (fallbacks to local state if offline or initially)
function useSupabaseSync(): {
    state: AppState;
    loading: boolean;
    saveEntry: (e: TradeEntry) => Promise<void>;
    deleteEntry: (id: string) => Promise<void>;
    saveStrategy: (s: Strategy) => Promise<void>;
    deleteStrategy: (id: string) => Promise<void>;
    updateCurrency: (c: string) => Promise<void>;
    wipeAll: () => Promise<void>;
} {
    const [state, setState] = useState<AppState>(defaultState());
    const [loading, setLoading] = useState(true);
    const [settingsId, setSettingsId] = useState<string | null>(null);

    // Initial Fetch
    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                // Load Settings
                const { data: setRows } = await supabase.from("settings").select("*").limit(1);
                const currency = setRows?.[0]?.currency || "$";
                const tempSettingsId = setRows?.[0]?.id;
                if (!tempSettingsId) {
                    // Create default settings row if missing
                    const { data: newRow } = await supabase.from("settings").insert([{ currency: "$" }]).select().single();
                    if (newRow) setSettingsId(newRow.id);
                } else {
                    setSettingsId(tempSettingsId);
                }

                // Load Strategies
                const { data: stratRows } = await supabase.from("strategies").select("*");
                const strategies = (stratRows || []).map(mapDBToStrategy);

                // Load Trades
                const { data: tradeRows } = await supabase.from("trades").select("*").order("entry_time_iso", { ascending: false });
                const entries = (tradeRows || []).map(mapDBToEntry);

                setState({ entries, strategies, settings: { currency } });
            } catch (err) {
                console.error("Supabase load error:", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const saveEntry = async (e: TradeEntry) => {
        // Optimistic update
        setState((prev) => {
            const exists = prev.entries.some((x) => x.id === e.id);
            return {
                ...prev,
                entries: exists ? prev.entries.map((x) => (x.id === e.id ? e : x)) : [e, ...prev.entries],
            };
        });
        // DB update
        await supabase.from("trades").upsert(mapEntryToDB(e));
    };

    const deleteEntry = async (id: string) => {
        setState((prev) => ({ ...prev, entries: prev.entries.filter((e) => e.id !== id) }));
        await supabase.from("trades").delete().eq("id", id);
    };

    const saveStrategy = async (s: Strategy) => {
        setState((prev) => {
            const exists = prev.strategies.some((x) => x.id === s.id);
            return {
                ...prev,
                strategies: exists ? prev.strategies.map((x) => (x.id === s.id ? s : x)) : [s, ...prev.strategies],
            };
        });
        await supabase.from("strategies").upsert(mapStrategyToDB(s));
    };

    const deleteStrategy = async (id: string) => {
        setState((prev) => ({
            ...prev,
            strategies: prev.strategies.filter((s) => s.id !== id),
            entries: prev.entries.map((e) => (e.strategyId === id ? { ...e, strategyId: undefined } : e)),
        }));
        await supabase.from("strategies").delete().eq("id", id);
        // Also update linked trades to remove strategy_id
        await supabase.from("trades").update({ strategy_id: null }).eq("strategy_id", id);
    };

    const updateCurrency = async (c: string) => {
        setState((prev) => ({ ...prev, settings: { ...prev.settings, currency: c } }));
        if (settingsId) {
            await supabase.from("settings").update({ currency: c }).eq("id", settingsId);
        }
    };

    const wipeAll = async () => {
        const ok = window.confirm("This will Delete ALL data from the Cloud Database. Irreversible!");
        if (!ok) return;
        setState(defaultState());
        await supabase.from("trades").delete().neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all
        await supabase.from("strategies").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    };

    return { state, loading, saveEntry, deleteEntry, saveStrategy, deleteStrategy, updateCurrency, wipeAll };
}

async function uploadStrategyImage(strategyId: string, file: File): Promise<string | null> {
    const ext = file.name.split(".").pop() || "png";
    const path = `${strategyId}/${Date.now()}_${Math.random().toString(16).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("strategy-examples").upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) { console.error("Upload error:", error); return null; }
    const { data: urlData } = supabase.storage.from("strategy-examples").getPublicUrl(path);
    return urlData?.publicUrl || null;
}

async function deleteStrategyImage(url: string): Promise<void> {
    // Extract path from public URL
    const marker = "/storage/v1/object/public/strategy-examples/";
    const idx = url.indexOf(marker);
    if (idx === -1) return;
    const path = decodeURIComponent(url.slice(idx + marker.length));
    await supabase.storage.from("strategy-examples").remove([path]);
}

function splitTags(raw: string) { return raw.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 20); }
function statColorClass(n: number) { if (n > 0) return "text-emerald-600"; if (n < 0) return "text-rose-600"; return "text-slate-600"; }
function Pill({ children }: { children: React.ReactNode }) { return <span className="px-2 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">{children}</span>; }
function outcomeFromProfit(profit: string | number) { const p = clampNum(profit, 0); if (p > 0) return "Win"; if (p < 0) return "Loss"; return "BE"; }
function computeProfit(stake: number, payout: number) { return clampNum(payout, 0) - clampNum(stake, 0); }
function smallDate(iso: string) { const d = new Date(iso); if (Number.isNaN(d.getTime())) return ""; return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }); }

function EmptyState({ title, hint, action }: { title: string; hint: string; action?: React.ReactNode }) {
    return (<div className="py-10 text-center"><div className="mx-auto max-w-md">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700"><Sparkles className="w-5 h-5" /></div>
        <div className="mt-4 text-lg font-semibold">{title}</div><div className="mt-1 text-sm text-muted-foreground">{hint}</div>
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div></div>);
}

function FileButton({ onFile, accept, children }: { onFile: (f: File) => void; accept: string; children: React.ReactNode }) {
    const ref = useRef<HTMLInputElement>(null);
    return (<><input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; onFile(file); e.target.value = ""; }} />
        <Button variant="outline" onClick={() => { ref.current?.click?.(); }}>{children}</Button></>);
}

function Stars({ value = 0 }: { value?: number }) {
    const v = Math.max(0, Math.min(5, Number(value) || 0));
    return (
        <span className="inline-flex items-center gap-0.5" aria-label={`Confidence ${v} out of 5`}>
            {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={i < v ? "text-amber-500 dark:text-amber-400 text-sm" : "text-slate-300 dark:text-slate-600 text-sm"}>★</span>
            ))}
        </span>
    );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    const v = Math.max(1, Math.min(5, Number(value) || 3));
    return (
        <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => {
                    const n = i + 1; const active = n <= v;
                    return (
                        <button type="button" key={n} onClick={() => onChange(n)} className={"rounded-full px-2 py-1 border text-sm transition " + (active ? "border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300")} title={`${n}/5`}>★</button>
                    );
                })}
            </div>
            <span className="text-xs text-muted-foreground">{v}/5</span>
        </div>
    );
}

function TopBar({ currency, onCurrency, onExport, onImport, onWipe }: { currency: string; onCurrency: (c: string) => void; onExport: () => void; onImport: (f: File) => void; onWipe: () => void }) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    return (<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div>
        <div className="text-2xl font-semibold tracking-tight">Derived Options Trade Journal</div>
        <div className="text-sm text-muted-foreground">Syncing with Cloud Database ☁️</div></div>
        <div className="flex flex-wrap gap-2 items-center">
            {mounted && (
                <Button variant="outline" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Toggle theme">
                    {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
            )}
            <div className="flex items-center gap-2"><Label className="text-xs text-muted-foreground">Currency</Label><Input value={currency} onChange={(e) => onCurrency(e.target.value)} className="w-16" /></div>
            <Button variant="outline" onClick={onExport} className="gap-2"><Download className="w-4 h-4" />Export JSON</Button>
            <FileButton accept="application/json" onFile={onImport}><span className="inline-flex items-center gap-2"><Upload className="w-4 h-4" />Import JSON</span></FileButton>
            <Button variant="destructive" onClick={onWipe} className="gap-2"><Trash2 className="w-4 h-4" />Wipe Cloud</Button>
        </div></div>);
}

function StatsStrip({ entries, currency }: { entries: TradeEntry[]; currency: string }) {
    const stats = useMemo(() => {
        const total = entries.length; const wins = entries.filter((e) => e.outcome === "Win").length;
        const losses = entries.filter((e) => e.outcome === "Loss").length; const be = entries.filter((e) => e.outcome === "BE").length;
        const profitSum = entries.reduce((a, e) => a + clampNum(e.profit, 0), 0);
        const stakeSum = entries.reduce((a, e) => a + clampNum(e.stake, 0), 0);
        const roi = stakeSum > 0 ? (profitSum / stakeSum) * 100 : 0;
        const recent = [...entries].sort((a, b) => new Date(b.entryTimeISO).getTime() - new Date(a.entryTimeISO).getTime()).slice(0, 20);
        const recentProfit = recent.reduce((a, e) => a + clampNum(e.profit, 0), 0);
        return { total, wins, losses, be, profitSum, roi, recentProfit };
    }, [entries]);
    return (<div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="rounded-2xl"><CardHeader className="py-4"><CardTitle className="text-xs text-slate-600 font-medium">Total trades</CardTitle></CardHeader><CardContent className="pb-4"><div className="text-2xl font-semibold">{stats.total}</div></CardContent></Card>
        <Card className="rounded-2xl"><CardHeader className="py-4"><CardTitle className="text-xs text-slate-600 font-medium">Wins</CardTitle></CardHeader><CardContent className="pb-4"><div className="text-2xl font-semibold text-emerald-600">{stats.wins}</div></CardContent></Card>
        <Card className="rounded-2xl"><CardHeader className="py-4"><CardTitle className="text-xs text-slate-600 font-medium">Losses</CardTitle></CardHeader><CardContent className="pb-4"><div className="text-2xl font-semibold text-rose-600">{stats.losses}</div></CardContent></Card>
        <Card className="rounded-2xl"><CardHeader className="py-4"><CardTitle className="text-xs text-slate-600 font-medium">Break-even</CardTitle></CardHeader><CardContent className="pb-4"><div className="text-2xl font-semibold text-slate-700">{stats.be}</div></CardContent></Card>
        <Card className="rounded-2xl"><CardHeader className="py-4"><CardTitle className="text-xs text-slate-600 font-medium">Net P/L</CardTitle></CardHeader><CardContent className="pb-4"><div className={`text-2xl font-semibold ${statColorClass(stats.profitSum)}`}>{formatMoney(stats.profitSum, currency)}</div></CardContent></Card>
        <Card className="rounded-2xl"><CardHeader className="py-4"><CardTitle className="text-xs text-slate-600 font-medium">ROI</CardTitle></CardHeader><CardContent className="pb-4"><div className={`text-2xl font-semibold ${statColorClass(stats.roi)}`}>{stats.roi.toFixed(1)}%</div><div className="text-xs text-slate-500 mt-1">Last 20 trades P/L: <span className={statColorClass(stats.recentProfit)}>{formatMoney(stats.recentProfit, currency)}</span></div></CardContent></Card>
    </div>);
}

export { uid, clampNum, toISO, formatMoney, splitTags, statColorClass, Pill, Stars, StarPicker, EmptyState, FileButton, smallDate, outcomeFromProfit, computeProfit, TopBar, StatsStrip, useSupabaseSync, defaultState, safeParseJSON, validateState, STORAGE_KEY, uploadStrategyImage, deleteStrategyImage };
export type { TradeEntry, Strategy, AppState, TradeScreenshot };
