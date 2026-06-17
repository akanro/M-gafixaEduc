import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ArrowRight, 
  Shield, 
  Zap, 
  Globe, 
  CheckCircle2, 
  LayoutDashboard,
  Users,
  CreditCard,
  School,
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  Plus,
  Minus,
  HelpCircle,
  ChevronDown
} from 'lucide-react';
import logo from '../logo_megafixa.png';

export default function Landing() {
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  const faqs = [
    {
      q: "Mégafixa Educ Pro est-il adapté aux petites écoles ?",
      a: "Absolument. Notre plan 'Essentiel' est spécialement conçu pour les écoles de moins de 200 élèves, offrant toutes les fonctionnalités vitales à un prix très abordable."
    },
    {
      q: "Les paiements via Mobile Money sont-ils sécurisés ?",
      a: "Oui, nous intégrons les solutions FedaPay et Kkiapay qui sont certifiées PCI-DSS. Les fonds sont transférés directement sur le compte bancaire de l'école sans passer par nos serveurs."
    },
    {
      q: "Puis-je importer mes données d'élèves existantes ?",
      a: "Oui, nous proposons une fonctionnalité d'importation Excel facile. Notre service client peut également vous accompagner gratuitement pour votre première migration de données."
    },
    {
      q: "Comment fonctionne la licence à vie ?",
      a: "Avec le plan Élite, vous payez une seule fois (120 000 FCFA) et vous bénéficiez d'un accès illimité à vie, incluant toutes les futures mises à jour et le support technique prioritaire."
    }
  ];
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-primary-100 selection:text-primary-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Mégafixa" className="h-10 object-contain shrink-0" />
            <span className="text-xl font-black tracking-tighter text-slate-900 uppercase">Educ Pro</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-bold text-slate-600 hover:text-primary-600 transition-colors">Fonctionnalités</a>
            <a href="#about" className="text-sm font-bold text-slate-600 hover:text-primary-600 transition-colors">À propos</a>
            <a href="#contact" className="text-sm font-bold text-slate-600 hover:text-primary-600 transition-colors">Contact</a>
            <Link to="/pricing" className="text-sm font-bold text-slate-600 hover:text-primary-600 transition-colors">Tarifs</Link>
            <Link to="/login" className="text-sm font-bold text-slate-900 hover:text-primary-600 transition-colors">Connexion</Link>
            <Link 
              to="/pricing" 
              className="px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-full hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
            >
              Démarrer
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-4">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-black uppercase tracking-widest"
            >
              <Zap size={14} />
              <span>Version 2.0 Maintenance terminée</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-6xl md:text-8xl font-black leading-[0.9] tracking-tighter text-slate-900"
            >
              Gérez votre école avec <span className="text-primary-500">précision.</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-slate-500 max-w-lg leading-relaxed"
            >
              La solution complète pour les établissements modernes. Inscriptions, paiements sécurisés, bulletins et emploi du temps en un seul clic.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center gap-4 pt-4"
            >
              <Link 
                to="/pricing" 
                className="w-full sm:w-auto px-8 py-4 bg-primary-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-primary-700 transition-all shadow-xl shadow-primary-200 group"
              >
                Commencer maintenant
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <a 
                href="#features" 
                className="w-full sm:w-auto px-8 py-4 bg-white text-slate-900 font-bold rounded-2xl border border-slate-200 flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
              >
                Découvrir
              </a>
            </motion.div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-primary-100 rounded-[3rem] -rotate-3 -z-10" />
            <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-slate-800">
              <div className="p-4 bg-slate-800 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-32 bg-slate-800 rounded-2xl animate-pulse" />
                  <div className="h-32 bg-slate-800 rounded-2xl animate-pulse" />
                </div>
                <div className="h-64 bg-slate-800 rounded-2xl animate-pulse" />
              </div>
            </div>
            
            {/* Floating Element */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -bottom-10 -left-10 bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center text-white">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Paiement Reçu</p>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">+ 45,000 FCFA</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center space-y-4 mb-20">
            <h2 className="text-[10px] font-black text-primary-600 uppercase tracking-[0.3em]">Fonctionnalités</h2>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase">Tout ce dont vous avez besoin</h2>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto">Une suite logicielle complète pour simplifier la vie de votre administration, de vos enseignants et des parents.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={LayoutDashboard}
              title="Tableau de Bord AI"
              desc="Visualisez en temps réel l'état des inscriptions, les revenus et les performances globales."
            />
            <FeatureCard 
              icon={Users}
              title="Gestion des Élèves"
              desc="Inscriptions simplifiées, promotions automatiques et suivi individuel complet."
            />
            <FeatureCard 
              icon={CreditCard}
              title="Paiements en ligne"
              desc="Intégration native FedaPay pour des paiements sécurisés via Mobile Money et Carte."
            />
            <FeatureCard 
              icon={School}
              title="Emplois du Temps"
              desc="Générez et partagez les plannings de cours en quelques secondes."
            />
            <FeatureCard 
              icon={Shield}
              title="Sécurité Totale"
              desc="Vos données sont protégées par les plus hauts standards de sécurité actuels."
            />
            <FeatureCard 
              icon={Globe}
              title="Accès Parent"
              desc="Une application dédiée pour que les parents suivent les notes et les paiements."
            />
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-[10px] font-black text-primary-600 uppercase tracking-[0.3em]">À propos de nous</h2>
                <h3 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-[0.9]">La mission de Mégafixa Educ Pro</h3>
              </div>
              <p className="text-lg text-slate-500 leading-relaxed">
                Mégafixa Educ Pro est né de la volonté de transformer le paysage éducatif en Afrique par le numérique. Nous croyons que chaque établissement, quelle que soit sa taille, mérite des outils de gestion de classe mondiale.
              </p>
              <p className="text-lg text-slate-500 leading-relaxed">
                Notre plateforme n'est pas seulement un logiciel, c'est un écosystème conçu pour libérer les directeurs des tâches administratives lourdes, permettant de se concentrer sur l'essentiel : <strong>l'éducation et la réussite des élèves.</strong>
              </p>
              <div className="grid grid-cols-2 gap-8 pt-4">
                <div>
                  <p className="text-4xl font-black text-primary-600">500+</p>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Écoles Partenaires</p>
                </div>
                <div>
                  <p className="text-4xl font-black text-primary-600">100k</p>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Élèves Gérés</p>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-square bg-slate-100 rounded-[3rem] overflow-hidden relative">
                <div className="absolute inset-x-0 bottom-0 p-10 bg-gradient-to-t from-slate-900/50 to-transparent text-white">
                  <p className="text-2xl font-black italic">"Le numérique au service de l'excellence académique."</p>
                </div>
              </div>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" />
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16">
            <div className="space-y-12">
              <div className="space-y-4">
                <h2 className="text-[10px] font-black text-primary-600 uppercase tracking-[0.3em]">Nous contacter</h2>
                <h3 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-[0.9]">Parlons de votre projet</h3>
                <p className="text-xl text-slate-500 leading-relaxed max-w-md">Vous avez des questions sur nos solutions ou souhaitez une démonstration personnalisée ? Notre équipe est à votre écoute.</p>
              </div>

              <div className="space-y-6">
                <ContactInfo 
                  icon={Phone}
                  label="Téléphone"
                  value="01 41 26 42 38 / 01 61 10 79 18 / 01 29 55 01 51"
                />
                <ContactInfo 
                  icon={Mail}
                  label="Email Support"
                  value="megafixatecheduc@gmail.com"
                />
                <ContactInfo 
                  icon={MapPin}
                  label="Siège Social"
                  value="Cotonou, Bénin"
                />
              </div>

              <div className="p-8 bg-white rounded-3xl border border-slate-100 flex items-center gap-6 shadow-sm">
                <div className="w-14 h-14 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center shrink-0">
                  <MessageSquare size={28} />
                </div>
                <div>
                  <p className="text-lg font-black text-slate-900">Support Chat 24/7</p>
                  <p className="text-sm text-slate-500">Disponible directement dans votre interface client une fois abonné.</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl">
              <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); alert('Message envoyé ! Nous vous reviendrons très bientôt.'); }}>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nom complet</label>
                    <input required type="text" className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl outline-none transition-all font-bold" placeholder="Jean Dupont" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                    <input required type="email" className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl outline-none transition-all font-bold" placeholder="jean@ecole.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Sujet</label>
                  <select className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl outline-none transition-all font-bold appearance-none">
                    <option>Demande d'information</option>
                    <option>Support technique</option>
                    <option>Partenariat</option>
                    <option>Autre</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Message</label>
                  <textarea required rows={4} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl outline-none transition-all font-bold resize-none" placeholder="Comment pouvons-nous vous aider ?" />
                </div>
                <button type="submit" className="w-full py-5 bg-primary-600 text-white font-black rounded-2xl hover:bg-primary-700 transition-all shadow-xl shadow-primary-200 uppercase tracking-widest">
                  Envoyer le message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-32 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-[10px] font-black text-primary-600 uppercase tracking-[0.3em]">FAQ</h2>
            <h3 className="text-4xl font-black tracking-tighter uppercase">Questions fréquentes</h3>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx}
                className={`border-2 rounded-[2rem] transition-all overflow-hidden ${openFaq === idx ? 'border-primary-500 bg-primary-50/30' : 'border-slate-100'}`}
              >
                <button 
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-8 py-6 flex items-center justify-between text-left"
                >
                  <span className="text-lg font-bold text-slate-800">{faq.q}</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${openFaq === idx ? 'bg-primary-600 text-white rotate-180' : 'bg-slate-100 text-slate-400'}`}>
                    <ChevronDown size={20} />
                  </div>
                </button>
                <motion.div 
                  initial={false}
                  animate={{ height: openFaq === idx ? 'auto' : 0, opacity: openFaq === idx ? 1 : 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-8 pb-8 text-slate-600 font-medium leading-relaxed">
                    {faq.a}
                  </div>
                </motion.div>
              </div>
            ))}
          </div>

          <div className="mt-12 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary-600 shadow-sm">
                <HelpCircle size={28} />
              </div>
              <div>
                <p className="font-black text-slate-900">D'autres questions ?</p>
                <p className="text-sm text-slate-500 font-medium">Nous sommes là pour vous aider personnellement.</p>
              </div>
            </div>
            <a href="#contact" className="px-8 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all uppercase tracking-widest text-xs">
              Nous écrire
            </a>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-primary-600 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-primary-500 -skew-x-12 translate-x-1/2" />
        
        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center space-y-10">
          <h2 className="text-5xl md:text-7xl font-black leading-[0.9] tracking-tighter">
            Prêt à transformer <br /> votre établissement ?
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link 
              to="/pricing" 
              className="w-full sm:w-auto px-8 py-4 bg-white text-primary-700 font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-100 transition-all shadow-2xl"
            >
              Prendre un abonnement
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2 space-y-6">
              <div className="flex items-center gap-2">
                <img src={logo} alt="Mégafixa" className="h-8 object-contain shrink-0" />
                <span className="text-lg font-black tracking-tighter text-slate-900 uppercase">Educ Pro</span>
              </div>
              <p className="text-slate-500 max-w-sm leading-relaxed">
                Le partenaire numérique des établissements scolaires d'excellence. Simplifiez votre gestion et concentrez-vous sur l'essentiel.
              </p>
            </div>
            
            <div className="space-y-6">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Liens utiles</h4>
              <ul className="space-y-4">
                <li><a href="#features" className="text-sm font-bold text-slate-500 hover:text-primary-600 transition-colors">Fonctionnalités</a></li>
                <li><a href="#about" className="text-sm font-bold text-slate-500 hover:text-primary-600 transition-colors">À propos</a></li>
                <li><a href="#faq" className="text-sm font-bold text-slate-500 hover:text-primary-600 transition-colors">FAQ</a></li>
                <li><Link to="/pricing" className="text-sm font-bold text-slate-500 hover:text-primary-600 transition-colors">Tarifs</Link></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Connexion</h4>
              <ul className="space-y-4">
                <li><Link to="/login" className="text-sm font-bold text-slate-500 hover:text-primary-600 transition-colors">Portail Administration</Link></li>
                <li><Link to="/parent-login" className="text-sm font-bold text-slate-500 hover:text-primary-600 transition-colors">Portail Parent</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm font-bold text-slate-400">© 2026 Mégafixa Educ Pro. Tous droits réservés.</p>
            <div className="flex items-center gap-8 text-sm font-bold text-slate-400">
              <Link to="/confidentialite" className="hover:text-slate-600 transition-colors">Confidentialité</Link>
              <Link to="/conditions" className="hover:text-slate-600 transition-colors">Conditions</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ContactInfo({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 shrink-0">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
        <p className="text-slate-900 font-bold">{value}</p>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: any) {
  return (
    <div className="group bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-primary-100 transition-all">
      <div className="w-16 h-16 bg-slate-50 text-slate-900 rounded-3xl flex items-center justify-center mb-6 group-hover:bg-primary-500 group-hover:text-white transition-all group-hover:-rotate-6">
        <Icon size={32} />
      </div>
      <h3 className="text-2xl font-black text-slate-900 mb-4">{title}</h3>
      <p className="text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}
