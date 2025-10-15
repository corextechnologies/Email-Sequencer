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
  onDiscoverNow: () => void;
  timer?: number;
}

const { width: screenWidth } = Dimensions.get('window');

const DiscoverRightListPopup: React.FC<Props> = ({
  visible,
  onClose,
  onDiscoverNow,
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
          {/* Background Human Figures Pattern */}
          <View style={styles.humanFiguresBackground}>
            <View style={styles.humanFigure1} />
            <View style={styles.humanFigure2} />
            <View style={styles.humanFigure3} />
            <View style={styles.humanFigure4} />
            <View style={styles.humanFigure5} />
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
              DISCOVER THE{'\n'}RIGHT LIST
            </Text>

            {/* Body Text */}
            <Text style={styles.bodyText}>
              Smart outreach starts with{'\n'}
              the right list. Discover{'\n'}
              freelancers who build them{'\n'}
              for you at Bobos.ai
            </Text>

            {/* Discover Now Button */}
            <TouchableOpacity
              style={styles.buttonContainer}
              onPress={onDiscoverNow}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#1E3A8A', '#06B6D4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>DISCOVER NOW</Text>
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
  humanFiguresBackground: {
    position: 'absolute',
    top: -30,
    left: -20,
    right: -20,
    height: 100,
    zIndex: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  humanFigure1: {
    width: 20,
    height: 30,
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    opacity: 0.6,
  },
  humanFigure2: {
    width: 20,
    height: 30,
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    opacity: 0.6,
  },
  humanFigure3: {
    width: 25,
    height: 35,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    opacity: 0.8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  humanFigure4: {
    width: 25,
    height: 35,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    opacity: 0.8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  humanFigure5: {
    width: 20,
    height: 30,
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    opacity: 0.6,
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
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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

export default DiscoverRightListPopup;
