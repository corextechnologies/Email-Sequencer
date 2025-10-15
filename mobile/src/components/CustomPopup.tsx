import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modal';

interface CustomPopupProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

const CustomPopup: React.FC<CustomPopupProps> = ({ visible, title, message, onClose }) => {
  return (
    <Modal
      isVisible={visible}
      animationIn="zoomIn"
      animationOut="zoomOut"
      backdropOpacity={0.5}
    >
      <View style={{
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center'
      }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
          {title}
        </Text>
        <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 20 }}>
          {message}
        </Text>
        <TouchableOpacity
          onPress={onClose}
          style={{
            backgroundColor: '#007AFF',
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 10
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>OK</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default CustomPopup;
