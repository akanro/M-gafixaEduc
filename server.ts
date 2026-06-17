import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import XLSX from "xlsx";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import fedapay from 'fedapay';
import cors from 'cors';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import helmet from 'helmet';
import crypto from 'crypto';
import { rateLimit } from 'express-rate-limit';
import { firestore } from './firebaseAdmin';
import fs from 'fs';

// Extract FedaPay components with maximum compatibility
const FedaPayInstance = (fedapay as any).FedaPay || (fedapay as any).default?.FedaPay || (fedapay as any);
const Transaction = (fedapay as any).Transaction || (fedapay as any).default?.Transaction;

// FedaPay Integration
const FEDAPAY_SK = process.env.FEDAPAY_SECRET_KEY || '';
const FEDAPAY_PUBLIC = process.env.FEDAPAY_PUBLIC_KEY || '';
const FEDAPAY_MODE = process.env.FEDAPAY_MODE || 'sandbox';

const KKIAPAY_PUBLIC = process.env.KKIAPAY_PUBLIC_KEY || '';
const KKIAPAY_SECRET = process.env.KKIAPAY_SECRET_KEY || '';
const KKIAPAY_PRIVATE = process.env.KKIAPAY_PRIVATE_KEY || '';
const KKIAPAY_MODE = process.env.KKIAPAY_MODE || 'sandbox';

const generateConnectionKey = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segment = (len: number) => Array.from({length: len}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `MGX-${segment(4)}-${segment(4)}-${segment(4)}`;
};

console.log("-----------------------------------------");
console.log("  CONFIG DIAGNOSTIC: FedaPay (Global)  ");
console.log("-----------------------------------------");
console.log("- Clés présentes:", FEDAPAY_SK && FEDAPAY_PUBLIC ? "OUI" : "NON (Manquant)");
if (FEDAPAY_SK.includes('sk_test_...')) {
  console.log("- Type de clé: PLACEHOLDER (Action requise)");
  console.log("  => Veuillez renseigner FEDAPAY_SECRET_KEY et FEDAPAY_PUBLIC_KEY dans le menu Settings d'AI Studio.");
} else {
  console.log("- Type de clé: Configurée");
}
console.log("- Mode:", FEDAPAY_MODE);
console.log("-----------------------------------------");

console.log("-----------------------------------------");
console.log("  CONFIG DIAGNOSTIC: Kkiapay (Global)   ");
console.log("-----------------------------------------");
console.log("- Clés présentes:", KKIAPAY_PUBLIC && KKIAPAY_SECRET ? "OUI" : "NON (Manquant)");
console.log("- Mode:", KKIAPAY_MODE);
console.log("-----------------------------------------");

if (FEDAPAY_SK && FedaPayInstance && (FedaPayInstance as any).setApiKey) {
  try {
    (FedaPayInstance as any).setApiKey(FEDAPAY_SK);
    (FedaPayInstance as any).setEnvironment(FEDAPAY_MODE);
    if (FEDAPAY_MODE === 'sandbox') {
      (FedaPayInstance as any).setVerifySsl(false);
    }
    console.log(`FedaPay initialized successfully in ${FEDAPAY_MODE} mode.`);
  } catch (e) {
    console.error("FedaPay initialization error:", e);
  }
} else {
  console.warn("FedaPay is not fully configured or library structure unexpected.");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'mega-fixa-secret-key-2026';
const DATABASE_PATH = process.env.DATABASE_PATH || 'school.db';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
let APP_URL = process.env.APP_URL || 'http://localhost:3000';
if (APP_URL.endsWith('/')) {
  APP_URL = APP_URL.slice(0, -1);
}
console.log("Application URL configured as:", APP_URL);

let googleClient: OAuth2Client | null = null;
if (GOOGLE_CLIENT_ID) {
  googleClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
}

const db = new Database(DATABASE_PATH);
db.pragma('foreign_keys = ON');

// Helper for academic year libelle
function getCurrentAcademicYearLibelle() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  // Academic year usually starts in August (8)
  if (month < 8) {
    return `${year - 1}-${year}`;
  } else {
    return `${year}-${year + 1}`;
  }
}

// Helper to get active year ID
function getActiveYearId(schoolId: number) {
  // Priority: Manually activated year
  let activeYear = db.prepare("SELECT id FROM annees_scolaires WHERE est_active = 1 AND archivee = 0 AND school_id = ?").get(schoolId) as any;
  
  // Fallback: Current real year
  if (!activeYear) {
    const currentLibelle = getCurrentAcademicYearLibelle();
    activeYear = db.prepare("SELECT id FROM annees_scolaires WHERE libelle = ? AND archivee = 0 AND school_id = ?").get(currentLibelle, schoolId) as any;
  }
  
  // Fallback: Latest
  if (!activeYear) {
    activeYear = db.prepare("SELECT id FROM annees_scolaires WHERE archivee = 0 AND school_id = ? ORDER BY libelle DESC LIMIT 1").get(schoolId) as any;
  }
  
  return activeYear?.id || null;
}

// Audit Log Helper
function logActivity(userId: any, action: string, entityType: string, entityId: any, details: any, schoolId: number) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (utilisateur_id, action, entite_type, entite_id, details, school_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId || null, action, entityType, entityId || null, JSON.stringify(details), schoolId);
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

async function initializeDatabase() {
  console.log("Initializing database schema...");
  
  // Helper to safely add columns
  const addColumn = (table: string, column: string, type: string) => {
    try {
      const info = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
      if (!info.find(c => c.name === column)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
        console.log(`Added column ${column} to ${table}`);
      }
    } catch (e) {
      console.warn(`Could not add column ${column} to ${table}:`, e);
    }
  };

  addColumn('school_info', 'fedapay_public_key', 'TEXT');
  addColumn('school_info', 'fedapay_secret_key', 'TEXT');
  addColumn('school_info', 'fedapay_mode', "TEXT DEFAULT 'sandbox'");

  // Initialize Database Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS utilisateurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    mot_de_passe TEXT NOT NULL,
    role TEXT CHECK(role IN ('super_admin', 'admin', 'secretariat', 'secretaire', 'enseignant', 'comptable', 'parent')) NOT NULL,
    approuve INTEGER DEFAULT 0,
    permissions TEXT, -- JSON array of allowed paths
    otp_code TEXT,
    otp_expiry TEXT,
    is_first_login INTEGER DEFAULT 1,
    license_key TEXT,
    enseignant_id INTEGER,
    eleve_id INTEGER,
    google_id TEXT UNIQUE,
    parent_admin_id INTEGER,
    can_write INTEGER DEFAULT 1,
    last_seen TEXT,
    school_id INTEGER,
    FOREIGN KEY(parent_admin_id) REFERENCES utilisateurs(id),
    FOREIGN KEY(school_id) REFERENCES school_info(id),
    FOREIGN KEY(eleve_id) REFERENCES eleves(id)
  );

  CREATE TABLE IF NOT EXISTS school_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    slogan TEXT,
    adresse TEXT,
    telephone TEXT,
    email TEXT,
    site_web TEXT,
    numero_enregistrement TEXT,
    pays TEXT,
    devise TEXT DEFAULT 'FCFA',
    logo TEXT,
    langue TEXT DEFAULT 'fr',
    couleur_primaire TEXT DEFAULT '#10b981',
    police TEXT DEFAULT 'inter',
    taille_police INTEGER DEFAULT 16,
    fedapay_public_key TEXT,
    fedapay_secret_key TEXT,
    fedapay_mode TEXT DEFAULT 'sandbox',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS annees_scolaires (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    libelle TEXT NOT NULL,
    date_debut TEXT,
    date_fin TEXT,
    est_active INTEGER DEFAULT 0,
    archivee INTEGER DEFAULT 0,
    cloturee INTEGER DEFAULT 0,
    date_limite_scolarite TEXT,
    date_limite_inscription TEXT,
    school_id INTEGER,
    FOREIGN KEY(school_id) REFERENCES school_info(id)
  );

  CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    niveau TEXT NOT NULL,
    frais_scolarite REAL DEFAULT 0,
    frais_inscription REAL DEFAULT 0,
    tranche1_montant REAL DEFAULT 0,
    tranche1_date_limite TEXT,
    tranche2_montant REAL DEFAULT 0,
    tranche2_date_limite TEXT,
    tranche3_montant REAL DEFAULT 0,
    tranche3_date_limite TEXT,
    devise TEXT DEFAULT 'FCFA',
    annee_id INTEGER,
    school_id INTEGER,
    FOREIGN KEY(annee_id) REFERENCES annees_scolaires(id),
    FOREIGN KEY(school_id) REFERENCES school_info(id)
  );

  CREATE TABLE IF NOT EXISTS eleves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matricule TEXT NOT NULL,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    sexe TEXT,
    date_naissance TEXT,
    photo TEXT,
    classe_id INTEGER,
    nom_parent TEXT,
    tel_parent TEXT,
    email_parent TEXT,
    adresse TEXT,
    statut TEXT DEFAULT 'Passant',
    provenance TEXT DEFAULT 'Nouveau',
    school_id INTEGER,
    FOREIGN KEY(classe_id) REFERENCES classes(id),
    FOREIGN KEY(school_id) REFERENCES school_info(id),
    UNIQUE(matricule, school_id)
  );

  CREATE TABLE IF NOT EXISTS enseignants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    telephone TEXT,
    email TEXT,
    adresse TEXT,
    school_id INTEGER,
    FOREIGN KEY(school_id) REFERENCES school_info(id),
    UNIQUE(email, school_id)
  );

  CREATE TABLE IF NOT EXISTS system_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    nom_fondateur TEXT,
    prenom_fondateur TEXT,
    telephone_fondateur TEXT,
    email_fondateur TEXT,
    date_naissance_fondateur TEXT,
    sexe_fondateur TEXT,
    nom_ecole TEXT,
    slogan_ecole TEXT,
    email_ecole TEXT,
    adresse_ecole TEXT,
    hashed_password TEXT,
    license_key TEXT UNIQUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS matieres (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    coefficient INTEGER DEFAULT 1,
    categorie TEXT,
    parent_id INTEGER,
    school_id INTEGER,
    FOREIGN KEY (parent_id) REFERENCES matieres (id) ON DELETE SET NULL,
    FOREIGN KEY(school_id) REFERENCES school_info(id)
  );

  CREATE TABLE IF NOT EXISTS enseignant_matieres (
    enseignant_id INTEGER,
    matiere_id INTEGER,
    school_id INTEGER,
    PRIMARY KEY (enseignant_id, matiere_id),
    FOREIGN KEY (enseignant_id) REFERENCES enseignants (id) ON DELETE CASCADE,
    FOREIGN KEY (matiere_id) REFERENCES matieres (id) ON DELETE CASCADE,
    FOREIGN KEY (school_id) REFERENCES school_info(id)
  );

  CREATE TABLE IF NOT EXISTS alertes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titre TEXT NOT NULL,
    description TEXT,
    date_alerte TEXT DEFAULT CURRENT_TIMESTAMP,
    importance TEXT DEFAULT 'normal',
    school_id INTEGER,
    FOREIGN KEY(school_id) REFERENCES school_info(id)
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    eleve_id INTEGER,
    matiere_id INTEGER,
    type_evaluation TEXT, -- I1, I2, I3, I4, Dev1, Dev2
    note REAL,
    date_evaluation TEXT,
    annee_id INTEGER,
    trimestre INTEGER DEFAULT 1, -- 1, 2, 3
    enseignant_id INTEGER,
    school_id INTEGER,
    FOREIGN KEY(eleve_id) REFERENCES eleves(id),
    FOREIGN KEY(matiere_id) REFERENCES matieres(id),
    FOREIGN KEY(annee_id) REFERENCES annees_scolaires(id),
    FOREIGN KEY(school_id) REFERENCES school_info(id)
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_notes_unique ON notes (eleve_id, matiere_id, type_evaluation, annee_id, trimestre, school_id);

  CREATE TABLE IF NOT EXISTS paiements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    eleve_id INTEGER,
    type_paiement TEXT,
    montant REAL,
    date_paiement TEXT,
    annee_id INTEGER,
    school_id INTEGER,
    methode TEXT DEFAULT 'Espèces',
    status TEXT DEFAULT 'Terminé',
    reference_transaction TEXT,
    FOREIGN KEY(eleve_id) REFERENCES eleves(id) ON DELETE CASCADE,
    FOREIGN KEY(annee_id) REFERENCES annees_scolaires(id) ON DELETE CASCADE,
    FOREIGN KEY(school_id) REFERENCES school_info(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS emplois_du_temps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    classe_id INTEGER,
    jour TEXT,
    heure_debut TEXT,
    heure_fin TEXT,
    matiere_id INTEGER,
    enseignant_id INTEGER,
    school_id INTEGER,
    FOREIGN KEY(classe_id) REFERENCES classes(id),
    FOREIGN KEY(matiere_id) REFERENCES matieres(id),
    FOREIGN KEY(enseignant_id) REFERENCES enseignants(id),
    FOREIGN KEY(school_id) REFERENCES school_info(id)
  );

  CREATE TABLE IF NOT EXISTS reunions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titre TEXT NOT NULL,
    description TEXT,
    date_reunion TEXT,
    heure_reunion TEXT,
    lieu TEXT,
    school_id INTEGER,
    FOREIGN KEY(school_id) REFERENCES school_info(id)
  );

  CREATE TABLE IF NOT EXISTS devoirs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    classe_id INTEGER,
    matiere_id INTEGER,
    titre TEXT NOT NULL,
    description TEXT,
    date_echeance TEXT,
    school_id INTEGER,
    FOREIGN KEY(classe_id) REFERENCES classes(id),
    FOREIGN KEY(matiere_id) REFERENCES matieres(id),
    FOREIGN KEY(school_id) REFERENCES school_info(id)
  );

  CREATE TABLE IF NOT EXISTS activites_scolaires (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    annee_id INTEGER,
    trimestre INTEGER NOT NULL, -- 1, 2, 3
    type TEXT NOT NULL, -- 'reunion', 'evaluation', 'conge', 'autre'
    titre TEXT NOT NULL,
    description TEXT,
    date_debut TEXT,
    date_fin TEXT,
    heure TEXT,
    school_id INTEGER,
    FOREIGN KEY(annee_id) REFERENCES annees_scolaires(id) ON DELETE CASCADE,
    FOREIGN KEY(school_id) REFERENCES school_info(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    utilisateur_id INTEGER,
    action TEXT NOT NULL,
    entite_type TEXT NOT NULL,
    entite_id INTEGER,
    details TEXT,
    date_activite TEXT DEFAULT CURRENT_TIMESTAMP,
    school_id INTEGER,
    FOREIGN KEY(utilisateur_id) REFERENCES utilisateurs(id),
    FOREIGN KEY(school_id) REFERENCES school_info(id)
  );

  CREATE TABLE IF NOT EXISTS role_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    permissions TEXT NOT NULL,
    school_id INTEGER,
    FOREIGN KEY (school_id) REFERENCES school_info(id),
    UNIQUE(role, school_id)
  );

  CREATE TABLE IF NOT EXISTS classe_matieres (
    classe_id INTEGER,
    matiere_id INTEGER,
    enseignant_id INTEGER,
    heures_hebdo INTEGER DEFAULT 0,
    coefficient INTEGER DEFAULT 1,
    school_id INTEGER,
    PRIMARY KEY (classe_id, matiere_id),
    FOREIGN KEY (classe_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (matiere_id) REFERENCES matieres(id) ON DELETE CASCADE,
    FOREIGN KEY (enseignant_id) REFERENCES enseignants(id) ON DELETE SET NULL,
    FOREIGN KEY (school_id) REFERENCES school_info(id)
  );

  CREATE TABLE IF NOT EXISTS timetable_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enseignant_id INTEGER,
    description TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    school_id INTEGER,
    FOREIGN KEY (enseignant_id) REFERENCES enseignants(id) ON DELETE CASCADE,
    FOREIGN KEY (school_id) REFERENCES school_info(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    utilisateur_id INTEGER,
    titre TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    lu INTEGER DEFAULT 0,
    lien TEXT,
    date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
    school_id INTEGER,
    FOREIGN KEY(utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    FOREIGN KEY(school_id) REFERENCES school_info(id)
  );
  `);

  // Ensure missing columns exist
  addColumn('utilisateurs', 'license_key', 'TEXT');
  addColumn('school_info', 'kkiapay_public_key', 'TEXT');
  addColumn('school_info', 'kkiapay_secret_key', 'TEXT');
  addColumn('school_info', 'kkiapay_mode', 'TEXT');
  
  addColumn('system_subscriptions', 'nom_fondateur', 'TEXT');
  addColumn('system_subscriptions', 'prenom_fondateur', 'TEXT');
  addColumn('system_subscriptions', 'telephone_fondateur', 'TEXT');
  addColumn('system_subscriptions', 'email_fondateur', 'TEXT');
  addColumn('system_subscriptions', 'date_naissance_fondateur', 'TEXT');
  addColumn('system_subscriptions', 'sexe_fondateur', 'TEXT');
  addColumn('system_subscriptions', 'nom_ecole', 'TEXT');
  addColumn('system_subscriptions', 'slogan_ecole', 'TEXT');
  addColumn('system_subscriptions', 'email_ecole', 'TEXT');
  addColumn('system_subscriptions', 'adresse_ecole', 'TEXT');
  addColumn('system_subscriptions', 'hashed_password', 'TEXT');
  addColumn('system_subscriptions', 'license_key', 'TEXT');

  // Reset database if requested (manual trigger or specific flag)
const RESET_DB = process.env.RESET_DB === 'true';
if (RESET_DB) {
  console.log("Resetting database...");
  db.exec(`
    DELETE FROM timetable_requests;
    DELETE FROM role_permissions;
    DELETE FROM audit_logs;
    DELETE FROM paiements;
    DELETE FROM notes;
    DELETE FROM eleves;
    DELETE FROM emplois_du_temps;
    DELETE FROM devoirs;
    DELETE FROM classe_matieres;
    DELETE FROM classes;
    DELETE FROM activites_scolaires;
    DELETE FROM annees_scolaires;
    DELETE FROM enseignant_matieres;
    DELETE FROM matieres;
    DELETE FROM enseignants;
    DELETE FROM reunions;
    DELETE FROM alertes;
    DELETE FROM utilisateurs;
    DELETE FROM school_info;
  `);
}

// Ensure existing admins are approved and have all permissions
try {
  const allPermissions = JSON.stringify([
    '/', '/classes', '/eleves', '/promotions', '/enseignants', 
    '/matieres', '/notes', '/paiements', '/emploi-du-temps', 
    '/ecole', '/parametres'
  ]);
  db.prepare("UPDATE utilisateurs SET approuve = 1, is_first_login = 0, permissions = ? WHERE role = 'admin'").run(allPermissions);
} catch (e) {}

// Seed default school if none exists
const schoolExists = db.prepare("SELECT * FROM school_info").get();
if (!schoolExists) {
  db.prepare("INSERT INTO school_info (nom) VALUES (?)").run("École par Défaut");
  console.log("Default school seeded.");
}

// Seed Admin if not exists
const adminExists = db.prepare("SELECT * FROM utilisateurs WHERE role = 'admin'").get() as any;
if (!adminExists) {
  const allPermissions = JSON.stringify([
    '/', '/classes', '/eleves', '/promotions', '/enseignants', 
    '/matieres', '/notes', '/paiements', '/emploi-du-temps', 
    '/ecole', '/parametres'
  ]);
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  
  // Get first school ID
  const firstSchool = db.prepare("SELECT id FROM school_info ORDER BY id ASC LIMIT 1").get() as any;
  const schoolId = firstSchool?.id || null;

  db.prepare("INSERT INTO utilisateurs (nom, email, mot_de_passe, role, approuve, is_first_login, permissions, school_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
    "Administrateur",
    "admin@ecole.com",
    hashedPassword,
    "admin",
    1,
    0,
    allPermissions,
    schoolId
  );
  console.log("Admin seeded and approved with all permissions.");
} else {
  // Update existing admin password to hashed if it's still plain text "admin123"
  if (adminExists.mot_de_passe === "admin123") {
    const hashedPassword = bcrypt.hashSync("admin123", 10);
    db.prepare("UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ?").run(hashedPassword, adminExists.id);
    console.log("Existing admin password migrated to hash.");
  }
  
  // Ensure existing admin has a school_id if missing
  if (!adminExists.school_id) {
    const firstSchool = db.prepare("SELECT id FROM school_info ORDER BY id ASC LIMIT 1").get() as any;
    if (firstSchool) {
      db.prepare("UPDATE utilisateurs SET school_id = ? WHERE id = ?").run(firstSchool.id, adminExists.id);
      console.log("Updated existing admin with default school_id.");
    }
  }
  console.log("Admin exists, approved status:", adminExists.approuve);
}

// Seed role permissions if empty
const rolePermsCount = db.prepare("SELECT COUNT(*) as count FROM role_permissions").get() as any;
if (rolePermsCount.count === 0) {
  const allPaths = [
    '/', '/classes', '/eleves', '/promotions', '/enseignants', 
    '/matieres', '/notes', '/paiements', '/emploi-du-temps', 
    '/ecole', '/parametres', '/audit-logs', '/alertes'
  ];

  const defaultPermissions = {
    admin: allPaths.map(path => ({ path, can_write: true })),
    super_admin: allPaths.map(path => ({ path, can_write: true })),
    secretariat: [
      { path: '/', can_write: true },
      { path: '/classes', can_write: true },
      { path: '/eleves', can_write: true },
      { path: '/promotions', can_write: true },
      { path: '/enseignants', can_write: false },
      { path: '/matieres', can_write: false },
      { path: '/notes', can_write: true },
      { path: '/emploi-du-temps', can_write: true },
      { path: '/alertes', can_write: true }
    ],
    enseignant: [
      { path: '/', can_write: false },
      { path: '/eleves', can_write: false },
      { path: '/notes', can_write: true },
      { path: '/emploi-du-temps', can_write: false }
    ],
    comptable: [
      { path: '/', can_write: false },
      { path: '/eleves', can_write: false },
      { path: '/paiements', can_write: true }
    ]
  };

  const schools = db.prepare("SELECT id FROM school_info").all() as any[];
  const insertRolePerm = db.prepare("INSERT INTO role_permissions (role, permissions, school_id) VALUES (?, ?, ?)");
  
  schools.forEach(school => {
    Object.entries(defaultPermissions).forEach(([role, perms]) => {
      insertRolePerm.run(role, JSON.stringify(perms), school.id);
    });
  });
  console.log("Role permissions seeded for all schools.");
}

// Seed current academic year if none
const yearExists = db.prepare("SELECT * FROM annees_scolaires").get();
if (!yearExists) {
  const libelle = getCurrentAcademicYearLibelle();
  const parts = libelle.split('-');
  const start = parts[0];
  const end = parts[1];
  const schools = db.prepare("SELECT id FROM school_info").all() as any[];
  schools.forEach(school => {
    db.prepare("INSERT INTO annees_scolaires (libelle, date_debut, date_fin, est_active, school_id) VALUES (?, ?, ?, ?, ?)")
      .run(libelle, `${start}-09-01`, `${end}-07-31`, 1, school.id);
  });
  console.log("Academic years seeded for all schools.");
}

// Seed some reunions and devoirs for demo
const reunionExists = db.prepare("SELECT * FROM reunions").get();
if (!reunionExists) {
  const schools = db.prepare("SELECT id FROM school_info").all() as any[];
  schools.forEach(school => {
    db.prepare("INSERT INTO reunions (titre, description, date_reunion, heure_reunion, lieu, school_id) VALUES (?, ?, ?, ?, ?, ?)").run(
      "Réunion de rentrée",
      "Présentation du programme annuel aux parents d'élèves.",
      "2024-09-15",
      "10:00",
      "Salle de conférence",
      school.id
    );
  });
}

const devoirExists = db.prepare("SELECT * FROM devoirs").get();
if (!devoirExists) {
  const schools = db.prepare("SELECT id FROM school_info").all() as any[];
  schools.forEach(school => {
    const classe = db.prepare("SELECT id FROM classes WHERE school_id = ? LIMIT 1").get(school.id) as any;
    const matiere = db.prepare("SELECT id FROM matieres WHERE school_id = ? LIMIT 1").get(school.id) as any;
    if (classe && matiere) {
      db.prepare("INSERT INTO devoirs (classe_id, matiere_id, titre, description, date_echeance, school_id) VALUES (?, ?, ?, ?, ?, ?)").run(
        classe.id,
        matiere.id,
        "Devoir de Mathématiques",
        "Exercices sur les fractions et les nombres décimaux.",
        "2024-10-20",
        school.id
      );
    }
  });
}

// Migration for utilisateurs roles constraint and eleve_id column
try {
  const tableSql = (db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='utilisateurs'").get() as any)?.sql || "";
  
  // Also check if eleve_id exists (redundant but safe)
  const tableInfo = db.prepare("PRAGMA table_info(utilisateurs)").all();
  const hasEleveId = tableInfo.some((col: any) => col.name === 'eleve_id');

  if (!tableSql.includes("'parent'") || !hasEleveId) {
    console.log("Updating utilisateurs table schema for 'parent' role and 'eleve_id'...");
    
    db.exec("PRAGMA foreign_keys = OFF;");
    
    db.transaction(() => {
      // 1. Create a new table with the correct schema
      db.prepare(`
        CREATE TABLE utilisateurs_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nom TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          mot_de_passe TEXT NOT NULL,
          role TEXT CHECK(role IN ('super_admin', 'admin', 'secretariat', 'secretaire', 'enseignant', 'comptable', 'parent')) NOT NULL,
          approuve INTEGER DEFAULT 0,
          permissions TEXT,
          otp_code TEXT,
          otp_expiry TEXT,
          license_key TEXT,
          is_first_login INTEGER DEFAULT 1,
          enseignant_id INTEGER,
          eleve_id INTEGER,
          google_id TEXT UNIQUE,
          parent_admin_id INTEGER,
          can_write INTEGER DEFAULT 1,
          last_seen TEXT,
          school_id INTEGER,
          FOREIGN KEY(parent_admin_id) REFERENCES utilisateurs(id),
          FOREIGN KEY(school_id) REFERENCES school_info(id),
          FOREIGN KEY(eleve_id) REFERENCES eleves(id)
        )
      `).run();

      // 2. Copy data from the old table
      const columns = db.prepare("PRAGMA table_info(utilisateurs)").all().map((c: any) => c.name);
      // Only copy columns that exist in the new schema
      const newTableColumns = ["id", "nom", "email", "mot_de_passe", "role", "approuve", "permissions", "otp_code", "otp_expiry", "license_key", "is_first_login", "enseignant_id", "eleve_id", "google_id", "parent_admin_id", "can_write", "last_seen", "school_id"];
      const commonColumns = columns.filter((col: any) => newTableColumns.includes(col));
      
      const colsStr = commonColumns.join(', ');
      db.prepare(`INSERT INTO utilisateurs_new (${colsStr}) SELECT ${colsStr} FROM utilisateurs`).run();

      // 3. Swap tables
      db.prepare("DROP TABLE utilisateurs").run();
      db.prepare("ALTER TABLE utilisateurs_new RENAME TO utilisateurs").run();
    })();
    
    db.exec("PRAGMA foreign_keys = ON;");
    console.log("utilisateurs table schema updated successfully.");
  }
} catch (e) { 
  console.error("Migration for 'parent' role failed:", e);
  db.exec("PRAGMA foreign_keys = ON;");
}

// Handle table upgrades
try {
  db.prepare("ALTER TABLE eleves ADD COLUMN provenance TEXT DEFAULT 'Nouveau'").run();
} catch (e) { /* Column probably already exists */ }

try {
  db.prepare("ALTER TABLE utilisateurs ADD COLUMN eleve_id INTEGER REFERENCES eleves(id)").run();
} catch (e) { /* Column probably already exists */ }
try {
  db.prepare("ALTER TABLE utilisateurs ADD COLUMN license_key TEXT").run();
} catch (e) { /* Column probably already exists */ }
try {
  db.prepare("ALTER TABLE utilisateurs ADD COLUMN reset_token TEXT").run();
} catch (e) { /* Column already exists */ }
try {
  db.prepare("ALTER TABLE utilisateurs ADD COLUMN reset_token_expiry TEXT").run();
} catch (e) { /* Column already exists */ }

// Handle table upgrades
try {
  db.prepare("ALTER TABLE paiements ADD COLUMN methode TEXT DEFAULT 'Espèces'").run();
} catch (e) { /* Column probably already exists */ }
try {
  db.prepare("ALTER TABLE paiements ADD COLUMN status TEXT DEFAULT 'completed'").run();
} catch (e) { /* Column probably already exists */ }
try {
  db.prepare("ALTER TABLE paiements ADD COLUMN reference_transaction TEXT").run();
} catch (e) { /* Column probably already exists */ }

  console.log("Database initialization completed.");
}

/**
 * Helper to generate a subscription PDF buffer
 */
async function generateSubscriptionPDF(data: any, key: string): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 50 });
    let buffers: any[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    // PDF Content
    doc.fillColor("#10b981")
       .fontSize(25)
       .text("FICHE D'ABONNEMENT", { align: 'center' });
    
    doc.moveDown();
    doc.fontSize(10).fillColor("#000")
       .text(`Référence : ${data.reference}`, { align: 'right' })
       .text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, { align: 'right' });
    
    doc.moveDown(2);
    
    // School Section
    doc.fillColor("#10b981").fontSize(14).text("INFORMATIONS DE L'ÉTABLISSEMENT", { underline: true });
    doc.moveDown(0.5);
    doc.fillColor("#000").fontSize(12)
       .text(`Nom : ${data.nom_ecole}`)
       .text(`Slogan : ${data.slogan_ecole || 'N/A'}`)
       .text(`Email : ${data.email_ecole || 'N/A'}`)
       .text(`Adresse : ${data.adresse_ecole || 'N/A'}`);
    
    doc.moveDown(1.5);
    
    // Plan Section
    doc.fillColor("#10b981").fontSize(14).text("DÉTAILS DE L'ABONNEMENT", { underline: true });
    doc.moveDown(0.5);
    doc.fillColor("#000").fontSize(12)
       .text(`Plan choisi : ${data.plan_name}`)
       .text(`Montant payé : ${data.amount} XOF`)
       .text(`Statut : Payé / Activé`);
    
    doc.moveDown(1.5);
    
    // User Section
    doc.fillColor("#10b981").fontSize(14).text("VOS IDENTIFIANTS DE CONNEXION", { underline: true });
    doc.moveDown(0.5);
    doc.fillColor("#000").fontSize(12)
       .text(`Email : ${data.email}`)
       .text(`Rôle : Super Administrateur`)
       .moveDown(0.5)
       .fillColor("#10b981")
       .text(`CLÉ DE CONNEXION UNIQUE : ${key}`, { font: 'Helvetica-Bold' });
    
    doc.moveDown(2);
    doc.fillColor("#666").fontSize(10)
       .text("IMPORTANT : Gardez précieusement cette fiche. Cette clé est nécessaire pour valider votre première connexion sur la plateforme. Elle remplace le code OTP habituel.", { align: 'center', italic: true });
    
    doc.moveDown(3);
    doc.fillColor("#000").fontSize(12).text("L'ÉQUIPE MEGAFIXAEDUC PRO", { align: 'center' });
    
    doc.end();
  });
}

/**
 * Main helper to send subscription confirmation email with PDF
 */
async function sendSubscriptionConfirmation(subData: any, key: string) {
  try {
    const transporter = await createMailTransporter();
    if (!transporter) {
      console.warn("SMTP not configured, skipping subscription email.");
      return;
    }

    const pdfBuffer = await generateSubscriptionPDF(subData, key);
    
    const mailOptions = {
      from: process.env.SMTP_FROM || '"MégafixaEduc" <noreply@megafixa.com>',
      to: subData.email,
      subject: 'Confirmation de votre abonnement - MégafixaEduc Pro',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #10b981; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Bienvenue sur MégafixaEduc Pro !</h1>
          </div>
          <div style="padding: 32px;">
            <p>Bonjour <strong>${subData.prenom_fondateur} ${subData.nom_fondateur}</strong>,</p>
            <p>Félicitations ! Votre établissement <strong>${subData.nom_ecole}</strong> est désormais enregistré sous le plan <strong>${subData.plan_name}</strong>.</p>
            
            <div style="background-color: #f8fafc; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px dashed #cbd5e1; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; letter-spacing: 1px;">Saisissez cette clé lors de votre première connexion :</p>
              <p style="margin: 0; font-size: 32px; font-weight: 900; color: #10b981; letter-spacing: 2px;">${key}</p>
            </div>

            <p>Cette clé remplace le code OTP et est indispensable pour activer votre accès administrateur.</p>
            <p>Vous trouverez en pièce jointe votre <strong>fiche d'abonnement PDF</strong> contenant le récapitulatif de vos informations.</p>
            
            <div style="margin-top: 32px; text-align: center;">
              <a href="${process.env.APP_URL}/login" style="background-color: #0f172a; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Accéder à mon espace</a>
            </div>
          </div>
          <div style="background-color: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 12px;">
            <p style="margin: 0;">© ${new Date().getFullYear()} MégafixaEduc Pro. Tous droits réservés.</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Fiche_Abonnement_${subData.reference}.pdf`,
          content: pdfBuffer
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.log(`Confirmation email sent to ${subData.email} with key ${key}`);
  } catch (error) {
    console.error("Failed to send subscription confirmation email:", error);
  }
}
async function createMailTransporter() {
  // Use static import if possible, but keep compatibility
  // const nodemailer = await import('nodemailer');
  
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

  // Helper to calculate annual average for a student
  function calculateAnnualAverage(eleveId: number, anneeId: number, classeId: number, schoolId: number) {
    const notes = db.prepare("SELECT * FROM notes WHERE eleve_id = ? AND annee_id = ? AND school_id = ?").all(eleveId, anneeId, schoolId) as any[];
    const matieres = db.prepare(`
      SELECT m.*, cm.coefficient 
      FROM matieres m 
      JOIN classe_matieres cm ON m.id = cm.matiere_id 
      WHERE cm.classe_id = ? AND m.school_id = ?
    `).all(classeId, schoolId) as any[];

    const calculateTrimesterAverage = (trimestre: number) => {
      const trimesterNotes = notes.filter(n => n.trimestre === trimestre);
      if (trimesterNotes.length === 0) return { average: 0, hasData: false };

      const subjectResults = matieres.map(m => {
        const subjectNotes = trimesterNotes.filter(n => n.matiere_id === m.id);
        const interrogations = subjectNotes.filter(n => n.type_evaluation.startsWith('I')).map(n => n.note);
        const dev1 = subjectNotes.find(n => n.type_evaluation === 'Dev1')?.note;
        const dev2 = subjectNotes.find(n => n.type_evaluation === 'Dev2')?.note;

        let avgInter = 0;
        let hasInter = false;
        if (interrogations.length > 0) {
          avgInter = interrogations.reduce((a, b) => a + b, 0) / interrogations.length;
          hasInter = true;
        }

        let moyMatiere = 0;
        let count = 0;
        let hasSubjectData = false;
        if (hasInter) { moyMatiere += avgInter; count++; hasSubjectData = true; }
        if (dev1 !== undefined && dev1 !== null) { moyMatiere += dev1; count++; hasSubjectData = true; }
        if (dev2 !== undefined && dev2 !== null) { moyMatiere += dev2; count++; hasSubjectData = true; }

        return {
          id: m.id,
          parent_id: m.parent_id,
          coefficient: m.coefficient || 1,
          moyenne: count > 0 ? moyMatiere / count : null,
          hasData: hasSubjectData
        };
      });

      // Handle hierarchical subjects (parents get average of children)
      const finalSubjectAverages = subjectResults.map(s => {
        const children = subjectResults.filter(child => child.parent_id === s.id);
        if (children.length > 0) {
          const validChildren = children.filter(c => c.hasData);
          if (validChildren.length > 0) {
            const avgChildren = validChildren.reduce((acc, c) => acc + (c.moyenne || 0), 0) / validChildren.length;
            return { ...s, moyenne: avgChildren, hasData: true };
          }
        }
        return s;
      });

      // Only top-level subjects (no parent in the class) contribute to the global average
      const topLevelSubjects = finalSubjectAverages.filter(s => {
        const hasParentInClass = matieres.some(m => m.id === s.parent_id);
        return !hasParentInClass && s.hasData;
      });

      const totalWeighted = topLevelSubjects.reduce((acc, curr) => acc + ((curr.moyenne || 0) * curr.coefficient), 0);
      const totalCoeff = topLevelSubjects.reduce((acc, curr) => acc + curr.coefficient, 0);

      return {
        average: totalCoeff > 0 ? totalWeighted / totalCoeff : 0,
        hasData: totalCoeff > 0
      };
    };

  const t1 = calculateTrimesterAverage(1);
  const t2 = calculateTrimesterAverage(2);
  const t3 = calculateTrimesterAverage(3);

  const averages = [t1, t2, t3].filter(t => t.hasData).map(t => t.average);
  const annualMoy = averages.length > 0 ? averages.reduce((a, b) => a + b, 0) / averages.length : 0;

  return parseFloat(annualMoy.toFixed(2));
}

async function startServer() {
  console.log("Starting server implementation...");
  
  // Database Initialization
  try {
    await initializeDatabase();
  } catch (e) {
    console.error("Database initialization failed:", e);
  }

  const app = express();
  
  // Security headers
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled to allow Vite and external logos for now, can be hardened later
    crossOriginEmbedderPolicy: false,
  }));

  app.use(cors());
  app.use(express.json({ limit: '5mb' })); // Reduced limit for better security
  app.use(express.urlencoded({ limit: '5mb', extended: true }));

  // General rate limiter
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 1000, 
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: "Trop de requêtes, veuillez réessayer plus tard." }
  });
  app.use("/api/", generalLimiter);

  // Stricter rate limiter for auth (brute force protection)
  const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: "Trop de tentatives de connexion, veuillez réessayer dans une heure." }
  });
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/verify-otp", authLimiter);

  // Debug middleware for all requests
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

