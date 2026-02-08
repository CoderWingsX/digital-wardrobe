// src/components/CategoryPicker.tsx

import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    FlatList,
    StyleSheet,
    Pressable,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { CATEGORIES } from '../constants/categories';
import { Ionicons } from '@expo/vector-icons';

interface CategoryPickerProps {
    value: string;
    onSelect: (category: string) => void;
    label?: string;
    required?: boolean;
}

export default function CategoryPicker({
    value,
    onSelect,
    label = 'Category',
    required = false,
}: CategoryPickerProps) {
    const { colors } = useTheme();
    const [modalVisible, setModalVisible] = useState(false);

    const handleSelect = (category: string) => {
        onSelect(category);
        setModalVisible(false);
    };

    return (
        <View style={styles.container}>
            {label && (
                <Text style={[styles.label, { color: colors.text }]}>
                    {label} {required && <Text style={[styles.required, { color: colors.danger }]}>*</Text>}
                </Text>
            )}

            <TouchableOpacity
                style={[
                    styles.pickerTrigger,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.7}
            >
                <Text style={[styles.valueText, { color: value ? colors.text : colors.textMuted }]}>
                    {value || 'Select a category'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setModalVisible(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Category</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={CATEGORIES}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.categoryItem,
                                        { borderBottomColor: colors.border },
                                        item === value && { backgroundColor: colors.surface },
                                    ]}
                                    onPress={() => handleSelect(item)}
                                >
                                    <Text style={[
                                        styles.categoryText,
                                        { color: colors.text },
                                        item === value && { fontWeight: 'bold', color: colors.primary }
                                    ]}>
                                        {item}
                                    </Text>
                                    {item === value && (
                                        <Ionicons name="checkmark" size={20} color={colors.primary} />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 15,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    pickerTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 50,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
    },
    valueText: {
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '60%',
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    categoryText: {
        fontSize: 16,
    },
    required: {
        fontWeight: 'bold',
    },
});
