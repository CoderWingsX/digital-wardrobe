import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../contexts/ThemeContext';

export const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: colors.background },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  required: {
    color: colors.danger,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    backgroundColor: colors.inputBackground,
    color: colors.text,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 10,
  },
  list: { flex: 1, marginTop: 20 },
  item: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: colors.card,
  },
  title: { fontWeight: 'bold', fontSize: 16, color: colors.text },
  sectionTitle: { 
    fontWeight: '600', 
    fontSize: 15,
    marginTop: 16, 
    marginBottom: 8,
    color: colors.text,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  modalView: { flex: 1, padding: 16, backgroundColor: colors.background },
});