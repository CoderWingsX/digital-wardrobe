import React from 'react';
import { View, Button, Alert } from 'react-native';
import { useActionSheet } from '@expo/react-native-action-sheet';
import * as ImagePicker from 'expo-image-picker';

type Props = {
    onImageSelected: (uri: string) => void;
    title?: string;
};

export default function ImagePickerButton({
    onImageSelected,
    title = 'Pick an Image',
}: Props) {
    const { showActionSheetWithOptions } = useActionSheet();

    const pickFromLibrary = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission needed',
                    'Sorry, we need camera roll permissions to make this work!'
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                onImageSelected(result.assets[0].uri);
            }
        } catch (err) {
            console.error('ImagePicker Library Error:', err);
            Alert.alert('Error', 'Failed to pick image from library');
        }
    };

    const pickFromCamera = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission needed',
                    'Sorry, we need camera permissions to make this work!'
                );
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                onImageSelected(result.assets[0].uri);
            }
        } catch (err) {
            console.error('ImagePicker Camera Error:', err);
            Alert.alert('Error', 'Failed to take photo');
        }
    };

    const handlePress = () => {
        const options = ['Take Photo', 'Choose from Library', 'Cancel'];
        const cancelButtonIndex = 2;

        showActionSheetWithOptions(
            {
                options,
                cancelButtonIndex,
                title: 'Select Image',
            },
            (selectedIndex) => {
                switch (selectedIndex) {
                    case 0:
                        pickFromCamera();
                        break;
                    case 1:
                        pickFromLibrary();
                        break;
                }
            }
        );
    };

    return (
        <View>
            <Button title={title} onPress={handlePress} />
        </View>
    );
}
