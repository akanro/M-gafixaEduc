import { apiFetch } from "../utils/api";
import React from "react";
import {
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  Hash,
  Flag,
  Palette,
  Type,
  Languages,
  Save,
  Image as ImageIcon,
  CheckCircle2,
  X,
  ShieldCheck,
  Lock,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import fedapayLogo from "../Logo_Fedapay.png";
import kkiapayLogo from "../Logo_Kkiapay.jpg";
import { useTranslation } from "../contexts/TranslationContext";

const LANGUAGES = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
];

const FONTS = [
  { id: "inter", label: "Inter (Sans-serif)", family: '"Inter", sans-serif' },
  { id: "roboto", label: "Roboto", family: '"Roboto", sans-serif' },
  {
    id: "playfair",
    label: "Playfair Display (Serif)",
    family: '"Playfair Display", serif',
  },
  {
    id: "mono",
    label: "JetBrains Mono (Monospace)",
    family: '"JetBrains Mono", monospace',
  },
];

const COLORS = [
  { name: "Emerald", value: "#10b981" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Slate", value: "#475569" },
];

export default function SchoolInfo() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const pathPermission = user.permissions?.find((p: any) =>
    typeof p === "string" ? p === "/ecole" : p.path === "/ecole",
  );
  const canWrite =
    ["admin", "super_admin"].includes(user.role) ||
    (pathPermission &&
      (typeof pathPermission === "object" ? pathPermission.can_write : true));
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState("general");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [toast, setToast] = React.useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [formData, setFormData] = React.useState({
    nom: "",
    slogan: "",
    adresse: "",
    telephone: "",
    email: "",
    site_web: "",
    numero_enregistrement: "",
    pays: "",
    devise: "FCFA",
    logo: "",
    langue: "fr",
    couleur_primaire: "#10b981",
    police: "inter",
    taille_police: 16,
    fedapay_public_key: "",
    fedapay_secret_key: "",
    fedapay_mode: "sandbox",
    kkiapay_public_key: "",
    kkiapay_secret_key: "",
    kkiapay_mode: "sandbox",
  });

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSchoolInfo = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await apiFetch("/api/school-info", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();

      if (response.ok) {
        setFormData({
          nom: data.nom ?? "",
          slogan: data.slogan ?? "",
          adresse: data.adresse ?? "",
          telephone: data.telephone ?? "",
          email: data.email ?? "",
          site_web: data.site_web ?? "",
          numero_enregistrement: data.numero_enregistrement ?? "",
          pays: data.pays ?? "",
          devise: data.devise ?? "FCFA",
          logo: data.logo ?? "",
          langue: data.langue ?? "fr",
          couleur_primaire: data.couleur_primaire ?? "#10b981",
          police: data.police ?? "inter",
          taille_police: Number(data.taille_police) || 16,
          fedapay_public_key: data.fedapay_public_key ?? "",
          fedapay_secret_key: data.fedapay_secret_key ?? "",
          fedapay_mode: data.fedapay_mode ?? "sandbox",
          kkiapay_public_key: data.kkiapay_public_key ?? "",
          kkiapay_secret_key: data.kkiapay_secret_key ?? "",
          kkiapay_mode: data.kkiapay_mode ?? "sandbox",
        });
      }
    } catch (error) {
      console.error("Error fetching school info:", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchSchoolInfo();
  }, []);

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const response = await apiFetch("/api/school-info", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        showToast(t("success_update"));
        window.dispatchEvent(new CustomEvent("schoolInfoChanged"));
      } else {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la mise à jour");
      }
    } catch (error: any) {
      console.error("Error updating school info:", error);
      showToast(error.message || t("error_update"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t("school_info")}
          </h1>
          <p className="text-slate-500">
            {t("school_identity_desc") ||
              "Gérez l'identité visuelle et les coordonnées de votre école."}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fetchSchoolInfo()}
            disabled={saving}
            className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-primary-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 disabled:opacity-50"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save size={20} />
            )}
            {t("save")}
          </button>
        </div>
      </header>

      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "general" ? "bg-white text-primary-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          {t("general_contacts")}
        </button>
        <button
          onClick={() => setActiveTab("appearance")}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "appearance" ? "bg-white text-primary-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          {t("appearance_language")}
        </button>
        <button
          onClick={() => setActiveTab("payments_fedapay")}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "payments_fedapay" ? "bg-white text-primary-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          Paiements (FedaPay)
        </button>
        <button
          onClick={() => setActiveTab("payments_kkiapay")}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "payments_kkiapay" ? "bg-white text-primary-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          Paiements (Kkiapay)
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {activeTab === "general" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 md:col-span-2">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Building2 size={20} className="text-primary-600" />
                {t("school_identity")}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">
                    {t("school_name")} *
                  </label>
                  <div className="relative">
                    <Building2
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      required
                      value={formData.nom}
                      onChange={(e) =>
                        setFormData({ ...formData, nom: e.target.value })
                      }
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Ex: Complexe Scolaire Excellence"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">
                    {t("slogan")}
                  </label>
                  <input
                    value={formData.slogan}
                    onChange={(e) =>
                      setFormData({ ...formData, slogan: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Ex: Vers l'excellence et au-delà"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">
                    {t("registration_number")}
                  </label>
                  <div className="relative">
                    <Hash
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      value={formData.numero_enregistrement}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          numero_enregistrement: e.target.value,
                        })
                      }
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Ex: CS-2024-001"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">
                    {t("country")}
                  </label>
                  <div className="relative">
                    <Flag
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      value={formData.pays}
                      onChange={(e) =>
                        setFormData({ ...formData, pays: e.target.value })
                      }
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Ex: Bénin"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 md:col-span-2">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Phone size={20} className="text-blue-600" />
                {t("address_contacts") || "Coordonnées & Localisation"}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">
                    {t("address")}
                  </label>
                  <div className="relative">
                    <MapPin
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      value={formData.adresse}
                      onChange={(e) =>
                        setFormData({ ...formData, adresse: e.target.value })
                      }
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Ex: Rue 123, Quartier Latin, Cotonou"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">
                    {t("phone")}
                  </label>
                  <div className="relative">
                    <Phone
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      value={formData.telephone}
                      onChange={(e) =>
                        setFormData({ ...formData, telephone: e.target.value })
                      }
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Ex: 01 41 26 42 38"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">
                    {t("email")}
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Ex: contact@ecole.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">
                    {t("website")}
                  </label>
                  <div className="relative">
                    <Globe
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      value={formData.site_web}
                      onChange={(e) =>
                        setFormData({ ...formData, site_web: e.target.value })
                      }
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Ex: www.ecole.com"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "payments_fedapay" ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-primary-100 flex items-center justify-center rounded-2xl p-2 shrink-0">
                  <img src={fedapayLogo} alt="FedaPay" className="max-h-full object-contain" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    Configuration FedaPay
                  </h2>
                  <p className="text-xs text-slate-500">
                    Configurez votre passerelle de paiement pour recevoir les
                    frais de scolarité via FedaPay.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3 mb-6">
                <Info className="text-blue-600 shrink-0" size={20} />
                <p className="text-xs text-blue-800 leading-relaxed">
                  Ces identifiants permettent à votre école de recevoir les
                  paiements Mobile Money des parents d'élèves via FedaPay. Vous
                  pouvez les trouver dans votre tableau de bord{" "}
                  <a
                    href="https://www.fedapay.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline"
                  >
                    FedaPay
                  </a>
                  .
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    Clé Secrète (Secret Key)
                    <Lock size={14} className="text-slate-400" />
                  </label>
                  <input
                    type="password"
                    value={formData.fedapay_secret_key}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fedapay_secret_key: e.target.value,
                      })
                    }
                    placeholder="sk_test_..."
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">
                    Clé Publique (Public Key)
                  </label>
                  <input
                    type="text"
                    value={formData.fedapay_public_key}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fedapay_public_key: e.target.value,
                      })
                    }
                    placeholder="pk_test_..."
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">
                    Mode d'opération
                  </label>
                  <div className="flex gap-3">
                    {[
                      { id: "sandbox", label: "Sandbox (Test)" },
                      { id: "live", label: "Live (Réel)" },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, fedapay_mode: mode.id })
                        }
                        className={`flex-1 py-3 px-4 rounded-xl font-bold border transition-all text-sm flex items-center justify-between ${
                          formData.fedapay_mode === mode.id
                            ? "bg-primary-50 border-primary-500 text-primary-700"
                            : "bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-200"
                        }`}
                      >
                        {mode.label}
                        {formData.fedapay_mode === mode.id && (
                          <CheckCircle2 size={16} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "payments_kkiapay" ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-indigo-100 flex items-center justify-center rounded-2xl p-2 shrink-0">
                  <img src={kkiapayLogo} alt="Kkiapay" className="max-h-full object-contain" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    Configuration Kkiapay
                  </h2>
                  <p className="text-xs text-slate-500">
                    Configurez votre passerelle de paiement pour recevoir les
                    frais de scolarité via Kkiapay.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-3 mb-6">
                <Info className="text-indigo-600 shrink-0" size={20} />
                <p className="text-xs text-indigo-800 leading-relaxed">
                  Ces identifiants permettent à votre école de recevoir les
                  paiements Mobile Money des parents d'élèves via Kkiapay. Vous
                  pouvez les trouver dans votre tableau de bord{" "}
                  <a
                    href="https://app.kkiapay.me"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline"
                  >
                    Kkiapay
                  </a>
                  .
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    Clé API (Public Key)
                  </label>
                  <input
                    type="text"
                    value={formData.kkiapay_public_key}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        kkiapay_public_key: e.target.value,
                      })
                    }
                    placeholder="pk_..."
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    Clé Privée (Secret Key)
                    <Lock size={14} className="text-slate-400" />
                  </label>
                  <input
                    type="password"
                    value={formData.kkiapay_secret_key}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        kkiapay_secret_key: e.target.value,
                      })
                    }
                    placeholder="sk_..."
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">
                    Mode d'opération
                  </label>
                  <div className="flex gap-3">
                    {[
                      { id: "sandbox", label: "Sandbox (Test)" },
                      { id: "live", label: "Live (Réel)" },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, kkiapay_mode: mode.id })
                        }
                        className={`flex-1 py-3 px-4 rounded-xl font-bold border transition-all text-sm flex items-center justify-between ${
                          formData.kkiapay_mode === mode.id
                            ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                            : "bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-200"
                        }`}
                      >
                        {mode.label}
                        {formData.kkiapay_mode === mode.id && (
                          <CheckCircle2 size={16} />
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 italic">
                    Utilisez le mode <strong>Sandbox</strong> pour tester avant
                    de passer en production avec le mode <strong>Live</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Palette size={20} className="text-indigo-600" />
                Identité Visuelle
              </h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">
                    Logo de l'école
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative group">
                      {formData.logo ? (
                        <>
                          <img
                            src={formData.logo}
                            alt="Logo"
                            className="w-full h-full object-contain p-2"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({ ...formData, logo: "" })
                            }
                            className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <X size={20} />
                          </button>
                        </>
                      ) : (
                        <ImageIcon className="text-slate-300" size={32} />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="inline-block px-4 py-2 bg-primary-50 text-primary-700 rounded-xl text-sm font-bold cursor-pointer hover:bg-primary-100 transition-colors">
                        Choisir une image
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                        />
                      </label>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Format recommandé : PNG ou JPG carré.
                        <br />
                        Taille max : 2Mo.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">
                    {t("primary_color")}
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    {COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            couleur_primaire: color.value,
                          })
                        }
                        className={`w-full aspect-square rounded-lg transition-transform hover:scale-110 flex items-center justify-center`}
                        style={{ backgroundColor: color.value }}
                      >
                        {formData.couleur_primaire === color.value && (
                          <CheckCircle2 size={16} className="text-white" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Type size={20} className="text-amber-600" />
                {t("typography_language") || "Typographie & Langue"}
              </h2>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">
                    {t("font_family")}
                  </label>
                  <div className="space-y-2">
                    {FONTS.map((font) => (
                      <button
                        key={font.id}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, police: font.id })
                        }
                        className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                          formData.police === font.id
                            ? "border-primary-500 bg-primary-50 text-primary-700"
                            : "border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200"
                        }`}
                      >
                        <span style={{ fontFamily: font.family }}>
                          {font.label}
                        </span>
                        {formData.police === font.id && (
                          <CheckCircle2 size={18} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">
                    {t("font_size_px")}
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="12"
                      max="24"
                      step="1"
                      value={formData.taille_police || 16}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          taille_police: parseInt(e.target.value) || 16,
                        })
                      }
                      className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <span className="text-lg font-bold text-primary-600 w-12 text-center">
                      {formData.taille_police}px
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p
                      style={{ fontSize: `${formData.taille_police}px` }}
                      className="text-slate-600"
                    >
                      {t("font_preview")}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Languages size={18} className="text-slate-400" />
                    {t("system_language")}
                  </label>
                  <div className="flex gap-2">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, langue: lang.code })
                        }
                        className={`flex-1 py-3 rounded-2xl font-bold transition-all ${
                          formData.langue === lang.code
                            ? "bg-primary-600 text-white shadow-md"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className={`fixed bottom-8 left-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              toast.type === "success"
                ? "bg-primary-900 border-primary-700 text-primary-50"
                : "bg-red-900 border-red-700 text-red-50"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 size={20} className="text-primary-400" />
            ) : (
              <X size={20} className="text-red-400" />
            )}
            <span className="font-bold text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