// Middleware to verify JWT
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Token manquant" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(401).json({ error: "Token invalide ou session expirée" });
    
    // Check for inactivity (30 minutes)
    const now = new Date();
    const lastSeen = user.lastSeen ? new Date(user.lastSeen) : null;
    if (lastSeen && (now.getTime() - lastSeen.getTime() > 30 * 60 * 1000)) {
      return res.status(401).json({ error: "Session expirée pour inactivité" });
    }

    req.user = user;
    req.userId = user.id;
    
    // Fallback if schoolId is missing from token
    const dbUser = db.prepare("SELECT id, school_id FROM utilisateurs WHERE id = ?").get(user.id) as any;
    if (!dbUser) {
      return res.status(401).json({ error: "Utilisateur non trouvé en base de données" });
    }

    if (!user.schoolId) {
      req.schoolId = dbUser.school_id ?? null;
    } else {
      req.schoolId = user.schoolId;
    }
    
    next();
  });
};

// Middleware to require specific roles
const requireRole = (roles: string[]) => (req: any, res: any, next: any) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: `Accès refusé. Un rôle parmi [${roles.join(', ')}] est requis.` });
  }
  next();
};

  app.use((req, res, next) => {
    // Try to get user from JWT first
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        (req as any).user = decoded;
        (req as any).userId = decoded.id;
        
        // Populate schoolId with fallback
        if (decoded.schoolId) {
          (req as any).schoolId = decoded.schoolId;
        } else {
          const dbUser = db.prepare("SELECT school_id FROM utilisateurs WHERE id = ?").get(decoded.id) as any;
          (req as any).schoolId = dbUser?.school_id ?? null;
        }
        
        // Update last_seen
        db.prepare("UPDATE utilisateurs SET last_seen = ? WHERE id = ?").run(new Date().toISOString(), decoded.id);
      } catch (e) {
        // Token invalid, but we might still have x-user-id for legacy
      }
    }

    // Fallback to x-user-id for legacy or specific cases
    const userId = req.headers['x-user-id'];
    if (userId && !(req as any).userId) {
      const id = parseInt(userId as string);
      (req as any).userId = id;
      
      // Populate schoolId
      const dbUser = db.prepare("SELECT school_id FROM utilisateurs WHERE id = ?").get(id) as any;
      (req as any).schoolId = dbUser?.school_id ?? null;
      // Update last_seen
      try {
        db.prepare("UPDATE utilisateurs SET last_seen = ? WHERE id = ?").run(new Date().toISOString(), id);
      } catch (e) {}
    }
    next();
  });

  // Email Sending
  app.post("/api/send-email", async (req, res) => {
    const { recipients, subject, body } = req.body;
    
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: "Aucun destinataire spécifié" });
    }

    try {
      const transporter = await createMailTransporter();

      if (!transporter) {
        console.log("Email simulation (missing SMTP credentials):");
        console.log("To:", recipients.join(", "));
        console.log("Subject:", subject);
        console.log("Body:", body);
        return res.json({ 
          success: true, 
          simulated: true, 
          message: "Email simulé car les identifiants SMTP ne sont pas configurés dans .env" 
        });
      }

      await transporter.sendMail({
        from: `"${process.env.SCHOOL_NAME || 'MégafixaEduc'}" <${process.env.SMTP_USER}>`,
        to: recipients.join(", "),
        subject: subject,
        text: body,
        html: body.replace(/\n/g, '<br>'),
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error sending email:", error);
      let errorMessage = error.message;
      if (errorMessage.includes('535-5.7.8')) {
        errorMessage = "Erreur d'authentification SMTP : Identifiants incorrects ou mot de passe d'application requis. Vérifiez vos paramètres SMTP dans AI Studio.";
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  const PORT = 3000;

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/stats", authenticateToken, (req: any, res) => {
    const yearId = getActiveYearId(req.schoolId);
    const elevesCount = db.prepare("SELECT COUNT(*) as count FROM eleves e JOIN classes c ON e.classe_id = c.id WHERE c.annee_id = ? AND e.school_id = ?").get(yearId, req.schoolId).count;
    const enseignantsCount = db.prepare("SELECT COUNT(*) as count FROM enseignants WHERE school_id = ?").get(req.schoolId).count;
    const classesCount = db.prepare("SELECT COUNT(*) as count FROM classes WHERE annee_id = ? AND school_id = ?").get(yearId, req.schoolId).count;
    
    // Revenue statistics (validated payments only)
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Start of week (Monday)
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff)).toISOString().split('T')[0];
    
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    
    const dailyRevenue = db.prepare(`
      SELECT SUM(montant) as total FROM paiements 
      WHERE date_paiement = ? AND school_id = ? AND (status = 'Terminé' OR status = 'completed')
    `).get(today, req.schoolId).total || 0;

    const weeklyRevenue = db.prepare(`
      SELECT SUM(montant) as total FROM paiements 
      WHERE date_paiement >= ? AND school_id = ? AND (status = 'Terminé' OR status = 'completed')
    `).get(startOfWeek, req.schoolId).total || 0;

    const monthlyRevenue = db.prepare(`
      SELECT SUM(montant) as total FROM paiements 
      WHERE annee_id = ? AND date_paiement >= ? AND date_paiement <= ? AND school_id = ?
      AND (status = 'Terminé' OR status = 'completed')
    `).get(yearId, firstDayOfMonth, lastDayOfMonth, req.schoolId).total || 0;

    const totalRevenue = db.prepare(`
      SELECT SUM(montant) as total FROM paiements 
      WHERE annee_id = ? AND school_id = ? AND (status = 'Terminé' OR status = 'completed')
    `).get(yearId, req.schoolId).total || 0;

    const recentPaiements = db.prepare(`
      SELECT p.*, e.nom, e.prenom 
      FROM paiements p 
      JOIN eleves e ON p.eleve_id = e.id 
      WHERE p.annee_id = ? AND p.school_id = ?
      AND (p.status = 'Terminé' OR p.status = 'completed')
      ORDER BY date_paiement DESC LIMIT 5
    `).all(yearId, req.schoolId);

    // Registration Stats (New vs Old)
    const registrationStats = db.prepare(`
      SELECT provenance, COUNT(*) as count 
      FROM eleves e
      JOIN classes c ON e.classe_id = c.id
      WHERE c.annee_id = ? AND e.school_id = ?
      GROUP BY provenance
    `).all(yearId, req.schoolId);

    const inscriptionsByClass = db.prepare(`
      SELECT c.nom as classe_nom, 
             SUM(CASE WHEN e.provenance = 'Nouveau' THEN 1 ELSE 0 END) as nouveaux,
             SUM(CASE WHEN e.provenance = 'Ancien' THEN 1 ELSE 0 END) as anciens
      FROM classes c
      LEFT JOIN eleves e ON c.id = e.classe_id AND e.school_id = ?
      WHERE c.annee_id = ? AND c.school_id = ?
      GROUP BY c.id, c.nom
    `).all(req.schoolId, yearId, req.schoolId);
    
    res.json({ 
      elevesCount, 
      enseignantsCount, 
      classesCount, 
      recentPaiements, 
      dailyRevenue,
      weeklyRevenue,
      monthlyRevenue,
      totalRevenue,
      registrationStats,
      inscriptionsByClass
    });
  });

  app.get("/api/stats/chart", authenticateToken, (req: any, res) => {
    const yearId = getActiveYearId(req.schoolId);
    if (!yearId) return res.json([]);

    const year = db.prepare("SELECT date_debut, date_fin FROM annees_scolaires WHERE id = ?").get(yearId) as any;
    if (!year) return res.json([]);

    const startDate = new Date(year.date_debut || new Date().getFullYear() + '-09-01');
    const endDate = new Date(year.date_fin || (new Date().getFullYear() + 1) + '-07-31');

    const months: any[] = [];
    let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    while (current <= end) {
      const monthStr = current.toLocaleString('fr-FR', { month: 'short' });
      const yearMonth = current.toISOString().slice(0, 7); // YYYY-MM

      const total = db.prepare(`
        SELECT SUM(montant) as total 
        FROM paiements 
        WHERE annee_id = ? AND date_paiement LIKE ? AND school_id = ?
        AND (status = 'Terminé' OR status = 'completed')
      `).get(yearId, `${yearMonth}%`, req.schoolId).total || 0;

      months.push({ name: monthStr, paiements: total });
      current.setMonth(current.getMonth() + 1);
    }

    res.json(months);
  });

  // Database Export
  app.get("/api/db/export", authenticateToken, requireRole(['admin', 'super_admin']), (req: any, res) => {
    try {
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as any[];
      let sqlDump = "-- MégafixaEduc Pro Database Export (Filtered by School)\n";
      sqlDump += `-- Generated on ${new Date().toISOString()}\n`;
      sqlDump += `-- School ID: ${req.schoolId}\n\n`;
      sqlDump += "PRAGMA foreign_keys=OFF;\n";
      sqlDump += "BEGIN TRANSACTION;\n\n";

      for (const table of tables) {
        const tableName = table.name;
        
        // Get table creation SQL
        const createSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name = ?").get(tableName) as any;
        sqlDump += `DROP TABLE IF EXISTS ${tableName};\n`;
        sqlDump += `${createSql.sql};\n\n`;

        // Get table data - Filter by school_id if the column exists
        const columnsInfo = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
        const hasSchoolId = columnsInfo.some(col => col.name === 'school_id');
        
        let rows;
        if (hasSchoolId) {
          rows = db.prepare(`SELECT * FROM ${tableName} WHERE school_id = ?`).all(req.schoolId);
        } else if (tableName === 'school_info') {
          rows = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).all(req.schoolId);
        } else {
          // For tables without school_id (like sqlite_sequence), we might not want to export them or export all
          // For now, let's skip them or export all if they are metadata
          rows = db.prepare(`SELECT * FROM ${tableName}`).all();
        }

        for (const row of rows) {
          const columns = Object.keys(row as any);
          const values = columns.map(col => {
            const val = (row as any)[col];
            if (val === null) return "NULL";
            if (typeof val === "string") return `'${val.replace(/'/g, "''")}'`;
            return val;
          });
          sqlDump += `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${values.join(", ")});\n`;
        }
        sqlDump += "\n";
      }

      sqlDump += "COMMIT;\n";
      sqlDump += "PRAGMA foreign_keys=ON;\n";

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename=megafixa_school_${req.schoolId}_backup.sql`);
      res.send(sqlDump);
    } catch (error: any) {
      console.error("Export error:", error);
      res.status(500).json({ error: "Erreur lors de l'exportation de la base de données" });
    }
  });

  // Public school info for theme
  app.get("/api/public/school-info", (req, res) => {
    const school = db.prepare("SELECT nom, slogan, logo, couleur_primaire, police, taille_police FROM school_info ORDER BY id ASC LIMIT 1").get() as any;
    res.json(school || {});
  });

  // School Info
  app.get("/api/school-info", authenticateToken, requireRole(['admin', 'super_admin', 'secretariat', 'secretaire', 'comptable']), (req: any, res) => {
    if (req.schoolId) {
      const school = db.prepare("SELECT * FROM school_info WHERE id = ?").get(req.schoolId) as any;
      const activeYearId = getActiveYearId(req.schoolId);
      const activeYear = db.prepare("SELECT libelle FROM annees_scolaires WHERE id = ?").get(activeYearId) as any;
      res.json({ 
        ...school, 
        active_year_id: activeYearId,
        annee_active: activeYear?.libelle || 'N/A'
      });
    } else {
      res.status(400).json({ error: "ID de l'école manquant" });
    }
  });

  // DB Health
  app.get("/api/db/health", authenticateToken, requireRole(['admin', 'super_admin']), (req: any, res) => {
    try {
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      const stats = {
        tables: tables.length,
        eleves: db.prepare("SELECT COUNT(*) as count FROM eleves WHERE school_id = ?").get(req.schoolId).count,
        classes: db.prepare("SELECT COUNT(*) as count FROM classes WHERE school_id = ?").get(req.schoolId).count,
        notes: db.prepare("SELECT COUNT(*) as count FROM notes WHERE school_id = ?").get(req.schoolId).count,
        paiements: db.prepare("SELECT COUNT(*) as count FROM paiements WHERE school_id = ?").get(req.schoolId).count,
        size: "N/A"
      };
      res.json({ status: "healthy", stats });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.put("/api/school-info", authenticateToken, requireRole(['admin', 'super_admin']), (req: any, res) => {
    try {
      const { 
        nom, slogan, adresse, telephone, email, site_web, numero_enregistrement, pays, devise, 
        logo, langue, couleur_primaire, police, taille_police,
        fedapay_public_key, fedapay_secret_key, fedapay_mode,
        kkiapay_public_key, kkiapay_secret_key, kkiapay_mode
      } = req.body;
      
      if (!nom) {
        return res.status(400).json({ success: false, error: "Le nom de l'école est requis" });
      }

      if (!req.schoolId) {
        return res.status(400).json({ success: false, error: "ID de l'école manquant dans la session" });
      }

      const result = db.prepare(`
        UPDATE school_info 
        SET nom = ?, slogan = ?, adresse = ?, telephone = ?, email = ?, site_web = ?, 
            numero_enregistrement = ?, pays = ?, devise = ?, logo = ?, langue = ?, 
            couleur_primaire = ?, police = ?, taille_police = ?,
            fedapay_public_key = ?, fedapay_secret_key = ?, fedapay_mode = ?,
            kkiapay_public_key = ?, kkiapay_secret_key = ?, kkiapay_mode = ?
        WHERE id = ?
      `).run(
        nom, slogan, adresse, telephone, email, site_web, numero_enregistrement, pays, devise, 
        logo, langue, couleur_primaire, police, taille_police,
        fedapay_public_key, fedapay_secret_key, fedapay_mode,
        kkiapay_public_key, kkiapay_secret_key, kkiapay_mode,
        req.schoolId
      );
      
      if (result.changes === 0) {
        return res.status(404).json({ success: false, error: "École non trouvée" });
      }

      logActivity(req.userId, 'UPDATE', 'SCHOOL_INFO', req.schoolId, { nom }, req.schoolId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating school info:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Classes
  app.get("/api/classes", authenticateToken, requireRole(['admin', 'super_admin', 'secretariat', 'secretaire', 'enseignant', 'comptable']), (req: any, res) => {
    const yearId = getActiveYearId(req.schoolId);
    if (!yearId) return res.json([]);
    res.json(db.prepare(`
      SELECT c.*, (SELECT COUNT(*) FROM eleves e WHERE e.classe_id = c.id AND e.school_id = ?) as nombre_eleves
      FROM classes c 
      WHERE c.annee_id = ? AND c.school_id = ?
      ORDER BY c.nom
    `).all(req.schoolId, yearId, req.schoolId));
  });

  app.post("/api/classes", authenticateToken, requireRole(['admin', 'super_admin']), (req: any, res) => {
    console.log("POST /api/classes request received", req.body);
    try {
      const yearId = getActiveYearId(req.schoolId);
      if (!yearId) {
        return res.status(400).json({ error: "Aucune année scolaire active trouvée. Veuillez en créer une dans les paramètres." });
      }
      const { nom, niveau, frais_scolarite, frais_inscription, devise, tranche1_montant, tranche1_date_limite, tranche2_montant, tranche2_date_limite, tranche3_montant, tranche3_date_limite } = req.body;
      const result = db.prepare(`
        INSERT INTO classes (
          nom, niveau, frais_scolarite, frais_inscription, devise, annee_id,
          tranche1_montant, tranche1_date_limite, tranche2_montant, tranche2_date_limite, tranche3_montant, tranche3_date_limite, school_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        nom, niveau, frais_scolarite || 0, frais_inscription || 0, devise || 'FCFA', yearId,
        tranche1_montant || 0, tranche1_date_limite || null,
        tranche2_montant || 0, tranche2_date_limite || null,
        tranche3_montant || 0, tranche3_date_limite || null,
        req.schoolId
      );
      const classeId = result.lastInsertRowid;
      logActivity(req.userId, 'CREATE', 'CLASSE', classeId as number, { nom, niveau }, req.schoolId);
      res.json({ id: classeId });
    } catch (error: any) {
      console.error("Error creating class:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/classes/:id", authenticateToken, requireRole(['admin', 'super_admin']), (req: any, res) => {
    try {
      const { id } = req.params;
      const { nom, niveau, frais_scolarite, frais_inscription, devise, tranche1_montant, tranche1_date_limite, tranche2_montant, tranche2_date_limite, tranche3_montant, tranche3_date_limite } = req.body;
      db.prepare(`
        UPDATE classes SET 
          nom = ?, niveau = ?, frais_scolarite = ?, frais_inscription = ?, devise = ?,
          tranche1_montant = ?, tranche1_date_limite = ?,
          tranche2_montant = ?, tranche2_date_limite = ?,
          tranche3_montant = ?, tranche3_date_limite = ?
        WHERE id = ? AND school_id = ?
      `).run(
        nom, niveau, frais_scolarite || 0, frais_inscription || 0, devise || 'FCFA',
        tranche1_montant || 0, tranche1_date_limite || null,
        tranche2_montant || 0, tranche2_date_limite || null,
        tranche3_montant || 0, tranche3_date_limite || null,
        id,
        req.schoolId
      );
      logActivity(req.userId, 'UPDATE', 'CLASSE', parseInt(id), { nom, niveau }, req.schoolId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating class:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/classes/:id/details", authenticateToken, (req: any, res) => {
    const { id } = req.params;
    const yearId = getActiveYearId(req.schoolId);

    const eleves = db.prepare("SELECT * FROM eleves WHERE classe_id = ? AND school_id = ? ORDER BY nom, prenom").all(id, req.schoolId);
    
    const matieres = db.prepare(`
      SELECT cm.*, m.nom as matiere_nom, m.categorie, m.parent_id, e.nom as enseignant_nom, e.prenom as enseignant_prenom
      FROM classe_matieres cm
      JOIN matieres m ON cm.matiere_id = m.id
      LEFT JOIN enseignants e ON cm.enseignant_id = e.id
      WHERE cm.classe_id = ? AND cm.school_id = ?
      ORDER BY m.nom
    `).all(id, req.schoolId);

    const notes = db.prepare(`
      SELECT n.*, m.nom as matiere_nom
      FROM notes n
      JOIN matieres m ON n.matiere_id = m.id
      JOIN eleves e ON n.eleve_id = e.id
      WHERE e.classe_id = ? AND n.annee_id = ? AND n.school_id = ?
    `).all(id, yearId, req.schoolId);

    res.json({ eleves, matieres, notes });
  });

  app.post("/api/classes/:id/matieres", authenticateToken, requireRole(['admin', 'super_admin']), (req: any, res) => {
    const { id } = req.params;
    const { assignments } = req.body;
    
    try {
      if (assignments && Array.isArray(assignments)) {
        const stmt = db.prepare("INSERT OR REPLACE INTO classe_matieres (classe_id, matiere_id, enseignant_id, heures_hebdo, coefficient, school_id) VALUES (?, ?, ?, ?, ?, ?)");
        const insertMany = db.transaction((list) => {
          for (const a of list) {
            stmt.run(id, a.matiere_id, a.enseignant_id || null, a.heures_hebdo || 0, a.coefficient || 1, req.schoolId);
          }
        });
        insertMany(assignments);
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error batch assigning matieres:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/classes/:id/matieres/:matiereId", authenticateToken, requireRole(['admin', 'super_admin']), (req: any, res) => {
    const { id, matiereId } = req.params;
    const { enseignant_id, heures_hebdo, coefficient } = req.body;
    
    // Convert empty string/zero to null to avoid FK constraint error
    const teacherId = (enseignant_id === "" || enseignant_id === 0 || enseignant_id === "0") ? null : enseignant_id;
    
    try {
      db.prepare("UPDATE classe_matieres SET enseignant_id = ?, heures_hebdo = ?, coefficient = ? WHERE classe_id = ? AND matiere_id = ? AND school_id = ?")
        .run(teacherId, heures_hebdo || 0, coefficient || 1, id, matiereId, req.schoolId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating class matiere:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/classes/:id/matieres/:matiereId", authenticateToken, requireRole(['admin', 'super_admin']), (req: any, res) => {
    const { id, matiereId } = req.params;
    db.prepare("DELETE FROM classe_matieres WHERE classe_id = ? AND matiere_id = ? AND school_id = ?").run(id, matiereId, req.schoolId);
    res.json({ success: true });
  });

  app.get("/api/eleves/:id/parent-account", authenticateToken, (req: any, res) => {
    try {
      const account = db.prepare("SELECT email FROM utilisateurs WHERE eleve_id = ? AND role = 'parent'").get(req.params.id) as any;
      res.json({ identifier: account?.email || null });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Eleves
  app.post("/api/eleves/generate-accounts", authenticateToken, requireRole(['admin', 'super_admin']), (req: any, res) => {
    const { studentIds } = req.body;
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: "Aucun élève sélectionné" });
    }

    try {
      // DEBUG: Check table info
      const tableInfo = db.prepare("PRAGMA table_info(utilisateurs)").all();
      const hasEleveId = tableInfo.some((col: any) => col.name === 'eleve_id');
      if (!hasEleveId) {
        try {
          db.prepare("ALTER TABLE utilisateurs ADD COLUMN eleve_id INTEGER REFERENCES eleves(id)").run();
        } catch(e) { /* ignore */ }
      }

      const school = db.prepare("SELECT nom FROM school_info WHERE id = ?").get(req.schoolId) as any;
      const schoolName = (school?.nom || "Ecole").replace(/\s+/g, "");
      
      const results: any[] = [];
      const errors: any[] = [];

      const insertUser = db.prepare(`
        INSERT INTO utilisateurs (nom, email, mot_de_passe, role, approuve, is_first_login, permissions, school_id, eleve_id, can_write)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const id of studentIds) {
        // Robust lookup: sometimes school_id is null on initial import
        const student = db.prepare("SELECT * FROM eleves WHERE id = ? AND (school_id = ? OR school_id IS NULL)").get(id, req.schoolId) as any;
        if (!student) {
          errors.push({ student: `ID:${id}`, error: "Élève non trouvé" });
          continue;
        }

        // identifier format: Nom&prénoms_élève@nom_école
        const safeNom = (student.nom || "").replace(/\s+/g, '');
        const safePrenom = (student.prenom || "").replace(/\s+/g, '');
        const identifier = `${safeNom}&${safePrenom}_${student.id}@${schoolName}`;
        
        // Generate a random 8-character password
        const password = Math.random().toString(36).slice(-2) + Math.floor(100000 + Math.random() * 900000).toString();
        const hashedPassword = bcrypt.hashSync(password, 10);

        try {
          // Check if account already exists for this student
          const existing = db.prepare("SELECT id FROM utilisateurs WHERE eleve_id = ?").get(student.id);
          if (existing) {
            errors.push({ student: `${student.nom} ${student.prenom}`, error: "Compte déjà existant" });
            continue;
          }

          insertUser.run(
            `${student.nom} ${student.prenom}`,
            identifier,
            hashedPassword,
            'parent',
            1, // auto approve
            0, // not first login
            JSON.stringify(['/notes', '/mon-enfant']), // matching the new route
            req.schoolId,
            student.id,
            0 // cannot write
          );

          results.push({
            student: `${student.nom} ${student.prenom}`,
            identifier,
            password
          });
        } catch (err: any) {
          errors.push({ student: `${student.nom} ${student.prenom}`, error: err.message });
        }
      }

      res.json({ success: true, results, errors });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/eleves", authenticateToken, requireRole(['admin', 'super_admin', 'secretariat', 'secretaire', 'enseignant', 'comptable']), (req: any, res) => {
    const yearId = getActiveYearId(req.schoolId);
    res.json(db.prepare(`
      SELECT 
        e.*, 
        c.nom as classe_nom, 
        c.frais_scolarite,
        c.frais_inscription,
        c.tranche1_montant,
        c.tranche1_date_limite,
        c.tranche2_montant,
        c.tranche2_date_limite,
        c.tranche3_montant,
        c.tranche3_date_limite,
        c.devise,
        IFNULL((SELECT SUM(montant) FROM paiements p WHERE p.eleve_id = e.id AND p.annee_id = ? AND p.type_paiement = 'Frais de scolarité' AND p.school_id = ? AND (p.status = 'Terminé' OR p.status = 'completed')), 0) as total_paye_scolarite,
        IFNULL((SELECT SUM(montant) FROM paiements p WHERE p.eleve_id = e.id AND p.annee_id = ? AND p.type_paiement = 'Frais d''inscription' AND p.school_id = ? AND (p.status = 'Terminé' OR p.status = 'completed')), 0) as total_paye_inscription,
        IFNULL((SELECT SUM(montant) FROM paiements p WHERE p.eleve_id = e.id AND p.annee_id = ? AND p.school_id = ? AND (p.status = 'Terminé' OR p.status = 'completed')), 0) as total_paye
      FROM eleves e 
      JOIN classes c ON e.classe_id = c.id 
      WHERE c.annee_id = ? AND e.school_id = ?
      ORDER BY e.nom, e.prenom
    `).all(yearId, req.schoolId, yearId, req.schoolId, yearId, req.schoolId, yearId, req.schoolId));
  });

  app.get("/api/parent/child-data", authenticateToken, (req: any, res) => {
    // We allow parents to fetch their own child's data
    // Also allow admins for testing or support
    const isParent = req.user.role === 'parent';
    const eleveId = isParent ? req.user.eleve_id : req.query.eleveId;

    if (!eleveId) {
      return res.status(400).json({ error: "ID de l'élève manquant" });
    }

    try {
      const student = db.prepare(`
        SELECT 
          e.*, 
          c.nom as classe_nom, 
          c.niveau, 
          c.frais_scolarite, 
          c.frais_inscription,
          c.tranche1_montant,
          c.tranche1_date_limite,
          c.tranche2_montant,
          c.tranche3_montant,
          c.devise,
          si.nom as school_name, 
          si.logo as school_logo,
          si.fedapay_public_key,
          si.kkiapay_public_key,
          si.kkiapay_mode
        FROM eleves e
        JOIN classes c ON e.classe_id = c.id
        JOIN school_info si ON e.school_id = si.id
        WHERE e.id = ?
      `).get(eleveId) as any;

      if (!student) return res.status(404).json({ error: "Élève non trouvé" });
      
      // If parent, check ownership
      if (isParent && student.id !== req.user.eleve_id) {
        return res.status(403).json({ error: "Accès non autorisé à cet élève" });
      }

      const yearId = getActiveYearId(student.school_id);
      
      const notes = db.prepare(`
        SELECT n.*, m.nom as matiere_nom, m.coefficient
        FROM notes n
        JOIN matieres m ON n.matiere_id = m.id
        WHERE n.eleve_id = ? AND n.annee_id = ?
      `).all(eleveId, yearId);

      const payments = db.prepare(`
        SELECT * FROM paiements 
        WHERE eleve_id = ? AND annee_id = ?
        ORDER BY date_paiement DESC
      `).all(eleveId, yearId);

      res.json({ student, notes, payments });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/eleves", authenticateToken, requireRole(['admin', 'super_admin', 'secretariat', 'secretaire']), (req: any, res) => {
    const { matricule, nom, prenom, sexe, date_naissance, photo, classe_id, nom_parent, tel_parent, email_parent, adresse, statut, provenance } = req.body;
    const result = db.prepare("INSERT INTO eleves (matricule, nom, prenom, sexe, date_naissance, photo, classe_id, nom_parent, tel_parent, email_parent, adresse, statut, provenance, school_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
      matricule, nom, prenom, sexe, date_naissance, photo, classe_id, nom_parent, tel_parent, email_parent, adresse, statut || 'Passant', provenance || 'Nouveau', req.schoolId
    );
    const eleveId = result.lastInsertRowid;
    logActivity(req.userId, 'CREATE', 'ELEVE', eleveId as number, { nom, prenom, matricule }, req.schoolId);
    res.json({ id: eleveId });
  });

  app.put("/api/eleves/:id", authenticateToken, requireRole(['admin', 'super_admin', 'secretariat', 'secretaire']), (req: any, res) => {
    const { id } = req.params;
    const { matricule, nom, prenom, sexe, date_naissance, photo, classe_id, nom_parent, tel_parent, email_parent, adresse, statut, provenance } = req.body;
    db.prepare(`
      UPDATE eleves 
      SET matricule = ?, nom = ?, prenom = ?, sexe = ?, date_naissance = ?, photo = ?, classe_id = ?, nom_parent = ?, tel_parent = ?, email_parent = ?, adresse = ?, statut = ?, provenance = ?
      WHERE id = ? AND school_id = ?
    `).run(matricule, nom, prenom, sexe, date_naissance, photo, classe_id, nom_parent, tel_parent, email_parent, adresse, statut || 'Passant', provenance || 'Nouveau', id, req.schoolId);
    logActivity(req.userId, 'UPDATE', 'ELEVE', parseInt(id), { nom, prenom, matricule }, req.schoolId);
    res.json({ success: true });
  });

  app.delete("/api/eleves/:id", authenticateToken, requireRole(['admin', 'super_admin']), (req: any, res) => {
    const { id } = req.params;
    const eleve = db.prepare("SELECT nom, prenom, matricule FROM eleves WHERE id = ? AND school_id = ?").get(id, req.schoolId) as any;
    
    if (!eleve) return res.status(404).json({ error: "Élève non trouvé" });

    // Delete related records first to avoid foreign key constraints
    db.prepare("DELETE FROM notes WHERE eleve_id = ? AND school_id = ?").run(id, req.schoolId);
    db.prepare("DELETE FROM paiements WHERE eleve_id = ? AND school_id = ?").run(id, req.schoolId);
    
    db.prepare("DELETE FROM eleves WHERE id = ? AND school_id = ?").run(id, req.schoolId);
    logActivity(req.userId, 'DELETE', 'ELEVE', parseInt(id), { nom: eleve.nom, prenom: eleve.prenom, matricule: eleve.matricule }, req.schoolId);
    res.json({ success: true });
  });

  // Promotions
  app.get("/api/eleves/by-year/:yearId", authenticateToken, (req: any, res) => {
    const { yearId } = req.params;
    const eleves = db.prepare(`
      SELECT 
        e.*, 
        c.nom as classe_nom, 
        c.id as classe_id
      FROM eleves e 
      JOIN classes c ON e.classe_id = c.id 
      WHERE c.annee_id = ? AND e.school_id = ?
      ORDER BY e.nom, e.prenom
    `).all(yearId, req.schoolId) as any[];

    const result = eleves.map(e => ({
      ...e,
      moyenne: calculateAnnualAverage(e.id, parseInt(yearId), e.classe_id, req.schoolId)
    }));

    res.json(result);
  });

  app.post("/api/promotions", authenticateToken, requireRole(['admin', 'super_admin']), (req: any, res) => {
    const { eleve_ids, target_classe_id } = req.body;
    if (!eleve_ids || !target_classe_id) {
      return res.status(400).json({ error: "Données manquantes" });
    }
    
    const stmt = db.prepare("UPDATE eleves SET classe_id = ? WHERE id = ? AND school_id = ?");
    const updateMany = db.transaction((ids, classeId, schoolId) => {
      for (const id of ids) {
        stmt.run(classeId, id, schoolId);
      }
      return ids.length;
    });

    const count = updateMany(eleve_ids, target_classe_id, req.schoolId);
    res.json({ success: true, count });
  });

  app.get("/api/promotions/automatique/preview", authenticateToken, (req: any, res) => {
    const { source_year_id, target_year_id } = req.query;
    if (!source_year_id || !target_year_id) {
      return res.status(400).json({ error: "Données manquantes" });
    }

    const sourceClasses = db.prepare("SELECT * FROM classes WHERE annee_id = ? AND school_id = ?").all(source_year_id, req.schoolId);
    const targetClasses = db.prepare("SELECT * FROM classes WHERE annee_id = ? AND school_id = ?").all(target_year_id, req.schoolId);

    const sequence = [
      'Petite Section', 'Moyenne Section', 'Grande Section',
      'CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2',
      '6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Tle'
    ];

    const suggestions: any[] = [];

    for (const sourceClasse of sourceClasses as any) {
      // Find next level
      let nextLevel = null;
      const currentIndex = sequence.findIndex(level => sourceClasse.nom.startsWith(level));
      if (currentIndex !== -1 && currentIndex < sequence.length - 1) {
        nextLevel = sequence[currentIndex + 1];
      }

      // Find target class for promotion
      let targetClassePromotion = null;
      if (nextLevel) {
        const suffix = sourceClasse.nom.replace(sequence[currentIndex], '').trim();
        targetClassePromotion = targetClasses.find((c: any) => c.nom.startsWith(nextLevel) && (suffix ? c.nom.endsWith(suffix) : true)) 
                                || targetClasses.find((c: any) => c.nom.startsWith(nextLevel));
      }

      // Find target class for repetition (same name in target year)
      const targetClasseRedoublement = targetClasses.find((c: any) => c.nom === sourceClasse.nom);

      // Get students
      const eleves = db.prepare(`
        SELECT e.id, e.nom, e.prenom, e.matricule
        FROM eleves e
        WHERE e.classe_id = ? AND e.school_id = ?
      `).all(sourceClasse.id, req.schoolId) as any[];

      for (const eleve of eleves) {
        const moyenne = calculateAnnualAverage(eleve.id, parseInt(source_year_id as string), sourceClasse.id, req.schoolId);
        const isAdmitted = moyenne >= 10;
        const targetClasse = isAdmitted ? targetClassePromotion : targetClasseRedoublement;

        suggestions.push({
          eleve_id: eleve.id,
          nom: eleve.nom,
          prenom: eleve.prenom,
          matricule: eleve.matricule,
          moyenne: moyenne,
          source_classe_id: sourceClasse.id,
          source_classe_nom: sourceClasse.nom,
          target_classe_id: targetClasse?.id || null,
          target_classe_nom: targetClasse?.nom || 'Non trouvée',
          status: isAdmitted ? 'Passant' : 'Redoublant'
        });
      }
    }

    res.json(suggestions);
  });

  app.post("/api/promotions/automatique/execute", authenticateToken, (req: any, res) => {
    const { suggestions } = req.body;
    if (!suggestions || !Array.isArray(suggestions)) {
      return res.status(400).json({ error: "Données manquantes" });
    }

    const stmt = db.prepare("UPDATE eleves SET classe_id = ?, statut = ? WHERE id = ? AND school_id = ?");
    const transaction = db.transaction((list, schoolId) => {
      let count = 0;
      for (const s of list) {
        if (s.target_classe_id) {
          stmt.run(s.target_classe_id, s.status || 'Passant', s.eleve_id, schoolId);
          count++;
        }
      }
      return count;
    });

    try {
      const count = transaction(suggestions, req.schoolId);
      res.json({ success: true, count });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Enseignants
  app.get("/api/enseignants", authenticateToken, (req: any, res) => {
    const enseignants = db.prepare(`
      SELECT e.*, GROUP_CONCAT(DISTINCT COALESCE(p.nom, m.nom)) as matieres_noms, GROUP_CONCAT(m.id) as matieres_ids
      FROM enseignants e
      LEFT JOIN enseignant_matieres em ON e.id = em.enseignant_id
      LEFT JOIN matieres m ON em.matiere_id = m.id
      LEFT JOIN matieres p ON m.parent_id = p.id
      WHERE e.school_id = ?
      GROUP BY e.id
      ORDER BY e.nom, e.prenom
    `).all(req.schoolId);
    res.json(enseignants);
  });

  app.get("/api/enseignants/template", authenticateToken, (req: any, res) => {
    const data = [
      {
        'Nom': 'DOE',
        'Prénom': 'John',
        'Téléphone': '90000000',
        'Email': 'john.doe@example.com',
        'Adresse': 'Lomé, Togo',
        'Matière': 'Mathématiques'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Enseignants");
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="template_enseignants.xlsx"');
    res.send(buffer);
  });

  app.post("/api/enseignants/import", authenticateToken, requireRole(['admin', 'super_admin']), (req: any, res) => {
    const { enseignants } = req.body;
    if (!enseignants || !Array.isArray(enseignants)) {
      return res.status(400).json({ error: "Données invalides" });
    }
    
    const checkEnseignant = db.prepare("SELECT id FROM enseignants WHERE email = ? AND school_id = ?");
    const insertEnseignant = db.prepare("INSERT INTO enseignants (nom, prenom, telephone, email, adresse, school_id) VALUES (?, ?, ?, ?, ?, ?)");
    const insertMatiere = db.prepare("INSERT INTO enseignant_matieres (enseignant_id, matiere_id, school_id) VALUES (?, ?, ?)");
    const checkUser = db.prepare("SELECT id FROM utilisateurs WHERE email = ?");
    const insertUser = db.prepare("INSERT INTO utilisateurs (nom, email, mot_de_passe, role, approuve, is_first_login, enseignant_id, school_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    
    let createdCount = 0;
    let skippedCount = 0;

    const importMany = db.transaction((list) => {
      const seenInBatch = new Set();
      for (const e of list) {
        const email = e.email?.toLowerCase().trim();
        if (!email) {
          skippedCount++;
          continue;
        }

        // Avoid processing the same email twice in the same batch
        if (seenInBatch.has(email)) {
          skippedCount++;
          continue;
        }
        seenInBatch.add(email);

        // Check if teacher already exists
        const existingTeacher = checkEnseignant.get(email, req.schoolId) as any;
        let enseignantId;

        if (existingTeacher) {
          enseignantId = existingTeacher.id;
          skippedCount++;
        } else {
          const info = insertEnseignant.run(e.nom, e.prenom, e.telephone, email, e.adresse, req.schoolId);
          enseignantId = info.lastInsertRowid;
          createdCount++;
        }
        
        // Handle Matiere
        if (e.matiere_nom) {
          const matiere = db.prepare("SELECT id FROM matieres WHERE LOWER(TRIM(nom)) = LOWER(TRIM(?)) AND school_id = ?").get(e.matiere_nom, req.schoolId) as any;
          if (matiere) {
            const existingRel = db.prepare("SELECT 1 FROM enseignant_matieres WHERE enseignant_id = ? AND matiere_id = ? AND school_id = ?").get(enseignantId, matiere.id, req.schoolId);
            if (!existingRel) {
              insertMatiere.run(enseignantId, matiere.id, req.schoolId);
            }
          }
        }
        
        // Create user account if not exists
        const existingUser = checkUser.get(email);
        if (!existingUser) {
          const password = `${(e.prenom || '').toLowerCase().replace(/\s/g, '')}${(e.nom || '').toLowerCase().replace(/\s/g, '')}123`;
          const hashedPassword = bcrypt.hashSync(password, 10);
          insertUser.run(`${e.prenom} ${e.nom}`, email, hashedPassword, 'enseignant', 1, 1, enseignantId, req.schoolId);
        }
      }
    });
    
    try {
      importMany(enseignants);
      logActivity(req.userId, "IMPORT", "enseignants", null, { created: createdCount, skipped: skippedCount }, req.schoolId);
      res.json({ success: true, count: createdCount, skipped: skippedCount });
    } catch (error: any) {
      console.error("Import error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/enseignants", authenticateToken, requireRole(['admin', 'super_admin']), (req: any, res) => {
    const { nom, prenom, telephone, email, adresse, matieres_ids } = req.body;
    const info = db.prepare("INSERT INTO enseignants (nom, prenom, telephone, email, adresse, school_id) VALUES (?, ?, ?, ?, ?, ?)")
      .run(nom, prenom, telephone, email, adresse, req.schoolId);
    
    const enseignantId = info.lastInsertRowid;
    if (matieres_ids && Array.isArray(matieres_ids)) {
      const insertMatiere = db.prepare("INSERT INTO enseignant_matieres (enseignant_id, matiere_id, school_id) VALUES (?, ?, ?)");
      matieres_ids.forEach(mId => insertMatiere.run(enseignantId, mId, req.schoolId));
    }
    
    // Create user account
    const password = `${(prenom || '').toLowerCase()}${(nom || '').toLowerCase()}123`;
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare("INSERT INTO utilisateurs (nom, email, mot_de_passe, role, approuve, is_first_login, enseignant_id, school_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(`${prenom} ${nom}`, email, hashedPassword, 'enseignant', 1, 1, enseignantId, req.schoolId);

    logActivity(req.userId, 'CREATE', 'ENSEIGNANT', enseignantId as number, { nom, prenom, email }, req.schoolId);
    res.json({ id: enseignantId, username: email, password: password });
  });

  app.put("/api/enseignants/:id", authenticateToken, requireRole(['admin', 'super_admin']), (req: any, res) => {
    const { id } = req.params;
    const { nom, prenom, telephone, email, adresse, matieres_ids } = req.body;
    db.prepare("UPDATE enseignants SET nom = ?, prenom = ?, telephone = ?, email = ?, adresse = ? WHERE id = ? AND school_id = ?")
      .run(nom, prenom, telephone, email, adresse, id, req.schoolId);
    
    db.prepare("DELETE FROM enseignant_matieres WHERE enseignant_id = ? AND school_id = ?").run(id, req.schoolId);
    if (matieres_ids && Array.isArray(matieres_ids)) {
      const insertMatiere = db.prepare("INSERT INTO enseignant_matieres (enseignant_id, matiere_id, school_id) VALUES (?, ?, ?)");
      matieres_ids.forEach(mId => insertMatiere.run(id, mId, req.schoolId));
    }
    
    logActivity(req.userId, 'UPDATE', 'ENSEIGNANT', parseInt(id), { nom, prenom, email }, req.schoolId);
    res.json({ success: true });
  });

  app.delete("/api/enseignants/:id", authenticateToken, requireRole(['admin', 'super_admin']), (req: any, res) => {
    const { id } = req.params;
    const teacher = db.prepare("SELECT nom, prenom FROM enseignants WHERE id = ? AND school_id = ?").get(id, req.schoolId) as any;
    if (!teacher) return res.status(404).json({ error: "Enseignant non trouvé" });

    db.transaction(() => {
      // Cleanup related data
      db.prepare("DELETE FROM enseignant_matieres WHERE enseignant_id = ? AND school_id = ?").run(id, req.schoolId);
      db.prepare("DELETE FROM timetable_requests WHERE enseignant_id = ? AND school_id = ?").run(id, req.schoolId);
      db.prepare("UPDATE emplois_du_temps SET enseignant_id = NULL WHERE enseignant_id = ? AND school_id = ?").run(id, req.schoolId);
      db.prepare("UPDATE notes SET enseignant_id = NULL WHERE enseignant_id = ? AND school_id = ?").run(id, req.schoolId);
      db.prepare("UPDATE classe_matieres SET enseignant_id = NULL WHERE enseignant_id = ? AND school_id = ?").run(id, req.schoolId);
      
      // Handle user account
      db.prepare("UPDATE utilisateurs SET enseignant_id = NULL WHERE enseignant_id = ? AND school_id = ?").run(id, req.schoolId);
      
      db.prepare("DELETE FROM enseignants WHERE id = ? AND school_id = ?").run(id, req.schoolId);
    })();

    logActivity(req.userId, 'DELETE', 'ENSEIGNANT', parseInt(id), { nom: teacher.nom, prenom: teacher.prenom }, req.schoolId);
    res.json({ success: true });
  });

  app.get("/api/enseignants/par-matiere/:matiereId", authenticateToken, (req: any, res) => {
    const { matiereId } = req.params;
    const matiere = db.prepare("SELECT nom FROM matieres WHERE id = ? AND school_id = ?").get(matiereId, req.schoolId) as any;
    
    let query = `
      SELECT DISTINCT e.* 
      FROM enseignants e
      JOIN enseignant_matieres em ON e.id = em.enseignant_id
      WHERE em.matiere_id = ? AND e.school_id = ?
      ORDER BY e.nom, e.prenom
    `;
    let params = [matiereId, req.schoolId];

    if (matiere && (matiere.nom === "Communication écrite" || matiere.nom === "Lecture")) {
      query = `
        SELECT DISTINCT e.* 
        FROM enseignants e
        JOIN enseignant_matieres em ON e.id = em.enseignant_id
        JOIN matieres m ON em.matiere_id = m.id
        WHERE m.nom IN ('Communication écrite', 'Lecture', 'Français') AND e.school_id = ?
        ORDER BY e.nom, e.prenom
      `;
      params = [req.schoolId];
    }

    const enseignants = db.prepare(query).all(...params);
    res.json(enseignants);
  });

  // Matieres
  app.get("/api/matieres", authenticateToken, (req: any, res) => {
    res.json(db.prepare(`
      SELECT m.*, p.nom as parent_nom 
      FROM matieres m 
      LEFT JOIN matieres p ON m.parent_id = p.id 
      WHERE m.school_id = ?
      ORDER BY m.nom
    `).all(req.schoolId));
  });

  app.post("/api/matieres", authenticateToken, (req: any, res) => {
    const { nom, categorie, coefficient, parent_id } = req.body;
    const result = db.prepare("INSERT INTO matieres (nom, categorie, coefficient, parent_id, school_id) VALUES (?, ?, ?, ?, ?)")
      .run(nom, categorie, coefficient || 1, parent_id || null, req.schoolId);
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/matieres/:id", authenticateToken, (req: any, res) => {
    const { id } = req.params;
    const { nom, categorie, coefficient, parent_id } = req.body;
    db.prepare("UPDATE matieres SET nom = ?, categorie = ?, coefficient = ?, parent_id = ? WHERE id = ? AND school_id = ?")
      .run(nom, categorie, coefficient || 1, parent_id || null, id, req.schoolId);
    res.json({ success: true });
  });

  app.delete("/api/matieres/:id", authenticateToken, (req: any, res) => {
    const { id } = req.params;
    
    // Delete related records first to avoid foreign key constraint failures
    db.prepare("DELETE FROM classe_matieres WHERE matiere_id = ? AND EXISTS (SELECT 1 FROM matieres m WHERE m.id = matiere_id AND m.school_id = ?)").run(id, req.schoolId);
    db.prepare("DELETE FROM notes WHERE matiere_id = ? AND school_id = ?").run(id, req.schoolId);
    db.prepare("DELETE FROM emplois_du_temps WHERE matiere_id = ? AND school_id = ?").run(id, req.schoolId);
    db.prepare("DELETE FROM devoirs WHERE matiere_id = ? AND school_id = ?").run(id, req.schoolId);
    db.prepare("DELETE FROM enseignant_matieres WHERE matiere_id = ? AND EXISTS (SELECT 1 FROM matieres m WHERE m.id = matiere_id AND m.school_id = ?)").run(id, req.schoolId);
    
    // Also handle child subjects
    db.prepare("UPDATE matieres SET parent_id = NULL WHERE parent_id = ? AND school_id = ?").run(id, req.schoolId);

    db.prepare("DELETE FROM matieres WHERE id = ? AND school_id = ?").run(id, req.schoolId);
    res.json({ success: true });
  });

  // Promotion
  app.post("/api/promotion", authenticateToken, (req: any, res) => {
    const { eleve_id, nouvelle_classe_id } = req.body;
    db.prepare("UPDATE eleves SET classe_id = ? WHERE id = ? AND school_id = ?").run(nouvelle_classe_id, eleve_id, req.schoolId);
    res.json({ success: true });
  });

  app.get("/api/emplois/:classeId", authenticateToken, (req: any, res) => {
    const { classeId } = req.params;
    res.json(db.prepare(`
      SELECT ed.*, m.nom as matiere_nom, e.nom as enseignant_nom, e.prenom as enseignant_prenom
      FROM emplois_du_temps ed
      JOIN matieres m ON ed.matiere_id = m.id
      LEFT JOIN classe_matieres cm ON ed.classe_id = cm.classe_id AND ed.matiere_id = cm.matiere_id
      LEFT JOIN enseignants e ON cm.enseignant_id = e.id
      WHERE ed.classe_id = ? AND ed.school_id = ?
    `).all(classeId, req.schoolId));
  });

  app.post("/api/emplois", authenticateToken, (req: any, res) => {
    const { classe_id, jour, heure_debut, heure_fin, matiere_id } = req.body;
    
    // Automatic association: Check if subject is already in classe_matieres
    const association = db.prepare("SELECT * FROM classe_matieres WHERE classe_id = ? AND matiere_id = ? AND school_id = ?")
      .get(classe_id, matiere_id, req.schoolId);
    
    if (!association) {
      db.prepare("INSERT INTO classe_matieres (classe_id, matiere_id, coefficient, heures_hebdo, school_id) VALUES (?, ?, ?, ?, ?)")
        .run(classe_id, matiere_id, 1, 0, req.schoolId);
    }

    const result = db.prepare("INSERT INTO emplois_du_temps (classe_id, jour, heure_debut, heure_fin, matiere_id, school_id) VALUES (?, ?, ?, ?, ?, ?)")
      .run(classe_id, jour, heure_debut, heure_fin, matiere_id, req.schoolId);
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/emplois/:id", authenticateToken, (req: any, res) => {
    const { id } = req.params;
    const { jour, heure_debut, heure_fin, matiere_id } = req.body;
    db.prepare(`
      UPDATE emplois_du_temps 
      SET jour = ?, heure_debut = ?, heure_fin = ?, matiere_id = ?
      WHERE id = ? AND school_id = ?
    `).run(jour, heure_debut, heure_fin, matiere_id, id, req.schoolId);
    res.json({ success: true });
  });

  app.delete("/api/emplois/:id", authenticateToken, (req: any, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM emplois_du_temps WHERE id = ? AND school_id = ?").run(id, req.schoolId);
    res.json({ success: true });
  });

  // Timetable Requests
  app.get("/api/timetable-requests", authenticateToken, (req: any, res) => {
    res.json(db.prepare(`
      SELECT tr.*, e.nom, e.prenom 
      FROM timetable_requests tr
      JOIN enseignants e ON tr.enseignant_id = e.id
      WHERE tr.school_id = ?
      ORDER BY created_at DESC
    `).all(req.schoolId));
  });

  app.patch("/api/timetable-requests/:id/status", authenticateToken, (req: any, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.prepare("UPDATE timetable_requests SET status = ? WHERE id = ? AND school_id = ?").run(status, id, req.schoolId);
    
    // Notify the teacher about their request status
    const reqInfo = db.prepare(`
      SELECT tr.enseignant_id, e.nom, e.prenom, u.id as utilisateur_id
      FROM timetable_requests tr
      JOIN enseignants e ON tr.enseignant_id = e.id
      JOIN utilisateurs u ON u.enseignant_id = e.id
      WHERE tr.id = ? AND tr.school_id = ?
    `).get(id, req.schoolId) as any;

    if (reqInfo && reqInfo.utilisateur_id) {
      let statusMsg = "a été mise à jour";
      if (status === 'approved') statusMsg = "a été approuvée";
      if (status === 'rejected') statusMsg = "a été rejetée";
      createNotification(reqInfo.utilisateur_id, "Demande d'emploi du temps", `Votre demande d'emploi du temps ${statusMsg}.`, status === 'approved' ? 'success' : (status === 'rejected' ? 'error' : 'info'), null, req.schoolId);
    }

    res.json({ success: true });
  });

  app.post("/api/timetable-requests", authenticateToken, (req: any, res) => {
    const { enseignant_id, description } = req.body;
    db.prepare("INSERT INTO timetable_requests (enseignant_id, description, school_id) VALUES (?, ?, ?)").run(enseignant_id, description, req.schoolId);
    
    // Notify admins
    const ens = db.prepare("SELECT nom, prenom FROM enseignants WHERE id = ?").get(enseignant_id) as any;
    if (ens) {
      broadcastNotification(['super_admin', 'admin', 'secretariat', 'secretaire'], "Nouvelle demande - " + ens.prenom + ' ' + ens.nom, description || "Demande concernant l'emploi du temps", 'info', '/demandes', req.schoolId);
    }

    res.json({ success: true });
  });

  // Import/Export
  app.get("/api/eleves/template", authenticateToken, (req: any, res) => {
    const classes = db.prepare("SELECT id, nom FROM classes WHERE school_id = ? ORDER BY nom").all(req.schoolId);
    const workbook = XLSX.utils.book_new();
    
    classes.forEach((c: any) => {
      const worksheet = XLSX.utils.aoa_to_sheet([
        ["Matricule", "Nom", "Prénom", "Sexe", "Date Naissance", "Nom Parent", "Tel Parent", "Adresse"]
      ]);
      XLSX.utils.book_append_sheet(workbook, worksheet, c.nom);
    });
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="template_eleves.xlsx"');
    res.send(buffer);
  });

  app.post("/api/eleves/import", authenticateToken, requireRole(['admin', 'super_admin', 'secretariat', 'secretaire']), (req: any, res) => {
    const { classe_id: default_classe_id, eleves } = req.body;
    
    const stmt = db.prepare(`
      INSERT INTO eleves (matricule, nom, prenom, sexe, date_naissance, nom_parent, tel_parent, email_parent, adresse, classe_id, statut, provenance, school_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(matricule, school_id) DO UPDATE SET
        nom = excluded.nom,
        prenom = excluded.prenom,
        sexe = excluded.sexe,
        date_naissance = excluded.date_naissance,
        nom_parent = excluded.nom_parent,
        tel_parent = excluded.tel_parent,
        email_parent = excluded.email_parent,
        adresse = excluded.adresse,
        classe_id = excluded.classe_id,
        statut = excluded.statut,
        provenance = excluded.provenance
    `);
    
    const insertMany = db.transaction((elevesList) => {
      for (const e of elevesList) {
        const cid = e.classe_id || default_classe_id;
        stmt.run(
          e.matricule, 
          e.nom, 
          e.prenom, 
          e.sexe, 
          e.date_naissance, 
          e.nom_parent, 
          e.tel_parent, 
          e.email_parent, 
          e.adresse, 
          cid, 
          e.statut || 'Passant',
          e.provenance || 'Nouveau',
          req.schoolId
        );
      }
    });
    
    try {
      insertMany(eleves);
      logActivity(req.userId, "IMPORT", "eleves", null, { count: eleves.length, classe_id: default_classe_id }, req.schoolId);
      res.json({ success: true, count: eleves.length });
    } catch (error: any) {
      console.error("Import error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/users", authenticateToken, requireRole(['admin', 'super_admin']), (req: any, res) => {
    const userId = req.userId;
    const users = db.prepare("SELECT id, nom, email, role, approuve, permissions, otp_code, otp_expiry, is_first_login, can_write, last_seen FROM utilisateurs WHERE school_id = ?").all(req.schoolId);
    res.json(users.map((u: any) => ({
      ...u,
      permissions: u.permissions ? JSON.parse(u.permissions) : []
    })));
  });

  app.post("/api/users/generate", authenticateToken, requireRole(['admin', 'super_admin']), async (req: any, res) => {
    const { enseignant_id } = req.body;
    const enseignant = db.prepare("SELECT nom, prenom, email FROM enseignants WHERE id = ? AND school_id = ?").get(enseignant_id, req.schoolId) as any;
    if (!enseignant) return res.status(404).json({ error: "Enseignant non trouvé" });

    const password = Math.random().toString(36).slice(-8);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otp_expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    db.prepare("INSERT INTO utilisateurs (nom, email, mot_de_passe, role, approuve, is_first_login, enseignant_id, otp_code, otp_expiry, school_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(`${enseignant.prenom} ${enseignant.nom}`, enseignant.email, hashedPassword, 'enseignant', 1, 1, enseignant_id, otp, otp_expiry, req.schoolId);

    // Send email with credentials
    try {
      const transporter = await createMailTransporter();
      const setupLink = `${APP_URL}/setup-password?email=${encodeURIComponent(enseignant.email)}&otp=${otp}`;
      const body = `Bonjour ${enseignant.prenom} ${enseignant.nom},\n\nUn compte enseignant a été créé pour vous.\n\nEmail: ${enseignant.email}\nCode de confirmation (OTP): ${otp}\n\nPour activer votre compte et configurer votre mot de passe, veuillez cliquer sur le lien ci-dessous :\n${setupLink}\n\nCe lien expire dans 24 heures.`;

      if (transporter) {
        await transporter.sendMail({
          from: `"${process.env.SCHOOL_NAME || 'MégafixaEduc'}" <${process.env.SMTP_USER}>`,
          to: enseignant.email,
          subject: "Activation de votre compte Enseignant - MégafixaEduc Pro",
          text: body,
          html: body.replace(/\n/g, '<br>').replace(setupLink, `<a href="${setupLink}" style="display: inline-block; padding: 10px 20px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Activer mon compte</a>`),
        });
      }
    } catch (mailErr) {
      console.error("Failed to send teacher credentials email:", mailErr);
    }

    res.json({ username: enseignant.email, password: password, otp: otp });
  });

  app.post("/api/users/sync-teachers", authenticateToken, requireRole(['admin', 'super_admin']), async (req: any, res) => {
    try {
      const teachers = db.prepare("SELECT * FROM enseignants").all() as any[];
      let createdCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];
      const transporter = await createMailTransporter();

      for (const teacher of teachers) {
        if (!teacher.email) {
          skippedCount++;
          continue;
        }

        // Check if user already exists for this teacher
        const existingUser = db.prepare("SELECT * FROM utilisateurs WHERE enseignant_id = ? OR email = ?").get(teacher.id, teacher.email) as any;
        
        if (existingUser) {
          // If user exists but enseignant_id is not set, link it
          if (!existingUser.enseignant_id) {
            db.prepare("UPDATE utilisateurs SET enseignant_id = ? WHERE id = ?").run(teacher.id, existingUser.id);
          }
          skippedCount++;
          continue;
        }

        // Create new user
        const defaultPassword = 'MegaFixa2024!';
        const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours for setup

        try {
          db.prepare(`
            INSERT INTO utilisateurs (nom, email, mot_de_passe, role, approuve, enseignant_id, otp_code, otp_expiry, is_first_login, school_id)
            VALUES (?, ?, ?, 'enseignant', 0, ?, ?, ?, 1, ?)
          `).run(`${teacher.prenom} ${teacher.nom}`, teacher.email, hashedPassword, teacher.id, otpCode, otpExpiry, req.schoolId);

          createdCount++;

          // Send email
          if (transporter) {
            const setupLink = `${APP_URL}/setup-password?email=${encodeURIComponent(teacher.email)}&otp=${otpCode}`;
            const body = `
              Bonjour ${teacher.prenom} ${teacher.nom},
              
              Un compte enseignant a été créé pour vous sur MégafixaEduc.
              
              Vos identifiants de connexion temporaires :
              Email : ${teacher.email}
              Mot de passe par défaut : ${defaultPassword}
              
              Pour sécuriser votre compte, veuillez définir votre propre mot de passe en cliquant sur le lien suivant :
              ${setupLink}
              
              Ce lien expirera dans 24 heures.
              
              Une fois votre mot de passe défini, l'administrateur devra approuver votre accès avant que vous ne puissiez vous connecter.
            `;

            await transporter.sendMail({
              from: `"${process.env.SCHOOL_NAME || 'MégafixaEduc'}" <${process.env.SMTP_USER}>`,
              to: teacher.email,
              subject: "Création de votre compte enseignant - MégafixaEduc",
              text: body,
              html: body.replace(/\n/g, '<br>').replace(setupLink, `<a href="${setupLink}" style="display: inline-block; padding: 10px 20px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Définir mon mot de passe</a>`),
            });
          }
        } catch (err: any) {
          errors.push(`Erreur pour ${teacher.email}: ${err.message}`);
        }
      }

      res.json({ 
        success: true, 
        created: createdCount, 
        skipped: skippedCount, 
        errors,
        simulated: !transporter 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/users", authenticateToken, async (req: any, res) => {
    const { nom, email, role, permissions, can_write } = req.body;
    const parent_admin_id = req.userId;
    
    // Generate random password and OTP
    const password = Math.random().toString(36).slice(-8);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otp_expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h
    
    const permissionsStr = permissions ? JSON.stringify(permissions) : JSON.stringify(['/']);
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    try {
      const info = db.prepare("INSERT INTO utilisateurs (nom, email, mot_de_passe, role, approuve, permissions, is_first_login, otp_code, otp_expiry, parent_admin_id, can_write, school_id) VALUES (?, ?, ?, ?, 1, ?, 1, ?, ?, ?, ?, ?)")
        .run(nom, email, hashedPassword, role || 'enseignant', permissionsStr, otp, otp_expiry, parent_admin_id, can_write !== undefined ? can_write : 1, req.schoolId);
      
      // Send email with credentials
      try {
        const transporter = await createMailTransporter();
        const setupLink = `${APP_URL}/setup-password?email=${encodeURIComponent(email)}&otp=${otp}`;
        const body = `Bonjour ${nom},\n\nUn compte a été créé pour vous par votre administrateur.\n\nEmail: ${email}\nCode de confirmation (OTP): ${otp}\n\nPour activer votre compte et configurer votre mot de passe, veuillez cliquer sur le lien ci-dessous :\n${setupLink}\n\nCe lien expire dans 24 heures.`;

        if (transporter) {
          await transporter.sendMail({
            from: `"${process.env.SCHOOL_NAME || 'MégafixaEduc'}" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "Activation de votre compte MégafixaEduc Pro",
            text: body,
            html: body.replace(/\n/g, '<br>').replace(setupLink, `<a href="${setupLink}" style="display: inline-block; padding: 10px 20px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Activer mon compte</a>`),
          });
        }
      } catch (mailErr) {
        console.error("Failed to send user credentials email:", mailErr);
      }

      logActivity(parent_admin_id, 'CREATE', 'USER', info.lastInsertRowid as number, { email, role }, req.schoolId);
      res.json({ id: info.lastInsertRowid, password, otp });
    } catch (err: any) {
      console.error("User creation error:", err);
      res.status(400).json({ error: err.message });
    }
  });

  app.put("/api/users/:id", authenticateToken, (req: any, res) => {
    const { id } = req.params;
    const { nom, email, role, approuve, permissions, mot_de_passe, can_write } = req.body;
    const permissionsStr = permissions ? JSON.stringify(permissions) : null;
    
    if (mot_de_passe) {
      const hashedPassword = bcrypt.hashSync(mot_de_passe, 10);
      db.prepare("UPDATE utilisateurs SET nom = ?, email = ?, role = ?, approuve = ?, permissions = ?, mot_de_passe = ?, can_write = ? WHERE id = ? AND school_id = ?")
        .run(nom, email, role, approuve, permissionsStr, hashedPassword, can_write !== undefined ? can_write : 1, id, req.schoolId);
    } else {
      db.prepare("UPDATE utilisateurs SET nom = ?, email = ?, role = ?, approuve = ?, permissions = ?, can_write = ? WHERE id = ? AND school_id = ?")
        .run(nom, email, role, approuve, permissionsStr, can_write !== undefined ? can_write : 1, id, req.schoolId);
    }
    logActivity(req.userId, 'UPDATE', 'USER', parseInt(id), { email, role }, req.schoolId);
    res.json({ success: true });
  });

  app.patch("/api/users/:id/approve", authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    const { approuve, role, permissions } = req.body;
    
    if (approuve) {
      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 mins
      const permissionsStr = permissions ? JSON.stringify(permissions) : null;
      
      db.prepare("UPDATE utilisateurs SET approuve = 1, role = ?, permissions = ?, otp_code = ?, otp_expiry = ?, is_first_login = 1 WHERE id = ? AND school_id = ?")
        .run(role || 'enseignant', permissionsStr, otp, expiry, id, req.schoolId);
      
      // Send Email
      const user = db.prepare("SELECT email, nom FROM utilisateurs WHERE id = ? AND school_id = ?").get(id, req.schoolId) as any;
      try {
        const transporter = await createMailTransporter();
        const setupLink = `${APP_URL}/setup-password?email=${encodeURIComponent(user.email)}&otp=${otp}`;
        const body = `
          Bonjour ${user.nom},
          
          Votre compte MégafixaEduc Pro a été approuvé par l'administrateur.
          
          Pour activer votre compte et configurer votre mot de passe, veuillez cliquer sur le lien ci-dessous :
          ${setupLink}
          
          Code de confirmation (OTP): ${otp}
          
          Ce lien expire dans 30 minutes.
        `;

        if (transporter) {
          await transporter.sendMail({
            from: `"${process.env.SCHOOL_NAME || 'MégafixaEduc'}" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: "Votre compte MégafixaEduc Pro a été approuvé",
            text: body,
            html: body.replace(/\n/g, '<br>').replace(setupLink, `<a href="${setupLink}" style="display: inline-block; padding: 10px 20px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Activer mon compte</a>`),
          });
        } else {
          console.log(`
          --------------------------------------------------
          EMAIL SIMULÉ (SMTP non configuré) À: ${user.email}
          SUJET: Votre compte MégafixaEduc Pro a été approuvé
          MESSAGE: Bonjour ${user.nom},
          Votre compte a été approuvé par l'administrateur.
          Voici votre code de connexion à usage unique (valable 30 minutes):
          
          CODE: ${otp}
          LIEN: ${setupLink}
          --------------------------------------------------
          `);
        }
      } catch (mailErr) {
        console.error("Failed to send approval email:", mailErr);
      }
      
      logActivity(req.userId, 'APPROVE', 'USER', parseInt(id), { email: user.email, role: role || 'enseignant' }, req.schoolId);
      res.json({ success: true, message: "Utilisateur approuvé et email envoyé." });
    } else {
      db.prepare("UPDATE utilisateurs SET approuve = 0 WHERE id = ? AND school_id = ?").run(id, req.schoolId);
      res.json({ success: true, message: "Accès révoqué." });
    }
  });

  app.delete("/api/users/:id", authenticateToken, (req: any, res) => {
    const { id } = req.params;
    const user = db.prepare("SELECT email, nom FROM utilisateurs WHERE id = ? AND school_id = ?").get(id, req.schoolId) as any;
    
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

    // Set utilisateur_id to NULL in audit_logs to avoid foreign key constraint
    db.prepare("UPDATE audit_logs SET utilisateur_id = NULL WHERE utilisateur_id = ? AND school_id = ?").run(id, req.schoolId);
    
    db.prepare("DELETE FROM utilisateurs WHERE id = ? AND school_id = ?").run(id, req.schoolId);
    logActivity(req.userId, 'DELETE', 'USER', parseInt(id), { email: user ? user.email : 'Inconnu' }, req.schoolId);
    res.json({ success: true });
  });

  // Role Permissions
  app.get("/api/role-permissions", authenticateToken, (req: any, res) => {
    const roles = db.prepare("SELECT * FROM role_permissions WHERE school_id = ?").all(req.schoolId);
    res.json(roles.map((r: any) => ({ ...r, permissions: JSON.parse(r.permissions) })));
  });

  app.put("/api/role-permissions/:role", authenticateToken, (req: any, res) => {
    const { role } = req.params;
    const { permissions } = req.body;
    db.prepare("UPDATE role_permissions SET permissions = ? WHERE role = ? AND school_id = ?").run(JSON.stringify(permissions), role, req.schoolId);
    logActivity(req.userId, 'UPDATE', 'ROLE_PERMISSIONS', null, { role, permissions }, req.schoolId);
    res.json({ success: true });
  });

  // Auth
  app.post("/api/auth/google", (req, res) => {
    const { email, nom, google_id } = req.body;
    
    let user = db.prepare("SELECT * FROM utilisateurs WHERE google_id = ? OR email = ?").get(google_id, email) as any;
    
    if (!user) {
      return res.status(403).json({ 
        success: false, 
        error: "Accès refusé. Cette adresse email n'est pas enregistrée dans le système. Veuillez contacter votre administrateur." 
      });
    } else if (!user.google_id) {
      // Link Google ID to existing email account and auto-approve if not already
      db.prepare("UPDATE utilisateurs SET google_id = ?, approuve = 1 WHERE id = ?").run(google_id, user.id);
      user.google_id = google_id;
      user.approuve = 1;
    }

    if (user.approuve === 0) {
      db.prepare("UPDATE utilisateurs SET approuve = 1 WHERE id = ?").run(user.id);
      user.approuve = 1;
    }

    logActivity(user.id, 'LOGIN_GOOGLE', 'USER', user.id, { email: user.email }, user.school_id);

    // Check if teacher
    let enseignant_id = null;
    if (user.role === 'enseignant') {
      const enseignant = db.prepare("SELECT id FROM enseignants WHERE email = ? AND school_id = ?").get(user.email, user.school_id) as any;
      if (enseignant) {
        enseignant_id = enseignant.id;
      }
    }

    // Get role permissions
    const rolePerms = db.prepare("SELECT permissions FROM role_permissions WHERE role = ? AND school_id = ?").get(user.role, user.school_id) as any;
    const defaultPermissions = rolePerms ? JSON.parse(rolePerms.permissions) : [];

    res.json({ 
      success: true, 
      user: { 
        id: user.id, 
        nom: user.nom, 
        email: user.email, 
        role: user.role,
        school_id: user.school_id,
        can_write: user.can_write,
        enseignant_id: enseignant_id,
        permissions: user.permissions ? JSON.parse(user.permissions) : defaultPermissions
      } 
    });
  });

  app.post("/api/auth/profile/update", authenticateToken, (req: any, res) => {
    const { id, nom, email } = req.body;
    if (!id || !nom || !email) return res.status(400).json({ error: "Données manquantes" });

    try {
      db.prepare("UPDATE utilisateurs SET nom = ?, email = ? WHERE id = ? AND school_id = ?").run(nom, email, id, req.schoolId);
      const user = db.prepare("SELECT * FROM utilisateurs WHERE id = ? AND school_id = ?").get(id, req.schoolId) as any;
      if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
      const { mot_de_passe, otp_code, otp_expiry, ...userWithoutSensitive } = user;
      logActivity(req.userId, 'UPDATE_PROFILE', 'USER', parseInt(id), { nom, email }, req.schoolId);
      res.json({ success: true, user: userWithoutSensitive });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/password/request-reset", async (req, res) => {
    const { email } = req.body;
    const user = db.prepare("SELECT * FROM utilisateurs WHERE email = ?").get(email) as any;
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    db.prepare("UPDATE utilisateurs SET otp_code = ?, otp_expiry = ? WHERE id = ?").run(code, expiry, user.id);

    try {
      const transporter = await createMailTransporter();
      const body = `Votre code de confirmation pour modifier votre mot de passe est : ${code}\nCe code expirera dans 15 minutes.`;

      if (!transporter) {
        console.log("Password Reset Code Simulation:", code);
        return res.json({ success: true, simulated: true, message: "Code simulé (identifiants SMTP manquants)" });
      }

      await transporter.sendMail({
        from: `"${process.env.SCHOOL_NAME || 'MégafixaEduc'}" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Code de confirmation de changement de mot de passe",
        text: body,
        html: body.replace(/\n/g, '<br>'),
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error sending reset email:", error);
      let errorMessage = error.message;
      if (errorMessage.includes('535-5.7.8')) {
        errorMessage = "Erreur d'authentification SMTP : Identifiants incorrects ou mot de passe d'application requis. Vérifiez vos paramètres SMTP dans AI Studio.";
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/auth/password/reset", (req, res) => {
    const { email, code, newPassword } = req.body;
    const user = db.prepare("SELECT * FROM utilisateurs WHERE email = ?").get(email) as any;
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

    if (user.otp_code !== code || new Date() > new Date(user.otp_expiry)) {
      return res.status(400).json({ error: "Code invalide ou expiré" });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.prepare("UPDATE utilisateurs SET mot_de_passe = ?, otp_code = NULL, otp_expiry = NULL WHERE id = ?").run(hashedPassword, user.id);
    logActivity(user.id, 'PASSWORD_RESET', 'USER', user.id, { email }, user.school_id);
    res.json({ success: true });
  });

  app.post("/api/auth/setup-password", (req, res) => {
    const { email, otp, password } = req.body;
    const user = db.prepare("SELECT * FROM utilisateurs WHERE email = ?").get(email) as any;

    if (!user) {
      return res.status(404).json({ success: false, error: "Utilisateur non trouvé" });
    }

    if (user.otp_code !== otp || new Date() > new Date(user.otp_expiry)) {
      return res.status(400).json({ success: false, error: "Code OTP invalide ou expiré" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare("UPDATE utilisateurs SET mot_de_passe = ?, otp_code = NULL, otp_expiry = NULL, is_first_login = 0 WHERE id = ?")
      .run(hashedPassword, user.id);

    logActivity(user.id, 'SETUP_PASSWORD', 'USER', user.id, { email }, user.school_id);
    res.json({ success: true });
  });

  // Google OAuth Endpoints
  app.get("/api/auth/google/url", (req, res) => {
    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: "Google Client ID non configuré" });
    }
    const redirectUri = `${APP_URL}/api/auth/google/callback`;
    const url = googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
      redirect_uri: redirectUri
    });
    res.json({ url });
  });

  app.get(["/api/auth/google/callback", "/api/auth/google/callback/"], async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send("Code manquant");

    try {
      const redirectUri = `${APP_URL}/api/auth/google/callback`;
      const { tokens } = await googleClient.getToken({
        code: code as string,
        redirect_uri: redirectUri
      });
      googleClient.setCredentials(tokens);

      const userInfoRes = await googleClient.request({
        url: 'https://www.googleapis.com/oauth2/v3/userinfo'
      });
      const profile = userInfoRes.data as any;

      if (!profile.email) {
        return res.status(400).send("Email non fourni par Google");
      }

      // Check if user exists
      let user = db.prepare("SELECT * FROM utilisateurs WHERE email = ?").get(profile.email) as any;

      if (!user) {
        return res.status(403).send(`
          <script>
            window.opener.postMessage({ 
              type: 'OAUTH_AUTH_ERROR', 
              error: "Accès refusé. Pour vous connecter avec Google, vous devez d'abord avoir un compte créé par un administrateur." 
            }, '*');
            window.close();
          </script>
        `);
      }

      // Update google_id if not set
      if (!user.google_id) {
        db.prepare("UPDATE utilisateurs SET google_id = ?, approuve = 1 WHERE id = ?").run(profile.sub, user.id);
      }
      logActivity(user.id, 'LOGIN_GOOGLE', 'USER', user.id, { email: user.email }, user.school_id);

      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role, 
          schoolId: user.school_id, 
          eleve_id: user.eleve_id,
          lastSeen: new Date().toISOString() 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      const userData = JSON.stringify({
        id: user.id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        eleve_id: user.eleve_id,
        permissions: user.permissions ? JSON.parse(user.permissions) : []
      });

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  token: '${token}',
                  user: ${userData}
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentification réussie. Cette fenêtre va se fermer...</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Google OAuth Error:", error);
      res.status(500).send("Erreur lors de l'authentification Google");
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email, license_key } = req.body;
    if (!email || !license_key) {
      return res.status(400).json({ success: false, error: "Email et clé de licence requis." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = db.prepare("SELECT * FROM utilisateurs WHERE LOWER(email) = ?").get(normalizedEmail) as any;

    if (!user) {
      return res.status(404).json({ success: false, error: "Aucun utilisateur trouvé avec cet email." });
    }

    // Check license key
    const expectedKey = user.license_key || user.otp_code; // some users might only have otp_code as key
    if (expectedKey !== license_key.trim().toUpperCase()) {
      return res.status(401).json({ success: false, error: "La clé de licence fournie est incorrecte." });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    db.prepare("UPDATE utilisateurs SET reset_token = ?, reset_token_expiry = ? WHERE id = ?")
      .run(token, expiry, user.id);

    // Send email
    try {
      const transporter = await createMailTransporter();
      if (transporter) {
        const resetUrl = `${APP_URL}/reset-password?token=${token}`;
        const body = `Bonjour ${user.nom},\n\nVous avez demandé la réinitialisation de votre mot de passe pour MégafixaEduc Pro.\n\nVeuillez cliquer sur le lien ci-dessous pour choisir un nouveau mot de passe :\n\n${resetUrl}\n\nCe lien expire dans 1 heure.\n\nSi vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.\n\nL'équipe MégafixaEduc`;
        
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || '"MégafixaEduc" <noreply@megafixa.com>',
          to: user.email,
          subject: "Réinitialisation de votre mot de passe - MégafixaEduc Pro",
          text: body
        });
      }
      res.json({ success: true, message: "Un email de réinitialisation vous a été envoyé." });
    } catch (error) {
      console.error("Forgot password email error:", error);
      res.status(500).json({ success: false, error: "Erreur lors de l'envoi de l'email." });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { token, new_password, confirm_password } = req.body;

    if (!token || !new_password || !confirm_password) {
      return res.status(400).json({ success: false, error: "Tous les champs sont requis." });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({ success: false, error: "Les mots de passe ne correspondent pas." });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ success: false, error: "Le mot de passe doit contenir au moins 8 caractères." });
    }

    const user = db.prepare("SELECT * FROM utilisateurs WHERE reset_token = ?").get(token) as any;

    if (!user) {
      return res.status(400).json({ success: false, error: "Le lien de réinitialisation est invalide." });
    }

    const expiry = new Date(user.reset_token_expiry);
    if (expiry < new Date()) {
      return res.status(400).json({ success: false, error: "Le lien de réinitialisation a expiré." });
    }

    const hashedPassword = bcrypt.hashSync(new_password, 8);

    db.prepare("UPDATE utilisateurs SET mot_de_passe = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?")
      .run(hashedPassword, user.id);

    // Send confirmation email
    try {
      const transporter = await createMailTransporter();
      if (transporter) {
        const body = `Bonjour ${user.nom},\n\nVotre mot de passe a été réinitialisé avec succès sur MégafixaEduc Pro.\n\nSi vous n'êtes pas à l'origine de cette modification, veuillez contacter immédiatement le support.\n\nL'équipe MégafixaEduc`;
        
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || '"MégafixaEduc" <noreply@megafixa.com>',
          to: user.email,
          subject: "Mot de passe réinitialisé - MégafixaEduc Pro",
          text: body
        });
      }
    } catch (error) {
      console.error("Reset password confirmation email error:", error);
    }

    res.json({ success: true, message: "Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter." });
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password, otp, license_key } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const user = db.prepare("SELECT * FROM utilisateurs WHERE LOWER(email) = ?").get(normalizedEmail) as any;
    
    if (!user) {
      return res.status(401).json({ success: false, error: "Identifiants incorrects" });
    }

    const isPasswordCorrect = bcrypt.compareSync(password, user.mot_de_passe) || password === user.mot_de_passe;
    
    if (isPasswordCorrect) {
      // First login for license protected accounts (Admins/SuperAdmins)
      if (user.is_first_login === 1 && (user.license_key || user.role === 'admin' || user.role === 'super_admin')) {
        if (!license_key) {
          return res.json({ 
            success: false, 
            requiresLicense: true, 
            message: "Clé de connexion unique requise pour votre première connexion." 
          });
        }
        
        // Check both columns for compatibility during transition
        const expectedKey = user.license_key || user.otp_code;
        if (expectedKey !== license_key) {
          return res.status(401).json({ success: false, error: "Clé de connexion unique invalide." });
        }
        
        // Valid license! Update is_first_login and clean up
        db.prepare("UPDATE utilisateurs SET is_first_login = 0, otp_code = NULL, otp_expiry = NULL WHERE id = ?").run(user.id);
        user.is_first_login = 0;
      }
      
      // Legacy OTP logic for teachers/others or unapproved accounts
      else if (user.approuve === 0) {
        if (!otp) {
          return res.json({ 
            success: false, 
            requiresOtp: true, 
            message: "Votre compte n'est pas encore confirmé. Veuillez entrer le code reçu par email." 
          });
        }

        if (user.otp_code !== otp) {
          return res.status(401).json({ success: false, error: "Code de confirmation incorrect." });
        }

        const expiry = user.otp_expiry ? new Date(user.otp_expiry) : new Date(Date.now() + 3600000);
        if (expiry < new Date()) {
          return res.status(401).json({ success: false, error: "Le code de confirmation a expiré." });
        }

        // Success! Confirm account and mark as no longer first login
        db.prepare("UPDATE utilisateurs SET approuve = 1, is_first_login = 0, otp_code = NULL, otp_expiry = NULL WHERE id = ?").run(user.id);
        user.approuve = 1;
        user.is_first_login = 0;
      }
      
      // General first login check for other roles (if any use OTP)
      else if (user.is_first_login === 1) {
        if (!otp) {
          return res.json({ success: false, requiresOtp: true, message: "Code de vérification requis pour la première connexion." });
        }
        
        if (user.otp_code !== otp) {
          return res.status(401).json({ success: false, error: "Code de vérification incorrect." });
        }
        
        const expiry = user.otp_expiry ? new Date(user.otp_expiry) : new Date(Date.now() + 3600000);
        if (expiry < new Date()) {
          return res.status(401).json({ success: false, error: "Le code de vérification a expiré." });
        }
        
        // Success! Mark as no longer first login
        db.prepare("UPDATE utilisateurs SET is_first_login = 0, otp_code = NULL, otp_expiry = NULL WHERE id = ?").run(user.id);
        user.is_first_login = 0;
      }
      
      logActivity(user.id, 'LOGIN', 'USER', user.id, { email: user.email }, user.school_id);
      
      // Check if teacher
      let enseignant_id = null;
      if (user.role === 'enseignant') {
        const enseignant = db.prepare("SELECT id FROM enseignants WHERE email = ? AND school_id = ?").get(user.email, user.school_id) as any;
        if (enseignant) {
          enseignant_id = enseignant.id;
        }
      }
      
      // Get role permissions
      const rolePerms = db.prepare("SELECT permissions FROM role_permissions WHERE role = ? AND school_id = ?").get(user.role, user.school_id) as any;
      const defaultPermissions = rolePerms ? JSON.parse(rolePerms.permissions) : [];
      
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role, 
          schoolId: user.school_id, 
          eleve_id: user.eleve_id,
          lastSeen: new Date().toISOString() 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ 
        success: true, 
        token,
        user: { 
          id: user.id, 
          nom: user.nom, 
          email: user.email, 
          role: user.role,
          can_write: user.can_write,
          enseignant_id: enseignant_id,
          eleve_id: user.eleve_id,
          permissions: user.permissions ? JSON.parse(user.permissions) : defaultPermissions
        } 
      });
    } else {
      res.status(401).json({ success: false, error: "Identifiants incorrects" });
    }
  });

  app.get("/api/auth/me", authenticateToken, (req: any, res: any) => {
    const user = db.prepare("SELECT id, nom, email, role, approuve, permissions, enseignant_id, eleve_id, google_id, school_id FROM utilisateurs WHERE id = ?").get(req.user.id) as any;
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
    
    // Get default permissions for role
    const rolePerms = db.prepare("SELECT permissions FROM role_permissions WHERE role = ? AND school_id = ?").get(user.role, user.school_id) as any;
    const defaultPermissions = rolePerms ? JSON.parse(rolePerms.permissions) : [];

    try {
      if (user.permissions) {
        user.permissions = JSON.parse(user.permissions);
      } else {
        user.permissions = defaultPermissions;
      }
    } catch (e) {
      user.permissions = defaultPermissions;
    }
    
    res.json(user);
  });

  app.get("/api/fedapay-test", async (req, res) => {
    try {
      console.log("Testing FedaPay with SK:", FEDAPAY_SK ? "PROVIDED (ends with " + FEDAPAY_SK.slice(-4) + ")" : "MISSING");
      
      if (!Transaction) {
        return res.status(500).json({ error: "Transaction class not found in fedapay library" });
      }

      const testTransaction = await Transaction.create({
        amount: 100,
        description: "Test transaction",
        currency: "XOF",
        customer: { email: "test@example.com" }
      });
      
      const token = await testTransaction.generateToken();
      res.json({ status: "success", transaction_id: testTransaction.id, url: token.url });
    } catch (e: any) {
      res.status(500).json({ 
        status: "error", 
        message: e.message, 
        details: e.response?.data || null 
      });
    }
  });

  app.post("/api/auth/subscribe", async (req, res) => {
    const { 
      plan_name, amount, password,
      nom, prenom, telephone, email_perso, date_naissance, sexe,
      nom_ecole, slogan, email_ecole, adresse_ecole
    } = req.body;
    
    if (!email_perso || !plan_name || !amount || !password || !nom_ecole) {
      return res.status(400).json({ error: "Champs requis manquants" });
    }

    if (!FEDAPAY_SK || !FEDAPAY_PUBLIC) {
      return res.status(500).json({ error: "Le service de paiement (FedaPay) n'est pas configuré. Veuillez ajouter FEDAPAY_SECRET_KEY et FEDAPAY_PUBLIC_KEY dans les paramètres de l'application." });
    }

    if (FEDAPAY_SK.includes('sk_test_...')) {
      return res.status(400).json({ 
        error: "Configuration Incomplète", 
        message: "Vous utilisez des clefs API FedaPay factices (sk_test_...). Pour que le paiement fonctionne, vous devez créer un compte sur FedaPay, récupérer vos clefs API (Secret et Public) en mode Sandbox, et les renseigner dans le menu 'Settings' (Paramètres) de cette application." 
      });
    }

    try {
      // Ensure FedaPay is initialized with keys from env (extra safety)
      if (FEDAPAY_SK && FedaPayInstance && (FedaPayInstance as any).setApiKey) {
        (FedaPayInstance as any).setApiKey(FEDAPAY_SK);
        (FedaPayInstance as any).setEnvironment(FEDAPAY_MODE);
        if (FEDAPAY_MODE === 'sandbox') {
          (FedaPayInstance as any).setVerifySsl(false);
        }
      }

      // Check if email already has an active subscription or account
      const existingUser = db.prepare("SELECT id FROM utilisateurs WHERE email = ?").get(email_perso);
      if (existingUser) {
        return res.status(400).json({ error: "Cet email est déjà associé à un compte utilisateur." });
      }

      console.log(`Initiating FedaPay transaction for ${email_perso}, amount: ${amount}`);
      
      const transactionPayload = {
        amount: Math.round(Number(amount)),
        description: `Abonnement MégafixaEduc Pro`,
        callback_url: `${APP_URL}/signup-verify?email=${encodeURIComponent(email_perso)}&ref={ID}`,
        customer: { 
          email: email_perso, 
          firstname: prenom || 'Client', 
          lastname: nom || 'Mégafixa',
          phone_number: {
            number: telephone || '00000000',
            country: 'BJ' // Benin default, adjust if needed
          }
        },
        currency: 'XOF'
      };

      console.log("Transaction payload:", JSON.stringify(transactionPayload, null, 2));
      
      const transaction = await Transaction.create(transactionPayload);
      console.log("FedaPay transaction created successfully:", transaction.id);

      const token = await transaction.generateToken();
      console.log("FedaPay token generated successfully:", token.url);

      const hashedPassword = bcrypt.hashSync(password, 8);
      
      db.prepare(`
        INSERT INTO system_subscriptions (
          reference, email, plan_name, amount, status,
          nom_fondateur, prenom_fondateur, telephone_fondateur, email_fondateur, date_naissance_fondateur, sexe_fondateur,
          nom_ecole, slogan_ecole, email_ecole, adresse_ecole, hashed_password
        )
        VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        transaction.id, email_perso, plan_name, amount,
        nom, prenom, telephone, email_perso, date_naissance, sexe,
        nom_ecole, slogan, email_ecole, adresse_ecole, hashedPassword
      );

      res.json({ url: token.url, reference: transaction.id });
    } catch (error: any) {
      console.error("Subscription payment error:", error);
      
      let humanMessage = error.message;
      if (error.message && (error.message.includes('401') || error.message.toLowerCase().includes('unauthorized'))) {
        humanMessage = "Erreur d'authentification FedaPay (401). Veuillez vérifier que votre FEDAPAY_SECRET_KEY est correcte et active dans les Paramètres (Settings).";
      } else if (error.message && error.message.includes('500')) {
        humanMessage = "Erreur serveur chez FedaPay (500). Veuillez réessayer plus tard.";
      }

      const errorJson = {
        message: error.message,
        humanMessage,
        name: error.name,
        status: error.status,
        statusMessage: error.statusMessage,
        details: error.response?.data
      };
      console.error("Detailed FedaPay error info:", JSON.stringify(errorJson, null, 2));

      res.status(500).json({ 
        error: "Erreur lors de la création de la transaction de paiement.",
        message: humanMessage,
        details: error.response?.data || null
      });
    }
  });

  app.get("/api/config/kkiapay", (req, res) => {
    res.json({ publicKey: KKIAPAY_PUBLIC, mode: KKIAPAY_MODE });
  });

  app.post("/api/auth/subscribe-kkiapay", async (req: any, res) => {
    try {
      const { 
        transactionId,
        plan_name, amount, password, 
        nom, prenom, telephone, email_perso, date_naissance, sexe,
        nom_ecole, slogan, email_ecole, adresse_ecole
      } = req.body;

      if (!transactionId || !email_perso || !password || !nom_ecole) {
        return res.status(400).json({ error: "Champs requis manquants" });
      }

      if (!KKIAPAY_SECRET) {
        return res.status(500).json({ error: "Le service Kkiapay n'est pas configuré sur le serveur." });
      }

      console.log(`Verifying Kkiapay transaction ${transactionId} for ${email_perso}`);

      // Verify transaction with Kkiapay API
      // Native fetch is available in Node 18+
      const verifyRes = await fetch("https://api.kkiapay.me/api/v0/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": KKIAPAY_SECRET,
          "x-private-key": KKIAPAY_PRIVATE || KKIAPAY_SECRET,
          "x-secret-key": KKIAPAY_SECRET
        },
        body: JSON.stringify({ transactionId })
      });

      const verifyData: any = await verifyRes.json();
      console.log("Kkiapay verification response:", verifyData);

      if (verifyData.status !== "SUCCESS" && verifyData.status !== "COMPLETED") {
        return res.status(400).json({ error: "La transaction Kkiapay n'est pas valide ou a échoué." });
      }

      // Check if email already exists
      const existingUser = db.prepare("SELECT id FROM utilisateurs WHERE email = ?").get(email_perso);
      if (existingUser) {
        return res.status(400).json({ error: "Cet email est déjà associé à un compte utilisateur." });
      }

      const hashedPassword = bcrypt.hashSync(password, 8);
      const connectionKey = generateConnectionKey();
      
      db.transaction(() => {
        db.prepare(`
          INSERT INTO system_subscriptions (
            reference, email, plan_name, amount, status,
            nom_fondateur, prenom_fondateur, telephone_fondateur, email_fondateur, date_naissance_fondateur, sexe_fondateur,
            nom_ecole, slogan_ecole, email_ecole, adresse_ecole, hashed_password, license_key
          )
          VALUES (?, ?, ?, ?, 'paid', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          transactionId, email_perso, plan_name, amount,
          nom, prenom, telephone, email_perso, date_naissance, sexe,
          nom_ecole, slogan, email_ecole, adresse_ecole, hashedPassword, connectionKey
        );

        // Auto-approve and create school/admin
        const schoolResult = db.prepare(`
          INSERT INTO school_info (nom, slogan, adresse, email, telephone)
          VALUES (?, ?, ?, ?, ?)
        `).run(nom_ecole, slogan, adresse_ecole, email_ecole, telephone);
        
        const schoolId = schoolResult.lastInsertRowid;

        db.prepare(`
          INSERT INTO utilisateurs (nom, email, mot_de_passe, role, approuve, school_id, is_first_login, otp_code, license_key)
          VALUES (?, ?, ?, 'super_admin', 1, ?, 1, ?, ?)
        `).run(`${prenom} ${nom}`, email_perso, hashedPassword, schoolId, connectionKey, connectionKey);
        
        // Seed initial data for the new school
        db.prepare(`
          INSERT INTO annees_scolaires (libelle, date_debut, date_fin, est_active, school_id)
          VALUES (?, ?, ?, 1, ?)
        `).run('2024-2025', '2024-09-01', '2025-07-31', schoolId);
      })();

      // Send confirmation email asynchronously
      sendSubscriptionConfirmation({
        reference: transactionId,
        email: email_perso,
        plan_name,
        amount,
        prenom_fondateur: prenom,
        nom_fondateur: nom,
        nom_ecole,
        slogan_ecole: slogan,
        email_ecole,
        adresse_ecole
      }, connectionKey);

      res.json({ 
        success: true, 
        message: "Abonnement validé ! Votre clé de connexion unique a été envoyée par email avec votre fiche d'abonnement." 
      });

    } catch (error: any) {
      console.error("Kkiapay subscription error:", error);
      res.status(500).json({ error: "Une erreur est survenue lors du traitement de l'abonnement Kkiapay." });
    }
  });

  app.post("/api/auth/subscribe-test", async (req: any, res) => {
    try {
      const { 
        plan_name, amount, password, 
        nom, prenom, telephone, email_perso, date_naissance, sexe,
        nom_ecole, slogan, email_ecole, adresse_ecole
      } = req.body;

      if (!email_perso || !password || !nom_ecole) {
        return res.status(400).json({ error: "Champs requis manquants" });
      }

      // Check if email already exists
      const existingUser = db.prepare("SELECT id FROM utilisateurs WHERE email = ?").get(email_perso);
      if (existingUser) {
        return res.status(400).json({ error: "Cet email est déjà associé à un compte utilisateur." });
      }

      const hashedPassword = bcrypt.hashSync(password, 8);
      const testRef = `TEST-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const connectionKey = generateConnectionKey();
      
      db.transaction(() => {
        db.prepare(`
          INSERT INTO system_subscriptions (
            reference, email, plan_name, amount, status,
            nom_fondateur, prenom_fondateur, telephone_fondateur, email_fondateur, date_naissance_fondateur, sexe_fondateur,
            nom_ecole, slogan_ecole, email_ecole, adresse_ecole, hashed_password, license_key
          )
          VALUES (?, ?, ?, ?, 'paid', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          testRef, email_perso, plan_name, amount,
          nom, prenom, telephone, email_perso, date_naissance, sexe,
          nom_ecole, slogan, email_ecole, adresse_ecole, hashedPassword, connectionKey
        );

        // Auto-approve and create school/admin
        const schoolResult = db.prepare(`
          INSERT INTO school_info (nom, slogan, adresse, email, telephone)
          VALUES (?, ?, ?, ?, ?)
        `).run(nom_ecole, slogan, adresse_ecole, email_ecole, telephone);
        
        const schoolId = schoolResult.lastInsertRowid;

        db.prepare(`
          INSERT INTO utilisateurs (nom, email, mot_de_passe, role, approuve, school_id, is_first_login, otp_code, license_key)
          VALUES (?, ?, ?, 'super_admin', 1, ?, 1, ?, ?)
        `).run(`${prenom} ${nom}`, email_perso, hashedPassword, schoolId, connectionKey, connectionKey);
        
        // Seed initial data
        db.prepare(`
          INSERT INTO annees_scolaires (libelle, date_debut, date_fin, est_active, school_id)
          VALUES (?, ?, ?, 1, ?)
        `).run('2024-2025', '2024-09-01', '2025-07-31', schoolId);
      })();

      // Send confirmation email
      sendSubscriptionConfirmation({
        reference: testRef,
        email: email_perso,
        plan_name,
        amount,
        prenom_fondateur: prenom,
        nom_fondateur: nom,
        nom_ecole,
        slogan_ecole: slogan,
        email_ecole,
        adresse_ecole
      }, connectionKey);

      res.json({ 
        success: true, 
        message: "COMPTE TEST CRÉÉ ! Votre clé de connexion unique a été envoyée par email." 
      });

    } catch (error: any) {
      console.error("Test subscription error:", error);
      res.status(500).json({ error: "Erreur lors de la création du compte test." });
    }
  });

  app.get("/api/auth/verify-subscription", (req, res) => {
    const { email, reference } = req.query;
    if (!email || !reference) return res.status(400).json({ error: "Email et référence requis" });
    const subscription = db.prepare(`
      SELECT * FROM system_subscriptions 
      WHERE email = ? AND reference = ? AND (status = 'approved' OR status = 'Terminé')
    `).get(email, reference);
    if (subscription) {
      res.json({ valid: true, plan: (subscription as any).plan_name });
    } else {
      res.json({ valid: false });
    }
  });

  app.post("/api/auth/signup", async (req, res) => {
    const { nom, email, password, schoolName, subscription_ref } = req.body;
    if (!nom || !email || !password || !schoolName) {
      return res.status(400).json({ success: false, error: "Tous les champs sont requis" });
    }
    
    // Check subscription
    const sub = db.prepare("SELECT * FROM system_subscriptions WHERE email = ? AND reference = ? AND (status = 'approved' OR status = 'Terminé')").get(email, subscription_ref);
    if (!sub) {
      return res.status(403).json({ success: false, error: "Veuillez vous abonner avec cet email avant de créer un compte." });
    }

    try {
      const hashedPassword = bcrypt.hashSync(password, 8);
      
      // Create school first
      const schoolInfo = db.prepare("INSERT INTO school_info (nom) VALUES (?)").run(schoolName);
      const schoolId = schoolInfo.lastInsertRowid;

      // Seed default role permissions for the new school
      const allPaths = [
        '/', '/classes', '/eleves', '/promotions', '/enseignants', 
        '/matieres', '/notes', '/paiements', '/emploi-du-temps', 
        '/ecole', '/parametres', '/audit-logs', '/alertes'
      ];

      const defaultPermissions = {
        admin: allPaths.map(path => ({ path, can_write: true })),
        secretariat: [
          { path: '/', can_write: true },
          { path: '/classes', can_write: true },
          { path: '/eleves', can_write: true },
          { path: '/promotions', can_write: true },
          { path: '/enseignants', can_write: false },
          { path: '/matieres', can_write: false },
          { path: '/notes', can_write: true },
          { path: '/emploi-du-temps', can_write: true },
          { path: '/alertes', can_write: true }
        ],
        enseignant: [
          { path: '/', can_write: false },
          { path: '/eleves', can_write: false },
          { path: '/notes', can_write: true },
          { path: '/emploi-du-temps', can_write: false }
        ],
        comptable: [
          { path: '/', can_write: false },
          { path: '/eleves', can_write: false },
          { path: '/paiements', can_write: true }
        ]
      };

      const insertRolePerm = db.prepare("INSERT INTO role_permissions (role, permissions, school_id) VALUES (?, ?, ?)");
      Object.entries(defaultPermissions).forEach(([role, perms]) => {
        insertRolePerm.run(role, JSON.stringify(perms), schoolId);
      });

      // Seed default academic year for the new school
      const currentLibelle = getCurrentAcademicYearLibelle();
      const now = new Date();
      const dateDebut = new Date(now.getFullYear(), 8, 1).toISOString().split('T')[0]; // Sept 1st
      const dateFin = new Date(now.getFullYear() + 1, 6, 31).toISOString().split('T')[0]; // July 31st
      db.prepare("INSERT INTO annees_scolaires (libelle, date_debut, date_fin, est_active, school_id) VALUES (?, ?, ?, 1, ?)").run(currentLibelle, dateDebut, dateFin, schoolId);

      // Generate OTP for email validation
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otp_expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      // New signups require email confirmation (approuve = 0, is_first_login = 1)
      const info = db.prepare("INSERT INTO utilisateurs (nom, email, mot_de_passe, role, approuve, is_first_login, can_write, school_id, otp_code, otp_expiry) VALUES (?, ?, ?, 'admin', 0, 1, 1, ?, ?, ?)")
        .run(nom, email, hashedPassword, schoolId, otp, otp_expiry);
      
      logActivity(info.lastInsertRowid as number, 'SIGNUP_ADMIN', 'USER', info.lastInsertRowid as number, { email, schoolId }, schoolId as number);
      
      try {
        const transporter = await createMailTransporter();
        if (transporter) {
          const body = `Bonjour ${nom},\n\nBienvenue sur MégafixaEduc Pro.\n\nVotre compte a été créé avec succès pour l'établissement ${schoolName}.\n\nCode de confirmation (OTP) : ${otp}\n\nVeuillez utiliser ce code lors de votre première connexion pour valider votre adresse email.\n\nCe code expire dans 24 heures.\n\nL'équipe MégafixaEduc`;
          await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"MégafixaEduc" <noreply@megafixa.com>',
            to: email,
            subject: "Validation de votre compte MégafixaEduc Pro",
            text: body
          });
        }
      } catch (mailErr) {
        console.error("Failed to send signup OTP email:", mailErr);
      }

      // Sync new data to cloud immediately
      syncCriticalDataToCloud().catch(err => console.error("Immediate sync error:", err));
      
      res.json({ success: true, id: info.lastInsertRowid });
    } catch (err: any) {
      console.error("Signup error:", err);
      if (err.message && err.message.includes("UNIQUE constraint failed")) {
        return res.status(400).json({ success: false, error: "Cet email est déjà utilisé" });
      }
      res.status(500).json({ success: false, error: "Une erreur est survenue lors de la création du compte: " + err.message });
    }
  });

  // Notifications
  app.get("/api/notifications", authenticateToken, (req: any, res) => {
    try {
      // Auto-cleanup: delete notifications older than 7 days
      db.prepare("DELETE FROM notifications WHERE date_creation <= datetime('now', '-7 days')").run();

      const notifications = db.prepare(`
        SELECT * FROM notifications 
        WHERE utilisateur_id = ? AND school_id = ?
        ORDER BY date_creation DESC
        LIMIT 50
      `).all(req.user.id, req.schoolId);
      res.json(notifications);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/notifications/:id", authenticateToken, (req: any, res) => {
    try {
      db.prepare(`
        DELETE FROM notifications 
        WHERE id = ? AND utilisateur_id = ? AND school_id = ?
      `).run(req.params.id, req.user.id, req.schoolId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/notifications/read-all", authenticateToken, (req: any, res) => {
    try {
      db.prepare(`
        UPDATE notifications 
        SET lu = 1 
        WHERE utilisateur_id = ? AND school_id = ?
      `).run(req.user.id, req.schoolId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/notifications/:id/read", authenticateToken, (req: any, res) => {
    try {
      db.prepare(`
        UPDATE notifications 
        SET lu = 1 
        WHERE id = ? AND utilisateur_id = ? AND school_id = ?
      `).run(req.params.id, req.user.id, req.schoolId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Notifications Helper
  function createNotification(utilisateur_id: number, titre: string, message: string, type: string = 'info', lien: string | null = null, school_id: number) {
    try {
      db.prepare(`
        INSERT INTO notifications (utilisateur_id, titre, message, type, lien, school_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(utilisateur_id, titre, message, type, lien, school_id);
    } catch (err) {
      console.error("Failed to create notification:", err);
    }
  }

  function broadcastNotification(roles: string[], titre: string, message: string, type: string = 'info', lien: string | null = null, school_id: number) {
    try {
      let users;
      if (roles.includes('all')) {
        users = db.prepare(`SELECT id FROM utilisateurs WHERE school_id = ?`).all(school_id) as any[];
      } else {
        const placeholders = roles.map(() => '?').join(',');
        users = db.prepare(`SELECT id FROM utilisateurs WHERE role IN (${placeholders}) AND school_id = ?`).all(...roles, school_id) as any[];
      }
      
      const stmt = db.prepare(`
        INSERT INTO notifications (utilisateur_id, titre, message, type, lien, school_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      db.transaction(() => {
        for (const user of users) {
          stmt.run(user.id, titre, message, type, lien, school_id);
        }
      })();
    } catch (err) {
      console.error("Failed to broadcast notification:", err);
    }
  }

  // Alertes
  app.get("/api/alertes", authenticateToken, (req: any, res) => {
    const yearId = getActiveYearId(req.schoolId);
    const manualAlertes = db.prepare("SELECT *, 'manual' as type FROM alertes WHERE school_id = ? ORDER BY date_alerte DESC").all(req.schoolId);
    
    // Planned Activities (Planning Annuel)
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const futureLimit = new Date();
    futureLimit.setDate(today.getDate() + 30); // 30 days window
    const futureLimitStr = futureLimit.toISOString().split('T')[0];

    const plannedActivities = db.prepare(`
      SELECT * FROM activites_scolaires 
      WHERE annee_id = ? AND school_id = ?
      AND (
        (date_debut >= ? AND date_debut <= ?) OR
        (date_fin >= ? AND date_fin <= ?) OR
        (date_debut <= ? AND date_fin >= ?)
      )
      ORDER BY date_debut ASC
    `).all(yearId, req.schoolId, todayStr, futureLimitStr, todayStr, futureLimitStr, todayStr, todayStr);

    const activityAlertes = plannedActivities.map((a: any) => {
      const isToday = a.date_debut === todayStr;
      const isOngoing = a.date_debut <= todayStr && (a.date_fin ? a.date_fin >= todayStr : true);
      
      let status = "À venir";
      if (isToday) status = "Aujourd'hui";
      else if (isOngoing) status = "En cours";

      return {
        id: `act-${a.id}`,
        titre: `${status}: ${a.titre}`,
        description: `${a.description || ''}${a.heure ? ' - Heure: ' + a.heure : ''}${a.date_fin ? ' - Jusqu\'au ' + a.date_fin : ''}`,
        importance: a.type === 'evaluation' ? 'high' : (a.type === 'conge' ? 'medium' : 'normal'),
        type: 'activity',
        date: a.date_debut
      };
    });

    // Meetings (Reunions table)
    const upcomingReunions = db.prepare(`
      SELECT * FROM reunions 
      WHERE date_reunion >= ? AND date_reunion <= ? AND school_id = ?
      ORDER BY date_reunion ASC
    `).all(todayStr, futureLimitStr, req.schoolId);

    const reunionAlertes = upcomingReunions.map((r: any) => ({
      id: `reu-${r.id}`,
      titre: `Réunion: ${r.titre}`,
      description: `${r.description || ''} - Lieu: ${r.lieu || 'N/A'} - Heure: ${r.heure_reunion || 'N/A'}`,
      importance: 'medium',
      type: 'reunion',
      date: r.date_reunion
    }));

    // Evaluations (Devoirs table)
    const upcomingDevoirs = db.prepare(`
      SELECT d.*, m.nom as matiere_nom, c.nom as classe_nom 
      FROM devoirs d
      JOIN matieres m ON d.matiere_id = m.id
      JOIN classes c ON d.classe_id = c.id
      WHERE d.date_echeance >= ? AND d.date_echeance <= ? AND d.school_id = ?
      ORDER BY d.date_echeance ASC
    `).all(todayStr, futureLimitStr, req.schoolId);

    const devoirAlertes = upcomingDevoirs.map((d: any) => ({
      id: `dev-${d.id}`,
      titre: `Évaluation: ${d.titre}`,
      description: `Matière: ${d.matiere_nom} - Classe: ${d.classe_nom} - Échéance: ${d.date_echeance}`,
      importance: 'high',
      type: 'devoir',
      date: d.date_echeance
    }));

    // Payment Deadlines
    const activeYear = db.prepare("SELECT * FROM annees_scolaires WHERE id = ?").get(yearId) as any;
    const paymentAlertes: any[] = [];

    if (activeYear) {
      if (activeYear.date_limite_inscription && activeYear.date_limite_inscription >= todayStr && activeYear.date_limite_inscription <= futureLimitStr) {
        paymentAlertes.push({
          id: 'pay-limit-insc',
          titre: `Date limite Inscription: ${activeYear.date_limite_inscription}`,
          description: "Dernier délai pour le règlement des frais d'inscription.",
          importance: 'high',
          type: 'payment_limit',
          date: activeYear.date_limite_inscription
        });
      }
      if (activeYear.date_limite_scolarite && activeYear.date_limite_scolarite >= todayStr && activeYear.date_limite_scolarite <= futureLimitStr) {
        paymentAlertes.push({
          id: 'pay-limit-scol',
          titre: `Date limite Scolarité: ${activeYear.date_limite_scolarite}`,
          description: "Dernier délai pour le règlement des frais de scolarité.",
          importance: 'high',
          type: 'payment_limit',
          date: activeYear.date_limite_scolarite
        });
      }
    }

    res.json([...manualAlertes, ...activityAlertes, ...reunionAlertes, ...devoirAlertes, ...paymentAlertes]);
  });

  app.post("/api/alertes", authenticateToken, (req: any, res) => {
    const { titre, description, importance } = req.body;
    const info = db.prepare("INSERT INTO alertes (titre, description, importance, school_id) VALUES (?, ?, ?, ?)")
      .run(titre, description, importance, req.schoolId);
    
    broadcastNotification(['all'], "Nouvelle Alerte : " + titre, description || 'Veuillez consulter les alertes pour plus de détails.', importance === 'high' ? 'warning' : 'info', '/alertes', req.schoolId);
    
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/alertes/:id", authenticateToken, (req: any, res) => {
    const { id } = req.params;
    const { titre, description, importance } = req.body;
    db.prepare("UPDATE alertes SET titre = ?, description = ?, importance = ? WHERE id = ? AND school_id = ?")
      .run(titre, description, importance, id, req.schoolId);
    res.json({ success: true });
  });

  app.delete("/api/alertes/:id", authenticateToken, (req: any, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM alertes WHERE id = ? AND school_id = ?").run(id, req.schoolId);
    res.json({ success: true });
  });

  app.post("/api/alertes/:id/approve", authenticateToken, (req: any, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM alertes WHERE id = ? AND school_id = ?").run(id, req.schoolId);
    res.json({ success: true });
  });

  app.post("/api/alertes/:id/refuse", authenticateToken, (req: any, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM alertes WHERE id = ? AND school_id = ?").run(id, req.schoolId);
    res.json({ success: true });
  });

  // Payment Summary per Class
  app.get("/api/stats/paiements-par-classe", authenticateToken, (req: any, res) => {
    const yearId = getActiveYearId(req.schoolId);
    const stats = db.prepare(`
      SELECT 
        c.id, 
        c.nom, 
        c.devise,
        c.frais_scolarite,
        c.frais_inscription,
        COUNT(e.id) as nombre_eleves,
        IFNULL(SUM(p_scol.total_paye), 0) as total_encaisse_scolarite,
        IFNULL(SUM(p_insc.total_paye), 0) as total_encaisse_inscription
      FROM classes c
      LEFT JOIN eleves e ON c.id = e.classe_id AND e.school_id = ?
      LEFT JOIN (
        SELECT eleve_id, SUM(montant) as total_paye 
        FROM paiements 
        WHERE type_paiement = 'Frais de scolarité' AND annee_id = ? AND school_id = ?
        AND (status = 'Terminé' OR status = 'completed')
        GROUP BY eleve_id
      ) p_scol ON e.id = p_scol.eleve_id
      LEFT JOIN (
        SELECT eleve_id, SUM(montant) as total_paye 
        FROM paiements 
        WHERE type_paiement = 'Frais d''inscription' AND annee_id = ? AND school_id = ?
        AND (status = 'Terminé' OR status = 'completed')
        GROUP BY eleve_id
      ) p_insc ON e.id = p_insc.eleve_id
      WHERE c.annee_id = ? AND c.school_id = ?
      GROUP BY c.id
    `).all(req.schoolId, yearId, req.schoolId, yearId, req.schoolId, yearId, req.schoolId);
    
    res.json(stats);
  });

  // Notes
  app.get("/api/notes/:classeId", authenticateToken, (req: any, res) => {
    const { classeId } = req.params;
    res.json(db.prepare(`
      SELECT n.*, e.nom, e.prenom, m.nom as matiere_nom 
      FROM notes n 
      JOIN eleves e ON n.eleve_id = e.id 
      JOIN matieres m ON n.matiere_id = m.id
      WHERE e.classe_id = ? AND n.school_id = ?
    `).all(classeId, req.schoolId));
  });

  app.get("/api/notes/eleve/:eleveId/matiere/:matiereId/trimestre/:trimestre", authenticateToken, (req: any, res) => {
    const { eleveId, matiereId, trimestre } = req.params;
    const yearId = getActiveYearId(req.schoolId);
    res.json(db.prepare(`
      SELECT * FROM notes 
      WHERE eleve_id = ? AND matiere_id = ? AND trimestre = ? AND annee_id = ? AND school_id = ?
    `).all(eleveId, matiereId, trimestre, yearId, req.schoolId));
  });

  app.post("/api/notes", authenticateToken, (req: any, res) => {
    const { eleve_id, matiere_id, notes, date_evaluation, trimestre, enseignant_id } = req.body;
    
    // If enseignant_id is provided, check if they teach this matiere
    if (enseignant_id) {
       const isAllowed = db.prepare("SELECT 1 FROM enseignant_matieres WHERE enseignant_id = ? AND matiere_id = ? AND school_id = ?").get(enseignant_id, matiere_id, req.schoolId);
       if (!isAllowed) {
         return res.status(403).json({ error: "Vous n'êtes pas autorisé à saisir des notes pour cette matière." });
       }
    }

    const yearId = getActiveYearId(req.schoolId);
    
    const insertOrReplace = db.prepare(`
      INSERT INTO notes (eleve_id, matiere_id, type_evaluation, note, date_evaluation, annee_id, trimestre, enseignant_id, school_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(eleve_id, matiere_id, type_evaluation, annee_id, trimestre, school_id) 
      DO UPDATE SET note = excluded.note, date_evaluation = excluded.date_evaluation, enseignant_id = excluded.enseignant_id
    `);

    const transaction = db.transaction((notesList) => {
      for (const n of notesList) {
        if (n.note !== '' && n.note !== null) {
          insertOrReplace.run(eleve_id, matiere_id, n.type, n.note, date_evaluation, yearId, trimestre || 1, enseignant_id, req.schoolId);
        }
      }
    });

    try {
      if (Array.isArray(notes)) {
        transaction(notes);
      } else {
        // Fallback for single note if needed
        const { type_evaluation, note } = req.body;
        insertOrReplace.run(eleve_id, matiere_id, type_evaluation, note, date_evaluation, yearId, trimestre || 1, enseignant_id, req.schoolId);
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/notes/bulk", authenticateToken, (req: any, res) => {
    const { data, matiere_id, trimestre, date_evaluation, enseignant_id } = req.body;
    
    if (enseignant_id) {
       const isAllowed = db.prepare("SELECT 1 FROM enseignant_matieres WHERE enseignant_id = ? AND matiere_id = ? AND school_id = ?").get(enseignant_id, matiere_id, req.schoolId);
       if (!isAllowed) {
         return res.status(403).json({ error: "Vous n'êtes pas autorisé à saisir des notes pour cette matière." });
       }
    }

    const yearId = getActiveYearId(req.schoolId);
    
    const insertOrReplace = db.prepare(`
      INSERT INTO notes (eleve_id, matiere_id, type_evaluation, note, date_evaluation, annee_id, trimestre, enseignant_id, school_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(eleve_id, matiere_id, type_evaluation, annee_id, trimestre, school_id) 
      DO UPDATE SET note = excluded.note, date_evaluation = excluded.date_evaluation, enseignant_id = excluded.enseignant_id
    `);

    const transaction = db.transaction((bulkData) => {
      for (const student of bulkData) {
        for (const n of student.notes) {
          if (n.note !== '' && n.note !== null) {
            insertOrReplace.run(student.eleve_id, matiere_id, n.type, n.note, date_evaluation, yearId, trimestre || 1, enseignant_id, req.schoolId);
          }
        }
      }
    });

    try {
      transaction(data);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Bulk notes error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Classes Delete
  app.delete("/api/classes/:id", authenticateToken, (req: any, res) => {
    const { id } = req.params;
    
    // Check if class has students
    const elevesCount = db.prepare("SELECT COUNT(*) as count FROM eleves WHERE classe_id = ? AND school_id = ?").get(id, req.schoolId) as any;
    if (elevesCount && elevesCount.count > 0) {
      return res.status(400).json({ error: "Cette classe contient des élèves et ne peut pas être supprimée." });
    }

    // Delete related records
    db.prepare("DELETE FROM classe_matieres WHERE classe_id = ? AND school_id = ?").run(id, req.schoolId);
    db.prepare("DELETE FROM emplois_du_temps WHERE classe_id = ? AND school_id = ?").run(id, req.schoolId);
    db.prepare("DELETE FROM devoirs WHERE classe_id = ? AND school_id = ?").run(id, req.schoolId);
    
    db.prepare("DELETE FROM classes WHERE id = ? AND school_id = ?").run(id, req.schoolId);
    res.json({ success: true });
  });

  // Paiements
  app.get("/api/paiements", authenticateToken, requireRole(['admin', 'super_admin', 'comptable', 'secretariat', 'secretaire']), (req: any, res) => {
    const yearId = getActiveYearId(req.schoolId);
    res.json(db.prepare(`
      SELECT p.*, e.nom, e.prenom 
      FROM paiements p 
      JOIN eleves e ON p.eleve_id = e.id 
      WHERE p.annee_id = ? AND p.school_id = ?
    `).all(yearId, req.schoolId));
  });

  app.post("/api/paiements/fedapay", authenticateToken, requireRole(['admin', 'super_admin', 'comptable', 'parent']), async (req: any, res) => {
    try {
      const { eleve_id, type_paiement, montant, date_paiement, student_name } = req.body;
      const yearId = getActiveYearId(req.schoolId);
      
      // Get School FedaPay config
      const school = db.prepare("SELECT fedapay_public_key, fedapay_secret_key, fedapay_mode FROM school_info WHERE id = ?").get(req.schoolId) as any;
      
      const targetSK = school?.fedapay_secret_key || FEDAPAY_SK;
      const targetMode = school?.fedapay_mode || FEDAPAY_MODE;

      if (!targetSK) {
          throw new Error('FedaPay n\'est pas configuré. Veuillez renseigner vos clés API dans Infos École > Paiements.');
      }

      // Re-initialize for this school
      if (FedaPayInstance && (FedaPayInstance as any).setApiKey) {
        (FedaPayInstance as any).setApiKey(targetSK);
        (FedaPayInstance as any).setEnvironment(targetMode);
      }

      const safeStudentName = student_name || "Élève";
      const studentData = db.prepare("SELECT email_parent FROM eleves WHERE id = ?").get(eleve_id) as any;

      const transaction = await Transaction.create({
        description: `${type_paiement} pour ${safeStudentName}`,
        amount: Number(montant),
        currency: 'XOF',
        callback_url: `${APP_URL}/paiements`,
        customer: {
          firstname: safeStudentName.split(' ')[0],
          lastname: safeStudentName.split(' ').slice(1).join(' ') || 'Élève',
          email: studentData?.email_parent || 'contact@ecole.com',
          phone_number: {
            number: '00000000',
            country: 'BJ'
          }
        }
      });

      const token = await transaction.generateToken();

      const info = db.prepare(`
        INSERT INTO paiements (eleve_id, type_paiement, montant, date_paiement, annee_id, methode, status, reference_transaction, school_id) 
        VALUES (?, ?, ?, ?, ?, 'FedaPay', 'En cours', ?, ?)
      `).run(eleve_id, type_paiement, montant, date_paiement, yearId, transaction.id, req.schoolId);
      
      res.json({ url: token.url });
    } catch (error: any) {
      console.error("FedaPay error:", error);
      
      let humanMessage = error.message;
      if (error.message && (error.message.includes('401') || error.message.toLowerCase().includes('unauthorized'))) {
        humanMessage = "Erreur d'authentification FedaPay (401). Veuillez vérifier que votre FEDAPAY_SECRET_KEY est correcte et active dans les Paramètres (Settings).";
      } else if (error.message && error.message.includes('500')) {
        humanMessage = "Erreur serveur chez FedaPay (500). Veuillez réessayer plus tard.";
      }

      res.status(500).json({ 
        error: "Erreur lors de la création de la transaction de paiement.",
        message: humanMessage,
        details: error.response?.data || null
      });
    }
  });

  app.post("/api/paiements/kkiapay/verify", authenticateToken, requireRole(['admin', 'super_admin', 'comptable', 'parent']), async (req: any, res) => {
    try {
      const { transactionId, eleve_id, type_paiement, montant, date_paiement } = req.body;
      const yearId = getActiveYearId(req.schoolId);
      
      // Get School Kkiapay config
      const school = db.prepare("SELECT kkiapay_secret_key FROM school_info WHERE id = ?").get(req.schoolId) as any;
      const secretKey = school?.kkiapay_secret_key;

      if (!secretKey) {
        return res.status(400).json({ success: false, error: "Kkiapay n'est pas configuré pour cette école." });
      }

      // Verify transaction with Kkiapay
      const response = await fetch(`https://api.kkiapay.me/api/v1/transactions/verify/${transactionId}`, {
        headers: {
          'x-api-key': secretKey,
          'Accept': 'application/json'
        }
      });

      const data = await response.json();

      if (data && data.status === 'SUCCESS') {
        const montantVerse = data.amount;
        
        // Record the payment
        const info = db.prepare(`
          INSERT INTO paiements (eleve_id, type_paiement, montant, date_paiement, annee_id, methode, status, reference_transaction, school_id) 
          VALUES (?, ?, ?, ?, ?, 'Kkiapay', 'Terminé', ?, ?)
        `).run(eleve_id, type_paiement, montantVerse, date_paiement, yearId, transactionId, req.schoolId);

        logActivity(req.userId, 'CREATE', 'PAIEMENT', info.lastInsertRowid as number, { eleve_id, montant: montantVerse }, req.schoolId);
        
        res.json({ success: true, paymentId: info.lastInsertRowid });
      } else {
        res.status(400).json({ success: false, error: "Transaction non valide ou échouée", details: data });
      }
    } catch (error: any) {
      console.error("Kkiapay verify error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/paiements/fedapay/webhook", async (req, res) => {
    try {
      const { id, status, name } = req.body;
      const eventName = name || req.body.event;
      const transactionId = id || req.body.entity?.id;
      
      console.log("FedaPay Webhook received:", eventName, transactionId);

      if (status === 'approved' || eventName === 'transaction.approved') {
        const transaction = await Transaction.retrieve(transactionId);
        if (transaction && transaction.status === 'approved') {
          // School payments update
          db.prepare("UPDATE paiements SET status = 'Terminé', date_paiement = ? WHERE reference_transaction = ?")
            .run(new Date().toISOString(), transactionId);
          
          // System Subscriptions update
          const sub = db.prepare("SELECT * FROM system_subscriptions WHERE reference = ?").get(transactionId) as any;
          if (sub && sub.status === 'pending') {
            const licenseKey = generateConnectionKey();
            
            db.prepare("UPDATE system_subscriptions SET status = 'Terminé', license_key = ?, updated_at = CURRENT_TIMESTAMP WHERE reference = ?")
              .run(licenseKey, transactionId);

            // Create School
            const schoolResult = db.prepare("INSERT INTO school_info (nom, email, adresse, slogan) VALUES (?, ?, ?, ?)").run(sub.nom_ecole, sub.email_ecole, sub.adresse_ecole, sub.slogan_ecole);
            const schoolId = schoolResult.lastInsertRowid;

            // Seed default permissions for generic school creation (simplified for this automation)
            const allPaths = ['/', '/classes', '/eleves', '/promotions', '/enseignants', '/matieres', '/notes', '/paiements', '/emploi-du-temps', '/ecole', '/parametres', '/audit-logs', '/alertes'];
            const adminPerms = JSON.stringify(allPaths.map(p => ({ path: p, can_write: true })));
            
            db.prepare("INSERT INTO role_permissions (role, permissions, school_id) VALUES (?, ?, ?)")
              .run('admin', adminPerms, schoolId);

            // Create Initial Admin User
            db.prepare(`
              INSERT INTO utilisateurs (nom, email, mot_de_passe, role, approuve, school_id, is_first_login, license_key, otp_code)
              VALUES (?, ?, ?, 'admin', 1, ?, 1, ?, ?)
            `).run(`${sub.prenom_fondateur} ${sub.nom_fondateur}`, sub.email_fondateur, sub.hashed_password, schoolId, licenseKey, licenseKey);

            // Send Confirmation Email with PDF
            sendSubscriptionConfirmation({
              reference: transactionId,
              email: sub.email_fondateur,
              plan_name: sub.plan_name,
              amount: sub.amount,
              prenom_fondateur: sub.prenom_fondateur,
              nom_fondateur: sub.nom_fondateur,
              nom_ecole: sub.nom_ecole,
              slogan_ecole: sub.slogan_ecole,
              email_ecole: sub.email_ecole,
              adresse_ecole: sub.adresse_ecole
            }, licenseKey);

            console.log(`Subscription approved and user created for transaction: ${transactionId}. Key: ${licenseKey}`);
          }
        }
      } else if (eventName === 'transaction.canceled' || eventName === 'transaction.failed' || status === 'canceled' || status === 'failed') {
        db.prepare("UPDATE paiements SET status = 'Échoué' WHERE reference_transaction = ?").run(transactionId);
        db.prepare("UPDATE system_subscriptions SET status = 'Échoué', updated_at = CURRENT_TIMESTAMP WHERE reference = ?")
            .run(transactionId);
        console.log(`Payment status updated to Échoué for transaction: ${transactionId}`);
      }
      res.status(200).send("OK");
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).send("Webhook failed");
    }
  });

  app.post("/api/paiements", authenticateToken, requireRole(['admin', 'super_admin', 'comptable']), (req: any, res) => {
    const { eleve_id, type_paiement, montant, date_paiement, methode } = req.body;
    const yearId = getActiveYearId(req.schoolId);
    const result = db.prepare("INSERT INTO paiements (eleve_id, type_paiement, montant, date_paiement, annee_id, methode, status, school_id) VALUES (?, ?, ?, ?, ?, ?, 'Terminé', ?)").run(
      eleve_id, type_paiement, montant, date_paiement, yearId, methode || 'Espèces', req.schoolId
    );
    const paiementId = result.lastInsertRowid;
    const eleve = db.prepare("SELECT nom, prenom FROM eleves WHERE id = ? AND school_id = ?").get(eleve_id, req.schoolId) as any;
    logActivity(req.userId, 'CREATE', 'PAIEMENT', paiementId as number, { eleve: eleve ? `${eleve.nom} ${eleve.prenom}` : 'Inconnu', type: type_paiement, montant }, req.schoolId);
    res.json({ id: paiementId });
  });

  app.get("/api/annees/:id/activites", authenticateToken, (req: any, res) => {
    const { id } = req.params;
    res.json(db.prepare("SELECT * FROM activites_scolaires WHERE annee_id = ? AND school_id = ? ORDER BY trimestre, date_debut").all(id, req.schoolId));
  });

  app.post("/api/activites", authenticateToken, requireRole(['admin', 'super_admin', 'secretariat', 'secretaire']), (req: any, res) => {
    const { annee_id, trimestre, type, titre, description, date_debut, date_fin, heure } = req.body;
    const result = db.prepare(`
      INSERT INTO activites_scolaires (annee_id, trimestre, type, titre, description, date_debut, date_fin, heure, school_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(annee_id, trimestre, type, titre, description, date_debut, date_fin, heure, req.schoolId);
    const activiteId = result.lastInsertRowid;
    logActivity(req.userId, 'CREATE', 'ACTIVITE', activiteId as number, { titre, type }, req.schoolId);
    
    // Broadcast notification for upcoming event
    broadcastNotification(['all'], "Nouvel événement planifié : " + titre, description || `Un nouvel événement a été ajouté au planning: ${date_debut}`, 'info', '/tableau-de-bord', req.schoolId);

    res.json({ id: activiteId });
  });

  app.put("/api/activites/:id", authenticateToken, requireRole(['admin', 'super_admin', 'secretariat', 'secretaire']), (req: any, res) => {
    const { id } = req.params;
    const { type, titre, description, date_debut, date_fin, heure, trimestre } = req.body;
    db.prepare(`
      UPDATE activites_scolaires 
      SET type = ?, titre = ?, description = ?, date_debut = ?, date_fin = ?, heure = ?, trimestre = ?
      WHERE id = ? AND school_id = ?
    `).run(type, titre, description, date_debut, date_fin, heure, trimestre, id, req.schoolId);
    res.json({ success: true });
  });

  app.delete("/api/activites/:id", authenticateToken, requireRole(['admin', 'super_admin']), (req: any, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM activites_scolaires WHERE id = ? AND school_id = ?").run(id, req.schoolId);
    res.json({ success: true });
  });

  // Academic Years
  app.get("/api/annees", authenticateToken, (req: any, res) => {
    const currentLibelle = getCurrentAcademicYearLibelle();
    const activeId = getActiveYearId(req.schoolId);
    const annees = db.prepare(`
      SELECT 
        a.*,
        (SELECT COUNT(*) FROM classes c WHERE c.annee_id = a.id AND c.school_id = ?) as classes_count,
        (SELECT COUNT(*) FROM eleves e JOIN classes c ON e.classe_id = c.id WHERE c.annee_id = a.id AND e.school_id = ?) as eleves_count
      FROM annees_scolaires a 
      WHERE a.school_id = ?
      ORDER BY libelle DESC
    `).all(req.schoolId, req.schoolId, req.schoolId);
    
    const enhancedAnnees = annees.map((a: any) => ({
      ...a,
      est_active_effective: a.id === activeId,
      est_annee_reelle: a.libelle === currentLibelle
    }));
    
    res.json(enhancedAnnees);
  });

  app.post("/api/annees", authenticateToken, requireRole(['admin', 'super_admin']), (req: any, res) => {
    const { libelle, date_debut, date_fin } = req.body;
    const result = db.prepare("INSERT INTO annees_scolaires (libelle, date_debut, date_fin, est_active, school_id) VALUES (?, ?, ?, ?, ?)").run(libelle, date_debut, date_fin, 0, req.schoolId);
    res.json({ id: result.lastInsertRowid });
  });

  app.patch("/api/annees/:id/cloturer", authenticateToken, requireRole(['admin', 'super_admin']), (req: any, res) => {
    const { id } = req.params;
    db.prepare("UPDATE annees_scolaires SET cloturee = 1, est_active = 0, archivee = 1 WHERE id = ? AND school_id = ?").run(id, req.schoolId);
    res.json({ success: true });
  });

  app.patch("/api/annees/:id/deadlines", authenticateToken, requireRole(['admin', 'super_admin']), (req: any, res) => {
    const { id } = req.params;
    const { date_limite_scolarite, date_limite_inscription } = req.body;
    db.prepare("UPDATE annees_scolaires SET date_limite_scolarite = ?, date_limite_inscription = ? WHERE id = ? AND school_id = ?")
      .run(date_limite_scolarite, date_limite_inscription, id, req.schoolId);
    res.json({ success: true });
  });

  app.patch("/api/annees/:id/activate", authenticateToken, requireRole(['admin', 'super_admin']), (req: any, res) => {
    const { id } = req.params;
    db.prepare("UPDATE annees_scolaires SET est_active = 0 WHERE school_id = ?").run(req.schoolId);
    db.prepare("UPDATE annees_scolaires SET est_active = 1 WHERE id = ? AND school_id = ?").run(id, req.schoolId);
    res.json({ success: true });
  });

  app.patch("/api/annees/:id/deactivate", authenticateToken, requireRole(['admin', 'super_admin']), (req: any, res) => {
    const { id } = req.params;
    db.prepare("UPDATE annees_scolaires SET est_active = 0 WHERE id = ? AND school_id = ?").run(id, req.schoolId);
    res.json({ success: true });
  });

  app.patch("/api/annees/:id/archive", authenticateToken, requireRole(['admin', 'super_admin']), (req: any, res) => {
    const { id } = req.params;
    db.prepare("UPDATE annees_scolaires SET archivee = 1, est_active = 0 WHERE id = ? AND school_id = ?").run(id, req.schoolId);
    res.json({ success: true });
  });

  app.patch("/api/annees/:id/unarchive", authenticateToken, requireRole(['admin', 'super_admin']), (req: any, res) => {
    const { id } = req.params;
    db.prepare("UPDATE annees_scolaires SET est_active = 0 WHERE school_id = ?").run(req.schoolId);
    db.prepare("UPDATE annees_scolaires SET archivee = 0, est_active = 1 WHERE id = ? AND school_id = ?").run(id, req.schoolId);
    res.json({ success: true });
  });

  app.delete("/api/annees/:id", authenticateToken, requireRole(['admin', 'super_admin']), (req: any, res) => {
    const { id } = req.params;
    const { force } = req.query;

    // Check if it's the active year
    const activeYear = db.prepare("SELECT id FROM annees_scolaires WHERE est_active = 1 AND id = ? AND school_id = ?").get(id, req.schoolId);
    if (activeYear) {
      return res.status(400).json({ error: "Impossible de supprimer l'année scolaire active. Veuillez d'abord activer une autre année." });
    }

    if (force === 'true') {
      // Recursive delete
      db.transaction(() => {
        // Delete notes
        db.prepare("DELETE FROM notes WHERE annee_id = ? AND school_id = ?").run(id, req.schoolId);
        // Delete payments
        db.prepare("DELETE FROM paiements WHERE annee_id = ? AND school_id = ?").run(id, req.schoolId);
        
        // Find classes to delete their students and timetable
        const classes = db.prepare("SELECT id FROM classes WHERE annee_id = ? AND school_id = ? ORDER BY nom").all(id, req.schoolId);
        for (const cls of classes as any) {
          db.prepare("DELETE FROM eleves WHERE classe_id = ? AND school_id = ?").run(cls.id, req.schoolId);
          db.prepare("DELETE FROM emplois_du_temps WHERE classe_id = ? AND school_id = ?").run(cls.id, req.schoolId);
          db.prepare("DELETE FROM classe_matieres WHERE classe_id = ? AND school_id = ?").run(cls.id, req.schoolId);
        }
        
        db.prepare("DELETE FROM classes WHERE annee_id = ? AND school_id = ?").run(id, req.schoolId);
        db.prepare("DELETE FROM annees_scolaires WHERE id = ? AND school_id = ?").run(id, req.schoolId);
      })();
      return res.json({ success: true, message: "Année et toutes ses données supprimées." });
    }

    // Standard check
    const classesCount = db.prepare("SELECT COUNT(*) as count FROM classes WHERE annee_id = ? AND school_id = ?").get(id, req.schoolId).count;
    const notesCount = db.prepare("SELECT COUNT(*) as count FROM notes WHERE annee_id = ? AND school_id = ?").get(id, req.schoolId).count;
    const paiementsCount = db.prepare("SELECT COUNT(*) as count FROM paiements WHERE annee_id = ? AND school_id = ?").get(id, req.schoolId).count;

    if (classesCount > 0 || notesCount > 0 || paiementsCount > 0) {
      return res.status(400).json({ 
        error: "Cette année contient des données (classes, élèves, notes ou paiements).", 
        canForce: true 
      });
    }
    
    db.prepare("DELETE FROM annees_scolaires WHERE id = ? AND school_id = ?").run(id, req.schoolId);
    res.json({ success: true });
  });

  app.get("/api/annees/active", authenticateToken, (req: any, res) => {
    // 1. Priority: Manually activated year
    let activeYear = db.prepare("SELECT * FROM annees_scolaires WHERE est_active = 1 AND archivee = 0 AND school_id = ?").get(req.schoolId);
    
    // 2. Fallback: Current real year if exists and not archived
    if (!activeYear) {
      const currentLibelle = getCurrentAcademicYearLibelle();
      activeYear = db.prepare("SELECT * FROM annees_scolaires WHERE libelle = ? AND archivee = 0 AND school_id = ?").get(currentLibelle, req.schoolId);
    }
    
    // 3. Fallback: Latest non-archived year
    if (!activeYear) {
      activeYear = db.prepare("SELECT * FROM annees_scolaires WHERE archivee = 0 AND school_id = ? ORDER BY libelle DESC LIMIT 1").get(req.schoolId);
    }

    res.json(activeYear || null);
  });

  app.post("/api/annees/import", authenticateToken, requireRole(['admin', 'super_admin']), (req: any, res) => {
    const { from_year_id, to_year_id } = req.body;
    
    try {
      db.transaction(() => {
        // Copy classes
        const classes = db.prepare("SELECT * FROM classes WHERE annee_id = ? AND school_id = ? ORDER BY nom").all(from_year_id, req.schoolId);
        for (const cls of classes as any) {
          const result = db.prepare("INSERT INTO classes (nom, niveau, annee_id, school_id) VALUES (?, ?, ?, ?)").run(cls.nom, cls.niveau, to_year_id, req.schoolId);
          const newClasseId = result.lastInsertRowid;

          // Copy subjects for this class
          const matieres = db.prepare("SELECT matiere_id, coefficient, heures_hebdo FROM classe_matieres WHERE classe_id = ? AND school_id = ?").all(cls.id, req.schoolId);
          for (const m of matieres as any) {
            db.prepare("INSERT INTO classe_matieres (classe_id, matiere_id, coefficient, heures_hebdo, school_id) VALUES (?, ?, ?, ?, ?)").run(newClasseId, m.matiere_id, m.coefficient || 1, m.heures_hebdo || 0, req.schoolId);
          }
        }
      })();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/annees/transition", authenticateToken, requireRole(['admin', 'super_admin']), (req: any, res) => {
    const { import_config } = req.body;
    const activeYear = db.prepare("SELECT * FROM annees_scolaires WHERE est_active = 1 AND school_id = ?").get(req.schoolId) as any;
    if (!activeYear) {
      return res.status(400).json({ error: "Aucune année active à faire évoluer." });
    }

    const parts = activeYear.libelle.split('-');
    if (parts.length !== 2) {
      return res.status(400).json({ error: "Format de libellé d'année invalide (attendu: YYYY-YYYY)." });
    }

    const nextStart = parseInt(parts[1]);
    const nextEnd = nextStart + 1;
    const nextLibelle = `${nextStart}-${nextEnd}`;

    const transitionTransaction = db.transaction(() => {
      // 1. Archive and Close current
      db.prepare("UPDATE annees_scolaires SET archivee = 1, est_active = 0, cloturee = 1 WHERE id = ? AND school_id = ?").run(activeYear.id, req.schoolId);

      // 2. Check if next already exists
      let nextYear = db.prepare("SELECT * FROM annees_scolaires WHERE libelle = ? AND school_id = ?").get(nextLibelle, req.schoolId) as any;
      let nextYearId;
      
      const nextDateDebut = `${nextStart}-09-01`;
      const nextDateFin = `${nextEnd}-07-31`;

      if (nextYear) {
        // Reactivate and set active
        db.prepare("UPDATE annees_scolaires SET archivee = 0, est_active = 1, cloturee = 0, date_debut = ?, date_fin = ? WHERE id = ? AND school_id = ?").run(nextDateDebut, nextDateFin, nextYear.id, req.schoolId);
        nextYearId = nextYear.id;
      } else {
        // Create and set active
        const result = db.prepare("INSERT INTO annees_scolaires (libelle, date_debut, date_fin, est_active, archivee, cloturee, school_id) VALUES (?, ?, ?, 1, 0, 0, ?)").run(nextLibelle, nextDateDebut, nextDateFin, req.schoolId);
        nextYearId = result.lastInsertRowid;
      }

      // 3. Optional import
      if (import_config) {
        const classes = db.prepare("SELECT * FROM classes WHERE annee_id = ? AND school_id = ? ORDER BY nom").all(activeYear.id, req.schoolId);
        for (const cls of classes as any) {
          const result = db.prepare("INSERT INTO classes (nom, niveau, annee_id, school_id) VALUES (?, ?, ?, ?)").run(cls.nom, cls.niveau, nextYearId, req.schoolId);
          const newClasseId = result.lastInsertRowid;
          const matieres = db.prepare("SELECT matiere_id, coefficient, heures_hebdo FROM classe_matieres WHERE classe_id = ? AND school_id = ?").all(cls.id, req.schoolId);
          for (const m of matieres as any) {
            db.prepare("INSERT INTO classe_matieres (classe_id, matiere_id, coefficient, heures_hebdo, school_id) VALUES (?, ?, ?, ?, ?)").run(newClasseId, m.matiere_id, m.coefficient || 1, m.heures_hebdo || 0, req.schoolId);
          }
        }
      }

      logActivity(req.userId, "TRANSITION", "annees_scolaires", nextYearId, { from: activeYear.libelle, to: nextLibelle, imported: !!import_config }, req.schoolId);
      return nextLibelle;
    });

    try {
      const resultLibelle = transitionTransaction();
      res.json({ success: true, nextLibelle: resultLibelle });
    } catch (error: any) {
      console.error("Transition error:", error);
      res.status(500).json({ error: "Erreur lors de la transition d'année scolaire: " + error.message });
    }
  });

  app.get("/api/audit-logs", authenticateToken, requireRole(['admin', 'super_admin']), (req: any, res) => {
    try {
      const logs = db.prepare(`
        SELECT a.*, u.nom as utilisateur_nom 
        FROM audit_logs a
        LEFT JOIN utilisateurs u ON a.utilisateur_id = u.id
        WHERE a.school_id = ?
        ORDER BY date_activite DESC LIMIT 100
      `).all(req.schoolId);
      res.json(logs);
    } catch (error: any) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/db/sync-cloud", authenticateToken, async (req: any, res) => {
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: "Accès refusé" });
    }
    try {
      await syncCriticalDataToCloud();
      res.json({ success: true, message: "Synchronisation réussie" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Help avoid HTML responses for missing API routes
  app.use("/api/*", (req: any, res: any, next: any) => {
    if (res.headersSent) return next();
    res.status(404).json({ 
      error: "API route not found", 
      path: req.originalUrl,
      method: req.method
    });
  });

  // Global Error Handler for APIs
  app.use((err: any, req: any, res: any, next: any) => {
    if (req.path.startsWith("/api/")) {
      console.error("API Error:", err);
      return res.status(500).json({ error: "Internal Server Error", message: err.message });
    }
    next(err);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Attempt to restore critical data from cloud on startup (Solid Backup)
    // We do this in a setTimeout to avoid blocking the main event loop during startup
    setTimeout(async () => {
      try {
        await restoreCriticalDataFromCloud();
        // Initial sync after possible restoration
        await syncCriticalDataToCloud();
      } catch (e) {
        console.error("Initial Cloud Backup/Restore error:", e);
      }
    }, 1000);
    
    // Periodic sync every 10 minutes
    setInterval(() => {
      syncCriticalDataToCloud().catch(err => console.error("Periodic sync error:", err));
    }, 10 * 60 * 1000);
  }).on('error', (err: any) => {
    console.error('Server failed to start:', err);
  });
}

// --- CLOUD PERSISTENCE LOGIC (Solid Backup for Cloud Run) ---
// This ensures that even if the container restarts and SQLite is reset,
// the critical subscription and account data are restored from Firestore.

async function syncCriticalDataToCloud() {
  if (!firestore) return;
  console.log("Cloud Backup: Syncing critical data to Firestore...");

  try {
    // 1. Sync system_subscriptions
    const subs = db.prepare("SELECT * FROM system_subscriptions").all() as any[];
    for (const sub of subs) {
      await firestore.collection('system_subscriptions').doc(sub.reference).set({
        ...sub,
        synced_at: new Date().toISOString()
      }, { merge: true });
    }

    // 2. Sync school_info
    const schools = db.prepare("SELECT * FROM school_info").all() as any[];
    for (const school of schools) {
      await firestore.collection('school_info').doc(String(school.id)).set({
        ...school,
        synced_at: new Date().toISOString()
      }, { merge: true });
    }

    // 3. Sync all users
    const allUsers = db.prepare("SELECT * FROM utilisateurs").all() as any[];
    for (const user of allUsers) {
      await firestore.collection('critical_users').doc(user.email).set({
        ...user,
        synced_at: new Date().toISOString()
      }, { merge: true });
    }

    // 4. Sync enseignants (needed for teacher logins)
    const teachers = db.prepare("SELECT * FROM enseignants").all() as any[];
    for (const t of teachers) {
      await firestore.collection('enseignants').doc(String(t.id)).set({
        ...t,
        synced_at: new Date().toISOString()
      }, { merge: true });
    }

    // 5. Sync eleves (needed for parent logins)
    const students = db.prepare("SELECT * FROM eleves").all() as any[];
    for (const s of students) {
      await firestore.collection('eleves').doc(String(s.id)).set({
        ...s,
        synced_at: new Date().toISOString()
      }, { merge: true });
    }

    console.log(`Cloud Backup: Success. Synced ${subs.length} subs, ${schools.length} schools, ${allUsers.length} users, ${teachers.length} teachers, ${students.length} students.`);
  } catch (error) {
    console.error("Cloud Backup Error:", error);
  }
}

async function restoreCriticalDataFromCloud() {
  if (!firestore) return;
  console.log("Cloud Recovery: Checking Firestore for missing critical data...");

  try {
    // 1. Restore system_subscriptions
    const subsSnap = await firestore.collection('system_subscriptions').get();
    for (const doc of subsSnap.docs) {
      const data = doc.data();
      const exists = db.prepare("SELECT id FROM system_subscriptions WHERE reference = ?").get(data.reference);
      if (!exists) {
        console.log(`Cloud Recovery: Restoring subscription ${data.reference}`);
        const columns = Object.keys(data).filter(k => k !== 'synced_at'); // Keep ID to maintain integrity
        const placeholders = columns.map(() => '?').join(',');
        const values = columns.map(k => data[k]);
        db.prepare(`INSERT OR REPLACE INTO system_subscriptions (${columns.join(',')}) VALUES (${placeholders})`).run(...values);
      }
    }

    // 2. Restore school_info
    const schoolsSnap = await firestore.collection('school_info').get();
    for (const doc of schoolsSnap.docs) {
      const data = doc.data();
      const exists = db.prepare("SELECT id FROM school_info WHERE id = ?").get(data.id);
      if (!exists) {
        console.log(`Cloud Recovery: Restoring school ${data.nom}`);
        const columns = Object.keys(data).filter(k => k !== 'synced_at'); // Keep ID
        const placeholders = columns.map(() => '?').join(',');
        const values = columns.map(k => data[k]);
        db.prepare(`INSERT OR REPLACE INTO school_info (${columns.join(',')}) VALUES (${placeholders})`).run(...values);
      }
    }

    // 3. Restore critical users
    const usersSnap = await firestore.collection('critical_users').get();
    for (const doc of usersSnap.docs) {
      const data = doc.data();
      const exists = db.prepare("SELECT id FROM utilisateurs WHERE email = ?").get(data.email);
      if (!exists) {
        console.log(`Cloud Recovery: Restoring user ${data.email}`);
        const columns = Object.keys(data).filter(k => k !== 'synced_at'); // Keep ID
        const placeholders = columns.map(() => '?').join(',');
        const values = columns.map(k => data[k]);
        db.prepare(`INSERT OR REPLACE INTO utilisateurs (${columns.join(',')}) VALUES (${placeholders})`).run(...values);
      }
    }

    // 4. Restore enseignants
    const teachersSnap = await firestore.collection('enseignants').get();
    for (const doc of teachersSnap.docs) {
      const data = doc.data();
      const exists = db.prepare("SELECT id FROM enseignants WHERE id = ?").get(data.id);
      if (!exists) {
        console.log(`Cloud Recovery: Restoring teacher ${data.nom}`);
        const columns = Object.keys(data).filter(k => k !== 'synced_at');
        const placeholders = columns.map(() => '?').join(',');
        const values = columns.map(k => data[k]);
        db.prepare(`INSERT OR REPLACE INTO enseignants (${columns.join(',')}) VALUES (${placeholders})`).run(...values);
      }
    }

    // 5. Restore eleves
    const studentsSnap = await firestore.collection('eleves').get();
    for (const doc of studentsSnap.docs) {
      const data = doc.data();
      const exists = db.prepare("SELECT id FROM eleves WHERE id = ?").get(data.id);
      if (!exists) {
        console.log(`Cloud Recovery: Restoring student ${data.nom}`);
        const columns = Object.keys(data).filter(k => k !== 'synced_at');
        const placeholders = columns.map(() => '?').join(',');
        const values = columns.map(k => data[k]);
        db.prepare(`INSERT OR REPLACE INTO eleves (${columns.join(',')}) VALUES (${placeholders})`).run(...values);
      }
    }

    console.log("Cloud Recovery: Restore process complete.");
  } catch (error) {
    console.error("Cloud Recovery Error:", error);
  }
}

// --- END OF CLOUD PERSISTENCE LOGIC ---

startServer().catch(err => {
  console.error("Critical error in startServer:", err);
});
