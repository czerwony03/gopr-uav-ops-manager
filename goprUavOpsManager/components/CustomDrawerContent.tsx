import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { DrawerActions } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from '@/utils/firebaseUtils';
import { useTranslation } from 'react-i18next';

export function CustomDrawerContent(props: any) {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('common');

  const handleLogout = async () => {
    try {
      props.navigation.dispatch(DrawerActions.closeDrawer());
      await signOut();
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNavigation = (route: string) => {
    router.push(route as any);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return '#FF6B6B';
      case 'manager':
        return '#4ECDC4';
      case 'user':
        return '#45B7D1';
      default:
        return '#999';
    }
  };

  if (!user) {
    return null;
  }

  const displayName = [user.firstname, user.surname].filter(Boolean).join(' ').trim();

  return (
    <View style={styles.root}>
      <DrawerContentScrollView {...props} style={styles.container}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.appTitle}>{t('drawer.appTitle')}</Text>
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => handleNavigation(`/users/${user.uid}/edit`)}
            >
              <Ionicons name="person-outline" size={14} color="#0066CC" />
              <Text style={styles.profileButtonText}>{t('drawer.editProfile')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.userInfo}>
            {!!displayName && <Text style={styles.userName}>{displayName}</Text>}
            <Text style={styles.userEmail}>{user.email}</Text>
            <View style={[styles.roleBadge, {backgroundColor: getRoleColor(user.role)}]}>
              <Text style={styles.roleText}>{t(`user.roles.${user.role}`)}</Text>
            </View>
          </View>
        </View>

        {/* Navigation Items */}
        <View style={styles.navigationSection}>
          <DrawerItem
            label={t('nav.home')}
            onPress={() => handleNavigation('/')}
            icon={({color, size}) => (
              <Ionicons name="home-outline" size={size} color={color}/>
            )}
            labelStyle={styles.drawerLabel}
            style={styles.drawerItem}
          />

          <DrawerItem
            label={t('nav.flights')}
            onPress={() => handleNavigation('/flights')}
            icon={({color, size}) => (
              <Ionicons name="airplane-outline" size={size} color={color}/>
            )}
            labelStyle={styles.drawerLabel}
            style={styles.drawerItem}
          />

          <DrawerItem
            label={t('nav.drones')}
            onPress={() => handleNavigation('/drones')}
            icon={({color, size}) => (
              <Ionicons name="hardware-chip-outline" size={size} color={color}/>
            )}
            labelStyle={styles.drawerLabel}
            style={styles.drawerItem}
          />

          <DrawerItem
            label={t('nav.procedures')}
            onPress={() => handleNavigation('/procedures')}
            icon={({color, size}) => (
              <Ionicons name="clipboard-outline" size={size} color={color}/>
            )}
            labelStyle={styles.drawerLabel}
            style={styles.drawerItem}
          />

          {/* Users menu item - only visible to admins */}
          {(user.role === 'admin' || user.role === 'manager') && (
            <DrawerItem
              label={t('nav.users')}
              onPress={() => handleNavigation('/users')}
              icon={({color, size}) => (
                <Ionicons name="people-outline" size={size} color={color}/>
              )}
              labelStyle={styles.drawerLabel}
              style={styles.drawerItem}
            />
          )}

          {/* Audit Logs menu item - only visible to admins */}
          {user.role === 'admin' && (
            <DrawerItem
              label={t('nav.auditLogs')}
              onPress={() => handleNavigation('/audit-logs')}
              icon={({color, size}) => (
                <Ionicons name="document-text-outline" size={size} color={color}/>
              )}
              labelStyle={styles.drawerLabel}
              style={styles.drawerItem}
            />
          )}
        </View>
      </DrawerContentScrollView>

      {/* Bottom section: Info & Contact + Sign Out */}
      <View style={styles.bottomSection}>
        <DrawerItem
          label={t('nav.info')}
          onPress={() => handleNavigation('/info-contact')}
          icon={({color, size}) => (
            <Ionicons name="information-circle-outline" size={size} color={color}/>
          )}
          labelStyle={styles.drawerLabel}
          style={styles.drawerItem}
        />

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#fff"/>
          <Text style={styles.logoutText}>{t('drawer.signOut')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#0066CC',
    padding: 20,
    paddingTop: 20,
    marginTop: -5,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  profileButtonText: {
    color: '#0066CC',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  userInfo: {
    marginTop: 10,
  },
  userName: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#e3f2fd',
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
  navigationSection: {
    flex: 1,
    paddingTop: 20,
  },
  drawerItem: {
    marginHorizontal: 10,
    borderRadius: 8,
  },
  drawerLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  bottomSection: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    padding: 16,
    paddingBottom: 30,
    backgroundColor: '#f8f9fa',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d32f2f',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});
