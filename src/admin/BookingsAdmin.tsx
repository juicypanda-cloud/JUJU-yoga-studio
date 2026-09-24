import React, { useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, getDoc, onSnapshot, orderBy, query, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Button } from '../components/ui/button';
import { Trash2, Calendar } from 'lucide-react';
import { toast } from 'sonner';

type BookingDoc = { id: string; [key: string]: unknown };

type ClassLabel = { title: string };
type UserLabel = { name: string; email: string };

function resolveUserLabel(uid: string, labels: Record<string, UserLabel>): { name: string; email: string } {
  const label = labels[uid];
  if (label) return label;
  return { name: uid ? `${uid.slice(0, 8)}…` : '—', email: '' };
}

function formatCreated(value: unknown): string {
  if (!value) return '—';
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toLocaleString();
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
  }
  return '—';
}

export const BookingsAdmin: React.FC = () => {
  const [bookings, setBookings] = useState<BookingDoc[]>([]);
  const [classesById, setClassesById] = useState<Record<string, ClassLabel>>({});
  const [userLabels, setUserLabels] = useState<Record<string, UserLabel>>({});
  const [loading, setLoading] = useState(true);
  const profileFetchStarted = useRef<Set<string>>(new Set());

  useEffect(() => {
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setBookings(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as BookingDoc[]);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching bookings:', error);
        try {
          handleFirestoreError(error, OperationType.LIST, 'bookings');
        } catch (e) {
          toast.error('Бүртгэлүүдийг ачаалахад алдаа гарлаа');
        }
        setLoading(false);
      }
    );

    const unsubClasses = onSnapshot(collection(db, 'classes'), (snap) => {
      const next: Record<string, ClassLabel> = {};
      snap.docs.forEach((d) => {
        const data = d.data() as Record<string, unknown>;
        next[d.id] = { title: typeof data?.title === 'string' ? data.title : 'Хичээл' };
      });
      setClassesById(next);
    });

    return () => {
      unsubscribe();
      unsubClasses();
    };
  }, []);

  useEffect(() => {
    const uids = Array.from(
      new Set(bookings.map((b) => String(b.userId || '').trim()).filter((uid) => uid && !profileFetchStarted.current.has(uid)))
    );
    uids.forEach((uid) => profileFetchStarted.current.add(uid));
    if (uids.length === 0) return;
    let cancelled = false;
    void (async () => {
      const updates: Record<string, UserLabel> = {};
      for (const uid of uids) {
        try {
          const snap = await getDoc(doc(db, 'users', uid));
          if (snap.exists()) {
            const d = snap.data() as Record<string, unknown>;
            const email = String(d.email || '').trim();
            const name = String(d.displayName || d.name || '').trim() || (email ? email.split('@')[0] : uid.slice(0, 8));
            updates[uid] = { name, email };
          }
        } catch {
          /* ignore */
        }
      }
      if (!cancelled && Object.keys(updates).length > 0) {
        setUserLabels((prev) => ({ ...prev, ...updates }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookings]);

  const rows = useMemo(() => {
    return bookings.map((b) => {
      const userId = String(b.userId || '').trim();
      const classId = String(b.classId || b.itemId || '').trim();
      const label = resolveUserLabel(userId, userLabels);
      return {
        id: b.id,
        userName: label.name,
        userEmail: label.email,
        classTitle: classesById[classId]?.title || (classId ? `ID: ${classId.slice(0, 8)}…` : 'Тодорхойгүй'),
        type: String(b.type || '—'),
        monthKey: String(b.monthKey || b.weekKey || '—'),
        status: String(b.status || 'pending'),
        amountPaid: typeof b.amountPaid === 'number' ? b.amountPaid : null,
        createdLabel: formatCreated(b.createdAt),
      };
    });
  }, [bookings, classesById, userLabels]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'bookings', id), { status: newStatus });
      toast.success('Төлөв амжилттай шинэчлэгдлээ');
    } catch (error) {
      console.error('Error updating status:', error);
      try {
        handleFirestoreError(error, OperationType.UPDATE, `bookings/${id}`);
      } catch (e) {
        toast.error('Төлөв шинэчлэхэд алдаа гарлаа');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Та энэ бүртгэлийг устгахдаа итгэлтэй байна уу?')) return;
    try {
      await deleteDoc(doc(db, 'bookings', id));
      toast.success('Бүртгэл устгагдлаа');
    } catch (error) {
      console.error('Error deleting booking:', error);
      try {
        handleFirestoreError(error, OperationType.DELETE, `bookings/${id}`);
      } catch (e) {
        toast.error('Устгахад алдаа гарлаа');
      }
    }
  };

  if (loading && bookings.length === 0) {
    return <div className="p-8 text-center text-brand-ink/60">Уншиж байна...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-light text-brand-ink">Бүртгэлүүд</h1>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-bottom border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-brand-ink/45">Хэрэглэгч</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-brand-ink/45">Хичээл</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-brand-ink/45">Сар/Долоо хоног</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-brand-ink/45">Төлбөр</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-brand-ink/45">Огноо</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-brand-ink/45">Төлөв</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-brand-ink/45 text-right">Үйлдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-brand-ink/45">Бүртгэл олдсонгүй.</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-brand-ink">{row.userName}</span>
                        <span className="text-xs text-brand-ink/45">{row.userEmail}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-brand-ink">{row.classTitle}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-icon">{row.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-brand-ink/70">{row.monthKey}</td>
                    <td className="px-6 py-4 text-sm text-brand-ink/70">
                      {row.amountPaid === null ? '—' : row.amountPaid === 0 ? 'Үнэгүй' : `${row.amountPaid.toLocaleString()}₮`}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-brand-ink/45">
                        <Calendar size={14} />
                        {row.createdLabel}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={row.status}
                        onChange={(e) => handleStatusChange(row.id, e.target.value)}
                        className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border-none focus:ring-0 cursor-pointer ${
                          row.status === 'confirmed' ? 'bg-green-50 text-green-600' :
                          row.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                          'bg-yellow-50 text-yellow-600'
                        }`}
                      >
                        <option value="pending">Хүлээгдэж буй</option>
                        <option value="confirmed">Баталгаажсан</option>
                        <option value="cancelled">Цуцлагдсан</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(row.id)}
                        className="text-red-600 hover:bg-red-50 h-8 w-8 rounded-full"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
