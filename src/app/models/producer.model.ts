export const Brand = {
  Other: 'Other',
  Samsung: 'Samsung',
  Apple: 'Apple',
  Huawei: 'Huawei',
  HP: 'HP',
  Dell: 'Dell',
  Razer: 'Razer',
  Sony:'Sony',
} as const;
export type brandtype = keyof typeof Brand;

export interface Producer {
  id: number;
  code: string;
  name: string;
  description: string;
  brand: brandtype;
  stowage: number;
  producerAdd: number;
  image: string | null;
  active: boolean;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
}

export interface CreateProducerRequest {
  code: string;
  name: string;
  description: string;
  brand: brandtype;
  stowage: number;
  image: string | null;
  active: boolean;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
}

export interface UpdateProducerRequest {
  code: string;
  name: string;
  description: string;
  brand: brandtype;
  stowage: number;
  image: string | null;
  active: boolean;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
}
export interface UpdateProducerRequestAdd {
  producerAdd: number;
}
export interface StatusUpdateMessage {
  status: "AWAITING_CONFIRMATION" | "PENDING_APPROVAL" | "PROCESSING" | "PROCESSED" | "DELIVERED" | "REJECTED";
  acceptableAT: string;
  userId: number;
  producerCode: string[];
  id: number;
  code: string;
  name: string;
  description: string;
  brand: brandtype;
  stowage: number;
  producerAdd: number;
  image: string | null;
  active: boolean;
  message: string;
}

export interface ProducerLocation {
  id: number;
  code: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}



