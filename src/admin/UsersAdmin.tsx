import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Button } from '../components/ui/button';
import { 
  Users, 
  Shield, 
  User as UserIcon,
  Mail,
  Calendar,
  Search,
  CheckCircle2,
  XCircle,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'admin' | 'teacher' | 'client';
  subscriptionStatus: 'active' | 'inactive';
  createdAt: any;
}

export const UsersAdmin: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const fetchedUsers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserProfile[];
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Хэрэглэгчдийг ачаалахад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      toast.success('Эрх амжилттай шинэчлэгдлээ');
      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Эрх шинэчлэхэд алдаа гарлаа');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Та энэ хэрэглэгчийг устгахдаа итгэлтэй байна уу?')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      toast.success('Хэрэглэгч устгагдлаа');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Устгахад алдаа гарлаа');
    }
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && users.length === 0) {
    return <div className="p-8 text-center">Уншиж байна...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h1 className="text-3xl font-light">Хэрэглэгчид</h1>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-accent/40" size={18} />
          <input 
            type="text"
            placeholder="Хайх..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-icon/20 text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-bottom border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-accent/40">Хэрэглэгч</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-accent/40">Эрх</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-accent/40">Төлөв</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-accent/40">Бүртгүүлсэн</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-accent/40 text-right">Үйлдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-accent/40">Хэрэглэгч олдсонгүй.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-100 bg-secondary/30">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <UserIcon size={20} className="text-accent/40" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-brand-ink">{user.displayName || 'Нэргүй'}</p>
                          <p className="text-xs text-accent/40">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        user.role === 'admin' ? 'bg-red-50 text-red-600' :
                        user.role === 'teacher' ? 'bg-blue-50 text-blue-600' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {user.subscriptionStatus === 'active' ? (
                          <CheckCircle2 size={16} className="text-green-500" />
                        ) : (
                          <XCircle size={16} className="text-gray-300" />
                        )}
                        <span className="text-xs font-medium text-accent/60">
                          {user.subscriptionStatus === 'active' ? 'Идэвхтэй' : 'Идэвхгүй'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-accent/40">
                        {user.createdAt?.toDate?.() ? user.createdAt.toDate().toLocaleDateString() : 'Тодорхойгүй'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <select 
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="text-xs font-medium bg-transparent border-none focus:ring-0 cursor-pointer text-brand-icon hover:underline"
                        >
                          <option value="client">Client</option>
                          <option value="teacher">Teacher</option>
                          <option value="admin">Admin</option>
                        </select>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(user.id)}
                          className="text-red-600 hover:bg-red-50 h-8 w-8 rounded-full"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
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
