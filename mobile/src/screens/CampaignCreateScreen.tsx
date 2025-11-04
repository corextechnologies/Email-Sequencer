import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { campaignsService } from '../services/campaignsService';
import { contactsService } from '../services/contactsService';
import { Contact } from '../types/contacts';
import api from '../services/api';

export default function CampaignCreateScreen() {
	const nav = useNavigation<any>();
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [selectedEmailAccount, setSelectedEmailAccount] = useState<any>(null);
	const [emailAccounts, setEmailAccounts] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [loadingAccounts, setLoadingAccounts] = useState(false);
	
	// Contacts selection state
	const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
	const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
	const [contactSearchQuery, setContactSearchQuery] = useState('');
	const [loadingContacts, setLoadingContacts] = useState(false);
	const [showContactSearch, setShowContactSearch] = useState(false);

	// Load email accounts on component mount
	useEffect(() => {
		loadEmailAccounts();
		loadContacts();
	}, []);

	// Load contacts when search query changes
	useEffect(() => {
		if (contactSearchQuery.trim()) {
			searchContacts();
		} else {
			setAvailableContacts([]);
		}
	}, [contactSearchQuery]);

	// Reload contacts and email accounts when screen comes into focus (e.g., returning from import or adding email account)
	useFocusEffect(
		React.useCallback(() => {
			loadContacts();
			loadEmailAccounts();
		}, [])
	);

	const loadEmailAccounts = async () => {
		try {
			setLoadingAccounts(true);
			const accounts = await api.getEmailAccounts();
			console.log('📧 All email accounts:', accounts);
			
			// Filter to show only active accounts
			const activeAccounts = accounts.filter((acc: any) => acc.is_active);
			console.log('📧 Active email accounts:', activeAccounts);
			
			setEmailAccounts(activeAccounts);
			
			// Auto-select the first active account if available
			if (activeAccounts.length > 0) {
				console.log('📧 Auto-selecting account:', activeAccounts[0]);
				setSelectedEmailAccount(activeAccounts[0]);
			}
		} catch (error) {
			console.error('Failed to load email accounts:', error);
		} finally {
			setLoadingAccounts(false);
		}
	};

	const loadContacts = async () => {
		try {
			setLoadingContacts(true);
			const response = await contactsService.getContacts({ limit: 50 });
			setAvailableContacts(response.contacts);
		} catch (error) {
			console.error('Failed to load contacts:', error);
		} finally {
			setLoadingContacts(false);
		}
	};

	const searchContacts = async () => {
		try {
			setLoadingContacts(true);
			const response = await contactsService.getContacts({ 
				search: contactSearchQuery,
				limit: 20 
			});
			setAvailableContacts(response.contacts);
		} catch (error) {
			console.error('Failed to search contacts:', error);
		} finally {
			setLoadingContacts(false);
		}
	};

	const toggleContactSelection = (contact: Contact) => {
		const isSelected = selectedContacts.some(c => c.id === contact.id);
		if (isSelected) {
			setSelectedContacts(selectedContacts.filter(c => c.id !== contact.id));
		} else {
			setSelectedContacts([...selectedContacts, contact]);
		}
	};

	const removeSelectedContact = (contactId: number) => {
		setSelectedContacts(selectedContacts.filter(c => c.id !== contactId));
	};

	const createCampaign = async () => {
		if (!name.trim()) {
			Alert.alert('Error', 'Please enter a campaign name');
			return;
		}

		if (!selectedEmailAccount) {
			Alert.alert('Error', 'Please select an email account');
			return;
		}

		if (selectedContacts.length === 0) {
			Alert.alert('Error', 'Please select at least one contact');
			return;
		}

		try {
			setLoading(true);
			
			// Create new campaign with all the details
			const created = await campaignsService.createCampaign({ 
				name: name.trim(),
				from_email_account_id: selectedEmailAccount?.id
				// email_subject and email_body will be set later in campaign details
				// delay_days and repeat_count are not part of the campaign creation API
			});
			
			// Attach selected contacts to the campaign
			if (selectedContacts.length > 0) {
				const contactIds = selectedContacts.map(contact => contact.id);
				await campaignsService.attachContacts(created.id, contactIds);
				console.log(`✅ Attached ${contactIds.length} contacts to campaign ${created.id}`);
				
				// Show success message
				Alert.alert(
					'Campaign Created Successfully', 
					`Campaign "${created.name}" has been created with ${selectedContacts.length} contact(s) attached.`,
					[{ text: 'OK' }]
				);
			}
			
			// Navigate to campaign details to continue setup
			nav.replace('CampaignDetails', { id: created.id });
		} catch (e: any) {
			// Try to extract error message from multiple possible locations
			let errorMessage = '';
			
			// Check Axios error response structure first
			if (e?.response?.data?.error?.message) {
				errorMessage = e.response.data.error.message;
				console.log('✅ Found error in response.data.error.message:', errorMessage);
			} else if (e?.response?.data?.message) {
				errorMessage = e.response.data.message;
				console.log('✅ Found error in response.data.message:', errorMessage);
			} else if (e?.message) {
				errorMessage = e.message;
				console.log('✅ Using error.message:', errorMessage);
			} else {
				errorMessage = 'Failed to create campaign';
				console.log('⚠️ No error message found, using default');
			}
			
			console.log('🔍 Final Campaign creation error message:', errorMessage);
			console.log('🔍 Full error object:', JSON.stringify(e, null, 2));
			
			// Check if error is related to credentials
			if (errorMessage.includes('INVALID_EMAIL_CREDENTIALS')) {
				Alert.alert(
					'Email Credentials Invalid',
					'Your email account credentials are not working. Please update your email account settings before creating the campaign.\n\nCommon issues:\n• Password changed\n• 2FA settings changed\n• Account locked or suspended\n• SMTP server settings incorrect',
					[
						{ text: 'OK', style: 'default' },
						{ text: 'Update Email Account', style: 'default', onPress: () => {
							nav.navigate('EmailAccounts');
						}}
					]
				);
			} else if (errorMessage.includes('EMAIL_ACCOUNT_INACTIVE')) {
				Alert.alert(
					'Email Account Inactive',
					'Please activate your email account in the Email Accounts screen before creating a campaign.',
					[
						{ text: 'OK', style: 'default' },
						{ text: 'Go to Email Accounts', style: 'default', onPress: () => {
							nav.navigate('EmailAccounts');
						}}
					]
				);
			} else if (errorMessage.includes('EMAIL_ACCOUNT_NOT_FOUND')) {
				Alert.alert(
					'Email Account Not Found',
					'The selected email account was not found. Please select a different email account.',
					[
						{ text: 'OK', style: 'default' },
						{ text: 'Go to Email Accounts', style: 'default', onPress: () => {
							nav.navigate('EmailAccounts');
						}}
					]
				);
			} else {
				Alert.alert('Error', errorMessage || 'Failed to create campaign');
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
			{loading && <ActivityIndicator style={styles.loadingIndicator} />}
			
			{/* Campaign Details Section */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Campaign Details</Text>
				
				{/* Campaign Name */}
				<View style={styles.inputContainer}>
					<Text style={styles.inputIcon}>✉️</Text>
					<TextInput 
						value={name} 
						onChangeText={setName} 
						placeholder="Campaign Name" 
						style={styles.textInput}
						maxLength={255}
					/>
				</View>

				{/* Description */}
				<View style={styles.inputContainer}>
					<TextInput 
						value={description} 
						onChangeText={setDescription} 
						placeholder="Description" 
						style={[styles.textInput, styles.textArea]}
						multiline
						numberOfLines={3}
						maxLength={500}
					/>
				</View>
			</View>

			{/* Sending Email Account Section */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Sending Email Account</Text>
				
				{loadingAccounts ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="small" color="#6366f1" />
						<Text style={styles.loadingText}>Loading email accounts...</Text>
					</View>
				) : emailAccounts.length === 0 ? (
					<View style={styles.emptyStateContainer}>
						<Text style={styles.emptyStateText}>No active email accounts found</Text>
						<Text style={styles.emptyStateSubtext}>You need at least one active email account to create campaigns</Text>
						<TouchableOpacity 
							style={styles.addAccountButton}
							onPress={() => nav.navigate('AddEmailAccount')}
						>
							<Text style={styles.addAccountButtonText}>Add Email Account</Text>
						</TouchableOpacity>
					</View>
				) : (
					<View style={styles.emailAccountsList}>
						{emailAccounts.map((account) => (
							<TouchableOpacity
								key={account.id}
								style={[
									styles.emailAccountCard,
									selectedEmailAccount?.id === account.id && styles.selectedEmailAccountCard
								]}
								onPress={() => setSelectedEmailAccount(account)}
							>
								<View style={styles.radioButton}>
									{selectedEmailAccount?.id === account.id && (
										<View style={styles.radioButtonSelected} />
									)}
								</View>
								
							<View style={styles.emailAccountInfo}>
								<Text style={styles.emailAddress}>
									{account.email || account.email_address || account.address || account.username || 'No email address'}
								</Text>
								<Text style={styles.emailDomain}>
									{account.provider || 
									 (account.email ? account.email.split('@')[1] : null) || 
									 (account.email_address ? account.email_address.split('@')[1] : null) || 
									 (account.address ? account.address.split('@')[1] : null) ||
									 (account.username ? account.username.split('@')[1] : null) ||
									 'Email Provider'}
								</Text>
							</View>
							</TouchableOpacity>
						))}
					</View>
				)}
			</View>

			{/* Select Contacts Section */}
			<View style={styles.section}>
				<View style={styles.contactsHeader}>
					<Text style={styles.sectionTitle}>Select Contacts</Text>
					<TouchableOpacity 
						style={styles.uploadNewButton}
						onPress={() => nav.navigate('Contacts', { screen: 'ImportContacts' })}
					>
						<Text style={styles.uploadNewIcon}>↗️</Text>
						<Text style={styles.uploadNewText}>Upload New</Text>
					</TouchableOpacity>
				</View>

				{/* Contact Search */}
				<View style={styles.contactSearchContainer}>
					<Text style={styles.searchIcon}>🔍</Text>
					<TextInput 
						value={contactSearchQuery} 
						onChangeText={setContactSearchQuery} 
						placeholder="Search contacts by name, email, company, or keyword" 
						style={styles.contactSearchInput}
						onFocus={() => setShowContactSearch(true)}
					/>
				</View>

				{/* Selected Contacts */}
				{selectedContacts.length > 0 && (
					<View style={styles.selectedContactsContainer}>
						<Text style={styles.selectedContactsTitle}>
							Selected Contacts ({selectedContacts.length})
						</Text>
						<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectedContactsList}>
							{selectedContacts.map((contact) => (
								<View key={contact.id} style={styles.selectedContactChip}>
									<Text style={styles.selectedContactName}>
										{contact.first_name} {contact.last_name}
									</Text>
									<TouchableOpacity 
										onPress={() => removeSelectedContact(contact.id)}
										style={styles.removeContactButton}
									>
										<Text style={styles.removeContactIcon}>×</Text>
									</TouchableOpacity>
								</View>
							))}
						</ScrollView>
					</View>
				)}

				{/* Available Contacts List */}
				{showContactSearch && contactSearchQuery.trim() && (
					<View style={styles.availableContactsContainer}>
						{loadingContacts ? (
							<View style={styles.loadingContainer}>
								<ActivityIndicator size="small" color="#6366f1" />
								<Text style={styles.loadingText}>Searching contacts...</Text>
							</View>
						) : availableContacts.length === 0 ? (
							<Text style={styles.noContactsText}>No contacts found</Text>
						) : (
							<ScrollView style={styles.contactsList} showsVerticalScrollIndicator={false}>
								{availableContacts.map((contact) => {
									const isSelected = selectedContacts.some(c => c.id === contact.id);
									return (
										<TouchableOpacity
											key={contact.id}
											style={[
												styles.contactItem,
												isSelected && styles.selectedContactItem
											]}
											onPress={() => toggleContactSelection(contact)}
										>
											<View style={styles.contactInfo}>
												<Text style={styles.contactName}>
													{contact.first_name} {contact.last_name}
												</Text>
												<Text style={styles.contactEmail}>{contact.email}</Text>
												{contact.company && (
													<Text style={styles.contactCompany}>{contact.company}</Text>
												)}
											</View>
											<View style={styles.contactCheckbox}>
												{isSelected && <Text style={styles.contactCheckmark}>✓</Text>}
											</View>
										</TouchableOpacity>
									);
								})}
							</ScrollView>
						)}
					</View>
				)}
			</View>
			
			{/* Create Button */}
			<TouchableOpacity 
				onPress={createCampaign} 
				style={[styles.createButton, (!name.trim() || !selectedEmailAccount || selectedContacts.length === 0) && styles.createButtonDisabled]}
				disabled={loading || !name.trim() || !selectedEmailAccount || selectedContacts.length === 0}
			>
				<Text style={styles.createButtonText}>
					{loading ? 'Creating...' : `Create Campaign (${selectedContacts.length} contacts)`}
				</Text>
			</TouchableOpacity>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	contentContainer: {
		padding: 20,
	},
	loadingIndicator: {
		marginTop: 20,
	},
	section: {
		marginBottom: 32,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#1f2937',
		marginBottom: 16,
	},
	inputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f3f4f6',
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	inputIcon: {
		fontSize: 16,
		marginRight: 12,
		color: '#6b7280',
	},
	textInput: {
		flex: 1,
		fontSize: 16,
		color: '#1f2937',
		padding: 0,
	},
	textArea: {
		height: 80,
		textAlignVertical: 'top',
	},
	loadingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
	},
	loadingText: {
		marginLeft: 8,
		color: '#6b7280',
		fontSize: 14,
	},
	emptyStateContainer: {
		alignItems: 'center',
		padding: 20,
	},
	emptyStateText: {
		color: '#6b7280',
		fontSize: 14,
		marginBottom: 4,
		textAlign: 'center',
	},
	emptyStateSubtext: {
		color: '#9ca3af',
		fontSize: 12,
		marginBottom: 16,
		textAlign: 'center',
	},
	addAccountButton: {
		backgroundColor: '#6366f1',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 8,
	},
	addAccountButtonText: {
		color: '#fff',
		fontSize: 14,
		fontWeight: '600',
	},
	emailAccountsList: {
		gap: 12,
	},
	emailAccountCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f3f4f6',
		borderRadius: 12,
		padding: 16,
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	selectedEmailAccountCard: {
		backgroundColor: '#eff6ff',
		borderColor: '#3b82f6',
	},
	radioButton: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 2,
		borderColor: '#d1d5db',
		marginRight: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	radioButtonSelected: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: '#3b82f6',
	},
	emailAccountInfo: {
		flex: 1,
	},
	emailAddress: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#1f2937',
		marginBottom: 2,
	},
	emailDomain: {
		fontSize: 14,
		color: '#6b7280',
	},
	createButton: {
		backgroundColor: '#6366f1',
		paddingVertical: 16,
		borderRadius: 12,
		alignItems: 'center',
		marginTop: 20,
	},
	createButtonDisabled: {
		backgroundColor: '#9ca3af',
	},
	createButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: 'bold',
	},
	// Contacts section styles
	contactsHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	uploadNewButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f3f4f6',
		borderWidth: 1,
		borderColor: '#d1d5db',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	uploadNewIcon: {
		fontSize: 14,
		marginRight: 4,
	},
	uploadNewText: {
		color: '#3b82f6',
		fontSize: 14,
		fontWeight: '600',
	},
	contactSearchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f3f4f6',
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	searchIcon: {
		fontSize: 16,
		marginRight: 12,
		color: '#6b7280',
	},
	contactSearchInput: {
		flex: 1,
		fontSize: 16,
		color: '#1f2937',
		padding: 0,
	},
	selectedContactsContainer: {
		marginBottom: 16,
	},
	selectedContactsTitle: {
		fontSize: 14,
		color: '#6b7280',
		marginBottom: 8,
		fontWeight: '500',
	},
	selectedContactsList: {
		flexDirection: 'row',
	},
	selectedContactChip: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#eff6ff',
		borderColor: '#3b82f6',
		borderWidth: 1,
		borderRadius: 20,
		paddingHorizontal: 12,
		paddingVertical: 6,
		marginRight: 8,
	},
	selectedContactName: {
		color: '#3b82f6',
		fontSize: 14,
		fontWeight: '500',
		marginRight: 6,
	},
	removeContactButton: {
		width: 18,
		height: 18,
		borderRadius: 9,
		backgroundColor: '#3b82f6',
		alignItems: 'center',
		justifyContent: 'center',
	},
	removeContactIcon: {
		color: '#fff',
		fontSize: 12,
		fontWeight: 'bold',
	},
	availableContactsContainer: {
		maxHeight: 200,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		borderRadius: 12,
		backgroundColor: '#fff',
	},
	contactsList: {
		maxHeight: 200,
	},
	contactItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#f3f4f6',
	},
	selectedContactItem: {
		backgroundColor: '#eff6ff',
	},
	contactInfo: {
		flex: 1,
	},
	contactName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1f2937',
		marginBottom: 2,
	},
	contactEmail: {
		fontSize: 14,
		color: '#6b7280',
		marginBottom: 2,
	},
	contactCompany: {
		fontSize: 12,
		color: '#9ca3af',
	},
	contactCheckbox: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 2,
		borderColor: '#d1d5db',
		alignItems: 'center',
		justifyContent: 'center',
		marginLeft: 12,
	},
	contactCheckmark: {
		color: '#3b82f6',
		fontSize: 12,
		fontWeight: 'bold',
	},
	noContactsText: {
		textAlign: 'center',
		color: '#6b7280',
		fontSize: 14,
		padding: 20,
	},
});
