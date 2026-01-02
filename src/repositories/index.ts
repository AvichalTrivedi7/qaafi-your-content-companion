// Repository Layer Exports
// All data access goes through repository interfaces
// Default implementations use Supabase for persistence

// Interfaces
export * from './interfaces';

// In-Memory Implementations (available for testing or fallback)
export { InMemoryInventoryRepository } from './InMemoryInventoryRepository';
export { InMemoryShipmentRepository } from './InMemoryShipmentRepository';
export { InMemoryReservationRepository } from './InMemoryReservationRepository';
export { InMemoryActivityRepository } from './InMemoryActivityRepository';
export { InMemoryCompanyRepository } from './InMemoryCompanyRepository';

// Supabase Implementations
export { SupabaseInventoryRepository } from './SupabaseInventoryRepository';
export { SupabaseShipmentRepository } from './SupabaseShipmentRepository';
export { SupabaseReservationRepository } from './SupabaseReservationRepository';
export { SupabaseActivityRepository } from './SupabaseActivityRepository';
export { SupabaseCompanyRepository } from './SupabaseCompanyRepository';

// Default repository instances (using Supabase)
import { SupabaseInventoryRepository } from './SupabaseInventoryRepository';
import { SupabaseShipmentRepository } from './SupabaseShipmentRepository';
import { SupabaseReservationRepository } from './SupabaseReservationRepository';
import { SupabaseActivityRepository } from './SupabaseActivityRepository';
import { SupabaseCompanyRepository } from './SupabaseCompanyRepository';

export const inventoryRepository = new SupabaseInventoryRepository();
export const shipmentRepository = new SupabaseShipmentRepository();
export const reservationRepository = new SupabaseReservationRepository();
export const activityRepository = new SupabaseActivityRepository();
export const companyRepository = new SupabaseCompanyRepository();

// Initialize all repositories (call on app startup)
export async function initializeRepositories(): Promise<void> {
  await Promise.all([
    inventoryRepository.initialize(),
    shipmentRepository.initialize(),
    reservationRepository.initialize(),
    activityRepository.initialize(),
    companyRepository.initialize(),
  ]);
}
