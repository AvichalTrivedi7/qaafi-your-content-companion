// Services barrel export

// Service classes (for dependency injection)
export { InventoryService, inventoryService } from './inventoryService';
export { ShipmentService, shipmentService } from './shipmentService';
export { ReservationService, reservationService } from './reservationService';
export { ActivityService, activityService } from './activityService';
export { CompanyService, companyService } from './companyService';
export { dashboardService } from './dashboardService';

// Transaction support
export { TransactionContext, executeTransaction, executeTransactionSync } from './transactionService';
export type { RollbackAction, TransactionResult } from './transactionService';
