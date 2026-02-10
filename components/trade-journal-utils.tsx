"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, Plus, TrendingUp, BookOpen, Sparkles, X, Download, Upload, Trash2, Copy } from "lucide-react";

const STORAGE_KEY = "dozzy_trade_journal_v1";

function uid() {
    return Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
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
}

interface Strategy {
    id: string; name: string; summary: string; trigger: string; confirmation: string;
    riskRules: string; execution: string; avoid: string; examples: string; tags: string[];
    isTop: boolean; createdAtISO: string; updatedAtISO: string;
}

interface AppState { entries: TradeEntry[]; strategies: Strategy[]; settings: { currency: string }; }

function defaultState(): AppState {
    return {
        entries: [],
        strategies: [{
            id: uid(), name: "Volatility Spike Fade (example)",
            summary: "A simple example: after an exaggerated move, wait for exhaustion and fade back to mean.",
            trigger: "A sudden spike that stretches 2–3 candles beyond recent range.",
            confirmation: "Momentum slows + wick rejection + volume/tempo reduces (whatever you use).",
            riskRules: "1–2 entries max. If second entry fails, stop. Never chase.",
            execution: "Enter on the first clear rejection. Keep stake consistent.",
            avoid: "Avoid during major news spikes or when the market is trending hard.",
            examples: "Write your best examples here: what you saw, why it worked.",
            tags: ["mean-reversion", "patience"], isTop: true,
            createdAtISO: toISO(Date.now()), updatedAtISO: toISO(Date.now()),
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
        })),
        settings: { currency: typeof settings.currency === "string" && settings.currency.length <= 4 ? settings.currency : "$" },
    };
}

function useLocalState(): [AppState, React.Dispatch<React.SetStateAction<AppState>>] {
    const [state, setState] = useState<AppState>(() => {
        if (typeof window === "undefined") return defaultState();
        const raw = safeParseJSON(localStorage.getItem(STORAGE_KEY) || "");
        return validateState(raw);
    });
    useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);
    return [state, setState];
}

function splitTags(raw: string) { return raw.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 20); }
function statColorClass(n: number) { if (n > 0) return "text-emerald-600"; if (n < 0) return "text-rose-600"; return "text-slate-600"; }
function Pill({ children }: { children: React.ReactNode }) { return <span className="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-700 border border-slate-200">{children}</span>; }
function outcomeFromProfit(profit: string | number) { const p = clampNum(profit, 0); if (p > 0) return "Win"; if (p < 0) return "Loss"; return "BE"; }
function computeProfit(stake: number, payout: number) { return clampNum(payout, 0) - clampNum(stake, 0); }
function smallDate(iso: string) { const d = new Date(iso); if (Number.isNaN(d.getTime())) return ""; return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }); }

function EmptyState({ title, hint, action }: { title: string; hint: string; action?: React.ReactNode }) {
    return (<div className="py-10 text-center"><div className="mx-auto max-w-md">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200"><Sparkles className="w-5 h-5" /></div>
        <div className="mt-4 text-lg font-semibold">{title}</div><div className="mt-1 text-sm text-slate-600">{hint}</div>
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div></div>);
}

function FileButton({ onFile, accept, children }: { onFile: (f: File) => void; accept: string; children: React.ReactNode }) {
    const ref = useRef<HTMLInputElement>(null);
    return (<><input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; onFile(file); e.target.value = ""; }} />
        <Button variant="outline" onClick={() => { ref.current?.click?.(); }}>{children}</Button></>);
}

function TopBar({ currency, onCurrency, onExport, onImport, onWipe }: { currency: string; onCurrency: (c: string) => void; onExport: () => void; onImport: (f: File) => void; onWipe: () => void }) {
    return (<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div>
        <div className="text-2xl font-semibold tracking-tight">Derived Options Trade Journal</div>
        <div className="text-sm text-slate-600">Log Rise/Fall & Touched trades. Save what you saw. Build a profitable strategy library.</div></div>
        <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2"><Label className="text-xs text-slate-600">Currency</Label><Input value={currency} onChange={(e) => onCurrency(e.target.value)} className="w-16" /></div>
            <Button variant="outline" onClick={onExport} className="gap-2"><Download className="w-4 h-4" />Export</Button>
            <FileButton accept="application/json" onFile={onImport}><span className="inline-flex items-center gap-2"><Upload className="w-4 h-4" />Import</span></FileButton>
            <Button variant="destructive" onClick={onWipe} className="gap-2"><Trash2 className="w-4 h-4" />Wipe</Button>
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

export { uid, clampNum, toISO, formatMoney, splitTags, statColorClass, Pill, EmptyState, FileButton, smallDate, outcomeFromProfit, computeProfit, TopBar, StatsStrip, useLocalState, defaultState, safeParseJSON, validateState, STORAGE_KEY };
export type { TradeEntry, Strategy, AppState, TradeScreenshot };
