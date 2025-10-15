import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuestionnaire } from '../contexts/QuestionnaireContext';
import ApiService from '../services/api';
import { COLORS } from '../constants/colors';

type Props = { navigation: any };

const BusinessQuestionnaireStep6Screen: React.FC<Props> = ({ navigation }) => {
    const { data, isComplete } = useQuestionnaire();
    const [option1, setOption1] = useState(false);
    const [option2, setOption2] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const totalSteps = 6;
    const currentStep = 6;
    const progressRatio = currentStep / totalSteps; // 100%

    const isButtonEnabled = option1 || option2; // Enable button if at least one checkbox selected

    const generatePersonas = async () => {
        if (!isComplete()) {
            Alert.alert('Incomplete Form', 'Please complete all questionnaire steps before generating personas.');
            return;
        }

        if (!option1 && !option2) {
            Alert.alert('Selection Required', 'Please select at least one AI enhancement option.');
            return;
        }

        setIsGenerating(true);

        try {
            // Generate personas using the API (provider will be auto-detected on the backend)
            const result = await ApiService.generatePersonas({
                questionnaireData: data,
                options: {
                    generateMultiple: option1,
                    enhanceWithIndustryInsights: option2
                }
            });

            Alert.alert(
                'Success!', 
                `Generated ${result.count} customer personas successfully!`,
                [
                    { text: 'View Personas', onPress: () => {
                        // TODO: Navigate to personas list screen when implemented
                        console.log('Navigate to personas list');
                    }},
                    { text: 'OK', style: 'default' }
                ]
            );

        } catch (error: any) {
            console.error('Persona generation error:', error);
            
            // Handle specific error types
            let errorMessage = 'Failed to generate personas. Please try again.';
            let errorTitle = 'Generation Failed';
            
            if (error.response?.data?.error) {
                const errorData = error.response.data.error;
                
                switch (errorData.code) {
                    case 'NO_API_KEY':
                        errorTitle = 'API Key Required';
                        errorMessage = errorData.message;
                        break;
                    case 'DECRYPTION_ERROR':
                        errorTitle = 'Configuration Error';
                        errorMessage = errorData.message;
                        break;
                    case 'TOKEN_LIMIT_EXCEEDED':
                        errorTitle = 'Request Too Complex';
                        errorMessage = errorData.message;
                        break;
                    case 'LLM_ERROR':
                        errorTitle = 'AI Service Error';
                        errorMessage = errorData.message;
                        break;
                    case 'INVALID_PROVIDER':
                        errorTitle = 'Invalid Provider';
                        errorMessage = errorData.message;
                        break;
                    default:
                        errorMessage = errorData.message || errorMessage;
                }
            }
            
            Alert.alert(
                errorTitle,
                errorMessage,
                [
                    { text: 'OK' },
                    ...(error.response?.data?.error?.code === 'NO_API_KEY' ? [{
                        text: 'Go to Settings',
                        onPress: () => navigation.navigate('Settings')
                    }] : []),
                    ...(error.response?.data?.error?.code === 'TOKEN_LIMIT_EXCEEDED' ? [{
                        text: 'Simplify Request',
                        onPress: () => {
                            // Uncheck enhancement options to reduce complexity
                            setOption1(false);
                            setOption2(false);
                        }
                    }] : [])
                ]
            );
        } finally {
            setIsGenerating(false);
        }
    };
    const goNext = () => {
        Alert.alert('Next', 'No next page defined yet.');
    };

    // Dummy variable for footer button
    const isFormValid = true; // always enable footer "Next" button for now


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

            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                {/* Tell us about your business card */}
                <View style={styles.cardNeutral}>
                    <Text style={styles.cardTitle}>Tell us about your business</Text>
                    <Text style={styles.cardSubtitle}>
                        Answer these questions to help AI create targeted customer personas.
                    </Text>
                </View>

                {/* AI Enhancement Option card including checkboxes */}
                <View style={styles.cardNeutral}>
                    <Text style={styles.cardTitle}>AI Enhancement Option</Text>
                    <Text style={styles.cardSubtitle}>
                        Select how AI should enhance your personas:
                    </Text>

                    {/* Checkbox options inside the card */}
                    <View style={{ marginTop: 12 }}>
                        <TouchableOpacity
                            style={[styles.checkboxContainer, option1 && styles.checkboxChecked]}
                            onPress={() => setOption1(!option1)}
                        >
                            {option1 && <Ionicons name="checkmark" size={18} color={COLORS.text.white} />}
                            <Text style={[styles.checkboxText, option1 && styles.checkboxTextChecked]}>Generate multiple personas (3-5)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.checkboxContainer, option2 && styles.checkboxChecked]}
                            onPress={() => setOption2(!option2)}
                        >
                            {option2 && <Ionicons name="checkmark" size={18} color={COLORS.text.white} />}
                            <Text style={[styles.checkboxText, option2 && styles.checkboxTextChecked]}>Enhance with industry insights</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Full-width button */}
                <TouchableOpacity
                    style={[styles.generateButton, (!isButtonEnabled || isGenerating) && styles.nextButtonDisabled]}
                    onPress={generatePersonas}
                    disabled={!isButtonEnabled || isGenerating}
                >
                    {isGenerating ? (
                        <ActivityIndicator size="small" color={COLORS.text.white} style={{ marginRight: 8 }} />
                    ) : (
                        <View style={styles.iconWrapper}>
                            <Ionicons name="star" size={16} color={COLORS.text.white} />
                            <Ionicons name="star" size={14} color={COLORS.text.white} />
                            <Ionicons name="star" size={12} color={COLORS.text.white} />
                        </View>
                    )}
                    <Text style={styles.generateButtonText}>
                        {isGenerating ? 'Generating Personas...' : 'Generate customer Personas with AI'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
            <View style={styles.footer}>
                <TouchableOpacity style={styles.prevButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={18} color={COLORS.text.primary} />
                    <Text style={styles.prevText}>Previous</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.nextButton, !isFormValid && styles.nextButtonDisabled]}
                    onPress={goNext}
                    disabled={!isFormValid}
                >
                    <Text style={styles.nextText}>Next</Text>
                    <Ionicons name="arrow-forward" size={18} color={COLORS.text.white} />
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.background.primary },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 30, paddingBottom: 16, backgroundColor: COLORS.background.primary, borderBottomWidth: 1, borderBottomColor: COLORS.border.light },
    headerIconBtn: { padding: 6, marginRight: 6 },
    headerTitle: { flex: 1, fontSize: 22, fontWeight: '700', color: COLORS.text.primary, textAlign: 'center' },
    headerRight: { padding: 6 },

    progressBarTrack: { height: 4, backgroundColor: COLORS.border.light, marginHorizontal: 16, borderRadius: 9999 },
    progressBarFill: { height: 4, backgroundColor: COLORS.primary, borderRadius: 9999 },

    container: { flex: 1, backgroundColor: COLORS.background.primary },
    content: { padding: 16, paddingBottom: 120 },

    cardNeutral: { backgroundColor: COLORS.background.secondary, borderRadius: 14, padding: 16, marginBottom: 16 },
    cardTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text.primary, marginBottom: 6 },
    cardSubtitle: { fontSize: 14, color: COLORS.text.secondary, lineHeight: 20 },

    section: { backgroundColor: COLORS.background.primary, borderRadius: 14, padding: 16 },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: COLORS.primary,
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    checkboxChecked: {
        backgroundColor: COLORS.primary,
    },
    checkboxText: {
        color: COLORS.text.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    checkboxTextChecked: {
        color: COLORS.text.white,
        fontSize: 16,
        fontWeight: '600',
    },

    generateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        borderRadius: 9999,
        gap: 8,
        marginTop: 20,
    },
    generateButtonText: { color: COLORS.text.white, fontSize: 16, fontWeight: '700' },
    iconWrapper: { flexDirection: 'row', gap: 4, marginRight: 6 },
    cardInfo: { backgroundColor: '#ede9fe', borderRadius: 14, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    cardInfoLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
    cardInfoIconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' },
    cardInfoTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text.primary },
    cardInfoText: { fontSize: 12, color: COLORS.text.secondary, marginTop: 2 },
    scanButton: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 9999 },
    scanButtonText: { color: COLORS.text.white, fontSize: 14, fontWeight: '700' },
    footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: COLORS.background.primary, borderTopWidth: 1, borderTopColor: COLORS.border.light, gap: 12 },
    prevButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 9999, backgroundColor: COLORS.background.secondary, borderWidth: 1, borderColor: COLORS.border.light },
    prevText: { fontSize: 16, fontWeight: '600', color: COLORS.text.primary, marginLeft: 4 },
    nextButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 22, borderRadius: 9999, backgroundColor: COLORS.primary, gap: 6 },
    nextButtonDisabled: { backgroundColor: COLORS.text.light },
    nextText: { color: COLORS.text.white, fontSize: 16, fontWeight: '800', marginRight: 6 },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 16,
        marginBottom: 4,
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
});

export default BusinessQuestionnaireStep6Screen;
