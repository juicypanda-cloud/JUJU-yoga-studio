import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Button } from '../components/ui/button';
import { 
  Trash2, 
  CheckCircle2, 
  XCircle,
  Clock,
  User,
  Mail,
  Phone,
  Calendar,
  Tag
} from 'lucide-react';
import { toast } from 'sonner';

interface Booking {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhone?: string;
  itemTitle: string;
  itemId: string;
  type: 'retreat' | 'class';
  status: 'pending' | 'confirmed' | 'cancelled';
  bookingDate: string;
  createdAt: any;
}

export const BookingsAdmin: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedBookings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Booking[];
      setBookings(fetchedBookings);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching bookings:', error);
      try {
        handleFirestoreError(error, OperationType.LIST, 'bookings');
      } catch (e) {
        toast.error('Бүртгэлүүдийг ачаалахад алдаа гарлаа');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
    return <div className="p-8 text-center">Уншиж байна...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-light">Бүртгэлүүд</h1>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-bottom border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-accent/40">Хэрэглэгч</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-accent/40">Хичээл / Ретрит</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-accent/40">Огноо</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-accent/40">Төлөв</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-accent/40 text-right">Үйлдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-accent/40">Бүртгэл олдсонгүй.</td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-brand-ink">{booking.userName}</span>
                        <span className="text-xs text-accent/40">{booking.userEmail}</span>
                        {booking.userPhone && <span className="text-[10px] text-accent/40">{booking.userPhone}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-brand-ink">{booking.itemTitle}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-icon">{booking.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-accent/40">
                        <Calendar size={14} />
                        {booking.createdAt?.toDate?.() ? booking.createdAt.toDate().toLocaleDateString() : 'Тодорхойгүй'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={booking.status}
                        onChange={(e) => handleStatusChange(booking.id, e.target.value)}
                        className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border-none focus:ring-0 cursor-pointer ${
                          booking.status === 'confirmed' ? 'bg-green-50 text-green-600' :
                          booking.status === 'cancelled' ? 'bg-red-50 text-red-600' :
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
                        onClick={() => handleDelete(booking.id)}
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
