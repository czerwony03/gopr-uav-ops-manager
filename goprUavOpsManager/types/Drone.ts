export interface Drone {
  id: string;
  name: string;
  location: string;
  registrationNumber: string;
  totalFlightTime: number; // in hours - TODO: will be calculated based on flights list in the future
  equipmentRegistrationNumber: string;
  yearOfCommissioning: number;
  yearOfManufacture: number;
  insurance: 'Aerocasco' | 'Care';
  callSign: string;
  weight: number; // in kg
  maxTakeoffWeight: number; // in kg
  operatingTime: number; // in hours
  range: number; // in km
  dimensions: {
    length: number; // in cm
    width: number; // in cm
    height: number; // in cm
  };
  battery: {
    type: string;
    capacity: number; // in mAh
    voltage: number; // in V
  };
  maxSpeed: number; // in km/h
  userManual?: string; // URL to user manual document
}