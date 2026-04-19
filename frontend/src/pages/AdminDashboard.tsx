import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { FileText, UserCheck, X, IndianRupee, Activity, Calendar as CalendarIcon, Download, Printer, Filter, Plus } from 'lucide-react';
import { toast } from 'sonner';

const getTokenInfo = (token: number) => {
  if (token <= 10) return { time: "09:00 AM - 09:30 AM", session: "Morning (Tokens 1-10)" };
  if (token <= 20) return { time: "09:40 AM - 10:20 AM", session: "Morning (Tokens 11-20)" };
  if (token <= 30) return { time: "10:30 AM - 11:10 AM", session: "Morning (Tokens 21-30)" };
  if (token <= 40) return { time: "11:20 AM - 12:00 PM", session: "Morning (Tokens 31-40)" };
  if (token <= 50) return { time: "12:10 PM - 12:50 PM", session: "Morning (Tokens 41-50)" };
  if (token <= 60) return { time: "04:00 PM - 04:40 PM", session: "Evening (Tokens 51-60)" };
  if (token <= 70) return { time: "04:50 PM - 05:30 PM", session: "Evening (Tokens 61-70)" };
  if (token <= 80) return { time: "05:40 PM - 06:20 PM", session: "Evening (Tokens 71-80)" };
  if (token <= 90) return { time: "06:30 PM - 07:10 PM", session: "Evening (Tokens 81-90)" };
  return { time: "07:20 PM - 08:00 PM", session: "Evening (Tokens 91-100)" };
};

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

