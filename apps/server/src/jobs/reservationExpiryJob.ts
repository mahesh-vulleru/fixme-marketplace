import { CommerceService } from '../services/commerceService';
import { logger } from '../middleware/logger';

export async function runReservationExpiryJob(): Promise<number> {
  try {
    const expiredCount = await CommerceService.expireOverdueReservations(new Date());
    if (expiredCount > 0) {
      logger.info('Expired overdue checkout stock reservations', { expiredCount });
    }
    return expiredCount;
  } catch (err) {
    logger.error('Failed to run reservation expiry job', {
      error: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}

