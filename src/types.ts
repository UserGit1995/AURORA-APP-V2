export interface Category {
  id: string;
  name: string;
  count: string;
  countNumber: number;
  image: string;
  description?: string;
  // Albero marca->tipologia montato da buildCategoryTree() in services/supabase.ts,
  // usato dai filtri "Sottocategorie"/"Micro-categorie" di CatalogView.tsx.
  subCategories?: (Subcategory & { subSubCategories?: Subcategory[] })[];
}

export interface Subcategory {
  id: string;
  categoryId: string;
  parentSubcategoryId?: string | null; // se valorizzato: è una sotto-sottocategoria
  name: string;
  slug: string;
  sortOrder: number;
  active: boolean;
  image?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  categoryId: string;
  subcategoryId?: string | null;
  // Derivati da subcategoryId da enrichProductsWithSubcategoryTree() (services/supabase.ts):
  // subCategoryId = marca, subSubCategoryId = tipologia. Usati dai filtri di CatalogView.tsx.
  subCategoryId?: string | null;
  subCategoryName?: string;
  subSubCategoryId?: string | null;
  subSubCategoryName?: string;
  image: string;
  price: number;
  unit: string;
  packageQty: string;
  code: string;
  isFavorite?: boolean;
  isFeatured?: boolean;
  isOffer?: boolean;
  isEco?: boolean;
  isMedicalDevice?: boolean;
  isBestseller?: boolean;
  discountPercent?: number;
  // Offerta: `price` è già il prezzo in offerta; qui si conserva il prezzo di listino di prima
  // (per mostrarlo barrato e per poter chiudere l'offerta) e una nota (es. prezzo a quantità).
  originalPrice?: number;
  offerNote?: string;
  // Offerta a tempo programmata dall'admin (si attiva e si chiude da sola)
  flashOffer?: FlashOffer;
  stock: number;
  lowStockThreshold?: number;
  description: string;
  specs: {
    format: string;
    fragrance?: string;
    certifications?: string[];
  };
}

// Offerta a tempo su un singolo prodotto
export interface FlashOffer {
  price: number;        // prezzo in offerta (senza IVA, come `price`)
  startAt: string;      // inizio (data e ora, formato ISO)
  endAt: string;        // fine (data e ora, formato ISO)
  dailyFrom?: string;   // facoltativo: valida solo in questa fascia oraria ogni giorno, es. '09:00'
  dailyTo?: string;     // es. '17:00'
  active: boolean;      // interruttore della singola offerta
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type CustomerType = 'azienda' | 'privato';
export type DeliveryOption = 'corriere' | 'ritiro_sede';

export interface ShippingAddress {
  customerType?: CustomerType;
  companyName?: string;
  recipient: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
  vatNumber?: string; // P.IVA o Codice Fiscale
  fiscalCode?: string;
  sdiCode?: string; // Codice SDI o PEC (se azienda)
  deliveryOption?: DeliveryOption;
  deliveryNotes?: string;
}

export interface OrderItemDetail {
  productId?: string;
  productName: string;
  code?: string;
  qty: number;
  price: number;
  packageQty?: string;
}

export interface Order {
  id: string;
  date: string;
  status: 'In elaborazione' | 'Spedito' | 'Consegnato' | 'Annullato';
  estimatedDelivery: string;
  courier?: string;
  trackingNumber?: string;
  total: number;
  subtotal?: number;
  vatAmount?: number;
  shippingCost?: number;
  paymentMethod?: string;
  shippingAddress?: ShippingAddress;
  itemsCount: number;
  items: OrderItemDetail[];
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'promo' | 'order' | 'info';
}

export interface RestockRecommendation {
  productId: string;
  productName: string;
  currentStock: number;
  pastOrderedQty: number;
  suggestedReorderQty: number;
  urgency: 'CRITICA' | 'ALTA' | 'MEDIA' | 'OTTIMALE';
  daysUntilDepletion: number;
  rationale: string;
  leadTimeWeeks?: number;
  costEstimate: number;
}

export interface RestockAnalysisResult {
  summary: string;
  criticalItemsCount: number;
  totalEstimatedCost: number;
  recommendations: RestockRecommendation[];
  modelUsed?: string;
  fallbackNotice?: string;
}

export interface OrderTemplateItem {
  productId: string;
  quantity: number;
}

export interface OrderTemplate {
  id: string;
  name: string;
  description?: string;
  tag?: string;
  items: OrderTemplateItem[];
  createdAt: string;
  updatedAt?: string;
  isPreset?: boolean;
}

export interface ToastNotification {
  id: string;
  type: 'order_shipped' | 'order_status' | 'success' | 'info' | 'warning';
  title: string;
  message: string;
  orderId?: string;
  courier?: string;
  trackingNumber?: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
  createdAt?: number;
}

export type UserRole = 'superadmin' | 'admin' | 'manager' | 'user';

export interface UserPermissions {
  canEditCatalog: boolean;
  canEditPrices: boolean;
  canEditStock: boolean;
  canEditOrders: boolean;
  canEditUsers: boolean;
  canEditCompanyInfo: boolean;
  canDeleteRecords: boolean;
  canOverrideDiscounts: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  company?: string;
  piva?: string;
  customerType?: 'privato' | 'attivita';
  sdi?: string;
  pec?: string;
  role: UserRole;
  avatarInitials?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  country?: string;
  permissions?: UserPermissions;
}

export interface SystemSettings {
  companyName: string;
  brandTitle: string;
  contactEmail: string;
  contactPhone: string;
  vatNumber: string;
  sdiCode: string;
  address: string;
  minimumOrderEur: number;
  freeShippingThresholdEur: number;
  standardShippingEur: number;
  vatRatePercent: number;
  // IVA applicata ai prezzi (%). 0 = nessuna IVA. La imposta l'admin da Impostazioni.
  vatPercent?: number;
  allowDirectOrderEdit: boolean;
  allowPriceOverride: boolean;
  announcementBannerText: string;
  enableAnnouncementBanner: boolean;
  // Interruttore generale delle offerte a tempo
  flashOffersEnabled?: boolean;
}
