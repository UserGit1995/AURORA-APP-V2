export interface SubSubCategory {
  id: string;
  name: string;
  subCategoryId: string;
  categoryId: string;
  image?: string;
  description?: string;
  countNumber?: number;
}

export interface SubCategory {
  id: string;
  name: string;
  categoryId: string;
  image?: string;
  description?: string;
  countNumber?: number;
  subSubCategories?: SubSubCategory[];
}

export interface Category {
  id: string;
  name: string;
  count: string;
  countNumber: number;
  image: string;
  description?: string;
  subCategories?: SubCategory[];
}

export interface Product {
  id: string;
  name: string;
  category: string;
  categoryId: string;
  subCategoryId?: string;
  subCategoryName?: string;
  subSubCategoryId?: string;
  subSubCategoryName?: string;
  image: string;
  price: number;
  unit: string;
  packageQty: string;
  code: string;
  isFavorite?: boolean;
  isFeatured?: boolean;
  isOffer?: boolean;
  discountPercent?: number;
  stock: number;
  lowStockThreshold?: number;
  description: string;
  specs: {
    format: string;
    fragrance?: string;
    certifications?: string[];
  };
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
  allowDirectOrderEdit: boolean;
  allowPriceOverride: boolean;
  announcementBannerText: string;
  enableAnnouncementBanner: boolean;
}
