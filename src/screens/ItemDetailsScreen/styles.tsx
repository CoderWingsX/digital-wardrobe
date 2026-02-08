// src/screens/ItemDetailsScreen/styles.tsx

import { StyleSheet, Dimensions } from 'react-native';
import { ThemeColors } from '../../contexts/ThemeContext';

export const createStyles = (colors: ThemeColors, bottomInset: number = 0) => StyleSheet.create({
  container: { padding: 20, paddingBottom: bottomInset + 20, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loading: { marginTop: 10, fontSize: 18, textAlign: 'center', color: colors.text },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 5, color: colors.text },
  category: { fontSize: 18, color: colors.textSecondary, marginBottom: 10 },
  description: { fontSize: 16, fontStyle: 'italic', marginBottom: 15, color: colors.textSecondary },
  section: { marginBottom: 15 },
  sectionTitle: { fontWeight: 'bold', marginBottom: 5, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    backgroundColor: colors.inputBackground,
    color: colors.text,
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
    backgroundColor: colors.surface,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaKey: { fontWeight: 'bold', flex: 1, color: colors.text },
  metaValue: { color: colors.textSecondary, flex: 2, textAlign: 'right' },
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
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: colors.primary,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tagsText: {
    color: colors.text,
  },
  noDataText: {
    color: colors.textMuted,
  },
});
