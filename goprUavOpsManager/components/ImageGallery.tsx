import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import ImageViewer from './ImageViewer';

interface ImageGalleryProps {
  images: string[];
  title?: string;
  emptyMessage?: string;
  numColumns?: number;
  imageStyle?: any;
  containerStyle?: any;
}

/**
 * Reusable image gallery component that displays a grid of images
 * and opens them in the ImageViewer when tapped
 */
export default function ImageGallery({
  images,
  title,
  emptyMessage,
  numColumns = 2,
  imageStyle,
  containerStyle,
}: ImageGalleryProps) {
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Handle opening image viewer
  const handleImagePress = useCallback((index: number) => {
    setSelectedImageIndex(index);
    setImageViewerVisible(true);
  }, []);

  // Convert images array to ImageViewer format
  const imageViewerData = images.map(uri => ({ uri }));

  // Render individual image item
  const renderImageItem = useCallback(({ item: imageUri, index }: { item: string; index: number }) => (
    <TouchableOpacity
      key={`image-${index}`}
      style={[styles.imageItem, imageStyle]}
      onPress={() => handleImagePress(index)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: imageUri }}
        style={styles.image}
        resizeMode="cover"
      />
    </TouchableOpacity>
  ), [handleImagePress, imageStyle]);

  if (!images || images.length === 0) {
    return emptyMessage ? (
      <View style={[styles.container, containerStyle]}>
        {title && <Text style={styles.title}>{title}</Text>}
        <Text style={styles.emptyMessage}>{emptyMessage}</Text>
      </View>
    ) : null;
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      <FlatList
        data={images}
        renderItem={renderImageItem}
        numColumns={numColumns}
        keyExtractor={(item, index) => `image-${index}`}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
      />

      <ImageViewer
        images={imageViewerData}
        imageIndex={selectedImageIndex}
        visible={imageViewerVisible}
        onRequestClose={() => setImageViewerVisible(false)}
        onImageIndexChange={setSelectedImageIndex}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  grid: {
    paddingBottom: 8,
  },
  row: {
    justifyContent: 'space-between',
  },
  imageItem: {
    flex: 1,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  image: {
    width: '100%',
    height: 120,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});