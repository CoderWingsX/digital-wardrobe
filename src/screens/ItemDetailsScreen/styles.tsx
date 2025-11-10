// src/screens/ItemDetailsScreen/styles.tsx

import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: { padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loading: { marginTop: 10, fontSize: 18, textAlign: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  category: { fontSize: 18, color: '#555', marginBottom: 10 },
  description: { fontSize: 16, marginBottom: 15 },
  section: { marginBottom: 15 },
  sectionTitle: { fontWeight: 'bold', marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: 15,
  },
  metaCard: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaKey: { fontWeight: 'bold', flex: 1 },
  metaValue: { color: '#333', flex: 2, textAlign: 'right' },
});

export default styles;
