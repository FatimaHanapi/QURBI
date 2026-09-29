export enum UserRole {
  BUYER = 'buyer',
  FARMER = 'farmer',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

export enum VerificationStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export enum LivestockStatus {
  DRAFT = 'draft',
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  SOLD = 'sold',
  UNAVAILABLE = 'unavailable',
}

export enum LivestockSex {
  MALE = 'male',
  FEMALE = 'female',
}

// A bulk listing is bought as a whole lot (one buyer takes every animal in
// it), so its lifecycle is binary like Livestock's, not a share-sale funnel.
export enum BulkListingStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  SOLD = 'sold',
  CANCELLED = 'cancelled',
}

// Fulfilment track only — refunds run in parallel on `refundStatus`, not as
// a status here. REFUNDED is a terminal state reached exclusively via
// OrdersService.reviewRefund() (an approved refund), never through the
// generic transition table in OrdersService.updateStatus()/applyStatusChange.
export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  PREPARING = 'preparing',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  RECEIVED = 'received',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum ReservationStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum DeliveryMethod {
  DELIVERY = 'delivery',
  SELF_PICKUP = 'self_pickup',
  SLAUGHTER_AT_FARM = 'slaughter_at_farm',
}

export enum RefundStatus {
  NONE = 'none',
  REQUESTED = 'requested',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REFUNDED = 'refunded',
}

export enum OrderItemType {
  LIVESTOCK = 'livestock',
  BULK_LISTING = 'bulk_listing',
}

export enum RequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum NotificationAudience {
  BUYER = 'buyer',
  FARMER = 'farmer',
  ADMIN = 'admin',
}

export enum NotificationType {
  ORDER_UPDATE = 'order_update',
  PAYMENT = 'payment',
  DELIVERY = 'delivery',
  VERIFICATION = 'verification',
  REQUEST_UPDATE = 'request_update',
  LISTING = 'listing',
  PROMOTION = 'promotion',
  SYSTEM = 'system',
}

export enum AddressLabel {
  HOME = 'home',
  WORK = 'work',
  OTHER = 'other',
}

export enum UploadVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}
