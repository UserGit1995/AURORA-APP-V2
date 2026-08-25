import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'it' | 'en';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, defaultText?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  it: {
    // Brand & Slogans
    'brand.name': 'AURORA',
    'brand.tagline': 'Distribuzione B2B • Prodotti Chimici e Igiene Professionale',
    'brand.desc': 'Forniture all\'ingrosso certificate per imprese, strutture ricettive, sanità e professionisti del pulito.',

    // Navigation
    'nav.home': 'Home',
    'nav.categories': 'Categorie',
    'nav.deals': 'Offerte',
    'nav.news': 'Novità',
    'nav.bestsellers': 'I più venduti',
    'nav.orders': 'Ordini',
    'nav.favorites': 'Preferiti',
    'nav.compare': 'Confronta',
    'nav.quickReorder': 'Riordino Rapido',
    'nav.quickReorderSub': '1-Click • Senza Carte',
    'nav.helpTitle': 'Hai bisogno di aiuto?',
    'nav.helpSub': 'Il nostro team è a tua disposizione',
    'nav.contactUs': 'Contattaci',

    // Header
    'header.searchPlaceholder': 'Cerca prodotti nel catalogo...',
    'header.searchListening': 'Parla adesso (es. \'Detergente pavimenti\')...',
    'header.voiceSearch': 'Ricerca vocale',
    'header.qrScanner': 'Scansiona QR / Codice a barre',
    'header.cart': 'Carrello',
    'header.notifications': 'Notifiche',
    'header.profile': 'Profilo Aziendale',
    'header.quickOrderBtn': 'Riordino 1-Click',

    // Hero Banner
    'hero.title': 'Soluzioni per ogni esigenza.',
    'hero.subtitle': 'Igiene, pulizia e benessere per la casa e la persona.',
    'hero.qualityTitle': 'Qualità Premium',
    'hero.qualityDesc': 'Prodotti selezionati',
    'hero.deliveryTitle': 'Consegna Veloce',
    'hero.deliveryDesc': 'Affidabile e puntuale',
    'hero.choiceTitle': 'Ampia Scelta',
    'hero.choiceDesc': 'Sempre disponibili',
    'hero.exploreBtn': 'Scopri il catalogo',

    // Categories
    'categories.sectionTitle': 'Categorie principali',
    'categories.viewAll': 'Vedi tutti',
    'categories.productsCount': 'prodotti',

    // Category Names
    'cat.igiene-casa': 'Igiene Casa',
    'cat.igiene-corpo': 'Igiene Corpo',
    'cat.detersivi': 'Detersivi',
    'cat.casa': 'Casa',
    'cat.accessori-pulizia': 'Accessori Pulizia',
    'cat.carta-monouso': 'Carta e Monouso',
    'cat.profumatori': 'Profumatori',

    // Promo Banner
    'promo.badge': 'PROMOZIONE B2B',
    'promo.title': 'Offerte del mese',
    'promo.desc': 'Sconti esclusivi per forniture aziendali e ordini a volume.',
    'promo.cta': 'Scopri le offerte',
    'promo.subText': 'Valide fino ad esaurimento scorte di magazzino',

    // Featured Products
    'featured.sectionTitle': 'Prodotti in evidenza',
    'featured.viewAll': 'Vedi tutti',
    'featured.addToCart': 'Aggiungi',
    'featured.added': 'Aggiunto!',
    'featured.compare': 'Confronta',
    'featured.inCompare': 'In confronto',
    'featured.discount': 'Sconto',
    'featured.stockLow': 'Scorte Basse',
    'featured.stockAvailable': 'Disponibile',

    // Footer
    'footer.certifications': 'Certificazioni & Conformità',
    'footer.iso': 'Sistema Qualità UNI EN ISO 9001:2015',
    'footer.haccp': 'Linee Guida e Protocolli HACCP Alimentare',
    'footer.eco': 'Detergenti Ecolabel & Certificazione Verde',
    'footer.reach': 'Conformità Schede Dati di Sicurezza (SDS) REACH/CLP',
    'footer.quickLinks': 'Link Rapidi',
    'footer.catalog': 'Catalogo Generale B2B',
    'footer.priceList': 'Listino Prezzi & Sconti Volume',
    'footer.orderAssistance': 'Assistenza Ricevimento Merci',
    'footer.safetySheets': 'Download Schede di Sicurezza (SDS)',
    'footer.privacy': 'Informativa Privacy & Cookie',
    'footer.terms': 'Condizioni Generali di Fornitura B2B',
    'footer.support': 'Supporto Clienti & Logistica',
    'footer.hours': 'Lun - Ven: 08:30 - 18:00 (Orario Continuato)',
    'footer.phone': 'Assistenza Diretta: +39 02 8945 7710',
    'footer.email': 'Email Logistica: logistica@auroradistribuzione.it',
    'footer.headquarters': 'Hub Logistico: Via delle Industrie 42, 20090 Milano (MI)',
    'footer.language': 'Lingua / Language',
    'footer.italian': 'Italiano (IT)',
    'footer.english': 'English (EN)',
    'footer.rights': 'Tutti i diritti riservati.',
    'footer.companyInfo': 'Aurora Distribuzione S.r.l. - P.IVA / C.F. 08492040962 - Capitale Sociale € 250.000,00 i.v. - REA MI-2049182',

    // Orders & Tracking
    'orders.title': 'Storico Ordini & Forniture B2B',
    'orders.subtitle': 'Monitora spedizioni, esporta fatture e riordina con 1-click.',
    'orders.filterAll': 'Tutti gli ordini',
    'orders.filterActive': '⚡ Ordini Attivi',
    'orders.filterProcessing': 'In elaborazione',
    'orders.filterShipped': 'Spediti',
    'orders.filterDelivered': 'Consegnati',
    'orders.trackBtn': 'Traccia Spedizione',
    'orders.inquiryBtn': 'Invia Richiesta Aggiornamento',
    'orders.downloadPdf': 'Scarica Fattura PDF',
    'orders.exportHistoryPdf': 'Esporta Storico PDF',
    'orders.exportHistorySubtitle': 'Scarica estratto conto e registro forniture in PDF',
    'orders.exportFiltered': 'Esporta vista corrente ({count} ordini)',
    'orders.exportAll': 'Esporta tutto lo storico ({count} ordini)',
    'orders.generatingHistoryPdf': 'Generazione Documento PDF...',
    'orders.historyPdfSuccess': 'Storico PDF generato con successo!',
    'orders.reorderBtn': 'Riordina',
    'orders.stepPending': 'Pending',
    'orders.stepPendingSub': 'Ricevuto & Convalidato',
    'orders.stepProcessing': 'Processing',
    'orders.stepProcessingSub': 'In Elaborazione / Picking',
    'orders.stepShipped': 'Shipped',
    'orders.stepShippedSub': 'Spedito / In Transito',
    'orders.stepDelivered': 'Delivered',
    'orders.stepDeliveredSub': 'Consegnato',
    'orders.activeProgress': 'Avanzamento Ordine Attivo',
    'orders.completedProgress': 'Fornitura Completata con Successo',
    'orders.stepCurrent': 'In corso',
    'orders.stepCompleted': 'Completato',
    'orders.stepUpcoming': 'In attesa',

    // Product Detail
    'detail.overviewTab': 'Panoramica Articolo',
    'detail.safetyTab': 'Guida all\'Uso & Sicurezza Chimica',
    'detail.package': 'Confezione',
    'detail.format': 'Formato',
    'detail.availability': 'Disponibilità B2B',
    'detail.addOrder': 'Aggiungi all\'ordine',

    // Cart
    'cart.title': 'Carrello Forniture B2B',
    'cart.subtotal': 'Subtotale Imponibile',
    'cart.vat': 'IVA 22%',
    'cart.total': 'Totale Ordine',
    'cart.checkout': 'Procedi all\'Ordine',
    'cart.empty': 'Il carrello è vuoto',
    'cart.clear': 'Svuota Carrello',
    'cart.saveAsTemplate': 'Salva come Modello',
    'cart.templates': 'Modelli Riordino',
    'cart.loadTemplate': 'Carica Modello',
    'cart.templateSaved': 'Modello salvato con successo!',
    'cart.templateLoaded': 'Modello caricato nel carrello!',
    'cart.templateName': 'Nome del Modello',
    'cart.templateDesc': 'Descrizione / Note',
    'cart.templateCategory': 'Categoria / Frequenza',
    'cart.presetTemplates': 'Modelli Preconfigurati B2B',
    'cart.customTemplates': 'I Tuoi Modelli Personalizzati',
    'cart.replaceCart': 'Sostituisci carrello',
    'cart.mergeCart': 'Aggiungi al carrello',
    'cart.loadModalTitle': 'Modelli di Riordino Ricorrenti',
    'cart.saveModalTitle': 'Salva Configurazione nel Registro Modelli',
    'cart.deleteTemplateConfirm': 'Sei sicuro di voler eliminare questo modello?',
    'cart.noTemplatesFound': 'Nessun modello trovato',
    'cart.saveSuccess': 'Configurazione salvata come modello!'
  },
  en: {
    // Brand & Slogans
    'brand.name': 'AURORA',
    'brand.tagline': 'B2B Distribution • Chemicals & Professional Hygiene',
    'brand.desc': 'Certified wholesale supplies for enterprises, hospitality facilities, healthcare, and cleaning professionals.',

    // Navigation
    'nav.home': 'Home',
    'nav.categories': 'Categories',
    'nav.deals': 'Deals',
    'nav.news': 'New Arrivals',
    'nav.bestsellers': 'Best Sellers',
    'nav.orders': 'Orders',
    'nav.favorites': 'Favorites',
    'nav.compare': 'Compare',
    'nav.quickReorder': 'Quick Reorder',
    'nav.quickReorderSub': '1-Click • Card-free',
    'nav.helpTitle': 'Need assistance?',
    'nav.helpSub': 'Our dedicated support team is here for you',
    'nav.contactUs': 'Contact Us',

    // Header
    'header.searchPlaceholder': 'Search products in catalog...',
    'header.searchListening': 'Listening now (e.g. \'Floor cleaner\')...',
    'header.voiceSearch': 'Voice search',
    'header.qrScanner': 'Scan QR / Barcode',
    'header.cart': 'Cart',
    'header.notifications': 'Notifications',
    'header.profile': 'Company Profile',
    'header.quickOrderBtn': '1-Click Reorder',

    // Hero Banner
    'hero.title': 'Professional solutions for every need.',
    'hero.subtitle': 'Hygiene, cleaning, and sanitizing solutions for facilities and personal care.',
    'hero.qualityTitle': 'Premium Quality',
    'hero.qualityDesc': 'Certified formulas',
    'hero.deliveryTitle': 'Fast Delivery',
    'hero.deliveryDesc': 'Reliable & on-time',
    'hero.choiceTitle': 'Wide Catalog',
    'hero.choiceDesc': 'Always in stock',
    'hero.exploreBtn': 'Explore Catalog',

    // Categories
    'categories.sectionTitle': 'Main Categories',
    'categories.viewAll': 'View all',
    'categories.productsCount': 'products',

    // Category Names
    'cat.igiene-casa': 'Facility & Surface Hygiene',
    'cat.igiene-corpo': 'Personal Care & Washroom',
    'cat.detersivi': 'Laundry & Detergents',
    'cat.casa': 'Facility Supplies',
    'cat.accessori-pulizia': 'Cleaning Hardware & Mops',
    'cat.carta-monouso': 'Paper & Disposables',
    'cat.profumatori': 'Air Care & Fragrances',

    // Promo Banner
    'promo.badge': 'B2B PROMOTION',
    'promo.title': 'Deals of the Month',
    'promo.desc': 'Exclusive volume discounts for recurring enterprise accounts and contracts.',
    'promo.cta': 'Explore Deals',
    'promo.subText': 'Valid while warehouse supplies last',

    // Featured Products
    'featured.sectionTitle': 'Featured Products',
    'featured.viewAll': 'View all',
    'featured.addToCart': 'Add to Cart',
    'featured.added': 'Added!',
    'featured.compare': 'Compare',
    'featured.inCompare': 'Comparing',
    'featured.discount': 'Discount',
    'featured.stockLow': 'Low Stock',
    'featured.stockAvailable': 'In Stock',

    // Footer
    'footer.certifications': 'Certifications & Compliance',
    'footer.iso': 'Quality Management UNI EN ISO 9001:2015',
    'footer.haccp': 'HACCP Food Safety Guidelines & Protocols',
    'footer.eco': 'Ecolabel & Eco-Friendly Green Certification',
    'footer.reach': 'REACH/CLP Safety Data Sheet (SDS) Compliant',
    'footer.quickLinks': 'Quick Links',
    'footer.catalog': 'B2B General Catalog',
    'footer.priceList': 'Price Lists & Volume Tiers',
    'footer.orderAssistance': 'Freight & Receiving Desk',
    'footer.safetySheets': 'Download Safety Data Sheets (SDS)',
    'footer.privacy': 'Privacy & Cookie Policy',
    'footer.terms': 'General B2B Supply Terms',
    'footer.support': 'Customer Support & Logistics Desk',
    'footer.hours': 'Mon - Fri: 08:30 - 18:00 (Continuous)',
    'footer.phone': 'Direct Support: +39 02 8945 7710',
    'footer.email': 'Logistics Email: logistica@auroradistribuzione.it',
    'footer.headquarters': 'Logistics Hub: Via delle Industrie 42, 20090 Milan, Italy',
    'footer.language': 'Language / Lingua',
    'footer.italian': 'Italiano (IT)',
    'footer.english': 'English (EN)',
    'footer.rights': 'All rights reserved.',
    'footer.companyInfo': 'Aurora Distribuzione S.r.l. - VAT / Tax ID IT08492040962 - Share Capital € 250,000.00 fully paid - REA MI-2049182',

    // Orders & Tracking
    'orders.title': 'B2B Orders & Supplies History',
    'orders.subtitle': 'Track shipments, export invoices, and reorder in 1-click.',
    'orders.filterAll': 'All Orders',
    'orders.filterActive': '⚡ Active Orders',
    'orders.filterProcessing': 'Processing',
    'orders.filterShipped': 'Shipped',
    'orders.filterDelivered': 'Delivered',
    'orders.trackBtn': 'Track Shipment',
    'orders.inquiryBtn': 'Send Update Request',
    'orders.downloadPdf': 'Download Invoice PDF',
    'orders.exportHistoryPdf': 'Export History PDF',
    'orders.exportHistorySubtitle': 'Download statement & order history in PDF',
    'orders.exportFiltered': 'Export current view ({count} orders)',
    'orders.exportAll': 'Export full history ({count} orders)',
    'orders.generatingHistoryPdf': 'Generating PDF document...',
    'orders.historyPdfSuccess': 'Order history PDF successfully generated!',
    'orders.reorderBtn': 'Reorder',
    'orders.stepPending': 'Pending',
    'orders.stepPendingSub': 'Received & Verified',
    'orders.stepProcessing': 'Processing',
    'orders.stepProcessingSub': 'Picking & Packaging',
    'orders.stepShipped': 'Shipped',
    'orders.stepShippedSub': 'In Transit / Dispatched',
    'orders.stepDelivered': 'Delivered',
    'orders.stepDeliveredSub': 'Delivered & Signed',
    'orders.activeProgress': 'Active Order Progress',
    'orders.completedProgress': 'Delivery Successfully Completed',
    'orders.stepCurrent': 'In progress',
    'orders.stepCompleted': 'Completed',
    'orders.stepUpcoming': 'Pending',

    // Product Detail
    'detail.overviewTab': 'Product Overview',
    'detail.safetyTab': 'Usage & Chemical Safety Guide',
    'detail.package': 'Packaging',
    'detail.format': 'Format',
    'detail.availability': 'B2B Availability',
    'detail.addOrder': 'Add to Order',

    // Cart
    'cart.title': 'B2B Supply Cart',
    'cart.subtotal': 'Taxable Subtotal',
    'cart.vat': 'VAT 22%',
    'cart.total': 'Total Order',
    'cart.checkout': 'Proceed to Order Confirmation',
    'cart.empty': 'Your cart is empty',
    'cart.clear': 'Clear Cart',
    'cart.saveAsTemplate': 'Save as Template',
    'cart.templates': 'Restock Templates',
    'cart.loadTemplate': 'Load Template',
    'cart.templateSaved': 'Template saved successfully!',
    'cart.templateLoaded': 'Template loaded into cart!',
    'cart.templateName': 'Template Name',
    'cart.templateDesc': 'Description / Notes',
    'cart.templateCategory': 'Category / Frequency',
    'cart.presetTemplates': 'Pre-configured B2B Templates',
    'cart.customTemplates': 'My Custom Templates',
    'cart.replaceCart': 'Replace cart',
    'cart.mergeCart': 'Append to cart',
    'cart.loadModalTitle': 'Recurring Restock Templates',
    'cart.saveModalTitle': 'Save Configuration as Template',
    'cart.deleteTemplateConfirm': 'Are you sure you want to delete this template?',
    'cart.noTemplatesFound': 'No templates found',
    'cart.saveSuccess': 'Cart configuration saved as template!'
  }
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'it',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key: string, defaultText?: string) => defaultText || key
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('aurora_b2b_language');
      return saved === 'en' ? 'en' : 'it';
    } catch {
      return 'it';
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('aurora_b2b_language', lang);
    } catch {
      // ignore storage error
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'it' ? 'en' : 'it');
  };

  const t = (key: string, defaultText?: string): string => {
    const dict = translations[language];
    if (dict && dict[key]) {
      return dict[key];
    }
    // Fallback to Italian if English key missing
    if (translations.it[key]) {
      return translations.it[key];
    }
    return defaultText || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
