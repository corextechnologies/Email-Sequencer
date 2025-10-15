import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { QuestionnaireProvider } from '../contexts/QuestionnaireContext';
import { COLORS } from '../constants/colors';

import DashboardScreen from '../screens/DashboardScreen';
import BuyerPersonasScreen from '../screens/BuyerPersonasScreen';
import PersonasScreen from '../screens/PersonasScreen';
import EditPersonaScreen from '../screens/EditPersonaScreen';
import BusinessQuestionierScreen from '../screens/BusinessQuestionnaireScreen';
import BusinessQuestionnaireStep2Screen from '../screens/BusinessQuestionnaireStep2Screen';
import BusinessQuestionnaireStep3Screen from '../screens/BusinessQuestionnaireStep3Screen';
import BusinessQuestionnaireStep4Screen from '../screens/BusinessQuestionnaireStep4Screen';
import BusinessQuestionnaireStep5Screen from '../screens/BusinessQuestionnaireStep5Screen';
import BusinessQuestionnaireStep6Screen from '../screens/BusinessQuestionnaireStep6Screen';
import BusinessOperationsScreen from '../screens/BusinessOperationsScreen';



import ContactsScreen from '../screens/ContactsScreen';
import AddContactScreen from '../screens/AddContactScreen';
import ContactDetailsScreen from '../screens/ContactDetailsScreen';
import ImportSelectionScreen from '../screens/ImportSelectionScreen';
import ImportContactsVCFScreen from '../screens/ImportContactsVCFScreen';
import ImportContactsPhoneScreen from '../screens/ImportContactsPhoneScreen';
import EmailAccountsScreen from '../screens/EmailAccountsScreen';
import AddEmailAccountScreen from '../screens/AddEmailAccountScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CampaignsNavigator from './CampaignsNavigator';

// ------------------ Types ------------------
export type PersonasStackParamList = {
  PersonasList: undefined;
  EditPersona: { personaId: string };
  BuyerPersonas: undefined;
  BusinessQuestionier: undefined;
  BusinessQuestionnaireStep2: undefined;
  BusinessQuestionnaireStep3: undefined;
  BusinessQuestionnaireStep4: undefined;
  BusinessQuestionnaireStep5: undefined;
  BusinessQuestionnaireStep6: undefined;
  BusinessOperations: undefined;
};

export type ContactsStackParamList = {
  ContactsList: undefined;
  AddContact: undefined;
  ContactDetails: { contactId: number };
  EditContact: { contactId: number };
  ImportContacts: undefined;
  ImportContactsVCF: undefined;
  ImportContactsPhone: undefined;
};

export type EmailAccountsStackParamList = {
  EmailAccountsList: undefined;
  AddEmailAccount: undefined;
};

export type SettingsStackParamList = {
  SettingsList: undefined;
  Profile: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Campaigns: undefined;
  Personas: undefined;
  Contacts: undefined;
  Settings: undefined;
  EmailAccounts: undefined;
};

// ------------------ Navigators ------------------
const Tab = createBottomTabNavigator<MainTabParamList>();
const PersonaStack = createStackNavigator<PersonasStackParamList>();
const ContactStack = createStackNavigator<ContactsStackParamList>();
const EmailAccountsStack = createStackNavigator<EmailAccountsStackParamList>();
const SettingsStack = createStackNavigator<SettingsStackParamList>();


