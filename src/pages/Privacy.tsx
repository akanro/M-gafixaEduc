import React from 'react';
import { motion } from 'motion/react';
import { Shield, ArrowLeft, Lock, Eye, FileText, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-primary-100 selection:text-primary-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform">
              <ArrowLeft size={20} />
            </div>
            <span className="text-sm font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-900 transition-colors">Retour</span>
          </Link>
          <div className="flex items-center gap-2">
            <img src="/logo_megafixa.png" alt="Mégafixa" className="h-8" />
            <span className="text-lg font-black tracking-tighter text-slate-900 uppercase">Educ Pro</span>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-40 pb-20 px-4 bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-20 h-20 bg-primary-50 text-primary-600 rounded-3xl flex items-center justify-center mx-auto mb-8"
          >
            <Shield size={40} />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9]"
          >
            Politique de <span className="text-primary-600">Confidentialité</span>
          </motion.h1>
          <p className="text-lg text-slate-500 font-medium">Dernière mise à jour : 22 Avril 2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto space-y-16">
          {/* Introduction */}
          <div className="space-y-6 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl">
            <SectionHeader icon={Eye} title="Introduction" />
            <div className="prose prose-slate max-w-none text-slate-600 space-y-4 font-medium leading-relaxed">
              <p>
                Chez <strong>Mégafixa Educ Pro</strong>, nous attachons une importance capitale à la protection de vos données personnelles et au respect de votre vie privée. Cette politique de confidentialité détaille comment nous collectons, utilisons et protégeons les informations fournies par les établissements scolaires, les enseignants, les élèves et les parents lors de l'utilisation de notre plateforme.
              </p>
              <p>
                En utilisant nos services, vous acceptez les pratiques décrites dans cette politique.
              </p>
            </div>
          </div>

          {/* Collection des données */}
          <div className="space-y-6 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl">
            <SectionHeader icon={FileText} title="Collecte des Données" />
            <div className="prose prose-slate max-w-none text-slate-600 space-y-4 font-medium leading-relaxed">
              <p>Nous collectons les catégories d'informations suivantes :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Informations d'Établissement :</strong> Nom de l'école, adresse, contacts officiels, logo.</li>
                <li><strong>Données Utilisateurs :</strong> Nom, email, rôle (admin, enseignant, parent), mot de passe (haché).</li>
                <li><strong>Données Élèves :</strong> Nom, prénom, matricule, classe, notes, statut de paiement, photos (si téléchargées).</li>
                <li><strong>Données de Paiement :</strong> Références de transactions, montants, dates. Nous ne stockons jamais vos coordonnées bancaires ou numéros de carte directement (gérés via FedaPay).</li>
              </ul>
            </div>
          </div>

          {/* Utilisation des données */}
          <div className="space-y-6 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl">
            <SectionHeader icon={Lock} title="Utilisation de vos Informations" />
            <div className="prose prose-slate max-w-none text-slate-600 space-y-4 font-medium leading-relaxed">
              <p>Vos données sont utilisées exclusivement pour :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Fournir et gérer les services administratifs et pédagogiques de l'école.</li>
                <li>Assurer la sécurité des accès via authentification (OTP, JWT).</li>
                <li>Générer des rapports financiers et des bulletins scolaires.</li>
                <li>Communiquer des alertes importantes ou des notifications système.</li>
                <li>Améliorer les performances et les fonctionnalités de la plateforme.</li>
              </ul>
              <p className="bg-primary-50 p-6 rounded-2xl border border-primary-100 text-primary-800 font-black uppercase text-xs tracking-widest leading-relaxed">
                Note importante : Nous ne vendons, ne louons, ni ne partageons vos données personnelles avec des tiers à des fins marketing.
              </p>
            </div>
          </div>

          {/* Sécurité */}
          <div className="space-y-6 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl">
            <SectionHeader icon={Shield} title="Sécurité et Protection" />
            <div className="prose prose-slate max-w-none text-slate-600 space-y-4 font-medium leading-relaxed">
              <p>
                Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles avancées pour protéger vos données contre tout accès non autorisé, perte ou altération :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Chiffrement SSL/TLS pour tous les transferts de données.</li>
                <li>Hachage sécurisé des mots de passe.</li>
                <li>Contrôle d'accès strict basé sur les rôles (RBAC).</li>
                <li>Surveillance constante des journaux d'audit (Audit Logs).</li>
              </ul>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-6 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl text-center">
            <SectionHeader icon={Globe} title="Vos Droits" centered />
            <div className="prose prose-slate max-w-none text-slate-600 space-y-4 font-medium leading-relaxed max-w-2xl mx-auto">
              <p>
                Conformément aux lois sur la protection des données, vous disposez d'un droit d'accès, de rectification et de suppression de vos informations personnelles. Pour toute demande concernant vos données, contactez notre délégué à la protection des données :
              </p>
              <p className="text-xl font-black text-slate-900">megafixatecheduc@gmail.com</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-6">
          <img src="/logo_megafixa.png" alt="Mégafixa" className="h-10 mx-auto opacity-30 grayscale" />
          <p className="text-sm font-bold text-slate-400">© 2026 Mégafixa Educ Pro. La sécurité de vos données est notre priorité.</p>
        </div>
      </footer>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, centered = false }: any) {
  return (
    <div className={`flex items-center gap-4 ${centered ? 'justify-center border-b border-slate-50 pb-6' : ''}`}>
      <div className="w-12 h-12 bg-slate-50 text-slate-900 rounded-2xl flex items-center justify-center shrink-0">
        <Icon size={24} />
      </div>
      <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{title}</h2>
    </div>
  );
}
