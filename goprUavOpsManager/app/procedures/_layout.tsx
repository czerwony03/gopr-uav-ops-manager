import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProceduresLayout() {
  const { t } = useTranslation('common');
  const router = useRouter();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: t('procedures.categories.title'),
          headerStyle: { backgroundColor: '#0066CC' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/');
                }
              }}
              style={{ paddingHorizontal: 8 }}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />
      {/* Category procedures screen */}
      <Stack.Screen
        name="category/[categoryId]"
        options={{
          title: t('procedures.title'),
          headerStyle: { backgroundColor: '#0066CC' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      {/* Category management screens */}
      <Stack.Screen
        name="categories/create"
        options={{
          title: t('categories.createTitle'),
          headerStyle: { backgroundColor: '#0066CC' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen
        name="categories/[categoryId]/edit"
        options={{
          title: t('categories.editTitle'),
          headerStyle: { backgroundColor: '#0066CC' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      {/* Keep existing procedure routes */}
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
      <Stack.Screen
        name="create"
        options={{
          title: t('procedureForm.createTitle'),
          headerStyle: { backgroundColor: '#0066CC' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      {/* Legacy procedures list - can be kept for backward compatibility */}
      <Stack.Screen
        name="procedures"
        options={{
          title: t('procedures.allProcedures'),
          headerStyle: { backgroundColor: '#0066CC' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
    </Stack>
  );
}
