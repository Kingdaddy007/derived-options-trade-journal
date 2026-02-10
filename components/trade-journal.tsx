"use client";

import React, { useMemo, useState } from "react";
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
import { Search, Plus, TrendingUp, BookOpen, Copy } from "lucide-react";
import {
    uid, clampNum, toISO, formatMoney, splitTags, statColorClass, Pill,
    EmptyState, FileButton, smallDate, outcomeFromProfit, computeProfit, TopBar, StatsStrip, useLocalState,
    defaultState, validateState, safeParseJSON, Stars, StarPicker
} from "@/components/trade-journal-utils";
import type { TradeEntry, Strategy, TradeScreenshot } from "@/components/trade-journal-utils";
import { useEffect } from "react";
import { Upload, X } from "lucide-react";

function EntryForm({ strategies, currency, initial, onSave, onCancel }: {
    strategies: Strategy[]; currency: string; initial: TradeEntry | null; onSave: (e: TradeEntry) => void; onCancel: () => void;
}) {
    const isEdit = Boolean(initial?.id);
    const [title, setTitle] = useState(initial?.title ?? "");
    const [tradeType, setTradeType] = useState<"R_F" | "TOUCHED">(initial?.tradeType ?? "R_F");
    const [market, setMarket] = useState(initial?.market ?? "Volatility 75");
    const [timeframe, setTimeframe] = useState(initial?.timeframe ?? "1m");
    const [direction, setDirection] = useState<"Rise" | "Fall">(initial?.direction === "Fall" ? "Fall" : "Rise");
    const [stake, setStake] = useState(String(initial?.stake ?? ""));
    const [payout, setPayout] = useState(String(initial?.payout ?? ""));
    const [profit, setProfit] = useState(String(initial?.profit ?? ""));
    const [entryTimeISO, setEntryTimeISO] = useState(() => {
        const iso = initial?.entryTimeISO;
        const d = iso ? new Date(iso) : new Date();
        const pad = (n: number) => String(n).padStart(2, "0");
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
        return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
    });
    const [tagsRaw, setTagsRaw] = useState((initial?.tags ?? []).join(", "));
    const [strategyId, setStrategyId] = useState(initial?.strategyId ?? "");
    const [notes, setNotes] = useState(initial?.notes ?? "");
    const [whatISaw, setWhatISaw] = useState(initial?.whatISaw ?? "");
    const [whatWorked, setWhatWorked] = useState(initial?.whatWorked ?? "");
    const [whatDidnt, setWhatDidnt] = useState(initial?.whatDidnt ?? "");
    const [screenshots, setScreenshots] = useState<TradeScreenshot[]>(initial?.screenshots ?? []);
    const [confidence, setConfidence] = useState(() => Math.max(1, Math.min(5, clampNum(initial?.confidence, 3))));
    const [autoCalc, setAutoCalc] = useState(true);

    useEffect(() => {
        if (!autoCalc) return;
        const p = computeProfit(clampNum(stake, 0), clampNum(payout, 0));
        setProfit(String(p));
    }, [stake, payout, autoCalc]);

    const outcome = outcomeFromProfit(profit);

    const addScreenshot = async (file: File) => {
        if (!file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = String(reader.result || "");
            if (!dataUrl.startsWith("data:image")) return;
            setScreenshots((prev) => [{ name: file.name, dataUrl }, ...prev].slice(0, 6));
        };
        reader.readAsDataURL(file);
    };

    const removeShot = (name: string) => { setScreenshots((prev) => prev.filter((s) => s.name !== name)); };

    const save = () => {
        const s = clampNum(stake, 0); const pay = clampNum(payout, 0);
        const prof = clampNum(profit, computeProfit(s, pay));
        const entry: TradeEntry = {
            id: initial?.id ?? uid(), title: title.trim() || `${tradeType === "TOUCHED" ? "Touched" : "Rise/Fall"} — ${market}`,
            tradeType, market: market.trim(), timeframe: timeframe.trim(),
            direction: tradeType === "TOUCHED" ? "N/A" : direction, stake: s, payout: pay, profit: prof,
            outcome: outcomeFromProfit(prof) as "Win" | "Loss" | "BE", entryTimeISO: new Date(entryTimeISO).toISOString(),
            notes, whatISaw, whatWorked, whatDidnt, tags: splitTags(tagsRaw), strategyId: strategyId || undefined,
            screenshots, createdAtISO: initial?.createdAtISO ?? toISO(Date.now()), updatedAtISO: toISO(Date.now()),
            confidence,
        };
        onSave(entry);
    };

    return (
        <div className="grid gap-4">
            <div className="grid md:grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Reversal after 3 red candles" /></div>
                <div className="grid gap-2"><Label>Trade type</Label>
                    <Select value={tradeType} onValueChange={(v) => setTradeType(v as "R_F" | "TOUCHED")}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent><SelectItem value="R_F">Rise/Fall</SelectItem><SelectItem value="TOUCHED">Touched</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid md:grid-cols-4 gap-3">
                <div className="grid gap-2"><Label>Market</Label><Input value={market} onChange={(e) => setMarket(e.target.value)} placeholder="Volatility 75" /></div>
                <div className="grid gap-2"><Label>Timeframe</Label><Input value={timeframe} onChange={(e) => setTimeframe(e.target.value)} placeholder="1m" /></div>
                <div className="grid gap-2"><Label>Direction</Label>
                    <Select value={direction} onValueChange={(v) => setDirection(v as "Rise" | "Fall")} disabled={tradeType === "TOUCHED"}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent><SelectItem value="Rise">Rise</SelectItem><SelectItem value="Fall">Fall</SelectItem></SelectContent></Select></div>
                <div className="grid gap-2"><Label>Entry time</Label><Input type="datetime-local" value={entryTimeISO} onChange={(e) => setEntryTimeISO(e.target.value)} /></div>
            </div>
            <div className="grid md:grid-cols-4 gap-3">
                <div className="grid gap-2"><Label>Stake</Label><Input value={stake} onChange={(e) => setStake(e.target.value)} placeholder="0" inputMode="decimal" /></div>
                <div className="grid gap-2"><Label>Payout</Label><Input value={payout} onChange={(e) => setPayout(e.target.value)} placeholder="0" inputMode="decimal" /></div>
                <div className="grid gap-2">
                    <div className="flex items-center justify-between"><Label>Profit/Loss</Label><div className="flex items-center gap-2"><Switch checked={autoCalc} onCheckedChange={setAutoCalc} /><span className="text-xs text-slate-600">Auto</span></div></div>
                    <Input value={profit} onChange={(e) => setProfit(e.target.value)} placeholder="auto" inputMode="decimal" />
                    <div className={`text-xs ${outcome === "Win" ? "text-emerald-700" : outcome === "Loss" ? "text-rose-700" : "text-slate-600"}`}>Outcome: <span className="font-medium">{outcome}</span></div></div>
                <div className="grid gap-2"><Label>Link to strategy</Label>
                    <Select value={strategyId || "none"} onValueChange={(v) => setStrategyId(v === "none" ? "" : v)}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                        <SelectContent><SelectItem value="none">None</SelectItem>
                            {strategies.slice().sort((a, b) => Number(b.isTop) - Number(a.isTop) || a.name.localeCompare(b.name)).map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent></Select></div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>Confidence</Label><div className="rounded-2xl border border-slate-200 p-3 bg-white"><StarPicker value={confidence} onChange={setConfidence} /><div className="text-xs text-slate-500 mt-2">Rate how clean this setup felt before you entered. This makes reviews deadly.</div></div></div>
                <div className="grid gap-2"><Label>Tags (comma separated)</Label><Input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="e.g. reversal, patience, fakeout" /></div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>What I saw (setup)</Label><Textarea value={whatISaw} onChange={(e) => setWhatISaw(e.target.value)} placeholder="Describe the market structure, tempo, fakeouts, levels, candles..." className="min-h-[120px]" /></div>
                <div className="grid gap-2"><Label>Notes (context)</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Mood, distractions, time-of-day, rules followed?" className="min-h-[120px]" /></div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>What worked</Label><Textarea value={whatWorked} onChange={(e) => setWhatWorked(e.target.value)} placeholder="What decision or signal was correct?" className="min-h-[110px]" /></div>
                <div className="grid gap-2"><Label>What didn&apos;t work</Label><Textarea value={whatDidnt} onChange={(e) => setWhatDidnt(e.target.value)} placeholder="What mistake or assumption failed?" className="min-h-[110px]" /></div>
            </div>
            <div className="grid gap-2">
                <div className="flex items-center justify-between"><Label>Screenshots (optional)</Label>
                    <FileButton accept="image/*" onFile={addScreenshot}><span className="inline-flex items-center gap-2"><Upload className="w-4 h-4" />Add image</span></FileButton></div>
                {screenshots?.length ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {screenshots.map((s) => (<div key={s.name} className="relative rounded-2xl overflow-hidden border border-slate-200 bg-white">
                            <img src={s.dataUrl} alt={s.name} className="w-full h-32 object-cover" /><div className="p-2 text-xs text-slate-600 truncate">{s.name}</div>
                            <button className="absolute top-2 right-2 bg-white/90 border border-slate-200 rounded-full p-1" onClick={() => removeShot(s.name)} title="Remove"><X className="w-4 h-4" /></button></div>))}
                    </div>) : (<div className="text-sm text-slate-500">No screenshots yet.</div>)}
            </div>
            <DialogFooter className="gap-2 sticky bottom-0 bg-white pt-3 border-t border-slate-200">
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={save}>{isEdit ? "Update trade" : "Save trade"}</Button>
            </DialogFooter>
        </div>
    );
}

