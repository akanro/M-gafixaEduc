import { apiFetch } from '../utils/api';
import React from 'react';
import { AlertCircle, Check, X } from 'lucide-react';

export default function Alerts() {
  const [alerts, setAlerts] = React.useState<any[]>([]);

  React.useEffect(() => {
    // Fetch alerts from API
    Promise.all([
      apiFetch('/api/alertes').then(res => res.json()),
      apiFetch('/api/timetable-requests').then(res => res.json())
    ]).then(([alerts, requests]) => {
      const formattedAlerts = alerts.map((a: any) => ({
        ...a,
        title: a.title || a.titre,
        message: a.message || a.description
      }));
      const formattedRequests = requests
        .filter((r: any) => r.status === 'pending')
        .map((r: any) => ({
          id: `req-${r.id}`,
          title: `Demande de modification d'emploi du temps`,
          message: `${r.enseignant_nom} ${r.enseignant_prenom}: ${r.description}`,
          type: 'timetable',
          requestId: r.id
        }));
      setAlerts([...formattedAlerts, ...formattedRequests]);
    });
  }, []);

  const handleApprove = (alert: any) => {
    if (alert.type === 'timetable') {
      apiFetch(`/api/timetable-requests/${alert.requestId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      }).then(() => setAlerts(alerts.filter(a => a.id !== alert.id)));
    } else {
      apiFetch(`/api/alertes/${alert.id}/approve`, { method: 'POST' })
        .then(() => setAlerts(alerts.filter(a => a.id !== alert.id)));
    }
  };

  const handleRefuse = (alert: any) => {
    if (alert.type === 'timetable') {
      apiFetch(`/api/timetable-requests/${alert.requestId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' })
      }).then(() => setAlerts(alerts.filter(a => a.id !== alert.id)));
    } else {
      apiFetch(`/api/alertes/${alert.id}/refuse`, { method: 'POST' })
        .then(() => setAlerts(alerts.filter(a => a.id !== alert.id)));
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Alertes</h1>
      <div className="space-y-4">
        {alerts.map((alert: any) => (
          <div key={alert.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <AlertCircle className="text-amber-500" size={24} />
              <div>
                <h3 className="font-bold text-slate-900">{alert.title}</h3>
                <p className="text-sm text-slate-500">{alert.message}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {['manual', 'timetable'].includes(alert.type) && (
                <>
                  <button onClick={() => handleApprove(alert)} className="p-2 bg-primary-100 text-primary-600 rounded-lg hover:bg-primary-200">
                    <Check size={18} />
                  </button>
                  <button onClick={() => handleRefuse(alert)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200">
                    <X size={18} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
