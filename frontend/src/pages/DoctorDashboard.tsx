import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, MapPin, X, CheckCircle, Pill, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export default function DoctorDashboard() {
  const { user, token, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [prescriptionModal, setPrescriptionModal] = useState<any>(null);
  const [prescriptionForm, setPrescriptionForm] = useState<{medicine: string, dosage: string}[]>([
     { medicine: '', dosage: '' }
  ]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'manage') setActiveTab('manage');
      else if (hash === 'history') setActiveTab('history');
      else if (hash === 'dashboard' || !hash) setActiveTab('dashboard');
      else if (hash === 'profile') setActiveTab('dashboard');
    };
    
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); 
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchAppointments();
  }, [token]);

  const fetchAppointments = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/medical-appointments/doctor-appointments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setAppointments(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/medical-appointments/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success(`Appointment ${status}`);
        fetchAppointments();
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const incrementLiveToken = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/doctors/live_status/increment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        toast.success("Called next token!");
        const data = await res.json();
        updateUser({ currentToken: data.current_token } as any);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateLiveStatus = async (status: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/doctors/live_status/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success(`Availability set to: ${status}`);
        updateUser({ liveStatus: status } as any);
      }
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleSubmitPrescription = async (e: React.FormEvent) => {
     e.preventDefault();
     const validMeds = prescriptionForm.filter(p => p.medicine.trim() !== '' && p.dosage.trim() !== '');
     
     try {
       const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/medical-appointments/${prescriptionModal._id}/prescription`, {
         method: 'PATCH',
         headers: { 
           'Content-Type': 'application/json',
           Authorization: `Bearer ${token}` 
         },
         body: JSON.stringify({ prescription: validMeds })
       });
       if (res.ok) {
         toast.success("Prescription saved & Appointment completed!");
         setPrescriptionModal(null);
         fetchAppointments();
       }
     } catch (err) {
       toast.error("Failed to save prescription");
     }
  };

  const pending = appointments.filter(a => a.status === 'pending');
  const active = appointments.filter(a => a.status === 'confirmed');
  const completed = appointments.filter(a => a.status === 'completed' || a.status === 'cancelled');

  let currentViewList: any[] = [];
  if (activeTab === 'manage') currentViewList = [...active, ...pending];
  else if (activeTab === 'history') currentViewList = completed;

  return (
    <div className="w-full relative pb-10">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 mt-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 capitalize">{activeTab}</h1>
          <p className="text-gray-500 mt-1 flex items-center"><MapPin className="w-4 h-4 mr-1 text-gray-400" /> {user?.address || 'Doctor Portal'}</p>
        </div>

        <div className="flex bg-white rounded-lg p-1 shadow-sm border mt-4 md:mt-0">
          <button onClick={() => window.location.hash = 'dashboard'} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'dashboard' ? 'bg-[#0066CC] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Overview</button>
          <button onClick={() => window.location.hash = 'manage'} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'manage' ? 'bg-[#0066CC] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Manage Queue</button>
          <button onClick={() => window.location.hash = 'history'} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'history' ? 'bg-[#0066CC] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>History</button>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <p className="text-sm font-medium text-gray-500">Total Tokens Today</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">{active.length + pending.length}</p>
            </div>
            
            {/* Live Token Management Card */}
            <div className="col-span-1 lg:col-span-2 bg-gradient-to-r from-[#0066CC] to-[#0088A8] text-white p-6 rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-20"><RefreshCw className="w-24 h-24" /></div>
               <div className="relative z-10">
                 <p className="text-sm font-medium text-blue-100 mb-1">Live Tracking Console</p>
                 <div className="flex items-center gap-6 mt-3">
                   <div>
                     <p className="text-xs uppercase tracking-wider text-blue-200">Current Token</p>
                     <p className="text-5xl font-bold">#{(user as any)?.currentToken || 0}</p>
                   </div>
                   <Button onClick={incrementLiveToken} className="bg-white text-[#0066CC] hover:bg-blue-50 ml-auto mr-4 shadow-lg active:scale-95 transition-all">
                     Call Next Token (+1)
                   </Button>
                 </div>
                 <p className="text-xs text-blue-100 mt-4">Calling next token automatically updates patient views.</p>
               </div>
            </div>

            {/* Availability Status Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
               <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Presence Controls</p>
               <div className="flex flex-col gap-2">
                 <button onClick={() => handleUpdateLiveStatus('Live')} className={`text-left px-3 py-2 rounded-md text-sm font-bold flex items-center gap-2 border transition-all ${user?.liveStatus === 'Live' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-400 border-transparent hover:border-gray-200'}`}>
                    <span className={`w-2 h-2 rounded-full ${user?.liveStatus === 'Live' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></span>
                    Live / Available
                 </button>
                 <button onClick={() => handleUpdateLiveStatus('Surgery')} className={`text-left px-3 py-2 rounded-md text-sm font-bold flex items-center gap-2 border transition-all ${user?.liveStatus === 'Surgery' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-400 border-transparent hover:border-gray-200'}`}>
                    <span className={`w-2 h-2 rounded-full ${user?.liveStatus === 'Surgery' ? 'bg-red-500' : 'bg-gray-300'}`}></span>
                    In Surgery
                 </button>
                 <button onClick={() => handleUpdateLiveStatus('Break')} className={`text-left px-3 py-2 rounded-md text-sm font-bold flex items-center gap-2 border transition-all ${user?.liveStatus === 'Break' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-400 border-transparent hover:border-gray-200'}`}>
                    <span className={`w-2 h-2 rounded-full ${user?.liveStatus === 'Break' ? 'bg-amber-500' : 'bg-gray-300'}`}></span>
                    On Break
                 </button>
               </div>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
             <h3 className="text-lg font-bold">Ready to see patients?</h3>
             <p className="text-gray-500 mt-2 mb-6">Switch over to the Manage Queue tab to start confirming and prescribing.</p>
             <Button onClick={() => window.location.hash = 'manage'}>Go to Manage Queue</Button>
          </div>
        </div>
      )}

      {(activeTab === 'manage' || activeTab === 'history') && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto animate-in fade-in duration-500">
           <table className="w-full text-sm text-left text-gray-500">
             <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
               <tr>
                 <th className="px-6 py-4">Token</th>
                 <th className="px-6 py-4">Patient Info</th>
                 <th className="px-6 py-4">Status & Time</th>
                 <th className="px-6 py-4 text-right">Actions</th>
               </tr>
             </thead>
             <tbody>
               {currentViewList.length === 0 ? (
                 <tr><td colSpan={4} className="text-center py-8">No appointments to show.</td></tr>
               ) : currentViewList.map(apt => (
                 <tr key={apt._id} className="border-b hover:bg-gray-50">
                   <td className="px-6 py-4">
                      {apt.tokenNumber ? <span className="font-bold text-lg text-gray-900 border px-3 py-1 rounded bg-white shadow-sm">#{apt.tokenNumber}</span> : '-'}
                   </td>
                   <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{apt.patientId?.name || apt.reason?.split('|')[0] || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{apt.reason?.substring(0, 40)}{apt.reason?.length > 40 ? '...' : ''}</p>
                   </td>
                   <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-sm text-xs font-semibold capitalize ${
                        apt.status === 'confirmed' ? 'bg-[#D1FAE5] text-[#059669]' : 
                        apt.status === 'pending' ? 'bg-[#FEF3C7] text-[#D97706]' : 
                        apt.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {apt.status === 'confirmed' ? 'Active' : apt.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-2">{new Date(apt.appointmentDate).toLocaleString()}</p>
                   </td>
                   <td className="px-6 py-4 text-right space-x-2">
                      {apt.status === 'pending' && (
                         <Button onClick={() => handleUpdateStatus(apt._id, 'confirmed')} size="sm" variant="outline" className="text-green-600 border-green-200">Confirm</Button>
                      )}
                      {apt.status === 'confirmed' && (
                         <Button onClick={() => { setPrescriptionForm([{medicine:'', dosage:''}]); setPrescriptionModal(apt); }} size="sm" className="bg-[#0088A8] hover:bg-[#00748F]">Write Rx</Button>
                      )}
                      {(apt.status === 'pending' || apt.status === 'confirmed') && (
                         <Button onClick={() => handleUpdateStatus(apt._id, 'cancelled')} size="sm" variant="outline" className="text-red-500 border-red-200">Cancel</Button>
                      )}
                      {apt.status === 'completed' && (
                         <Button variant="outline" size="sm" onClick={() => { setPrescriptionModal({...apt, readOnly: true}); }} className="border-gray-300">View Rx</Button>
                      )}
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      )}

      {/* Prescription Modal */}
      {prescriptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
           <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
              <div className="bg-[#0066CC] p-6 text-white flex justify-between items-center relative">
                 <div className="flex items-center gap-3">
                    <Pill className="w-8 h-8 opacity-80" />
                    <div>
                      <h2 className="text-xl font-bold">Medical Prescription</h2>
                      <p className="text-sm opacity-80">Patient: {prescriptionModal.patientId?.name || prescriptionModal.reason?.split('|')[0]}</p>
                    </div>
                 </div>
                 <button onClick={() => setPrescriptionModal(null)} className="text-white/80 hover:text-white absolute right-6 top-6"><X className="w-5 h-5"/></button>
              </div>

              {!prescriptionModal.readOnly ? (
                 <form onSubmit={handleSubmitPrescription} className="p-8 pb-10">
                    <p className="text-sm text-gray-500 mb-6">Type out the medications and dosages. Submitting this will automatically mark this appointment as Completed and send the prescription digitally to the hospital pharmacy.</p>
                    
                    <div className="space-y-4 mb-6">
                       {prescriptionForm.map((item, idx) => (
                         <div key={idx} className="flex gap-4 items-start">
                            <div className="flex-1">
                               <label className="block text-xs font-semibold text-gray-700 mb-1">Medicine Name</label>
                               <input 
                                 type="text" required
                                 value={item.medicine}
                                 onChange={e => {
                                    const next = [...prescriptionForm];
                                    next[idx].medicine = e.target.value;
                                    setPrescriptionForm(next);
                                 }}
                                 className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                                 placeholder="e.g. Amoxicillin 500mg"
                               />
                            </div>
                            <div className="w-1/3">
                               <label className="block text-xs font-semibold text-gray-700 mb-1">Dosage / Instructions</label>
                               <input 
                                 type="text" required
                                 value={item.dosage}
                                 onChange={e => {
                                    const next = [...prescriptionForm];
                                    next[idx].dosage = e.target.value;
                                    setPrescriptionForm(next);
                                 }}
                                 className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                                 placeholder="e.g. 1-0-1 (after food)"
                               />
                            </div>
                            <Button 
                               type="button" 
                               variant="outline" 
                               className="mt-5 text-red-500 border-red-200"
                               onClick={() => setPrescriptionForm(prescriptionForm.filter((_, i) => i !== idx))}
                            >
                               <X className="w-4 h-4" />
                            </Button>
                         </div>
                       ))}
                    </div>

                    <Button 
                       type="button" 
                       variant="outline" 
                       className="mb-8 w-full border-dashed"
                       onClick={() => setPrescriptionForm([...prescriptionForm, { medicine: '', dosage: '' }])}
                    > + Add Another Medication </Button>

                    <div className="flex justify-end pt-4 border-t border-gray-100 gap-3">
                       <Button type="button" variant="outline" onClick={() => setPrescriptionModal(null)}>Cancel</Button>
                       <Button type="submit" className="bg-[#188C5C] hover:bg-[#15794F] px-8">Submit & Complete</Button>
                    </div>
                 </form>
              ) : (
                 <div className="p-8">
                     <h3 className="font-bold text-gray-900 border-b pb-2 mb-4">Prescribed Medications</h3>
                     {prescriptionModal.prescription && prescriptionModal.prescription.length > 0 ? (
                       <ul className="space-y-3 mb-8">
                         {prescriptionModal.prescription.map((rx: any, idx: number) => (
                           <li key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-md border border-gray-100">
                             <span className="font-semibold text-gray-800">{rx.medicine}</span>
                             <span className="text-sm text-gray-500">{rx.dosage}</span>
                           </li>
                         ))}
                       </ul>
                     ) : (
                       <p className="text-gray-500 mb-8 italic">No medications were digitally prescribed during this visit.</p>
                     )}
                     <div className="flex justify-end pt-4 border-t border-gray-100">
                       <Button type="button" onClick={() => setPrescriptionModal(null)}>Close</Button>
                    </div>
                 </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
}
