// src/screens/HomeScreen/styles.tsx

import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 10,
  },
  list: { flex: 1, marginTop: 20 },
  item: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  itemContent: {
    flex: 1,
    justifyContent: 'center',
  },
  title: { fontWeight: 'bold', fontSize: 18, color: '#333' },
  category: { fontSize: 14, color: '#666', marginBottom: 4 },
  description: { fontSize: 13, color: '#888' },
  sectionTitle: { fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  modalView: { flex: 1, padding: 16, backgroundColor: 'white' },
});

export default styles;
