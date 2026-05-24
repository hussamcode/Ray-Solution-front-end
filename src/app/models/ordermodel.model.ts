import { SafeUrl } from "@angular/platform-browser";
import { Data } from "@angular/router";

export const State = {
  AWAITING_CONFIRMATION: 'Awaiting Confirmation',
  PENDING_APPROVAL: 'Pending Approval',
  PROCESSING: 'Processing',
  PROCESSED: 'Processed',
  DELIVERED: 'Delivered',
  REJECTED: 'Rejected'
} as const;
export type statetype = keyof typeof State;

export interface ordermodel {
  id: number;
  userId: number;
  code: string;
  producerCode: string[];

  acceptableAT: Date | null;
  deliveryAt: Date | null;

  status: statetype;

  phonenumber: number;
  name: string;
  establishmentname: string;
}

export interface CreateOrderRequest {
  producerCode: string;

}

export interface UpdateOrderRequest {
  producerCode: string;
}
export interface UpdateStateRequest {
 status: statetype;
  deliveryAt?: Date;
}

export interface StatusUpdateMessage {
  id: number;
  userId: number;
  code: string;
  producerCode: string[];
   acceptableAT: string;
     deliveryAt: Data;
 status:statetype;
 phonenumber:number;
 name:string;
 establishmentname:string;
 message: string;
}
export interface UpdateInformationRequest{
  establishmentname:string;
  name:string;
  phonenumber:string;
  status:statetype;
}
export interface OrderUpdate {
  id: number;
  userId?: number;
  code?: string;
  producerCode?: string[];
  acceptableAT?: Date;
  status?: statetype;
  phonenumber?: number;
  name?: string;
  establishmentname?: string;
  message: 'deleted' | 'updated' | 'created';
}