export default function AdminDashboard() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [walkInForm, setWalkInForm] = useState({
     patientName: '',
     patientPhone: '',
     doctorId: '',
     doctorName: '',
     doctorSpecialty: '',
     appointmentDate: new Date().toISOString().split('T')[0]
  });
  
  const [bookedAdminTokens, setBookedAdminTokens] = useState<number[]>([]);
  const [selectedAdminToken, setSelectedAdminToken] = useState<number | null>(null);
  const [isFetchingTokens, setIsFetchingTokens] = useState(false);
  const [printableAppointment, setPrintableAppointment] = useState<any | null>(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'manage') setActiveTab('manage');
      else if (hash === 'history') setActiveTab('appointments');
      else if (hash === 'dashboard' || !hash) setActiveTab('dashboard');
      else if (hash === 'profile') setActiveTab('dashboard');
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
  }, [token]);

  useEffect(() => {
    if (modalStep === 2 && walkInForm.appointmentDate && walkInForm.doctorId) {
      setIsFetchingTokens(true);
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/medical-appointments/booked-tokens/${walkInForm.doctorId}/${walkInForm.appointmentDate}`)
        .then(res => res.json())
        .then(data => {
            setBookedAdminTokens(data);
            setIsFetchingTokens(false);
        })
        .catch(err => {
            console.error("Error fetching booked tokens", err);
            setIsFetchingTokens(false);
        });
    }
  }, [modalStep, walkInForm.appointmentDate, walkInForm.doctorId]);

  const fetchAppointments = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/medical-appointments/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setAppointments(await res.json());
    } catch(err) {} finally { setLoading(false); }
  };

  const fetchDoctors = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/doctors/list`);
      if (res.ok) {
         let data = await res.json();
         if (user?.address) {
            data = data.filter((d: any) => normalizeHospitalName(d.address) === user.address);
         }
         setDoctorsList(data);
      }
    } catch(err) {}
  };

  const handleWalkInSubmit = async () => {
    if (!selectedAdminToken) {
       toast.error("Please pick a token");
       return;
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/medical-appointments/walk-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...walkInForm, tokenNumber: selectedAdminToken })
      });
      if (res.ok) {
        const result = await res.json();
        toast.success("Walk-in recorded!");
        setPrintableAppointment(result.appointment);
        setShowWalkInModal(false);
        setModalStep(1);
        setSelectedAdminToken(null);
        fetchAppointments();
      }
    } catch(err) { toast.error("Submission failed"); }
  };

  const handleConfirmStatus = async (aptId: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/medical-appointments/${aptId}`, {
         method: 'PATCH',
         headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
         body: JSON.stringify({ status: 'confirmed', isPaid: true })
      });
      if (res.ok) {
        toast.success("Appointment confirmed!");
        fetchAppointments();
      }
    } catch (err) { toast.error("Failed to confirm"); }
  };

  const exportPDFView = () => { window.print(); };

  if (loading) return <div className="flex justify-center p-20">Loading Admin Portal...</div>;

  return (
    <div className="w-full relative">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 mt-2 no-print">
        <div>
          <h1 className="text-3xl font-black text-gray-900 capitalize tracking-tight">
            {activeTab === 'dashboard' ? 'Overview' : activeTab === 'manage' ? 'Manage Appointments' : 'History'}
          </h1>
          <p className="text-gray-500 mt-1 font-medium italic opacity-80 tracking-tight">{user?.address ? `${normalizeHospitalName(user.address)} Command Center` : 'Central Management'}</p>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="animate-in fade-in duration-700 no-print">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12 text-white">
            {[
              { label: 'Total Visited', value: appointments.filter(a => a.status === 'completed' || a.status === 'confirmed').length, icon: UserCheck, bg: 'bg-[#1877F2]' },
              { label: 'Active Tokens', value: appointments.filter(a => a.status === 'confirmed').length, icon: Activity, bg: 'bg-[#00A884]' },
              { label: 'Pending Docs', value: appointments.filter(a => a.status === 'pending').length, icon: FileText, bg: 'bg-[#FF9F0A]' },
              { label: 'Net Revenue', value: `₹${appointments.filter(a => a.isPaid).length * 500}`, icon: IndianRupee, bg: 'bg-[#6C5CE7]' },
            ].map((stat, i) => (
              <div key={i} className={`${stat.bg} p-8 rounded-[2rem] shadow-2xl shadow-black/10 flex flex-col justify-between h-44 group hover:scale-[1.02] transition-all`}>
                <div className="flex justify-between items-start">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">{stat.label}</p>
                   <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-md"><stat.icon className="h-5 w-5" /></div>
                </div>
                <div>
                   <p className="text-4xl font-black mb-1">{stat.value}</p>
                   <div className="w-12 h-1.5 bg-white/30 rounded-full" />
                </div>
              </div>
            ))}
          </div>

          <div className="py-20 flex flex-col items-center text-center opacity-40">
             <Activity className="w-12 h-12 text-gray-400 mb-6" />
             <p className="text-xl font-black text-gray-500">Clinical Monitoring Panel</p>
          </div>
        </div>
      )}

      {(activeTab === 'manage' || activeTab === 'appointments') && (
        <div className="animate-in slide-in-from-bottom-8 duration-700">
           <div className="flex justify-between items-center mb-6 no-print">
              <div className="flex gap-3">
                 <Button variant="outline" className="rounded-xl border-2 font-bold px-4 h-11"><Filter className="w-4 h-4 mr-2"/> Filters</Button>
                 <Button onClick={() => setShowWalkInModal(true)} className="bg-[#188C5C] hover:bg-[#15794F] text-white h-11 px-6 font-black rounded-xl shadow-lg shadow-emerald-500/10 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Walk-in
                 </Button>
              </div>
              <Button onClick={exportPDFView} className="bg-black text-white hover:bg-gray-800 h-11 px-6 font-black rounded-xl shadow-xl transition-all active:scale-95 flex items-center gap-2">
                 <Printer className="w-4 h-4" /> Export Report (PDF)
              </Button>
           </div>

           <div className="bg-white rounded-[2rem] shadow-2xl shadow-black/5 border border-gray-100 overflow-hidden print:border-none print:shadow-none">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] bg-gray-50/50 border-b">
                  <tr>
                    <th className="px-8 py-6">Token Details</th>
                    <th className="px-8 py-6">Patient & Physician</th>
                    <th className="px-8 py-6">Status</th>
                    <th className="px-8 py-6">Finance</th>
                    <th className="px-8 py-6 text-right no-print">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {appointments.map((apt) => (
                    <tr key={apt._id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                           <span className="font-black text-lg text-gray-900 bg-gray-100 w-12 h-12 flex items-center justify-center rounded-2xl group-hover:bg-[#188C5C] group-hover:text-white transition-colors duration-300">#{apt.tokenNumber || 'N/A'}</span>
                           <div>
                              <p className="font-black text-gray-900">{new Date(apt.appointmentDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</p>
                              <p className="text-[10px] uppercase font-bold text-gray-400">{getTokenInfo(apt.tokenNumber).time.split(' - ')[0]}</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                         <p className="font-black text-gray-900 text-base">{apt.patientId?.name || apt.reason?.split(': ')[1]?.split(' (')[0] || apt.reason?.split('|')[0] || 'Unknown'}</p>
                         <p className="text-xs text-blue-600 mt-0.5 font-bold tracking-tight">Physician: Dr. {apt.doctorName?.replace(/^Dr\.\s+/i, '')}</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          apt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 
                          apt.status === 'pending' ? 'bg-orange-100 text-orange-700' : 
                          apt.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {apt.status}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className={`flex items-center gap-1 font-black ${apt.isPaid ? 'text-emerald-600' : 'text-gray-400'}`}>
                          <IndianRupee className="h-3 w-3" /> {apt.isPaid ? 'PAID' : 'DUE'}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right no-print">
                         {apt.status === 'pending' && (
                            <Button onClick={() => handleConfirmStatus(apt._id)} size="sm" className="bg-[#188C5C] hover:bg-black text-white h-9 px-6 font-black rounded-lg transition-all">Confirm</Button>
                         )}
                         {apt.status === 'confirmed' && (
                            <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic group-hover:text-emerald-600 transition-colors">Active sequence</div>
                         )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>

           <div className="hidden print:block fixed top-0 left-0 right-0 p-10 bg-white border-b-2 border-black">
              <h1 className="text-4xl font-black italic">MedFlow Detailed Report</h1>
              <div className="flex justify-between mt-4">
                 <p><strong>Hospital:</strong> {user?.address ? normalizeHospitalName(user.address) : 'Central'}</p>
                 <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
              </div>
           </div>
        </div>
      )}

      {showWalkInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md shadow-2xl">
           <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500 max-h-[90vh] flex flex-col border border-white/20">
              <div className="bg-[#188C5C] p-10 text-white flex justify-between items-center shrink-0">
                 <div>
                    <h2 className="text-3xl font-black tracking-tight flex items-center gap-4"><CalendarIcon className="w-8 h-8"/> Walk-in Registry</h2>
                    <p className="text-emerald-100/70 text-sm font-medium mt-1">Manual registration for arrival patients</p>
                 </div>
                 <button onClick={() => { setShowWalkInModal(false); setModalStep(1); }} className="hover:rotate-90 transition-all bg-white/10 p-3 rounded-full"><X className="w-8 h-8"/></button>
              </div>

              <div className="p-10 overflow-y-auto flex-1">
                 <div className="flex gap-4 mb-10">
                    {[1, 2].map(s => (
                       <div key={s} className="flex-1 space-y-3">
                          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${modalStep >= s ? 'text-[#188C5C]' : 'text-gray-300'}`}>{s === 1 ? 'Patient Details' : 'Select Slot'}</p>
                          <div className={`h-2 rounded-full transition-all duration-700 ${modalStep >= s ? 'bg-[#188C5C]' : 'bg-gray-100'}`} />
                       </div>
                    ))}
                 </div>

                 {modalStep === 1 && (
                    <div className="space-y-10">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div>
                             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Patient Full Name</label>
                             <input className="w-full border-4 border-gray-50 bg-gray-50/50 p-4 rounded-2xl outline-none focus:border-[#188C5C] focus:bg-white font-black text-lg transition-all" value={walkInForm.patientName} onChange={e => setWalkInForm({...walkInForm, patientName: e.target.value})} placeholder="Full name..." />
                          </div>
                          <div>
                             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Mobile Contact</label>
                             <input className="w-full border-4 border-gray-50 bg-gray-50/50 p-4 rounded-2xl outline-none focus:border-[#188C5C] focus:bg-white font-black text-lg transition-all" value={walkInForm.patientPhone} onChange={e => setWalkInForm({...walkInForm, patientPhone: e.target.value})} placeholder="Mobile..." />
                          </div>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div>
                             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Booking Date</label>
                             <input type="date" className="w-full border-4 border-gray-50 bg-gray-50/50 p-4 rounded-2xl outline-none focus:border-[#188C5C] focus:bg-white font-black text-lg transition-all" value={walkInForm.appointmentDate} onChange={e => setWalkInForm({...walkInForm, appointmentDate: e.target.value})} />
                          </div>
                          <div>
                             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Physician</label>
                             <select className="w-full border-4 border-gray-50 bg-gray-50/50 p-4 rounded-2xl outline-none focus:border-[#188C5C] focus:bg-white font-black text-lg transition-all appearance-none" 
                                onChange={e => {
                                   const d = doctorsList.find(doc => doc._id === e.target.value);
                                   if (d) setWalkInForm({...walkInForm, doctorId: d._id, doctorName: d.name, doctorSpecialty: d.specialty});
                                }}>
                                <option value="">Select Doctor</option>
                                {doctorsList.map(d => <option key={d._id} value={d._id}>Dr. {d.name?.replace(/^Dr\.\s+/i, '')} ({d.specialty})</option>)}
                             </select>
                          </div>
                       </div>
                    </div>
                 )}

                 {modalStep === 2 && (
                    <div className="space-y-10">
                       <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
                          {Array.from({length: 100}, (_, i) => i + 1).map(t => {
                             const isBooked = bookedAdminTokens.includes(t);
                             const isWalkInOnly = t % 10 === 0;
                             const info = getTokenInfo(t);
                             return (
                                <button 
                                   key={t}
                                   disabled={isBooked}
                                   onClick={() => setSelectedAdminToken(t)}
                                   className={`h-14 flex items-center justify-center rounded-2xl border-[3px] text-xs font-black transition-all ${
                                      isBooked ? 'bg-gray-100 text-gray-200 cursor-not-allowed border-gray-100' :
                                      selectedAdminToken === t ? 'bg-[#188C5C] text-white border-[#188C5C] shadow-2xl scale-110 z-10' :
                                      isWalkInOnly ? 'bg-orange-50 text-orange-900 border-orange-100 hover:border-orange-400' : 
                                      'bg-white text-gray-400 border-gray-50 hover:border-[#188C5C] hover:text-[#188C5C]'
                                   }`}
                                >
                                   {t}
                                </button>
                             );
                          })}
                       </div>
                    </div>
                 )}
              </div>

              <div className="p-10 border-t bg-gray-50/50 shrink-0 flex gap-6">
                 {modalStep === 1 ? (
                    <Button onClick={() => setModalStep(2)} className="w-full bg-[#188C5C] hover:bg-black h-16 text-xl font-black rounded-2xl shadow-xl transition-all active:scale-95" disabled={!walkInForm.doctorId || !walkInForm.appointmentDate}>Next: Select Token</Button>
                 ) : (
                    <>
                       <Button variant="outline" onClick={() => setModalStep(1)} className="w-40 h-16 font-black border-4 border-gray-200 rounded-2xl text-lg">Back</Button>
                       <Button onClick={handleWalkInSubmit} disabled={!selectedAdminToken} className="flex-1 bg-[#188C5C] hover:bg-black h-16 text-xl font-black rounded-2xl shadow-xl transition-all active:scale-95">Complete Booking</Button>
                    </>
                 )}
              </div>
           </div>
        </div>
      )}

      {printableAppointment && (
        <div className="fixed inset-0 z-[100] bg-white p-20 flex flex-col items-center overflow-y-auto">
            <div className="w-full max-w-md border-[8px] border-black p-12 text-center space-y-8 shadow-2xl relative">
                <h1 className="text-5xl font-black italic tracking-tighter">MedFlow</h1>
                <div className="py-12 bg-black text-white rounded-3xl">
                    <p className="text-xs font-black uppercase tracking-widest opacity-50 mb-3">Sequence Token</p>
                    <p className="text-[10rem] font-black leading-none">#{printableAppointment.tokenNumber}</p>
                </div>
                <div className="text-left space-y-4 py-8 border-y-4 border-dashed border-black">
                    <div className="flex justify-between items-end border-b border-black/5 pb-1"><span className="text-[10px] font-black uppercase opacity-30">Patient</span> <span className="font-black text-lg">{printableAppointment.reason?.split(': ')[1]?.split(' (')[0] || 'Walk-in'}</span></div>
                    <div className="flex justify-between items-end border-b border-black/5 pb-1"><span className="text-[10px] font-black uppercase opacity-30">Physician</span> <span className="font-black text-lg">Dr. {printableAppointment.doctorName?.replace(/^Dr\.\s+/i, '')}</span></div>
                    <div className="flex justify-between items-end border-b border-black/5 pb-1"><span className="text-[10px] font-black uppercase opacity-30">Date</span> <span className="font-black text-lg">{new Date(printableAppointment.appointmentDate).toLocaleDateString()}</span></div>
                    <div className="flex justify-between items-end"><span className="text-[10px] font-black uppercase opacity-30">Queue Time</span> <span className="font-black text-lg">{getTokenInfo(printableAppointment.tokenNumber).time.split(' - ')[0]}</span></div>
                </div>
                <div className="pt-6 opacity-30 text-[10px] font-black uppercase tracking-widest italic">
                    <p>Secured Hospital Sequence Token</p>
                    <p>{new Date().toLocaleString()}</p>
                </div>
            </div>
            <div className="mt-12 flex gap-8 no-print">
               <Button onClick={() => window.print()} className="bg-black text-white px-12 h-16 rounded-2xl font-black text-xl hover:scale-105 transition-all shadow-2xl">
                   Print Ticket
               </Button>
               <Button variant="outline" onClick={() => setPrintableAppointment(null)} className="h-16 px-10 border-4 border-black font-black text-xl rounded-2xl hover:bg-gray-100">Dismiss</Button>
            </div>
        </div>
      )}

      <style>{`
          @media print {
              .no-print, header, aside, .lucide, button, .tabs-list { display: none !important; }
              body { padding: 0 !important; margin: 0 !important; background: white !important; font-size: 12px; }
              .fixed, .absolute { position: static !important; }
              .rounded-3xl, .rounded-2xl { border-radius: 0 !important; border: 1px solid #eee !important; }
              table { width: 100% !important; border-collapse: collapse !important; }
              th { background: #f9f9f9 !important; color: black !important; border-bottom: 2px solid black !important; }
              td { border-bottom: 1px solid #eee !important; }
          }
      `}</style>
    </div>
  );
}
