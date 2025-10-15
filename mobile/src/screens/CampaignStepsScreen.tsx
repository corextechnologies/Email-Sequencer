import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { campaignsService } from '../services/campaignsService';
import { SequenceStep } from '../types/campaigns';
import { useOptimisticList } from '../hooks/useOptimisticList';
import api from '../services/api';
import { EmailAccount } from '../types';

export default function CampaignStepsScreen({ campaignId }: { campaignId: number }) {
	const { items, setItems, begin, commit, rollback, insert, update, remove } = useOptimisticList<SequenceStep>([]);
	const [subject, setSubject] = useState('');
	const [body, setBody] = useState('');
	const [delay, setDelay] = useState('0');
	const [accounts, setAccounts] = useState<EmailAccount[]>([]);
	const [fromId, setFromId] = useState<number | null>(null);
    const nav = useNavigation<any>();
	const [genOpen, setGenOpen] = useState(false);
	const [genNum, setGenNum] = useState('2');
	const [genTone, setGenTone] = useState('');
	const [genCTA, setGenCTA] = useState('');
	const [editingStep, setEditingStep] = useState<SequenceStep | null>(null);
	const [editFromId, setEditFromId] = useState<number | null>(null);

	useEffect(() => {
		campaignsService.listSteps(campaignId).then(setItems as any);
	api.get('/email-accounts')
		.then((res)=>{
			const arr = (res.data?.data ?? []) as EmailAccount[];
			const active = arr.filter(a=>a.is_active);
			setAccounts(active);
			if (active.length && fromId==null) setFromId(active[0].id);
		})
		.catch(()=>{});
	}, [campaignId, setItems]);

	const addStep = async () => {
		// Validation
		if (!subject.trim()) {
			Alert.alert('Error', 'Please enter a subject for the email');
			return;
		}
		if (!body.trim()) {
			Alert.alert('Error', 'Please enter the email body');
			return;
		}
		if (!fromId) {
			Alert.alert('Error', 'Please select an email account to send from');
			return;
		}
		if (accounts.length === 0) {
			Alert.alert('Error', 'No email accounts available. Please add an email account first.');
			return;
		}

		begin();
		const temp: SequenceStep = { id: Date.now(), campaign_id: campaignId, step_index: items.length, delay_hours: Number(delay)||0, from_email_account_id: fromId, subject_template: subject, body_template: body, prompt_key: null, enabled: true, created_at:'', updated_at:'' };
		insert(temp);
		try {
			const created = await campaignsService.createSteps(campaignId, { delay_hours: temp.delay_hours, from_email_account_id: fromId, subject_template: temp.subject_template, body_template: temp.body_template, enabled: true });
			const real = Array.isArray(created) ? created[0] : created;
			update(temp.id, { id: real.id } as any);
			commit();
			setSubject(''); setBody(''); setDelay('0'); setFromId(accounts.length > 0 ? accounts[0].id : null);
		} catch (e) {
			rollback();
			Alert.alert('Error', 'Failed to add step');
		}
	};

	const deleteStep = async (step: SequenceStep) => {
		begin();
		remove(step.id);
		try {
			await campaignsService.deleteStep(campaignId, step.id);
			commit();
		} catch (e) {
			rollback();
			Alert.alert('Error', 'Failed to delete step');
		}
	};

	const startEditingStep = (step: SequenceStep) => {
		setEditingStep(step);
		setEditFromId(step.from_email_account_id);
	};

	const saveStepEdit = async () => {
		if (!editingStep || !editFromId) return;
		
		begin();
		const updatedStep = { ...editingStep, from_email_account_id: editFromId };
		update(editingStep.id, updatedStep as any);
		try {
			await campaignsService.updateStep(campaignId, editingStep.id, { from_email_account_id: editFromId });
			commit();
			setEditingStep(null);
			setEditFromId(null);
		} catch (e) {
			rollback();
			Alert.alert('Error', 'Failed to update step');
		}
	};

	const cancelStepEdit = () => {
		setEditingStep(null);
		setEditFromId(null);
	};

	const renderHeader = () => (
		<View style={{ padding: 16, paddingBottom: 0 }}>
			<View style={{ marginBottom:16 }}>
				<TextInput placeholder="Subject" value={subject} onChangeText={setSubject} style={{ borderWidth:1, borderColor:'#ddd', padding:10, borderRadius:8, marginBottom:8 }} />
				<TextInput placeholder="Body" value={body} onChangeText={setBody} style={{ borderWidth:1, borderColor:'#ddd', padding:10, borderRadius:8, marginBottom:8 }} />
				<TextInput placeholder="Delay hours" value={delay} onChangeText={setDelay} keyboardType="numeric" style={{ borderWidth:1, borderColor:'#ddd', padding:10, borderRadius:8, marginBottom:8 }} />
				<View style={{ borderWidth:1, borderColor:'#ddd', borderRadius:8, marginBottom:8, padding:12 }}>
					<Text style={{ marginBottom:8, color:'#333', fontWeight:'600', fontSize:16 }}>Send From Email Account</Text>
					{accounts.length === 0 ? (
						<View style={{ backgroundColor:'#fef3c7', padding:12, borderRadius:6, borderWidth:1, borderColor:'#f59e0b' }}>
							<Text style={{ color:'#92400e', marginBottom:8, fontWeight:'500' }}>No active email accounts found</Text>
							<Text style={{ color:'#92400e', marginBottom:8, fontSize:14 }}>You need to add an email account to send emails from this campaign.</Text>
							<TouchableOpacity 
								onPress={()=>nav.navigate('EmailAccounts')} 
								style={{ backgroundColor:'#f59e0b', paddingVertical:8, paddingHorizontal:12, borderRadius:6, alignSelf:'flex-start' }}
							>
								<Text style={{ color:'#fff', fontWeight:'600' }}>Add Email Account</Text>
							</TouchableOpacity>
						</View>
					) : (
						<View>
							<Text style={{ color:'#666', marginBottom:8, fontSize:14 }}>Select which email account to send this step from:</Text>
							<FlatList 
								horizontal 
								data={accounts} 
								keyExtractor={(a)=>String(a.id)} 
								showsHorizontalScrollIndicator={false}
								renderItem={({item}) => (
									<TouchableOpacity 
										onPress={()=>setFromId(item.id)} 
										style={{ 
											paddingVertical:10, 
											paddingHorizontal:16, 
											borderRadius:20, 
											borderWidth:2, 
											borderColor: fromId===item.id?'#6366f1':'#e5e7eb', 
											marginRight:12,
											backgroundColor: fromId===item.id?'#f0f4ff':'#fff',
											minWidth: 120,
											alignItems: 'center'
										}}
									>
										<Text style={{ 
											color: fromId===item.id?'#6366f1':'#374151', 
											fontWeight: fromId===item.id?'600':'500',
											fontSize: 14
										}}>
											{item.username}
										</Text>
										<Text style={{ 
											color: fromId===item.id?'#6366f1':'#6b7280', 
											fontSize: 12,
											marginTop: 2
										}}>
											{item.provider}
										</Text>
									</TouchableOpacity>
								)} 
							/>
							{fromId && (
								<View style={{ marginTop:8, padding:8, backgroundColor:'#f0f4ff', borderRadius:6 }}>
									<Text style={{ color:'#6366f1', fontSize:12, fontWeight:'500' }}>
										Selected: {accounts.find(a=>a.id===fromId)?.username} ({accounts.find(a=>a.id===fromId)?.provider})
									</Text>
								</View>
							)}
						</View>
					)}
				</View>
				<TouchableOpacity onPress={addStep} style={{ backgroundColor:'#6366f1', padding:12, borderRadius:8 }}>
					<Text style={{ color:'#fff', textAlign:'center', fontWeight:'700' }}>Add Step</Text>
				</TouchableOpacity>
				<TouchableOpacity onPress={()=>setGenOpen(!genOpen)} style={{ marginTop:8, backgroundColor:'#0ea5e9', padding:12, borderRadius:8 }}>
					<Text style={{ color:'#fff', textAlign:'center', fontWeight:'700' }}>Generate Steps</Text>
				</TouchableOpacity>
				{genOpen && (
					<View style={{ marginTop:8, borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:10 }}>
						<Text style={{ fontWeight:'600', marginBottom:6 }}>AI Generate</Text>
						<TextInput placeholder="Number of steps" value={genNum} onChangeText={setGenNum} keyboardType="numeric" style={{ borderWidth:1, borderColor:'#ddd', padding:10, borderRadius:8, marginBottom:8 }} />
						<TextInput placeholder="Tone (e.g., friendly)" value={genTone} onChangeText={setGenTone} style={{ borderWidth:1, borderColor:'#ddd', padding:10, borderRadius:8, marginBottom:8 }} />
						<TextInput placeholder="CTA (e.g., book a demo)" value={genCTA} onChangeText={setGenCTA} style={{ borderWidth:1, borderColor:'#ddd', padding:10, borderRadius:8, marginBottom:8 }} />
						<TouchableOpacity onPress={async()=>{
							try {
								const gen = await campaignsService.generateSteps(campaignId, { num_steps: parseInt(genNum||'2',10), tone: genTone||undefined, CTA: genCTA||undefined });
								setItems(gen as any);
								setGenOpen(false);
							} catch (e) { Alert.alert('Error','Generate failed'); }
						}} style={{ backgroundColor:'#22c55e', padding:12, borderRadius:8 }}>
							<Text style={{ color:'#fff', textAlign:'center', fontWeight:'700' }}>Run Generator</Text>
						</TouchableOpacity>
					</View>
				)}
			</View>
		</View>
	);

	return (
		<FlatList
			data={items.sort((a,b)=>a.step_index-b.step_index)}
			keyExtractor={(i)=>String(i.id)}
			ListHeaderComponent={renderHeader}
			renderItem={({ item }) => (
					<View style={{ padding:16, borderBottomWidth:1, borderColor:'#eee', backgroundColor:'#fff', marginBottom:8, borderRadius:8, borderWidth:1}}>
						<View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
							<Text style={{ fontWeight:'700', fontSize:16, color:'#1f2937' }}>Step {item.step_index + 1}</Text>
							<View style={{ backgroundColor:'#f3f4f6', paddingHorizontal:8, paddingVertical:4, borderRadius:12 }}>
								<Text style={{ fontSize:12, color:'#6b7280', fontWeight:'500' }}>+{item.delay_hours}h delay</Text>
							</View>
						</View>
						
						<Text style={{ fontWeight:'600', fontSize:15, color:'#374151', marginBottom:6 }}>{item.subject_template}</Text>
						
						<View style={{ flexDirection:'row', alignItems:'center', marginBottom:8 }}>
							<Text style={{ color:'#6b7280', fontSize:14, marginRight:8 }}>From:</Text>
							<View style={{ backgroundColor:'#f0f4ff', paddingHorizontal:8, paddingVertical:4, borderRadius:12, borderWidth:1, borderColor:'#c7d2fe' }}>
								<Text style={{ color:'#6366f1', fontSize:13, fontWeight:'500' }}>
									{accounts.find(a=>a.id===item.from_email_account_id)?.username ?? 'Not specified'}
								</Text>
							</View>
						</View>
						
						{item.from_email_account_id && (
							<View style={{ backgroundColor:'#f0f9ff', padding:8, borderRadius:6, marginBottom:8 }}>
								<Text style={{ color:'#0369a1', fontSize:12 }}>
									Will send from: {accounts.find(a=>a.id===item.from_email_account_id)?.username} ({accounts.find(a=>a.id===item.from_email_account_id)?.provider})
								</Text>
							</View>
						)}

						{editingStep?.id === item.id ? (
							<View style={{ backgroundColor:'#fef3c7', padding:12, borderRadius:8, marginBottom:8, borderWidth:1, borderColor:'#f59e0b' }}>
								<Text style={{ color:'#92400e', fontWeight:'600', marginBottom:8 }}>Edit Email Account</Text>
								<Text style={{ color:'#92400e', fontSize:14, marginBottom:8 }}>Select a different email account for this step:</Text>
								<FlatList 
									horizontal 
									data={accounts} 
									keyExtractor={(a)=>String(a.id)} 
									showsHorizontalScrollIndicator={false}
									renderItem={({item: account}) => (
										<TouchableOpacity 
											onPress={()=>setEditFromId(account.id)} 
											style={{ 
												paddingVertical:8, 
												paddingHorizontal:12, 
												borderRadius:16, 
												borderWidth:2, 
												borderColor: editFromId===account.id?'#f59e0b':'#d1d5db', 
												marginRight:8,
												backgroundColor: editFromId===account.id?'#fef3c7':'#fff',
												minWidth: 100,
												alignItems: 'center'
											}}
										>
											<Text style={{ 
												color: editFromId===account.id?'#92400e':'#374151', 
												fontWeight: editFromId===account.id?'600':'500',
												fontSize: 12
											}}>
												{account.username}
											</Text>
										</TouchableOpacity>
									)} 
								/>
								<View style={{ flexDirection:'row', gap:8, marginTop:8 }}>
									<TouchableOpacity 
										onPress={saveStepEdit}
										style={{ backgroundColor:'#f59e0b', paddingVertical:6, paddingHorizontal:12, borderRadius:6, flex:1 }}
									>
										<Text style={{ color:'#fff', textAlign:'center', fontWeight:'600' }}>Save</Text>
									</TouchableOpacity>
									<TouchableOpacity 
										onPress={cancelStepEdit}
										style={{ backgroundColor:'#6b7280', paddingVertical:6, paddingHorizontal:12, borderRadius:6, flex:1 }}
									>
										<Text style={{ color:'#fff', textAlign:'center', fontWeight:'600' }}>Cancel</Text>
									</TouchableOpacity>
								</View>
							</View>
						) : (
							<TouchableOpacity 
								onPress={() => startEditingStep(item)}
								style={{ backgroundColor:'#f3f4f6', paddingVertical:6, paddingHorizontal:12, borderRadius:6, alignSelf:'flex-start', marginBottom:8 }}
							>
								<Text style={{ color:'#6b7280', fontSize:12, fontWeight:'500' }}>Change Email Account</Text>
							</TouchableOpacity>
						)}
						<View style={{ flexDirection:'row', gap:12, marginTop:8 }}>
							<TouchableOpacity onPress={async ()=>{
								const ordered = items.sort((a,b)=>a.step_index-b.step_index);
								const idx = ordered.findIndex(s=>s.id===item.id);
								if (idx<=0) return;
								const newOrder = [...ordered];
								[newOrder[idx-1], newOrder[idx]] = [newOrder[idx], newOrder[idx-1]];
								newOrder.forEach((s,i)=>s.step_index=i);
								setItems(newOrder as any);
								await campaignsService.reorderSteps(campaignId, newOrder.map(s=>s.id));
							}}>
								<Text style={{ color:'#6366f1' }}>Move Up</Text>
							</TouchableOpacity>
							<TouchableOpacity onPress={async ()=>{
								const ordered = items.sort((a,b)=>a.step_index-b.step_index);
								const idx = ordered.findIndex(s=>s.id===item.id);
								if (idx>=ordered.length-1) return;
								const newOrder = [...ordered];
								[newOrder[idx+1], newOrder[idx]] = [newOrder[idx], newOrder[idx+1]];
								newOrder.forEach((s,i)=>s.step_index=i);
								setItems(newOrder as any);
								await campaignsService.reorderSteps(campaignId, newOrder.map(s=>s.id));
							}}>
								<Text style={{ color:'#6366f1' }}>Move Down</Text>
							</TouchableOpacity>
						</View>
						<TouchableOpacity onPress={async()=>{
							try {
								const gen = await campaignsService.generateSteps(campaignId, { step_id: item.id });
								setItems((prev)=>prev.map(s=>s.id===item.id ? gen[0] : s) as any);
							} catch (e) { Alert.alert('Error','Regenerate failed'); }
						}} style={{ marginTop:8 }}>
							<Text style={{ color:'#0ea5e9' }}>Regenerate</Text>
						</TouchableOpacity>
						<TouchableOpacity onPress={() => deleteStep(item)} style={{ marginTop:8 }}>
							<Text style={{ color:'#ef4444' }}>Delete</Text>
						</TouchableOpacity>
					</View>
				)}
			/>
		);
}


