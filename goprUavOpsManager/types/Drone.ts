export interface Drone {
  id: string;
  name: string;
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
  isDeleted?: boolean; // soft-delete flag
  deletedAt?: Date; // timestamp when deleted
  createdAt?: Date; // timestamp when created
  updatedAt?: Date; // timestamp when last updated
}