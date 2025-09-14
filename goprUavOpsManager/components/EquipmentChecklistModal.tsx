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
import { DroneEquipmentItem } from '@/types/Drone';

interface EquipmentChecklistModalProps {
  visible: boolean;
  equipmentList: DroneEquipmentItem[];
  onClose: () => void;
}

interface ChecklistState {
  [equipmentId: string]: boolean;
}

export default function EquipmentChecklistModal({
  visible,
  equipmentList,
  onClose,
}: EquipmentChecklistModalProps) {
  const { t } = useTranslation('common');
  const [checkedItems, setCheckedItems] = useState<ChecklistState>({});

  const handleToggleCheck = (equipmentId: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [equipmentId]: !prev[equipmentId],
    }));
  };

  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const totalCount = equipmentList.length;
  const allChecked = checkedCount === totalCount && totalCount > 0;

  const handleResetChecklist = () => {
    setCheckedItems({});
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
          {equipmentList.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="list-outline" size={48} color="#999" />
              <Text style={styles.emptyStateText}>{t('equipment.noEquipment')}</Text>
            </View>
          ) : (
            equipmentList.map((item) => {
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
});