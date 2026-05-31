import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where, type Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import { Loader2, RefreshCw, TrendingUp, CreditCard, PieChart as PieChartIcon, CalendarRange } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const QPAY_EVENTS = 'qpayEvents';

type QPayEventRow = {
  id: string;
  invoiceId: string;
  userId: string;
  status: string;
  amount: number;
  currency: string;
  kind: string;
  processed: boolean;
  createdAtMs: number | null;
  paidAtMs: number | null;
};

function tsToMs(v: Timestamp | { toMillis?: () => number } | null | undefined): number | null {
  if (!v) return null;
  if (typeof (v as Timestamp).toMillis === 'function') return (v as Timestamp).toMillis();
  return null;
}

function pickKind(paymentIntent: unknown): string {
  if (!paymentIntent || typeof paymentIntent !== 'object') return 'unknown';
  const k = (paymentIntent as Record<string, unknown>).kind;
  return typeof k === 'string' && k.trim() ? k.trim() : 'unknown';
}

function pickEventTimeMs(row: QPayEventRow): number | null {
  if (row.status === 'paid' && row.paidAtMs != null) return row.paidAtMs;
  if (row.createdAtMs != null) return row.createdAtMs;
  return row.paidAtMs ?? row.createdAtMs;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export const RevenueAdmin: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<QPayEventRow[]>([]);
  const [activeSubscribers, setActiveSubscribers] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [evSnap, subSnap] = await Promise.all([
        getDocs(collection(db, QPAY_EVENTS)),
        getDocs(query(collection(db, 'users'), where('subscriptionStatus', '==', 'active'))),
      ]);

      const next: QPayEventRow[] = [];
      evSnap.forEach((docSnap) => {
        const d = docSnap.data() as Record<string, unknown>;
        next.push({
          id: docSnap.id,
          invoiceId: String(d.invoiceId ?? docSnap.id),
          userId: String(d.userId ?? ''),
          status: String(d.status ?? 'pending'),
          amount: Number(d.amount ?? 0),
          currency: String(d.currency ?? 'MNT'),
          kind: pickKind(d.paymentIntent),
          processed: Boolean(d.processed),
          createdAtMs: tsToMs(d.createdAt as Timestamp | undefined),
          paidAtMs: tsToMs(d.paidAt as Timestamp | undefined),
        });
      });
      next.sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
      setRows(next);
      setActiveSubscribers(subSnap.size);
    } catch (e) {
      console.error(e);
      toast.error('Өгөгдөл ачаалахад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }, []);

  const reconcileInvoice = useCallback(
    async (invoiceId: string) => {
      if (!user) {
        toast.error('Нэвтэрнэ үү');
        return;
      }
      setReconcilingId(invoiceId);
      try {
        const idToken = await user.getIdToken();
        const res = await fetch('/api/qpay/reconcile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken, invoiceId }),
        });
        const data = (await res.json()) as Record<string, unknown>;
        if (!res.ok) {
          toast.error(String(data.error ?? data.details ?? 'Алдаа'));
          return;
        }
        if (data.paid === true || data.idempotent === true) {
          toast.success('Төлбөр баталгаажлаа');
        } else {
          toast.message('QPay дээр төлбөр олдсонгүй эсвэл хүлээгдэж байна.');
        }
        await load();
      } catch (e) {
        console.error(e);
        toast.error('Шалгахад алдаа гарлаа');
      } finally {
        setReconcilingId(null);
      }
    },
    [user, load]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const fromMs = startOfDay(new Date(`${dateFrom}T12:00:00`)).getTime();
    const toMs = endOfDay(new Date(`${dateTo}T12:00:00`)).getTime();

    return rows.filter((r) => {
      const t = pickEventTimeMs(r);
      if (t != null && (t < fromMs || t > toMs)) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (typeFilter !== 'all' && r.kind !== typeFilter) return false;
      return true;
    });
  }, [rows, dateFrom, dateTo, statusFilter, typeFilter]);

  const kpis = useMemo(() => {
    const totalInvoices = filtered.length;
    const paid = filtered.filter((r) => r.status === 'paid');
    const paidCount = paid.length;
    const totalRevenue = paid.reduce((s, r) => s + (Number.isFinite(r.amount) ? r.amount : 0), 0);
    const conversion = totalInvoices > 0 ? (paidCount / totalInvoices) * 100 : 0;
    const subscriptionPaid = paid.filter((r) => r.kind === 'subscription').length;
    const bookingKinds = new Set(['schedule_slot', 'class_detail', 'class_month']);
    const bookingRelated = filtered.filter((r) => bookingKinds.has(r.kind));
    const bookingPaid = bookingRelated.filter((r) => r.status === 'paid').length;
    const bookingConversion = bookingRelated.length > 0 ? (bookingPaid / bookingRelated.length) * 100 : 0;
    const pending = filtered.filter((r) => r.status === 'pending').length;
    const failed = filtered.filter((r) => r.status === 'failed').length;

    return {
      totalRevenue,
      paidCount,
      totalInvoices,
      conversion,
      subscriptionPaid,
      bookingPaid,
      bookingConversion: Number.isFinite(bookingConversion) ? bookingConversion : 0,
      pending,
      failed,
    };
  }, [filtered]);

  const revenueByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      if (r.status !== 'paid' || r.paidAtMs == null) continue;
      const day = format(new Date(r.paidAtMs), 'yyyy-MM-dd');
      map.set(day, (map.get(day) ?? 0) + r.amount);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const countsByKind = useMemo(() => {
    const paidOnly = filtered.filter((r) => r.status === 'paid');
    const map = new Map<string, number>();
    for (const r of paidOnly) {
      map.set(r.kind, (map.get(r.kind) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const statusCounts = useMemo(() => {
    return {
      paid: filtered.filter((r) => r.status === 'paid').length,
      pending: filtered.filter((r) => r.status === 'pending').length,
      failed: filtered.filter((r) => r.status === 'failed').length,
    };
  }, [filtered]);

  const maxDayRevenue = useMemo(() => Math.max(1, ...revenueByDay.map(([, v]) => v)), [revenueByDay]);
  const maxKind = useMemo(() => Math.max(1, ...countsByKind.map(([, v]) => v)), [countsByKind]);
  const maxStatus = useMemo(
    () => Math.max(1, statusCounts.paid, statusCounts.pending, statusCounts.failed),
    [statusCounts]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-brand-icon">Төлбөр</p>
          <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight text-brand-ink md:text-4xl">Орлого ба QPay</h1>
          <p className="mt-2 max-w-xl text-sm text-brand-ink/55">
            <code className="rounded bg-brand-ink/5 px-1.5 py-0.5 text-xs">qpayEvents</code> түүхэн өгөгдөл — шүүлт, KPI, энгийн график.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0 rounded-full border-brand-ink/15"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Дахин ачаалах
        </Button>
      </div>

      <Card className="mb-8 rounded-3xl border-brand-ink/8 bg-white/90 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-serif text-lg text-brand-ink">
            <CalendarRange className="h-5 w-5 text-brand-icon" />
            Шүүлтүүр
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-black">Эхлэх</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-black">Дуусах</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-black">Төлөв</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Бүгд</SelectItem>
                <SelectItem value="pending">Хүлээгдэж буй</SelectItem>
                <SelectItem value="paid">Төлөгдсөн</SelectItem>
                <SelectItem value="failed">Амжилтгүй</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-black">Төрөл</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Бүгд</SelectItem>
                <SelectItem value="schedule_slot">schedule_slot</SelectItem>
                <SelectItem value="subscription">subscription</SelectItem>
                <SelectItem value="class_detail">class_detail</SelectItem>
                <SelectItem value="class_month">class_month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center gap-3 text-brand-ink/50">
          <Loader2 className="h-8 w-8 animate-spin text-brand-icon" />
        </div>
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="rounded-3xl border-brand-ink/8 bg-white/95 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-ink/40">Нийт орлого (MNT)</p>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="mt-3 font-serif text-3xl tracking-tight text-brand-ink">{kpis.totalRevenue.toLocaleString()}₮</p>
                <p className="mt-2 text-xs text-brand-ink/45">Төлөгдсөн үйл явдлуудын дүн</p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-brand-ink/8 bg-white/95 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-ink/40">Амжилттай төлбөр</p>
                  <CreditCard className="h-4 w-4 text-brand-icon" />
                </div>
                <p className="mt-3 font-serif text-3xl tracking-tight text-brand-ink">{kpis.paidCount}</p>
                <p className="mt-2 text-xs text-brand-ink/45">Нийт нэхэмжлэх (шүүлт): {kpis.totalInvoices}</p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-brand-ink/8 bg-white/95 shadow-sm">
              <CardContent className="p-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-ink/40">Хөрвүүлэлт</p>
                <p className="mt-3 font-serif text-3xl tracking-tight text-brand-ink">{kpis.conversion.toFixed(1)}%</p>
                <p className="mt-2 text-xs text-brand-ink/45">Төлөгдсөн / нэхэмжлэх (шүүсэн хүрээнд)</p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-brand-ink/8 bg-white/95 shadow-sm">
              <CardContent className="p-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-ink/40">Идэвхтэй гишүүнчлэл</p>
                <p className="mt-3 font-serif text-3xl tracking-tight text-brand-ink">{activeSubscribers ?? '—'}</p>
                <p className="mt-2 text-xs text-brand-ink/45">
                  Хэрэглэгчийн бүртгэлээс (subscriptionStatus). Төлбөр төрөл: {kpis.subscriptionPaid} (paid)
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mb-4 grid gap-4 lg:grid-cols-3">
            <Card className="rounded-3xl border-brand-ink/8 bg-white/95 shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="font-serif text-lg text-brand-ink">Орлого (өдрөөр)</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueByDay.length === 0 ? (
                  <p className="py-8 text-center text-sm text-brand-ink/45">Өгөгдөл алга</p>
                ) : (
                  <div className="flex h-44 items-end gap-1 overflow-x-auto pb-2">
                    {revenueByDay.map(([day, amt]) => (
                      <div key={day} className="flex min-w-[28px] flex-1 flex-col items-center justify-end gap-1">
                        <div
                          className="w-full max-w-[40px] rounded-t-md bg-gradient-to-t from-brand-icon to-brand-icon/70"
                          style={{ height: `${Math.max(8, (amt / maxDayRevenue) * 140)}px` }}
                          title={`${day}: ${amt.toLocaleString()}₮`}
                        />
                        <span className="max-w-full truncate text-[9px] font-medium uppercase tracking-tighter text-brand-ink/40">
                          {day.slice(5)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-brand-ink/8 bg-white/95 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-serif text-lg text-brand-ink">
                  <PieChartIcon className="h-5 w-5 text-brand-icon" />
                  Төлөв
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(['paid', 'pending', 'failed'] as const).map((key) => {
                  const n = statusCounts[key];
                  const label = key === 'paid' ? 'Төлөгдсөн' : key === 'pending' ? 'Хүлээгдэж буй' : 'Амжилтгүй';
                  const color =
                    key === 'paid' ? 'bg-emerald-500' : key === 'pending' ? 'bg-amber-400' : 'bg-red-400';
                  return (
                    <div key={key}>
                      <div className="mb-1 flex justify-between text-xs text-brand-ink/60">
                        <span>{label}</span>
                        <span className="font-mono">{n}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-brand-ink/8">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${(n / maxStatus) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <Card className="mb-10 rounded-3xl border-brand-ink/8 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="font-serif text-lg text-brand-ink">Төлбөрийн төрөл (төлөгдсөн)</CardTitle>
            </CardHeader>
            <CardContent>
              {countsByKind.length === 0 ? (
                <p className="py-6 text-center text-sm text-brand-ink/45">Төлөгдсөн үйл явдал алга</p>
              ) : (
                <div className="space-y-4">
                  {countsByKind.map(([kind, n]) => (
                    <div key={kind}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="font-mono text-brand-ink/80">{kind}</span>
                        <span className="text-brand-ink/50">{n}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-brand-ink/8">
                        <div
                          className="h-full rounded-full bg-violet-500/90"
                          style={{ width: `${(n / maxKind) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-brand-ink/8 bg-white/95 shadow-sm">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="font-serif text-lg text-brand-ink">Сүүлийн үйл явдлууд</CardTitle>
              <span className="text-xs text-brand-ink/45">
                Захиалгын хөрвүүлэлт (ойролцоогоор): {kpis.bookingConversion.toFixed(0)}% · төлөгдсөн захиалга: {kpis.bookingPaid}
              </span>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-brand-ink/10 text-[10px] font-black uppercase tracking-widest text-brand-ink/40">
                    <th className="py-3 pr-4">Invoice</th>
                    <th className="py-3 pr-4">Төрөл</th>
                    <th className="py-3 pr-4">Төлөв</th>
                    <th className="py-3 pr-4 text-right">Дүн</th>
                    <th className="py-3 pr-4">Төлсөн</th>
                    <th className="py-3 pr-4 text-right">Үйлдэл</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 80).map((r) => (
                    <tr key={r.id} className="border-b border-brand-ink/5 text-brand-ink/80">
                      <td className="max-w-[180px] truncate py-2.5 pr-4 font-mono text-xs">{r.invoiceId}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs">{r.kind}</td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={
                            r.status === 'paid'
                              ? 'rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700'
                              : r.status === 'failed'
                                ? 'rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700'
                                : 'rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800'
                          }
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{r.amount.toLocaleString()}₮</td>
                      <td className="py-2.5 pr-4 text-xs text-brand-ink/50">
                        {r.paidAtMs ? format(new Date(r.paidAtMs), 'yyyy-MM-dd HH:mm') : '—'}
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        {r.status === 'pending' && !r.processed ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-full text-[10px] font-black uppercase tracking-wider"
                            disabled={reconcilingId === r.invoiceId}
                            onClick={() => void reconcileInvoice(r.invoiceId)}
                          >
                            {reconcilingId === r.invoiceId ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              'QPay шалгах'
                            )}
                          </Button>
                        ) : (
                          <span className="text-xs text-brand-ink/30">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length > 80 ? (
                <p className="mt-4 text-center text-xs text-brand-ink/40">Зөвхөн эхний 80 мөр харуулж байна.</p>
              ) : null}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
