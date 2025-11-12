// toastConfig.js

import React from 'react';
import { BaseToast, ErrorToast } from 'react-native-toast-message';

export const toastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#128C7E',
        borderLeftWidth: 7,
        backgroundColor: '#F0F0F0',
        // height: 70, // <-- Remove this line
        // Add a shadow for depth
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 5,
      }}
      // ... rest of props
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: '#D32F2F',
        borderLeftWidth: 7,
        backgroundColor: '#F0F0F0',
        // height: 70, // <-- Also remove this line
        // Add a shadow for depth
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 5,
      }}
      // ... rest of props
    />
  ),
};