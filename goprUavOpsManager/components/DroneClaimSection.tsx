import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { DroneClaim } from '@/types/DroneClaim';
import { UserRole } from '@/types/UserRole';
import { DroneClaimService } from '@/services/droneClaimService';
import { UserService } from '@/services/userService';
import { useCrossPlatformAlert } from './CrossPlatformAlert';
import { useOfflineButtons } from '@/utils/useOfflineButtons';
import AdminOverrideModal from './AdminOverrideModal';

interface DroneClaimSectionProps {
  droneId: string;
  droneName: string;
  isShareable: boolean;
  currentUserId: string;
  currentUserRole: UserRole;
  currentUserEmail: string;
  disabled?: boolean;
  onClaimChanged?: () => void;
}

export default function DroneClaimSection({
  droneId,
  droneName,
  isShareable,
  currentUserId,
  currentUserRole,
  currentUserEmail,
  disabled = false,
  onClaimChanged
}: DroneClaimSectionProps) {
  const { t } = useTranslation('common');
  const { isButtonDisabled, getDisabledStyle } = useOfflineButtons();
  const crossPlatformAlert = useCrossPlatformAlert();

  const [activeClaim, setActiveClaim] = useState<DroneClaim | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAdminOverride, setShowAdminOverride] = useState(false);
  const [claimHistory, setClaimHistory] = useState<DroneClaim[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [ownerName, setOwnerName] = useState<string>('');

  // Load active claim
  useEffect(() => {
    loadActiveClaim();
  }, [droneId]);

  const loadActiveClaim = async () => {
    try {
      setLoading(true);
      const claim = await DroneClaimService.getActiveClaim(droneId);
      setActiveClaim(claim);
      
      if (claim) {
        const name = await UserService.getUserDisplayName(claim.userId);
        setOwnerName(name);
      }
    } catch (error) {
      console.error('Error loading active claim:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClaimHistory = async () => {
    try {
      setHistoryLoading(true);
      const history = await DroneClaimService.getDroneClaimHistory(droneId, 50);
      setClaimHistory(history);
    } catch (error) {
      console.error('Error loading claim history:', error);
      crossPlatformAlert.showAlert({
        title: t('common.error'),
        message: t('droneClaims.failedToLoadHistory'),
        buttons: [{ text: t('common.ok') }]
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleClaimDrone = async () => {
    try {
      setActionLoading(true);
      await DroneClaimService.claimDrone(droneId, currentUserId, currentUserRole, currentUserEmail);
      
      crossPlatformAlert.showAlert({
        title: t('common.success'),
        message: t('droneClaims.droneClaimedSuccess'),
        buttons: [{ text: t('common.ok') }]
      });
      
      await loadActiveClaim();
      onClaimChanged?.();
    } catch (error: any) {
      crossPlatformAlert.showAlert({
        title: t('common.error'),
        message: error.message || t('droneClaims.failedToClaim'),
        buttons: [{ text: t('common.ok') }]
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleaseClaim = async () => {
    if (!activeClaim) return;

    try {
      setActionLoading(true);
      await DroneClaimService.releaseClaim(activeClaim.id, currentUserId, currentUserRole, currentUserEmail);
      
      crossPlatformAlert.showAlert({
        title: t('common.success'),
        message: t('droneClaims.droneReleasedSuccess'),
        buttons: [{ text: t('common.ok') }]
      });
      
      await loadActiveClaim();
      onClaimChanged?.();
    } catch (error: any) {
      crossPlatformAlert.showAlert({
        title: t('common.error'),
        message: error.message || t('droneClaims.failedToRelease'),
        buttons: [{ text: t('common.ok') }]
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdminOverride = () => {
    setShowAdminOverride(true);
  };

  const handleAdminOverrideAction = async (newUserId: string | null) => {
    try {
      setActionLoading(true);
      await DroneClaimService.adminOverrideClaim(
        droneId,
        newUserId,
        currentUserId,
        currentUserRole,
        currentUserEmail
      );
      
      await loadActiveClaim();
      onClaimChanged?.();
    } catch (error: any) {
      throw error; // Let the modal handle the error display
    } finally {
      setActionLoading(false);
    }
  };

  const showClaimHistory = () => {
    setShowHistory(true);
    loadClaimHistory();
  };

  const isDisabled = disabled || isButtonDisabled() || actionLoading;
  const canClaim = isShareable && !activeClaim;
  const canRelease = activeClaim && (activeClaim.userId === currentUserId || currentUserRole === 'admin');
  const canOverride = activeClaim && currentUserRole === 'admin';

  if (!isShareable) {
    return null; // Don't show claim section for non-shareable drones
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('droneClaims.claimStatus')}</Text>
        </View>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('droneClaims.claimStatus')}</Text>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={showClaimHistory}
          disabled={isDisabled}
        >
          <Ionicons name="time-outline" size={16} color="#007AFF" />
          <Text style={styles.historyButtonText}>{t('droneClaims.viewHistory')}</Text>
        </TouchableOpacity>
      </View>

      {activeClaim ? (
        <View style={styles.claimInfo}>
          <View style={styles.statusRow}>
            <Ionicons name="person" size={16} color="#28a745" />
            <Text style={styles.statusText}>
              {t('droneClaims.ownedBy', { owner: ownerName })}
            </Text>
          </View>
          <Text style={styles.claimDetails}>
            {t('droneClaims.claimedSince', { 
              date: activeClaim.startTime.toLocaleDateString(),
              time: activeClaim.startTime.toLocaleTimeString(),
              duration: DroneClaimService.formatClaimDuration(activeClaim.startTime)
            })}
          </Text>
          
          <View style={styles.buttonContainer}>
            {canRelease && (
              <TouchableOpacity
                style={[styles.button, styles.releaseButton, isDisabled && getDisabledStyle()]}
                onPress={handleReleaseClaim}
                disabled={isDisabled}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="unlock-outline" size={16} color="#fff" />
                    <Text style={styles.buttonText}>
                      {activeClaim.userId === currentUserId ? t('droneClaims.releaseClaim') : t('droneClaims.forceRelease')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            
            {canOverride && (
              <TouchableOpacity
                style={[styles.button, styles.overrideButton, isDisabled && getDisabledStyle()]}
                onPress={handleAdminOverride}
                disabled={isDisabled}
              >
                <Ionicons name="swap-horizontal-outline" size={16} color="#fff" />
                <Text style={styles.buttonText}>{t('droneClaims.adminOverride')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.availableInfo}>
          <View style={styles.statusRow}>
            <Ionicons name="checkmark-circle" size={16} color="#28a745" />
            <Text style={styles.statusText}>{t('droneClaims.available')}</Text>
          </View>
          
          {canClaim && (
            <TouchableOpacity
              style={[styles.button, styles.claimButton, isDisabled && getDisabledStyle()]}
              onPress={handleClaimDrone}
              disabled={isDisabled}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="lock-closed-outline" size={16} color="#fff" />
                  <Text style={styles.buttonText}>{t('droneClaims.claimDrone')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Claim History Modal */}
      <Modal
        visible={showHistory}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('droneClaims.claimHistory')}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowHistory(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {historyLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : (
            <FlatList
              data={claimHistory}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ClaimHistoryItem claim={item} />}
              style={styles.historyList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>{t('droneClaims.noClaimHistory')}</Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>

      {/* Admin Override Modal */}
      <AdminOverrideModal
        visible={showAdminOverride}
        droneId={droneId}
        droneName={droneName}
        currentClaimOwner={ownerName}
        onClose={() => setShowAdminOverride(false)}
        onOverride={handleAdminOverrideAction}
      />
    </View>
  );
}

// Component for individual claim history items
function ClaimHistoryItem({ claim }: { claim: DroneClaim }) {
  const { t } = useTranslation('common');
  const [ownerName, setOwnerName] = useState<string>('');

  useEffect(() => {
    const loadOwnerName = async () => {
      try {
        const name = await UserService.getUserDisplayName(claim.userId);
        setOwnerName(name);
      } catch (error) {
        setOwnerName(claim.userEmail);
      }
    };
    loadOwnerName();
  }, [claim.userId]);

  const isActive = !claim.endTime;
  const duration = claim.endTime 
    ? DroneClaimService.formatClaimDuration(claim.startTime, claim.endTime)
    : DroneClaimService.formatClaimDuration(claim.startTime);

  return (
    <View style={[styles.historyItem, isActive && styles.activeHistoryItem]}>
      <View style={styles.historyHeader}>
        <View style={styles.ownerInfo}>
          <Ionicons 
            name={isActive ? "person" : "person-outline"} 
            size={16} 
            color={isActive ? "#28a745" : "#666"} 
          />
          <Text style={[styles.ownerName, isActive && styles.activeOwnerName]}>
            {ownerName}
          </Text>
        </View>
        <View style={[styles.statusBadge, isActive && styles.activeStatusBadge]}>
          <Text style={[styles.statusBadgeText, isActive && styles.activeStatusBadgeText]}>
            {isActive ? t('droneClaims.active') : t('droneClaims.completed')}
          </Text>
        </View>
      </View>
      
      <Text style={styles.historyDates}>
        {t('droneClaims.claimPeriod', {
          start: claim.startTime.toLocaleDateString(),
          startTime: claim.startTime.toLocaleTimeString(),
          end: claim.endTime ? claim.endTime.toLocaleDateString() : t('droneClaims.ongoing'),
          endTime: claim.endTime ? claim.endTime.toLocaleTimeString() : '',
          duration
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  claimInfo: {
    gap: 12,
  },
  availableInfo: {
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  claimDetails: {
    fontSize: 14,
    color: '#666',
    marginLeft: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 120,
    justifyContent: 'center',
  },
  claimButton: {
    backgroundColor: '#007AFF',
  },
  releaseButton: {
    backgroundColor: '#dc3545',
  },
  overrideButton: {
    backgroundColor: '#ffc107',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyList: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  historyItem: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  activeHistoryItem: {
    backgroundColor: '#e7f5e7',
    borderColor: '#28a745',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  activeOwnerName: {
    color: '#28a745',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#6c757d',
  },
  activeStatusBadge: {
    backgroundColor: '#28a745',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  activeStatusBadgeText: {
    color: '#fff',
  },
  historyDates: {
    fontSize: 14,
    color: '#666',
  },
});