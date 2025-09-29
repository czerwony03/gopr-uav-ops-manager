import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { UserService } from '@/services/userService';
import { User } from '@/types/User';
import { useCrossPlatformAlert } from './CrossPlatformAlert';

interface AdminOverrideModalProps {
  visible: boolean;
  droneId: string;
  droneName: string;
  currentClaimOwner?: string;
  onClose: () => void;
  onOverride: (newUserId: string | null) => Promise<void>;
}

interface UserSearchResult {
  uid: string;
  email: string;
  displayName: string;
}

export default function AdminOverrideModal({
  visible,
  droneId,
  droneName,
  currentClaimOwner,
  onClose,
  onOverride
}: AdminOverrideModalProps) {
  const { t } = useTranslation('common');
  const crossPlatformAlert = useCrossPlatformAlert();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUser(null);
    }
  }, [visible]);

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      // This is a simplified search - in a real app you'd want to implement
      // proper user search functionality in UserService
      const allUsers = await UserService.getAllUsers();
      const filtered = allUsers
        .filter(user => 
          user.email.toLowerCase().includes(query.toLowerCase()) ||
          (user.firstName && user.firstName.toLowerCase().includes(query.toLowerCase())) ||
          (user.surname && user.surname.toLowerCase().includes(query.toLowerCase()))
        )
        .slice(0, 10) // Limit results
        .map(user => ({
          uid: user.uid,
          email: user.email,
          displayName: UserService.formatDisplayName(user.firstName, user.surname, user.email)
        }));
      
      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
      crossPlatformAlert.showAlert({
        title: t('common.error'),
        message: t('droneClaims.userSearchError'),
        buttons: [{ text: t('common.ok') }]
      });
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    searchUsers(query);
  };

  const handleUserSelect = (user: UserSearchResult) => {
    setSelectedUser(user);
    setSearchQuery(user.displayName);
    setSearchResults([]);
  };

  const handleEndClaimOnly = async () => {
    try {
      setLoading(true);
      await onOverride(null);
      onClose();
      crossPlatformAlert.showAlert({
        title: t('common.success'),
        message: t('droneClaims.claimEndedSuccess'),
        buttons: [{ text: t('common.ok') }]
      });
    } catch (error: any) {
      crossPlatformAlert.showAlert({
        title: t('common.error'),
        message: error.message || t('droneClaims.overrideFailed'),
        buttons: [{ text: t('common.ok') }]
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToUser = async () => {
    if (!selectedUser) {
      crossPlatformAlert.showAlert({
        title: t('common.error'),
        message: t('droneClaims.selectUserFirst'),
        buttons: [{ text: t('common.ok') }]
      });
      return;
    }

    try {
      setLoading(true);
      await onOverride(selectedUser.uid);
      onClose();
      crossPlatformAlert.showAlert({
        title: t('common.success'),
        message: t('droneClaims.droneAssignedSuccess', { user: selectedUser.displayName }),
        buttons: [{ text: t('common.ok') }]
      });
    } catch (error: any) {
      crossPlatformAlert.showAlert({
        title: t('common.error'),
        message: error.message || t('droneClaims.overrideFailed'),
        buttons: [{ text: t('common.ok') }]
      });
    } finally {
      setLoading(false);
    }
  };

  const renderUserItem = ({ item }: { item: UserSearchResult }) => (
    <TouchableOpacity
      style={[
        styles.userItem,
        selectedUser?.uid === item.uid && styles.selectedUserItem
      ]}
      onPress={() => handleUserSelect(item)}
    >
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.displayName}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      {selectedUser?.uid === item.uid && (
        <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('droneClaims.adminOverride')}</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.droneInfo}>
            {t('droneClaims.overridingFor')}: <Text style={styles.droneName}>{droneName}</Text>
          </Text>
          
          {currentClaimOwner && (
            <Text style={styles.currentOwner}>
              {t('droneClaims.currentOwner')}: {currentClaimOwner}
            </Text>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('droneClaims.overrideOptions')}</Text>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.endClaimButton]}
              onPress={handleEndClaimOnly}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="stop-circle-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>
                    {t('droneClaims.endClaimOnly')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('droneClaims.assignToNewUser')}</Text>
            
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('droneClaims.searchUsers')}
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searching && (
                <ActivityIndicator size="small" color="#007AFF" style={styles.searchSpinner} />
              )}
            </View>

            {searchResults.length > 0 && (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.uid}
                renderItem={renderUserItem}
                style={styles.searchResults}
                keyboardShouldPersistTaps="handled"
              />
            )}

            {selectedUser && (
              <TouchableOpacity
                style={[styles.actionButton, styles.assignButton]}
                onPress={handleAssignToUser}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="person-add-outline" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>
                      {t('droneClaims.assignToDrone')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  droneInfo: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  droneName: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  currentOwner: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  endClaimButton: {
    backgroundColor: '#dc3545',
  },
  assignButton: {
    backgroundColor: '#28a745',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  searchSpinner: {
    marginLeft: 8,
  },
  searchResults: {
    maxHeight: 200,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedUserItem: {
    backgroundColor: '#e7f3ff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});