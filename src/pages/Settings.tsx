import { apiFetch } from '../utils/api';
import React from 'react';
import { useConfirm } from '../contexts/ConfirmContext';
import logo from '../logo_megafixa.png';
import { 
  Settings as SettingsIcon, 
  Calendar, 
  Users, 
  Shield, 
  Database,
  ChevronRight,
  Plus,
  X,
  CheckCircle2,
  Archive,
  Trash2,
  ArrowRightCircle,
  ArrowLeftCircle,
  RotateCcw,
  CheckCircle,
  Copy,
  Save,
  Clock,
  FileText,
  Printer,
  History,
  Search,
  Filter,
  Tag,
  Info,
  User,
  Mail,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  Send,
  LogOut,
  Chrome
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';
import { getPrimaryColor, hexToRgb } from '../utils/theme';
import { useAuth } from '../contexts/AuthContext';

export default function Settings() {
  const { confirm } = useConfirm();
  const [annees, setAnnees] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const [showYearModal, setShowYearModal] = React.useState(false);
  const [showUserModal, setShowUserModal] = React.useState(false);
  const [newYearForm, setNewYearForm] = React.useState({
    libelle: '',
    date_debut: '',
    date_fin: ''
  });
  const [dbHealth, setDbHealth] = React.useState<any>(null);
  const [checkingHealth, setCheckingHealth] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<any>(null);
  const [userForm, setUserForm] = React.useState({
    nom: '',
    email: '',
    role: 'enseignant',
    approuve: 1,
    permissions: [] as any[]
  });
  const [showApprovalModal, setShowApprovalModal] = React.useState<any>(null);
  const [approvalForm, setApprovalForm] = React.useState({
    role: 'enseignant',
    permissions: [{ path: '/', can_write: true }] as any[]
  });
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [logs, setLogs] = React.useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = React.useState(false);
  const [logSearch, setLogSearch] = React.useState('');
  const [logFilterAction, setLogFilterAction] = React.useState('');
  const [logFilterEntity, setLogFilterEntity] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'general' | 'account' | 'roles'>('general');
  const [rolePermissions, setRolePermissions] = React.useState<any[]>([]);
  const [loadingRoles, setLoadingRoles] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [profileForm, setProfileForm] = React.useState({ nom: '', email: '' });
  const [passwordForm, setPasswordForm] = React.useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    code: ''
  });
  const [showPassword, setShowPassword] = React.useState(false);
  const [step, setStep] = React.useState<'request' | 'verify'>('request');
  const [sendingCode, setSendingCode] = React.useState(false);
  const [syncingTeachers, setSyncingTeachers] = React.useState(false);
  const [syncingCloud, setSyncingCloud] = React.useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { user: userData } = event.data;
        localStorage.setItem('user', JSON.stringify(userData));
        setCurrentUser(userData);
        showToast('Compte lié à Google avec succès');
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        showToast(event.data.error || 'Erreur lors de la liaison avec Google', 'error');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const res = await apiFetch('/api/auth/google/url');
      const data = await res.json();
      
      if (data.error) {
        showToast(data.error, 'error');
        return;
      }

      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        data.url,
        'google-link',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (err) {
      console.error("Google link error:", err);
      showToast('Erreur lors de la liaison avec Google', 'error');
    }
  };

  const fetchWithAuth = (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
    return apiFetch(url, { ...options, headers });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSyncTeachers = async () => {
    const ok = await confirm({
      title: 'Synchroniser les enseignants',
      message: "Voulez-vous créer automatiquement des comptes pour tous les enseignants qui n'en ont pas encore ? Ils recevront un email avec leurs identifiants.",
      confirmText: 'Synchroniser',
      type: 'info'
    });

    if (!ok) return;

    try {
      setSyncingTeachers(true);
      const res = await fetchWithAuth('/api/users/sync-teachers', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        showToast(`${data.created} comptes créés, ${data.skipped} ignorés.`);
        fetchUsers();
      } else {
        showToast(data.error || "Erreur lors de la synchronisation", "error");
      }
    } catch (err) {
      showToast("Erreur de connexion", "error");
    } finally {
      setSyncingTeachers(false);
    }
  };

  React.useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(user);
    setProfileForm({ nom: user.nom || '', email: user.email || '' });
  }, []);

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      const response = await fetchWithAuth('/api/audit-logs');
      if (!response.ok) {
        throw new Error(`Erreur serveur: ${response.status}`);
      }
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("La réponse du serveur n'est pas au format JSON.");
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        setLogs(data);
      } else {
        console.error('Expected array of logs, got:', data);
        setLogs([]);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const generatePDF = (trimester?: number) => {
    if (!showPlanningModal) return;

    const doc = new jsPDF();
    const title = trimester 
      ? `Planification des activités - ${trimester}${trimester === 1 ? 'er' : 'ème'} Trimestre - ${showPlanningModal.libelle}`
      : `Planification annuelle des activités - ${showPlanningModal.libelle}`;

    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);

    const filteredActivities = trimester 
      ? activities.filter(a => a.trimestre === trimester)
      : [...activities].sort((a, b) => a.trimestre - b.trimestre || new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime());

    const tableData = filteredActivities.map(a => [
      !trimester ? `${a.trimestre}${a.trimestre === 1 ? 'er' : 'ème'} Trim.` : '',
      a.titre,
      a.type.charAt(0).toUpperCase() + a.type.slice(1),
      `${new Date(a.date_debut).toLocaleDateString('fr-FR')}${a.date_fin ? ' au ' + new Date(a.date_fin).toLocaleDateString('fr-FR') : ''}`,
      a.heure || '-',
      a.description || '-'
    ].filter((_val, idx) => trimester ? idx !== 0 : true));

    const head = trimester 
      ? [['Activité', 'Type', 'Date', 'Heure', 'Description']]
      : [['Trim.', 'Activité', 'Type', 'Date', 'Heure', 'Description']];

    const primaryColor = getPrimaryColor();
    const rgb = hexToRgb(primaryColor);

    autoTable(doc, {
      head: head,
      body: tableData,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: rgb as any }, // dynamic primary color
      styles: { fontSize: 9 },
      columnStyles: trimester ? {
        0: { cellWidth: 40 },
        1: { cellWidth: 25 },
        2: { cellWidth: 35 },
        3: { cellWidth: 20 },
        4: { cellWidth: 'auto' }
      } : {
        0: { cellWidth: 15 },
        1: { cellWidth: 35 },
        2: { cellWidth: 25 },
        3: { cellWidth: 35 },
        4: { cellWidth: 20 },
        5: { cellWidth: 'auto' }
      }
    });

    return doc;
  };

  const handleExportPDF = (trimester?: number) => {
    const doc = generatePDF(trimester);
    if (!doc) return;
    const fileName = trimester 
      ? `planification_trimestre_${trimester}_${showPlanningModal?.libelle}.pdf`
      : `planification_annuelle_${showPlanningModal?.libelle}.pdf`;
    doc.save(fileName);
  };

  const handlePrint = (trimester?: number) => {
    const doc = generatePDF(trimester);
    if (!doc) return;
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [showPlanningModal, setShowPlanningModal] = React.useState<any>(null);
  const [activities, setActivities] = React.useState<any[]>([]);
  const [activityForm, setActivityForm] = React.useState({
    type: 'reunion',
    titre: '',
    description: '',
    date_debut: '',
    date_fin: '',
    heure: '',
    trimestre: 1
  });
  const [editingActivity, setEditingActivity] = React.useState<any>(null);

  const fetchActivities = (yearId: number) => {
    fetchWithAuth(`/api/annees/${yearId}/activites`)
      .then(res => res.json())
      .then(setActivities);
  };

  const handleActivitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingActivity ? `/api/activites/${editingActivity.id}` : '/api/activites';
    const method = editingActivity ? 'PUT' : 'POST';

    fetchWithAuth(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...activityForm, annee_id: showPlanningModal.id })
    }).then(() => {
      setEditingActivity(null);
      setActivityForm({ type: 'reunion', titre: '', description: '', date_debut: '', date_fin: '', heure: '', trimestre: 1 });
      fetchActivities(showPlanningModal.id);
      showToast(editingActivity ? "Activité modifiée" : "Activité ajoutée");
    });
  };

  const handleDeleteActivity = async (id: number) => {
    const ok = await confirm({
      title: 'Supprimer l\'activité',
      message: 'Voulez-vous vraiment supprimer cette activité de la planification ?',
      confirmText: 'Supprimer',
      type: 'danger'
    });

    if (ok) {
      fetchWithAuth(`/api/activites/${id}`, { method: 'DELETE' }).then(() => {
        fetchActivities(showPlanningModal.id);
        showToast("Activité supprimée");
      });
    }
  };

  const handleNotifyActivity = (activity: any) => {
    fetchWithAuth('/api/alertes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titre: `Alerte: ${activity.titre}`,
        description: `${activity.description || ''} - Prévu pour le ${activity.date_debut}${activity.heure ? ' à ' + activity.heure : ''}`,
        importance: activity.type === 'evaluation' ? 'high' : (activity.type === 'conge' ? 'medium' : 'normal')
      })
    }).then(() => {
      showToast("Alerte envoyée avec succès");
    });
  };

  const fetchAnnees = () => {
    fetchWithAuth(`/api/annees?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAnnees(data);
        } else {
          setAnnees([]);
        }
        window.dispatchEvent(new CustomEvent('academicYearChanged'));
      })
      .catch(() => setAnnees([]));
  };

  const fetchUsers = () => {
    fetchWithAuth(`/api/users?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUsers(data);
        } else {
          setUsers([]);
        }
      })
      .catch(() => setUsers([]));
  };

  const fetchRolePermissions = () => {
    setLoadingRoles(true);
    fetchWithAuth('/api/role-permissions')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRolePermissions(data);
        } else {
          setRolePermissions([]);
        }
        setLoadingRoles(false);
      })
      .catch(() => {
        setRolePermissions([]);
        setLoadingRoles(false);
      });
  };

  const handleUpdateRolePermission = (role: string, permissions: any[]) => {
    fetchWithAuth(`/api/role-permissions/${role}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissions })
    }).then(() => {
      fetchRolePermissions();
      showToast(`Permissions pour le rôle ${role} mises à jour`);
    });
  };

  React.useEffect(() => {
    fetchAnnees();
    fetchUsers();
    checkDbHealth();
    fetchLogs();
    fetchRolePermissions();
  }, []);

  const handleAddYear = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWithAuth('/api/annees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newYearForm)
    }).then(() => {
      setShowYearModal(false);
      setNewYearForm({ libelle: '', date_debut: '', date_fin: '' });
      fetchAnnees();
      showToast("Nouvelle année scolaire ajoutée avec succès");
    });
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
    const method = editingUser ? 'PUT' : 'POST';

    fetchWithAuth(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userForm)
    }).then(() => {
      setShowUserModal(false);
      setEditingUser(null);
      setUserForm({ nom: '', email: '', role: 'enseignant', approuve: 1, permissions: [] });
      fetchUsers();
      showToast(editingUser ? "Utilisateur modifié" : "Utilisateur créé. Un email d'activation a été envoyé.");
    });
  };

  const handleApproveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showApprovalModal) return;

    fetchWithAuth(`/api/users/${showApprovalModal.id}/approve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        approuve: true,
        role: approvalForm.role,
        permissions: approvalForm.permissions
      })
    }).then(() => {
      setShowApprovalModal(null);
      fetchUsers();
      showToast("Utilisateur confirmé manuellement");
    });
  };

  const handleRevokeUser = (id: number) => {
    fetchWithAuth(`/api/users/${id}/approve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approuve: false })
    }).then(() => {
      fetchUsers();
      showToast("Accès révoqué");
    });
  };

  const togglePermission = (path: string) => {
    setApprovalForm(prev => {
      const permissions = Array.isArray(prev.permissions) ? prev.permissions : [];
      const exists = permissions.find((p: any) => (typeof p === 'string' ? p === path : p.path === path));
      
      if (exists) {
        return {
          ...prev,
          permissions: permissions.filter((p: any) => (typeof p === 'string' ? p !== path : p.path !== path))
        };
      } else {
        return {
          ...prev,
          permissions: [...permissions, { path, can_write: true }]
        };
      }
    });
  };

  const toggleWrite = (path: string) => {
    setApprovalForm(prev => {
      const permissions = Array.isArray(prev.permissions) ? prev.permissions : [];
      return {
        ...prev,
        permissions: permissions.map((p: any) => {
          const pPath = typeof p === 'string' ? p : p.path;
          if (pPath === path) {
            const pCanWrite = typeof p === 'string' ? true : p.can_write;
            return { path: pPath, can_write: !pCanWrite };
          }
          return p;
        })
      };
    });
  };

  const toggleUserFormPermission = (path: string) => {
    setUserForm(prev => {
      const permissions = Array.isArray(prev.permissions) ? prev.permissions : [];
      const exists = permissions.find((p: any) => (typeof p === 'string' ? p === path : p.path === path));
      
      if (exists) {
        return {
          ...prev,
          permissions: permissions.filter((p: any) => (typeof p === 'string' ? p !== path : p.path !== path))
        };
      } else {
        return {
          ...prev,
          permissions: [...permissions, { path, can_write: true }]
        };
      }
    });
  };

  const toggleUserFormWrite = (path: string) => {
    setUserForm(prev => {
      const permissions = Array.isArray(prev.permissions) ? prev.permissions : [];
      return {
        ...prev,
        permissions: permissions.map((p: any) => {
          const pPath = typeof p === 'string' ? p : p.path;
          if (pPath === path) {
            const pCanWrite = typeof p === 'string' ? true : p.can_write;
            return { path: pPath, can_write: !pCanWrite };
          }
          return p;
        })
      };
    });
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    let perms = [];
    try {
      perms = user.permissions ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions) : [];
      if (!Array.isArray(perms)) perms = [];
    } catch (e) {
      perms = [];
    }

    setUserForm({
      nom: user.nom ?? '',
      email: user.email ?? '',
      role: user.role ?? 'enseignant',
      approuve: user.approuve ?? 1,
      permissions: perms
    });
    setShowUserModal(true);
  };

  const handleDeleteUser = async (id: number) => {
    const ok = await confirm({
      title: 'Supprimer l\'utilisateur',
      message: 'Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible et supprimera tout accès associé.',
      confirmText: 'Supprimer',
      type: 'danger'
    });

    if (ok) {
      fetchWithAuth(`/api/users/${id}`, { method: 'DELETE' }).then(() => {
        fetchUsers();
        showToast("Utilisateur supprimé");
      });
    }
  };

  const activateYear = async (id: number, libelle: string) => {
    const ok = await confirm({
      title: 'Activer l\'année scolaire',
      message: `Voulez-vous définir l'année ${libelle} comme l'année scolaire active ?`,
      confirmText: 'Activer',
      type: 'info'
    });

    if (ok) {
      fetchWithAuth(`/api/annees/${id}/activate`, { method: 'PATCH' }).then(() => {
        fetchAnnees();
        showToast(`L'année ${libelle} est maintenant active`);
      });
    }
  };

  const deactivateYear = async (id: number, libelle: string) => {
    const ok = await confirm({
      title: 'Désactiver l\'année',
      message: `Voulez-vous désactiver l'année scolaire ${libelle} ? L'année ne sera plus marquée comme l'année active.`,
      confirmText: 'Désactiver',
      type: 'warning'
    });

    if (ok) {
      fetchWithAuth(`/api/annees/${id}/deactivate`, { method: 'PATCH' }).then(() => {
        fetchAnnees();
        showToast(`L'année ${libelle} a été désactivée`);
      });
    }
  };

  const archiveYear = async (id: number, libelle: string) => {
    const ok = await confirm({
      title: 'Archiver l\'année',
      message: `Voulez-vous archiver l'année scolaire ${libelle} ?`,
      confirmText: 'Archiver',
      type: 'info'
    });

    if (ok) {
      fetchWithAuth(`/api/annees/${id}/archive`, { method: 'PATCH' }).then(() => {
        fetchAnnees();
        showToast(`L'année ${libelle} a été archivée`);
      });
    }
  };

  const cloturerYear = async (id: number, libelle: string) => {
    const ok = await confirm({
      title: 'Clôturer l\'année scolaire',
      message: `ATTENTION : Vous allez CLÔTURER l'année scolaire ${libelle}. L'année sera archivée et ne pourra plus être l'année active. Cette action est définitive.`,
      confirmText: 'Clôturer l\'année',
      type: 'danger'
    });

    if (ok) {
      fetchWithAuth(`/api/annees/${id}/cloturer`, { method: 'PATCH' }).then(() => {
        fetchAnnees();
        showToast(`L'année ${libelle} a été clôturée avec succès`);
      });
    }
  };

  const unarchiveYear = async (id: number, libelle: string) => {
    const ok = await confirm({
      title: 'Réactiver l\'année',
      message: `Voulez-vous réactiver l'année scolaire ${libelle} et la définir comme année active ?`,
      confirmText: 'Réactiver',
      type: 'info'
    });

    if (ok) {
      fetchWithAuth(`/api/annees/${id}/unarchive`, { method: 'PATCH' }).then(() => {
        fetchAnnees();
        showToast(`L'année ${libelle} a été réactivée et activée`);
      });
    }
  };

  const deleteYear = async (id: number, libelle: string, force: boolean = false) => {
    const message = force 
      ? `ATTENTION : Vous allez supprimer l'année ${libelle} ET TOUTES SES DONNÉES (élèves, notes, classes, etc.). Cette action est IRREVERSIBLE.`
      : `Êtes-vous sûr de vouloir supprimer l'année ${libelle} ?`;

    const ok = await confirm({
      title: 'Supprimer l\'année',
      message,
      confirmText: force ? 'Tout effacer' : 'Supprimer',
      type: 'danger'
    });

    if (ok) {
      fetchWithAuth(`/api/annees/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' })
        .then(async res => {
          const data = await res.json();
          if (!res.ok) {
            if (data.canForce) {
              const forceOk = await confirm({
                title: 'Forcer la suppression',
                message: `${data.error}. Voulez-vous forcer la suppression et effacer TOUTES les données liées à cette année ?`,
                confirmText: 'Forcer',
                type: 'danger'
              });
              if (forceOk) {
                deleteYear(id, libelle, true);
                return;
              }
            }
            throw new Error(data.error || "Erreur lors de la suppression");
          }
          fetchAnnees();
          showToast(`L'année ${libelle} a été supprimée`);
        })
        .catch(err => {
          showToast(err.message, 'error');
        });
    }
  };

  const handlePrevYear = () => {
    const currentIndex = annees.findIndex(a => a.est_active_effective);
    if (currentIndex !== -1 && currentIndex < annees.length - 1) {
      const prev = annees[currentIndex + 1];
      // Direct activation for navigation buttons
      fetchWithAuth(`/api/annees/${prev.id}/activate`, { method: 'PATCH' }).then(() => {
        fetchAnnees();
        showToast(`Passage à l'année ${prev.libelle}`);
      });
    } else {
      showToast("Aucune année précédente disponible", "error");
    }
  };

  const handleNextYear = () => {
    const currentIndex = annees.findIndex(a => a.est_active_effective);
    if (currentIndex > 0) {
      const next = annees[currentIndex - 1];
      // Direct activation for navigation buttons
      fetchWithAuth(`/api/annees/${next.id}/activate`, { method: 'PATCH' }).then(() => {
        fetchAnnees();
        showToast(`Passage à l'année ${next.libelle}`);
      });
    } else if (currentIndex === 0) {
      handleTransition();
    } else if (annees.length > 0) {
      const mostRecent = annees[0];
      fetchWithAuth(`/api/annees/${mostRecent.id}/activate`, { method: 'PATCH' }).then(() => {
        fetchAnnees();
        showToast(`Passage à l'année ${mostRecent.libelle}`);
      });
    }
  };

  const handleTransition = async () => {
    const active = annees.find(a => a.est_active_effective);
    if (!active) {
      alert("Veuillez d'abord activer une année scolaire.");
      return;
    }

    const importConfig = await confirm({
      title: 'Passer à l\'année suivante',
      message: `Voulez-vous passer à l'année suivante ? L'année ${active.libelle} sera archivée et la nouvelle année sera créée. Souhaitez-vous également IMPORTER les classes et matières ?`,
      confirmText: 'Importer config',
      cancelText: 'Ne pas importer',
      type: 'info'
    });
    
    fetchWithAuth('/api/annees/transition', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ import_config: importConfig })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        fetchAnnees();
        showToast("Transition vers la nouvelle année effectuée");
      })
      .catch(err => alert(err.message));
  };

  const checkDbHealth = () => {
    setCheckingHealth(true);
    fetchWithAuth('/api/db/health')
      .then(res => res.json())
      .then(data => {
        setDbHealth(data);
        setCheckingHealth(false);
        showToast("Santé de la base de données vérifiée");
      })
      .catch(() => {
        setCheckingHealth(false);
        showToast("Erreur lors de la vérification", "error");
      });
  };

  const handleExportDb = () => {
    const token = localStorage.getItem('token');
    const url = `/api/db/export?t=${Date.now()}`;
    
    // Create a temporary link to trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'megafixa_backup.sql');
    
    // Since we use Authorization header, we use fetch and then create a blob
    
    apiFetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => {
      if (!res.ok) throw new Error("Erreur lors de l'exportation");
      return res.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `megafixa_backup_${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      showToast("Base de données exportée avec succès");
    })
    .catch(err => {
      console.error(err);
      showToast("Erreur lors de l'exportation", "error");
    });
  };

  const handleCloudSync = async () => {
    try {
      setSyncingCloud(true);
      const res = await fetchWithAuth('/api/db/sync-cloud', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast("Synchronisation Cloud réussie");
      } else {
        showToast(data.error || "Erreur de synchronisation", "error");
      }
    } catch (error) {
      showToast("Erreur réseau", "error");
    } finally {
      setSyncingCloud(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetchWithAuth('/api/auth/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentUser.id, ...profileForm })
      });
      const data = await response.json();
      if (data.success) {
        const updatedUser = { ...currentUser, ...profileForm };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
        showToast('Profil mis à jour avec succès');
      } else {
        showToast(data.error || 'Erreur lors de la mise à jour', 'error');
      }
    } catch (error) {
      showToast('Erreur réseau', 'error');
    }
  };

  const handleRequestCode = async () => {
    try {
      setSendingCode(true);
      const response = await fetchWithAuth('/api/auth/password/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email })
      });
      const data = await response.json();
      if (data.success) {
        setStep('verify');
        showToast('Code de confirmation envoyé par email');
      } else {
        showToast(data.error || 'Erreur lors de l\'envoi du code', 'error');
      }
    } catch (error) {
      showToast('Erreur réseau', 'error');
    } finally {
      setSendingCode(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('Les mots de passe ne correspondent pas', 'error');
      return;
    }
    try {
      const response = await fetchWithAuth('/api/auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          code: passwordForm.code,
          newPassword: passwordForm.newPassword
        })
      });
      const data = await response.json();
      if (data.success) {
        showToast('Mot de passe modifié avec succès');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '', code: '' });
        setStep('request');
      } else {
        showToast(data.error || 'Code invalide ou expiré', 'error');
      }
    } catch (error) {
      showToast('Erreur réseau', 'error');
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-100 rounded-xl">
            <SettingsIcon className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
            <p className="text-gray-500">Gérez votre compte et les paramètres de l'application</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 md:gap-4 mb-8 border-b border-gray-200 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        <button
          onClick={() => setActiveTab('general')}
          className={`pb-4 px-4 font-bold text-sm transition-colors relative whitespace-nowrap ${
            activeTab === 'general' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Général
          {activeTab === 'general' && (
            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('account')}
          className={`pb-4 px-4 font-bold text-sm transition-colors relative whitespace-nowrap ${
            activeTab === 'account' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Mon compte
          {activeTab === 'account' && (
            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
          )}
        </button>
        {['admin', 'super_admin'].includes(currentUser?.role) && (
          <button
            onClick={() => setActiveTab('roles')}
            className={`pb-4 px-4 font-bold text-sm transition-colors relative whitespace-nowrap ${
              activeTab === 'roles' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Permissions par Rôle
            {activeTab === 'roles' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
            )}
          </button>
        )}
      </div>

      {activeTab === 'general' && (
        <div className="space-y-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Academic Years */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Calendar size={20} className="text-primary-600" />
              Années Scolaires
            </h2>
            <div className="flex items-center gap-3">
              <button 
                onClick={handlePrevYear}
                className="text-slate-600 text-sm font-bold flex items-center gap-1 hover:underline"
                title="Retourner à l'année précédente"
              >
                <ArrowLeftCircle size={16} />
                Année précédente
              </button>
              <button 
                onClick={handleNextYear}
                className="text-primary-600 text-sm font-bold flex items-center gap-1 hover:underline"
                title="Aller à l'année suivante"
              >
                <ArrowRightCircle size={16} />
                Année suivante
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y overflow-hidden">
            <div className="divide-y">
              {annees.map((annee) => (
                <YearItem 
                  key={annee.id} 
                  annee={annee} 
                  onActivate={() => activateYear(annee.id, annee.libelle)}
                  onDeactivate={() => deactivateYear(annee.id, annee.libelle)}
                  onArchive={() => archiveYear(annee.id, annee.libelle)}
                  onUnarchive={() => unarchiveYear(annee.id, annee.libelle)}
                  onDelete={() => deleteYear(annee.id, annee.libelle)}
                  onCloturer={() => cloturerYear(annee.id, annee.libelle)}
                  onPlanify={() => {
                    setShowPlanningModal(annee);
                    fetchActivities(annee.id);
                  }}
                  onUpdateDeadlines={(id: number, data: any) => {
                    fetchWithAuth(`/api/annees/${id}/deadlines`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(data)
                    }).then(() => {
                      fetchAnnees();
                      showToast("Délais de paiement mis à jour");
                    });
                  }}
                />
              ))}
            </div>
            <button 
              onClick={() => setShowYearModal(true)}
              className="w-full p-4 text-primary-600 text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary-50 transition-colors border-t border-slate-50"
            >
              <Plus size={18} />
              Créer une nouvelle année scolaire
            </button>
            {annees.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">
                Aucune année scolaire configurée.
              </div>
            )}
          </div>
        </section>

        {/* User Roles */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Shield size={20} className="text-blue-600" />
              Gestion des Utilisateurs
            </h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleSyncTeachers}
                disabled={syncingTeachers}
                className="text-primary-600 text-sm font-bold flex items-center gap-1 hover:underline disabled:opacity-50"
              >
                <RotateCcw size={16} className={syncingTeachers ? "animate-spin" : ""} />
                Synchroniser Enseignants
              </button>
              <button 
                onClick={() => { setEditingUser(null); setUserForm({ nom: '', email: '', role: 'enseignant', approuve: 1, permissions: [{ path: '/', can_write: true }] }); setShowUserModal(true); }}
                className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline"
              >
                <Plus size={16} />
                Ajouter un utilisateur
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y overflow-hidden">
            {users
              .filter((u: any) => u.id !== currentUser?.id) // Don't show current admin in the list of managed users
              .sort((a: any, b: any) => a.approuve - b.approuve)
              .map((user: any) => (
                <UserItem 
                  key={user.id} 
                  name={user.nom} 
                  email={user.email}
                  role={user.role} 
                  approuve={user.approuve}
                  otp_code={user.otp_code}
                  permissions={user.permissions}
                  last_seen={user.last_seen}
                  google_id={user.google_id}
                  onApprove={() => {
                    setApprovalForm({ role: user.role || 'enseignant', permissions: ['/'] });
                    setShowApprovalModal(user);
                  }}
                  onRevoke={() => handleRevokeUser(user.id)}
                  onEdit={() => handleEditUser(user)}
                  onDelete={() => handleDeleteUser(user.id)}
                />
              ))}
            {users.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm italic">
                Aucun utilisateur configuré.
              </div>
            )}
          </div>
        </section>

        {/* Database & Backup */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Database size={20} className="text-amber-600" />
            Base de données
          </h2>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-800">État de la base</p>
                {dbHealth ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full ${dbHealth.status === 'healthy' ? 'bg-primary-500' : 'bg-red-500'}`}></span>
                    <span className="text-xs text-slate-500">
                      {dbHealth.status === 'healthy' ? 'Opérationnelle' : 'Erreur'} 
                      ({dbHealth.stats.tables} tables, {dbHealth.stats.eleves} élèves)
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Vérification en cours...</p>
                )}
              </div>
              <button 
                onClick={checkDbHealth}
                disabled={checkingHealth}
                className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <RotateCcw size={18} className={checkingHealth ? "animate-spin" : ""} />
              </button>
            </div>
            
            <div className="space-y-3">
              <button 
                onClick={handleExportDb}
                className="w-full py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <Database size={16} />
                Exporter la base de données (.sql)
              </button>
              <p className="text-[10px] text-center text-slate-400">
                Il est recommandé d'exporter vos données avant chaque clôture d'année.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">Sauvegarde Cloud</p>
                  <p className="text-[10px] text-slate-500">Protection des abonnements et comptes.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-black rounded-full border border-green-200 uppercase">Automatique</span>
                </div>
              </div>
              <button 
                onClick={handleCloudSync}
                disabled={syncingCloud}
                className="w-full py-2 border-2 border-primary-600 text-primary-600 rounded-xl text-sm font-bold hover:bg-primary-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ShieldCheck size={16} className={syncingCloud ? "animate-spin" : ""} />
                {syncingCloud ? 'Synchronisation...' : 'Synchroniser maintenant'}
              </button>
              <p className="text-[9px] text-slate-400 text-center italic">
                Les abonnements, infos école et comptes admin sont sauvegardés sur Firebase.
              </p>
            </div>
          </div>
        </section>

        {/* App Info */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <SettingsIcon size={20} className="text-slate-600" />
            À propos
          </h2>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <img src={logo} alt="Logo MégafixaEduc" className="w-12 h-12 object-contain rounded-xl" referrerPolicy="no-referrer" />
              <div>
                <p className="font-bold text-slate-900">MégafixaEduc Pro</p>
                <p className="text-xs text-slate-500">Version 1.0.0 (Stable)</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Solution moderne de gestion scolaire optimisée pour les établissements d'enseignement général et technique.
            </p>
          </div>
        </section>
      </div>

      {/* Audit Log Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <History size={20} className="text-primary-600" />
            Journal d'Audit
          </h2>
          <button 
            onClick={fetchLogs}
            className="text-primary-600 text-sm font-bold flex items-center gap-1 hover:underline"
          >
            <RotateCcw size={16} className={loadingLogs ? "animate-spin" : ""} />
            Actualiser
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-50 bg-slate-50/30 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Rechercher..."
                className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500/20"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500/20"
              value={logFilterAction}
              onChange={(e) => setLogFilterAction(e.target.value)}
            >
              <option value="">Toutes les actions</option>
              <option value="CREATE">Création</option>
              <option value="UPDATE">Modification</option>
              <option value="DELETE">Suppression</option>
              <option value="LOGIN">Connexion</option>
            </select>
            <select
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500/20"
              value={logFilterEntity}
              onChange={(e) => setLogFilterEntity(e.target.value)}
            >
              <option value="">Toutes les entités</option>
              <option value="ELEVE">Élève</option>
              <option value="ENSEIGNANT">Enseignant</option>
              <option value="CLASSE">Classe</option>
              <option value="PAIEMENT">Paiement</option>
              <option value="ACTIVITE">Activité</option>
              <option value="USER">Utilisateur</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Utilisateur</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Entité</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loadingLogs ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs">Chargement...</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs italic">Aucun log trouvé</td>
                  </tr>
                ) : (
                  logs
                    .filter(log => {
                      const matchesSearch = 
                        (log.utilisateur_nom || '').toLowerCase().includes(logSearch.toLowerCase()) ||
                        (log.details || '').toLowerCase().includes(logSearch.toLowerCase()) ||
                        (log.entite_type || '').toLowerCase().includes(logSearch.toLowerCase());
                      const matchesAction = logFilterAction === '' || log.action === logFilterAction;
                      const matchesEntity = logFilterEntity === '' || log.entite_type === logFilterEntity;
                      return matchesSearch && matchesAction && matchesEntity;
                    })
                    .slice(0, 50)
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-[11px] text-slate-500">
                          {format(new Date(log.date_activite), 'Pp', { locale: fr })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-[10px] font-bold">
                              {(log.utilisateur_nom || 'U').charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-medium text-slate-700">{log.utilisateur_nom || 'Utilisateur inconnu'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            log.action === 'CREATE' ? 'bg-green-50 text-green-600 border-green-100' :
                            log.action === 'UPDATE' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            log.action === 'DELETE' ? 'bg-red-50 text-red-600 border-red-100' :
                            'bg-slate-50 text-slate-600 border-slate-100'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
                          <span className="font-bold">{log.entite_type}</span>
                          <span className="ml-1 opacity-50">#{log.entite_id}</span>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-500 max-w-xs truncate">
                          {log.details}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50/50 border-t border-slate-50 text-center">
            <button 
              onClick={() => window.location.href = '/audit-logs'}
              className="text-xs font-bold text-primary-600 hover:underline"
            >
              Voir tout le journal d'audit
            </button>
          </div>
        </div>
      </section>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900">{editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h2>
              <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUserSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nom complet</label>
                <input 
                  required
                  value={userForm.nom}
                  onChange={e => setUserForm({...userForm, nom: e.target.value})}
                  type="text" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <input 
                  required
                  value={userForm.email}
                  onChange={e => setUserForm({...userForm, email: e.target.value})}
                  type="email" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Rôle</label>
                <select 
                  value={userForm.role}
                  onChange={e => {
                    const newRole = e.target.value;
                    const roleData = rolePermissions.find(r => r.role === newRole);
                    setUserForm({
                      ...userForm, 
                      role: newRole,
                      permissions: roleData ? roleData.permissions : []
                    });
                  }}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="admin">Administrateur</option>
                  <option value="secretariat">Secrétariat</option>
                  <option value="enseignant">Enseignant</option>
                  <option value="comptable">Comptable</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Statut d'accès</label>
                <select 
                  value={userForm.approuve || 0}
                  onChange={e => setUserForm({...userForm, approuve: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={1}>Approuvé (Accès autorisé)</option>
                  <option value={0}>En attente (Accès bloqué)</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700">Accès aux pages</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { path: '/', label: 'Tableau de bord' },
                    { path: '/classes', label: 'Classes' },
                    { path: '/eleves', label: 'Élèves' },
                    { path: '/promotions', label: 'Promotions' },
                    { path: '/enseignants', label: 'Enseignants' },
                    { path: '/matieres', label: 'Matières' },
                    { path: '/notes', label: 'Notes' },
                    { path: '/paiements', label: 'Paiements' },
                    { path: '/emploi-du-temps', label: 'Emploi du temps' },
                    { path: '/ecole', label: 'Infos École' },
                    { path: '/parametres', label: 'Paramètres' },
                  ].map(page => {
                    const permission = userForm.permissions.find((p: any) => (typeof p === 'string' ? p === page.path : p.path === page.path));
                    const isChecked = !!permission;
                    const canWrite = typeof permission === 'object' ? permission.can_write : true;

                    return (
                      <div key={page.path} className="flex flex-col gap-1 p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => toggleUserFormPermission(page.path)}
                            className="rounded text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm font-medium text-slate-700">{page.label}</span>
                        </label>
                        {isChecked && (
                          <div className="ml-6 flex items-center gap-4 mt-1">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input 
                                type="radio"
                                name={`access-${page.path}`}
                                checked={!canWrite}
                                onChange={() => toggleUserFormWrite(page.path)}
                                className="text-primary-600 focus:ring-primary-500 w-3 h-3"
                              />
                              <span className="text-[10px] text-slate-500">Lecture seule</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input 
                                type="radio"
                                name={`access-${page.path}`}
                                checked={canWrite}
                                onChange={() => toggleUserFormWrite(page.path)}
                                className="text-primary-600 focus:ring-primary-500 w-3 h-3"
                              />
                              <span className="text-[10px] text-slate-500">Lecture & Écriture</span>
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors"
                >
                  {editingUser ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      <AnimatePresence>
        {showApprovalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-primary-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Approuver l'accès</h3>
                    <p className="text-xs text-slate-500">{showApprovalModal.nom} ({showApprovalModal.email})</p>
                  </div>
                </div>
                <button onClick={() => setShowApprovalModal(null)} className="p-2 hover:bg-white rounded-full transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleApproveUser} className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Attribuer un rôle</label>
                  <select 
                    value={approvalForm.role}
                    onChange={e => {
                      const newRole = e.target.value;
                      const roleData = rolePermissions.find(r => r.role === newRole);
                      setApprovalForm({
                        ...approvalForm, 
                        role: newRole,
                        permissions: roleData ? roleData.permissions : []
                      });
                    }}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="admin">Administrateur</option>
                    <option value="secretariat">Secrétariat</option>
                    <option value="enseignant">Enseignant</option>
                    <option value="comptable">Comptable</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-700">Autoriser l'accès aux pages</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { path: '/', label: 'Tableau de bord' },
                      { path: '/classes', label: 'Classes' },
                      { path: '/eleves', label: 'Élèves' },
                      { path: '/promotions', label: 'Promotions' },
                      { path: '/enseignants', label: 'Enseignants' },
                      { path: '/matieres', label: 'Matières' },
                      { path: '/notes', label: 'Notes' },
                      { path: '/paiements', label: 'Paiements' },
                      { path: '/emploi-du-temps', label: 'Emploi du temps' },
                      { path: '/ecole', label: 'Infos École' },
                      { path: '/parametres', label: 'Paramètres' },
                    ].map(page => {
                      const permission = Array.isArray(approvalForm.permissions) 
                        ? approvalForm.permissions.find((p: any) => (typeof p === 'string' ? p === page.path : p.path === page.path))
                        : null;
                      const isChecked = !!permission;
                      const canWrite = typeof permission === 'object' ? permission.can_write : true;

                      return (
                        <div key={page.path} className="flex flex-col gap-1 p-2 bg-slate-50 rounded-xl border border-slate-100">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => togglePermission(page.path)}
                              className="rounded text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm font-medium text-slate-700">{page.label}</span>
                          </label>
                          {isChecked && (
                            <div className="ml-6 flex items-center gap-4 mt-1">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input 
                                  type="radio"
                                  name={`approve-access-${page.path}`}
                                  checked={!canWrite}
                                  onChange={() => toggleWrite(page.path)}
                                  className="text-primary-600 focus:ring-primary-500 w-3 h-3"
                                />
                                <span className="text-[10px] text-slate-500">Lecture seule</span>
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input 
                                  type="radio"
                                  name={`approve-access-${page.path}`}
                                  checked={canWrite}
                                  onChange={() => toggleWrite(page.path)}
                                  className="text-primary-600 focus:ring-primary-500 w-3 h-3"
                                />
                                <span className="text-[10px] text-slate-500">Lecture & Écriture</span>
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
                  <Shield className="text-amber-600 shrink-0" size={20} />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    En cliquant sur <strong>Autoriser</strong>, un code de vérification unique sera généré et envoyé par email à l'utilisateur. Ce code expirera dans 30 minutes.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowApprovalModal(null)}
                    className="flex-1 px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-100"
                  >
                    Autoriser l'accès
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* New Year Modal */}
      {showYearModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">Nouvelle Année Scolaire</h2>
              <button onClick={() => setShowYearModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddYear} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Libellé (ex: 2024-2025)</label>
                <input 
                  required
                  value={newYearForm.libelle}
                  onChange={e => setNewYearForm({...newYearForm, libelle: e.target.value})}
                  placeholder="2024-2025"
                  type="text" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Date début</label>
                  <input 
                    required
                    value={newYearForm.date_debut}
                    onChange={e => setNewYearForm({...newYearForm, date_debut: e.target.value})}
                    type="date" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Date fin</label>
                  <input 
                    required
                    value={newYearForm.date_fin}
                    onChange={e => setNewYearForm({...newYearForm, date_fin: e.target.value})}
                    type="date" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowYearModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activity Planning Modal */}
      {showPlanningModal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Planification des activités - {showPlanningModal.libelle}</h2>
                <p className="text-xs text-slate-500">Organisez les réunions, évaluations et congés par trimestre.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm mr-4">
                  <button 
                    onClick={() => handlePrint()}
                    className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                    title="Imprimer tout"
                  >
                    <Printer size={16} />
                    <span className="hidden sm:inline">Imprimer tout</span>
                  </button>
                  <div className="w-px h-4 bg-slate-200 mx-1"></div>
                  <button 
                    onClick={() => handleExportPDF()}
                    className="p-2 hover:bg-slate-100 text-primary-600 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                    title="Exporter tout en PDF"
                  >
                    <FileText size={16} />
                    <span className="hidden sm:inline">PDF complet</span>
                  </button>
                </div>
                <button onClick={() => setShowPlanningModal(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form Column */}
              <div className="lg:col-span-1 space-y-6">
                <form onSubmit={handleActivitySubmit} className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Plus size={16} className="text-primary-600" />
                    {editingActivity ? 'Modifier l\'activité' : 'Nouvelle activité'}
                  </h3>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">Trimestre</label>
                    <select 
                      value={activityForm.trimestre || 1}
                      onChange={e => setActivityForm({...activityForm, trimestre: parseInt(e.target.value) || 1})}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    >
                      <option value={1}>1er Trimestre</option>
                      <option value={2}>2ème Trimestre</option>
                      <option value={3}>3ème Trimestre</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">Type d'activité</label>
                    <select 
                      value={activityForm.type}
                      onChange={e => setActivityForm({...activityForm, type: e.target.value})}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    >
                      <option value="reunion">Réunion</option>
                      <option value="evaluation">Évaluation / Examen</option>
                      <option value="conge">Congés / Vacances</option>
                      <option value="autre">Autre événement</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">Titre</label>
                    <input 
                      required
                      value={activityForm.titre}
                      onChange={e => setActivityForm({...activityForm, titre: e.target.value})}
                      type="text" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">Description</label>
                    <textarea 
                      value={activityForm.description}
                      onChange={e => setActivityForm({...activityForm, description: e.target.value})}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm h-20 resize-none" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-600">Date début</label>
                      <input 
                        required
                        value={activityForm.date_debut}
                        onChange={e => setActivityForm({...activityForm, date_debut: e.target.value})}
                        type="date" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-600">Heure (optionnel)</label>
                      <input 
                        value={activityForm.heure}
                        onChange={e => setActivityForm({...activityForm, heure: e.target.value})}
                        type="time" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">Date fin (optionnel)</label>
                    <input 
                      value={activityForm.date_fin}
                      onChange={e => setActivityForm({...activityForm, date_fin: e.target.value})}
                      type="date" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm" 
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    {editingActivity && (
                      <button 
                        type="button"
                        onClick={() => {
                          setEditingActivity(null);
                          setActivityForm({ type: 'reunion', titre: '', description: '', date_debut: '', date_fin: '', heure: '', trimestre: 1 });
                        }}
                        className="flex-1 px-3 py-2 bg-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-300 transition-colors"
                      >
                        Annuler
                      </button>
                    )}
                    <button 
                      type="submit"
                      className="flex-2 px-3 py-2 bg-primary-600 text-white rounded-xl font-bold text-xs hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                    >
                      {editingActivity ? 'Enregistrer' : 'Ajouter à la planification'}
                    </button>
                  </div>
                </form>
              </div>

              {/* List Column */}
              <div className="lg:col-span-2 space-y-6">
                {[1, 2, 3].map(tri => (
                  <div key={tri} className="space-y-3">
                    <div className="flex items-center justify-between border-l-4 border-primary-500 pl-3 bg-primary-50 py-1 pr-2">
                      <h4 className="text-sm font-bold text-slate-800">
                        {tri}{tri === 1 ? 'er' : 'ème'} Trimestre
                      </h4>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handlePrint(tri)}
                          className="p-1.5 hover:bg-white text-slate-500 hover:text-slate-900 rounded-lg transition-colors"
                          title="Imprimer ce trimestre"
                        >
                          <Printer size={14} />
                        </button>
                        <button 
                          onClick={() => handleExportPDF(tri)}
                          className="p-1.5 hover:bg-white text-primary-500 hover:text-primary-700 rounded-lg transition-colors"
                          title="PDF ce trimestre"
                        >
                          <FileText size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {activities.filter(a => a.trimestre === tri).length === 0 ? (
                        <p className="text-xs text-slate-400 italic p-4 border border-dashed border-slate-200 rounded-xl">Aucune activité planifiée pour ce trimestre.</p>
                      ) : (
                        activities.filter(a => a.trimestre === tri).map(activity => (
                          <div key={activity.id} className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm flex items-start justify-between group">
                            <div className="flex gap-3">
                              <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                                activity.type === 'reunion' ? 'bg-blue-500' :
                                activity.type === 'evaluation' ? 'bg-amber-500' :
                                activity.type === 'conge' ? 'bg-primary-500' : 'bg-slate-400'
                              }`}></div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">{activity.titre}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{activity.description}</p>
                                <div className="flex items-center gap-3 mt-2">
                                  <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                    <Calendar size={12} />
                                    {new Date(activity.date_debut).toLocaleDateString('fr-FR')}
                                    {activity.date_fin && ` au ${new Date(activity.date_fin).toLocaleDateString('fr-FR')}`}
                                  </span>
                                  {activity.heure && (
                                    <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                      <Clock size={12} />
                                      {activity.heure}
                                    </span>
                                  )}
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                                    activity.type === 'reunion' ? 'bg-blue-100 text-blue-700' :
                                    activity.type === 'evaluation' ? 'bg-amber-100 text-amber-700' :
                                    activity.type === 'conge' ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {activity.type}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleNotifyActivity(activity)}
                                className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                title="Envoyer comme alerte"
                              >
                                <Send size={14} />
                              </button>
                              <button 
                                onClick={() => {
                                  setEditingActivity(activity);
                                  setActivityForm({
                                    type: activity.type,
                                    titre: activity.titre,
                                    description: activity.description || '',
                                    date_debut: activity.date_debut,
                                    date_fin: activity.date_fin || '',
                                    heure: activity.heure || '',
                                    trimestre: activity.trimestre
                                  });
                                }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <RotateCcw size={14} className="rotate-45" />
                              </button>
                              <button 
                                onClick={() => handleDeleteActivity(activity.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

        </div>
      )}

      {activeTab === 'roles' && ['admin', 'super_admin'].includes(currentUser?.role) && (
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Configuration des Permissions par Rôle</h2>
                <p className="text-sm text-slate-500">Définissez les accès par défaut pour chaque type d'utilisateur.</p>
              </div>
            </div>

            {loadingRoles ? (
              <div className="py-12 text-center text-slate-400">Chargement des rôles...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {rolePermissions.map((roleData) => (
                  <div key={roleData.role} className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-800 capitalize">
                        {['admin', 'super_admin'].includes(roleData.role) ? 'Administrateur' : 
                         roleData.role === 'secretariat' ? 'Secrétariat' :
                         roleData.role === 'enseignant' ? 'Enseignant' :
                         roleData.role === 'comptable' ? 'Comptable' : roleData.role}
                      </h3>
                      <span className="px-2 py-1 bg-white text-[10px] font-bold text-slate-400 rounded-lg border border-slate-200 uppercase">
                        Rôle Système
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                      {[
                        { path: '/', label: 'Tableau de bord' },
                        { path: '/classes', label: 'Classes' },
                        { path: '/eleves', label: 'Élèves' },
                        { path: '/promotions', label: 'Promotions' },
                        { path: '/enseignants', label: 'Enseignants' },
                        { path: '/matieres', label: 'Matières' },
                        { path: '/notes', label: 'Notes' },
                        { path: '/paiements', label: 'Paiements' },
                        { path: '/emploi-du-temps', label: 'Emploi du temps' },
                        { path: '/ecole', label: 'Infos École' },
                        { path: '/parametres', label: 'Paramètres' },
                        { path: '/audit-logs', label: 'Journal d\'audit' },
                        { path: '/alertes', label: 'Alertes' },
                      ].map(page => {
                        const permission = roleData.permissions.find((p: any) => p.path === page.path);
                        const isChecked = !!permission;
                        const canWrite = permission?.can_write ?? false;

                        return (
                          <div key={page.path} className="flex flex-col gap-1 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={isChecked}
                                onChange={() => {
                                  const newPerms = isChecked 
                                    ? roleData.permissions.filter((p: any) => p.path !== page.path)
                                    : [...roleData.permissions, { path: page.path, can_write: true }];
                                  handleUpdateRolePermission(roleData.role, newPerms);
                                }}
                                className="rounded text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm font-medium text-slate-700">{page.label}</span>
                            </label>
                            {isChecked && (
                              <div className="ml-6 flex items-center gap-4 mt-1">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input 
                                    type="radio"
                                    name={`role-${roleData.role}-${page.path}`}
                                    checked={!canWrite}
                                    onChange={() => {
                                      const newPerms = roleData.permissions.map((p: any) => 
                                        p.path === page.path ? { ...p, can_write: false } : p
                                      );
                                      handleUpdateRolePermission(roleData.role, newPerms);
                                    }}
                                    className="text-primary-600 focus:ring-primary-500 w-3 h-3"
                                  />
                                  <span className="text-[10px] text-slate-500">Lecture seule</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input 
                                    type="radio"
                                    name={`role-${roleData.role}-${page.path}`}
                                    checked={canWrite}
                                    onChange={() => {
                                      const newPerms = roleData.permissions.map((p: any) => 
                                        p.path === page.path ? { ...p, can_write: true } : p
                                      );
                                      handleUpdateRolePermission(roleData.role, newPerms);
                                    }}
                                    className="text-primary-600 focus:ring-primary-500 w-3 h-3"
                                  />
                                  <span className="text-[10px] text-slate-500">Lecture & Écriture</span>
                                </label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'account' && (
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Profile Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center gap-3">
              <User className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold">Informations personnelles</h2>
            </div>
            <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={profileForm.nom}
                      onChange={(e) => setProfileForm({ ...profileForm, nom: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>

          {/* Security Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center gap-3">
              <Lock className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold">Sécurité et mot de passe</h2>
            </div>
            <div className="p-6">
              {step === 'request' ? (
                <div className="space-y-4">
                  <p className="text-gray-600 text-sm">
                    Pour modifier votre mot de passe, nous devons d'abord vérifier votre identité en envoyant un code de confirmation à votre adresse email.
                  </p>
                  <button
                    onClick={handleRequestCode}
                    disabled={sendingCode}
                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {sendingCode ? (
                      <RotateCcw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    Envoyer le code de confirmation
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="p-4 bg-blue-50 text-blue-700 rounded-lg text-sm mb-4">
                    Un code de confirmation a été envoyé à <strong>{currentUser?.email}</strong>.
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Code de confirmation</label>
                    <input
                      type="text"
                      value={passwordForm.code}
                      onChange={(e) => setPasswordForm({ ...passwordForm, code: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Entrez le code à 6 chiffres"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setStep('request')}
                      className="text-gray-500 hover:text-gray-700 font-medium"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                      Changer le mot de passe
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Permissions Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold">Mes permissions</h2>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-2">
                {currentUser?.permissions && currentUser.permissions.length > 0 ? (
                  currentUser.permissions.map((perm: any, idx: number) => {
                    const path = typeof perm === 'string' ? perm : perm.path;
                    const canWrite = typeof perm === 'string' ? true : perm.can_write;
                    return (
                      <span key={idx} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium flex items-center gap-2">
                        {path === '/' ? 'Accès complet' : path}
                        {canWrite && <span className="text-[10px] bg-indigo-200 px-1 rounded">Lecture/Écriture</span>}
                      </span>
                    );
                  })
                ) : (
                  <p className="text-gray-500 italic">Aucune permission spécifique accordée.</p>
                )}
              </div>
              <p className="mt-4 text-sm text-gray-500">
                Votre rôle actuel est : <span className="font-semibold text-indigo-600 capitalize">{currentUser?.role}</span>. 
                Contactez l'administrateur pour modifier vos permissions.
              </p>
            </div>
          </div>

          {/* Google Connection Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center gap-3">
              <Chrome className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-semibold">Connexion Google</h2>
            </div>
            <div className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {currentUser?.google_id ? 'Votre compte est lié à Google' : 'Liez votre compte à Google'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {currentUser?.google_id 
                    ? 'Vous pouvez vous connecter rapidement avec votre compte Google.' 
                    : 'Connectez votre compte Google pour une connexion simplifiée.'}
                </p>
              </div>
              {!currentUser?.google_id && (
                <button 
                  onClick={handleGoogleLogin}
                  className="px-6 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Chrome size={16} className="text-red-500" />
                  Lier mon compte Google
                </button>
              )}
              {currentUser?.google_id && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-full text-xs font-bold">
                  <CheckCircle size={14} />
                  Compte lié
                </div>
              )}
            </div>
          </div>

          {/* Logout Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
            <div className="p-6 border-b border-red-100 flex items-center gap-3">
              <LogOut className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-semibold text-red-600">Déconnexion</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 text-sm mb-4">
                Souhaitez-vous vous déconnecter de votre session actuelle ?
              </p>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                <LogOut className="w-4 h-4" />
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className={`fixed bottom-8 left-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              toast.type === 'success' 
                ? 'bg-primary-900 border-primary-700 text-primary-50' 
                : 'bg-red-900 border-red-700 text-red-50'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle size={20} className="text-primary-400" /> : <X size={20} className="text-red-400" />}
            <span className="font-bold text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function YearItem({ annee, onActivate, onDeactivate, onArchive, onUnarchive, onDelete, onCloturer, onPlanify, onUpdateDeadlines }: any) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [deadlines, setDeadlines] = React.useState({
    date_limite_scolarite: annee.date_limite_scolarite || '',
    date_limite_inscription: annee.date_limite_inscription || ''
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="flex flex-col border-b border-slate-50 last:border-0 overflow-hidden">
      <div className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group ${isExpanded ? 'bg-slate-50' : ''}`}>
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">{annee.libelle}</span>
              {annee.est_active_effective && <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-[10px] font-bold rounded-full uppercase">Active</span>}
              {annee.cloturee === 1 && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full uppercase">Clôturée</span>}
              {annee.archivee === 1 && annee.cloturee === 0 && <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full uppercase">Archivée</span>}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <Calendar size={10} />
                {formatDate(annee.date_debut)} - {formatDate(annee.date_fin)}
              </p>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <Users size={10} />
                {annee.eleves_count} élèves, {annee.classes_count} classes
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {annee.cloturee === 0 && !annee.est_active_effective && annee.archivee === 0 && (
            <button 
              onClick={onActivate}
              className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              title="Activer manuellement"
            >
              <CheckCircle2 size={18} />
            </button>
          )}
          {annee.cloturee === 0 && annee.archivee === 0 && !annee.est_active_effective && (
            <button 
              onClick={onArchive}
              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
              title="Archiver"
            >
              <Archive size={18} />
            </button>
          )}
          {annee.cloturee === 0 && annee.archivee === 1 && (
            <button 
              onClick={onUnarchive}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Réactiver (Désarchiver)"
            >
              <RotateCcw size={18} />
            </button>
          )}
          {annee.cloturee === 0 && annee.est_active_effective && (
            <button 
              onClick={onDeactivate}
              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
              title="Désactiver l'année"
            >
              <X size={18} />
            </button>
          )}
          {annee.cloturee === 0 && annee.est_active_effective && (
            <button 
              onClick={onCloturer}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Clôturer l'année"
            >
              <CheckCircle size={18} />
            </button>
          )}
          {!annee.est_active_effective && (
            <button 
              onClick={onDelete}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Supprimer"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all ${isExpanded ? 'rotate-90 text-primary-600 bg-primary-50' : ''}`}
            title="Détails de l'année"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-slate-50/50 border-t border-slate-100"
          >
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Statistiques</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">{annee.eleves_count} Élèves</span>
                    <span className="text-sm font-bold text-slate-700">{annee.classes_count} Classes</span>
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Période</p>
                  <p className="text-sm font-bold text-slate-700">
                    Du {formatDate(annee.date_debut)} au {formatDate(annee.date_fin)}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Délais de Paiement (Alertes)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-slate-500">Date limite Inscription</label>
                    <input 
                      type="date" 
                      value={deadlines.date_limite_inscription}
                      onChange={e => setDeadlines({...deadlines, date_limite_inscription: e.target.value})}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-slate-500">Date limite Scolarité</label>
                    <input 
                      type="date" 
                      value={deadlines.date_limite_scolarite}
                      onChange={e => setDeadlines({...deadlines, date_limite_scolarite: e.target.value})}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <button 
                  onClick={() => onUpdateDeadlines(annee.id, deadlines)}
                  className="w-full py-2 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={14} />
                  Enregistrer les délais
                </button>
              </div>

              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-slate-500 italic">
                  Gérez le calendrier scolaire et planifiez les événements importants de cette année.
                </p>
                <button 
                  onClick={onPlanify}
                  className="px-4 py-2 bg-primary-600 text-white text-xs font-bold rounded-xl hover:bg-primary-700 transition-colors flex items-center gap-2 shrink-0 shadow-lg shadow-primary-100"
                >
                  <Calendar size={14} />
                  Planifier les activités
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UserItem({ name, email, role, approuve, otp_code, permissions, last_seen, google_id, onApprove, onRevoke, onEdit, onDelete }: any) {
  const handleCopyOtp = () => {
    if (otp_code) {
      navigator.clipboard.writeText(otp_code);
      alert("Code OTP copié !");
    }
  };

  const perms = Array.isArray(permissions) ? permissions : [];
  const accessCount = perms.length;

  const isOnline = last_seen && (new Date().getTime() - new Date(last_seen).getTime()) < 5 * 60 * 1000;

  return (
    <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold relative ${approuve ? 'bg-primary-100 text-primary-600' : 'bg-amber-100 text-amber-600'}`}>
            {name.charAt(0)}
            {google_id && (
              <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-slate-100">
                <Chrome size={10} className="text-red-500" />
              </div>
            )}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} title={isOnline ? 'En ligne' : 'Hors ligne'} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-800">{name}</p>
            {approuve ? (
              <span className="px-1.5 py-0.5 bg-primary-100 text-primary-700 text-[9px] font-bold rounded uppercase">Confirmé</span>
            ) : (
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded uppercase">Non confirmé</span>
            )}
            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[9px] font-bold rounded uppercase">
              {accessCount} page{accessCount > 1 ? 's' : ''} accessible{accessCount > 1 ? 's' : ''}
            </span>
            {otp_code && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold rounded uppercase">
                <span>OTP: {otp_code}</span>
                <button onClick={handleCopyOtp} className="hover:text-blue-900">
                  <Copy size={10} />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-slate-500 capitalize">{role}</p>
            <span className="text-slate-300">•</span>
            <p className="text-xs text-slate-400">{email}</p>
            {last_seen ? (
              <>
                <span className="text-slate-300">•</span>
                <p className="text-[10px] text-slate-400 italic">
                  {isOnline ? 'En ligne' : `Dernière vue: ${format(new Date(last_seen), 'HH:mm', { locale: fr })}`}
                </p>
              </>
            ) : (
              <>
                <span className="text-slate-300">•</span>
                <p className="text-[10px] text-slate-400 italic">Jamais connecté</p>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!approuve ? (
          <button 
            onClick={onApprove}
            className="px-3 py-1.5 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-1"
          >
            <CheckCircle size={14} />
            Confirmer manuellement
          </button>
        ) : (
          <button 
            onClick={onRevoke}
            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            title="Révoquer l'accès"
          >
            <X size={18} />
          </button>
        )}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Modifier les accès">
            <ShieldCheck size={18} />
          </button>
          <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer l'utilisateur">
            <Trash2 size={18} />
          </button>
        </div>
        <ChevronRight size={18} className="text-slate-300" />
      </div>
    </div>
  );
}
