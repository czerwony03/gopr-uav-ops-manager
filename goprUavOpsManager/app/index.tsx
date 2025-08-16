import React from "react";
import { Text, View, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import LoginScreen from "../screens/LoginScreen";

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

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

  const getRoleCapabilities = (role: string) => {
    switch (role) {
      case 'admin':
        return ['Full system access', 'User management', 'All operations', 'System configuration'];
      case 'manager':
        return ['Operation management', 'Team oversight', 'Reports viewing', 'Limited user management'];
      case 'user':
        return ['Basic operations', 'View assigned tasks', 'Update status'];
      default:
        return ['Limited access'];
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>GOPR UAV Ops Manager</Text>
        <Text style={styles.welcomeText}>Welcome, {user.email}</Text>
      </View>

      <View style={styles.roleContainer}>
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
          <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.capabilitiesContainer}>
        <Text style={styles.capabilitiesTitle}>Your Capabilities:</Text>
        {getRoleCapabilities(user.role).map((capability, index) => (
          <Text key={index} style={styles.capabilityItem}>
            • {capability}
          </Text>
        ))}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Use the menu (☰) to navigate between different sections of the app.
        </Text>
        <Text style={styles.infoSubtext}>
          Additional role-based functionality is available based on your {user.role} permissions.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
  },
  roleContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  roleBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  roleText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  capabilitiesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  capabilitiesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  capabilityItem: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  infoSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10,
  },
});