function PersonasStackNavigator() {
  return (
    <QuestionnaireProvider>
      <PersonaStack.Navigator screenOptions={{ headerShown: false }}>
        <PersonaStack.Screen
          name="PersonasList"
          component={PersonasScreen}
        />
        <PersonaStack.Screen
          name="EditPersona"
          component={EditPersonaScreen}
        />
        <PersonaStack.Screen
          name="BuyerPersonas"
          component={BuyerPersonasScreen}
        />
        <PersonaStack.Screen
          name="BusinessQuestionier"
          component={BusinessQuestionierScreen}
        />
        <PersonaStack.Screen
          name="BusinessQuestionnaireStep2"
          component={BusinessQuestionnaireStep2Screen}
        />
        <PersonaStack.Screen
          name="BusinessQuestionnaireStep3"
          component={BusinessQuestionnaireStep3Screen}
        />
        <PersonaStack.Screen
          name="BusinessQuestionnaireStep4"
          component={BusinessQuestionnaireStep4Screen}
        />
        <PersonaStack.Screen
          name="BusinessQuestionnaireStep5"
          component={BusinessQuestionnaireStep5Screen}
        />
        <PersonaStack.Screen
          name="BusinessQuestionnaireStep6"
          component={BusinessQuestionnaireStep6Screen}
        />
        <PersonaStack.Screen
          name="BusinessOperations"
          component={BusinessOperationsScreen}
        />
      </PersonaStack.Navigator>
    </QuestionnaireProvider>
  );
}


// Contacts Stack
function ContactsStackNavigator() {
  return (
    <ContactStack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName="ContactsList"
    >
      <ContactStack.Screen
        name="ContactsList"
        component={ContactsScreen}
        options={{ headerShown: false }}
      />
      <ContactStack.Screen
        name="AddContact"
        component={AddContactScreen}
        options={{ headerShown: true, title: 'Add Contact' }}
      />
      <ContactStack.Screen
        name="ContactDetails"
        component={ContactDetailsScreen}
        options={{ headerShown: false }}
      />
      <ContactStack.Screen
        name="EditContact"
        component={AddContactScreen}
        options={{ headerShown: true, title: 'Edit Contact' }}
      />
      <ContactStack.Screen
        name="ImportContacts"
        component={ImportSelectionScreen}
        options={{ headerShown: true, title: 'Import Contacts' }}
      />
      <ContactStack.Screen
        name="ImportContactsVCF"
        component={ImportContactsVCFScreen}
        options={{ headerShown: false }}
      />
      <ContactStack.Screen
        name="ImportContactsPhone"
        component={ImportContactsPhoneScreen}
        options={{ headerShown: false }}
      />
    </ContactStack.Navigator>
  );
}

// Email Accounts Stack
function EmailAccountsStackNavigator() {
  return (
    <EmailAccountsStack.Navigator screenOptions={{ headerShown: false }}>
      <EmailAccountsStack.Screen
        name="EmailAccountsList"
        component={EmailAccountsScreen}
        options={{ headerShown: false }}
      />
      <EmailAccountsStack.Screen
        name="AddEmailAccount"
        component={AddEmailAccountScreen}
        options={{ headerShown: true, title: 'Add Email Account' }}
      />
    </EmailAccountsStack.Navigator>
  );
}

// Settings Stack
function SettingsStackNavigator() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen
        name="SettingsList"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <SettingsStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: true, title: 'Profile' }}
      />
    </SettingsStack.Navigator>
  );
}

// ------------------ Main Navigator ------------------
export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: any }) => ({
        tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Campaigns') {
            iconName = focused ? 'rocket' : 'rocket-outline';
          } else if (route.name === 'Personas') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Contacts') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.text.light,
        tabBarStyle: {
          backgroundColor: COLORS.background.primary,
          borderTopColor: COLORS.border.light,
          borderTopWidth: 1,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Campaigns"
        component={CampaignsNavigator}
        options={{ title: 'Campaigns', headerShown: false }}
      />
      <Tab.Screen
        name="Personas"
        component={PersonasStackNavigator}
        options={{ title: 'Personas', headerShown: false }}
      />
      <Tab.Screen
        name="Contacts"
        component={ContactsStackNavigator}
        options={{ title: 'Contacts', headerShown: false }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStackNavigator}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="EmailAccounts"
        component={EmailAccountsStackNavigator}
        options={{
          title: 'Email Accounts',
          headerShown: false,
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
    </Tab.Navigator>
  );
}
