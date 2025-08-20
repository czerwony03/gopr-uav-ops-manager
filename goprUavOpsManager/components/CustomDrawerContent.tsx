import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { DrawerActions } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { auth } from '@/firebaseConfig';

export function CustomDrawerContent(props: any) {
  const { user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      props.navigation.dispatch(DrawerActions.closeDrawer());
      await signOut(auth);
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
          <Text style={styles.appTitle}>GOPR UAV Ops Manager</Text>

          <View style={styles.userInfo}>
            {!!displayName && <Text style={styles.userName}>{displayName}</Text>}
            <Text style={styles.userEmail}>{user.email}</Text>
            <View style={[styles.roleBadge, {backgroundColor: getRoleColor(user.role)}]}>
              <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Navigation Items */}
        <View style={styles.navigationSection}>
          <DrawerItem
            label="Home"
            onPress={() => handleNavigation('/')}
            icon={({color, size}) => (
              <Ionicons name="home-outline" size={size} color={color}/>
            )}
            labelStyle={styles.drawerLabel}
            style={styles.drawerItem}
          />

          <DrawerItem
            label="Flights"
            onPress={() => handleNavigation('/flights-list')}
            icon={({color, size}) => (
              <Ionicons name="airplane-outline" size={size} color={color}/>
            )}
            labelStyle={styles.drawerLabel}
            style={styles.drawerItem}
          />

          <DrawerItem
            label="Drones"
            onPress={() => handleNavigation('/drones-list')}
            icon={({color, size}) => (
              <Ionicons name="hardware-chip-outline" size={size} color={color}/>
            )}
            labelStyle={styles.drawerLabel}
            style={styles.drawerItem}
          />

          <DrawerItem
            label="Procedures & Checklists"
            onPress={() => handleNavigation('/procedures-checklists-list')}
            icon={({color, size}) => (
              <Ionicons name="clipboard-outline" size={size} color={color}/>
            )}
            labelStyle={styles.drawerLabel}
            style={styles.drawerItem}
          />

          {/* Users menu item - only visible to admins */}
          {user.role === 'admin' && (
            <DrawerItem
              label="Users"
              onPress={() => handleNavigation('/users-list')}
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
              label="Audit Logs"
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
          label="Info & Contact"
          onPress={() => handleNavigation('/info-contact')}
          icon={({color, size}) => (
            <Ionicons name="information-circle-outline" size={size} color={color}/>
          )}
          labelStyle={styles.drawerLabel}
          style={styles.drawerItem}
        />

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#fff"/>
          <Text style={styles.logoutText}>Sign Out</Text>
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
    paddingTop: 50,
    marginTop: -5,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
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
