import React, { useEffect } from "react";
import { Text, View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "expo-router";
import LoginScreen from "../screens/LoginScreen";

export default function Index() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();

  // Refresh user data when component mounts to ensure we have the latest data
    useEffect(() => {
        // Only refresh once on mount if user exists
        if (user && refreshUser) {
            refreshUser();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // <-- Only on initial mount

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Not set';
    return date.toLocaleDateString();
  };

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

      <View style={styles.profileDataContainer}>
        <Text style={styles.profileDataTitle}>My Profile Data</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            <Text style={styles.fieldValue}>{user.email}</Text>
          </View>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>First Name</Text>
            <Text style={styles.fieldValue}>{user.firstname || 'Not set'}</Text>
          </View>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Surname</Text>
            <Text style={styles.fieldValue}>{user.surname || 'Not set'}</Text>
          </View>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Phone</Text>
            <Text style={styles.fieldValue}>{user.phone || 'Not set'}</Text>
          </View>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Residential Address</Text>
            <Text style={styles.fieldValue}>{user.residentialAddress || 'Not set'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Operator Information</Text>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Operator Number</Text>
            <Text style={styles.fieldValue}>{user.operatorNumber || 'Not set'}</Text>
          </View>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Operator Validity Date</Text>
            <Text style={styles.fieldValue}>{formatDate(user.operatorValidityDate)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pilot Information</Text>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Pilot Number</Text>
            <Text style={styles.fieldValue}>{user.pilotNumber || 'Not set'}</Text>
          </View>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Pilot Validity Date</Text>
            <Text style={styles.fieldValue}>{formatDate(user.pilotValidityDate)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>License Conversion Number</Text>
            <Text style={styles.fieldValue}>{user.licenseConversionNumber || 'Not set'}</Text>
          </View>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Insurance Date</Text>
            <Text style={styles.fieldValue}>{formatDate(user.insurance)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Qualifications / Authorizations</Text>
          
          {user.qualifications && user.qualifications.length > 0 ? (
            <View style={styles.qualificationsContainer}>
              {user.qualifications.map((qualification) => (
                <View key={qualification} style={styles.qualificationBadge}>
                  <Text style={styles.qualificationText}>{qualification}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.fieldValue}>No qualifications set</Text>
          )}
        </View>

      </View>

      <View style={styles.profileContainer}>
        <Text style={styles.profileTitle}>Profile Management</Text>
        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={() => router.push(`/user-form?id=${user.uid}`)}
        >
          <Text style={styles.editProfileButtonText}>Edit My Data</Text>
        </TouchableOpacity>
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
  profileDataContainer: {
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
  profileDataTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 5,
  },
  field: {
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 2,
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  qualificationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  profileContainer: {
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
  profileTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  editProfileButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editProfileButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
