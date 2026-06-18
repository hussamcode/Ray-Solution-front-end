import { DestroyRef, inject, Injectable } from "@angular/core";
import { Client, StompSubscription, Versions } from "@stomp/stompjs";
import { BehaviorSubject, Observable } from "rxjs";
import { environment } from "../../environments/environment";
import { StatusUpdateMessage } from "../models/producer.model";
import { OrderUpdate } from "../models/ordermodel.model";

@Injectable(
  {providedIn:'root'}
)
export class WebsocketService {
   private destroyRef = inject(DestroyRef);
  private client!: Client;
  private connected$ = new BehaviorSubject<boolean>(false);
  private statusUpdate$ = new BehaviorSubject<null | StatusUpdateMessage>(null);
  private orderUpdate$ = new BehaviorSubject<OrderUpdate | null>(null);

  private subscriptions = new Map<string, StompSubscription>();

  constructor() {
    this.initClient();

    this.destroyRef.onDestroy(() => {
      this.disconnect();
      this.statusUpdate$.complete();
      this.orderUpdate$.complete();
      this.connected$.complete();
    });
  }


  initClient(): void{
    this.client = new Client({
      brokerURL: environment.wsUrl,
      stompVersions: Versions.default,
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      connectionTimeout: 10000,

      onConnect: (frame) => {
         this.connected$.next(true);
         this.subscribeToTopics();
      },
      onDisconnect: ()=>{
        this.connected$.next(false);
        this.subscriptions.clear();
      },
      onStompError: (frame) => {
        console.error('[WebSocket] STOMP error:', frame.headers['message']);
        console.error('[WebSocket] Error details:', frame.body);
        this.connected$.next(false);
      },

      onWebSocketError: (event) => {
        console.error('[WebSocket] WebSocket error:', event);
        this.connected$.next(false);
      },

      onWebSocketClose: (event) => {
        this.connected$.next(false);
      },
    });
    
  }
    connect(): void {
    if (this.client.active) {
      return;
    }
    this.client.activate();
  }

  getStatusUpdates(): Observable<StatusUpdateMessage | null> {
    return this.statusUpdate$.asObservable();
  }

  isConnected(): Observable<boolean> {
    return this.connected$.asObservable();
  }
  private subscribeToTopics(): void {
    const subscription = this.client.subscribe('/topic/producer', (message) => {
      try {
        const update = JSON.parse(message.body) as StatusUpdateMessage;
        this.statusUpdate$.next(update);
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    });
        const orderSubscription = this.client.subscribe('/topic/order', (message) => {
        try {
        const update = JSON.parse(message.body) as OrderUpdate;
        this.orderUpdate$.next(update);
        } catch (error) {
        console.error('[WebSocket] Failed to parse order message:', error);
        }
    });
  
    this.subscriptions.set('/topic/producer', subscription);
    this.subscriptions.set('/topic/order', orderSubscription);
  }
  getOrderUpdates(): Observable<OrderUpdate | null> {
    return this.orderUpdate$.asObservable();
}
   disconnect(): void {
    if (this.client.active) {
      // Unsubscribe from all topics
      this.subscriptions.forEach((subscription) => {
        subscription.unsubscribe();
      });
      this.subscriptions.clear();

      // Deactivate the client
      this.client.deactivate();
    }
  }
  

}