import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, FileText, CheckCircle2, Pill, Activity, ClipboardList, IndianRupee, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const normalizeHospitalName = (address?: string) => {
  if (!address) return "Other";
  const addr = address.toLowerCase();
  if (addr.includes("aiims")) return "AIIMS Mangalagiri";
  if (addr.includes("nri") || addr.includes("n.r.i")) return "NRI General Hospital";
  if (addr.includes("manipal")) return "Manipal Hospitals";
  if (addr.includes("vedanata") || addr.includes("vedanta")) return "Vedanata Hospital"; 
  if (addr.includes("aster") || addr.includes("ramesh")) return "Aster Ramesh Guntur";
  if (addr.includes("kamineni")) return "Kamineni Hospital";
  if (addr.includes("lv prasad") || addr.includes("l.v") || addr.includes("l v")) return "LV Prasad Eye Institute";
  return address; 
};

export default function PharmacistDashboard() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchForm, setSearchForm] = useState({ tokenNumber: '', doctorName: '' });
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [billItems, setBillItems] = useState<any[]>([]);
  const [hospitalDoctors, setHospitalDoctors] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalBills: 0, medicines: 0 });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'generate') setActiveTab('generate');
      else setActiveTab('dashboard');
    };
    
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); 
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/medical-appointments/my-appointments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
           const data = await res.json();
           const billed = data.filter((a: any) => a.status === 'billed' || a.status === 'paid');
           setStats({
              totalBills: billed.length,
              medicines: billed.reduce((acc: number, val: any) => acc + (val.billing?.items?.length || 0), 0)
           });
        }
      } catch(err) {}
    };
    fetchStats();
  }, [token, activeTab]);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/doctors/list`);
        if (res.ok) {
          let data = await res.json();
          if (user?.address) {
            data = data.filter((d: any) => normalizeHospitalName(d.address) === normalizeHospitalName(user.address));
          }
          setHospitalDoctors(data);
        }
      } catch (err) {
        console.error("Error fetching doctors:", err);
      }
    };
    fetchDoctors();
  }, [user]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchForm.tokenNumber || !searchForm.doctorName) return;
    setLoading(true);
    setAppointment(null);

    try {
      const qs = new URLSearchParams({ 
        tokenNumber: searchForm.tokenNumber, 
        doctorName: searchForm.doctorName 
      }).toString();
      
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/medical-appointments/pharmacist-search?${qs}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setAppointment(data);
        if (data.prescription) {
           setBillItems(data.prescription.map((rx: any) => ({ name: rx.medicine, price: 0, quantity: 1 })));
        }
      } else {
        toast.error("No valid completed prescription found.");
      }
    } catch (err) {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBill = async () => {
    const totalAmount = billItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (totalAmount <= 0) {
       toast.error("Please enter prices for the medications.");
       return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/medical-appointments/${appointment._id}/bill`, {
         method: 'PATCH',
         headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
         },
         body: JSON.stringify({ items: billItems, totalAmount })
      });

      if (res.ok) {
        toast.success(`Bill of ₹${totalAmount} generated and sent to Patient Portal!`);
        setTimeout(() => {
            setAppointment(null);
            setSearchForm({ tokenNumber: '', doctorName: '' });
            setBillItems([]);
            window.location.hash = 'dashboard';
        }, 1500);
      } else {
        toast.error("Failed to submit bill.");
      }
    } catch (err) {
      toast.error("Network error");
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8 mt-2">
        <h1 className="text-3xl font-black text-gray-900 capitalize tracking-tighter">Pharmacy Portal</h1>
        <p className="text-gray-500 mt-1 font-medium italic">{user?.address ? `${normalizeHospitalName(user.address)} Branch` : 'LifeCare Healthcare'}</p>
      </div>

      {activeTab === 'dashboard' ? (
        <div className="animate-in fade-in duration-500">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col justify-between h-40 hover:shadow-md transition-all">
                 <div className="flex justify-between items-start">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Bills Generated</p>
                    <IndianRupee className="w-5 h-5 text-emerald-500" />
                 </div>
                 <p className="text-5xl font-black text-gray-900 tracking-tighter">{stats.totalBills}</p>
              </div>

              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col justify-between h-40 hover:shadow-md transition-all">
                 <div className="flex justify-between items-start">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Medicines Dispensed</p>
                    <Pill className="w-5 h-5 text-blue-500" />
                 </div>
                 <p className="text-5xl font-black text-gray-900 tracking-tighter">{stats.medicines}</p>
              </div>

              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col justify-between h-40 hover:shadow-md transition-all">
                 <div className="flex justify-between items-start">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">System Status</p>
                    <Activity className="w-5 h-5 text-amber-500" />
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                    <p className="text-2xl font-black text-emerald-600 tracking-tighter uppercase">LIVE & ONLINE</p>
                 </div>
              </div>
           </div>

           <div className="bg-[#1877F2] rounded-2xl p-10 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-blue-500/20">
              <div className="text-center md:text-left">
                 <h2 className="text-2xl font-black tracking-tight">Generate a Pharmacy Bill</h2>
                 <p className="text-blue-100 mt-2 font-medium">Search for patient tokens to retrieve prescriptions and process payments.</p>
              </div>
              <Button onClick={() => window.location.hash = 'generate'} className="bg-white text-[#1877F2] hover:bg-gray-100 px-10 h-14 font-black rounded-xl text-lg shadow-lg">Start Billing Now</Button>
           </div>
        </div>
      ) : (
        <div className="animate-in slide-in-from-bottom-4 duration-500 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm h-fit">
              <div className="flex items-center gap-3 border-b pb-6 mb-6">
                 <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center"><Search className="w-5 h-5"/></div>
                 <h2 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Retrieve Data</h2>
              </div>
              
              <form onSubmit={handleSearch} className="space-y-6">
                 <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Token Number</label>
                    <input required type="number" className="w-full border-2 border-gray-50 rounded-xl px-4 py-3 outline-none focus:border-blue-500 bg-gray-50 font-bold transition-all" placeholder="e.g. 15" value={searchForm.tokenNumber} onChange={e => setSearchForm({ ...searchForm, tokenNumber: e.target.value })} />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Physician</label>
                    <select required className="w-full border-2 border-gray-50 rounded-xl px-4 py-3 outline-none focus:border-blue-500 bg-gray-50 font-bold transition-all appearance-none" value={searchForm.doctorName} onChange={e => setSearchForm({ ...searchForm, doctorName: e.target.value })}>
                       <option value="">Select Doctor</option>
                       {hospitalDoctors.map(d => <option key={d._id} value={d.name}>Dr. {d.name?.replace(/^Dr\.\s+/i, '')}</option>)}
                    </select>
                 </div>
                 <Button type="submit" disabled={loading} className="w-full bg-[#1877F2] hover:bg-blue-700 h-14 rounded-xl font-black text-white shadow-lg">
                    {loading ? 'Searching...' : 'Fetch Prescription'}
                 </Button>
              </form>
            </div>

            <div className="md:col-span-2">
              {!appointment ? (
                <div className="bg-blue-50/30 border-2 border-dashed border-blue-200 rounded-2xl h-[450px] flex flex-col items-center justify-center text-center p-10">
                  <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm mb-6 border border-blue-50"><ClipboardList className="w-10 h-10 text-blue-200" /></div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">No Active Selection</h3>
                  <p className="text-gray-500 font-medium max-w-sm">Please retrieve a prescription using the search panel to begin.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
                   <div className="bg-gray-50/50 p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                           <span className="bg-[#1877F2] text-white text-[10px] font-black px-2 py-1 rounded">TOKEN #{appointment.tokenNumber}</span>
                           <span className="bg-gray-200 text-gray-600 text-[10px] font-black px-2 py-1 rounded uppercase">{appointment.patientId?.name || 'Walk-in'}</span>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Billing Itemization</h2>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Doctor</p>
                         <p className="font-black text-[#1877F2] text-lg">Dr. {appointment.doctorName?.replace(/^Dr\.\s+/i, '')}</p>
                      </div>
                   </div>

                   <div className="p-8">
                     <div className="mb-8 bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                        <h3 className="text-xs font-black text-blue-900 uppercase tracking-widest mb-4 flex items-center gap-2"><Pill className="w-4 h-4" /> Physician's Prescription</h3>
                        {appointment.prescription && appointment.prescription.length > 0 ? (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {appointment.prescription.map((rx: any, idx: number) => (
                                 <div key={idx} className="bg-white p-3 rounded-lg border border-blue-50 shadow-sm flex items-center justify-between">
                                    <span className="font-black text-gray-800 text-sm">{rx.medicine}</span>
                                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold uppercase">{rx.dosage}</span>
                                 </div>
                              ))}
                           </div>
                        ) : <p className="text-gray-500 italic font-medium">No items found.</p>}
                     </div>

                     <div className="space-y-4">
                        {billItems.map((item, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-3 items-end bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="col-span-6"><label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Item</label><input className="w-full border-2 border-white rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-blue-500 transition-all" value={item.name} onChange={e => { const ni = [...billItems]; ni[idx].name = e.target.value; setBillItems(ni); }} /></div>
                            <div className="col-span-2"><label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Qty</label><input type="number" className="w-full border-2 border-white rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-blue-500 transition-all text-center" value={item.quantity} onChange={e => { const ni = [...billItems]; ni[idx].quantity = Number(e.target.value); setBillItems(ni); }} /></div>
                            <div className="col-span-3"><label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Price (₹)</label><input type="number" className="w-full border-2 border-white rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-blue-500 transition-all" value={item.price} onChange={e => { const ni = [...billItems]; ni[idx].price = Number(e.target.value); setBillItems(ni); }} /></div>
                          </div>
                        ))}
                        <Button variant="outline" className="w-full border-dashed border-2 py-6 text-gray-400 hover:text-blue-500 hover:border-blue-500 transition-all" onClick={() => setBillItems([...billItems, { name: '', price: 0, quantity: 1 }])}>Add Extra Item</Button>
                     </div>

                     <div className="mt-8 pt-8 border-t border-gray-100 flex justify-between items-center">
                        <div><p className="text-[10px] font-black text-gray-400 uppercase">Total Amount</p><p className="text-4xl font-black text-gray-900 tracking-tighter">₹{billItems.reduce((sum, i) => sum + (i.price * i.quantity), 0).toFixed(2)}</p></div>
                        <Button onClick={handleGenerateBill} className="bg-emerald-600 hover:bg-emerald-700 text-white h-16 px-10 font-black rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">Submit Bill</Button>
                     </div>
                   </div>
                </div>
              )}
            </div>
        </div>
      )}
    </div>
  );
}
