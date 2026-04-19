import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from '@tanstack/react-router';
import { Bot, X, Calendar, Pill, User as UserIcon, Save, CreditCard, CheckCircle, Download, Clock, AlertTriangle, Info, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function PatientDashboard() {
  const { user, token, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  
  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payingAppointment, setPayingAppointment] = useState<any>(null);

  // Profile Edit State
  const [profileData, setProfileData] = useState<any>({ name: '', phone: '', email: '', gender: '', dateOfBirth: '', address: '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'manage') setActiveTab('manage');
      else if (hash === 'history') setActiveTab('history');
      else if (hash === 'profile') setActiveTab('profile');
      else if (hash === 'dashboard' || !hash) setActiveTab('dashboard');
    };
    
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); 
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchAppointments();
    if (activeTab === 'profile') {
       fetchProfile();
    }
    
    // Auto-refresh tokens every 60 seconds for live HUD
    const interval = setInterval(fetchAppointments, 60000);
    return () => clearInterval(interval);
  }, [token, activeTab]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
         const data = await res.json();
         setProfileData({ ...data, dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split('T')[0] : '' });
      }
    } catch(err) {}
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/profile`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
         body: JSON.stringify(profileData)
      });
      if (res.ok) {
         toast.success("Profile updated securely.");
         const { user: updatedUser } = await res.json();
         updateUser(updatedUser);
      } else {
         toast.error("Failed to update profile.");
      }
    } catch(err) {
       toast.error("Network error");
    } finally {
       setIsSavingProfile(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/medical-appointments/my-appointments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setAppointments(data);
      }
    } catch (error) {
      console.error("Error formatting appointments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAppointment = async (id: string) => {
      if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/medical-appointments/${id}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ status: 'cancelled' })
        });
        if (res.ok) {
          toast.success('Appointment safely cancelled');
          fetchAppointments();
          if (selectedAppointment?._id === id) setSelectedAppointment(null);
        }
      } catch (err) {
        toast.error('Network error');
      }
  };

  const handlePayBill = async () => {
     if (!payingAppointment) return;
     try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/medical-appointments/${payingAppointment._id}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ status: 'paid' })
        });
        if (res.ok) {
           toast.success('Pharmacy bill paid successfully!');
           setShowPaymentModal(false);
           setPayingAppointment(null);
           fetchAppointments();
        }
     } catch (err) {
        toast.error("Payment failed to process");
     }
  };

  const total = appointments.length;
  const upcomingList = appointments.filter(a => ['confirmed', 'pending', 'billed'].includes(a.status));
  const historyList = appointments.filter(a => ['completed', 'paid', 'cancelled'].includes(a.status));

  let currentViewList: any[] = [];
  if (activeTab === 'manage') currentViewList = upcomingList;
  else if (activeTab === 'history') currentViewList = historyList;

  const handlePrint = () => window.print();

  // Alert Logic
  const todayStr = new Date().toLocaleDateString();
  const activeToday = upcomingList.filter(a => {
     const aptDate = new Date(a.appointmentDate).toLocaleDateString();
     return aptDate === todayStr && ['confirmed', 'pending'].includes(a.status);
  });
  
  const tokenAlerts = activeToday.map(apt => {
     const currentToken = apt.doctorId?.currentToken || 0;
     const myToken = apt.tokenNumber;
     const diff = myToken - currentToken;
     
     if (diff < 0) return { type: 'red', msg: `Your Token #${myToken} has already passed! Please meet the receptionist immediately.`, doctor: apt.doctorName };
     if (diff === 0) return { type: 'red', msg: `Your turn has arrived! Please enter Dr. ${apt.doctorName?.replace(/^Dr\.\s+/i, '')}'s cabin now.`, doctor: apt.doctorName };
     if (diff > 0 && diff <= 10) return { type: 'yellow', msg: `Head to Dr. ${apt.doctorName?.replace(/^Dr\.\s+/i, '')}'s clinic fastly, remaining ${diff} tokens only!`, doctor: apt.doctorName };
     return null;
  }).filter(Boolean);

  return (
    <div className="w-full relative">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 mt-2 text-center md:text-left">
        <div>
          <h1 className="text-3xl font-black text-gray-900 capitalize tracking-tight">{activeTab}</h1>
          <p className="text-gray-500 mt-1 font-medium">MedFlow Patient Portal</p>
        </div>

        <div className="flex items-center gap-3 mt-4 md:mt-0 justify-center">
          <Link to="/patient/symptoms">
            <Button className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white rounded-md shadow-sm font-bold">
              <Bot className="mr-2 h-4 w-4" /> Symptom Analyzer
            </Button>
          </Link>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="animate-in fade-in duration-500">
          
          {/* URGENT TOKEN ALERTS */}
          {tokenAlerts.length > 0 && (
            <div className="mb-8 space-y-3">
               {tokenAlerts.map((alert: any, idx) => (
                 <div key={idx} className={`p-4 rounded-xl flex items-start gap-4 border shadow-sm animate-bounce-short ${
                    alert.type === 'red' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                 }`}>
                    {alert.type === 'red' ? <AlertTriangle className="w-6 h-6 shrink-0" /> : <Info className="w-6 h-6 shrink-0" />}
                    <div>
                       <p className="font-black text-sm uppercase tracking-wide mb-1">{alert.type === 'red' ? '⚠️ EXPIRED TOKEN' : '⚡ PROXIMITY ALERT'}</p>
                       <p className="font-bold text-lg leading-tight">{alert.msg}</p>
                    </div>
                 </div>
               ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Total Visits</p>
              <p className="text-4xl font-black text-gray-900">{total}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">In Queue</p>
              <p className="text-4xl font-black text-[#FFB020]">{upcomingList.filter(a=>a.status==='confirmed').length}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Bills Due</p>
              <p className="text-4xl font-black text-emerald-600">{upcomingList.filter(a=>a.status==='billed').length}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between h-32 hover:shadow-md transition-shadow">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Completed</p>
              <p className="text-4xl font-black text-[#14B8A6]">{historyList.filter(a=>a.status==='completed' || a.status === 'paid').length}</p>
            </div>
          </div>

          <h2 className="text-lg font-black text-gray-800 mb-4 uppercase tracking-tighter">Action Center</h2>
          {upcomingList.filter(a=>a.status === 'billed').length > 0 ? (
             <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl shadow-sm flex items-center justify-between border-l-4 border-l-emerald-500">
                <div>
                   <h3 className="font-black text-emerald-900 text-lg">Hospital Bill Generated!</h3>
                   <p className="text-sm text-emerald-700 mt-1 font-medium">Your prescription and pharmacy bill are ready. Please pay now to collect medicines.</p>
                </div>
                <Button onClick={() => window.location.hash = 'manage'} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6">Pay Bill Now</Button>
             </div>
          ) : upcomingList.filter(a => ['confirmed', 'pending'].includes(a.status)).length === 0 ? (
            <div className="bg-white p-10 rounded-xl border border-dashed border-gray-300 shadow-sm text-center">
                <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="text-gray-300 w-8 h-8" />
                </div>
                <p className="text-gray-500 font-bold">No active doctor visits scheduled today.</p>
                <a href="/book-appointment">
                  <Button className="mt-6 bg-[#1877F2] hover:bg-[#1565D8] px-8 font-bold shadow-lg shadow-blue-500/20">Book a New Booking</Button>
                </a>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-xl border border-blue-100 bg-blue-50/30 shadow-sm flex items-center justify-between border-l-4 border-l-blue-500">
               <div>
                  <h3 className="font-black text-gray-900 text-lg">Next Visit: Dr. {upcomingList.filter(a => ['confirmed', 'pending'].includes(a.status))[0].doctorName?.replace(/^Dr\.\s+/i, '')}</h3>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center text-xs font-bold text-gray-500 bg-white px-2 py-1 rounded border shadow-sm"><Calendar className="w-3 h-3 mr-1" /> {new Date(upcomingList.filter(a => ['confirmed', 'pending'].includes(a.status))[0].appointmentDate).toLocaleDateString()}</span>
                    <span className="flex items-center text-xs font-bold text-gray-500 bg-white px-2 py-1 rounded border shadow-sm"><Clock className="w-3 h-3 mr-1" /> {new Date(upcomingList.filter(a => ['confirmed', 'pending'].includes(a.status))[0].appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
               </div>
               <Button onClick={() => window.location.hash = 'manage'} variant="outline" className="font-bold border-blue-200 text-blue-600 hover:bg-blue-50">Manage Queue</Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'profile' && (
         <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-500 max-w-2xl mx-auto md:mx-0">
            <div className="bg-gradient-to-r from-blue-50 to-white px-8 py-8 border-b">
               <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-[#1877F2] rounded-2xl rotate-3 text-white flex items-center justify-center shadow-lg">
                     <UserIcon className="w-10 h-10 -rotate-3" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Personal Medical File</h2>
                    <p className="text-gray-500 text-sm font-medium mt-1">Keep your profile updated for better healthcare.</p>
                  </div>
               </div>
            </div>
            <form onSubmit={handleProfileUpdate} className="p-8 space-y-6">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                     <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Full Legal Name</label>
                     <input type="text" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} className="w-full border-2 border-gray-100 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#1877F2] bg-gray-50 font-bold transition-all" required />
                  </div>
                  <div>
                     <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Email (Immutable)</label>
                     <input type="email" value={profileData.email} disabled className="w-full border-2 border-gray-100 rounded-lg px-4 py-2.5 text-sm outline-none bg-gray-100 text-gray-400 font-bold" />
                  </div>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                     <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Contact Number</label>
                     <input type="tel" value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} className="w-full border-2 border-gray-100 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#1877F2] bg-gray-50 font-bold transition-all" />
                  </div>
                  <div>
                     <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Date of Birth</label>
                     <input type="date" value={profileData.dateOfBirth} onChange={e => setProfileData({...profileData, dateOfBirth: e.target.value})} className="w-full border-2 border-gray-100 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#1877F2] bg-gray-50 font-bold transition-all" />
                  </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                     <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Biological Gender</label>
                     <select value={profileData.gender} onChange={e => setProfileData({...profileData, gender: e.target.value})} className="w-full border-2 border-gray-100 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#1877F2] bg-gray-50 font-bold transition-all">
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Current Address</label>
                     <input type="text" value={profileData.address || ''} onChange={e => setProfileData({...profileData, address: e.target.value})} className="w-full border-2 border-gray-100 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#1877F2] bg-gray-50 font-bold transition-all" />
                  </div>
               </div>
               <div className="pt-4 flex justify-end">
                  <Button type="submit" disabled={isSavingProfile} className="bg-gray-900 hover:bg-black text-white px-10 h-12 font-bold shadow-xl">
                     <Save className="w-4 h-4 mr-2" /> {isSavingProfile ? 'Updating...' : 'Save Profile Securely'}
                  </Button>
               </div>
            </form>
         </div>
      )}

      {(activeTab === 'manage' || activeTab === 'history') && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto animate-in fade-in duration-500">
           <table className="w-full text-sm text-left">
             <thead className="bg-gray-50/50 border-b border-gray-100">
               <tr>
                 <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Token</th>
                 <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Doctor</th>
                 <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Schedule</th>
                 <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                 <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-50">
               {currentViewList.length === 0 ? (
                 <tr><td colSpan={5} className="text-center py-16 font-bold text-gray-400 italic">No {activeTab === 'manage' ? 'active visits' : 'historical records'} found in your account.</td></tr>
               ) : currentViewList.map(apt => (
                 <tr key={apt._id} className="hover:bg-gray-50/50 transition-colors group">
                   <td className="px-6 py-6">
                      {apt.tokenNumber ? <span className="font-black text-xl text-[#1877F2] px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 shadow-sm">#{apt.tokenNumber}</span> : '-'}
                   </td>
                   <td className="px-6 py-6">
                      <p className="font-black text-gray-800 text-base">Dr. {apt.doctorName?.replace(/^Dr\.\s+/i, '')}</p>
                      <p className="text-xs text-gray-500 font-bold uppercase mt-0.5 tracking-tight">{apt.doctorSpecialty}</p>
                   </td>
                   <td className="px-6 py-6">
                      <p className="font-bold text-gray-800">{new Date(apt.appointmentDate).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-400 font-medium mt-1">{new Date(apt.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                   </td>
                   <td className="px-6 py-6 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm inline-block ${
                        apt.status === 'confirmed' ? 'bg-[#D1FAE5] text-[#059669] border-emerald-200' : 
                        apt.status === 'pending' ? 'bg-[#FEF3C7] text-[#D97706] border-amber-200' : 
                        apt.status === 'billed' ? 'bg-[#1877F2] text-white border-blue-600 animate-pulse' :
                        apt.status === 'completed' ? 'bg-blue-100 text-blue-700 border-blue-200' : 
                        apt.status === 'paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                        'bg-red-100 text-red-700 border-red-200'
                      }`}>
                        {apt.status === 'billed' ? `₹${apt.totalBill || 0} Bill Ready` : apt.status}
                      </span>
                   </td>
                   <td className="px-6 py-6 text-right">
                      <div className="flex justify-end gap-2 items-center">
                        {apt.status === 'billed' ? (
                           <Button onClick={() => { setPayingAppointment(apt); setShowPaymentModal(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">Pay Bill</Button>
                        ) : (
                           <Button variant="outline" onClick={() => setSelectedAppointment(apt)} className="font-bold text-gray-600 border-gray-200 hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] transition-all">Details</Button>
                        )}
                        
                        {activeTab === 'manage' && (apt.status === 'pending' || apt.status === 'confirmed') && (
                           <Button variant="ghost" onClick={() => handleCancelAppointment(apt._id)} className="text-red-400 hover:text-red-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Cancel</Button>
                        )}
                      </div>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      )}

      {/* BILL PAYMENT MODAL (RAZORPAY SIMULATOR) */}
      {showPaymentModal && payingAppointment && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-300">
               <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400"></div>
               
               <div className="p-10 flex flex-col items-center">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/1/14/Razorpay_logo.svg" alt="Razorpay" className="h-6 mb-10 opacity-90" />
                  
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Pharmacy Bill Checkout</h3>
                    <p className="text-gray-500 text-xs mt-2 font-black tracking-widest">MFR # {payingAppointment.tokenNumber}</p>
                  </div>

                  <div className="w-full bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100 flex justify-between items-center shadow-inner">
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                           <Pill className="w-6 h-6 text-[#1877F2]" />
                        </div>
                        <div>
                           <p className="text-[10px] text-gray-400 font-black uppercase">Token</p>
                           <p className="font-black text-xl text-gray-900">#{payingAppointment.tokenNumber}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] text-gray-400 font-black uppercase">To Pay</p>
                        <p className="text-3xl font-black text-[#1877F2]">₹{payingAppointment.totalBill || 0}.00</p>
                     </div>
                  </div>

                  <div className="relative group mb-10">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative p-4 bg-white border-2 border-gray-100 rounded-2xl shadow-sm">
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=pharmacy@razorpay&pn=MedFlow%20Pharmacy&am=${payingAppointment.totalBill || 0}&cu=INR&tn=Bill-${payingAppointment.tokenNumber}`} alt="QR Code" width="180" height="180" className="rounded-lg" />
                    </div>
                  </div>

                  <div className="w-full space-y-4">
                    <Button onClick={handlePayBill} className="w-full bg-[#1877F2] hover:bg-[#1565D8] text-white font-black h-14 rounded-xl shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] border-b-4 border-blue-800 text-lg uppercase">
                      Finish Payment Now
                    </Button>
                    <Button variant="ghost" onClick={() => { setShowPaymentModal(false); setPayingAppointment(null); }} className="w-full text-gray-400 hover:text-gray-800 font-bold">
                      Pay at Counter
                    </Button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* Appointment Detail & Receipt Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm no-print">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
             <div className="bg-gradient-to-r from-[#1877F2] to-[#00B4D8] p-6 relative flex flex-col items-center">
                <button onClick={() => setSelectedAppointment(null)} className="absolute top-4 right-4 text-white/80 hover:text-white no-print">
                   <X className="h-5 w-5" />
                </button>
                <div className="bg-white/20 p-3 rounded-full mb-3 backdrop-blur-sm">
                   {selectedAppointment.status === 'paid' ? <CheckCircle className="h-6 w-6 text-white" /> : <Calendar className="h-6 w-6 text-white" />}
                </div>
                <h2 className="text-2xl font-black text-white text-center tracking-tight">
                   {selectedAppointment.status === 'paid' ? 'Visit Receipt' : 'Booking Details'}
                </h2>
             </div>
             
             <div className="p-8" id="receipt-section">
                <div className="flex items-center gap-3 justify-center mb-6">
                   <span className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                      ['paid', 'completed'].includes(selectedAppointment.status) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                   }`}>
                      {selectedAppointment.status}
                   </span>
                   <span className="bg-gray-900 text-white text-[10px] px-5 py-1.5 rounded-full font-black tracking-widest shadow-lg">
                      TOKEN #{selectedAppointment.tokenNumber}
                   </span>
                </div>

                {/* LIVE TOKEN HUD */}
                {!['completed', 'paid', 'cancelled'].includes(selectedAppointment.status) && selectedAppointment.tokenNumber && (
                    <div className="rounded-2xl p-6 mb-8 text-center bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 shadow-inner">
                        <p className="text-gray-500 text-[10px] font-black mb-4 tracking-widest uppercase items-center flex justify-center">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#1877F2] animate-pulse mr-2.5 shadow-[0_0_10px_#1877F2]"></span> REAL-TIME QUEUE HUD
                        </p>
                        <div className="flex justify-around items-center pb-4 mb-4 border-b border-blue-200/50">
                            <div>
                                <p className="text-gray-400 text-[9px] font-black mb-1.5 uppercase">CURRENT</p>
                                <span className="font-black text-3xl text-gray-900">#{selectedAppointment.doctorId?.currentToken || 0}</span>
                            </div>
                            <div className="text-2xl text-blue-200 font-thin">/</div>
                            <div>
                                <p className="text-gray-400 text-[9px] font-black mb-1.5 uppercase">YOUR TARGET</p>
                                <span className="font-black text-3xl text-[#1877F2]">#{selectedAppointment.tokenNumber}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <span className="font-black text-sm text-gray-700 uppercase tracking-tighter">Queue Remaining:</span>
                            <span className="font-black text-xl text-amber-500">
                                {Math.max(0, selectedAppointment.tokenNumber - (selectedAppointment.doctorId?.currentToken || 0))} Patients
                            </span>
                        </div>
                    </div>
                )}

                <div className="bg-gray-50 rounded-2xl p-8 mb-8 border border-gray-100 flex flex-col md:flex-row justify-between gap-8 shadow-inner">
                   <div>
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Physician Record</h4>
                      <p className="text-[#1877F2] font-black text-2xl mb-1">Dr. {selectedAppointment.doctorName?.replace(/^Dr\.\s+/i, '')}</p>
                      <p className="text-gray-500 font-bold text-sm tracking-tight">{selectedAppointment.doctorSpecialty}</p>
                      <div className="flex items-center text-gray-400 text-[10px] mt-4 font-bold uppercase">
                        <UserIcon className="w-3 h-3 mr-1" /> Hospital: {selectedAppointment.doctorId?.address || 'Medical Center'}
                      </div>
                   </div>
                   <div className="md:text-right">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Clinic Schedule</h4>
                      <p className="text-gray-900 font-black text-lg mb-1">{new Date(selectedAppointment.appointmentDate).toLocaleDateString()}</p>
                      <p className="text-gray-500 font-bold text-sm">{new Date(selectedAppointment.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                   </div>
                </div>

                {selectedAppointment.prescription && selectedAppointment.prescription.length > 0 && (
                  <div className="border-2 border-gray-100 rounded-2xl overflow-hidden mb-10 shadow-sm bg-white">
                      <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                         <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest tracking-widest">Medical Prescription</h4>
                         <Pill className="w-4 h-4 text-[#1877F2]" />
                      </div>
                      <div className="p-6">
                        <ul className="space-y-4">
                          {selectedAppointment.prescription.map((rx: any, idx: number) => (
                            <li key={idx} className="flex justify-between items-center border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                               <div>
                                  <p className="font-black text-gray-800">{rx.medicine}</p>
                                  <p className="text-[10px] text-gray-400 font-black uppercase mt-1">Dosage Protocol: {rx.dosage}</p>
                               </div>
                               <div className="h-2 w-2 rounded-full bg-[#1877F2]"></div>
                            </li>
                          ))}
                        </ul>
                      </div>
                  </div>
                )}

                {selectedAppointment.billing && selectedAppointment.billing.items && selectedAppointment.billing.items.length > 0 && (
                  <div className="border-2 border-gray-100 rounded-2xl overflow-hidden mb-10 shadow-sm bg-white">
                      <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                         <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Pharmacy Billing Summary</h4>
                         <span className="font-black text-blue-600 text-[10px] tracking-widest">TOTAL: ₹{selectedAppointment.billing.amount || 0}</span>
                      </div>
                      <div className="p-6">
                        <table className="w-full text-xs text-left">
                           <thead>
                              <tr className="text-gray-400 font-black uppercase tracking-widest border-b border-gray-50">
                                 <th className="pb-3">Item Name</th>
                                 <th className="pb-3 text-center">Qty</th>
                                 <th className="pb-3 text-right">Price</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-50">
                              {selectedAppointment.billing.items.map((item: any, idx: number) => (
                                 <tr key={idx} className="group">
                                    <td className="py-4 font-black text-gray-800">{item.name}</td>
                                    <td className="py-4 text-center font-bold text-gray-600">x{item.quantity}</td>
                                    <td className="py-4 text-right font-black text-gray-900">₹{item.price}</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                      </div>
                  </div>
                )}

                {selectedAppointment.status === 'paid' && (
                   <div className="bg-emerald-600 rounded-2xl p-6 text-white text-center shadow-xl shadow-emerald-500/20 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                      <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-2 relative z-10">Financial Clearances</p>
                      <p className="text-3xl font-black relative z-10 font-mono tracking-tighter">₹{selectedAppointment.totalBill || 0}.00 FULLY PAID</p>
                      <p className="text-[10px] text-emerald-100 mt-3 font-bold italic opacity-80 relative z-10">Digital Auth Stamp: MedFlow-PHARM-OK-{selectedAppointment._id.slice(-6).toUpperCase()}</p>
                   </div>
                )}
                
                <div className="mt-10 flex justify-center gap-4 no-print pb-4">
                   <Button variant="outline" onClick={() => setSelectedAppointment(null)} className="font-bold">Close Portal</Button>
                   <Button onClick={handlePrint} className="bg-gray-900 hover:bg-black text-white px-8 font-black flex items-center gap-2 shadow-xl">
                      <Download className="w-4 h-4" /> Download Report
                   </Button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* GLOBAL HUD STYLE & PRINT */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden !important; }
          #receipt-section, #receipt-section * { visibility: visible !important; }
          #receipt-section { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important; 
            border: none !important; 
            box-shadow: none !important; 
            background: white !important;
            padding: 40px !important;
          }
          .no-print { display: none !important; }
        }
        @keyframes bounce-short {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce-short {
          animation: bounce-short 1.2s infinite ease-in-out;
        }
      `}} />
    </div>
  );
}
