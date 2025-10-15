import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { campaignsService } from '../services/campaignsService';
import { CampaignContactRow } from '../types/campaigns';

export default function CampaignTargetingScreen({ campaignId }: { campaignId: number }) {
	const nav = useNavigation<any>();
	const [search, setSearch] = useState('');
	const [ids, setIds] = useState('');
	const [page, setPage] = useState(1);
	const [limit] = useState(20);
	const [rows, setRows] = useState<CampaignContactRow[]>([]);
	const [total, setTotal] = useState(0);

	const load = async () => {
		const res = await campaignsService.listAttachedContacts(campaignId, { search, page, limit });
		setRows(res.data);
		setTotal(res.total);
	};

	useEffect(() => { load(); }, [campaignId, page, search]);

	const attach = async () => {
		try {
			const parsed = ids.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
			await campaignsService.attachContacts(campaignId, parsed);
			setIds('');
			await load();
		} catch (e) {
			Alert.alert('Error', 'Failed to attach');
		}
	};

	const remove = async (contactId: number) => {
		try {
			await campaignsService.removeAttachedContact(campaignId, contactId);
			await load();
		} catch (e) {
			Alert.alert('Error', 'Failed to remove');
		}
	};

	return (
		<View style={{ padding:16 }}>
			<View style={{ marginBottom:16 }}>
				<TextInput placeholder="Search name/email" value={search} onChangeText={setSearch} style={{ borderWidth:1, borderColor:'#ddd', padding:10, borderRadius:8, marginBottom:8 }} />
				<TextInput placeholder="Attach contact IDs (comma-separated)" value={ids} onChangeText={setIds} style={{ borderWidth:1, borderColor:'#ddd', padding:10, borderRadius:8, marginBottom:8 }} />
				<TouchableOpacity onPress={attach} style={{ backgroundColor:'#6366f1', padding:12, borderRadius:8 }}>
					<Text style={{ color:'#fff', textAlign:'center', fontWeight:'700' }}>Attach</Text>
				</TouchableOpacity>
				<TouchableOpacity onPress={()=>nav.navigate('ContactPicker',{ campaignId })} style={{ marginTop:8, backgroundColor:'#0ea5e9', padding:12, borderRadius:8 }}>
					<Text style={{ color:'#fff', textAlign:'center', fontWeight:'700' }}>Pick from Contacts</Text>
				</TouchableOpacity>
			</View>
			<FlatList
				data={rows}
				keyExtractor={(r)=>String(r.campaign_contact_id)}
				renderItem={({ item }) => (
					<View style={{ padding:12, borderBottomWidth:1, borderColor:'#eee' }}>
						<Text style={{ fontWeight:'600' }}>{item.first_name ?? ''} {item.last_name ?? ''}</Text>
						<Text style={{ color:'#666' }}>{item.email} • {item.status}</Text>
						<TouchableOpacity onPress={() => remove(item.contact_id)} style={{ marginTop:6 }}><Text style={{ color:'#ef4444' }}>Remove</Text></TouchableOpacity>
					</View>
				)}
			/>
			<View style={{ flexDirection:'row', justifyContent:'space-between', marginTop:12 }}>
				<TouchableOpacity disabled={page<=1} onPress={()=>setPage((p)=>Math.max(1,p-1))}><Text style={{ color: page<=1?'#ccc':'#6366f1' }}>Prev</Text></TouchableOpacity>
				<Text>Page {page} of {Math.max(1, Math.ceil(total/limit))}</Text>
				<TouchableOpacity disabled={(page*limit)>=total} onPress={()=>setPage((p)=>p+1)}><Text style={{ color: (page*limit)>=total?'#ccc':'#6366f1' }}>Next</Text></TouchableOpacity>
			</View>
		</View>
	);
}


