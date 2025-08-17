import { UserRole } from '../contexts/AuthContext';

export type Qualification = 
  | 'A1' | 'A2' | 'A3' 
  | 'NSTS01' | 'NSTS02' | 'NSTS03' | 'NSTS04' | 'NSTS05' | 'NSTS06'
  | 'STS01' | 'STS02';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  
  // Personal Information
  firstname?: string;
  surname?: string;
  phone?: string;
  residentialAddress?: string;
  
  // Operator Information
  operatorNumber?: string;
  operatorValidityDate?: Date;
  
  // Pilot Information
  pilotNumber?: string;
  pilotValidityDate?: Date;
  
  // License Information
  licenseConversionNumber?: string;
  
  // Qualifications / Authorizations
  qualifications?: Qualification[];
  
  // Insurance
  insurance?: Date;
  
  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
}

// Form data interface for user forms (uses string dates for easier form handling)
export interface UserFormData {
  email: string;
  role: UserRole;
  firstname: string;
  surname: string;
  phone: string;
  residentialAddress: string;
  operatorNumber: string;
  operatorValidityDate: string; // YYYY-MM-DD format
  pilotNumber: string;
  pilotValidityDate: string; // YYYY-MM-DD format
  licenseConversionNumber: string;
  qualifications: Qualification[];
  insurance: string; // YYYY-MM-DD format
}

// Available qualifications for multi-select
export const AVAILABLE_QUALIFICATIONS: Qualification[] = [
  'A1', 'A2', 'A3',
  'NSTS01', 'NSTS02', 'NSTS03', 'NSTS04', 'NSTS05', 'NSTS06',
  'STS01', 'STS02'
];