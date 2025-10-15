// screens/BusinessOperationsScreen.js
import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRoute } from '@react-navigation/native';

// Safe IconText component
const IconText = ({ children }: { children?: React.ReactNode }) => (
    <Text style={styles.iconText}>{children}</Text>
);

// Safe LabelValue component
const LabelValue = ({ label, value }: { label?: string; value?: string }) => (
    <View style={styles.labelValue}>
        <Text style={styles.labelText}>{label || ""}</Text>
        <Text style={styles.valueText}>{value || ""}</Text>
    </View>
);

// Safe SectionCard component
const SectionCard = ({ title, children }: { title?: string; children?: React.ReactNode }) => (
    <View style={styles.card}>
        {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
        {children}
    </View>
);

const BusinessOperationsScreen = () => {

    // Dummy data
    const dummyPersona = {
        id: "1",
        industry: "Technology",
        role: "Business Operations Director",
        companySize: "51–200",
        location: "Metro areas",
        description:
            "Experienced operations professionals overseeing business processes in medium to large companies in need of automation solutions for enhanced efficiency.",
        challenges: ["Managing cross-functional teams", "Implementing new technologies"],
        changeEvents: "Expansion plans, Compliance audits",
        interests: "Case studies, Demos, Webinars",
        communication: "Concise, data-backed updates",
        drivers: "ROI, Time-to-value, Risk mitigation",
    };

    return (
        <View style={styles.container}>
            {/* Top Bar */}
            <View style={styles.topBar}>
                <Pressable onPress={() => { }} hitSlop={8}>
                    <IconText>←</IconText>
                </Pressable>
                <Text numberOfLines={1} style={styles.topBarTitle}>
                    Business Operations
                </Text>
                <View style={styles.topBarActions}>
                    <Pressable onPress={() => { }} hitSlop={8}>
                        <IconText>☆</IconText>
                    </Pressable>
                    <Pressable onPress={() => { }} hitSlop={8}>
                        <IconText>✎</IconText>
                    </Pressable>
                    <Pressable onPress={() => { }} hitSlop={8}>
                        <IconText>⋮</IconText>
                    </Pressable>
                </View>
            </View>

            {/* Content */}
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Persona ID (if passed) */}
                {/* {id && (
                    <SectionCard>
                        <LabelValue label="Persona ID" value={String(id)} />
                    </SectionCard>
                )} */}

                {/* General Info */}
                <SectionCard>
                    <LabelValue label="Industry" value={dummyPersona.industry} />
                    <LabelValue label="Role" value={dummyPersona.role} />
                    <LabelValue label="Company Size" value={dummyPersona.companySize} />
                    <LabelValue label="Location" value={dummyPersona.location} />
                    <LabelValue label="Description" value={dummyPersona.description} />
                </SectionCard>

                {/* Professional Details */}
                <SectionCard title="Professional Details">
                    <LabelValue
                        label="Current Challenges"
                        value={dummyPersona.challenges.join(", ")}
                    />
                    <LabelValue label="Change Events" value={dummyPersona.changeEvents} />
                </SectionCard>

                {/* Psychology & Behavior */}
                <SectionCard title="Psychology & Behavior">
                    <LabelValue
                        label="Interests & Priorities"
                        value={dummyPersona.interests}
                    />
                    <LabelValue
                        label="Communication Style"
                        value={dummyPersona.communication}
                    />
                    <LabelValue
                        label="Decision Drivers"
                        value={dummyPersona.drivers}
                    />
                </SectionCard>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F4F7' },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomColor: '#E5E7EB',
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    topBarTitle: {
        flex: 1,
        marginLeft: 12,
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    topBarActions: { flexDirection: 'row', alignItems: 'center' },
    iconText: { fontSize: 18, color: '#4B5563', marginLeft: 14 },
    scrollContent: { padding: 16, paddingBottom: 32 },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderColor: '#E5E7EB',
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000000',
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 1,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 12,
    },
    labelValue: { marginBottom: 12 },
    labelText: {
        fontSize: 12,
        color: '#2563EB',
        marginBottom: 4,
        fontWeight: '600',
    },
    valueText: { fontSize: 16, color: '#111827', lineHeight: 22 },
});

export default BusinessOperationsScreen;
