import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    SafeAreaView,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuestionnaire } from '../contexts/QuestionnaireContext';
import ScanWebsiteModal from '../components/ScanWebsiteModal';
import ApiService from '../services/api';
import { ActivityIndicator } from 'react-native';
import { COLORS } from '../constants/colors';



type Props = { navigation: any };

const BusinessQuestionnaireScreen: React.FC<Props> = ({ navigation }) => {
    const { data, updateData } = useQuestionnaire();
    const [companyName, setCompanyName] = useState(data.companyName);
    const [industry, setIndustry] = useState(data.industry);
    const [description, setDescription] = useState(data.description);

    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);


    const totalSteps = 6;
    const currentStep = 1; // change this number for each screen
    const progressRatio = currentStep / totalSteps;

    const isFormValid = useMemo(
        () => companyName.trim() && industry.trim() && description.trim(),
        [companyName, industry, description]
    );

    const handleScanWebsite = () => {
        setModalVisible(true);
    };

    const handleAnalyzeUrl = async (url: string) => {
        try {
            setModalVisible(false);
            setLoading(true);

            // 1️⃣ API call yahi karo
            const data = await ApiService.scanWebsite(url);

            console.log('✅ Website analyzed:', data);

            // 2️⃣ State update karo taake TextInput fill ho jaye
            setCompanyName(data.data.companyName || '');
            setIndustry(data.data.industry || '');
            setDescription(data.data.description || '');
            updateData({ products: data.data.products || '' }); // ✅ context update

            updateData({
                companyName: data.data.companyName || '',
                industry: data.data.industry || '',
                description: data.data.description || '',
                products: data.data.products || '',
                targetAudience: data.data.targetMarket || '',
                challenges: data.data.challenges || '',
                valueProposition: data.data.valueProposition || '',
            });
        } catch (err: any) {
            console.error('❌ Error analyzing website:', err.response?.data || err.message);
        }
        finally {
            // ✅ This will always run — success or error
            setLoading(false);
        }
    };


    const handleNext = () => {
        if (!isFormValid) {
            Alert.alert('Validation', 'Please complete all required fields.');
            return;
        }
        // Update context with current data
        updateData({ companyName, industry, description });
        // Navigate to Step 2
        navigation.navigate('BusinessQuestionnaireStep2');
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerIconBtn} />
                <Text style={styles.headerTitle}>Business Questionnaire</Text>
                <View style={styles.headerRight} />
            </View>


            {/* Progress bar with step and percentage */}
            <View style={styles.progressContainer}>
                <Text style={styles.progressTextLeft}>Step {currentStep} of {totalSteps}</Text>
                <Text style={styles.progressTextRight}>{Math.round(progressRatio * 100)}%</Text>
            </View>
            <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${progressRatio * 100}%` }]} />
            </View>


            {/* Scrollable Content */}
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <View style={styles.cardNeutral}>
                    <Text style={styles.cardTitle}>Tell us about your business</Text>
                    <Text style={styles.cardSubtitle}>
                        Answer these questions to help AI create targeted customer personas.
                    </Text>
                </View>

                <View style={styles.cardInfo}>
                    <View style={styles.cardInfoLeft}>
                        <View style={styles.cardInfoIconWrap}>
                            <Ionicons name="globe-outline" size={18} color={COLORS.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardInfoTitle}>Speed up with AI Website Analysis</Text>
                            <Text style={styles.cardInfoText}>
                                Let AI scan your website to auto-fill this questionnaire
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.scanButton} onPress={handleScanWebsite}>
                        <Text style={styles.scanButtonText}>Scan Website</Text>
                    </TouchableOpacity>
                </View>

                {/* Inputs */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Basic Business Information</Text>

                    <Text style={styles.label}>
                        Company Name <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        value={companyName}
                        onChangeText={setCompanyName}
                        placeholder="e.g., Vercel"
                        placeholderTextColor="#9ca3af"
                        style={styles.input}
                    />

                    <Text style={styles.label}>
                        Industry <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        value={industry}
                        onChangeText={setIndustry}
                        placeholder="Technology - Cloud Computing"
                        placeholderTextColor="#9ca3af"
                        style={styles.input}
                    />

                    <Text style={styles.label}>
                        Business Description <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Describe what your company does"
                        placeholderTextColor="#9ca3af"
                        style={[styles.input, styles.textArea]}
                        multiline
                        numberOfLines={5}
                    />
                </View>
            </ScrollView>

            {/* Footer Buttons */}
            <View style={styles.footer}>
                {currentStep > 1 && (
                    <TouchableOpacity style={styles.prevButton} onPress={() => navigation?.goBack?.()}>
                        <Ionicons name="chevron-back" size={18} color={COLORS.text.primary} />
                        <Text style={styles.prevText}>Previous</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={[
                        styles.nextButton,
                        !isFormValid && styles.nextButtonDisabled,
                        currentStep === 1 && styles.nextButtonFullWidth
                    ]}
                    onPress={handleNext}
                    disabled={!isFormValid}
                >
                    <Text style={styles.nextText}>Next</Text>
                    <Ionicons name="arrow-forward" size={18} color={COLORS.text.white} />
                </TouchableOpacity>
            </View>
            <ScanWebsiteModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onAnalyze={handleAnalyzeUrl}
            />
            {loading && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Analyzing website...</Text>
                    </View>
                </View>
            )}

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.background.primary },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 30,
        paddingBottom: 16,
        backgroundColor: COLORS.background.primary,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border.light,
    },
    headerIconBtn: { padding: 6, marginRight: 6 },
    headerTitle: { flex: 1, fontSize: 22, fontWeight: '700', color: COLORS.text.primary, textAlign: 'center' },
    headerRight: { padding: 6, width: 36 },

    progressBarTrack: {
        height: 4,
        backgroundColor: COLORS.border.light,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 9999,
    },
    progressBarFill: { height: 4, backgroundColor: COLORS.primary, borderRadius: 9999 },

    container: { flex: 1, backgroundColor: COLORS.background.primary },
    content: { padding: 16, paddingBottom: 120 },

    cardNeutral: { backgroundColor: COLORS.background.secondary, borderRadius: 14, padding: 16, marginBottom: 16 },
    cardTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text.primary, marginBottom: 6 },
    cardSubtitle: { fontSize: 14, color: COLORS.text.secondary, lineHeight: 20 },

    cardInfo: {
        backgroundColor: '#ede9fe',
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    cardInfoLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
    cardInfoIconWrap: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#ede9fe',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardInfoTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text.primary },
    cardInfoText: { fontSize: 12, color: COLORS.text.secondary, marginTop: 2 },
    scanButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 9999,
    },
    scanButtonText: { color: COLORS.text.white, fontSize: 14, fontWeight: '700' },

    section: { backgroundColor: COLORS.background.primary, borderRadius: 14, padding: 0 },
    sectionTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text.dark, marginBottom: 12 },

    label: { fontSize: 14, color: COLORS.text.dark, fontWeight: '600', marginBottom: 8 },
    required: { color: COLORS.status.error },

    input: {
        borderWidth: 1,
        borderColor: COLORS.border.light,
        backgroundColor: COLORS.background.primary,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
        color: COLORS.text.primary,
        fontSize: 16,
        marginBottom: 16,
    },
    textArea: { height: 140, textAlignVertical: 'top' },

    footer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: COLORS.background.primary,
        borderTopWidth: 1,
        borderTopColor: COLORS.border.light,
        gap: 12,
    },
    prevButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 9999,
        backgroundColor: COLORS.background.secondary,
        borderWidth: 1,
        borderColor: COLORS.border.light,
    },
    prevText: { fontSize: 16, fontWeight: '600', color: COLORS.text.primary, marginLeft: 4 },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 22,
        borderRadius: 9999,
        backgroundColor: COLORS.primary,
        gap: 6,
    },
    nextButtonDisabled: { backgroundColor: COLORS.text.light },
    nextButtonFullWidth: { flex: 1 },
    nextText: { color: COLORS.text.white, fontSize: 16, fontWeight: '800', marginRight: 6 },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 16,
        marginBottom: 8,
        paddingTop: 8,
    },
    progressTextLeft: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.text.dark,
    },
    progressTextRight: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.text.dark,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    loadingBox: {
        backgroundColor: COLORS.background.primary,
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: COLORS.shadow.light,
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: COLORS.primary,
        fontWeight: '600',
    },


});

export default BusinessQuestionnaireScreen;
