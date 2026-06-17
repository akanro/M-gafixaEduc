import { apiFetch } from '../utils/api';
import React from 'react';

type Language = 'fr' | 'en';

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  fr: {
    'dashboard': 'Tableau de bord',
    'students': 'Élèves',
    'teachers': 'Enseignants',
    'classes': 'Classes',
    'grades': 'Notes',
    'payments': 'Paiements',
    'timetable': 'Emploi du temps',
    'alerts': 'Alertes',
    'settings': 'Paramètres',
    'subjects': 'Matières',
    'promotions': 'Promotions',
    'school_info': 'Infos École',
    'audit_logs': 'Journal d\'Audit',
    'logout': 'Déconnexion',
    'welcome': 'Bienvenue',
    'search': 'Rechercher',
    'add': 'Ajouter',
    'edit': 'Modifier',
    'delete': 'Supprimer',
    'save': 'Enregistrer',
    'cancel': 'Annuler',
    'appearance': 'Apparence',
    'language': 'Langue',
    'font_size': 'Taille de la police',
    'primary_color': 'Couleur primaire',
    'font_family': 'Police de caractères',
    'school_identity': 'Identité de l\'école',
    'school_name': 'Nom de l\'établissement',
    'slogan': 'Slogan / Devise',
    'address': 'Adresse physique',
    'phone': 'Téléphone',
    'email': 'Email',
    'website': 'Site Web',
    'registration_number': 'Numéro d\'enregistrement',
    'country': 'Pays',
    'currency': 'Devise',
    'logo': 'Logo de l\'école',
    'general_contacts': 'Général & Contacts',
    'appearance_language': 'Apparence & Langue',
    'success_update': 'Informations mises à jour avec succès',
    'error_update': 'Erreur lors de la mise à jour',
    'choose_image': 'Choisir une image',
    'recommended_format': 'Format recommandé : PNG ou JPG carré.',
    'max_size': 'Taille max : 2Mo.',
    'preview': 'Aperçu',
    'system_language': 'Langue du système',
    'font_size_px': 'Taille de la police (px)',
    'font_preview': 'Aperçu du texte avec cette taille de police.',
    'active_year': 'Année Scolaire Active',
    'total_students': 'Total Élèves',
    'total_teachers': 'Total Enseignants',
    'total_classes': 'Total Classes',
    'monthly_revenue': 'Recettes du mois',
    'recent_payments': 'Paiements Récents',
    'student': 'Élève',
    'amount': 'Montant',
    'date': 'Date',
    'status': 'Statut',
    'no_data': 'Aucune donnée disponible',
    'view_all': 'Voir tout',
    'academic_years': 'Années Scolaires',
    'user_management': 'Gestion des Utilisateurs',
    'database': 'Base de données',
    'about': 'À propos',
    'version': 'Version',
    'stable': 'Stable',
    'solution_desc': 'Solution moderne de gestion scolaire optimisée pour les établissements d\'enseignement général et technique.',
    'export_db': 'Exporter la base de données (.sql)',
    'backup_recommendation': 'Il est recommandé d\'exporter vos données avant chaque clôture d\'année.',
    'db_status': 'État de la base',
    'operational': 'Opérationnelle',
    'error': 'Erreur',
    'refresh': 'Actualiser',
    'audit_log_desc': 'Gérez votre compte et les paramètres de l\'application',
    'all_actions': 'Toutes les actions',
    'creation': 'Création',
    'modification': 'Modification',
    'suppression': 'Suppression',
    'connection': 'Connexion',
    'all_entities': 'Toutes les entités',
    'user': 'Utilisateur',
    'details': 'Détails',
    'previous_year': 'Année précédente',
    'next_year': 'Année suivante',
    'create_new_year': 'Créer une nouvelle année scolaire',
    'no_year_config': 'Aucune année scolaire configurée.',
    'add_user': 'Ajouter un utilisateur',
    'no_user_config': 'Aucun utilisateur configuré.',
    'personal_info': 'Informations personnelles',
    'full_name': 'Nom complet',
    'security_password': 'Sécurité et mot de passe',
    'change_password': 'Changer le mot de passe',
    'my_permissions': 'Mes permissions',
  },
  en: {
    'dashboard': 'Dashboard',
    'students': 'Students',
    'teachers': 'Teachers',
    'classes': 'Classes',
    'grades': 'Grades',
    'payments': 'Payments',
    'timetable': 'Timetable',
    'alerts': 'Alerts',
    'settings': 'Settings',
    'subjects': 'Subjects',
    'promotions': 'Promotions',
    'school_info': 'School Info',
    'audit_logs': 'Audit Logs',
    'logout': 'Logout',
    'welcome': 'Welcome',
    'search': 'Search',
    'add': 'Add',
    'edit': 'Edit',
    'delete': 'Delete',
    'save': 'Save',
    'cancel': 'Cancel',
    'appearance': 'Appearance',
    'language': 'Language',
    'font_size': 'Font Size',
    'primary_color': 'Primary Color',
    'font_family': 'Font Family',
    'school_identity': 'School Identity',
    'school_name': 'School Name',
    'slogan': 'Slogan / Motto',
    'address': 'Physical Address',
    'phone': 'Phone',
    'email': 'Email',
    'website': 'Website',
    'registration_number': 'Registration Number',
    'country': 'Country',
    'currency': 'Currency',
    'logo': 'School Logo',
    'general_contacts': 'General & Contacts',
    'appearance_language': 'Appearance & Language',
    'success_update': 'Information updated successfully',
    'error_update': 'Error during update',
    'choose_image': 'Choose an image',
    'recommended_format': 'Recommended format: Square PNG or JPG.',
    'max_size': 'Max size: 2MB.',
    'preview': 'Preview',
    'system_language': 'System Language',
    'font_size_px': 'Font size (px)',
    'font_preview': 'Text preview with this font size.',
    'active_year': 'Active Academic Year',
    'total_students': 'Total Students',
    'total_teachers': 'Total Teachers',
    'total_classes': 'Total Classes',
    'monthly_revenue': 'Monthly Revenue',
    'recent_payments': 'Recent Payments',
    'student': 'Student',
    'amount': 'Amount',
    'date': 'Date',
    'status': 'Status',
    'no_data': 'No data available',
    'view_all': 'View all',
    'academic_years': 'Academic Years',
    'user_management': 'User Management',
    'database': 'Database',
    'about': 'About',
    'version': 'Version',
    'stable': 'Stable',
    'solution_desc': 'Modern school management solution optimized for general and technical education establishments.',
    'export_db': 'Export database (.sql)',
    'backup_recommendation': 'It is recommended to export your data before each year-end closing.',
    'db_status': 'Database Status',
    'operational': 'Operational',
    'error': 'Error',
    'refresh': 'Refresh',
    'audit_log_desc': 'Manage your account and application settings',
    'all_actions': 'All actions',
    'creation': 'Creation',
    'modification': 'Modification',
    'suppression': 'Deletion',
    'connection': 'Connection',
    'all_entities': 'All entities',
    'user': 'User',
    'details': 'Details',
    'previous_year': 'Previous year',
    'next_year': 'Next year',
    'create_new_year': 'Create new academic year',
    'no_year_config': 'No academic year configured.',
    'add_user': 'Add user',
    'no_user_config': 'No user configured.',
    'personal_info': 'Personal information',
    'full_name': 'Full name',
    'security_password': 'Security and password',
    'change_password': 'Change password',
    'my_permissions': 'My permissions',
  }
};

const TranslationContext = React.createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = React.useState<Language>('fr');

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  React.useEffect(() => {
    // Fetch initial language from school info
    const token = localStorage.getItem('token');
    apiFetch('/api/school-info', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.langue) {
          setLanguage(data.langue as Language);
        }
      });

    const handleSchoolInfoChange = () => {
      const token = localStorage.getItem('token');
      apiFetch('/api/school-info', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.langue) {
            setLanguage(data.langue as Language);
          }
        });
    };

    window.addEventListener('schoolInfoChanged', handleSchoolInfoChange);
    return () => window.removeEventListener('schoolInfoChanged', handleSchoolInfoChange);
  }, []);

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = React.useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
