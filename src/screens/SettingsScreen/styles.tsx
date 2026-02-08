// src/screens/SettingsScreen/styles.tsx

import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sectionHint: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 15,
    color: '#666',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  infoHint: {
    fontSize: 13,
    color: '#aaa',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#007AFF',
  },
  destructiveButton: {
    backgroundColor: '#FF3B30',
  },
  destructiveButtonText: {
    color: '#fff',
  },
});
