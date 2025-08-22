import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function UserIdLayout() {
  const { t } = useTranslation('common');

  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: '#0066CC' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' },
    }}>
      <Stack.Screen
        name="index"
        options={{
          title: t('userDetails.title'),
        }}
      />
      <Stack.Screen
        name="edit"
        options={{
          title: t('userForm.editTitle'),
        }}
      />
    </Stack>
  );
}