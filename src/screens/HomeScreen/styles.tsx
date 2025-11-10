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
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  title: { fontWeight: 'bold', fontSize: 16 },
  sectionTitle: { fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
});

export default styles;
