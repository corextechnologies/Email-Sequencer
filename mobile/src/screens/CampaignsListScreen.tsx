import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, Linking } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { campaignsService } from '../services/campaignsService';
import { Campaign } from '../types/campaigns';
import { COLORS } from '../constants/colors';
import { FuelCampaignsPopup } from './Popups';

interface CampaignMetrics {
	recipients: number;
	sent: number;
	replies: number;
	unsubscribes: number;
	progress: { completed: number; total: number };
}

interface CampaignWithMetrics extends Campaign {
	metrics?: CampaignMetrics;
}

export default function CampaignsListScreen() {
	const nav = useNavigation<any>();
	const [items, setItems] = useState<CampaignWithMetrics[]>([]);
	const [loading, setLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string|undefined>();

	// Popup state
	const [showFuelPopup, setShowFuelPopup] = useState(false);
	const [popupTimer, setPopupTimer] = useState(3);

	// Timer effect for popup countdown
	useEffect(() => {
		let interval: NodeJS.Timeout;
		if (showFuelPopup && popupTimer > 0) {
			interval = setInterval(() => {
				setPopupTimer((prev) => {
					if (prev <= 1) {
						setShowFuelPopup(false);
						// Navigate to CampaignCreateScreen when timer expires
						nav.navigate('CampaignCreate');
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
		}
		return () => clearInterval(interval);
	}, [showFuelPopup, popupTimer]);

	const load = useCallback(async () => {
		setLoading(true);
		setError(undefined);
		try {
			const data = await campaignsService.listCampaigns();
			
			// Fetch metrics for each campaign
			const campaignsWithMetrics = await Promise.all(
				data.map(async (campaign) => {
					try {
						const metrics = await campaignsService.getCampaignMetrics(campaign.id);
						return { ...campaign, metrics };
					} catch (error) {
						console.warn(`Failed to load metrics for campaign ${campaign.id}:`, error);
						return { ...campaign, metrics: undefined };
					}
				})
			);
			
			setItems(campaignsWithMetrics);
		} catch (e: any) {
			setError(e?.message || 'Failed to load campaigns');
		} finally {
			setLoading(false);
		}
	}, []);

	// Auto-refresh when screen comes into focus
	useFocusEffect(
		useCallback(() => {
			load();
		}, [load])
	);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await load();
		setRefreshing(false);
	}, [load]);

	const createNewCampaign = () => {
		// Show the fuel campaigns popup instead of directly navigating
		setShowFuelPopup(true);
		setPopupTimer(3);
	};

	const handleFuelNow = async () => {
		setShowFuelPopup(false);
		try {
			const url = 'https://www.bobos.ai/';
			const supported = await Linking.canOpenURL(url);
			
			if (supported) {
				await Linking.openURL(url);
			} else {
				Alert.alert('Error', 'Cannot open browser');
			}
		} catch (error) {
			console.error('Error opening URL:', error);
			Alert.alert('Error', 'Failed to open website');
		}
	};

	const handleClosePopup = () => {
		setShowFuelPopup(false);
		// Navigate to CampaignCreateScreen when popup is manually closed
		nav.navigate('CampaignCreate');
	};

	const deleteCampaign = async (campaign: Campaign) => {
		Alert.alert(
			'Delete Campaign',
			`Are you sure you want to delete "${campaign.name}"?\n\nThis will permanently delete all campaign data.`,
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
							await campaignsService.deleteCampaign(campaign.id);
							setItems((prev) => prev.filter(item => item.id !== campaign.id));
							Alert.alert('Success', 'Campaign deleted successfully');
						} catch (e: any) {
							Alert.alert('Error', e?.message || 'Failed to delete campaign');
						}
					}
				}
			]
		);
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'running': return '#dcfce7';
			case 'draft': return '#fef3c7';
			case 'paused': return '#fef2f2';
			case 'completed': return '#e0f2fe';
			case 'cancelled': return '#f3f4f6';
			default: return '#f3f4f6';
		}
	};

	const getStatusTextColor = (status: string) => {
		switch (status) {
			case 'running': return '#166534';
			case 'draft': return '#92400e';
			case 'paused': return '#dc2626';
			case 'completed': return '#0369a1';
			case 'cancelled': return '#6b7280';
			default: return '#6b7280';
		}
	};

	const getStatusText = (status: string) => {
		return status.toUpperCase();
	};

	return (
		<View style={styles.container}>

			{error && (
				<View style={styles.errorContainer}>
					<Text style={styles.errorTitle}>Error</Text>
					<Text style={styles.errorMessage}>{error}</Text>
					<TouchableOpacity onPress={load} style={styles.retryButton}>
						<Text style={styles.retryButtonText}>Retry</Text>
					</TouchableOpacity>
				</View>
			)}

			{loading && items.length === 0 ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={COLORS.primary} />
					<Text style={styles.loadingText}>Loading campaigns...</Text>
				</View>
			) : items.length === 0 ? (
				<View style={styles.emptyContainer}>
					<Text style={styles.emptyTitle}>No Campaigns Yet</Text>
					<Text style={styles.emptyMessage}>Create your first email campaign to get started</Text>
					<TouchableOpacity onPress={createNewCampaign} style={styles.createFirstButton}>
						<Text style={styles.createFirstButtonText}>Create First Campaign</Text>
					</TouchableOpacity>
				</View>
			) : (
				<FlatList
					data={items}
					keyExtractor={(item) => String(item.id)}
					renderItem={({ item }) => (
						<View style={styles.campaignCard}>
							{/* Campaign Header */}
							<View style={styles.campaignHeader}>
								<View style={styles.campaignTitleContainer}>
									<Text style={styles.campaignTitle}>{item.name}</Text>
									<Text style={styles.campaignType}>Email Sequence</Text>
								</View>
								<View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
									<Text style={[styles.statusText, { color: getStatusTextColor(item.status) }]}>
										{getStatusText(item.status)}
									</Text>
								</View>
							</View>

							{/* Campaign Metrics */}
							<View style={styles.metricsContainer}>
								<View style={styles.metricsRow}>
									<View style={styles.metricItem}>
										<Text style={styles.metricLabel}>Recipients</Text>
										<Text style={styles.metricValue}>{item.metrics?.recipients || 0}</Text>
									</View>
									<View style={styles.metricItem}>
										<Text style={styles.metricLabel}>Sent</Text>
										<Text style={styles.metricValue}>{item.metrics?.sent || 0}</Text>
										{item.metrics && item.metrics.recipients > 0 && (
											<Text style={styles.metricPercentage}>
												{((item.metrics.sent / item.metrics.recipients) * 100).toFixed(1)}%
											</Text>
										)}
									</View>
								</View>
								<View style={styles.metricsRow}>
									<View style={[styles.metricItem, item.metrics?.replies > 0 && styles.replyMetricItem]}>
										<Text style={[styles.metricLabel, item.metrics?.replies > 0 && styles.replyMetricLabel]}>
											Replies
										</Text>
										<Text style={[styles.metricValue, item.metrics?.replies > 0 && styles.replyMetricValue]}>
											{item.metrics?.replies || 0}
										</Text>
										{item.metrics && item.metrics.sent > 0 && (
											<Text style={[styles.metricPercentage, item.metrics?.replies > 0 && styles.replyMetricPercentage]}>
												{((item.metrics.replies / item.metrics.sent) * 100).toFixed(1)}%
											</Text>
										)}
									</View>
									<View style={styles.metricItem}>
										<Text style={styles.metricLabel}>Unsubscribes</Text>
										<Text style={styles.metricValue}>{item.metrics?.unsubscribes || 0}</Text>
									</View>
								</View>
							</View>

							{/* Progress Bar */}
							<View style={styles.progressContainer}>
								<Text style={styles.progressLabel}>Progress</Text>
								<View style={styles.progressBarContainer}>
									<View style={styles.progressBar}>
										<View style={[
											styles.progressBarFill, 
											{ 
												width: item.metrics && item.metrics.progress.total > 0 
													? `${(item.metrics.progress.completed / item.metrics.progress.total) * 100}%`
													: '0%'
											}
										]} />
									</View>
									<Text style={styles.progressText}>
										{item.metrics ? `${item.metrics.progress.completed}/${item.metrics.progress.total}` : '0/0'}
									</Text>
								</View>
							</View>

							{/* Action Buttons */}
							<View style={styles.actionButtonsContainer}>
								<View style={styles.actionButtonsRow}>
									<TouchableOpacity 
										style={styles.analyticsButton}
										onPress={() => nav.navigate('CampaignDetails', { id: item.id })}
									>
										<Text style={styles.analyticsButtonText}>Analytics</Text>
									</TouchableOpacity>
									{item.metrics?.replies > 0 && (
										<TouchableOpacity 
											style={styles.repliesButton}
											onPress={() => nav.navigate('CampaignReplies', { campaignId: item.id })}
										>
											<Text style={styles.repliesButtonText}>Replies ({item.metrics.replies})</Text>
										</TouchableOpacity>
									)}
									<TouchableOpacity 
										style={styles.deleteButton}
										onPress={() => deleteCampaign(item)}
									>
										<Text style={styles.deleteButtonText}>Delete</Text>
									</TouchableOpacity>
								</View>
							</View>
						</View>
					)}
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
					contentContainerStyle={styles.listContainer}
				/>
			)}
			<View style={styles.floatingButtons}>
				<TouchableOpacity 
					onPress={() => nav.navigate('ReplyAnalytics')} 
					style={styles.analyticsFloatingButton}
				>
					<Text style={styles.analyticsFloatingButtonText}>📊</Text>
				</TouchableOpacity>
				<TouchableOpacity onPress={createNewCampaign} style={styles.floatingAddButton}>
					<Text style={styles.floatingAddButtonText}>+</Text>
				</TouchableOpacity>
			</View>

			{/* Fuel Campaigns Popup */}
			<FuelCampaignsPopup
				visible={showFuelPopup}
				onClose={handleClosePopup}
				onFuelNow={handleFuelNow}
				timer={popupTimer}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.background.secondary,
	},
	floatingAddButton: {
		backgroundColor: COLORS.primary,
		width: 56,
		height: 56,
		borderRadius: 28,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: COLORS.shadow.light,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 8,
	},
	floatingAddButtonText: {
		color: COLORS.text.white,
		fontSize: 24,
		fontWeight: 'bold',
	},
	floatingButtons: {
		position: 'absolute',
		bottom: 24,
		right: 24,
		flexDirection: 'row',
		gap: 12,
	},
	analyticsFloatingButton: {
		backgroundColor: COLORS.status.success,
		width: 56,
		height: 56,
		borderRadius: 28,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: COLORS.shadow.light,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 8,
	},
	analyticsFloatingButtonText: {
		fontSize: 24,
	},
	errorContainer: {
		backgroundColor: '#fef2f2',
		padding: 12,
		margin: 16,
		borderRadius: 8,
		borderLeftWidth: 4,
		borderLeftColor: COLORS.status.error,
	},
	errorTitle: {
		color: COLORS.status.error,
		fontWeight: '600',
		marginBottom: 4,
	},
	errorMessage: {
		color: '#7f1d1d',
		fontSize: 12,
	},
	retryButton: {
		backgroundColor: COLORS.status.error,
		padding: 8,
		borderRadius: 4,
		marginTop: 8,
	},
	retryButtonText: {
		color: COLORS.text.white,
		textAlign: 'center',
		fontWeight: '600',
	},
	loadingContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	loadingText: {
		marginTop: 8,
		color: COLORS.text.secondary,
	},
	emptyContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: '600',
		marginBottom: 8,
		textAlign: 'center',
	},
	emptyMessage: {
		color: COLORS.text.secondary,
		textAlign: 'center',
		marginBottom: 20,
	},
	createFirstButton: {
		backgroundColor: COLORS.primary,
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 8,
	},
	createFirstButtonText: {
		color: COLORS.text.white,
		fontWeight: '600',
	},
	listContainer: {
		padding: 16,
	},
	campaignCard: {
		backgroundColor: COLORS.background.primary,
		borderRadius: 12,
		padding: 20,
		marginBottom: 16,
		shadowColor: COLORS.shadow.light,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	campaignHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 16,
	},
	campaignTitleContainer: {
		flex: 1,
	},
	campaignTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: COLORS.text.primary,
		marginBottom: 4,
	},
	campaignType: {
		fontSize: 14,
		color: COLORS.text.secondary,
	},
	statusBadge: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
	},
	statusText: {
		fontSize: 12,
		fontWeight: 'bold',
		textTransform: 'uppercase',
	},
	metricsContainer: {
		marginBottom: 16,
	},
	metricsRow: {
		flexDirection: 'row',
		marginBottom: 8,
	},
	metricItem: {
		flex: 1,
	},
	metricLabel: {
		fontSize: 14,
		color: COLORS.text.secondary,
		marginBottom: 2,
	},
	metricValue: {
		fontSize: 18,
		fontWeight: 'bold',
		color: COLORS.text.primary,
	},
	metricPercentage: {
		fontSize: 14,
		color: COLORS.secondary,
		marginTop: 2,
	},
	replyMetricItem: {
		backgroundColor: '#f0fdf4',
		padding: 4,
		borderRadius: 6,
	},
	replyMetricLabel: {
		color: COLORS.status.success,
		fontWeight: '600',
	},
	replyMetricValue: {
		color: '#15803d',
		fontSize: 20,
	},
	replyMetricPercentage: {
		color: COLORS.status.success,
		fontWeight: '600',
	},
	metricValueBold: {
		fontSize: 18,
		fontWeight: 'bold',
		color: COLORS.text.primary,
	},
	progressContainer: {
		marginBottom: 16,
	},
	progressLabel: {
		fontSize: 14,
		color: COLORS.text.dark,
		marginBottom: 8,
	},
	progressBarContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	progressBar: {
		flex: 1,
		height: 8,
		backgroundColor: COLORS.border.medium,
		borderRadius: 4,
		marginRight: 12,
	},
	progressBarFill: {
		height: '100%',
		backgroundColor: COLORS.secondary,
		borderRadius: 4,
		width: '100%',
	},
	progressText: {
		fontSize: 12,
		color: COLORS.text.secondary,
		fontWeight: '500',
	},
	actionButtonsContainer: {
		marginTop: 8,
	},
	actionButtonsRow: {
		flexDirection: 'row',
		gap: 12,
	},
	analyticsButton: {
		flex: 1,
		backgroundColor: COLORS.secondary,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 8,
	},
	analyticsButtonIcon: {
		fontSize: 14,
		marginRight: 6,
	},
	analyticsButtonText: {
		color: COLORS.text.white,
		fontWeight: '600',
		fontSize: 14,
	},
	repliesButton: {
		flex: 1,
		backgroundColor: COLORS.status.success,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 8,
	},
	repliesButtonIcon: {
		fontSize: 14,
		marginRight: 6,
	},
	repliesButtonText: {
		color: COLORS.text.white,
		fontWeight: '600',
		fontSize: 14,
	},
	deleteButton: {
		flex: 1,
		backgroundColor: COLORS.status.error,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 8,
	},
	deleteButtonIcon: {
		fontSize: 14,
		marginRight: 6,
	},
	deleteButtonText: {
		color: COLORS.text.white,
		fontWeight: '600',
		fontSize: 14,
	},
});
