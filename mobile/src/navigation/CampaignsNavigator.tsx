import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import CampaignsListScreen from '../screens/CampaignsListScreen';
import CampaignCreateScreen from '../screens/CampaignCreateScreen';
import CampaignDetailsScreen from '../screens/CampaignDetailsScreen';
import ContactPickerScreen from '../screens/ContactPickerScreen';
import CampaignRepliesScreen from '../screens/CampaignRepliesScreen';
import ReplyAnalyticsScreen from '../screens/ReplyAnalyticsScreen';
import { COLORS } from '../constants/colors';

export type CampaignsStackParamList = {
	CampaignsList: undefined;
	CampaignCreate: undefined;
	CampaignDetails: { id: number };
	ContactPicker: { campaignId: number };
	CampaignReplies: { campaignId: number };
	ReplyAnalytics: undefined;
};

const Stack = createStackNavigator<CampaignsStackParamList>();

export default function CampaignsNavigator() {
	return (
		<Stack.Navigator>
			{/* <Stack.Screen name="CampaignsList" component={CampaignsListScreen} options={{ title: 'Campaigns' }} /> */}
			<Stack.Screen
				name="CampaignsList"
				component={CampaignsListScreen}
				options={{
					title: 'Campaigns',
					headerStyle: {
						backgroundColor: COLORS.background.primary,
					},
					headerTitleStyle: {
						fontSize: 24,
						fontWeight: '700',
						color: COLORS.text.primary,
					}
				}}
			/>
			<Stack.Screen name="CampaignCreate" component={CampaignCreateScreen} options={{ title: 'New Campaign' }} />
			<Stack.Screen name="CampaignDetails" component={CampaignDetailsScreen} options={{ title: 'Campaign Details' }} />
			<Stack.Screen name="ContactPicker" component={ContactPickerScreen} options={{ title: 'Pick Contacts' }} />
			<Stack.Screen 
				name="CampaignReplies" 
				component={CampaignRepliesScreen} 
				options={{ 
					title: 'Campaign Replies',
					headerStyle: {
						backgroundColor: COLORS.background.primary,
					},
					headerTitleStyle: {
						fontSize: 20,
						fontWeight: 'bold',
						color: COLORS.text.primary,
					},
				}} 
			/>
			<Stack.Screen 
				name="ReplyAnalytics" 
				component={ReplyAnalyticsScreen} 
				options={{ 
					title: 'Reply Analytics',
					headerStyle: {
						backgroundColor: COLORS.background.primary,
					},
					headerTitleStyle: {
						fontSize: 20,
						fontWeight: 'bold',
						color: COLORS.text.primary,
					},
				}} 
			/>
		</Stack.Navigator>
	);
}


