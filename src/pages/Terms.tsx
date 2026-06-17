import React from 'react';
import { motion } from 'motion/react';
import { FileText, ArrowLeft, Gavel, Handshake, AlertTriangle, Scale, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Terms() {
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
            className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8"
          >
            <Gavel size={40} />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9]"
          >
            Conditions <span className="text-indigo-600">Générales</span> d'Utilisation
          </motion.h1>
          <p className="text-lg text-slate-500 font-medium">Date d'entrée en vigueur : 22 Avril 2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto space-y-16">
          {/* Objet */}
          <div className="space-y-6 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl">
            <SectionHeader icon={Handshake} title="1. Objet" />
            <div className="prose prose-slate max-w-none text-slate-600 space-y-4 font-medium leading-relaxed">
              <p>
                Les présentes Conditions Générales d'Utilisation (CGU) ont pour objet de définir les modalités et conditions dans lesquelles <strong>Mégafixa Educ Pro</strong> fournit ses services aux utilisateurs (Établissements scolaires).
              </p>
              <p>
                L'accès et l'utilisation de la plateforme impliquent l'acceptation sans réserve des présentes CGU par l'établissement souscripteur.
              </p>
            </div>
          </div>

          {/* Accès au Service */}
          <div className="space-y-6 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl">
            <SectionHeader icon={Scale} title="2. Accès et Abonnement" />
            <div className="prose prose-slate max-w-none text-slate-600 space-y-4 font-medium leading-relaxed">
              <p>
                Le service est accessible aux établissements ayant souscrit à l'un de nos plans (Essentiel, Institution ou Élite). 
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>L'établissement est responsable de la confidentialité de ses identifiants d'accès.</li>
                <li>Le plan Élite est une licence à vie, sans frais de renouvellement.</li>
                <li>Les plans Essentiel et Institution sont soumis à un renouvellement annuel.</li>
              </ul>
            </div>
          </div>

          {/* Obligations de l'Utilisateur */}
          <div className="space-y-6 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl">
            <SectionHeader icon={FileText} title="3. Obligations de l'Établissement" />
            <div className="prose prose-slate max-w-none text-slate-600 space-y-4 font-medium leading-relaxed">
              <p>L'établissement s'engage à :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Fournir des informations exactes lors de l'inscription.</li>
                <li>Ne pas utiliser la plateforme pour des activités illégales ou frauduleuses.</li>
                <li>Obtenir le consentement nécessaire des parents pour le traitement des données des mineurs.</li>
                <li>Respecter les droits de propriété intellectuelle de Mégafixa.</li>
              </ul>
            </div>
          </div>

          {/* Responsabilité */}
          <div className="space-y-6 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl">
            <SectionHeader icon={AlertTriangle} title="4. Limitation de Responsabilité" />
            <div className="prose prose-slate max-w-none text-slate-600 space-y-4 font-medium leading-relaxed">
              <p>
                <strong>Mégafixa Educ Pro</strong> s'efforce d'assurer une disponibilité du service à 99.9%. Cependant :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Nous ne saurions être tenus responsables des interruptions dues à des opérations de maintenance ou à des cas de force majeure.</li>
                <li>L'établissement reste seul responsable de l'exactitude des notes et des données pédagogiques saisies.</li>
                <li>Mégafixa décline toute responsabilité en cas de perte de données résultant d'une négligence de l'utilisateur (divulgation de mot de passe).</li>
              </ul>
            </div>
          </div>

          {/* Paiements */}
          <div className="space-y-6 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl">
            <SectionHeader icon={Globe} title="5. Paiements et Remboursements" />
            <div className="prose prose-slate max-w-none text-slate-600 space-y-4 font-medium leading-relaxed">
              <p>
                Tous les paiements sont effectués via nos processeurs de paiement sécurisés (FedaPay, Kkiapay).
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Les frais d'abonnement sont payables d'avance.</li>
                <li>Aucun remboursement ne sera effectué après l'activation complète du service pour l'année en cours.</li>
              </ul>
            </div>
          </div>

           {/* Contact */}
           <div className="space-y-6 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl text-center">
            <SectionHeader icon={Scale} title="6. Droit Applicable" centered />
            <div className="prose prose-slate max-w-none text-slate-600 space-y-4 font-medium leading-relaxed max-w-2xl mx-auto">
              <p>
                Les présentes CGU sont régies par les lois en vigueur. Tout litige non résolu à l'amiable sera soumis aux tribunaux compétents.
              </p>
              <p className="text-sm font-bold text-slate-400 mt-8">Pour toute question juridique : megafixatecheduc@gmail.com</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-6">
          <img src="/logo_megafixa.png" alt="Mégafixa" className="h-10 mx-auto opacity-30 grayscale" />
          <p className="text-sm font-bold text-slate-400">© 2026 Mégafixa Educ Pro. L'excellence au service de la gestion scolaire.</p>
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
