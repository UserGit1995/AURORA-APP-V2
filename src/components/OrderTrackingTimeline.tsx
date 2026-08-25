import React, { useState } from 'react';
import { 
  FileCheck, 
  PackageCheck, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MapPin, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  ShieldCheck,
  Building2,
  Info,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order } from '../types';
import { useLanguage } from '../context/LanguageContext';

export type TrackingStepStatus = 'completed' | 'current' | 'upcoming' | 'cancelled';

export interface TimelineStepItem {
  id: 'pending' | 'processing' | 'shipped' | 'delivered';
  key: string;
  stepNumber: number;
  label: string;
  sublabel: string;
  timestamp: string;
  location: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: TrackingStepStatus;
  detailsList?: string[];
}

interface OrderTrackingTimelineProps {
  order: Order;
  variant?: 'card' | 'detailed' | 'modal';
  showDetailsToggle?: boolean;
  className?: string;
  onOpenCarrierTracking?: () => void;
  onAdvanceToShipped?: () => void;
}

export const OrderTrackingTimeline: React.FC<OrderTrackingTimelineProps> = ({
  order,
  variant = 'card',
  showDetailsToggle = true,
  className = '',
  onOpenCarrierTracking,
  onAdvanceToShipped
}) => {
  const { t, language } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeStepTab, setActiveStepTab] = useState<number | null>(null);

  // Compute active lifecycle stage (1: Pending, 2: Processing, 3: Shipped, 4: Delivered)
  const getLifecycleStage = (order: Order): number => {
    if (order.status === 'Annullato') return 0;
    if (order.status === 'Consegnato') return 4;
    if (order.status === 'Spedito') return 3;
    
    // In elaborazione: check if packed or initial pending
    if (order.trackingNumber || order.id.includes('8512') || order.itemsCount > 40) {
      return 2;
    }
    return 1;
  };

  const currentStage = getLifecycleStage(order);
  const isCancelled = order.status === 'Annullato';
  const isActive = currentStage > 0 && currentStage < 4;

  // Build timeline steps with realistic timestamps based on order date and delivery date
  const steps: TimelineStepItem[] = [
    {
      id: 'pending',
      key: 'step-pending',
      stepNumber: 1,
      label: t('orders.stepPending', 'Pending'),
      sublabel: t('orders.stepPendingSub', 'Ricevuto & Convalidato'),
      timestamp: `${order.date} • 08:30`,
      location: language === 'it' ? 'Sede Commerciale AURORA' : 'AURORA HQ Sales Desk',
      description: language === 'it' 
        ? 'Ordine telematico registrato, P.IVA e plafond commerciale verificati con successo.'
        : 'Electronic order registered, VAT ID and trade credit limits successfully verified.',
      icon: FileCheck,
      status: isCancelled
        ? 'cancelled'
        : currentStage > 1
        ? 'completed'
        : currentStage === 1
        ? 'current'
        : 'upcoming',
      detailsList: [
        language === 'it' ? 'Convalida anagrafica aziendale & P.IVA' : 'Enterprise registration & VAT verification',
        language === 'it' ? 'Verifica disponibilità stock a scaffale' : 'Warehouse stock level check',
        language === 'it' ? 'Generazione distinta di prelievo (Picking list)' : 'Picking list generated for warehouse'
      ]
    },
    {
      id: 'processing',
      key: 'step-processing',
      stepNumber: 2,
      label: t('orders.stepProcessing', 'Processing'),
      sublabel: t('orders.stepProcessingSub', 'In Elaborazione / Allestimento'),
      timestamp: `${order.date} • 11:45`,
      location: language === 'it' ? 'Hub Logistica AURORA (Milano)' : 'AURORA Logistics Hub (Milan)',
      description: language === 'it'
        ? `Prelievo a scaffale di ${order.itemsCount} colli, confezionamento pallet e sigillatura di sicurezza.`
        : `Picking of ${order.itemsCount} package units, pallet wrapping, and security banding.`,
      icon: PackageCheck,
      status: isCancelled
        ? 'cancelled'
        : currentStage > 2
        ? 'completed'
        : currentStage === 2
        ? 'current'
        : 'upcoming',
      detailsList: [
        language === 'it' ? `Controllo qualità lotti su ${order.itemsCount} colli` : `Lot quality control on ${order.itemsCount} units`,
        language === 'it' ? 'Imballaggio protettivo per trasporto B2B' : 'Heavy-duty B2B transport packaging',
        language === 'it' ? `Lettera di Vettura generata: ${order.trackingNumber || 'AWB-STD-B2B'}` : `Waybill generated: ${order.trackingNumber || 'AWB-STD-B2B'}`
      ]
    },
    {
      id: 'shipped',
      key: 'step-shipped',
      stepNumber: 3,
      label: t('orders.stepShipped', 'Shipped'),
      sublabel: t('orders.stepShippedSub', 'Spedito / In Transito'),
      timestamp: currentStage >= 3 ? `${order.date} • 17:15` : `${language === 'it' ? 'Previsto' : 'Est.'}: ${order.date}`,
      location: order.courier ? `${order.courier} Express Logistics` : (language === 'it' ? 'Corriere Espresso B2B' : 'B2B Express Courier'),
      description: language === 'it'
        ? 'Pallet e colli affidati al corriere logistico. In viaggio verso la destinazione.'
        : 'Pallets handed over to freight carrier. In transit toward destination warehouse.',
      icon: Truck,
      status: isCancelled
        ? 'cancelled'
        : currentStage > 3
        ? 'completed'
        : currentStage === 3
        ? 'current'
        : 'upcoming',
      detailsList: [
        language === 'it' ? `Preso in carico da ${order.courier || 'Vettore Nazionale'}` : `Dispatched via ${order.courier || 'National Carrier'}`,
        language === 'it' ? 'Smistamento presso Hub logistico regionale' : 'Regional freight hub routing',
        language === 'it' ? `Stima arrivo: ${order.estimatedDelivery}` : `Estimated arrival: ${order.estimatedDelivery}`
      ]
    },
    {
      id: 'delivered',
      key: 'step-delivered',
      stepNumber: 4,
      label: t('orders.stepDelivered', 'Delivered'),
      sublabel: t('orders.stepDeliveredSub', 'Consegnato & Firmato'),
      timestamp: currentStage === 4 ? `${order.estimatedDelivery}` : `${language === 'it' ? 'Stima' : 'Est.'}: ${order.estimatedDelivery}`,
      location: order.shippingAddress?.city 
        ? `${order.shippingAddress.city} (${order.shippingAddress.province || 'IT'})`
        : (language === 'it' ? 'Indirizzo fornitura' : 'Destination facility'),
      description: language === 'it'
        ? 'Fornitura recapitata con successo e firmata al magazzino/sede del cliente.'
        : 'Supply delivered and signed at client\'s receiving facility.',
      icon: CheckCircle2,
      status: isCancelled
        ? 'cancelled'
        : currentStage === 4
        ? 'completed'
        : 'upcoming',
      detailsList: [
        language === 'it' ? `Consegna a: ${order.shippingAddress?.recipient || 'Logistica Ricevimento'}` : `Delivered to: ${order.shippingAddress?.recipient || 'Receiving Logistics'}`,
        language === 'it' ? 'Firma POD (Proof of Delivery) archiviata' : 'POD (Proof of Delivery) signature archived',
        language === 'it' ? 'Documento di trasporto (DDT) validato' : 'Transport document (DDT) signed & closed'
      ]
    }
  ];

  // Calculate filled progress line width percentage (25%, 50%, 75%, 100%)
  const getProgressPercentage = (): string => {
    if (isCancelled) return '0%';
    switch (currentStage) {
      case 1:
        return '16.5%';
      case 2:
        return '45%';
      case 3:
        return '78%';
      case 4:
        return '100%';
      default:
        return '0%';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Visual Step-Based Progress Stepper Box */}
      <div className={`rounded-2xl p-4 sm:p-5 transition-all shadow-inner ${
        isActive 
          ? 'bg-[#050e20] border border-sky-500/30 ring-1 ring-sky-500/20' 
          : 'bg-[#050c18] border border-[#11233e]'
      }`}>
        {/* Top Header of Stepper */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#0f1f38]">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${
              isActive 
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-xs' 
                : currentStage === 4 
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-800/40 text-slate-400 border-slate-700'
            }`}>
              <Clock className={`w-4 h-4 ${isActive ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-bold text-white block">
                  {isActive 
                    ? t('orders.activeProgress', 'Avanzamento Ordine Attivo')
                    : currentStage === 4 
                    ? t('orders.completedProgress', 'Fornitura Completata con Successo')
                    : 'Order Tracking Lifecycle'}
                </span>
                {isActive && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/25 text-sky-200 border border-sky-400/40 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    <span>LIVE</span>
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {language === 'it' 
                  ? 'Tracciamento tappe operative della fornitura (Pending • Processing • Shipped • Delivered)' 
                  : 'Supply lifecycle steps: Pending • Processing • Shipped • Delivered'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {order.status === 'In elaborazione' && onAdvanceToShipped && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAdvanceToShipped();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-sky-600/30 to-indigo-600/30 hover:from-sky-500/40 hover:to-indigo-500/40 text-sky-200 hover:text-white border border-sky-400/50 transition-all shadow-xs"
                title="Avanza lo stato dell'ordine da 'In elaborazione' a 'Spedito' ed emetti l'avviso toast"
              >
                <Truck className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                <span>{language === 'it' ? 'Simula Spedizione (In elaborazione ➔ Spedito)' : 'Advance to Shipped'}</span>
              </button>
            )}

            {isCancelled ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{language === 'it' ? 'Ordine Annullato' : 'Order Cancelled'}</span>
              </span>
            ) : currentStage === 4 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'it' ? 'Consegnato al 100%' : '100% Delivered'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-200 border border-sky-500/40 shadow-xs shadow-sky-950/50">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                <span>
                  {language === 'it' 
                    ? `Fase ${currentStage} di 4: ${steps[currentStage - 1]?.label} (${steps[currentStage - 1]?.sublabel})`
                    : `Step ${currentStage} of 4: ${steps[currentStage - 1]?.label}`}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* 4-Step Visual Stepper Grid with Continuous Connected Line */}
        <div className="relative px-2 sm:px-6 py-3">
          {/* Connector Line Background */}
          <div className="absolute top-7 left-8 right-8 sm:left-14 sm:right-14 h-1.5 bg-[#0e203c] rounded-full -z-0" />
          
          {/* Active Gradient Filled Progress Connector */}
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: getProgressPercentage() }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className={`absolute top-7 left-8 sm:left-14 h-1.5 rounded-full -z-0 transition-all ${
              isCancelled
                ? 'bg-rose-500'
                : 'bg-gradient-to-r from-sky-500 via-indigo-400 to-emerald-400 shadow-md shadow-sky-500/50'
            }`}
          />

          {/* Stepper Step Nodes */}
          <div className="relative z-10 grid grid-cols-4 gap-1 sm:gap-4">
            {steps.map((step) => {
              const Icon = step.icon;
              const isStepCompleted = step.status === 'completed';
              const isStepCurrent = step.status === 'current';
              const isStepUpcoming = step.status === 'upcoming';
              const isSelected = activeStepTab === step.stepNumber;

              return (
                <div 
                  key={step.id} 
                  className="flex flex-col items-center text-center cursor-pointer group select-none"
                  onClick={() => setActiveStepTab(isSelected ? null : step.stepNumber)}
                  title={`${language === 'it' ? 'Clicca per dettagli tappa' : 'Click for step details'}: ${step.label} - ${step.sublabel}`}
                >
                  {/* Step Icon Node */}
                  <div
                    className={`relative w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      isCancelled
                        ? 'bg-[#180e12] border-rose-500/50 text-rose-400'
                        : isStepCompleted
                        ? 'bg-[#0284c7] border-sky-300 text-white shadow-md shadow-sky-500/40 group-hover:scale-110'
                        : isStepCurrent
                        ? 'bg-[#071d3f] border-sky-400 text-sky-200 ring-4 ring-sky-500/30 shadow-lg shadow-sky-500/50 group-hover:scale-110'
                        : 'bg-[#09152b] border-[#142646] text-slate-500 group-hover:border-slate-500 group-hover:text-slate-400'
                    } ${isSelected ? 'ring-2 ring-white/80' : ''}`}
                  >
                    {isStepCompleted ? (
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                    ) : (
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isStepCurrent ? 'animate-pulse text-sky-300' : ''}`} />
                    )}

                    {/* Step Number Tag */}
                    <span 
                      className={`absolute -top-1 -right-1 w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full text-[9px] font-black flex items-center justify-center ${
                        isStepCompleted
                          ? 'bg-emerald-400 text-emerald-950 shadow-xs'
                          : isStepCurrent
                          ? 'bg-sky-400 text-sky-950 font-bold shadow-xs'
                          : 'bg-[#142646] text-slate-400'
                      }`}
                    >
                      {step.stepNumber}
                    </span>
                  </div>

                  {/* Step Title & Subtitle */}
                  <div className="mt-2.5 max-w-[85px] sm:max-w-[130px]">
                    <span className={`block text-xs sm:text-sm font-bold tracking-tight transition-colors ${
                      isStepCompleted 
                        ? 'text-white' 
                        : isStepCurrent 
                        ? 'text-sky-300 font-extrabold' 
                        : 'text-slate-500'
                    }`}>
                      {step.label}
                    </span>
                    <span className={`block text-[9.5px] sm:text-[10.5px] mt-0.5 leading-tight font-medium ${
                      isStepCurrent ? 'text-sky-300' : 'text-slate-400'
                    }`}>
                      {step.sublabel}
                    </span>
                  </div>

                  {/* Status Indicator Pill */}
                  <div className="mt-1.5">
                    {isStepCompleted ? (
                      <span className="text-[9px] sm:text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
                        {t('orders.stepCompleted', 'Completato')}
                      </span>
                    ) : isStepCurrent ? (
                      <span className="text-[9px] sm:text-[10px] font-bold text-sky-200 bg-sky-500/25 px-2 py-0.5 rounded-full border border-sky-400/50 shadow-xs shadow-sky-500/30 flex items-center gap-1 justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                        <span>{t('orders.stepCurrent', 'In corso')}</span>
                      </span>
                    ) : (
                      <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 bg-[#0c1a32] px-1.5 py-0.5 rounded-full">
                        {t('orders.stepUpcoming', 'In attesa')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Step Popover / Detail View */}
        <AnimatePresence>
          {activeStepTab !== null && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              className="mt-4 pt-3.5 border-t border-[#122340] overflow-hidden"
            >
              {(() => {
                const activeStep = steps.find((s) => s.stepNumber === activeStepTab);
                if (!activeStep) return null;
                const Icon = activeStep.icon;

                return (
                  <div className="bg-[#08152e] border border-[#173056] rounded-xl p-3.5 sm:p-4 text-xs text-slate-300 shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-[#122442]">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-white text-xs sm:text-sm">
                          {language === 'it' ? `Tappa ${activeStep.stepNumber}` : `Step ${activeStep.stepNumber}`}: {activeStep.label} — {activeStep.sublabel}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-sky-300 font-semibold bg-[#050c1a] px-2.5 py-1 rounded-md border border-[#142646]">
                        {activeStep.timestamp}
                      </span>
                    </div>

                    <p className="text-slate-300 text-xs leading-relaxed mb-3">
                      {activeStep.description}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-[#050c18] p-3 rounded-xl border border-[#11233e]">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                          {language === 'it' ? 'Posizione / Hub:' : 'Location / Hub:'}
                        </span>
                        <span className="font-semibold text-white mt-0.5 block">{activeStep.location}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                          {language === 'it' ? 'Stato Operativo:' : 'Operational Status:'}
                        </span>
                        <span className={`font-bold mt-0.5 block ${
                          activeStep.status === 'completed' 
                            ? 'text-emerald-400' 
                            : activeStep.status === 'current' 
                            ? 'text-sky-300' 
                            : 'text-slate-400'
                        }`}>
                          {activeStep.status === 'completed' 
                            ? (language === 'it' ? 'Attività Conclusa con Successo' : 'Milestone Completed') 
                            : activeStep.status === 'current' 
                            ? (language === 'it' ? 'Lavorazione Attiva in Corso' : 'Active In Progress') 
                            : (language === 'it' ? 'Pianificato in Coda' : 'Queued / Upcoming')}
                        </span>
                      </div>
                    </div>

                    {activeStep.detailsList && activeStep.detailsList.length > 0 && (
                      <ul className="mt-3 space-y-1.5 pl-1">
                        {activeStep.detailsList.map((item, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsible Detailed Milestones Log */}
        {showDetailsToggle && (
          <div className="mt-3 pt-3 border-t border-[#0f1f38] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
            >
              <span>{isExpanded ? (language === 'it' ? 'Nascondi cronologia tappe' : 'Hide milestone history') : (language === 'it' ? 'Mostra cronologia dettagliata & log logistici' : 'Show detailed logistics timeline')}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {order.courier && order.trackingNumber && onOpenCarrierTracking && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCarrierTracking();
                }}
                className="text-xs font-semibold text-slate-200 hover:text-white px-3 py-1.5 rounded-xl bg-[#0b1b36] hover:bg-[#0f244a] border border-sky-500/30 transition-colors inline-flex items-center gap-1.5 shadow-xs"
              >
                <Truck className="w-3.5 h-3.5 text-sky-400" />
                <span>{language === 'it' ? `Traccia con ${order.courier}` : `Track via ${order.courier}`}</span>
              </button>
            )}
          </div>
        )}

        {/* Expanded Vertical Milestones Tracker */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-[#122340] space-y-3 overflow-hidden"
            >
              <div className="relative pl-6 space-y-3.5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#152a4e]">
                {steps.map((step) => {
                  const isDone = step.status === 'completed';
                  const isNow = step.status === 'current';

                  return (
                    <div key={`exp-${step.id}`} className="relative text-xs">
                      {/* Node Bullet */}
                      <span className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                        isDone
                          ? 'bg-emerald-500 border-emerald-300 text-white'
                          : isNow
                          ? 'bg-sky-400 border-sky-200 text-[#051124] animate-ping'
                          : 'bg-[#09152b] border-[#183158]'
                      }`}>
                        {isDone && <Check className="w-2 h-2 stroke-[3]" />}
                      </span>

                      <div className="bg-[#071328] border border-[#122646] p-3 rounded-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <span>{step.stepNumber}. {step.label} — {step.sublabel}</span>
                          </span>
                          <span className="text-[11px] font-mono text-sky-300 font-semibold">
                            {step.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">
                          {step.description}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-sky-400" />
                          <span>{step.location}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

