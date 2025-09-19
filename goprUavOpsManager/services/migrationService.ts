import { ProcedureChecklistRepository } from '@/repositories/ProcedureChecklistRepository';
import { CategoryRepository } from '@/repositories/CategoryRepository';

export class MigrationService {
  /**
   * Run all migrations to update the data structure for category support
   */
  static async runMigrations(): Promise<void> {
    try {
      console.log('Starting migrations...');
      
      // Ensure default category exists
      await CategoryRepository.ensureDefaultCategory();
      console.log('Default category ensured');
      
      // Migrate existing procedures to default category
      const migratedCount = await ProcedureChecklistRepository.migrateProceduresToDefaultCategory();
      console.log(`Migrated ${migratedCount} procedures to default category`);
      
      console.log('All migrations completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Check if migrations need to be run
   */
  static async needsMigration(): Promise<boolean> {
    try {
      // Check if default category exists
      const defaultCategory = await CategoryRepository.getCategory('uncategorized');
      
      // If default category doesn't exist, we need migration
      if (!defaultCategory) {
        return true;
      }
      
      // Additional checks could be added here in the future
      return false;
    } catch (error) {
      console.error('Error checking migration status:', error);
      // If we can't check, assume we need migration
      return true;
    }
  }
}