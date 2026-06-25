import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, 
  XCircle, 
  Truck, 
  Bike, 
  ExternalLink,
  ShieldCheck,
  Search,
  Filter,
  User as UserIcon,
  Phone,
  FileText
} from "lucide-react";
import { getDeliveryPartners, getTransportPartners, approvePartner, rejectPartner, blockPartner, unblockPartner } from "../api";
import { toast } from "react-hot-toast";

interface Partner {
  id: number;
  name: string;
  email: string;
  phone: string;
  vehicle_type: string;
  vehicle_number?: string;
  status: 'pending' | 'approved' | 'rejected';
  account_status?: 'APPROVED' | 'PENDING' | 'BLOCKED';
  created_at: string;
  profile_image?: string;
  document_url?: string;
  dl_document_url?: string;
  rc_document_url?: string;
  aadhaar_document_url?: string;
}

export default function PartnersPage() {
  const [tab, setTab] = useState<'delivery' | 'transport'>('delivery');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const data = tab === 'delivery' ? await getDeliveryPartners() : await getTransportPartners();
      setPartners(data.data || []);
    } catch (error) {
      toast.error("Failed to fetch partners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, [tab]);

  const handleAction = async (partnerId: number, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await approvePartner(tab, partnerId);
        toast.success("Partner approved successfully");
      } else {
        await rejectPartner(tab, partnerId);
        toast.error("Partner rejected");
      }
      fetchPartners();
    } catch (error) {
      toast.error("Action failed");
    }
  };

  const handleBlockAction = async (partnerId: number, action: 'block' | 'unblock') => {
    try {
      if (action === 'block') {
        await blockPartner(tab, partnerId);
        toast.success("Partner manually blocked");
      } else {
        await unblockPartner(tab, partnerId);
        toast.success("Partner successfully unblocked");
      }
      fetchPartners();
    } catch (error) {
      toast.error("Status update failed");
    }
  };

  const filteredPartners = partners.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.phone.includes(searchTerm);
    const matchesFilter = filter === 'all' || p.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partner Management</h1>
          <p className="text-sm text-gray-500">Manage delivery and transport partners</p>
        </div>
        
        <div className="flex bg-white rounded-xl p-1 shadow-sm border border-gray-100">
          <button 
            onClick={() => setTab('delivery')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'delivery' ? 'bg-green-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Bike className="w-4 h-4" />
            Delivery
          </button>
          <button 
            onClick={() => setTab('transport')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'transport' ? 'bg-green-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Truck className="w-4 h-4" />
            Transport
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="Search by name or phone..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-green-500 transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-200">
            <Filter className="w-4 h-4 text-gray-400" />
            <select 
              className="bg-transparent text-sm outline-none font-medium text-gray-700"
              value={filter}
              onChange={(e: any) => setFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredPartners.map((partner) => (
              <motion.div
                key={partner.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
              >
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                        {partner.profile_image ? (
                           <img 
                            src={`https://villagesmart.in/api/uploads/${partner.profile_image}`} 
                            alt={partner.name}
                            className="w-full h-full object-cover rounded-full"
                           />
                        ) : (
                          <UserIcon className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{partner.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                           <Phone className="w-3 h-3" />
                           {partner.phone}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      partner.status === 'approved' ? 'bg-green-100 text-green-700' :
                      partner.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {partner.status}
                    </span>
                  </div>
                  
                  {partner.account_status === 'BLOCKED' && (
                    <div className="mb-4 bg-red-50 text-red-700 border border-red-200 text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-2">
                      <ShieldCheck className="w-4 h-4" /> 
                      ACCOUNT BLOCKED BY ADMIN
                    </div>
                  )}

                  <div className="space-y-3 pt-4 border-t border-gray-50">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Vehicle</span>
                      <span className="font-medium text-gray-900 capitalize">{partner.vehicle_type}</span>
                    </div>
                    {partner.vehicle_number && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Number</span>
                        <span className="font-medium text-gray-900">{partner.vehicle_number}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Joined</span>
                      <span className="font-medium text-gray-900">{new Date(partner.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 border-t border-gray-100 grid grid-cols-1 gap-2">
                  <div className="flex flex-wrap gap-2 justify-center mb-2">
                    {partner.profile_image && (
                      <button onClick={() => setSelectedDoc(`http://localhost:8080/api/uploads/${partner.profile_image}`)}
                        className="flex-1 flex items-center justify-center gap-1 bg-white border border-gray-200 py-1.5 rounded-lg text-[10px] font-semibold text-gray-600 hover:bg-gray-100">
                        <FileText className="w-3 h-3" /> Profile
                      </button>
                    )}
                    {partner.aadhaar_document_url && (
                      <button onClick={() => setSelectedDoc(`http://localhost:8080/api/uploads/${partner.aadhaar_document_url}`)}
                        className="flex-1 flex items-center justify-center gap-1 bg-white border border-gray-200 py-1.5 rounded-lg text-[10px] font-semibold text-gray-600 hover:bg-gray-100">
                        <FileText className="w-3 h-3" /> Aadhaar
                      </button>
                    )}
                    {(partner.document_url || partner.dl_document_url) && (
                      <button onClick={() => setSelectedDoc(`http://localhost:8080/api/uploads/${partner.dl_document_url || partner.document_url}`)}
                        className="flex-1 flex items-center justify-center gap-1 bg-white border border-gray-200 py-1.5 rounded-lg text-[10px] font-semibold text-gray-600 hover:bg-gray-100">
                        <FileText className="w-3 h-3" /> {tab === 'delivery' ? 'Document' : 'DL'}
                      </button>
                    )}
                    {partner.rc_document_url && (
                      <button onClick={() => setSelectedDoc(`http://localhost:8080/api/uploads/${partner.rc_document_url}`)}
                        className="flex-1 flex items-center justify-center gap-1 bg-white border border-gray-200 py-1.5 rounded-lg text-[10px] font-semibold text-gray-600 hover:bg-gray-100">
                        <FileText className="w-3 h-3" /> RC
                      </button>
                    )}
                  </div>
                  
                  {partner.status === 'pending' ? (
                    <div className="flex gap-2 w-full">
                       <button 
                        onClick={() => handleAction(partner.id, 'approve')}
                        className="flex-1 bg-green-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-green-700 transition-colors shadow-sm active:scale-95"
                      >
                        Approve
                      </button>
                       <button 
                        onClick={() => handleAction(partner.id, 'reject')}
                        className="w-10 flex items-center justify-center bg-white border border-red-200 text-red-500 rounded-xl hover:bg-red-50 shadow-sm active:scale-95"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 w-full">
                      <div className={`flex flex-1 items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold ${
                        partner.status === 'approved' ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'
                      }`}>
                        {partner.status === 'approved' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {partner.status.toUpperCase()}
                      </div>
                      
                      {partner.status === 'approved' && (
                        <button 
                          onClick={() => handleBlockAction(partner.id, partner.account_status === 'BLOCKED' ? 'unblock' : 'block')}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
                            partner.account_status === 'BLOCKED' 
                            ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                            : 'bg-gray-800 hover:bg-gray-900 text-white'
                          }`}
                        >
                          {partner.account_status === 'BLOCKED' ? 'Unblock' : 'Block'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Doc Preview Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedDoc(null)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white p-2 rounded-3xl max-w-2xl w-full max-h-full overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            <button 
              className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black"
              onClick={() => setSelectedDoc(null)}
            >
              <XCircle className="w-6 h-6" />
            </button>
            <img src={selectedDoc} alt="Document" className="w-full h-auto rounded-2xl" />
          </motion.div>
        </div>
      )}
    </div>
  );
}
