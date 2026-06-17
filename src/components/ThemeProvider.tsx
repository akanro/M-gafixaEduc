import { apiFetch } from '../utils/api';
import React from 'react';

interface SchoolInfo {
  nom: string;
  couleur_primaire: string;
  police: string;
  taille_police: number;
}

const FONTS: Record<string, string> = {
  inter: '"Inter", sans-serif',
  roboto: '"Roboto", sans-serif',
  playfair: '"Playfair Display", serif',
  mono: '"JetBrains Mono", monospace'
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [schoolInfo, setSchoolInfo] = React.useState<SchoolInfo | null>(null);

  const updateTheme = (info: SchoolInfo) => {
    const root = document.documentElement;
    if (info.couleur_primaire) {
      root.style.setProperty('--school-primary', info.couleur_primaire);
    }
    if (info.police && FONTS[info.police]) {
      root.style.setProperty('--school-font', FONTS[info.police]);
    }
    if (info.taille_police) {
      root.style.setProperty('--school-font-size', `${info.taille_police}px`);
    }
  };

  const fetchTheme = () => {
    const token = localStorage.getItem('token');
    const endpoint = token ? '/api/school-info' : '/api/public/school-info';
    
    apiFetch(endpoint, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data && !data.error) {
          setSchoolInfo(data);
          updateTheme(data);
        }
      })
      .catch(err => {
        // Silently fail if not logged in and public fetch fails, or handle properly
        if (token) {
          // Gracefully handle "Failed to fetch" which often occurs during dev server restarts
          if (err instanceof TypeError && err.message === 'Failed to fetch') {
            return;
          }
          console.error('Error fetching theme:', err);
        }
      });
  };

  React.useEffect(() => {
    fetchTheme();

    const handleThemeChange = () => {
      fetchTheme();
    };

    window.addEventListener('schoolInfoChanged', handleThemeChange);
    return () => window.removeEventListener('schoolInfoChanged', handleThemeChange);
  }, []);

  return <>{children}</>;
};
