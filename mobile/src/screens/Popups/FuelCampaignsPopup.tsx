import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  onFuelNow: () => void;
  timer?: number;
}

const { width: screenWidth } = Dimensions.get('window');

const FuelCampaignsPopup: React.FC<Props> = ({
  visible,
  onClose,
  onFuelNow,
  timer = 0,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.popupContainer}>
          {/* Background Abstract Pattern */}
          <View style={styles.abstractBackground}>
            <View style={styles.abstractShape1} />
            <View style={styles.abstractShape2} />
            <View style={styles.abstractShape3} />
          </View>

          {/* Timer */}
          {timer > 0 && (
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{timer}</Text>
            </View>
          )}

          {/* Main Content */}
          <View style={styles.content}>
            {/* Heading */}
            <Text style={styles.heading}>
              FUEL YOUR{'\n'}CAMPAIGNS
            </Text>

            {/* Body Text */}
            <Text style={styles.bodyText}>
              Your emails work better with the right audience.{'\n'}
              Find freelancers for list building at Bobos.ai
            </Text>

            {/* Fuel Now Button */}
            <TouchableOpacity
              style={styles.buttonContainer}
              onPress={onFuelNow}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#0F766E', '#06B6D4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>FUEL NOW</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Bobos.ai Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../../assets/boboslogo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popupContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: screenWidth - 40,
    maxWidth: 350,
    minHeight: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  abstractBackground: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    height: 200,
    zIndex: 0,
  },
  abstractShape1: {
    position: 'absolute',
    top: 20,
    left: 30,
    width: 80,
    height: 80,
    backgroundColor: '#E0F2FE',
    borderRadius: 40,
    opacity: 0.6,
    transform: [{ rotate: '15deg' }],
  },
  abstractShape2: {
    position: 'absolute',
    top: 60,
    right: 40,
    width: 60,
    height: 60,
    backgroundColor: '#F3E8FF',
    borderRadius: 30,
    opacity: 0.5,
    transform: [{ rotate: '-20deg' }],
  },
  abstractShape3: {
    position: 'absolute',
    top: 100,
    left: 60,
    width: 40,
    height: 40,
    backgroundColor: '#FCE7F3',
    borderRadius: 20,
    opacity: 0.4,
    transform: [{ rotate: '45deg' }],
  },
  content: {
    padding: 30,
    paddingTop: 40,
    alignItems: 'center',
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 28,
    letterSpacing: 0.5,
  },
  bodyText: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 30,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  logoContainer: {
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
  },
  logo: {
    width: 120,
    height: 35,
  },
  timerContainer: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default FuelCampaignsPopup;
