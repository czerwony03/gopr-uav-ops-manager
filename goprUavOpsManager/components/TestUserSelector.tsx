import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { UserRole } from '../contexts/AuthContext';

interface TestUserSelectorProps {
  onUserSelected: (user: { uid: string; email: string; role: UserRole }) => void;
}

export default function TestUserSelector({ onUserSelected }: TestUserSelectorProps) {
  const testUsers = [
    { uid: 'user1', email: 'user@test.com', role: 'user' as UserRole },
    { uid: 'manager1', email: 'manager@test.com', role: 'manager' as UserRole },
    { uid: 'admin1', email: 'admin@test.com', role: 'admin' as UserRole },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Test Mode - Select User Role</Text>
        <Text style={styles.subtitle}>
          Choose a user role to test the drawer navigation
        </Text>
        
        {testUsers.map((user) => (
          <TouchableOpacity
            key={user.uid}
            style={[styles.userButton, { backgroundColor: getRoleColor(user.role) }]}
            onPress={() => onUserSelected(user)}
          >
            <Text style={styles.userButtonText}>
              {user.role.toUpperCase()} - {user.email}
            </Text>
          </TouchableOpacity>
        ))}
        
        <Text style={styles.note}>
          * Admin users will see the Users menu item
        </Text>
      </View>
    </SafeAreaView>
  );
}

const getRoleColor = (role: UserRole) => {
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  userButton: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  userButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  note: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
});