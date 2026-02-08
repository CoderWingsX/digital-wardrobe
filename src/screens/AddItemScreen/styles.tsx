import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  required: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
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
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  title: { fontWeight: 'bold', fontSize: 16 },
  sectionTitle: { 
    fontWeight: '600', 
    fontSize: 15,
    marginTop: 16, 
    marginBottom: 8,
    color: '#333',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  modalView: { flex: 1, padding: 16, backgroundColor: 'white' },
});

export default styles;