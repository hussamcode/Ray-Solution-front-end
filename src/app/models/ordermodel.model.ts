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

  acceptableAT: string | null;
  deliveryAt: string | null;

  status: statetype;

  phonenumber: string;
  name: string;
  establishmentname: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
}

export interface CreateOrderRequest {
  producerCode: string;
}

export interface UpdateOrderRequest {
  producerCode: string;
}
export interface UpdateStateRequest {
  status: statetype;
  deliveryAt?: string;
}

export interface UpdateInformationRequest {
  establishmentname: string;
  name: string;
  phonenumber: string;
  status: statetype;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
}

export interface UpdateLocationRequest {
  latitude: number | null;
  longitude: number | null;
  address: string;
}

export interface OrderUpdate {
  id: number;
  userId?: number;
  code?: string;
  producerCode?: string[];
  acceptableAT?: string;
  status?: statetype;
  phonenumber?: string;
  deliveryAt?: string;
  name?: string;
  establishmentname?: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  message: 'deleted' | 'updated' | 'created';
}


