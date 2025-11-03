import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuestionnaire } from '../contexts/QuestionnaireContext';
import { useEffect } from 'react';
import { COLORS } from '../constants/colors';

interface Props {
    navigation: any;
}

// Business Questionnaire - Step 2 (Products & Services)
const BusinessQuestionnaireStep2Screen: React.FC<Props> = ({ navigation }: Props) => {
    const { data, updateData } = useQuestionnaire();
    const [productsServices, setProductsServices] = useState(data.products);
    const [modalVisible, setModalVisible] = useState(false);
    useEffect(() => {
        setProductsServices(data.products || '');
    }, [data.products]);

    const goPrevious = () => {
        navigation?.goBack?.();
    };
    const goNext = () => {
        updateData({
            products: productsServices // Step 2 ke liye sirf ye hi save hoga
        });
        navigation.navigate('BusinessQuestionnaireStep3');
    };



    const totalSteps = 6;
    const currentStep = 2; // change this number for each screen
    const progressRatio = currentStep / totalSteps;

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

                <View style={styles.cardNeutral}>
                    <Text style={styles.cardTitle}>Tell us about your business</Text>
                    <Text style={styles.cardSubtitle}>
                        Answer these questions to help AI create targeted customer personas.
                    </Text>
                </View>

                <View style={styles.sectionBlock}>
                    <Text style={styles.blockTitle}>Products & Services</Text>

                    <Text style={styles.inputLabel}>Main Products/Services *</Text>
                    <TextInput
                        multiline
                        value={productsServices} // keep the state empty initially
                        onChangeText={setProductsServices}
                        placeholder="List your main products and services. For example: We offer a SaaS platform for project management, mobile applications for iOS and Android, web-based dashboard tools, API integrations, consulting services, and custom development solutions."
                        placeholderTextColor="#9ca3af" // grey placeholder
                        style={styles.textArea}
                        textAlignVertical="top"
                        scrollEnabled={true}
                    />


                </View>
            </ScrollView>

            {/* Footer Buttons */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.prevButton} onPress={() => navigation?.goBack?.()}>
                    <Ionicons name="chevron-back" size={18} color={COLORS.text.primary} />
                    <Text style={styles.prevText}>Previous</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.nextButton, !productsServices.trim() && styles.nextButtonDisabled]}
                    onPress={goNext}
                    disabled={!productsServices.trim()}
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
    container: { flex: 1, backgroundColor: COLORS.background.primary },
    content: { padding: 16, paddingBottom: 24 },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 16,
        marginBottom: 8,
        paddingTop: 8,
    },
    progressTextLeft: { fontSize: 14, fontWeight: '600', color: COLORS.text.dark },
    progressTextRight: { fontSize: 14, fontWeight: '600', color: COLORS.text.secondary },
    progressBarTrack: {
        height: 4,
        backgroundColor: COLORS.border.light,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 9999,
    },
    progressBarFill: { height: 4, backgroundColor: COLORS.primary, borderRadius: 9999 },
    sectionCard: { backgroundColor: COLORS.background.secondary, borderRadius: 12, padding: 16, marginBottom: 16 },
    sectionTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text.primary, marginBottom: 6 },
    sectionSub: { fontSize: 14, color: COLORS.text.secondary },
    scanCard: { backgroundColor: '#ede9fe', borderRadius: 12, padding: 14, marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    scanLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 12 },
    scanTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text.primary },
    scanSub: { fontSize: 13, color: COLORS.text.secondary, marginTop: 2 },
    scanButton: { backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999 },
    scanButtonText: { color: COLORS.text.white, fontWeight: '700' },
    sectionBlock: { backgroundColor: COLORS.background.primary, borderRadius: 12, padding: 0, marginBottom: 24 },
    blockTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text.dark, marginBottom: 12 },
    inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text.dark, marginBottom: 8 },
    textArea: {
        borderWidth: 1,
        borderColor: COLORS.border.medium,
        borderRadius: 12,
        minHeight: 220,
        padding: 16,
        fontSize: 16,
        color: COLORS.text.primary,
        backgroundColor: COLORS.background.primary,
        textAlignVertical: 'top',
        maxHeight: 300, // optional: limit height before scrolling
    },

    footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    navButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 999 },
    secondaryButton: { backgroundColor: '#ede9fe' },
    secondaryText: { color: COLORS.primary, fontWeight: '700', marginLeft: 6 },
    primaryButton: { backgroundColor: COLORS.primary },
    primaryText: { color: COLORS.text.white, fontWeight: '700', marginRight: 6 },
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
    nextText: { color: COLORS.text.white, fontSize: 16, fontWeight: '800', marginRight: 6 },
});

export default BusinessQuestionnaireStep2Screen;