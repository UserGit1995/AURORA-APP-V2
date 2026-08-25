import React, { useState } from 'react';
import { 
  FlaskConical, 
  ShieldAlert, 
  Droplets, 
  Clock, 
  Thermometer, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Sparkles, 
  Calculator, 
  Layers, 
  Wind, 
  Eye, 
  Hand, 
  Ban,
  Info
} from 'lucide-react';
import { Product } from '../types';

interface ProductUsageGuidelinesProps {
  product: Product;
}

interface ChemicalProfile {
  chemicalType: string;
  phValue: string;
  phNature: 'acido' | 'neutro' | 'alcalino' | 'dermo' | 'meccanico';
  readyToUse: boolean;
  dilutionRates: {
    useCase: string;
    ratio: string;
    percentage: string;
    dosagePerLiter: string;
    actionTime: string;
  }[];
  defaultBucketLiters: number;
  temperature: string;
  contactTime: string;
  ppeList: {
    icon: React.ComponentType<{ className?: string }>;
    name: string;
    standard: string;
    required: boolean;
  }[];
  compatibleSurfaces: string[];
  incompatibleSurfaces: string[];
  haccpProtocol: string;
  rinseRequired: boolean;
  safetyWarnings: string[];
}

export const ProductUsageGuidelines: React.FC<ProductUsageGuidelinesProps> = ({ product }) => {
  // Generate customized chemical & usage profile based on category and product metadata
  const getProductChemicalProfile = (prod: Product): ChemicalProfile => {
    const nameLower = prod.name.toLowerCase();
    const catLower = prod.category.toLowerCase();

    // 1. Sgrassatore / Degreaser
    if (nameLower.includes('sgrassatore') || nameLower.includes('degreaser')) {
      return {
        chemicalType: 'Detergente Alcalino Sgrassante ad Alta Prestazione',
        phValue: '11.0 ± 0.5',
        phNature: 'alcalino',
        readyToUse: true,
        dilutionRates: [
          { useCase: 'Uso Diretto (Trigger / Sporco Ostinato)', ratio: 'Puro 1:1', percentage: '100%', dosagePerLiter: 'Spruzzo diretto', actionTime: '2 - 3 min' },
          { useCase: 'Pulizia Manutentiva Piani & Cappe', ratio: '1:10 (10%)', percentage: '10%', dosagePerLiter: '100 ml / Litro', actionTime: '1 - 2 min' },
          { useCase: 'Lavaggio Pavimenti & Superfici Gres', ratio: '1:50 (2%)', percentage: '2%', dosagePerLiter: '20 ml / Litro', actionTime: '5 min' },
        ],
        defaultBucketLiters: 5,
        temperature: '20°C - 50°C (massima efficacia con acqua tiepida)',
        contactTime: '2 - 5 minuti prima del risciacquo',
        ppeList: [
          { icon: Hand, name: 'Guanti Protettivi Nitrile', standard: 'EN ISO 374-1', required: true },
          { icon: Eye, name: 'Occhiali / Visiera Antischizzo', standard: 'EN 166', required: false },
          { icon: Wind, name: 'Aerazione del Locale', standard: 'Buona Ventilazione', required: true },
          { icon: Ban, name: 'Non miscelare con acidi o candeggina', standard: 'Reg. CE 1272/2008', required: true }
        ],
        compatibleSurfaces: ['Acciaio Inox Aisi 304/316', 'Ceramica e Piastrelle', 'Gres Porcellanato', 'Piani in Vetroceramica', 'Plastiche Dure (ABS, PP)'],
        incompatibleSurfaces: ['Alluminio anodizzato non trattato', 'Legno naturale verniciato', 'Superfici policarbonate trasparenti'],
        haccpProtocol: 'Idoneo al protocollo HACCP per piani di lavoro cucina e trasformazione alimentare. Risciacquare accuratamente con acqua potabile.',
        rinseRequired: true,
        safetyWarnings: [
          'Non applicare su superfici calde (>60°C).',
          'Risciacquare con panno microfibra inumidito con acqua pulita.',
          'In caso di contatto con gli occhi, lavare immediatamente e abbondantemente con acqua.'
        ]
      };
    }

    // 2. Detersivo Lavatrice / Laundry Detergent
    if (nameLower.includes('detersivo') || catLower.includes('detersivi')) {
      return {
        chemicalType: 'Detergente Liquido Concentrato Enzimatico con Sequestranti',
        phValue: '8.5 ± 0.5',
        phNature: 'alcalino',
        readyToUse: false,
        dilutionRates: [
          { useCase: 'Bucato poco sporco / Acqua dolce', ratio: '1:200', percentage: '0.5%', dosagePerLiter: '35 - 45 ml / carico 5kg', actionTime: 'Ciclo lavaggio' },
          { useCase: 'Bucato medio sporco / Acqua media', ratio: '1:150', percentage: '0.7%', dosagePerLiter: '50 - 65 ml / carico 5kg', actionTime: 'Ciclo lavaggio' },
          { useCase: 'Sporco ostinato / Tovagliati B2B', ratio: '1:100', percentage: '1.0%', dosagePerLiter: '80 - 100 ml / carico 5kg', actionTime: 'Pre-lavaggio + Lavaggio' },
        ],
        defaultBucketLiters: 10,
        temperature: '30°C - 60°C (attivo a freddo)',
        contactTime: 'Tempo ciclo macchina (30 - 60 min)',
        ppeList: [
          { icon: Hand, name: 'Guanti Protettivi in Gomma', standard: 'Uso Ordinario', required: false },
          { icon: Eye, name: 'Evitare contatto con gli occhi', standard: 'Precauzione P264', required: true },
          { icon: Ban, name: 'Non versare direttamente su fibre delicate', standard: 'Dosaggio in vaschetta', required: true }
        ],
        compatibleSurfaces: ['Cotone', 'Lino', 'Sintetici', 'Microfibra professionale', 'Fibre miste'],
        incompatibleSurfaces: ['Seta pura', 'Lana vergine (usare detergente neutro specifico)'],
        haccpProtocol: 'Certificato per la sanificazione tessile di divise da lavoro, tovaglie e biancheria strutture ricettive.',
        rinseRequired: true,
        safetyWarnings: [
          'Dosare secondo la durezza dell\'acqua per evitare depositi calcarei.',
          'Conservare tra +5°C e +30°C al riparo dalla luce solare diretta.'
        ]
      };
    }

    // 3. Disinfettante Pavimenti / PMC / Cloro-attivo
    if (nameLower.includes('disinfettante') || nameLower.includes('cloro') || nameLower.includes('pavimenti')) {
      return {
        chemicalType: 'Presidio Medico Chirurgico Igienizzante a Base Cloro / Sali Quaternari',
        phValue: '10.5 ± 0.5',
        phNature: 'alcalino',
        readyToUse: false,
        dilutionRates: [
          { useCase: 'Igienizzazione Quotidiana Pavimenti', ratio: '1:100 (1%)', percentage: '1.0%', dosagePerLiter: '10 ml / Litro (50ml in 5L)', actionTime: '5 minuti' },
          { useCase: 'Disinfezione Ospedaliera & Bagni B2B', ratio: '1:40 (2.5%)', percentage: '2.5%', dosagePerLiter: '25 ml / Litro (125ml in 5L)', actionTime: '10 minuti' },
          { useCase: 'Trattamento Shock Sanificazione', ratio: '1:20 (5%)', percentage: '5.0%', dosagePerLiter: '50 ml / Litro (250ml in 5L)', actionTime: '15 minuti' },
        ],
        defaultBucketLiters: 5,
        temperature: 'Acqua fredda o a temperatura ambiente (Max 25°C)',
        contactTime: '5 - 15 minuti per abbattimento carica batterica',
        ppeList: [
          { icon: Hand, name: 'Guanti Antiacido / Nitrile', standard: 'EN 374-3', required: true },
          { icon: Eye, name: 'Occhiali Protettivi da Lavoro', standard: 'EN 166', required: true },
          { icon: Wind, name: 'Aerare i locali durante l\'uso', standard: 'Salute & Sicurezza D.Lgs 81/08', required: true },
          { icon: Ban, name: 'TASSATIVO: Non miscelare MAI con acidi (anticalcare)', standard: 'Rischio sviluppo gas cloro', required: true }
        ],
        compatibleSurfaces: ['Gres Porcellanato', 'Ceramica Smaltata', 'PVC e Linoleum', 'Acciaio Inox', 'Sanitari'],
        incompatibleSurfaces: ['Parquet in legno non cerato', 'Marmi lucidi non protetti', 'Metalli teneri (rame, ottone)'],
        haccpProtocol: 'Registrazione Ministero della Salute. Indicato per protocolli di sanificazione ambienti pubblici, mense, palestre e RSA.',
        rinseRequired: false,
        safetyWarnings: [
          'Su pavimenti non richiede risciacquo alle diluizioni standard.',
          'Su superfici a contatto con alimenti è obbligatorio il risciacquo finale con acqua potabile.'
        ]
      };
    }

    // 4. Ammorbidente / Fabric Softener
    if (nameLower.includes('ammorbidente')) {
      return {
        chemicalType: 'Ammorbidente Cationico con Agenti Antistatici & Microincapsulati',
        phValue: '3.0 ± 0.5',
        phNature: 'acido',
        readyToUse: false,
        dilutionRates: [
          { useCase: 'Bucato Standard Lavatrice (4-5 kg)', ratio: 'Dosaggio diretto', percentage: '-', dosagePerLiter: '25 - 30 ml per ciclo', actionTime: 'Ultimo risciacquo' },
          { useCase: 'Bucato Extra Morbidezza / Spugne', ratio: 'Dosaggio rinforzato', percentage: '-', dosagePerLiter: '45 - 50 ml per ciclo', actionTime: 'Ultimo risciacquo' },
          { useCase: 'Bucato a Mano (10 Litri)', ratio: '1:500', percentage: '0.2%', dosagePerLiter: '20 ml in 10 Litri', actionTime: 'Ammollo 10 min' },
        ],
        defaultBucketLiters: 10,
        temperature: 'Acqua fredda (ultimo risciacquo lavatrice)',
        contactTime: '5 - 10 minuti nel ciclo finale',
        ppeList: [
          { icon: Hand, name: 'Guanti protettivi per lavaggio a mano', standard: 'Uso generico', required: false },
          { icon: Eye, name: 'Evitare contatto con gli occhi', standard: 'Norma CLP', required: true }
        ],
        compatibleSurfaces: ['Cotone', 'Spugne', 'Lino', 'Capi sintetici e misti'],
        incompatibleSurfaces: ['Capi tecnici impermeabili (Gore-Tex)', 'Panni in microfibra per pulizie (riduce l\'elettrostaticità assorbente)'],
        haccpProtocol: 'Dermatologicamente testato per minimizzare i rischi di irritazione su tessuti e divise a contatto epidermico.',
        rinseRequired: false,
        safetyWarnings: [
          'Non versare mai direttamente sul bucato asciutto, utilizzare l\'apposita vaschetta.',
          'Tenere fuori dalla portata dei bambini.'
        ]
      };
    }

    // 5. Sapone Mani / Igiene Corpo
    if (catLower.includes('corpo') || nameLower.includes('sapone')) {
      return {
        chemicalType: 'Detergente Dermocompatibile a pH Eudermico 5.5 con Antibatterico',
        phValue: '5.5 ± 0.3',
        phNature: 'dermo',
        readyToUse: true,
        dilutionRates: [
          { useCase: 'Lavaggio Mani Ordinario', ratio: 'Pronto all\'uso', percentage: '100%', dosagePerLiter: '1 - 2 erogazioni (2-3 ml)', actionTime: '30 - 40 secondi di frizione' },
          { useCase: 'Igienizzazione Mani Sanitaria / HACCP', ratio: 'Pronto all\'uso', percentage: '100%', dosagePerLiter: '2 erogazioni (4-5 ml)', actionTime: '60 secondi con acqua corrente' },
        ],
        defaultBucketLiters: 1,
        temperature: 'Acqua corrente tiepida (25°C - 38°C)',
        contactTime: 'Frizione per almeno 30-60 secondi',
        ppeList: [
          { icon: Hand, name: 'Dermatologicamente Testato', standard: 'Regolamento Cosmetico CE 1223/2009', required: true },
          { icon: Eye, name: 'Evitare il contatto con la congiuntiva oculare', standard: 'Risciacquare con acqua', required: true }
        ],
        compatibleSurfaces: ['Cute integra delle mani e del corpo'],
        incompatibleSurfaces: ['Cute lesa o ferite aperte'],
        haccpProtocol: 'Conforme alle normative HACCP per la corretta igiene delle mani degli operatori del settore alimentare (FSA / Reg. CE 852/2004).',
        rinseRequired: true,
        safetyWarnings: [
          'Uso esterno. Risciacquare accuratamente con acqua dopo la frizione.',
          'In caso di contatto con gli occhi sciacquare abbondantemente.'
        ]
      };
    }

    // 6. Carta & Monouso (Articolo non chimico / Procedura d'uso)
    if (catLower.includes('carta')) {
      return {
        chemicalType: 'Pura Cellulosa Vergine 100% Certificata a Idoneità Contatto Alimenti',
        phValue: 'Neutro (Inerte)',
        phNature: 'neutro',
        readyToUse: true,
        dilutionRates: [
          { useCase: 'Asciugatura Mani & Superfici', ratio: 'Manuale / Strappo singolo', percentage: '-', dosagePerLiter: '1-2 strappi per operazione', actionTime: 'Istantaneo' },
          { useCase: 'Assorbimento Liquidi in Cucina', ratio: 'Monouso ad alto assorbimento', percentage: '-', dosagePerLiter: 'Secondo necessità', actionTime: 'Istantaneo' }
        ],
        defaultBucketLiters: 1,
        temperature: 'Ambiente asciutto',
        contactTime: 'Uso immediato monouso',
        ppeList: [
          { icon: Hand, name: 'Manipolazione con mani pulite', standard: 'Buone pratiche igieniche', required: false },
          { icon: Ban, name: 'Non disperdere nell\'ambiente', standard: 'Riciclabile / Raccolta carta', required: true }
        ],
        compatibleSurfaces: ['Tutti i tipi di superfici piane, banchi alimentari, mani e stoviglie'],
        incompatibleSurfaces: ['Fiamme libere o fonti di calore diretto'],
        haccpProtocol: 'Idoneo al contatto alimentare ai sensi del D.M. 21/03/1973 e Regolamento CE 1935/2004.',
        rinseRequired: false,
        safetyWarnings: [
          'Conservare in ambiente asciutto e al riparo da umidità e polvere.',
          'Gettare nei contenitori dedicati dopo l\'uso.'
        ]
      };
    }

    // 7. Profumatori per Ambienti
    if (catLower.includes('profumatori') || nameLower.includes('profumatore')) {
      return {
        chemicalType: 'Soluzione Idroalcolica con Oli Essenziali Naturali ad Alta Persistenza',
        phValue: '6.5 ± 0.5',
        phNature: 'neutro',
        readyToUse: true,
        dilutionRates: [
          { useCase: 'Diffusione Continua a Bastoncino', ratio: 'Pronto all\'uso', percentage: '100%', dosagePerLiter: 'Inserire tutti i bastoncini', actionTime: 'Attivo h24 per 60gg' },
          { useCase: 'Erogazione Spray su Tessuti & Angoli', ratio: 'Puro spray', percentage: '100%', dosagePerLiter: '2-3 spruzzi a 30cm di distanza', actionTime: 'Rilascio persistente' }
        ],
        defaultBucketLiters: 1,
        temperature: 'Ambiente ventilato (+15°C a +25°C)',
        contactTime: 'Rilascio graduale',
        ppeList: [
          { icon: Wind, name: 'Utilizzare in ambienti con ricambio d\'aria', standard: 'Buone norme', required: true },
          { icon: Ban, name: 'Non vaporizzare verso fiamme o fonti di accensione', standard: 'Liquido infiammabile', required: true }
        ],
        compatibleSurfaces: ['Aria ambiente, tendaggi e tessuti non delicati (testare prima su angolo nascosto)'],
        incompatibleSurfaces: ['Pelle naturale, camoscio, plastiche laccate lucide, schermi LCD'],
        haccpProtocol: 'Non spruzzare direttamente su alimenti o superfici destinate al contatto diretto con alimenti non protetti.',
        rinseRequired: false,
        safetyWarnings: [
          'Tenere lontano da fonti di calore, scintille e fiamme libere.',
          'Capovolgere i bastoncini una volta a settimana per ravvivare la fragranza.'
        ]
      };
    }

    // Default Generic Professional Chemical
    return {
      chemicalType: 'Detergente Chimico Professionale Multiuso Concentrato',
      phValue: '7.5 ± 0.5',
      phNature: 'neutro',
      readyToUse: false,
      dilutionRates: [
        { useCase: 'Lavaggio Quotidiano Superfici', ratio: '1:50 (2%)', percentage: '2.0%', dosagePerLiter: '20 ml / Litro d\'acqua', actionTime: '3 - 5 min' },
        { useCase: 'Sporco Intenso & Deceratura', ratio: '1:20 (5%)', percentage: '5.0%', dosagePerLiter: '50 ml / Litro d\'acqua', actionTime: '5 - 10 min' },
      ],
      defaultBucketLiters: 5,
      temperature: '20°C - 40°C',
      contactTime: '3 - 5 minuti',
      ppeList: [
        { icon: Hand, name: 'Guanti Protettivi', standard: 'EN ISO 374-1', required: true },
        { icon: Eye, name: 'Occhiali Antischizzo', standard: 'EN 166', required: false }
      ],
      compatibleSurfaces: ['Tutte le superfici lavabili resistenti all\'acqua'],
      incompatibleSurfaces: ['Superfici sensibili all\'umidità prolungata'],
      haccpProtocol: 'Prodotto conforme agli standard di igiene e autocontrollo HACCP.',
      rinseRequired: true,
      safetyWarnings: [
        'Non ingerire ed evitare il contatto con gli occhi.',
        'Conservare nella confezione originale sigillata.'
      ]
    };
  };

  const profile = getProductChemicalProfile(product);
  const [selectedWaterLiters, setSelectedWaterLiters] = useState<number>(profile.defaultBucketLiters);
  const [selectedDilutionRateIndex, setSelectedDilutionRateIndex] = useState<number>(0);

  // Quick Dilution Calculation
  const currentDilution = profile.dilutionRates[selectedDilutionRateIndex] || profile.dilutionRates[0];
  
  // Calculate dosage in ml based on percentage / dosagePerLiter
  const calculateRequiredChemicalMl = (): number => {
    if (profile.readyToUse) return 0;
    
    // Extract ml from dosagePerLiter string if available (e.g. "20 ml / Litro" -> 20)
    const match = currentDilution.dosagePerLiter.match(/(\d+)\s*ml/i);
    if (match && match[1]) {
      const mlPerL = parseInt(match[1], 10);
      return mlPerL * selectedWaterLiters;
    }

    // Percentage fallback
    const percMatch = currentDilution.percentage.match(/(\d+(\.\d+)?)/);
    if (percMatch && percMatch[1]) {
      const perc = parseFloat(percMatch[1]);
      return Math.round((perc / 100) * (selectedWaterLiters * 1000));
    }

    return 20 * selectedWaterLiters;
  };

  const calculatedMl = calculateRequiredChemicalMl();
  const capsCount = Math.max(1, Math.round(calculatedMl / 30)); // Assuming 30ml cap size

  return (
    <div className="space-y-4 text-slate-200">
      {/* Top Banner: Chemical ID & Safety Header */}
      <div className="bg-[#050e20] border border-[#13274c] rounded-2xl p-4 sm:p-5 shadow-inner">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#0f1f3e]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-400">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Scheda Tecnica & Linee Guida di Sicurezza
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                  profile.phNature === 'alcalino'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : profile.phNature === 'acido'
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                }`}>
                  pH {profile.phValue}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {profile.chemicalType}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Formula:</span>
            <span className="font-semibold text-white bg-[#0a1834] px-2 py-1 rounded-lg border border-[#162d55]">
              {profile.readyToUse ? 'Pronto all\'uso' : 'Super Concentrato'}
            </span>
          </div>
        </div>

        {/* Key Quick Specs Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 text-xs">
          <div className="bg-[#08152c] p-2.5 rounded-xl border border-[#13284c]">
            <span className="text-[10.5px] text-slate-400 block flex items-center gap-1">
              <Thermometer className="w-3 h-3 text-sky-400" />
              Temperatura
            </span>
            <span className="font-semibold text-white text-[11.5px] block mt-0.5 truncate">
              {profile.temperature}
            </span>
          </div>

          <div className="bg-[#08152c] p-2.5 rounded-xl border border-[#13284c]">
            <span className="text-[10.5px] text-slate-400 block flex items-center gap-1">
              <Clock className="w-3 h-3 text-sky-400" />
              Tempo di Contatto
            </span>
            <span className="font-semibold text-sky-300 text-[11.5px] block mt-0.5">
              {profile.contactTime}
            </span>
          </div>

          <div className="bg-[#08152c] p-2.5 rounded-xl border border-[#13284c]">
            <span className="text-[10.5px] text-slate-400 block flex items-center gap-1">
              <Droplets className="w-3 h-3 text-sky-400" />
              Risciacquo
            </span>
            <span className={`font-semibold text-[11.5px] block mt-0.5 ${
              profile.rinseRequired ? 'text-amber-300' : 'text-emerald-400'
            }`}>
              {profile.rinseRequired ? 'Obbligatorio' : 'Non richiesto'}
            </span>
          </div>

          <div className="bg-[#08152c] p-2.5 rounded-xl border border-[#13284c]">
            <span className="text-[10.5px] text-slate-400 block flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              HACCP Food Safe
            </span>
            <span className="font-semibold text-emerald-300 text-[11.5px] block mt-0.5">
              Idoneo Professionale
            </span>
          </div>
        </div>
      </div>

      {/* Dilution Protocols & Interactive Calculator */}
      {!profile.readyToUse ? (
        <div className="bg-[#071328] border border-[#14284d] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#102242]">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-sky-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Tabella e Calcolatore di Dosaggio / Diluizione
              </h4>
            </div>
            <span className="text-[10.5px] text-sky-400 font-medium">
              Precisione Professionale B2B
            </span>
          </div>

          {/* Dilution Rates Radio Selector */}
          <div className="space-y-2 mb-4">
            <span className="text-[11px] text-slate-400 font-medium block">
              Seleziona il tipo di intervento:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {profile.dilutionRates.map((rate, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedDilutionRateIndex(idx)}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    selectedDilutionRateIndex === idx
                      ? 'bg-[#0a1e3e] border-sky-400 text-white shadow-md shadow-sky-950/40 ring-1 ring-sky-400/30'
                      : 'bg-[#09152b] border-[#132646] text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-white truncate max-w-[130px]">
                      {rate.useCase}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-sky-300 bg-sky-500/15 px-1.5 py-0.5 rounded">
                      {rate.ratio}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10.5px] text-slate-400">
                    <span>{rate.dosagePerLiter}</span>
                    <span className="text-slate-300">{rate.actionTime}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Calculator: Water Volume Selection */}
          <div className="bg-[#040b18] border border-[#11233e] rounded-xl p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-500/20 text-sky-300 shrink-0">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">
                  Volume d'Acqua nel Secchio / Serbatoio:
                </span>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {[1, 5, 8, 10, 25].map((liters) => (
                    <button
                      key={liters}
                      type="button"
                      onClick={() => setSelectedWaterLiters(liters)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedWaterLiters === liters
                          ? 'bg-[#0284c7] text-white shadow-xs'
                          : 'bg-[#0a162d] text-slate-400 hover:text-white border border-[#162a4c]'
                      }`}
                    >
                      {liters} Litr{liters === 1 ? 'o' : 'i'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Result Box */}
            <div className="bg-[#071733] border border-sky-500/30 rounded-xl p-3 text-right flex flex-col justify-center shrink-0">
              <span className="text-[10.5px] text-slate-400 uppercase tracking-wider block">
                Dose Chimico Raccomandata:
              </span>
              <div className="flex items-baseline justify-end gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-sky-300 font-mono">
                  {calculatedMl} ml
                </span>
                <span className="text-xs text-slate-300">
                  (ca. {capsCount} tapp{capsCount === 1 ? 'o' : 'i'})
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 mt-0.5">
                Miscelare in {selectedWaterLiters}L d'acqua
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Ready to use banner */
        <div className="bg-[#071328] border border-[#14284d] rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Prodotto Pronto all'Uso (No Diluizione)
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Questo formulato è già premiscelato alle concentrazioni ideali di efficacia e sicurezza. Applicare direttamente sulla superficie tramite trigger spray o dosatore integrato senza aggiungere acqua.
            </p>
          </div>
        </div>
      )}

      {/* Safety PPE Card (Dispositivi di Protezione Individuale) */}
      <div className="bg-[#071328] border border-[#14284d] rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#102242]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Scheda di Sicurezza & Dispositivi di Protezione (DPI)
            </h4>
          </div>
          <span className="text-[10.5px] font-semibold text-amber-300/90">
            D.Lgs 81/08 Safety Standard
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
          {profile.ppeList.map((ppe, idx) => {
            const Icon = ppe.icon;
            return (
              <div 
                key={idx} 
                className="bg-[#050c18] border border-[#11233e] p-2.5 rounded-xl flex items-center gap-2.5"
              >
                <div className={`p-2 rounded-lg ${
                  ppe.required 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                    : 'bg-[#0c1a34] text-slate-400 border border-[#152a4e]'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-white block">
                    {ppe.name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {ppe.standard} {ppe.required ? '• Obbligatorio' : '• Consigliato'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Safety Warnings Bullet List */}
        {profile.safetyWarnings && profile.safetyWarnings.length > 0 && (
          <div className="bg-[#120a0d] border border-rose-500/30 rounded-xl p-3 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[11px] mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Avvertenze & Precauzioni di Manipolazione:</span>
            </div>
            {profile.safetyWarnings.map((warn, wIdx) => (
              <p key={wIdx} className="text-slate-300 text-[11px] leading-relaxed pl-5 relative before:absolute before:left-2 before:top-1.5 before:w-1 before:h-1 before:rounded-full before:bg-rose-400">
                {warn}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Surface Compatibility & HACCP Protocol */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Compatible & Incompatible Surfaces */}
        <div className="bg-[#071328] border border-[#14284d] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-[#102242]">
            <Layers className="w-4 h-4 text-sky-400" />
            <h5 className="font-bold text-white uppercase text-[11px] tracking-wider">
              Compatibilità Superfici
            </h5>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-[10.5px] font-semibold text-emerald-400 block mb-1">
                ✓ Idoneo & Testato su:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {profile.compatibleSurfaces.map((surf, sIdx) => (
                  <span key={sIdx} className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded-md">
                    {surf}
                  </span>
                ))}
              </div>
            </div>

            {profile.incompatibleSurfaces && profile.incompatibleSurfaces.length > 0 && (
              <div className="pt-2 border-t border-[#0f1f3a]">
                <span className="text-[10.5px] font-semibold text-rose-400 block mb-1">
                  ✕ Non utilizzare o prestare cautela su:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {profile.incompatibleSurfaces.map((surf, sIdx) => (
                    <span key={sIdx} className="bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[10px] px-2 py-0.5 rounded-md">
                      {surf}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* HACCP & Compliance */}
        <div className="bg-[#071328] border border-[#14284d] rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-[#102242]">
              <FileText className="w-4 h-4 text-sky-400" />
              <h5 className="font-bold text-white uppercase text-[11px] tracking-wider">
                Protocollo HACCP & Settore Alimentare
              </h5>
            </div>
            <p className="text-slate-300 text-[11.5px] leading-relaxed">
              {profile.haccpProtocol}
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#0f1f3a] flex items-center justify-between text-[10.5px] text-slate-400">
            <span>Scheda Dati di Sicurezza (SDS)</span>
            <span className="text-sky-400 font-semibold font-mono">Disponibile su richiesta</span>
          </div>
        </div>
      </div>
    </div>
  );
};
