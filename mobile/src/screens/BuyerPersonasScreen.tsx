import React from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PersonasStackParamList } from '../navigation/MainNavigator';
import { COLORS } from '../constants/colors';
type NavigationProp = NativeStackNavigationProp<
    PersonasStackParamList,
    'BuyerPersonas'
>;



const PERSONAS = [
    {
        id: '1',
        title: 'Business Operations Director',
        subtitle: 'Business Operations Directors in Technology',
        body:
            'Experienced operations professionals overseeing business processes in medium to large organizations with a focus on efficiency and cross-functional alignment.',
    },
    {
        id: '2',
        title: 'Creative Entrepreneur',
        subtitle:
            'Freelance designers and small business owners in Digital Marketing Agency and Skills Training',
        body:
            'Freelance designers and small business owners seeking to elevate their online presence and optimize client workflows with simple systems.',
    },
    // ... other personas
];

const BuyerPersonasScreen = () => {

    const navigation = useNavigation<NavigationProp>();
    const onPressBack = () => navigation.goBack();
    const onPressAdd = () => navigation.navigate('BusinessQuestionier');
    const onPressEdit = () => {
        console.log('Edit pressed, navigating...');
        navigation.navigate('BusinessOperations');
    };

    const onPressDelete = (id: string) => console.log('Delete pressed:', id);
    const onPressCard = (id: string) => console.log('Card pressed:', id);

    const renderItem = ({ item }: { item: typeof PERSONAS[number] }) => (
        <View style={styles.card}>

            {/* Actions top right */}
            <View style={styles.cardActions}>
                <TouchableOpacity
                    onPress={onPressEdit}
                    activeOpacity={0.7}
                    style={styles.touchArea}
                >
                    <Text style={{ fontSize: 16, color: COLORS.primary }}>✎</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => onPressDelete(item.id)}
                    activeOpacity={0.7}
                    style={[styles.touchArea, { marginLeft: 12 }]}
                >
                    <Text style={{ fontSize: 16, color: COLORS.status.error }}>🗑</Text>
                </TouchableOpacity>
            </View>

            {/* Card content (static) */}
            <View style={{ paddingRight: 50 }}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                <View style={styles.cardDivider} />
                <Text style={styles.cardBody}>{item.body}</Text>
            </View>

        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <IconButton
                        symbol="←"
                        backgroundColor="transparent"
                        color={COLORS.text.primary}
                        onPress={onPressBack}
                    />
                    <Text style={styles.headerTitle}>Buyer Personas</Text>
                </View>
                <IconButton
                    symbol="＋"
                    backgroundColor="transparent"
                    color="#111827"
                    onPress={onPressAdd}
                />
            </View>

            <FlatList
                data={PERSONAS}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />

            <TouchableOpacity
                activeOpacity={0.9}
                style={styles.fab}
                onPress={onPressAdd}
            >
                <Text style={styles.fabText}>＋</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const IconButton = ({
    symbol,
    backgroundColor,
    color,
    onPress,
    style,
}: {
    symbol: string;
    backgroundColor: string;
    color: string;
    onPress?: () => void;
    style?: any;
}) => (
    <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={[styles.iconButton, { backgroundColor }, style]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
        <Text style={[styles.iconText, { color }]}>{symbol}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.background.secondary },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { marginLeft: 12, fontSize: 28, fontWeight: '700', color: COLORS.text.primary },
    listContent: { paddingHorizontal: 16, paddingBottom: 96 },
    card: {
        backgroundColor: COLORS.background.primary,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: COLORS.shadow.light,
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },
    cardActions: {
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
    },
    cardTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text.primary, paddingRight: 80 },
    cardSubtitle: { marginTop: 6, fontSize: 16, lineHeight: 22, color: COLORS.text.secondary, paddingRight: 80 },
    cardDivider: { height: 1, backgroundColor: COLORS.border.light, marginVertical: 12, borderRadius: 1 },
    cardBody: { fontSize: 15, lineHeight: 21, color: COLORS.text.light, paddingRight: 8 },
    iconButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    iconText: { fontSize: 16, fontWeight: '700' },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.primary,
        shadowOpacity: 0.16,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    fabText: { color: COLORS.text.white, fontSize: 28, lineHeight: 28, marginTop: -2, fontWeight: '700' },
    touchArea: {
        padding: 12, // hit area bada kar diya
        borderRadius: 16,
    },

});

export default BuyerPersonasScreen;
