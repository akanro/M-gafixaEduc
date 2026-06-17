import React from 'react';
import { motion } from 'motion/react';
import { Phone, Mail, MapPin, Globe, Shield, Zap, Users, Heart } from 'lucide-react';

export default function About() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50" />
        
        <div className="relative flex flex-col md:flex-row gap-10 items-center">
          <div className="w-24 h-24 bg-primary text-white rounded-3xl flex items-center justify-center shadow-xl shadow-primary-100 shrink-0">
            <Heart size={48} />
          </div>
          <div className="space-y-3 text-center md:text-left">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">À propos de Mégafixa</h1>
            <p className="text-slate-500 font-medium max-w-2xl">
              Spécialiste de la transformation numérique éducative, nous accompagnons les établissements scolaires vers l'excellence grâce à des outils de gestion innovants.
            </p>
          </div>
        </div>
      </div>

      {/* Social & Contact Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Mission */}
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
              <Zap className="text-primary-600" /> Notre Mission
            </h2>
            <div className="space-y-4 text-slate-600 font-medium leading-relaxed">
              <p>
                <strong>Mégafixa Educ Pro</strong> est bien plus qu'une simple application. C'est un partenaire stratégique pour votre école. Nous avons conçu cette plateforme pour résoudre les défis complexes de la gestion quotidienne : suivi des notes, recouvrement des frais, gestion du personnel et communication avec les parents.
              </p>
              <p>
                Notre mission est de digitaliser l'éducation pour libérer le potentiel des directeurs et des enseignants, leur permettant de se concentrer sur ce qui compte vraiment : <strong>le succès de chaque élève.</strong>
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-3 gap-6">
            <StatCard value="500+" label="Écoles" />
            <StatCard value="100k+" label="Élèves" />
            <StatCard value="99.9%" label="Disponibilité" />
          </div>
        </div>

        {/* Contacts Sidebar */}
        <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white flex flex-col justify-between">
          <div className="space-y-8">
            <div className="space-y-2">
              <h3 className="text-sm font-black text-primary-400 uppercase tracking-[0.2em]">Nous Contacter</h3>
              <p className="text-2xl font-black tracking-tight">Besoin d'assistance directe ?</p>
            </div>

            <div className="space-y-6">
              <ContactLink 
                icon={Phone} 
                label="Téléphone" 
                value="01 41 26 42 38 / 01 61 10 79 18 / 01 29 55 01 51" 
                href="tel:0141264238"
              />
              <ContactLink 
                icon={Mail} 
                label="Email" 
                value="megafixatecheduc@gmail.com" 
                href="mailto:megafixatecheduc@gmail.com"
              />
              <ContactLink 
                icon={MapPin} 
                label="Siège Social" 
                value="Cotonou, Bénin" 
              />
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-black italic">MT</div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-primary-400">Propulsé par</p>
                <p className="font-bold">Mégafixa Tech</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="grid md:grid-cols-2 gap-8">
        <ValueCard 
          icon={Shield} 
          title="Sécurité & Confidentialité" 
          desc="Nous utilisons des protocoles de chiffrement de pointe pour garantir que les données de vos élèves restent strictement confidentielles."
        />
        <ValueCard 
          icon={Users} 
          title="Support Personnalisé" 
          desc="Une équipe d'experts est à votre disposition 24/7 pour vous accompagner dans la prise en main de l'outil et résoudre vos problèmes."
        />
      </div>
    </div>
  );
}

function StatCard({ value, label }: { value: string, label: string }) {
  return (
    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm text-center space-y-1">
      <p className="text-3xl font-black text-primary-600">{value}</p>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
    </div>
  );
}

function ContactLink({ icon: Icon, label, value, href }: any) {
  const Content = (
    <div className="flex items-start gap-4 group cursor-pointer">
      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all border border-white/5">
        <Icon size={20} className="text-primary-400 group-hover:text-white" />
      </div>
      <div>
        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">{label}</p>
        <p className="font-bold text-sm leading-relaxed text-white/90 group-hover:text-white transition-colors">{value}</p>
      </div>
    </div>
  );

  return href ? <a href={href}>{Content}</a> : Content;
}

function ValueCard({ icon: Icon, title, desc }: any) {
  return (
    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm flex gap-8 items-start">
      <div className="w-14 h-14 bg-slate-50 text-slate-900 rounded-2xl flex items-center justify-center shrink-0">
        <Icon size={28} />
      </div>
      <div className="space-y-4">
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{title}</h3>
        <p className="text-slate-500 font-medium leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
