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

export interface MyProducer {
  id: number;
  code: string;
  producerAdd: number;
 
}

export interface CreateProducerRequest {
  code: string;
  producerAdd: number;

}

export interface UpdateProducerRequest {
  producerAdd: number;
}
export interface UpdateProducerRequestAdd {
  producerAdd: number;
}
export interface StatusUpdateMessage {
  id: number;
  code: string;
  producerAdd: number;
   message: string;
 
}



