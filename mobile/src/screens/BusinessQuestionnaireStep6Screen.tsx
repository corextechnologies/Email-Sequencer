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
        if (!option1 && !option2) {
            Alert.alert('Selection Required', 'Please select at least one AI enhancement option.');
            return;
        }

        // Check LLM key FIRST before form completion check
        // This prevents showing "Incomplete Form" error when the real issue is missing LLM key
        setIsGenerating(true);
        
        try {
            // Pre-validate: Check if LLM key exists FIRST - this is the main blocker
            try {
                const savedKeys = await ApiService.getSavedLlmKeys();
                if (!savedKeys || savedKeys.length === 0) {
                    setIsGenerating(false);
                    Alert.alert(
                        'API Key Required',
                        'No LLM API key found. Please configure an API key in Settings before generating personas.',
                        [
                            { text: 'OK' },
                            {
                                text: 'Go to Settings',
                                onPress: () => navigation.navigate('Settings')
                            }
                        ]
                    );
                    return;
                }
                
                // Check if at least one key is available
                const hasValidKey = savedKeys.some(key => key.hasKey === true);
                if (!hasValidKey) {
                    setIsGenerating(false);
                    Alert.alert(
                        'API Key Required',
                        'No valid LLM API key found. Please configure an API key in Settings before generating personas.',
                        [
                            { text: 'OK' },
                            {
                                text: 'Go to Settings',
                                onPress: () => navigation.navigate('Settings')
                            }
                        ]
                    );
                    return;
                }
            } catch (keyCheckError: any) {
                // If key check fails, check if it's a NO_API_KEY error
                const errorData = keyCheckError?.response?.data?.error || keyCheckError?.response?.data || keyCheckError?.error;
                const errorCode = errorData?.code || keyCheckError?.response?.status;
                
                if (errorCode === 'NO_API_KEY' || errorCode === 400 || errorData?.code === 'NO_API_KEY') {
                    setIsGenerating(false);
                    Alert.alert(
                        'API Key Required',
                        errorData?.message || 'No LLM API key found. Please configure an API key in Settings before generating personas.',
                        [
                            { text: 'OK' },
                            {
                                text: 'Go to Settings',
                                onPress: () => navigation.navigate('Settings')
                            }
                        ]
                    );
                    return;
                }
                // If key check fails for other reasons, log but continue - API will handle the error
                console.warn('Failed to check LLM keys:', keyCheckError);
                // Continue with generation - API will return proper error if no key exists
            }

            // Now check form completion AFTER LLM key validation
            const formComplete = isComplete();
            if (!formComplete) {
                setIsGenerating(false);
                Alert.alert('Incomplete Form', 'Please complete all questionnaire steps before generating personas.');
                return;
            }

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
                        // Navigate to personas list screen
                        navigation.navigate('PersonasList');
                    }},
                    { text: 'OK', style: 'default' }
                ]
            );

        } catch (error: any) {
            console.error('Persona generation error:', error);
            
            // Handle specific error types with improved robustness
            let errorMessage = 'Failed to generate personas. Please try again.';
            let errorTitle = 'Generation Failed';
            let errorCode: string | number | undefined;
            
            // Check multiple possible error response structures
            const errorData = error.response?.data?.error || error.response?.data || error.error;
            const errorCodeValue = errorData?.code || error.response?.status || error.code;
            
            if (errorData) {
                errorCode = errorData.code || errorCodeValue;
                errorMessage = errorData.message || errorData.error || error.message || errorMessage;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            // Handle specific error codes
            switch (errorCode) {
                case 'NO_API_KEY':
                    errorTitle = 'API Key Required';
                    errorMessage = errorData?.message || 'No LLM API key found. Please configure an API key in Settings.';
                    break;
                case 'DECRYPTION_ERROR':
                    errorTitle = 'Configuration Error';
                    errorMessage = errorData?.message || 'Failed to decrypt API key. Please reconfigure your API key in Settings.';
                    break;
                case 'TOKEN_LIMIT_EXCEEDED':
                    errorTitle = 'Request Too Complex';
                    errorMessage = errorData?.message || 'The request is too complex. Please try with fewer enhancement options.';
                    break;
                case 'LLM_ERROR':
                    errorTitle = 'AI Service Error';
                    errorMessage = errorData?.message || 'AI service temporarily unavailable. Please try again later.';
                    break;
                case 'INVALID_PROVIDER':
                    errorTitle = 'Invalid Provider';
                    errorMessage = errorData?.message || 'The specified LLM provider is not supported.';
                    break;
                case 'VALIDATION_ERROR':
                    errorTitle = 'Validation Error';
                    errorMessage = errorData?.message || 'Invalid questionnaire data. Please complete all required fields.';
                    break;
                case 400:
                    errorTitle = 'Bad Request';
                    errorMessage = errorData?.message || errorData?.error || 'Invalid request. Please check your input.';
                    break;
                case 401:
                    errorTitle = 'Unauthorized';
                    errorMessage = 'Authentication failed. Please log in again.';
                    break;
                case 403:
                    errorTitle = 'Forbidden';
                    errorMessage = 'You do not have permission to perform this action.';
                    break;
                case 404:
                    errorTitle = 'Not Found';
                    errorMessage = 'The requested resource was not found.';
                    break;
                case 500:
                case 502:
                case 503:
                    errorTitle = 'Server Error';
                    errorMessage = errorData?.message || 'Server temporarily unavailable. Please try again later.';
                    break;
                default:
                    // Use error message if available, otherwise use default
                    if (errorData?.message) {
                        errorMessage = errorData.message;
                    }
            }
            
            // Build alert buttons
            const alertButtons: any[] = [{ text: 'OK' }];
            
            if (errorCode === 'NO_API_KEY') {
                alertButtons.push({
                    text: 'Go to Settings',
                    onPress: () => navigation.navigate('Settings')
                });
            } else if (errorCode === 'TOKEN_LIMIT_EXCEEDED') {
                alertButtons.push({
                    text: 'Simplify Request',
                    onPress: () => {
                        // Uncheck enhancement options to reduce complexity
                        setOption1(false);
                        setOption2(false);
                    }
                });
            }
            
            Alert.alert(errorTitle, errorMessage, alertButtons);
        } finally {
            setIsGenerating(false);
        }
    };
    const goNext = () => {
        // Navigate to Personas list on the last step
        navigation.navigate('PersonasList');
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
                    {isGenerating && (
                        <ActivityIndicator size="small" color={COLORS.text.white} style={{ marginRight: 8 }} />
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
                {/* Hide "Next" button on last step (Step 6) */}
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
