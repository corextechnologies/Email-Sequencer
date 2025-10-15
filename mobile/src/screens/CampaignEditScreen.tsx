import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, FlatList } from 'react-native';
import { RouteProp, useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { CampaignsStackParamList } from '../navigation/CampaignsNavigator';
import { campaignsService } from '../services/campaignsService';
import api from '../services/api';
import { EmailAccount } from '../types';

export default function CampaignEditScreen() {
	const nav = useNavigation<any>();
	const route = useRoute<RouteProp<CampaignsStackParamList, 'CampaignEdit'>>();
	const id = route.params?.id;
	const [campaign, setCampaign] = useState<any>(null);
	const [emailSubject, setEmailSubject] = useState('');
	const [emailBody, setEmailBody] = useState('');
	const [fromEmailAccountId, setFromEmailAccountId] = useState<number | null>(null);
	const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
	const [loading, setLoading] = useState(false);

	const loadData = React.useCallback(async () => {
		if (!id) return;
		setLoading(true);
		try {
			const [c, res] = await Promise.all([
				campaignsService.getCampaign(id),
				api.get('/email-accounts')
			]);
			
			console.log('Campaign data:', c);
			console.log('Email accounts response:', res.data);
			
			setCampaign(c);
			setEmailSubject(c.email_subject || '');
			setEmailBody(c.email_body || '');
			setFromEmailAccountId(c.from_email_account_id || null);
			
			const accounts = (res.data?.data ?? []) as EmailAccount[];
			console.log('All accounts:', accounts);
			const active = accounts.filter(a => a.is_active);
			console.log('Active accounts:', active);
			setEmailAccounts(active);
			if (active.length && !c.from_email_account_id) {
				console.log('Auto-selecting first account:', active[0].id);
				setFromEmailAccountId(active[0].id);
			}
		} catch (err: any) {
			console.error('Error loading campaign/email accounts:', err);
			Alert.alert('Error', 'Failed to load campaign or email accounts: ' + (err?.message || String(err)));
		} finally {
			setLoading(false);
		}
	}, [id]);

	// Load data when screen comes into focus (e.g., returning from Add Email Account screen)
	useFocusEffect(
		React.useCallback(() => {
			loadData();
		}, [loadData])
	);

	const saveEmailContent = async () => {
		console.log('Save button clicked!');
		console.log('Current state:', {
			emailSubject: emailSubject?.substring(0, 50),
			emailBodyLength: emailBody?.length,
			fromEmailAccountId,
			campaignId: id
		});

		if (!emailSubject.trim()) {
			Alert.alert('Error', 'Please enter an email subject');
			return;
		}

		if (!emailBody.trim()) {
			Alert.alert('Error', 'Please enter an email body');
			return;
		}

		if (!fromEmailAccountId) {
			Alert.alert('Error', 'Please select an email account to send from');
			return;
		}

		try {
			setLoading(true);
			
			const payload = { 
				email_subject: emailSubject.trim(),
				email_body: emailBody.trim(),
				from_email_account_id: fromEmailAccountId
			};
			
			console.log('Sending update payload:', payload);
			console.log('API Call: PUT /campaigns/' + id);
			
			// Update campaign with email content
			const updated = await campaignsService.updateCampaign(id!, payload);
			
			console.log('Campaign updated successfully!');
			console.log('Response:', updated);
			
			// Reload data to verify save
			await loadData();
			
			Alert.alert('Success', 'Email content saved successfully', [
				{ text: 'OK', onPress: () => nav.goBack() }
			]);
		} catch (e: any) {
			console.error('Error saving email content:', e);
			console.error('Error details:', e?.response?.data || e?.message);
			Alert.alert('Error', e?.response?.data?.error?.message || e?.message || 'Failed to save email content');
		} finally {
			setLoading(false);
		}
	};

	if (!campaign) {
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
				<ActivityIndicator size="large" />
				<Text style={{ marginTop: 16, color: '#6b7280' }}>Loading campaign...</Text>
			</View>
		);
	}

	return (
		<ScrollView style={{ flex:1, backgroundColor:'#fff' }} contentContainerStyle={{ padding:16 }}>
			{loading ? <ActivityIndicator /> : null}
			
			<View style={{ marginBottom: 24 }}>
				<Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 }}>
					Setup Email Content
				</Text>
				<Text style={{ fontSize: 16, color: '#6b7280', marginBottom: 4 }}>
					{campaign.name}
				</Text>
				<Text style={{ fontSize: 14, color: '#9ca3af' }}>
					Configure your email content and timing
				</Text>
			</View>

			<View style={{ backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: '#6366f1' }}>
				<Text style={{ color: '#374151', fontSize: 14, fontWeight: '600', marginBottom: 4 }}>
					Immediate Email Send
				</Text>
				<Text style={{ color: '#6b7280', fontSize: 12, marginBottom: 2 }}>
					• Write your email template with personalization variables
				</Text>
				<Text style={{ color: '#6b7280', fontSize: 12, marginBottom: 2 }}>
					• Select which email account to send from
				</Text>
				<Text style={{ color: '#6b7280', fontSize: 12 }}>
					• Emails will be sent immediately when you launch the campaign
				</Text>
			</View>
			
			<Text style={{ fontWeight:'600', marginBottom:8, fontSize: 16, color: '#374151' }}>Email Subject *</Text>
			<TextInput 
				value={emailSubject} 
				onChangeText={setEmailSubject} 
				placeholder="e.g., Welcome - {{contact.first_name}}" 
				style={{ 
					borderWidth:1, 
					borderColor:'#d1d5db', 
					padding:16, 
					borderRadius:12, 
					marginBottom:20,
					fontSize: 16,
					backgroundColor: '#fff'
				}}
				maxLength={255}
			/>

			<Text style={{ fontWeight:'600', marginBottom:8, fontSize: 16, color: '#374151' }}>Email Body *</Text>
			<TextInput 
				value={emailBody} 
				onChangeText={setEmailBody} 
				placeholder="Hi {{contact.first_name}},\n\nYour personalized message here.\n\nBest regards,\n{{user.name}}" 
				style={{ 
					borderWidth:1, 
					borderColor:'#d1d5db', 
					padding:16, 
					borderRadius:12, 
					marginBottom:20,
					fontSize: 16,
					backgroundColor: '#fff',
					minHeight: 120,
					textAlignVertical: 'top'
				}}
				multiline
				numberOfLines={6}
			/>

			<Text style={{ fontWeight:'600', marginBottom:8, fontSize: 16, color: '#374151' }}>Send From Email Account *</Text>
			
			{/* Debug Info */}
			{campaign && (
				<View style={{ backgroundColor:'#f0f9ff', padding:10, borderRadius:8, marginBottom:12, borderWidth:1, borderColor:'#bfdbfe' }}>
					<Text style={{ fontSize:12, color:'#1e40af', marginBottom:4 }}>
						Debug Info:
					</Text>
					<Text style={{ fontSize:11, color:'#1e40af' }}>
						• Campaign ID: {campaign.id} | User ID: {campaign.user_id}
					</Text>
					<Text style={{ fontSize:11, color:'#1e40af' }}>
						• Saved Email Account ID: {campaign.from_email_account_id || 'None'}
					</Text>
					<Text style={{ fontSize:11, color:'#1e40af' }}>
						• Currently Selected: {fromEmailAccountId || 'None'}
					</Text>
					<Text style={{ fontSize:11, color:'#1e40af' }}>
						• Active Accounts Loaded: {emailAccounts.length}
					</Text>
				</View>
			)}
			
			<View style={{ borderWidth:1, borderColor:'#d1d5db', borderRadius:12, marginBottom:20, padding:12 }}>
				{emailAccounts.length === 0 ? (
					<View style={{ backgroundColor:'#fef3c7', padding:12, borderRadius:6, borderWidth:1, borderColor:'#f59e0b' }}>
						<Text style={{ color:'#92400e', marginBottom:8, fontWeight:'500' }}>No active email accounts found</Text>
						<Text style={{ color:'#92400e', marginBottom:8, fontSize:14 }}>You need to add an email account to send emails from this campaign.</Text>
						<TouchableOpacity 
							onPress={() => nav.navigate('EmailAccounts')} 
							style={{ backgroundColor:'#f59e0b', paddingVertical:8, paddingHorizontal:12, borderRadius:6, alignSelf:'flex-start' }}
						>
							<Text style={{ color:'#fff', fontWeight:'600' }}>Add Email Account</Text>
						</TouchableOpacity>
					</View>
				) : (
					<>
						<Text style={{ color:'#666', marginBottom:8, fontSize:14 }}>Select which email account to send from:</Text>
						<FlatList 
							horizontal 
							data={emailAccounts} 
							keyExtractor={(a) => String(a.id)} 
							showsHorizontalScrollIndicator={false}
							renderItem={({item}) => (
								<TouchableOpacity 
									onPress={() => setFromEmailAccountId(item.id)} 
									style={{ 
										paddingVertical:10, 
										paddingHorizontal:16, 
										borderRadius:20, 
										borderWidth:2, 
										borderColor: fromEmailAccountId === item.id ? '#6366f1' : '#e5e7eb', 
										marginRight:12,
										backgroundColor: fromEmailAccountId === item.id ? '#f0f4ff' : '#fff',
										minWidth: 120,
										alignItems: 'center'
									}}
								>
									<Text style={{ 
										color: fromEmailAccountId === item.id ? '#6366f1' : '#374151', 
										fontWeight: fromEmailAccountId === item.id ? '600' : '500',
										fontSize: 14
									}}>
										{item.username}
									</Text>
									<Text style={{ 
										color: fromEmailAccountId === item.id ? '#6366f1' : '#6b7280', 
										fontSize: 12,
										marginTop: 2
									}}>
										{item.provider}
									</Text>
								</TouchableOpacity>
							)} 
						/>
						{fromEmailAccountId && (
							<View style={{ marginTop:8, padding:8, backgroundColor:'#f0f4ff', borderRadius:6 }}>
								<Text style={{ color:'#6366f1', fontSize:12, fontWeight:'500' }}>
									Selected: {emailAccounts.find(a => a.id === fromEmailAccountId)?.username} ({emailAccounts.find(a => a.id === fromEmailAccountId)?.provider})
								</Text>
							</View>
						)}
					</>
				)}
			</View>

			<View style={{ backgroundColor: '#f0f9ff', padding: 16, borderRadius: 12, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: '#0ea5e9' }}>
				<Text style={{ color: '#0369a1', fontSize: 14, fontWeight: '600', marginBottom: 4 }}>
					Template Variables Available
				</Text>
				<Text style={{ color: '#0369a1', fontSize: 12, marginBottom: 2 }}>
					• {'{{contact.first_name}}'} - Contact's first name
				</Text>
				<Text style={{ color: '#0369a1', fontSize: 12, marginBottom: 2 }}>
					• {'{{contact.last_name}}'} - Contact's last name
				</Text>
				<Text style={{ color: '#0369a1', fontSize: 12, marginBottom: 2 }}>
					• {'{{contact.email}}'} - Contact's email address
				</Text>
				<Text style={{ color: '#0369a1', fontSize: 12 }}>
					• {'{{user.email}}'} - Your email address
				</Text>
			</View>
			
			<TouchableOpacity 
				onPress={saveEmailContent} 
				style={{ 
					backgroundColor:'#6366f1', 
					padding:18, 
					borderRadius:12,
					marginTop: 8
				}}
				disabled={loading}
			>
				<Text style={{ color:'#fff', textAlign:'center', fontWeight:'700', fontSize: 16 }}>
					Save Email Content
				</Text>
			</TouchableOpacity>
		</ScrollView>
	);
}