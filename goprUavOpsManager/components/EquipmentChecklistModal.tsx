import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { EquipmentStorage } from '@/types/Drone';

interface EquipmentChecklistModalProps {
  visible: boolean;
  equipmentStorages: EquipmentStorage[];
  onClose: () => void;
  // callback wywoływany po wyborze "Zgłoś braki"; argument to domyślny tekst komentarza
  onReportMissing?: (defaultComment: string) => void;
}

interface ChecklistState {
  [equipmentId: string]: boolean;
}

export default function EquipmentChecklistModal({
  visible,
  equipmentStorages,
  onClose,
  onReportMissing,
}: EquipmentChecklistModalProps) {
  const { t } = useTranslation('common');
  const [checkedItems, setCheckedItems] = useState<ChecklistState>({});
  const [currentStorageIndex, setCurrentStorageIndex] = useState(0);

  // Get all items from all storages for total count
  const allItems = equipmentStorages.flatMap(storage => storage.items);
  const currentStorage = equipmentStorages[currentStorageIndex] || null;

  const handleToggleCheck = (equipmentId: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [equipmentId]: !prev[equipmentId],
    }));
  };

  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const totalCount = allItems.length;
  const allChecked = checkedCount === totalCount && totalCount > 0;

  // Navigation functions
  const goToPreviousStorage = () => {
    if (currentStorageIndex > 0) {
      setCurrentStorageIndex(currentStorageIndex - 1);
    }
  };

  const goToNextStorage = () => {
    if (currentStorageIndex < equipmentStorages.length - 1) {
      setCurrentStorageIndex(currentStorageIndex + 1);
    }
  };

  const canGoBack = currentStorageIndex > 0;
  const canGoForward = currentStorageIndex < equipmentStorages.length - 1;

  const handleResetChecklist = () => {
    setCheckedItems({});
  };

  const handleReportMissing = () => {
    // Build list of missing items (those not checked)
    const missing = allItems.filter(item => !checkedItems[item.id]);

    let defaultComment: string;
    if (missing.length === 0) {
      defaultComment = t('equipment.reportMissingNone');
    } else {
      const lines = missing.map(mi => `- ${mi.name}${mi.quantity ? ` (x${mi.quantity})` : ''}`);
      defaultComment = `${t('equipment.reportMissingIntro')}\n${lines.join('\n')}`;
    }

    // Close modal first
    onClose();

    // Then notify parent to open comment creation UI with prefilled text
    if (onReportMissing) {
      onReportMissing(defaultComment);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>{t('equipment.checklist')}</Text>
          <TouchableOpacity style={styles.resetButton} onPress={handleResetChecklist}>
            <Text style={styles.resetButtonText}>{t('equipment.reset')}</Text>
          </TouchableOpacity>
        </View>

        {equipmentStorages.length > 1 && (
          <View style={styles.navigationHeader}>
            <TouchableOpacity 
              style={[styles.navButton, !canGoBack && styles.navButtonDisabled]} 
              onPress={goToPreviousStorage}
              disabled={!canGoBack}
            >
              <Ionicons name="chevron-back" size={20} color={canGoBack ? "#007AFF" : "#ccc"} />
            </TouchableOpacity>
            
            <View style={styles.storageInfo}>
              <Text style={styles.storageTitle}>
                {currentStorage?.name || t('equipmentStorage.storage')}
              </Text>
              <Text style={styles.storageCounter}>
                {currentStorageIndex + 1} / {equipmentStorages.length}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.navButton, !canGoForward && styles.navButtonDisabled]} 
              onPress={goToNextStorage}
              disabled={!canGoForward}
            >
              <Ionicons name="chevron-forward" size={20} color={canGoForward ? "#007AFF" : "#ccc"} />
            </TouchableOpacity>
          </View>
        )}

        {equipmentStorages.length === 1 && currentStorage && (
          <View style={styles.singleStorageHeader}>
            <Text style={styles.storageTitle}>{currentStorage.name}</Text>
          </View>
        )}

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {t('equipment.progress', { checked: checkedCount, total: totalCount })}
          </Text>
        </View>

        {allChecked && (
          <View style={styles.completionBanner}>
            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
            <Text style={styles.completionText}>{t('equipment.allItemsChecked')}</Text>
          </View>
        )}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {equipmentStorages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="bag-outline" size={48} color="#999" />
              <Text style={styles.emptyStateText}>{t('equipmentStorage.noStorages')}</Text>
            </View>
          ) : !currentStorage ? (
            <View style={styles.emptyState}>
              <Ionicons name="list-outline" size={48} color="#999" />
              <Text style={styles.emptyStateText}>{t('equipment.noEquipment')}</Text>
            </View>
          ) : currentStorage.items.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="list-outline" size={48} color="#999" />
              <Text style={styles.emptyStateText}>{t('equipment.noEquipmentInStorage')}</Text>
            </View>
          ) : (
            currentStorage.items.map((item) => {
              const isChecked = checkedItems[item.id] || false;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.checklistItem, isChecked && styles.checkedItem]}
                  onPress={() => handleToggleCheck(item.id)}
                >
                  <View style={styles.itemContent}>
                    <View style={styles.itemInfo}>
                      {item.image && (
                        <Image source={{ uri: item.image }} style={styles.itemImage} />
                      )}
                      <View style={styles.itemDetails}>
                        <Text style={[styles.itemName, isChecked && styles.checkedText]}>
                          {item.name}
                        </Text>
                        <Text style={[styles.itemQuantity, isChecked && styles.checkedText]}>
                          {t('equipment.quantity')}: {item.quantity}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.checkbox, isChecked && styles.checkedBox]}>
                      {isChecked && (
                        <Ionicons name="checkmark" size={18} color="#fff" />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerNote}>
            {t('equipment.checklistNote')}
          </Text>

          <TouchableOpacity style={styles.reportMissingButton} onPress={handleReportMissing}>
            <Ionicons name="alert-circle-outline" size={18} color="#D7263D" style={{ marginRight: 6 }} />
            <Text style={styles.reportMissingText}>{t('equipment.reportMissing')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  resetButton: {
    padding: 8,
  },
  resetButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  completionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E8',
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  completionText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#34C759',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  checklistItem: {
    marginVertical: 6,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  checkedItem: {
    backgroundColor: '#f0f9ff',
    borderColor: '#007AFF',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  checkedText: {
    color: '#007AFF',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedBox: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
  },
  footerNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f0f8ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  singleStorageHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f0f8ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  navButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    minWidth: 40,
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: '#f5f5f5',
  },
  storageInfo: {
    alignItems: 'center',
    flex: 1,
  },
  storageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
    textAlign: 'center',
  },
  storageCounter: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  reportMissingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#fff3f3',
    borderWidth: 1,
    borderColor: '#D7263D',
    marginTop: 8,
  },
  reportMissingText: {
    fontSize: 14,
    color: '#D7263D',
    fontWeight: '500',
  },
});
