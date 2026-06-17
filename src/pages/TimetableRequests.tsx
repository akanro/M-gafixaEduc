import { apiFetch } from '../utils/api';
import React from 'react';
import { Check, X, Clock } from 'lucide-react';

import { useConfirm } from '../contexts/ConfirmContext';

export default function TimetableRequests() {
  const { confirm } = useConfirm();
  const [requests, setRequests] = React.useState<any[]>([]);

  React.useEffect(() => {
    apiFetch('/api/timetable-requests').then(res => res.json()).then(setRequests);
  }, []);

  const handleStatusChange = async (id: number, status: string) => {
    const confirmMsg = status === 'pending' ? "Révoquer l'approbation de cette demande ?" : 
                      status === 'approved' ? "Approuver cette demande ?" : 
                      "Rejeter cette demande ?";
    
    const isConfirmed = await confirm({
      title: 'Confirmation de statut',
      message: confirmMsg,
      type: status === 'approved' ? 'info' : 'warning'
    });
    
    if (!isConfirmed) return;

    apiFetch(`/api/timetable-requests/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    }).then(() => {
      setRequests(requests.map(r => r.id === id ? { ...r, status } : r));
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Demandes de modification d'emploi du temps</h1>
        <p className="text-slate-500">Gérez les demandes des enseignants.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs">
            <tr>
              <th className="px-6 py-4">Enseignant</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4">Statut</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map((req: any) => (
              <tr key={req.id}>
                <td className="px-6 py-4">{req.enseignant_nom}</td>
                <td className="px-6 py-4">{req.description}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${req.status === 'pending' ? 'bg-amber-100 text-amber-700' : req.status === 'approved' ? 'bg-primary-100 text-primary-700' : 'bg-red-100 text-red-700'}`}>
                    {req.status}
                  </span>
                </td>
                <td className="px-6 py-4 flex gap-2">
                  {req.status === 'pending' && (
                    <>
                      <button onClick={() => handleStatusChange(req.id, 'approved')} className="p-2 bg-primary-100 text-primary-700 rounded-xl hover:bg-primary-200" title="Approuver">
                        <Check size={16} />
                      </button>
                      <button onClick={() => handleStatusChange(req.id, 'rejected')} className="p-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200" title="Rejeter">
                        <X size={16} />
                      </button>
                    </>
                  )}
                  {req.status === 'approved' && (
                    <button onClick={() => handleStatusChange(req.id, 'pending')} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 text-xs font-bold" title="Révoquer">
                      Révoquer
                    </button>
                  )}
                  {req.status === 'rejected' && (
                    <button onClick={() => handleStatusChange(req.id, 'pending')} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-xs font-bold" title="Remettre en attente">
                      Réinitialiser
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
