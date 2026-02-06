// src/screens/ItemDetailsScreen/styles.tsx

import { StyleSheet, Dimensions } from 'react-native';

const styles = StyleSheet.create({
  container: { padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loading: { marginTop: 10, fontSize: 18, textAlign: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  category: { fontSize: 18, color: '#555', marginBottom: 10 },
  description: { fontSize: 16, fontStyle: 'italic', marginBottom: 15 },
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
    backgroundColor: '#dfdfdfff',
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaKey: { fontWeight: 'bold', flex: 1 },
  metaValue: { color: '#333', flex: 2, textAlign: 'right' },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  imageCounter: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  imageCounterText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  carouselContainer: {
    marginBottom: 20,
  },
  carouselSlide: {
    width: Dimensions.get('window').width - 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselImage: {
    width: Dimensions.get('window').width - 60,
    height: 300,
    borderRadius: 12,
  },
  deleteImageButton: {
    position: 'absolute',
    top: 5,
    right: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#333',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default styles;
