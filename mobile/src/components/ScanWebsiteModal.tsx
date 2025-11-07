import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';

type Props = {
    visible: boolean;
    onClose: () => void;
    onAnalyze: (url: string) => void;
};
import ApiService from '../services/api';


const ScanWebsiteModal: React.FC<Props> = ({ visible, onClose, onAnalyze }) => {
    const [url, setUrl] = useState('https://');
    const [websiteData, setWebsiteData] = useState<any>(null);

    const handleAnalyze = async () => {
        if (!url.trim()) return;

        try {
            const data = await ApiService.scanWebsite(url.trim());
            console.log('✅ Website analyzed:', data);
            setWebsiteData(data);

            // Notify parent
            onAnalyze(url.trim());

            // Reset to https:// and close
            setUrl('https://');
            onClose();
        } catch (error: any) {
            console.error('❌ Error analyzing website:', error.response?.data || error.message);
        }
    };


    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <Text style={styles.heading}>Scan Company Website</Text>
                    <Text style={styles.subText}>
                        Enter the company website URL to automatically fill the company questionnaire:
                    </Text>

                    <TextInput
                        value={url}
                        onChangeText={setUrl}
                        placeholder="Website URL"
                        placeholderTextColor="#9ca3af"
                        style={styles.input}
                    />

                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.analyzeBtn, !url.trim() && styles.analyzeDisabled]}
                            onPress={handleAnalyze}
                            disabled={!url.trim()}
                        >
                            <Text style={styles.analyzeText}>Analyze</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: '#fff',
        width: '90%',
        borderRadius: 12,
        padding: 20,
    },
    heading: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 10,
    },
    subText: {
        fontSize: 14,
        color: '#374151',
        marginBottom: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        marginBottom: 20,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    cancelBtn: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
    },
    cancelText: {
        color: '#111827',
        fontWeight: '600',
    },
    analyzeBtn: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#2563eb',
        borderRadius: 8,
    },
    analyzeDisabled: {
        backgroundColor: '#93c5fd',
    },
    analyzeText: {
        color: '#fff',
        fontWeight: '700',
    },
});

export default ScanWebsiteModal;
