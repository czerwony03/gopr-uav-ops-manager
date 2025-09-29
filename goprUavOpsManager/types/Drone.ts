export interface DroneEquipmentItem {
  id: string;
  name: string;
  quantity: number;
  image?: string; // URL to equipment image
}

export interface EquipmentStorage {
  id: string;
  name: string;
  items: DroneEquipmentItem[];
}

export interface Drone {
  id: string;
  name: string;
  inventoryCode: string;
  location: string;
  registrationNumber: string;
  totalFlightTime: number; // in minutes - TODO: will be calculated based on flights list in the future
  equipmentRegistrationNumber: string;
  yearOfCommissioning: number;
  yearOfManufacture: number;
  insurance: string;
  callSign: string;
  weight: number; // in grams
  maxTakeoffWeight: number; // in grams
  operatingTime: number; // in minutes
  range: number; // in meters
  dimensions: {
    length: number; // in mm
    width: number; // in mm
    height: number; // in mm
  };
  battery: {
    type: string;
    capacity: number; // in mAh
    voltage: number; // in V
  };
  maxSpeed: number; // in km/h
  userManual?: string; // URL to user manual document
  additionalInfo?: string; // Additional information about the drone
  shareable?: boolean; // Whether this drone can be claimed by users
  images?: string[]; // Array of image URLs
  equipmentList?: DroneEquipmentItem[]; // Array of equipment items (deprecated, for migration)
  equipmentStorages?: EquipmentStorage[]; // Array of equipment storages (new structure)
  isDeleted?: boolean; // soft-delete flag
  deletedAt?: Date; // timestamp when deleted
  createdAt?: Date; // timestamp when created
  updatedAt?: Date; // timestamp when last updated
  createdBy?: string; // user ID who created it
  updatedBy?: string; // user ID who last updated it
}