import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateReceiptPDF = (payment: any, schoolInfo: any) => {
    const doc = new jsPDF();
    const p = payment;
    const s = schoolInfo;

    // Header
    if (s?.logo) {
      doc.addImage(s.logo, 'PNG', 20, 15, 25, 25);
    }
    doc.setFontSize(20);
    doc.text(s?.nom || 'Établissement Scolaire', 50, 25);
    doc.setFontSize(10);
    doc.text(s?.slogan || '', 50, 32);
    doc.text(`${s?.adresse || ''} | ${s?.telephone || ''}`, 50, 38);
    doc.text(`${s?.email || ''} | ${s?.site_web || ''}`, 50, 43);

    doc.setDrawColor(200);
    doc.line(20, 50, 190, 50);

    // Receipt Info
    doc.setFontSize(16);
    doc.text('REÇU DE PAIEMENT', 105, 65, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`N° Reçu: ${p.id || 'N/A'}`, 150, 65);
    doc.text(`Date: ${p.date_paiement}`, 150, 70);

    // Student Info
    doc.setFontSize(12);
    doc.text('INFORMATIONS ÉLÈVE', 20, 85);
    doc.setFontSize(10);
    doc.text(`Nom & Prénom: ${p.eleve_nom} ${p.eleve_prenom}`, 20, 95);
    doc.text(`Matricule: ${p.eleve_matricule}`, 20, 102);
    doc.text(`Classe: ${p.eleve_classe}`, 20, 109);

    // Payment Details
    autoTable(doc, {
      startY: 120,
      head: [['Désignation', 'Montant Payé']],
      body: [[p.type_paiement, `${p.montant} FCFA`]],
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] }
    });

    const finalY = (doc as any).lastAutoTable.finalY;

    // Summary
    doc.setFontSize(11);
    doc.text(`Reste à payer (Scolarité): ${p.reste_scolarite} FCFA`, 20, finalY + 15);
    doc.text(`Reste à payer (Inscription): ${p.reste_inscription} FCFA`, 20, finalY + 22);
    doc.text(`Frais d'inscription: ${p.inscription_payee ? 'PAYÉS' : 'NON PAYÉS'}`, 20, finalY + 29);

    doc.setFontSize(10);
    doc.text('Signature du Comptable', 140, finalY + 50);
    
    return doc;
};
