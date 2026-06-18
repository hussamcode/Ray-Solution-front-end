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
   private destoryRef = inject(DestroyRef);
  private client!: Client;
  private connected$ = new BehaviorSubject<boolean>(false);
  private stausUpdate$ = new BehaviorSubject<null | StatusUpdateMessage>(null);
  private orderUpdate$ = new BehaviorSubject<OrderUpdate | null>(null);

  private subscriptions = new Map<string, StompSubscription>();

  constructor() {
    this.initClient();

    this.destoryRef.onDestroy(() => {
      this.disconnect();
      this.stausUpdate$.complete();
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
        console.log('[Websocket] Connected!!');
         this.connected$.next(true);
         this.subscripeToTopics();
      },
      onDisconnect: ()=>{
        console.log('[Websocket] Disconnect!!');
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
        console.log('[WebSocket] WebSocket closed:', event.code, event.reason);
        this.connected$.next(false);
      },
    });
    
  }
    connect(): void {
    if (this.client.active) {
      console.log('[Websocket] Already connected or connecting');
      return;
    }
    this.client.activate();
  }

  getStatusUpdates(): Observable<StatusUpdateMessage | null> {
    return this.stausUpdate$.asObservable();
  }

  isConnected(): Observable<boolean> {
    return this.connected$.asObservable();
  }
  private subscripeToTopics(): void {
    const subscription = this.client.subscribe('/topic/producer', (message) => {
      try {
        const update = JSON.parse(message.body) as StatusUpdateMessage;
        console.log('[WebSocket] Received update:', update);
        this.stausUpdate$.next(update);
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    });
        this.client.subscribe('/topic/order', (message) => {
        console.log('[WebSocket] Order update:', message.body);
        const update = JSON.parse(message.body);
        this.orderUpdate$.next(update);
    });
  
    this.subscriptions.set('/topic/producer', subscription);
  }
  getOrderUpdates(): Observable<OrderUpdate | null> {
    return this.orderUpdate$.asObservable();
}
   disconnect(): void {
    if (this.client.active) {
      console.log('[WebSocket] Disconnecting...');

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