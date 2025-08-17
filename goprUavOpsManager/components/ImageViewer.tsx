import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ImageItem {
  uri: string;
}

interface ImageViewerProps {
  images: ImageItem[];
  imageIndex: number;
  visible: boolean;
  onRequestClose: () => void;
  onImageIndexChange?: (index: number) => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ImageViewer({
  images,
  imageIndex,
  visible,
  onRequestClose,
  onImageIndexChange,
}: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(imageIndex);

  const handleIndexChange = useCallback((index: number) => {
    setCurrentIndex(index);
    onImageIndexChange?.(index);
  }, [onImageIndexChange]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      handleIndexChange(currentIndex - 1);
    }
  }, [currentIndex, handleIndexChange]);

  const handleNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      handleIndexChange(currentIndex + 1);
    }
  }, [currentIndex, images.length, handleIndexChange]);

  React.useEffect(() => {
    setCurrentIndex(imageIndex);
  }, [imageIndex]);

  if (!visible || images.length === 0) {
    return null;
  }

  const currentImage = images[currentIndex];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.backdrop}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onRequestClose}>
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>

          {/* Image container with scroll view for zoom */}
          <ScrollView
            style={styles.imageScrollView}
            contentContainerStyle={styles.imageContainer}
            maximumZoomScale={3}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            centerContent
          >
            <Image
              source={{ uri: currentImage.uri }}
              style={styles.image}
              contentFit="contain"
              transition={200}
            />
          </ScrollView>

          {/* Navigation buttons (only show if multiple images) */}
          {images.length > 1 && (
            <>
              {currentIndex > 0 && (
                <TouchableOpacity
                  style={[styles.navButton, styles.prevButton]}
                  onPress={handlePrevious}
                >
                  <Ionicons name="chevron-back" size={32} color="#fff" />
                </TouchableOpacity>
              )}

              {currentIndex < images.length - 1 && (
                <TouchableOpacity
                  style={[styles.navButton, styles.nextButton]}
                  onPress={handleNext}
                >
                  <Ionicons name="chevron-forward" size={32} color="#fff" />
                </TouchableOpacity>
              )}

              {/* Image counter */}
              <View style={styles.counter}>
                <Ionicons name="images-outline" size={16} color="#fff" />
                <View style={styles.counterText}>
                  <Ionicons name="ellipse" size={8} color="#fff" style={{ marginHorizontal: 2 }} />
                  {images.map((_, index) => (
                    <Ionicons
                      key={index}
                      name={index === currentIndex ? "ellipse" : "ellipse-outline"}
                      size={8}
                      color="#fff"
                      style={{ marginHorizontal: 2 }}
                    />
                  ))}
                  <Ionicons name="ellipse" size={8} color="#fff" style={{ marginHorizontal: 2 }} />
                </View>
              </View>
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  imageScrollView: {
    flex: 1,
    width: screenWidth,
    height: screenHeight,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: screenHeight,
  },
  image: {
    width: screenWidth - 40,
    height: screenHeight - 160,
    maxWidth: screenWidth - 40,
    maxHeight: screenHeight - 160,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    padding: 12,
    zIndex: 2,
  },
  prevButton: {
    left: 20,
  },
  nextButton: {
    right: 20,
  },
  counter: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 60 : 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  counterText: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
});