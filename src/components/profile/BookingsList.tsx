import React from 'react';
import { Receipt, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { Timestamp } from 'firebase/firestore';

interface BookingsListProps {
  myPayments: Array<Record<string, unknown> & { id: string }>;
  myBookings: Array<Record<string, unknown> & { id: string }>;
  purchasesLoading: boolean;
  reconcilingPaymentId: string | null;
  onReconcilePayment: (invoiceId: string) => Promise<void>;
}

function dateMs(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate().getTime();
  }
  if (typeof value === 'string') {
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

function formatUnknownDate(value: unknown): string {
  const ms = dateMs(value);
  if (ms != null) return new Date(ms).toLocaleString();
  return '—';
}

function paymentIntentLabel(pi: unknown): string {
  if (!pi || typeof pi !== 'object') return 'Төлбөр';
  const kind = String((pi as Record<string, unknown>).kind || '').toLowerCase();
  if (kind === 'subscription') return 'Гишүүнчлэл';
  if (kind === 'class_month' || kind === 'class_detail') return 'Хичээл';
  if (kind === 'schedule_slot') return 'Цаг сонголт';
  return 'Төлбөр';
}

function qpayStatusLabel(status: unknown, processed: unknown): string {
  const s = String(status || '').toLowerCase();
  if (s === 'paid' || processed === true) return 'Төлөгдсөн';
  if (s === 'failed') return 'Амжилтгүй';
  return 'Хүлээгдэж буй';
}

export const BookingsList: React.FC<BookingsListProps> = ({
  myPayments,
  myBookings,
  purchasesLoading,
  reconcilingPaymentId,
  onReconcilePayment,
}) => {
  return (
    <div className="mt-12 border-t border-brand-ink/10 pt-12">
      <h3 className="mb-6 flex items-center gap-3 text-xl font-serif text-brand-ink">
        <Receipt className="text-brand-icon" size={20} />
        Миний худалдан авалт
      </h3>
      {purchasesLoading ? (
        <p className="text-sm text-brand-ink/50">Уншиж байна...</p>
      ) : myPayments.length === 0 && myBookings.length === 0 ? (
        <p className="text-sm text-brand-ink/60">
          Одоогоор бүртгэлгүй. Хичээл эсвэл гишүүнчлэл худалдан авсны дараа энд харагдана.
        </p>
      ) : (
        <div className="space-y-8">
          {myPayments.length > 0 ? (
            <div>
              <h4 className="mb-3 text-xs font-black uppercase tracking-widest text-brand-ink/40">Төлбөрийн түүх</h4>
              <ul className="divide-y divide-brand-ink/10 rounded-2xl border border-brand-ink/10 bg-gray-50/50">
                {myPayments.map((row) => {
                  const meta = row.metadata as Record<string, unknown> | undefined;
                  const desc = String(meta?.description || '').trim();
                  const pi = row.paymentIntent;
                  const amount = Number(row.amount ?? 0);
                  const st = qpayStatusLabel(row.status, row.processed);
                  const invoiceKey = String(row.invoiceId ?? row.id);
                  const showReconcile =
                    String(row.status || '').toLowerCase() !== 'paid' && row.processed !== true;
                  return (
                    <li key={row.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-brand-ink">
                          {paymentIntentLabel(pi)}
                          {desc ? ` — ${desc}` : ''}
                        </p>
                        <p className="text-xs text-brand-ink/45">{formatUnknownDate(row.createdAt)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-semibold text-brand-ink">{amount.toLocaleString()} ₮</span>
                        <span
                          className={`rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            st === 'Төлөгдсөн'
                              ? 'bg-emerald-100 text-emerald-800'
                              : st === 'Амжилтгүй'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {st}
                        </span>
                        {showReconcile ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-full text-[10px] font-black uppercase tracking-wider"
                            disabled={reconcilingPaymentId === invoiceKey}
                            onClick={() => void onReconcilePayment(invoiceKey)}
                          >
                            {reconcilingPaymentId === invoiceKey ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              'Төлбөр шалгах'
                            )}
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {myBookings.length > 0 ? (
            <div>
              <h4 className="mb-3 text-xs font-black uppercase tracking-widest text-brand-ink/40">Бүртгэл / захиалга</h4>
              <ul className="divide-y divide-brand-ink/10 rounded-2xl border border-brand-ink/10 bg-gray-50/50">
                {myBookings.map((b) => {
                  const classId = String(b.classId || b.itemId || '').trim();
                  const bookingStatus = String(b.status || '').toLowerCase();
                  const typeRaw = String(b.type || '').toLowerCase();
                  const typeLabel =
                    typeRaw === 'class_month' ? 'Сарын хичээл' : typeRaw === 'class' ? 'Хуваарь' : 'Бүртгэл';
                  return (
                    <li key={b.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-brand-ink">{typeLabel}</p>
                        <p className="text-xs text-brand-ink/45">
                          {formatUnknownDate(b.createdAt)}
                          {String(b.monthKey || '').trim() ? ` · ${b.monthKey}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-brand-ink/5 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand-ink/70">
                          {bookingStatus === 'confirmed' ? 'Баталгаажсан' : bookingStatus || '—'}
                        </span>
                        {classId ? (
                          <Link
                            to={`/classes/${classId}`}
                            className="text-xs font-bold uppercase tracking-wider text-brand-icon hover:underline"
                          >
                            Хичээл рүү
                          </Link>
                        ) : null}
                        <Link
                          to="/schedule"
                          className="text-xs font-bold uppercase tracking-wider text-brand-ink/50 hover:text-brand-ink"
                        >
                          Хуваарь
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
