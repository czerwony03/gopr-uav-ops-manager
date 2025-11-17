import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function ProcedureIdLayout() {
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
          title: t('procedureForm.header'),
        }}
      />
      <Stack.Screen
        name="edit"
        options={{
          title: t('procedureForm.editTitle'),
        }}
      />
      <Stack.Screen
        name="execute"
        options={{
          title: t('procedures.execute.title'),
        }}
      />
    </Stack>
  );
}
