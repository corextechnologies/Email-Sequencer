import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    SafeAreaView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuestionnaire } from '../contexts/QuestionnaireContext';
import { COLORS } from '../constants/colors';

type Props = { navigation: any };

const BusinessQuestionnaireStep5Screen: React.FC<Props> = ({ navigation }) => {
    const { data, updateData } = useQuestionnaire();
    const [uniqueValue, setUniqueValue] = useState(data.valueProposition || '');

    const totalSteps = 6;
    const currentStep = 5; // change this number for each screen
    const progressRatio = currentStep / totalSteps;

    const isFormValid = useMemo(() => uniqueValue.trim().length > 0, [uniqueValue]);

    const goNext = () => {
        // Update context with current data
        updateData({ valueProposition: uniqueValue });
        // Navigate to next step or summary
        navigation?.navigate?.('BusinessQuestionnaireStep6');
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

            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                {/* Card Header */}
                <View style={styles.cardNeutral}>
                    <Text style={styles.cardTitle}>Tell us about your business</Text>
                    <Text style={styles.cardSubtitle}>
                        Answer these questions to help AI create targeted customer personas.
                    </Text>
                </View>

                {/* Value Proposition Input */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Value Proposition</Text>

                    <Text style={styles.label}>
                        Unique Value Proposition <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        value={uniqueValue}
                        onChangeText={setUniqueValue}
                        placeholder="What makes your solution unique? For example: Our platform offers real-time collaboration, AI-powered insights, seamless integrations, competitive pricing with no hidden fees, and dedicated customer support available 24/7."
                        placeholderTextColor="#9ca3af"
                        style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
                        multiline
                        numberOfLines={5}
                    />
                </View>
            </ScrollView>

            {/* Footer Buttons */}
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
    sectionTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text.dark, marginBottom: 12 },
    label: { fontSize: 16, fontWeight: '600', color: COLORS.text.dark, marginBottom: 6 },
    required: { color: COLORS.status.error },
    input: { borderWidth: 1, borderColor: COLORS.border.light, backgroundColor: COLORS.background.primary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: COLORS.text.primary, marginTop: 6 },

    footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: COLORS.background.primary, borderTopWidth: 1, borderTopColor: COLORS.border.light, gap: 12 },
    prevButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 9999, backgroundColor: COLORS.background.secondary, borderWidth: 1, borderColor: COLORS.border.light },
    prevText: { fontSize: 16, fontWeight: '600', color: COLORS.text.primary, marginLeft: 4 },
    nextButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 22, borderRadius: 9999, backgroundColor: COLORS.primary, gap: 6 },
    nextButtonDisabled: { backgroundColor: COLORS.text.light },
    nextText: { color: COLORS.text.white, fontSize: 16, fontWeight: '800', marginRight: 6 },
    cardInfo: { backgroundColor: '#ede9fe', borderRadius: 14, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    cardInfoLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
    cardInfoIconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' },
    cardInfoTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text.primary },
    cardInfoText: { fontSize: 12, color: COLORS.text.secondary, marginTop: 2 },
    scanButton: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 9999 },
    scanButtonText: { color: COLORS.text.white, fontSize: 14, fontWeight: '700' },
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

export default BusinessQuestionnaireStep5Screen;
