import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Modal, FlatList, TextInput } from 'react-native';
import { RouteProp, useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { CampaignsStackParamList } from '../navigation/CampaignsNavigator';
import { campaignsService } from '../services/campaignsService';
import { Campaign, CampaignContactRow } from '../types/campaigns';
import CampaignTargetingScreen from './CampaignTargetingScreen';
import ApiService from '../services/api';
import CustomPopup from '../components/CustomPopup';  // adjust path if needed


type TabKey = 'Overview' | 'Contacts' | 'Settings';

interface Persona {
	id: string;
	name: string;
	industry: string;
	role: string;
	description: string;
	company_size: string;
	location: string;
	created_at: string;
	updated_at: string;
}

export default function CampaignDetailsScreen() {
	const nav = useNavigation<any>();
	const route = useRoute<RouteProp<CampaignsStackParamList, 'CampaignDetails'>>();
	const id = route.params?.id as number;
	const [tab, setTab] = useState<TabKey>('Overview');
	const [campaign, setCampaign] = useState<Campaign | null>(null);
	const [loading, setLoading] = useState(false);
	const [validMsg, setValidMsg] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [resetting, setResetting] = useState(false);
	const [contacts, setContacts] = useState<CampaignContactRow[]>([]);
	const [contactsLoading, setContactsLoading] = useState(false);
	const [personas, setPersonas] = useState<Persona[]>([]);
	const [personasLoading, setPersonasLoading] = useState(false);
	const [suggestedPersonaId, setSuggestedPersonaId] = useState<string | null>(null);
	const [contactPersonas, setContactPersonas] = useState<{ [contactId: number]: any }>({});
	const [showPersonaDropdown, setShowPersonaDropdown] = useState<number | null>(null);
	const [generatingSequence, setGeneratingSequence] = useState<number | null>(null);
	const [emailSequences, setEmailSequences] = useState<{ [contactId: number]: any }>({});
	const [showSequenceModal, setShowSequenceModal] = useState(false);
	const [selectedSequence, setSelectedSequence] = useState<any>(null);
	const [showConfigModal, setShowConfigModal] = useState(false);
	const [configContactId, setConfigContactId] = useState<number | null>(null);
	const [numEmails, setNumEmails] = useState('4');
	const [scheduleDays, setScheduleDays] = useState(['1', '3', '7', '14']);
	const [editingSequence, setEditingSequence] = useState<any>(null);
	const [selectedSubjects, setSelectedSubjects] = useState<{ [emailIndex: number]: number }>({});
	const [savingEmails, setSavingEmails] = useState(false);
	const [currentContactId, setCurrentContactId] = useState<number | null>(null);
	const [savedSequences, setSavedSequences] = useState<{ [contactId: number]: any }>({});
	const [loadingSequences, setLoadingSequences] = useState(false);

	const [enrichingContact, setEnrichingContact] = useState<number | null>(null);
	const [enrichedData, setEnrichedData] = useState<{ [contactId: number]: any }>({});
	const [currentCardIndex, setCurrentCardIndex] = useState(0);
	const scrollViewRef = useRef<ScrollView>(null);

	const [popupVisible, setPopupVisible] = useState(false);
	const [popupTitle, setPopupTitle] = useState('');
	const [popupMessage, setPopupMessage] = useState('');


	const loadContacts = async () => {
		if (!id) return;
		setContactsLoading(true);
		try {
			const res = await campaignsService.listAttachedContacts(id, { search: '', page: 1, limit: 50 });
			setContacts(res.data);
			setCurrentCardIndex(0); // Reset to first card when contacts are loaded
			
			// Load personas from campaign_contacts table
			const personaMap: {[contactId: number]: any} = {};
			for (const contact of res.data) {
				const personaId = contact.persona_id;
				console.log(`Contact ${contact.contact_id} has persona_id:`, personaId);
				
				if (personaId) {
					try {
						const personaRes = await ApiService.getPersona(personaId);
						console.log(`✅ Loaded persona for contact ${contact.contact_id}:`, personaRes.name);
						personaMap[contact.contact_id] = personaRes;
					} catch (error) {
						console.warn(`Failed to load persona for contact ${contact.contact_id}:`, error);
					}
				} else {
					console.log(`Contact ${contact.contact_id} has no persona assigned`);
				}
			}
			console.log('📋 Final persona map:', Object.keys(personaMap).length, 'contacts with personas');
			setContactPersonas(personaMap);
			
			// Load existing enrichment data for all contacts
			const enrichmentMap: {[contactId: number]: any} = {};
			for (const contact of res.data) {
				try {
					const enrichmentRes = await ApiService.getEnrichedData(contact.contact_id);
					if (enrichmentRes && !enrichmentRes.error) {
						enrichmentMap[contact.contact_id] = enrichmentRes;
						console.log(`✅ Loaded enrichment data for contact ${contact.contact_id}`);
					}
				} catch (error) {
					// Contact not enriched yet, that's okay
					console.log(`Contact ${contact.contact_id} has no enrichment data`);
				}
			}
			setEnrichedData(enrichmentMap);
			
			// Load saved sequences for all contacts
			await loadSavedSequences(res.data);
		} catch (error) {
			console.error('Error loading contacts:', error);
		} finally {
			setContactsLoading(false);
		}
	};

	const loadSavedSequences = async (contactsList: CampaignContactRow[]) => {
		if (!id) return;
		setLoadingSequences(true);
		try {
			console.log('📧 Loading saved sequences for', contactsList.length, 'contacts');
			const sequencesMap: {[contactId: number]: any} = {};
			
			for (const contact of contactsList) {
				try {
					const result = await ApiService.getCampaignEmailSequence(id, contact.contact_id);
					if (result.success && result.data && result.data.emails && result.data.emails.length > 0) {
						sequencesMap[contact.contact_id] = {
							emails: result.data.emails,
							count: result.data.emails.length
						};
						console.log(`✅ Loaded ${result.data.emails.length} emails for contact ${contact.contact_id}`);
					}
				} catch (error) {
					// It's okay if a contact doesn't have a saved sequence yet
					console.log(`No saved sequence for contact ${contact.contact_id}`);
				}
			}
			
			console.log('📊 Loaded sequences for', Object.keys(sequencesMap).length, 'contacts');
			console.log('📋 Sequence details:', Object.entries(sequencesMap).map(([cId, seq]: any) => 
				`Contact ${cId}: ${seq.count} emails`
			).join(', '));
			setSavedSequences(sequencesMap);
		} catch (error) {
			console.error('Error loading saved sequences:', error);
		} finally {
			setLoadingSequences(false);
		}
	};

	const loadPersonas = async () => {
		setPersonasLoading(true);
		try {
			console.log('📋 Loading personas for matching...');
			const response = await ApiService.getPersonas({ page: 1, limit: 500 });
			setPersonas(response.personas || []);
			console.log(`✅ Loaded ${response.count} personas`);
		} catch (error) {
			console.error('❌ Error loading personas:', error);
			Alert.alert('Error', 'Failed to load personas. Please try again.');
		} finally {
			setPersonasLoading(false);
		}
	};

	// Enrich contact with AI-powered insights
	const handleEnrichContact = async (contactId: number, contactEmail: string) => {
		try {
			setEnrichingContact(contactId);
			console.log('🔍 Starting enrichment for contact:', contactId);

			// Call the API to enrich the contact
			const result = await ApiService.enrichContact(contactId);

			if (result.success && result.data) {
				// Store the enriched data
				setEnrichedData(prev => ({
					...prev,
					[contactId]: result.data
				}));

				// Format the backend response data for display
				const data = result.data;
				let displayMessage = `Contact: ${contactEmail}\n\n`;

				if (data.professional_context) {
					displayMessage += `📊 Professional Context:\n${data.professional_context}\n\n`;
				}
				if (data.recent_activity) {
					displayMessage += `🔥 Recent Activity:\n${data.recent_activity}\n\n`;
				}
				if (data.company_insights) {
					displayMessage += `🏢 Company Insights:\n${data.company_insights}\n\n`;
				}
				if (data.communication_style) {
					displayMessage += `💬 Communication Style:\n${data.communication_style}\n\n`;
				}
				if (data.personality_summary) {
					displayMessage += `👤 Personality:\n${data.personality_summary}\n\n`;
				}
				if (data.engagement_insights) {
					displayMessage += `💡 Engagement Tips:\n${data.engagement_insights}\n\n`;
				}

				// ✅ Show beautiful popup instead of alert
				setPopupTitle('✅ Enrichment Successful!');
				setPopupMessage(displayMessage.trim());
				setPopupVisible(true);

			} else {
				// Handle soft-failure responses
				const code = result?.error?.code;
				const message = result?.error?.message || 'Unable to enrich this contact right now.';
				let title = 'Notice';
				if (code === 'ALREADY_ENRICHED') title = 'Already Enriched';
				if (code === 'INSUFFICIENT_DATA') title = 'Missing Information';
				if (code === 'NO_API_KEY') title = 'Setup Required';
				if (code === 'CONTACT_NOT_FOUND') title = 'Contact Not Found';
				if (code === 'ENRICHMENT_FAILED') title = 'Enrichment Failed';

				// ✅ Popup instead of Alert
				setPopupTitle(title);
				setPopupMessage(message);
				setPopupVisible(true);
			}
		} catch (error: any) {
			console.error('Enrichment failed:', error);

			if (error?.response?.data?.error?.code === 'NO_API_KEY') {
				setPopupTitle('Setup Required');
				setPopupMessage('Please configure your LLM API key in Settings before enriching contacts.');
				setPopupVisible(true);
			} else {
				setPopupTitle('Error');
				setPopupMessage(error?.message || 'Failed to enrich contact. Please try again.');
				setPopupVisible(true);
			}
		} finally {
			setEnrichingContact(null);
		}
	};


// Auto-assign AI suggested persona (used by the main Match Persona button)
const handleMatchPersonas = async (contactId: number) => {
	// Check if persona is already assigned from database or local state
	if (contactPersonas[contactId]) {
		console.log('⚠️ Persona already exists for contact, skipping AI call');
		Alert.alert(
			'Persona Already Assigned', 
			`This contact is already matched with "${contactPersonas[contactId].name}". Use the Change button to select a different persona.`
		);
		return;
	}

	// Check if contact has persona_id in raw data
	const contact = contacts.find(c => c.contact_id === contactId);
	if (contact && contact.persona_id) {
		console.log('⚠️ Contact has persona_id in database, skipping AI call');
		Alert.alert(
			'Persona Already Assigned', 
			'This contact already has a persona. Use the Change button to select a different one.'
		);
		return;
	}

	console.log('✅ No existing persona found, proceeding with AI suggestion');

	if (personas.length === 0) {
		await loadPersonas();
	}

	let suggestedPersona = null as Persona | null;
	try {
		console.log('🤖 Requesting AI persona suggestion...');
		const suggest: any = await ApiService.suggestPersonaForContact(contactId);
		const bestName = suggest?.bestPersonaName || suggest?.data?.bestPersonaName;
		if (bestName && Array.isArray(personas)) {
			const match = personas.find(p => p.name?.toLowerCase() === String(bestName).toLowerCase());
			if (match) suggestedPersona = match;
		}
	} catch (e: any) {
		console.warn('AI suggestion unavailable or failed.', e?.message || e);
	}

	if (suggestedPersona) {
		// Auto-select the suggested persona
		setSuggestedPersonaId(suggestedPersona.id);
		await updateContactPersona(contactId, suggestedPersona.id);
		Alert.alert('Matched', `AI matched this contact with "${suggestedPersona.name}". You can change it anytime.`);
	} else {
		// Fallback: select first available persona if present
		const first = personas[0];
		if (first) {
			setSuggestedPersonaId(null);
			await updateContactPersona(contactId, first.id);
			Alert.alert('Matched', `No AI suggestion. Assigned default persona "${first.name}". Tap Change to pick another.`);
		} else {
			Alert.alert('No Personas', 'No personas available. Create personas first.');
		}
	}
};

	// Open dropdown for manual persona selection (used by Change button)
	const handleOpenPersonaDropdown = async (contactId: number) => {
		if (personas.length === 0) {
			await loadPersonas();
		}

		// No AI call - just show dropdown for manual selection
		setShowPersonaDropdown(contactId);
		setSuggestedPersonaId(null); // No AI suggestion when changing
	};


	useEffect(() => {
		if (!id) return;
		setLoading(true);
		campaignsService.getCampaign(id)
			.then(setCampaign)
			.finally(() => setLoading(false));
	}, [id]);

	// Refresh contacts when screen comes into focus (e.g., returning from ContactPicker)
	useFocusEffect(
		React.useCallback(() => {
			loadContacts();
			// Also load personas when screen comes into focus
			if (personas.length === 0) {
				loadPersonas();
			}
		}, [id])
	);

	const deleteCampaign = async () => {
		if (!id || !campaign) return;

		Alert.alert(
			'Delete Campaign',
			`Are you sure you want to delete "${campaign.name}"?\n\nThis will permanently delete:\n• All campaign data\n• All contact associations\n• All messages and events\n\nThis action cannot be undone.`,
			[
				{
					text: 'Cancel',
					style: 'cancel'
				},
				{
					text: 'Delete',
					style: 'destructive',
					onPress: async () => {
						try {
							setDeleting(true);
							await campaignsService.deleteCampaign(id);
							Alert.alert('Success', 'Campaign deleted successfully', [
								{
									text: 'OK',
									onPress: () => nav.goBack()
								}
							]);
						} catch (e: any) {
							Alert.alert('Error', e?.message || 'Failed to delete campaign');
						} finally {
							setDeleting(false);
						}
					}
				}
			]
		);
	};

	const resetToDraft = async () => {
		if (!id || !campaign) return;

		Alert.alert(
			'Reset to Draft',
			`Are you sure you want to reset "${campaign.name}" to draft status?\n\nThis will:\n• Change status from "${campaign.status}" to "draft"\n• Allow you to edit and relaunch the campaign\n• Preserve all campaign data and contacts`,
			[
				{
					text: 'Cancel',
					style: 'cancel'
				},
				{
					text: 'Reset to Draft',
					style: 'default',
					onPress: async () => {
						try {
							setResetting(true);
							const updatedCampaign = await campaignsService.resetCampaignToDraft(id);
							setCampaign(updatedCampaign);
							setValidMsg('Campaign reset to draft successfully!');
						} catch (e: any) {
							Alert.alert('Error', e?.message || 'Failed to reset campaign to draft');
						} finally {
							setResetting(false);
						}
					}
				}
			]
		);
	};

	const updateContactPersona = async (contactId: number, personaId: string) => {
		const persona = personas.find(p => p.id === personaId);
		if (persona && id) {
			// Update local state
			setContactPersonas(prev => ({
				...prev,
				[contactId]: persona
			}));
			
			// Save to database
			try {
				await ApiService.updateCampaignContactPersona(id, contactId, personaId);
				console.log('✅ Persona saved to database');
			} catch (error) {
				console.error('Failed to save persona to database:', error);
			}
		}
	};

	const handlePersonaDropdownSelect = (contactId: number, personaId: string) => {
		updateContactPersona(contactId, personaId);
		setShowPersonaDropdown(null);
	};

	const handleOpenSequenceConfig = async (contactId: number) => {
		if (!id) return;
		
		setCurrentContactId(contactId);
		
		// Check if emails already exist for this contact in this campaign
		try {
			const savedResult = await ApiService.getCampaignEmailSequence(id, contactId);
			
			if (savedResult.success && savedResult.data.emails && savedResult.data.emails.length > 0) {
				// Load existing emails
				console.log('📧 Found existing emails for this contact');
				const existingEmails = savedResult.data.emails;
				
				// Convert saved emails back to editable format
				const editableSequence = {
					email_sequence: existingEmails.map((email: any) => ({
						email_number: email.email_number,
						day: email.day,
						subject_lines: [email.subject], // Single subject since it was already selected
						preview_text: '',
						email_body: email.body,
						isEditing: false
					}))
				};
				
				// Auto-select first (only) subject for each email
				const initialSubjects: {[emailIndex: number]: number} = {};
				editableSequence.email_sequence.forEach((_: any, idx: number) => {
					initialSubjects[idx] = 0;
				});
				setSelectedSubjects(initialSubjects);
				
				setEditingSequence(editableSequence);
				setShowSequenceModal(true);
				return;
			}
		} catch (error) {
			console.log('No existing emails found, will generate new ones');
		}
		
		// No existing emails, show config to generate new ones
		setConfigContactId(contactId);
		setShowConfigModal(true);
	};

	const handleSaveEmailSequence = async () => {
		if (!id || !currentContactId || !editingSequence) {
			Alert.alert('Error', 'Missing campaign or contact information');
			return;
		}

		try {
			setSavingEmails(true);

			// Prepare emails for saving with selected subjects
			const emailsToSave = editingSequence.email_sequence.map((email: any, idx: number) => {
				const selectedSubjectIndex = selectedSubjects[idx] || 0;
				const selectedSubject = email.subject_lines?.[selectedSubjectIndex] || email.subject_lines?.[0] || '';
				
				return {
					email_number: email.email_number,
					day: email.day,
					subject: selectedSubject,
					body: email.email_body
				};
			});

			const result = await ApiService.saveCampaignEmailSequence(id, currentContactId, emailsToSave);

			if (result.success) {
				// Immediately update savedSequences state to show in UI
				setSavedSequences(prev => ({
					...prev,
					[currentContactId]: {
						emails: emailsToSave,
						count: emailsToSave.length
					}
				}));
				
				console.log(`✅ Updated savedSequences state for contact ${currentContactId}`);
				
				Alert.alert('Success', `Saved ${result.data.saved} emails to campaign!`, [
					{ text: 'OK', onPress: () => {
						setShowSequenceModal(false);
						// Also reload in background to ensure consistency
						loadContacts();
					}}
				]);
			} else {
				Alert.alert('Error', 'Failed to save emails');
			}
		} catch (error: any) {
			console.error('Failed to save email sequence:', error);
			Alert.alert('Error', error?.message || 'Failed to save emails. Please try again.');
		} finally {
			setSavingEmails(false);
		}
	};

	const handleNumEmailsChange = (value: string) => {
		const num = parseInt(value) || 0;
		setNumEmails(value);
		
		// Auto-adjust schedule days array to match number of emails
		if (num > 0) {
			const newDays = Array(num).fill('').map((_, idx) => {
				if (scheduleDays[idx]) return scheduleDays[idx];
				// Auto-generate default days: 1, 3, 7, 14, 21, 28, etc.
				const defaultDays = ['1', '3', '7', '14', '21', '28', '35', '42'];
				return defaultDays[idx] || String((idx + 1) * 7);
			});
			setScheduleDays(newDays);
		}
	};

	const handleDayChange = (index: number, value: string) => {
		const newDays = [...scheduleDays];
		newDays[index] = value;
		setScheduleDays(newDays);
	};

	const handleGenerateSequence = async () => {
		if (!configContactId) return;

		try {
			setGeneratingSequence(configContactId);
			setShowConfigModal(false);
			
			// Build schedule array
			const daysArray = scheduleDays.map(d => `Day ${d.trim()}`);
			
			const sequenceParams = {
				numberOfEmails: parseInt(numEmails) || 4,
				schedule: daysArray,
				primaryGoal: 'Book meeting'
			};

			const result = await ApiService.generateEmailSequence(configContactId, sequenceParams);

			if (result.success && result.data) {
				// Store the sequence and make it editable
				const editableSequence = {
					...result.data,
					email_sequence: result.data.email_sequence.map((email: any) => ({
						...email,
						isEditing: false
					}))
				};

				setEmailSequences(prev => ({
					...prev,
					[configContactId]: editableSequence
				}));

				// Auto-select first subject for each email
				const initialSubjects: { [emailIndex: number]: number } = {};
				editableSequence.email_sequence.forEach((_: any, idx: number) => {
					initialSubjects[idx] = 0; // Select first subject by default
				});
				setSelectedSubjects(initialSubjects);

				setEditingSequence(editableSequence);
				setShowSequenceModal(true);
			} else {
				Alert.alert('Error', result.error?.message || 'Failed to generate email sequence');
			}
		} catch (error: any) {
			console.error('Email sequence generation failed:', error);
			Alert.alert('Error', error?.message || 'Failed to generate email sequence. Please try again.');
		} finally {
			setGeneratingSequence(null);
			setConfigContactId(null);
		}
	};

	const updateEmailField = (emailIndex: number, field: string, value: string) => {
		if (!editingSequence) return;

		const updated = {
			...editingSequence,
			email_sequence: editingSequence.email_sequence.map((email: any, idx: number) =>
				idx === emailIndex ? { ...email, [field]: value } : email
			)
		};

		setEditingSequence(updated);
	};

	const updateSubjectLine = (emailIndex: number, subjectIndex: number, value: string) => {
		if (!editingSequence) return;

		const updated = {
			...editingSequence,
			email_sequence: editingSequence.email_sequence.map((email: any, idx: number) => {
				if (idx === emailIndex) {
					const newSubjects = [...(email.subject_lines || [])];
					newSubjects[subjectIndex] = value;
					return { ...email, subject_lines: newSubjects };
				}
				return email;
			})
		};

		setEditingSequence(updated);
	};

	const selectSubject = (emailIndex: number, subjectIndex: number) => {
		setSelectedSubjects(prev => ({
			...prev,
			[emailIndex]: subjectIndex
		}));
	};

	const toggleEditEmail = (emailIndex: number) => {
		if (!editingSequence) return;

		const updated = {
			...editingSequence,
			email_sequence: editingSequence.email_sequence.map((email: any, idx: number) =>
				idx === emailIndex ? { ...email, isEditing: !email.isEditing } : email
			)
		};

		setEditingSequence(updated);
	};

	return (
		<View style={{ flex: 1, backgroundColor: '#fff' }}>
			{loading ? <ActivityIndicator /> : null}
			{tab === 'Contacts' ? (
				<>
					{/* Tabs */}
					<View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee' }}>
						{(['Overview', 'Contacts', 'Settings'] as TabKey[]).map((k) => (
							<TouchableOpacity key={k} onPress={() => setTab(k)} style={{ padding: 12, borderBottomWidth: 2, borderBottomColor: tab === k ? '#6366f1' : 'transparent' }}>
								<Text style={{ color: tab === k ? '#6366f1' : '#444', fontWeight: '600' }}>{k}</Text>
							</TouchableOpacity>
						))}
					</View>
					{/* Contacts tab renders its own FlatList to avoid nesting inside ScrollView */}
					<CampaignTargetingScreen campaignId={id} />
				</>
			) : (
				<ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
			{campaign && (
						<View style={{ padding: 16 }}>
							<Text style={{ fontSize: 18, fontWeight: '700' }}>{campaign.name}</Text>
							<Text style={{ color: '#666', marginTop: 4 }}>{campaign.status.toUpperCase()}</Text>
					
					<View style={{ backgroundColor: '#f0f4ff', padding: 12, borderRadius: 8, marginTop: 12, borderLeftWidth: 4, borderLeftColor: '#6366f1' }}>
						<Text style={{ color: '#374151', fontSize: 14, fontWeight: '600', marginBottom: 4 }}>
							Campaign ID: {campaign.id}
						</Text>
					</View>

					{(campaign.email_subject || campaign.email_body) && (
						<View style={{ backgroundColor: '#f0f9ff', padding: 12, borderRadius: 8, marginTop: 12, borderLeftWidth: 4, borderLeftColor: '#0ea5e9' }}>
							<Text style={{ color: '#0369a1', fontSize: 14, fontWeight: '600', marginBottom: 4 }}>
								Email configured - sends immediately on launch
							</Text>
						</View>
					)}
				</View>
			)}

			{/* Review Contacts Section */}
			{campaign && (
				<View style={{ margin: 16, backgroundColor: '#f8fafc', borderRadius: 12, padding: 16 }}>
					{/* Header */}
					<View style={{ marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
						<Text style={{ fontSize: 18, fontWeight: '700', color: '#374151' }}>Review Contacts</Text>
						<TouchableOpacity 
							onPress={() => loadContacts()}
							disabled={contactsLoading || loadingSequences}
							style={{ 
								flexDirection: 'row', 
								alignItems: 'center', 
								gap: 6,
								backgroundColor: '#e0e7ff',
								paddingHorizontal: 10,
								paddingVertical: 6,
								borderRadius: 6
							}}
						>
							<Ionicons name="refresh-outline" size={14} color="#3b82f6" />
							<Text style={{ color: '#3b82f6', fontSize: 12, fontWeight: '600' }}>
								{loadingSequences ? 'Loading...' : 'Refresh'}
							</Text>
						</TouchableOpacity>
					</View>

					{/* Campaign Summary */}
					{loadingSequences ? (
						<View style={{ 
							backgroundColor: '#6366f1', 
							borderRadius: 8, 
							padding: 16, 
							marginBottom: 16,
							alignItems: 'center'
						}}>
							<ActivityIndicator size="small" color="#fff" />
							<Text style={{ color: '#e0e7ff', fontSize: 12, marginTop: 8 }}>Loading sequences...</Text>
						</View>
					) : (
						<View style={{ 
							backgroundColor: '#6366f1', 
							borderRadius: 8, 
							padding: 12, 
							marginBottom: 16,
							flexDirection: 'row',
							justifyContent: 'space-around'
						}}>
							<View style={{ alignItems: 'center' }}>
								<Text style={{ color: '#e0e7ff', fontSize: 11, marginBottom: 2 }}>Total Contacts</Text>
								<Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>{contacts.length}</Text>
							</View>
							<View style={{ alignItems: 'center' }}>
								<Text style={{ color: '#e0e7ff', fontSize: 11, marginBottom: 2 }}>With Sequences</Text>
								<Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>
									{Object.keys(savedSequences).length}
								</Text>
							</View>
							<View style={{ alignItems: 'center' }}>
								<Text style={{ color: '#e0e7ff', fontSize: 11, marginBottom: 2 }}>Total Emails</Text>
								<Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>
									{Object.values(savedSequences).reduce((sum: number, seq: any) => sum + (seq.emails?.length || seq.count || 0), 0)}
								</Text>
							</View>
						</View>
					)}

					{/* Contact cards */}
					{contactsLoading ? (
						<View style={{ alignItems: 'center', padding: 20 }}>
							<ActivityIndicator size="small" color="#6366f1" />
							<Text style={{ marginTop: 8, color: '#666' }}>Loading contacts...</Text>
						</View>
					) : contacts.length > 0 ? (
						<>
						<ScrollView 
							ref={scrollViewRef}
							horizontal 
							showsHorizontalScrollIndicator={false} 
							style={{ marginBottom: 12 }}
							onScroll={(event) => {
								const cardWidth = 336; // 320px width + 16px marginRight
								const scrollPosition = event.nativeEvent.contentOffset.x;
								const index = Math.round(scrollPosition / cardWidth);
								setCurrentCardIndex(index);
							}}
							scrollEventThrottle={16}
							pagingEnabled={false}
							snapToInterval={336}
							snapToAlignment="start"
							decelerationRate="fast"
						>
							{contacts.map((contact) => {
								const hasSequence = savedSequences[contact.contact_id];
								const sequenceCount = hasSequence?.emails?.length || 0;
								const isEnriched = !!enrichedData[contact.contact_id];
								const hasPersona = contactPersonas[contact.contact_id];
								
								// Determine step statuses
								const step1Status = isEnriched ? 'completed' : (enrichingContact === contact.contact_id ? 'in-progress' : 'pending');
								const step2Status = hasPersona ? 'completed' : 'pending';
								const step3Status = hasSequence ? 'completed' : (generatingSequence === contact.contact_id ? 'in-progress' : 'pending');
								
								return (
								<View key={contact.contact_id} style={{ 
									backgroundColor: '#fff', 
									borderRadius: 12, 
									padding: 16, 
									marginRight: 16, 
									width: 320,
									borderWidth: 2,
									borderColor: hasSequence ? '#22c55e' : '#e5e7eb',
									shadowColor: '#000',
									shadowOffset: { width: 0, height: 2 },
									shadowOpacity: 0.1,
									shadowRadius: 4,
									elevation: 3
								}}>
									{/* Header with Badge */}
									<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
										{/* Contact Info */}
										<View style={{ flex: 1, paddingRight: hasSequence ? 90 : 0 }}>
											<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
												<View style={{ 
													width: 48, 
													height: 48, 
													borderRadius: 24, 
													backgroundColor: '#3b82f6', 
													justifyContent: 'center', 
													alignItems: 'center',
													marginRight: 12
												}}>
													<Text style={{ color: '#fff', fontSize: 20, fontWeight: '600' }}>
														{contact.first_name?.[0] || contact.last_name?.[0] || contact.email[0].toUpperCase()}
													</Text>
												</View>
												<View style={{ flex: 1, minWidth: 0 }}>
													<Text 
														style={{ fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 }}
														numberOfLines={1}
														ellipsizeMode="tail"
													>
														{contact.first_name && contact.last_name 
															? `${contact.first_name} ${contact.last_name}` 
															: contact.first_name || contact.last_name || 'Unknown Contact'
														}
													</Text>
													<Text 
														style={{ fontSize: 13, color: '#6b7280' }}
														numberOfLines={1}
														ellipsizeMode="tail"
													>
														{contact.email}
													</Text>
												</View>
											</View>
										</View>
										
										{/* Success Badge */}
										{hasSequence && (
											<View style={{ 
												position: 'absolute', 
												top: 0, 
												right: 0, 
												backgroundColor: '#22c55e', 
												paddingHorizontal: 10, 
												paddingVertical: 6, 
												borderRadius: 16,
												flexDirection: 'row',
												alignItems: 'center',
												gap: 5,
												zIndex: 10
											}}>
												<Ionicons name="checkmark-circle" size={14} color="#fff" />
												<Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
													{sequenceCount} EMAIL{sequenceCount > 1 ? 'S' : ''}
												</Text>
											</View>
										)}
									</View>

									{/* 3-Step Workflow */}
									<View style={{ marginBottom: 16 }}>
										<Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
											Setup Steps
										</Text>
										
										{/* Step 1: Enrich Contact */}
										<View style={{ marginBottom: 12 }}>
											<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
												<View style={{
													width: 24,
													height: 24,
													borderRadius: 12,
													backgroundColor: step1Status === 'completed' ? '#22c55e' : step1Status === 'in-progress' ? '#3b82f6' : '#e5e7eb',
													justifyContent: 'center',
													alignItems: 'center',
													marginRight: 10
												}}>
													{step1Status === 'completed' ? (
														<Ionicons name="checkmark" size={14} color="#fff" />
													) : step1Status === 'in-progress' ? (
														<ActivityIndicator size="small" color="#fff" />
													) : (
														<Text style={{ color: '#9ca3af', fontSize: 12, fontWeight: '700' }}>1</Text>
													)}
												</View>
												<Text style={{ 
													fontSize: 14, 
													fontWeight: '600', 
													color: step1Status === 'completed' ? '#166534' : step1Status === 'in-progress' ? '#1e40af' : '#6b7280',
													flex: 1
												}}>
													Enrich Contact
												</Text>
											</View>
											{step1Status !== 'completed' && (
												<TouchableOpacity 
													style={{ 
														backgroundColor: step1Status === 'in-progress' ? '#e0e7ff' : '#f3f4f6',
														paddingVertical: 10,
														paddingHorizontal: 12,
														borderRadius: 8,
														marginLeft: 34,
														flexDirection: 'row',
														alignItems: 'center',
														justifyContent: 'center',
														opacity: step1Status === 'in-progress' ? 0.7 : 1
													}}
													onPress={() => handleEnrichContact(contact.contact_id, contact.email)}
													disabled={step1Status === 'in-progress'}
												>
													{step1Status === 'in-progress' ? (
														<>
															<ActivityIndicator size="small" color="#3b82f6" style={{ marginRight: 6 }} />
															<Text style={{ color: '#3b82f6', fontSize: 13, fontWeight: '600' }}>Enriching...</Text>
														</>
													) : (
														<>
															<Ionicons name="search-outline" size={16} color="#3b82f6" style={{ marginRight: 6 }} />
															<Text style={{ color: '#3b82f6', fontSize: 13, fontWeight: '600' }}>Start Enrichment</Text>
														</>
													)}
												</TouchableOpacity>
											)}
										</View>

										{/* Step 2: Match Persona */}
										<View style={{ marginBottom: 12 }}>
											<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
												<View style={{
													width: 24,
													height: 24,
													borderRadius: 12,
													backgroundColor: step2Status === 'completed' ? '#22c55e' : '#e5e7eb',
													justifyContent: 'center',
													alignItems: 'center',
													marginRight: 10
												}}>
													{step2Status === 'completed' ? (
														<Ionicons name="checkmark" size={14} color="#fff" />
													) : (
														<Text style={{ color: '#9ca3af', fontSize: 12, fontWeight: '700' }}>2</Text>
													)}
												</View>
												<Text style={{ 
													fontSize: 14, 
													fontWeight: '600', 
													color: step2Status === 'completed' ? '#166534' : '#6b7280',
													flex: 1
												}}>
													Match Persona
												</Text>
											</View>
											{step2Status === 'completed' ? (
												<View style={{ 
													marginLeft: 34, 
													padding: 10, 
													backgroundColor: '#f0f9ff', 
													borderRadius: 8,
													borderLeftWidth: 3,
													borderLeftColor: '#3b82f6'
												}}>
													<Text style={{ fontSize: 13, fontWeight: '700', color: '#1e40af', marginBottom: 2 }}>
														{contactPersonas[contact.contact_id]?.name}
													</Text>
													{contactPersonas[contact.contact_id]?.role && (
														<Text style={{ fontSize: 12, color: '#3b82f6' }}>
															{contactPersonas[contact.contact_id].role}
														</Text>
													)}
													<TouchableOpacity
														onPress={() => { setShowPersonaDropdown(contact.contact_id); setSuggestedPersonaId(null); }}
														style={{ marginTop: 8, alignSelf: 'flex-start' }}
													>
														<Text style={{ fontSize: 12, color: '#3b82f6', fontWeight: '600' }}>Change Persona →</Text>
													</TouchableOpacity>
												</View>
											) : (
												<TouchableOpacity 
													style={{ 
														backgroundColor: step1Status === 'completed' ? '#3b82f6' : '#e5e7eb',
														paddingVertical: 10,
														paddingHorizontal: 12,
														borderRadius: 8,
														marginLeft: 34,
														flexDirection: 'row',
														alignItems: 'center',
														justifyContent: 'center',
														opacity: step1Status === 'completed' ? 1 : 0.5
													}}
													onPress={() => handleMatchPersonas(contact.contact_id)}
													disabled={step1Status !== 'completed'}
												>
													<Ionicons name="person-outline" size={16} color={step1Status === 'completed' ? '#fff' : '#9ca3af'} style={{ marginRight: 6 }} />
													<Text style={{ color: step1Status === 'completed' ? '#fff' : '#9ca3af', fontSize: 13, fontWeight: '600' }}>
														Match Persona
													</Text>
												</TouchableOpacity>
											)}
										</View>

										{/* Step 3: Generate Email Sequence */}
										<View>
											<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
												<View style={{
													width: 24,
													height: 24,
													borderRadius: 12,
													backgroundColor: step3Status === 'completed' ? '#22c55e' : step3Status === 'in-progress' ? '#3b82f6' : '#e5e7eb',
													justifyContent: 'center',
													alignItems: 'center',
													marginRight: 10
												}}>
													{step3Status === 'completed' ? (
														<Ionicons name="checkmark" size={14} color="#fff" />
													) : step3Status === 'in-progress' ? (
														<ActivityIndicator size="small" color="#fff" />
													) : (
														<Text style={{ color: '#9ca3af', fontSize: 12, fontWeight: '700' }}>3</Text>
													)}
												</View>
												<Text style={{ 
													fontSize: 14, 
													fontWeight: '600', 
													color: step3Status === 'completed' ? '#166534' : step3Status === 'in-progress' ? '#1e40af' : '#6b7280',
													flex: 1
												}}>
													Generate Emails
												</Text>
											</View>
											{step3Status === 'completed' ? (
												<View style={{ 
													marginLeft: 34, 
													padding: 12, 
													backgroundColor: '#f0fdf4', 
													borderRadius: 8,
													borderLeftWidth: 3,
													borderLeftColor: '#22c55e'
												}}>
													<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
														<Ionicons name="mail-outline" size={14} color="#166534" />
														<Text style={{ color: '#166534', fontSize: 13, fontWeight: '700', marginLeft: 6 }}>
															{sequenceCount} email{sequenceCount > 1 ? 's' : ''} scheduled
														</Text>
													</View>
													<Text style={{ color: '#166534', fontSize: 12, marginBottom: 10 }}>
														Days: {hasSequence.emails.map((e: any) => e.day).join(', ')}
													</Text>
													<View style={{ flexDirection: 'row', gap: 8 }}>
														<TouchableOpacity 
															style={{ 
																flex: 1, 
																backgroundColor: '#22c55e', 
																paddingVertical: 8, 
																paddingHorizontal: 12, 
																borderRadius: 6,
																flexDirection: 'row',
																alignItems: 'center',
																justifyContent: 'center',
																gap: 4
															}}
															onPress={() => handleOpenSequenceConfig(contact.contact_id)}
														>
															<Ionicons name="eye-outline" size={14} color="#fff" />
															<Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
																View
															</Text>
														</TouchableOpacity>
														<TouchableOpacity 
															style={{ 
																flex: 1, 
																backgroundColor: '#3b82f6', 
																paddingVertical: 8, 
																paddingHorizontal: 12, 
																borderRadius: 6,
																flexDirection: 'row',
																alignItems: 'center',
																justifyContent: 'center',
																gap: 4
															}}
															onPress={() => handleOpenSequenceConfig(contact.contact_id)}
														>
															<Ionicons name="pencil-outline" size={14} color="#fff" />
															<Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
																Edit
															</Text>
														</TouchableOpacity>
													</View>
												</View>
											) : (
												<TouchableOpacity 
													style={{ 
														backgroundColor: step3Status === 'in-progress' ? '#e0e7ff' : (step2Status === 'completed' ? '#3b82f6' : '#e5e7eb'),
														paddingVertical: 10,
														paddingHorizontal: 12,
														borderRadius: 8,
														marginLeft: 34,
														flexDirection: 'row',
														alignItems: 'center',
														justifyContent: 'center',
														opacity: step3Status === 'in-progress' ? 0.7 : (step2Status === 'completed' ? 1 : 0.5)
													}}
													onPress={() => handleOpenSequenceConfig(contact.contact_id)}
													disabled={step3Status === 'in-progress' || step2Status !== 'completed'}
												>
													{step3Status === 'in-progress' ? (
														<>
															<ActivityIndicator size="small" color="#3b82f6" style={{ marginRight: 6 }} />
															<Text style={{ color: '#3b82f6', fontSize: 13, fontWeight: '600' }}>Generating...</Text>
														</>
													) : (
														<>
															<Ionicons name="flash-outline" size={16} color={step2Status === 'completed' ? '#fff' : '#9ca3af'} style={{ marginRight: 6 }} />
															<Text style={{ color: step2Status === 'completed' ? '#fff' : '#9ca3af', fontSize: 13, fontWeight: '600' }}>
																Generate Sequence
															</Text>
														</>
													)}
												</TouchableOpacity>
											)}
										</View>
									</View>

									{/* Persona Dropdown: visible only when explicitly opened via Change */}
									{showPersonaDropdown === contact.contact_id && (
										<View style={{ 
											marginTop: 12, 
											backgroundColor: '#f8fafc', 
											borderWidth: 1, 
											borderColor: '#e2e8f0', 
											borderRadius: 8, 
											padding: 12 
										}}>
											<Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, fontWeight: '600' }}>
												{suggestedPersonaId ? 'AI Suggested:' : 'Select Persona:'}
											</Text>
											<ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
												{personas.map((persona) => {
													const isSuggested = persona.id === suggestedPersonaId;
													const isSelected = persona.id === contactPersonas[contact.contact_id]?.id;
													return (
														<TouchableOpacity
															key={persona.id}
															style={{
																padding: 12,
																borderRadius: 6,
																marginBottom: 4,
																backgroundColor: isSelected ? '#dbeafe' : isSuggested ? '#fef3c7' : '#fff',
																borderWidth: isSelected ? 2 : isSuggested ? 1 : 0,
																borderColor: isSelected ? '#3b82f6' : isSuggested ? '#f59e0b' : 'transparent'
															}}
															onPress={() => handlePersonaDropdownSelect(contact.contact_id, persona.id)}
														>
															<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
																<View style={{ flex: 1 }}>
																	<Text style={{
																		fontSize: 14,
																		fontWeight: '600',
																		color: isSelected ? '#1e40af' : '#111827'
																	}}>
																		{persona.name}
																	</Text>
																	{persona.role && (
																		<Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
																			{persona.role}
																		</Text>
																	)}
																</View>
																<View style={{ flexDirection: 'row', alignItems: 'center' }}>
																	{isSuggested && (
																		<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 8 }}>
																			<Ionicons name="star" size={12} color="#f59e0b" />
																			<Text style={{ fontSize: 10, color: '#f59e0b', fontWeight: '600' }}>
																				AI
																			</Text>
																		</View>
																	)}
																	{isSelected && (
																		<Ionicons name="checkmark" size={16} color="#3b82f6" />
																	)}
																</View>
															</View>
														</TouchableOpacity>
													);
												})}
											</ScrollView>
											<TouchableOpacity
												style={{ marginTop: 8, padding: 10, backgroundColor: '#6b7280', borderRadius: 6 }}
												onPress={() => setShowPersonaDropdown(null)}
											>
												<Text style={{ color: '#fff', textAlign: 'center', fontSize: 13, fontWeight: '600' }}>
													Cancel
												</Text>
											</TouchableOpacity>
										</View>
									)}
								</View>
							);
							})}
						</ScrollView>
						
						{/* Pagination Indicator */}
						{contacts.length > 1 && (
							<View style={{ 
								flexDirection: 'row', 
								justifyContent: 'center', 
								alignItems: 'center',
								marginTop: 8,
								marginBottom: 8,
								gap: 6
							}}>
								{contacts.map((_, index) => (
									<View
										key={index}
										style={{
											width: currentCardIndex === index ? 24 : 8,
											height: 8,
											borderRadius: 4,
											backgroundColor: currentCardIndex === index ? '#3b82f6' : '#d1d5db'
										}}
									/>
								))}
							</View>
						)}
						</>
					) : (
						<View style={{ 
							backgroundColor: '#f9fafb', 
							padding: 20, 
							borderRadius: 8, 
							borderWidth: 1, 
							borderColor: '#e5e7eb',
							borderStyle: 'dashed',
							alignItems: 'center'
						}}>
							<Text style={{ color: '#6b7280', fontSize: 14, marginBottom: 8 }}>No contacts added yet</Text>
							<TouchableOpacity 
								style={{ backgroundColor: '#6366f1', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 }}
								onPress={() => nav.navigate('ContactPicker', { campaignId: id })}
							>
								<Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Add Contacts</Text>
							</TouchableOpacity>
						</View>
					)}
					
					{/* Readiness Status */}
					{contacts.length > 0 && (
						<View style={{ 
							backgroundColor: Object.keys(savedSequences).length === contacts.length ? '#f0fdf4' : '#fef3c7',
							padding: 12,
							borderRadius: 8,
							marginTop: 12,
							borderLeftWidth: 4,
							borderLeftColor: Object.keys(savedSequences).length === contacts.length ? '#22c55e' : '#f59e0b'
						}}>
							{Object.keys(savedSequences).length === contacts.length ? (
								<>
									<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
										<Ionicons name="checkmark-circle" size={18} color="#166534" />
										<Text style={{ color: '#166534', fontSize: 14, fontWeight: '700' }}>
											All Contacts Ready
										</Text>
									</View>
									<Text style={{ color: '#166534', fontSize: 12 }}>
										All {contacts.length} contacts have sequences configured. Ready to validate and launch!
									</Text>
								</>
							) : (
								<>
									<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
										<Ionicons name="alert-circle-outline" size={18} color="#92400e" />
										<Text style={{ color: '#92400e', fontSize: 14, fontWeight: '700' }}>
											{contacts.length - Object.keys(savedSequences).length} Contact{contacts.length - Object.keys(savedSequences).length > 1 ? 's' : ''} Need Sequences
										</Text>
									</View>
									<Text style={{ color: '#92400e', fontSize: 12 }}>
										Generate and save sequences for remaining contacts, or they'll use the campaign template (if configured).
									</Text>
								</>
							)}
						</View>
					)}
				</View>
			)}

					<View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee' }}>
						{(['Overview', 'Contacts', 'Settings'] as TabKey[]).map((k) => (
							<TouchableOpacity key={k} onPress={() => setTab(k)} style={{ padding: 12, borderBottomWidth: 2, borderBottomColor: tab === k ? '#6366f1' : 'transparent' }}>
								<Text style={{ color: tab === k ? '#6366f1' : '#444', fontWeight: '600' }}>{k}</Text>
					</TouchableOpacity>
				))}
			</View>
		{tab === 'Overview' && (
					<View style={{ padding: 16 }}>
						{/* How It Works */}
						<View style={{ backgroundColor:'#f0f9ff', padding:16, borderRadius:12, marginBottom:16, borderLeftWidth:4, borderLeftColor:'#3b82f6' }}>
							<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
								<Ionicons name="book-outline" size={18} color="#1e40af" />
								<Text style={{ color:'#1e40af', fontWeight:'700', fontSize:16 }}>
									How Email Sequences Work
								</Text>
							</View>
							<Text style={{ color:'#1e40af', fontSize:13, marginBottom:6 }}>
								1. Go to "Review Contacts" tab above
							</Text>
							<Text style={{ color:'#1e40af', fontSize:13, marginBottom:6 }}>
								2. For each contact: Match Persona → Generate Sequence
							</Text>
							<Text style={{ color:'#1e40af', fontSize:13, marginBottom:6 }}>
								3. Set day gaps and save sequences
							</Text>
							<Text style={{ color:'#1e40af', fontSize:13, marginBottom:6 }}>
								4. Return here to validate and launch
							</Text>
							<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
								<Ionicons name="bulb-outline" size={14} color="#0369a1" />
								<Text style={{ color:'#0369a1', fontSize:12, fontStyle:'italic', flex: 1 }}>
									Each contact gets personalized emails based on their matched persona!
								</Text>
							</View>
						</View>

						{/* Campaign Readiness Check */}
						{campaign && contacts.length > 0 && (
							<View style={{ 
								backgroundColor: Object.keys(savedSequences).length === contacts.length ? '#f0fdf4' : '#fef3c7',
								padding:12, 
								borderRadius:8, 
								marginBottom:12, 
								borderLeftWidth:4, 
								borderLeftColor: Object.keys(savedSequences).length === contacts.length ? '#22c55e' : '#f59e0b'
							}}>
								<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
									<Ionicons 
										name={Object.keys(savedSequences).length === contacts.length ? "checkmark-circle" : "alert-circle-outline"} 
										size={18} 
										color={Object.keys(savedSequences).length === contacts.length ? '#166534' : '#92400e'} 
									/>
									<Text style={{ 
										color: Object.keys(savedSequences).length === contacts.length ? '#166534' : '#92400e', 
										fontWeight:'600', 
										fontSize:15
									}}>
										{Object.keys(savedSequences).length === contacts.length ? 'All Sequences Ready' : 'Setup Required'}
									</Text>
								</View>
								<Text style={{ 
									color: Object.keys(savedSequences).length === contacts.length ? '#166534' : '#92400e', 
									fontSize:13 
								}}>
									{Object.keys(savedSequences).length === contacts.length 
										? `All ${contacts.length} contacts have sequences configured. Total ${Object.values(savedSequences).reduce((sum: number, seq: any) => sum + (seq.emails?.length || 0), 0)} emails will be sent.`
										: `${contacts.length - Object.keys(savedSequences).length} contact${contacts.length - Object.keys(savedSequences).length > 1 ? 's' : ''} still need sequences. Go to "Review Contacts" tab to generate them.`
									}
								</Text>
							</View>
						)}

						{/* Paused Status Indicator */}
						{campaign && campaign.status === 'paused' && (
							<View style={{ backgroundColor: '#fef3c7', padding: 12, borderRadius: 8, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#f59e0b' }}>
								<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
									<Ionicons name="pause-circle" size={18} color="#92400e" />
									<Text style={{ color: '#92400e', fontWeight: '600', fontSize: 14 }}>Campaign Paused</Text>
								</View>
								<Text style={{ color: '#92400e', fontSize: 13 }}>
									Scheduled emails are on hold. Click "Resume" below to continue sending.
								</Text>
							</View>
						)}

						{/* Reset to Draft info for non-draft campaigns */}
						{campaign && campaign.status !== 'draft' && campaign.status !== 'paused' && (
							<View style={{ backgroundColor: '#f0f9ff', padding: 12, borderRadius: 8, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#3b82f6' }}>
								<Text style={{ color: '#1e40af', fontWeight: '600', marginBottom: 4 }}>Reset to Draft Available</Text>
								<Text style={{ color: '#1e40af', fontSize: 13 }}>
									This campaign is in "{campaign.status}" status. You can reset it to draft to make changes and relaunch it.
								</Text>
							</View>
						)}

						<Text style={{ marginBottom: 8, fontSize: 14, fontWeight: '600', color: '#374151' }}>Campaign Actions:</Text>
						<View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
							{/* Validate - always available */}
							<TouchableOpacity onPress={async () => {
								try {
									const v = await campaignsService.validateCampaign(id);
									if (v.valid) {
										setValidMsg('Ready to launch! All requirements met.');
										Alert.alert('Validation Successful', 'All requirements are met. You can now launch the campaign.');
									} else {
										const reasons = (v.reasons || []).map(r => {
											if (r === 'NO_FROM_ACCOUNT') return 'Email account not selected';
											if (r === 'EMAIL_ACCOUNT_NOT_FOUND') return 'Email account not found';
											if (r === 'EMAIL_ACCOUNT_INACTIVE') return 'Email account is inactive';
											if (r === 'INVALID_EMAIL_CREDENTIALS') return 'Email credentials are invalid';
											if (r === 'NO_CONTACTS') return 'No contacts added';
											if (r === 'MISSING_EMAIL_CONTENT') return 'Contacts need sequences';
											if (r === 'NOT_FOUND') return 'Campaign not found';
											return r;
										});
										setValidMsg(`Validation failed: ${reasons.join(', ')}`);
										
										// Show detailed alert for credential errors
										if (v.reasons?.includes('INVALID_EMAIL_CREDENTIALS')) {
											Alert.alert(
												'Email Credentials Invalid',
												'Your email account credentials are not working. Please update your email account settings before launching the campaign.\n\nCommon issues:\n• Password changed\n• 2FA settings changed\n• Account locked or suspended\n• SMTP server settings incorrect',
												[
													{ text: 'OK', style: 'default' },
													{ text: 'Update Email Account', style: 'default', onPress: () => {
														// Navigate to email accounts screen if needed
														nav.navigate('EmailAccounts');
													}}
												]
											);
										} else if (v.reasons?.includes('EMAIL_ACCOUNT_INACTIVE')) {
											Alert.alert(
												'Email Account Inactive',
												'Please activate your email account in the Email Accounts screen before launching the campaign.',
												[
													{ text: 'OK', style: 'default' },
													{ text: 'Go to Email Accounts', style: 'default', onPress: () => {
														nav.navigate('EmailAccounts');
													}}
												]
											);
										} else {
											Alert.alert('Validation Failed', `Please fix the following issues:\n\n${reasons.join('\n')}`);
										}
									}
								} catch (e: any) {
									setValidMsg(`Validation error: ${e?.message}`);
									Alert.alert('Validation Error', e?.message || 'Failed to validate campaign');
								}
							}} style={{ backgroundColor: '#3b82f6', padding: 12, borderRadius: 8, minWidth: 110, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
								<Ionicons name="checkmark-done-outline" size={16} color="#fff" />
								<Text style={{ color: '#fff', fontWeight: '600' }}>Validate</Text>
							</TouchableOpacity>
							
							{/* Only show Launch if campaign is draft or ready */}
							{campaign && ['draft', 'ready'].includes(campaign.status) && (
								<TouchableOpacity onPress={async () => {
								try { 
									// Validate first
									const v = await campaignsService.validateCampaign(id);
									if (!v.valid) {
										// Check for credential errors specifically
										if (v.reasons?.includes('INVALID_EMAIL_CREDENTIALS')) {
											Alert.alert(
												'Email Credentials Invalid',
												'Your email account credentials are not working. Please update your email account settings before launching the campaign.\n\nCommon issues:\n• Password changed\n• 2FA settings changed\n• Account locked or suspended\n• SMTP server settings incorrect',
												[
													{ text: 'OK', style: 'default' },
													{ text: 'Update Email Account', style: 'default', onPress: () => {
														nav.navigate('EmailAccounts');
													}}
												]
											);
										} else if (v.reasons?.includes('EMAIL_ACCOUNT_INACTIVE')) {
											Alert.alert(
												'Email Account Inactive',
												'Please activate your email account in the Email Accounts screen before launching the campaign.',
												[
													{ text: 'OK', style: 'default' },
													{ text: 'Go to Email Accounts', style: 'default', onPress: () => {
														nav.navigate('EmailAccounts');
													}}
												]
											);
										} else {
											Alert.alert('Cannot Launch', 'Please fix validation errors first. Check "Review Contacts" tab to ensure sequences are saved.');
										}
										return;
									}
									
									const up = await campaignsService.launchCampaign(id); 
									setCampaign({ ...(campaign as any), status: up.status }); 
									setValidMsg('🚀 Launched! Check worker logs for sending progress.');
									Alert.alert('Campaign Launched!', `Your sequences are now being sent!\n\n• First emails: Immediately\n• Follow-ups: Based on day gaps\n• Total emails: ${Object.values(savedSequences).reduce((sum: number, seq: any) => sum + (seq.emails?.length || 0), 0)}`, [
										{ text: 'OK' }
									]);
								} catch (e: any) { 
									setValidMsg(`❌ Launch failed: ${e?.message}`);
									
									// Check if error is related to credentials
									const errorMessage = e?.message || '';
									if (errorMessage.includes('INVALID_EMAIL_CREDENTIALS') || errorMessage.includes('credential')) {
										Alert.alert(
											'Email Credentials Invalid',
											'Your email account credentials are not working. Please update your email account settings before launching the campaign.\n\nCommon issues:\n• Password changed\n• 2FA settings changed\n• Account locked or suspended\n• SMTP server settings incorrect',
											[
												{ text: 'OK', style: 'default' },
												{ text: 'Update Email Account', style: 'default', onPress: () => {
													nav.navigate('EmailAccounts');
												}}
											]
										);
									} else {
										Alert.alert('Launch Failed', errorMessage || 'Failed to launch campaign');
									}
								}
								}} style={{ backgroundColor: '#22c55e', padding: 12, borderRadius: 8, minWidth: 110, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
									<Ionicons name="rocket-outline" size={16} color="#fff" />
									<Text style={{ color: '#fff', fontWeight: '600' }}>Launch</Text>
								</TouchableOpacity>
							)}
							
							{/* Only show Pause if campaign is running */}
							{campaign?.status === 'running' && (
								<TouchableOpacity 
									onPress={async () => { 
										try {
											const up = await campaignsService.pauseCampaign(id); 
											setCampaign({ ...(campaign as any), status: up.status });
											Alert.alert('Campaign Paused', 'Scheduled emails will be delayed. You can resume anytime.');
										} catch (e: any) {
											Alert.alert('Error', e?.message || 'Failed to pause campaign');
										}
									}} 
									style={{ backgroundColor: '#f59e0b', padding: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
								>
									<Ionicons name="pause" size={16} color="#fff" />
									<Text style={{ color: '#fff', fontWeight: '600' }}>Pause</Text>
								</TouchableOpacity>
							)}
							
							{/* Only show Resume if campaign is paused */}
							{campaign?.status === 'paused' && (
								<TouchableOpacity 
									onPress={async () => { 
										try {
											const up = await campaignsService.resumeCampaign(id); 
											setCampaign({ ...(campaign as any), status: up.status });
											Alert.alert('Campaign Resumed', 'Scheduled emails will continue sending.');
										} catch (e: any) {
											Alert.alert('Error', e?.message || 'Failed to resume campaign');
										}
									}} 
									style={{ backgroundColor: '#3b82f6', padding: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
								>
									<Ionicons name="play" size={16} color="#fff" />
									<Text style={{ color: '#fff', fontWeight: '600' }}>Resume</Text>
								</TouchableOpacity>
							)}
							
							<TouchableOpacity 
								onPress={async () => { 
									try {
										Alert.alert(
											'Cancel Campaign?',
											'This will stop all scheduled emails. This action cannot be undone.',
											[
												{ text: 'No', style: 'cancel' },
												{ 
													text: 'Yes, Cancel',
													style: 'destructive',
													onPress: async () => {
														const up = await campaignsService.cancelCampaign(id); 
														setCampaign({ ...(campaign as any), status: up.status });
														Alert.alert('Campaign Cancelled', 'All scheduled emails have been cancelled.');
													}
												}
											]
										);
									} catch (e: any) {
										Alert.alert('Error', e?.message || 'Failed to cancel campaign');
									}
								}} 
								style={{ backgroundColor: '#ef4444', padding: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
							>
								<Ionicons name="close-circle-outline" size={16} color="#fff" />
								<Text style={{ color: '#fff', fontWeight: '600' }}>Cancel</Text>
							</TouchableOpacity>
						{/* Reset to Draft button - only show for non-draft campaigns */}
						{campaign && campaign.status !== 'draft' && (
							<TouchableOpacity 
								onPress={resetToDraft}
								disabled={resetting}
								style={{ 
									backgroundColor: resetting ? '#a78bfa' : '#8b5cf6', 
											padding: 10,
											borderRadius: 8,
									opacity: resetting ? 0.7 : 1
								}}
							>
								{resetting ? (
									<View style={{ flexDirection: 'row', alignItems: 'center' }}>
										<ActivityIndicator size="small" color="#fff" style={{ marginRight: 4 }} />
												<Text style={{ color: '#fff', fontSize: 12 }}>Resetting...</Text>
									</View>
								) : (
											<Text style={{ color: '#fff' }}>Reset to Draft</Text>
								)}
							</TouchableOpacity>
						)}
					</View>
							{validMsg && <Text style={{ marginTop: 8, color: '#334155' }}>{validMsg}</Text>}
				</View>
			)}
			{tab === 'Settings' && (
						<View style={{ padding: 16 }}>
					<Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 16 }}>Campaign Settings</Text>
					
					<View style={{ backgroundColor: '#fef2f2', padding: 16, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#ef4444' }}>
						<Text style={{ color: '#dc2626', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
							Danger Zone
						</Text>
						<Text style={{ color: '#7f1d1d', fontSize: 12, marginBottom: 12 }}>
							Deleting a campaign will permanently remove all associated data including contacts, messages, and events.
						</Text>
						
						<TouchableOpacity 
							onPress={deleteCampaign}
							disabled={deleting}
							style={{ 
								backgroundColor: deleting ? '#fca5a5' : '#ef4444', 
								padding: 12, 
								borderRadius: 6,
								opacity: deleting ? 0.7 : 1
							}}
						>
							{deleting ? (
								<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
									<ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
									<Text style={{ color: '#fff', fontWeight: '600' }}>Deleting...</Text>
								</View>
							) : (
								<Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>
									Delete Campaign
								</Text>
							)}
						</TouchableOpacity>
					</View>
				</View>
			)}
			</ScrollView>
			)}

			{/* Sequence Configuration Modal */}
			<Modal
				visible={showConfigModal}
				animationType="slide"
				transparent={true}
				onRequestClose={() => setShowConfigModal(false)}
			>
				<View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
					<View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20 }}>
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
							<Ionicons name="settings-outline" size={24} color="#111827" />
							<Text style={{ fontSize: 20, fontWeight: '700', color: '#111827' }}>
								Configure Email Sequence
							</Text>
						</View>

						{/* Number of Emails */}
						<View style={{ marginBottom: 16 }}>
							<Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
								Number of Emails
							</Text>
							<TextInput
								style={{
									borderWidth: 1,
									borderColor: '#d1d5db',
									borderRadius: 8,
									padding: 12,
									fontSize: 16,
									color: '#111827'
								}}
								value={numEmails}
								onChangeText={handleNumEmailsChange}
								keyboardType="numeric"
								placeholder="4"
							/>
							<Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
								Enter 1-8 emails
							</Text>
						</View>

						{/* Schedule Days - Individual inputs for each email */}
						<View style={{ marginBottom: 20 }}>
							<Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
								Send Schedule (days)
							</Text>
							<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
								{scheduleDays.map((day, idx) => (
									<View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
										<Text style={{ fontSize: 12, color: '#6b7280', marginRight: 6, width: 50 }}>
											Email {idx + 1}:
										</Text>
										<TextInput
											style={{
												borderWidth: 1,
												borderColor: '#d1d5db',
												borderRadius: 6,
												padding: 8,
												fontSize: 14,
												color: '#111827',
												width: 60,
												textAlign: 'center'
											}}
											value={day}
											onChangeText={(value) => handleDayChange(idx, value)}
											keyboardType="numeric"
											placeholder="Day"
										/>
										<Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>
											{day === '0' || day === '1' ? 'day' : 'days'}
										</Text>
									</View>
								))}
							</View>
							<Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
								0 = immediate, 1 = next day, etc.
							</Text>
						</View>

						{/* Buttons */}
						<View style={{ flexDirection: 'row', gap: 12 }}>
							<TouchableOpacity
								style={{
									flex: 1,
									backgroundColor: '#e5e7eb',
									padding: 14,
									borderRadius: 8,
									alignItems: 'center'
								}}
								onPress={() => setShowConfigModal(false)}
							>
								<Text style={{ color: '#374151', fontSize: 16, fontWeight: '600' }}>
									Cancel
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={{
									flex: 1,
									backgroundColor: '#6366f1',
									padding: 14,
									borderRadius: 8,
									alignItems: 'center'
								}}
								onPress={handleGenerateSequence}
							>
								<Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
									Generate
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			{/* Email Sequence Modal */}
			<Modal
				visible={showSequenceModal}
				animationType="slide"
				transparent={true}
				onRequestClose={() => setShowSequenceModal(false)}
			>
				<View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
					<View style={{ 
						backgroundColor: '#fff', 
						borderRadius: 16,
						maxHeight: '90%',
						overflow: 'hidden'
					}}>
						{/* Modal Header */}
						<View style={{ 
							backgroundColor: '#6366f1',
							padding: 20,
							flexDirection: 'row', 
							justifyContent: 'space-between', 
							alignItems: 'center'
						}}>
							<View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
								<Ionicons name="mail" size={24} color="#fff" />
								<View style={{ flex: 1 }}>
									<Text style={{ fontSize: 20, fontWeight: '700', color: '#fff' }}>
										Generated Email Sequence
									</Text>
									<Text style={{ fontSize: 14, color: '#e0e7ff', marginTop: 4 }}>
										{selectedSequence?.email_sequence?.length || 0} emails
									</Text>
								</View>
							</View>
							<TouchableOpacity 
								onPress={() => setShowSequenceModal(false)}
								style={{ padding: 8 }}
							>
								<Text style={{ fontSize: 28, color: '#fff', fontWeight: '300' }}>×</Text>
							</TouchableOpacity>
						</View>

						{/* Email Sequence List */}
							<FlatList
							data={editingSequence?.email_sequence || []}
							keyExtractor={(item, index) => `email-${index}`}
							renderItem={({ item, index }) => (
								<View style={{
											padding: 16,
											borderBottomWidth: 1,
									borderBottomColor: '#f1f5f9'
								}}>
									{/* Email Header */}
									<View style={{
											flexDirection: 'row',
										alignItems: 'center',
										justifyContent: 'space-between',
										marginBottom: 12,
										backgroundColor: '#f8fafc',
										padding: 10,
										borderRadius: 8
									}}>
										<View style={{ flexDirection: 'row', alignItems: 'center' }}>
											<View style={{
												width: 32,
												height: 32,
												borderRadius: 16,
												backgroundColor: '#6366f1',
												justifyContent: 'center',
												alignItems: 'center',
												marginRight: 10
											}}>
												<Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
													{item.email_number}
												</Text>
											</View>
											<Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
												Email {item.email_number} - {item.day === 0 ? 'Immediate' : `Day ${item.day}`}
											</Text>
										</View>
										<TouchableOpacity
											onPress={() => toggleEditEmail(index)}
											style={{
												paddingHorizontal: 12,
												paddingVertical: 6,
												backgroundColor: item.isEditing ? '#22c55e' : '#3b82f6',
												borderRadius: 6,
												flexDirection: 'row',
												alignItems: 'center',
												gap: 4
											}}
										>
											<Ionicons 
												name={item.isEditing ? "checkmark" : "pencil-outline"} 
												size={14} 
												color="#fff" 
											/>
											<Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
												{item.isEditing ? 'Done' : 'Edit'}
											</Text>
										</TouchableOpacity>
									</View>

									{/* Subject Lines */}
									<View style={{ marginBottom: 12 }}>
										<Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6 }}>
											SUBJECT LINES {item.isEditing ? '(tap to select or edit)' : '(tap to select)'}:
										</Text>
										{item.subject_lines?.map((subject: string, idx: number) => {
											const isSelected = selectedSubjects[index] === idx;
											return (
												<TouchableOpacity
													key={idx}
													onPress={() => !item.isEditing && selectSubject(index, idx)}
													style={{ marginBottom: 4 }}
												>
													{item.isEditing ? (
														<TextInput
															style={{
																backgroundColor: isSelected ? '#dbeafe' : '#f0f9ff',
																padding: 10,
																borderRadius: 6,
																borderLeftWidth: 3,
																borderLeftColor: isSelected ? '#2563eb' : '#3b82f6',
																fontSize: 13,
																color: '#0369a1',
																fontWeight: '500'
															}}
															value={subject}
															onChangeText={(text) => updateSubjectLine(index, idx, text)}
															multiline
														/>
													) : (
										<View style={{
															backgroundColor: isSelected ? '#dbeafe' : '#f0f9ff',
															padding: 10,
															borderRadius: 6,
															marginBottom: 4,
															borderLeftWidth: 3,
															borderLeftColor: isSelected ? '#2563eb' : '#3b82f6',
															flexDirection: 'row',
											alignItems: 'center',
															justifyContent: 'space-between'
										}}>
															<Text style={{ fontSize: 13, color: '#0369a1', fontWeight: '500', flex: 1 }}>
																{subject}
											</Text>
															{isSelected && (
																<Text style={{ fontSize: 16, color: '#2563eb', marginLeft: 8 }}>✓</Text>
															)}
														</View>
													)}
												</TouchableOpacity>
											);
										})}
										</View>

									{/* Preview Text */}
									{item.preview_text && (
										<View style={{ marginBottom: 12 }}>
											<Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 4 }}>
												PREVIEW:
											</Text>
											<Text style={{ fontSize: 13, color: '#374151', fontStyle: 'italic' }}>
												{item.preview_text}
											</Text>
										</View>
									)}

									{/* Email Body */}
									<View style={{ marginBottom: 12 }}>
										<Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6 }}>
											EMAIL BODY:
												</Text>
										{item.isEditing ? (
											<TextInput
												style={{
													backgroundColor: '#fff',
													padding: 12,
													borderRadius: 8,
													borderWidth: 2,
													borderColor: '#3b82f6',
													fontSize: 13,
													color: '#111827',
													minHeight: 150,
													textAlignVertical: 'top'
												}}
												value={item.email_body}
												onChangeText={(text) => updateEmailField(index, 'email_body', text)}
												multiline
												numberOfLines={8}
											/>
										) : (
											<View style={{
												backgroundColor: '#fafafa',
												padding: 12,
												borderRadius: 8,
												borderWidth: 1,
												borderColor: '#e5e7eb'
											}}>
												<Text style={{ fontSize: 13, color: '#111827', lineHeight: 20 }}>
													{item.email_body}
												</Text>
											</View>
										)}
									</View>

									{/* Reply Optimization Details */}
									<View style={{
										backgroundColor: '#f0fdf4',
										padding: 10,
										borderRadius: 8,
										borderLeftWidth: 3,
										borderLeftColor: '#22c55e'
									}}>
										<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
											<Ionicons name="analytics-outline" size={12} color="#166534" />
											<Text style={{ fontSize: 11, fontWeight: '600', color: '#166534' }}>
												REPLY OPTIMIZATION
											</Text>
										</View>

										{item.reply_trigger && (
											<View style={{ marginBottom: 4 }}>
												<Text style={{ fontSize: 10, color: '#16a34a', fontWeight: '600' }}>
													Trigger:
												</Text>
												<Text style={{ fontSize: 11, color: '#166534' }}>
													{item.reply_trigger}
												</Text>
											</View>
										)}

										{item.potential_objection && (
											<View style={{ marginBottom: 4 }}>
												<Text style={{ fontSize: 10, color: '#16a34a', fontWeight: '600' }}>
													Objection:
												</Text>
												<Text style={{ fontSize: 11, color: '#166534' }}>
													{item.potential_objection}
												</Text>
										</View>
										)}

										{item.follow_up_angle && (
											<View>
												<Text style={{ fontSize: 10, color: '#16a34a', fontWeight: '600' }}>
													Follow-up:
												</Text>
												<Text style={{ fontSize: 11, color: '#166534' }}>
													{item.follow_up_angle}
												</Text>
											</View>
										)}
									</View>
								</View>
							)}
							ListEmptyComponent={() => (
								<View style={{ padding: 40, alignItems: 'center' }}>
									<Text style={{ color: '#6b7280' }}>No emails generated</Text>
								</View>
							)}
						/>

						{/* Action Buttons */}
						<View style={{ padding: 16, backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
							<View style={{ flexDirection: 'row', gap: 12 }}>
								<TouchableOpacity
									style={{
										flex: 1,
										backgroundColor: '#22c55e',
										padding: 14,
										borderRadius: 8,
										alignItems: 'center',
										opacity: savingEmails ? 0.7 : 1
									}}
									onPress={handleSaveEmailSequence}
									disabled={savingEmails}
								>
									{savingEmails ? (
										<View style={{ flexDirection: 'row', alignItems: 'center' }}>
											<ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
											<Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Saving...</Text>
										</View>
									) : (
										<Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
											💾 Save to Campaign
								</Text>
									)}
								</TouchableOpacity>
								
								<TouchableOpacity
									style={{
										flex: 1,
										backgroundColor: '#6b7280',
										padding: 14,
										borderRadius: 8,
										alignItems: 'center'
									}}
									onPress={() => setShowSequenceModal(false)}
								>
									<Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
										Close
									</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</View>
			</Modal>

			{/* Custom Popup for Enrichment Messages */}
			<CustomPopup
				visible={popupVisible}
				title={popupTitle}
				message={popupMessage}
				onClose={() => setPopupVisible(false)}
			/>

		</View>
	);
}


