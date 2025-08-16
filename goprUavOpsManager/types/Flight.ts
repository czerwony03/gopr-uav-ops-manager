export interface Flight {
  id: string;
  userId: string; // owner's Firebase Auth UID
  userEmail?: string; // snapshot for reference
  date: string; // YYYY-MM-DD
  location: string;
  flightCategory: string; // Kategoria lotu
  operationType: string; // Rodzaj operacji
  activityType: string; // Rodzaj działań
  droneId: string; // reference to drones.id
  droneName?: string; // snapshot for easy list display
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  conditions: string; // Warunki
  createdAt?: Date; // timestamp when created
  updatedAt?: Date; // timestamp when last updated
}