import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, RefreshControl, Alert } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { CampaignsStackParamList } from '../navigation/CampaignsNavigator';
import { contactsService } from '../services/contactsService';
import { Contact } from '../types/contacts';
import { campaignsService } from '../services/campaignsService';

export default function ContactPickerScreen() {
	const nav = useNavigation<any>();
	const route = useRoute<RouteProp<CampaignsStackParamList, 'ContactPicker'>>();
	const campaignId = route.params?.campaignId;
	const [items, setItems] = useState<Contact[]>([]);
	const [selected, setSelected] = useState<Set<number>>(new Set());
	const [refreshing, setRefreshing] = useState(false);
	const [search, setSearch] = useState('');

	const load = useCallback(async () => {
		try {
			const res = await contactsService.getContacts({ page: 1, limit: 50, search: search || undefined });
			setItems(res.contacts || []);
		} catch (e) {
			Alert.alert('Error', 'Failed to load contacts');
		}
	}, [search]);

	useEffect(() => { load(); }, [load]);

	const onRefresh = async () => {
		setRefreshing(true);
		await load();
		setRefreshing(false);
	};

	const toggle = (id: number) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id); else next.add(id);
			return next;
		});
	};

	const attach = async () => {
		try {
			if (!campaignId) { Alert.alert('Error','Missing campaign'); return; }
			const ids = Array.from(selected);
			if (ids.length === 0) { Alert.alert('Select', 'Pick at least one contact'); return; }
			await campaignsService.attachContacts(campaignId, ids);
			Alert.alert('Attached', `${ids.length} contact(s) attached`);
			nav.goBack();
		} catch (e) {
			Alert.alert('Error', 'Failed to attach');
		}
	};

	return (
		<View style={{ flex:1, backgroundColor:'#fff' }}>
			<View style={{ padding:12 }}>
				<TextInput placeholder="Search contacts" value={search} onChangeText={setSearch} style={{ borderWidth:1, borderColor:'#ddd', padding:10, borderRadius:8 }} />
			</View>
			<FlatList
				data={items}
				keyExtractor={(i)=>String(i.id)}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
				renderItem={({ item }) => {
					const isSel = selected.has(item.id);
					return (
						<TouchableOpacity onPress={()=>toggle(item.id)} style={{ padding:12, borderBottomWidth:1, borderColor:'#eee', backgroundColor: isSel ? '#eef2ff':'#fff' }}>
							<Text style={{ fontWeight:'600' }}>{item.first_name || ''} {item.last_name || ''}</Text>
							<Text style={{ color:'#666' }}>{item.email}</Text>
						</TouchableOpacity>
					);
				}}
			/>
			<TouchableOpacity onPress={attach} style={{ position:'absolute', right:16, bottom:16, backgroundColor:'#6366f1', paddingVertical:14, paddingHorizontal:18, borderRadius:24 }}>
				<Text style={{ color:'#fff', fontWeight:'700' }}>Attach Selected</Text>
			</TouchableOpacity>
		</View>
	);
}