function StrategyForm({ initial, onSave, onCancel }: { initial: Strategy | null; onSave: (s: Strategy) => void; onCancel: () => void }) {
    const isEdit = Boolean(initial?.id);
    const [name, setName] = useState(initial?.name ?? "");
    const [summary, setSummary] = useState(initial?.summary ?? "");
    const [trigger, setTrigger] = useState(initial?.trigger ?? "");
    const [confirmation, setConfirmation] = useState(initial?.confirmation ?? "");
    const [riskRules, setRiskRules] = useState(initial?.riskRules ?? "");
    const [execution, setExecution] = useState(initial?.execution ?? "");
    const [avoid, setAvoid] = useState(initial?.avoid ?? "");
    const [examples, setExamples] = useState(initial?.examples ?? "");
    const [tagsRaw, setTagsRaw] = useState((initial?.tags ?? []).join(", "));
    const [isTop, setIsTop] = useState(Boolean(initial?.isTop));

    const save = () => {
        const s: Strategy = {
            id: initial?.id ?? uid(), name: name.trim() || "Untitled strategy", summary, trigger, confirmation,
            riskRules, execution, avoid, examples, tags: splitTags(tagsRaw), isTop,
            createdAtISO: initial?.createdAtISO ?? toISO(Date.now()), updatedAtISO: toISO(Date.now()),
        };
        onSave(s);
    };

    return (
        <div className="grid gap-4">
            <div className="grid md:grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>Strategy name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 0.00 / 0.30 Tick Timing Edge" /></div>
                <div className="grid gap-2"><Label>Mark as Top / Profitable</Label>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3"><Switch checked={isTop} onCheckedChange={setIsTop} />
                        <div><div className="text-sm font-medium">Top Strategy</div><div className="text-xs text-slate-600">Keep your best stuff easy to find.</div></div></div></div>
            </div>
            <div className="grid gap-2"><Label>Summary</Label><Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What is this strategy in one clear paragraph?" className="min-h-[90px]" /></div>
            <div className="grid md:grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>Trigger</Label><Textarea value={trigger} onChange={(e) => setTrigger(e.target.value)} placeholder="What must happen before you even think of entering?" className="min-h-[110px]" /></div>
                <div className="grid gap-2"><Label>Confirmation</Label><Textarea value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="What confirms it (reduces guessing)?" className="min-h-[110px]" /></div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>Risk rules</Label><Textarea value={riskRules} onChange={(e) => setRiskRules(e.target.value)} placeholder="Position sizing, max attempts, when to stop." className="min-h-[110px]" /></div>
                <div className="grid gap-2"><Label>Execution steps</Label><Textarea value={execution} onChange={(e) => setExecution(e.target.value)} placeholder="Exact steps you follow. Simple and repeatable." className="min-h-[110px]" /></div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>Avoid conditions</Label><Textarea value={avoid} onChange={(e) => setAvoid(e.target.value)} placeholder="When NOT to trade this." className="min-h-[110px]" /></div>
                <div className="grid gap-2"><Label>Best examples</Label><Textarea value={examples} onChange={(e) => setExamples(e.target.value)} placeholder="Paste the clearest examples from your journal." className="min-h-[110px]" /></div>
            </div>
            <div className="grid gap-2"><Label>Tags (comma separated)</Label><Input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="e.g. timing, ticks, trend, reversal" /></div>
            <DialogFooter className="gap-2 sticky bottom-0 bg-white pt-3 border-t border-slate-200">
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={save}>{isEdit ? "Update strategy" : "Save strategy"}</Button>
            </DialogFooter>
        </div>
    );
}

