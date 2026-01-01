// Transaction Service - Provides transactional safety for multi-step operations
// Implements rollback capability without database transactions

export interface RollbackAction {
  description: string;
  execute: () => boolean;
}

export interface TransactionResult<T> {
  success: boolean;
  data: T | null;
  error?: string;
  rolledBack?: boolean;
}

/**
 * Transaction context for managing multi-step operations
 * Tracks rollback actions and executes them on failure
 */
export class TransactionContext {
  private rollbackStack: RollbackAction[] = [];
  private committed = false;
  private rolledBack = false;

  /**
   * Registers a rollback action to be executed if the transaction fails
   * Actions are executed in reverse order (LIFO)
   */
  addRollback(action: RollbackAction): void {
    if (this.committed || this.rolledBack) {
      console.warn('Cannot add rollback to completed transaction');
      return;
    }
    this.rollbackStack.push(action);
  }

  /**
   * Executes all registered rollback actions in reverse order
   * Returns true if all rollbacks succeeded
   */
  rollback(): boolean {
    if (this.rolledBack) {
      console.warn('Transaction already rolled back');
      return true;
    }

    this.rolledBack = true;
    let allSucceeded = true;

    // Execute rollbacks in reverse order (LIFO)
    while (this.rollbackStack.length > 0) {
      const action = this.rollbackStack.pop()!;
      try {
        const success = action.execute();
        if (!success) {
          console.error(`Rollback failed: ${action.description}`);
          allSucceeded = false;
        }
      } catch (error) {
        console.error(`Rollback error for ${action.description}:`, error);
        allSucceeded = false;
      }
    }

    return allSucceeded;
  }

  /**
   * Marks the transaction as committed, clearing rollback stack
   */
  commit(): void {
    if (this.rolledBack) {
      throw new Error('Cannot commit a rolled-back transaction');
    }
    this.committed = true;
    this.rollbackStack = [];
  }

  isCommitted(): boolean {
    return this.committed;
  }

  isRolledBack(): boolean {
    return this.rolledBack;
  }

  getRollbackCount(): number {
    return this.rollbackStack.length;
  }
}

/**
 * Executes an operation within a transaction context
 * Automatically rolls back on failure
 */
export async function executeTransaction<T>(
  operation: (ctx: TransactionContext) => TransactionResult<T>
): Promise<TransactionResult<T>> {
  const ctx = new TransactionContext();
  
  try {
    const result = operation(ctx);
    
    if (result.success) {
      ctx.commit();
      return result;
    } else {
      const rolledBack = ctx.rollback();
      return {
        ...result,
        rolledBack,
      };
    }
  } catch (error) {
    const rolledBack = ctx.rollback();
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      rolledBack,
    };
  }
}

/**
 * Synchronous transaction execution helper
 */
export function executeTransactionSync<T>(
  operation: (ctx: TransactionContext) => TransactionResult<T>
): TransactionResult<T> {
  const ctx = new TransactionContext();
  
  try {
    const result = operation(ctx);
    
    if (result.success) {
      ctx.commit();
      return result;
    } else {
      const rolledBack = ctx.rollback();
      return {
        ...result,
        rolledBack,
      };
    }
  } catch (error) {
    const rolledBack = ctx.rollback();
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      rolledBack,
    };
  }
}
