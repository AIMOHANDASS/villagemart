import { motion } from "framer-motion";
import { Users as UsersIcon, Search, User as UserIcon, Mail, Phone, Calendar, BadgeCheck, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { apiClient } from "../../../api/apiClient";
import toast from "react-hot-toast";

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  phone: string;
  profile_image: string | null;
  created_at: string;
  is_verified: number | boolean;
}

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data }: any = await apiClient.get("/admin/users");
      setUsers(data || []);
    } catch (err: any) {
      toast.error("Failed to load users: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const s = search.toLowerCase();
    return (
      (user.name || "").toLowerCase().includes(s) ||
      (user.email || "").toLowerCase().includes(s) ||
      (user.phone || "").includes(s)
    );
  });

  return (
    <div className="space-y-5">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage registered users</p>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 max-w-sm shadow-sm">
        <Search className="w-4 h-4 text-gray-400" />
        <input 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          placeholder="Search by name, email, or phone..." 
          className="bg-transparent text-sm outline-none flex-1" 
        />
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-green-100 border-t-green-500 rounded-full animate-spin"></div>
          <p className="text-gray-500 mt-4 font-medium">Loading users...</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-[var(--shadow-card)] border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">User Details</th>
                  <th className="px-6 py-4 font-semibold">Contact Info</th>
                  <th className="px-6 py-4 font-semibold">Registration Date</th>
                  <th className="px-6 py-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-green-50/30 transition-colors">
                      {/* Name & ID */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {user.profile_image ? (
                            <img src={user.profile_image} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-200">
                              {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-5 h-5" />}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">{user.name || "Unknown User"}</p>
                            <p className="text-xs text-gray-500 font-mono">ID: #{user.id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span>{user.email || "—"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{user.phone || "—"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Registration Date */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{new Date(user.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}</span>
                        </div>
                      </td>

                      {/* Verification Status */}
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          {user.is_verified === 1 || user.is_verified === true ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                              <BadgeCheck className="w-3.5 h-3.5" />
                              <span>Verified</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
                              <XCircle className="w-3.5 h-3.5 text-gray-400" />
                              <span>Unverified</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <UsersIcon className="w-10 h-10 mb-3 text-gray-300" />
                        <p className="text-base font-medium text-gray-600">No users found</p>
                        <p className="text-sm">We couldn't find any user matching your search.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
