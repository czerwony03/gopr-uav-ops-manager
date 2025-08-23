import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { formatDate, formatLastLogin } from '@/utils/dateUtils';
import { UserRole } from '@/types/UserRole';
import CrossPlatformAlert from './CrossPlatformAlert';

interface UserData {
  id?: string;
  uid?: string;
  email: string;
  role: UserRole;
  firstname?: string;
  surname?: string;
  phone?: string;
  residentialAddress?: string;
  operatorNumber?: string;
  operatorValidityDate?: Date;
  pilotNumber?: string;
  pilotValidityDate?: Date;
  licenseConversionNumber?: string;
  qualifications?: string[];
  insurance?: Date;
  lastLoginAt?: Date;
}

interface UserComponentProps {
  user: UserData;
  mode: 'card' | 'detail';
  showActions?: boolean;
  currentUserRole?: UserRole;
  onRoleUpdate?: (userId: string, currentRole: UserRole) => void;
}

export default function UserComponent({
  user,
  mode,
  showActions = true,
  currentUserRole,
  onRoleUpdate,
}: UserComponentProps) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const userId = user.id || user.uid || '';

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return '#FF6B6B';
      case UserRole.MANAGER:
        return '#4ECDC4';
      case UserRole.USER:
        return '#45B7D1';
      default:
        return '#999';
    }
  };

  const getDisplayName = () => {
    const name = [user.firstname, user.surname].filter(Boolean).join(' ');
    return name || user.email;
  };

  if (mode === 'card') {
    return (
      <View style={styles.userCard}>
        <View style={styles.userInfo}>
          <Text style={styles.userEmail}>{user.email}</Text>
          {(user.firstname || user.surname) && (
            <Text style={styles.userName}>
              {[user.firstname, user.surname].filter(Boolean).join(' ')}
            </Text>
          )}
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
            <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
          </View>
        </View>
        
        {showActions && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => router.push(`/users/${userId}`)}
            >
              <Text style={styles.viewButtonText}>{t('users.viewDetails')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push(`/users/${userId}/edit`)}
            >
              <Text style={styles.editButtonText}>{t('common.edit')}</Text>
            </TouchableOpacity>
            {currentUserRole === UserRole.ADMIN && onRoleUpdate && (
              <TouchableOpacity
                style={styles.roleButton}
                onPress={() => onRoleUpdate(userId, user.role)}
              >
                <Text style={styles.roleButtonText}>{t('users.role')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }

  // Detail mode
  return (
    <View style={styles.detailContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>{getDisplayName()}</Text>
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
          <Text style={styles.roleText}>{t(`user.${user.role}`)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('userDetails.basicInfo')}</Text>
        
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('user.email')}</Text>
          <Text style={styles.fieldValue}>{user.email}</Text>
        </View>
        
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('user.firstName')}</Text>
          <Text style={styles.fieldValue}>{user.firstname || t('userDetails.noData')}</Text>
        </View>
        
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('user.lastName')}</Text>
          <Text style={styles.fieldValue}>{user.surname || t('userDetails.noData')}</Text>
        </View>
        
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('userForm.phone')}</Text>
          <Text style={styles.fieldValue}>{user.phone || t('userDetails.noPhone')}</Text>
        </View>
        
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('userForm.address')}</Text>
          <Text style={styles.fieldValue}>{user.residentialAddress || t('userDetails.noAddress')}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('userDetails.operatorInfo')}</Text>
        
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('userForm.operatorNumber')}</Text>
          <Text style={styles.fieldValue}>{user.operatorNumber || t('userDetails.noData')}</Text>
        </View>
        
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('userForm.operatorValidityDate')}</Text>
          <Text style={styles.fieldValue}>{formatDate(user.operatorValidityDate)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('userDetails.pilotInfo')}</Text>
        
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('userForm.pilotNumber')}</Text>
          <Text style={styles.fieldValue}>{user.pilotNumber || t('userDetails.noData')}</Text>
        </View>
        
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('userForm.pilotValidityDate')}</Text>
          <Text style={styles.fieldValue}>{formatDate(user.pilotValidityDate)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('userDetails.licenseInfo')}</Text>
        
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('userForm.licenseConversionNumber')}</Text>
          <Text style={styles.fieldValue}>{user.licenseConversionNumber || t('userDetails.noData')}</Text>
        </View>
        
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('userForm.insuranceDate')}</Text>
          <Text style={styles.fieldValue}>{formatDate(user.insurance)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('userDetails.qualifications')}</Text>
        
        {user.qualifications && user.qualifications.length > 0 ? (
          <View style={styles.qualificationsContainer}>
            {user.qualifications.map((qualification) => (
              <View key={qualification} style={styles.qualificationBadge}>
                <Text style={styles.qualificationText}>{qualification}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.fieldValue}>{t('userDetails.noData')}</Text>
        )}
      </View>

      {user.lastLoginAt && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('userDetails.accountInfo')}</Text>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('common.lastLogin')}</Text>
            <Text style={styles.fieldValue}>{formatLastLogin(user.lastLoginAt)}</Text>
          </View>
        </View>
      )}

      {showActions && (
        <View style={styles.detailActionButtons}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push(`/users/${userId}/edit`)}
          >
            <Text style={styles.editButtonText}>{t('userDetails.editButton')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Card mode styles
  userCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  userName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 6,
  },
  viewButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  viewButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  editButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  roleButton: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  roleButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },

  // Detail mode styles
  detailContainer: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  field: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    color: '#333',
  },
  qualificationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  qualificationBadge: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  qualificationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  backButton: {
    backgroundColor: '#666',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});