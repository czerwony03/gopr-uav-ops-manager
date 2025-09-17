const manipulateAsync = jest.fn().mockResolvedValue({
  uri: 'mock://processed-image.jpg',
  width: 800,
  height: 600,
});

const SaveFormat = {
  JPEG: 'jpeg',
  PNG: 'png',
  WEBP: 'webp',
};

const FlipType = {
  Vertical: 'vertical',
  Horizontal: 'horizontal',
};

const RotateType = {
  Rotate90: 90,
  Rotate180: 180,
  Rotate270: 270,
};

module.exports = {
  manipulateAsync,
  SaveFormat,
  FlipType,
  RotateType,
  ImageManipulator: {
    manipulateAsync,
  },
};