function TradeRow({ entry, strategy, currency, onEdit, onDelete }: {
    entry: TradeEntry; strategy: Strategy | null | undefined; currency: string; onEdit: (e: TradeEntry) => void; onDelete: (id: string) => void;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="font-semibold truncate">{entry.title}</div>
                        <Pill>{entry.tradeType === "TOUCHED" ? "Touched" : "Rise/Fall"}</Pill><Pill>{entry.market || "—"}</Pill><Pill>{entry.timeframe || "—"}</Pill>
                        {entry.tradeType !== "TOUCHED" ? <Pill>{entry.direction}</Pill> : null}
                        <Badge variant={entry.outcome === "Win" ? "default" : entry.outcome === "Loss" ? "destructive" : "secondary"}>{entry.outcome}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-slate-600">{smallDate(entry.entryTimeISO)}
                        <span className="ml-2">• Confidence: <Stars value={entry.confidence || 0} /></span>
                        {strategy ? <span className="ml-2">• Strategy: <span className="font-medium">{strategy.name}</span></span> : null}</div>
                </div>
                <div className="text-right shrink-0">
                    <div className={`text-lg font-semibold ${statColorClass(entry.profit)}`}>{formatMoney(entry.profit, currency)}</div>
                    <div className="text-xs text-slate-600">Stake {formatMoney(entry.stake, currency)} • Payout {formatMoney(entry.payout, currency)}</div>
                </div>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3"><div className="text-xs font-medium text-slate-700">What I saw</div><div className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{entry.whatISaw || <span className="text-slate-400">—</span>}</div></div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3"><div className="text-xs font-medium text-slate-700">What worked</div><div className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{entry.whatWorked || <span className="text-slate-400">—</span>}</div></div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3"><div className="text-xs font-medium text-slate-700">What didn&apos;t</div><div className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{entry.whatDidnt || <span className="text-slate-400">—</span>}</div></div>
            </div>
            {(entry.notes || entry.tags?.length || entry.screenshots?.length) ? (
                <div className="grid gap-2">
                    {entry.notes ? <div className="text-sm text-slate-700 whitespace-pre-wrap"><span className="text-xs font-medium text-slate-600">Notes:</span> {entry.notes}</div> : null}
                    {entry.tags?.length ? <div className="flex flex-wrap gap-2">{entry.tags.map((t) => (<span key={t} className="text-xs px-2 py-1 rounded-full bg-white border border-slate-200 text-slate-700">#{t}</span>))}</div> : null}
                    {entry.screenshots?.length ? <div className="flex gap-2 overflow-x-auto pb-2">{entry.screenshots.map((s) => (<img key={s.name} src={s.dataUrl} alt={s.name} className="h-20 w-28 object-cover rounded-xl border border-slate-200" />))}</div> : null}
                </div>) : null}
            <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500">Updated {smallDate(entry.updatedAtISO)}</div>
                <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => onEdit(entry)}>Edit</Button><Button variant="destructive" size="sm" onClick={() => onDelete(entry.id)}>Delete</Button></div>
            </div>
        </div>
    );
}

function StrategyCard({ s, linkedTradesCount, onEdit, onDelete, onDuplicate, onToggleTop }: {
    s: Strategy; linkedTradesCount: number; onEdit: (s: Strategy) => void; onDelete: (id: string) => void; onDuplicate: (s: Strategy) => void; onToggleTop: (id: string) => void;
}) {
    return (
        <Card className="rounded-2xl"><CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><CardTitle className="text-base truncate">{s.name}</CardTitle>
                <div className="mt-1 text-xs text-slate-600">{linkedTradesCount} linked trades • Updated {smallDate(s.updatedAtISO)}</div></div>
                <div className="flex items-center gap-2"><Switch checked={s.isTop} onCheckedChange={() => onToggleTop(s.id)} /><span className="text-xs text-slate-600">Top</span></div></div>
        </CardHeader><CardContent className="grid gap-3">
                {s.summary ? <div className="text-sm text-slate-700 whitespace-pre-wrap">{s.summary}</div> : null}
                <div className="grid md:grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3"><div className="text-xs font-medium text-slate-700">Trigger</div><div className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{s.trigger || <span className="text-slate-400">—</span>}</div></div>
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3"><div className="text-xs font-medium text-slate-700">Confirmation</div><div className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{s.confirmation || <span className="text-slate-400">—</span>}</div></div>
                </div>
                {s.tags?.length ? <div className="flex flex-wrap gap-2">{s.tags.map((t) => (<span key={t} className="text-xs px-2 py-1 rounded-full bg-white border border-slate-200 text-slate-700">#{t}</span>))}</div> : null}
                <Separator />
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(s)}>Edit</Button>
                    <Button variant="outline" size="sm" onClick={() => onDuplicate(s)} className="gap-2"><Copy className="w-4 h-4" />Duplicate</Button>
                    <Button variant="destructive" size="sm" onClick={() => onDelete(s.id)}>Delete</Button>
                </div></CardContent></Card>
    );
}

export default function TradeJournal() {
    const [state, setState] = useLocalState();
    const { entries, strategies, settings } = state;
    const [query, setQuery] = useState(""); const [filterOutcome, setFilterOutcome] = useState("all");
    const [filterType, setFilterType] = useState("all"); const [filterStrategy, setFilterStrategy] = useState("all");
    const [sortBy, setSortBy] = useState("newest");
    const [viewMode, setViewMode] = useState("cards");
    const [tradeDialogOpen, setTradeDialogOpen] = useState(false); const [strategyDialogOpen, setStrategyDialogOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<TradeEntry | null>(null); const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
    const currency = settings.currency || "$";

    const strategyById = useMemo(() => { const m = new Map<string, Strategy>(); for (const s of strategies) m.set(s.id, s); return m; }, [strategies]);

    const filteredEntries = useMemo(() => {
        const q = query.trim().toLowerCase(); let list = entries.slice();
        if (filterOutcome !== "all") list = list.filter((e) => e.outcome === filterOutcome);
        if (filterType !== "all") list = list.filter((e) => e.tradeType === filterType);
        if (filterStrategy !== "all") list = list.filter((e) => (filterStrategy === "none" ? !e.strategyId : e.strategyId === filterStrategy));
        if (q) {
            list = list.filter((e) => {
                const strategy = e.strategyId ? strategyById.get(e.strategyId) : null;
                const blob = [e.title, e.market, e.timeframe, e.direction, e.notes, e.whatISaw, e.whatWorked, e.whatDidnt, (e.tags || []).join(" "), strategy?.name || "", strategy?.summary || ""].join(" \n ").toLowerCase();
                return blob.includes(q);
            });
        }
        if (sortBy === "newest") list.sort((a, b) => new Date(b.entryTimeISO).getTime() - new Date(a.entryTimeISO).getTime());
        else if (sortBy === "oldest") list.sort((a, b) => new Date(a.entryTimeISO).getTime() - new Date(b.entryTimeISO).getTime());
        else if (sortBy === "profit") list.sort((a, b) => clampNum(b.profit, 0) - clampNum(a.profit, 0));
        else if (sortBy === "loss") list.sort((a, b) => clampNum(a.profit, 0) - clampNum(b.profit, 0));
        return list;
    }, [entries, query, filterOutcome, filterType, filterStrategy, sortBy, strategyById]);

    const topStrategies = useMemo(() => strategies.slice().sort((a, b) => Number(b.isTop) - Number(a.isTop) || b.updatedAtISO.localeCompare(a.updatedAtISO)), [strategies]);
    const tradesByStrategyCount = useMemo(() => { const counts = new Map<string, number>(); for (const e of entries) { if (!e.strategyId) continue; counts.set(e.strategyId, (counts.get(e.strategyId) || 0) + 1); } return counts; }, [entries]);

    const saveEntry = (entry: TradeEntry) => { setState((prev) => { const exists = prev.entries.some((e) => e.id === entry.id); const nextEntries = exists ? prev.entries.map((e) => (e.id === entry.id ? entry : e)) : [entry, ...prev.entries]; return { ...prev, entries: nextEntries }; }); setTradeDialogOpen(false); setEditingEntry(null); };
    const deleteEntry = (id: string) => { setState((prev) => ({ ...prev, entries: prev.entries.filter((e) => e.id !== id) })); };
    const saveStrategy = (s: Strategy) => { setState((prev) => { const exists = prev.strategies.some((x) => x.id === s.id); const next = exists ? prev.strategies.map((x) => (x.id === s.id ? s : x)) : [s, ...prev.strategies]; return { ...prev, strategies: next }; }); setStrategyDialogOpen(false); setEditingStrategy(null); };
    const deleteStrategy = (id: string) => { setState((prev) => { const nextStrategies = prev.strategies.filter((s) => s.id !== id); const nextEntries = prev.entries.map((e) => (e.strategyId === id ? { ...e, strategyId: undefined, updatedAtISO: toISO(Date.now()) } : e)); return { ...prev, strategies: nextStrategies, entries: nextEntries }; }); };
    const duplicateStrategy = (s: Strategy) => { const copy = { ...s, id: uid(), name: `${s.name} (copy)`, createdAtISO: toISO(Date.now()), updatedAtISO: toISO(Date.now()) }; saveStrategy(copy); };
    const toggleTopStrategy = (id: string) => { setState((prev) => ({ ...prev, strategies: prev.strategies.map((s) => (s.id === id ? { ...s, isTop: !s.isTop, updatedAtISO: toISO(Date.now()) } : s)) })); };

    const exportJSON = () => { const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `trade-journal-export-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url); };
    const importJSON = async (file: File) => { const text = await file.text(); const raw = safeParseJSON(text); if (raw) setState(validateState(raw)); };
    const wipeAll = () => { const ok = window.confirm("This will delete ALL trades and strategies on this device. Continue?"); if (!ok) return; setState(defaultState()); };
    const updateCurrency = (cur: string) => { setState((prev) => ({ ...prev, settings: { ...prev.settings, currency: cur || "$" } })); };

    return (
        <div className="min-h-screen bg-slate-50"><div className="max-w-6xl mx-auto px-4 py-8">
            <TopBar currency={currency} onCurrency={updateCurrency} onExport={exportJSON} onImport={importJSON} onWipe={wipeAll} />
            <div className="mt-6"><StatsStrip entries={entries} currency={currency} /></div>
            <div className="mt-6"><Tabs defaultValue="journal">
                <TabsList className="rounded-2xl"><TabsTrigger value="journal" className="gap-2"><BookOpen className="w-4 h-4" />Journal</TabsTrigger><TabsTrigger value="strategies" className="gap-2"><TrendingUp className="w-4 h-4" />Strategies</TabsTrigger></TabsList>
                <TabsContent value="journal" className="mt-4"><Card className="rounded-2xl"><CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><CardTitle className="text-base">Trade entries</CardTitle><div className="text-sm text-slate-600">Search anything: market, tags, what you saw, what worked…</div></div>
                        <div className="flex flex-wrap gap-2"><Dialog open={tradeDialogOpen} onOpenChange={(v) => { setTradeDialogOpen(v); if (!v) setEditingEntry(null); }}>
                            <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />New trade</Button></DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editingEntry ? "Edit trade" : "New trade"}</DialogTitle></DialogHeader>
                                <EntryForm strategies={strategies} currency={currency} initial={editingEntry} onSave={saveEntry} onCancel={() => { setTradeDialogOpen(false); setEditingEntry(null); }} /></DialogContent></Dialog></div></div>
                </CardHeader><CardContent className="grid gap-4">
                        <div className="grid md:grid-cols-12 gap-3">
                            <div className="md:col-span-5"><div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search trades, tags, notes, strategies…" className="pl-9" /></div></div>
                            <div className="md:col-span-2"><Select value={filterOutcome} onValueChange={setFilterOutcome}><SelectTrigger><SelectValue placeholder="Outcome" /></SelectTrigger><SelectContent><SelectItem value="all">All outcomes</SelectItem><SelectItem value="Win">Win</SelectItem><SelectItem value="Loss">Loss</SelectItem><SelectItem value="BE">Break-even</SelectItem></SelectContent></Select></div>
                            <div className="md:col-span-2"><Select value={filterType} onValueChange={setFilterType}><SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All types</SelectItem><SelectItem value="R_F">Rise/Fall</SelectItem><SelectItem value="TOUCHED">Touched</SelectItem></SelectContent></Select></div>
                            <div className="md:col-span-3"><Select value={filterStrategy} onValueChange={setFilterStrategy}><SelectTrigger><SelectValue placeholder="Strategy" /></SelectTrigger><SelectContent><SelectItem value="all">All strategies</SelectItem><SelectItem value="none">No strategy</SelectItem>{strategies.slice().sort((a, b) => Number(b.isTop) - Number(a.isTop) || a.name.localeCompare(b.name)).map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent></Select></div>
                            <div className="md:col-span-3"><Select value={sortBy} onValueChange={setSortBy}><SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger><SelectContent><SelectItem value="newest">Newest</SelectItem><SelectItem value="oldest">Oldest</SelectItem><SelectItem value="profit">Most profit</SelectItem><SelectItem value="loss">Most loss</SelectItem></SelectContent></Select></div>
                            <div className="md:col-span-3"><Select value={viewMode} onValueChange={setViewMode}><SelectTrigger><SelectValue placeholder="View" /></SelectTrigger><SelectContent><SelectItem value="cards">Card view</SelectItem><SelectItem value="table">Table view</SelectItem></SelectContent></Select></div>
                        </div>
                        {filteredEntries.length ? (
                            viewMode === "table" ? (
                                <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white"><div className="overflow-x-auto"><table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200"><tr className="text-left text-xs text-slate-600">
                                        <th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Market</th><th className="p-3">TF</th><th className="p-3">Dir</th><th className="p-3">Stake</th><th className="p-3">Payout</th><th className="p-3">Outcome</th><th className="p-3">P/L</th><th className="p-3">Strategy</th><th className="p-3">Conf.</th><th className="p-3"></th>
                                    </tr></thead>
                                    <tbody>{filteredEntries.map((e) => {
                                        const strat = e.strategyId ? strategyById.get(e.strategyId) : null;
                                        return (<tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="p-3 text-slate-700 whitespace-nowrap">{smallDate(e.entryTimeISO)}</td><td className="p-3"><Pill>{e.tradeType === "TOUCHED" ? "Touched" : "Rise/Fall"}</Pill></td><td className="p-3 text-slate-700">{e.market || "—"}</td><td className="p-3 text-slate-700">{e.timeframe || "—"}</td><td className="p-3 text-slate-700">{e.tradeType === "TOUCHED" ? "—" : e.direction}</td><td className="p-3 text-slate-700 whitespace-nowrap">{formatMoney(e.stake, currency)}</td><td className="p-3 text-slate-700 whitespace-nowrap">{formatMoney(e.payout, currency)}</td><td className="p-3"><Badge variant={e.outcome === "Win" ? "default" : e.outcome === "Loss" ? "destructive" : "secondary"}>{e.outcome}</Badge></td><td className={`p-3 whitespace-nowrap font-medium ${statColorClass(e.profit)}`}>{formatMoney(e.profit, currency)}</td><td className="p-3 text-slate-700">{strat ? strat.name : "—"}</td><td className="p-3"><Stars value={e.confidence || 0} /></td><td className="p-3"><div className="flex gap-2 justify-end"><Button variant="outline" size="sm" onClick={() => { setEditingEntry(e); setTradeDialogOpen(true); }}>Edit</Button><Button variant="destructive" size="sm" onClick={() => deleteEntry(e.id)}>Delete</Button></div></td>
                                        </tr>);
                                    })}</tbody></table></div></div>
                            ) : (<div className="grid gap-4">{filteredEntries.map((e) => (<TradeRow key={e.id} entry={e} strategy={e.strategyId ? strategyById.get(e.strategyId) : null} currency={currency} onEdit={(entry) => { setEditingEntry(entry); setTradeDialogOpen(true); }} onDelete={deleteEntry} />))}</div>)
                        ) : (<EmptyState title={entries.length ? "No trades match your filters" : "No trades yet"} hint={entries.length ? "Try clearing filters or searching different words." : "Start logging. The power is in the review."} action={<Button onClick={() => setTradeDialogOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Add your first trade</Button>} />)}
                    </CardContent></Card></TabsContent>
                <TabsContent value="strategies" className="mt-4"><div className="grid lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2"><Card className="rounded-2xl"><CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-3"><div><CardTitle className="text-base">Strategy Library</CardTitle><div className="text-sm text-slate-600">Turn your best observations into repeatable rules.</div></div>
                            <Dialog open={strategyDialogOpen} onOpenChange={(v) => { setStrategyDialogOpen(v); if (!v) setEditingStrategy(null); }}>
                                <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />New strategy</Button></DialogTrigger>
                                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editingStrategy ? "Edit strategy" : "New strategy"}</DialogTitle></DialogHeader>
                                    <StrategyForm initial={editingStrategy} onSave={saveStrategy} onCancel={() => { setStrategyDialogOpen(false); setEditingStrategy(null); }} /></DialogContent></Dialog></div>
                    </CardHeader><CardContent className="grid gap-4">
                            {topStrategies.length ? (<div className="grid gap-4">{topStrategies.map((s) => (<StrategyCard key={s.id} s={s} linkedTradesCount={tradesByStrategyCount.get(s.id) || 0} onEdit={(x) => { setEditingStrategy(x); setStrategyDialogOpen(true); }} onDelete={deleteStrategy} onDuplicate={duplicateStrategy} onToggleTop={toggleTopStrategy} />))}</div>)
                                : (<EmptyState title="No strategies yet" hint="Your best trading future is usually hidden inside your past trades. Capture it." action={<Button onClick={() => setStrategyDialogOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Create a strategy</Button>} />)}
                        </CardContent></Card></div>
                    <div className="lg:col-span-1"><Card className="rounded-2xl"><CardHeader className="pb-3"><CardTitle className="text-base">How to use this</CardTitle></CardHeader>
                        <CardContent className="grid gap-3 text-sm text-slate-700">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="font-semibold">1) Journal like a scientist</div><div className="mt-1 text-slate-600">Write what you saw, what you expected, what actually happened.</div></div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="font-semibold">2) Promote patterns into strategies</div><div className="mt-1 text-slate-600">When something repeats, move it into the Strategy Library.</div></div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="font-semibold">3) Link trades to strategies</div><div className="mt-1 text-slate-600">So later you can see which strategy is truly paying.</div></div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="font-semibold">4) Protect your data</div><div className="mt-1 text-slate-600">Use Export sometimes. Import restores it on any device.</div></div>
                            <Separator /><div className="text-xs text-slate-500">This version saves to your browser (localStorage). If you want: Supabase sync, multi-device login, or a dashboard of strategy performance, tell me and I&apos;ll extend it.</div>
                        </CardContent></Card></div>
                </div></TabsContent>
            </Tabs></div>
            <div className="mt-8 text-xs text-slate-500">Tip: the best journals are simple. Keep your entries short but precise, then review weekly and promote only what repeats.</div>
        </div></div>
    );
}
