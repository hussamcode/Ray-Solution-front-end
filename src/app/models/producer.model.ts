import { SafeUrl } from "@angular/platform-browser";

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
  image: any;
 
}

export interface CreateProducerRequest {
  code: string;
  name: string;
  description: string;
  brand: brandtype;
  stowage: number;
  image: any;
}

export interface UpdateProducerRequest {
  code: string;
  name: string;
  description: string;
  brand: brandtype;
  stowage: number;
  image: any;
}
export interface UpdateProducerRequestAdd {
 producerAdd: any;
}
 export interface ImageItem{
   id: number;
  url: SafeUrl;
}
export interface StatusUpdateMessage {
  status: "AWAITING_CONFIRMATION" | "PENDING_APPROVAL" | "PROCESSING" | "PROCESSED" | "DELIVERED";
  acceptableAT: string;
  userId: any;
  producerCode: any;
  id: number;
  code: string;
  name:string;
  description: string;
  brand: brandtype;
  stowage: number;
  producerAdd: number;
  image: any;
  message: string;
}



