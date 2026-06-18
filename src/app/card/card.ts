import { Component, inject, Input, OnInit, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { ProducerService } from '../services/producer-service';
import { WebsocketService } from '../services/websocket-service';
import { OrderService } from '../services/OrderService';
import { Producer } from '../models/producer.model';
import { ordermodel, OrderUpdate } from '../models/ordermodel.model';

@Component({
  selector: 'app-card',
  imports: [],
  templateUrl: './card.html',
  styleUrl: './card.css',
})
export class Card implements OnInit {
  private producerService = inject(ProducerService);
  private webSocketService = inject(WebsocketService);
  public orderService = inject(OrderService);
  private destroyRef = inject(DestroyRef);

  errorMessage = signal<string>('');
  isSubmitting = signal<boolean>(false);
  producer = signal<Producer | null>(null);
  orderarry = signal<ordermodel[]>([]);
  isLoading = signal<boolean>(false);

  @Input() name: string = '';
  @Input() url: string | null = '';
  @Input() description: string = '';
  @Input() IdProducer: number = 0;
  @Input() producerAdd: number = 0;

  // public pendingOrder = computed(() =>
  //   this.orderarry().find((o) => o.status === 'AWAITING_CONFIRMATION'),
  // );

  ngOnInit(): void {
    this.loadShipment();
    this.loadOrders();
    this.handleWebSocketUpdates();
    this.handleOrderUpdates();
  }

  private handleWebSocketUpdates(): void {
    this.webSocketService
      .getStatusUpdates()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((update) => {
        if (!update) return;

        if (update.id === this.producer()?.id) {
          if (update.message === 'deleted') {
            this.producer.set(null);
          } else {
            this.producer.update((p) => p ? {
              ...p,
              producerAdd: update.producerAdd,
              stowage: update.stowage,
            } : null);
          }
        }
      });
  }
  private handleOrderUpdates(): void {
    this.webSocketService
      .getOrderUpdates()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((update: OrderUpdate | null) => {

        if (!update) return;

        this.orderarry.update((list: ordermodel[]) => {

          if (update.message === 'deleted') {
            return list.filter((o) => o.id !== update.id);
          }

          const exists = list.find((o) => o.id === update.id);

          if (!exists) {
            return [
              ...list,
              {
                id: update.id,
                userId: update.userId ?? 0,
                code: update.code ?? '',
                producerCode: update.producerCode ?? [],
                status: update.status ?? 'AWAITING_CONFIRMATION',
                acceptableAT: update.acceptableAT ?? '', // ✅ string
                phonenumber: update.phonenumber ?? '',   // ✅ string
                name: update.name ?? '',
                establishmentname: update.establishmentname ?? '',
                deliveryAt: update.deliveryAt ?? ''     
              }
            ];
          }

          return list.map((o) =>
            o.id !== update.id
              ? o
              : {
                  ...o,
                  producerCode: update.producerCode ?? o.producerCode,
                  status: update.status ?? o.status,
                  acceptableAT: update.acceptableAT ?? o.acceptableAT,
                  phonenumber: update.phonenumber ?? o.phonenumber,
                  name: update.name ?? o.name,
                  establishmentname: update.establishmentname ?? o.establishmentname,
                  deliveryAt: update.deliveryAt ?? o.deliveryAt // ✅ أضف هذا
                }
          );
        });
      });
  }


  async orderproducer(): Promise<void> {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.errorMessage.set('');

 this.orderService
      .getAllOrder()
      .pipe(
        catchError(() => {
          this.errorMessage.set('Failed to load orders');
          return of([]);
        }),
      )
      .subscribe((orders) => {
        this.orderarry.set(orders);
       
      const pending = this.orderarry().find((o) => o.status === 'AWAITING_CONFIRMATION');
    console.log(pending);
    const prod = this.producer();
    if (!prod) return;

    if (!pending) {
      this.orderService
        .createOrder({
          producerCode: prod.code,
        })
        .subscribe({
          next: (res) => {
            let all = this.orderarry();
            
            this.orderarry.update((list) => [...list, res]);
            this.isSubmitting.set(false);
          },
   
          error: () => {
            this.errorMessage.set('Failed to create order');
            this.isSubmitting.set(false);
          },
        });
    } else {
      this.orderService
        .updateOrder(pending.code, {
          producerCode: prod.code,
        })
        .subscribe({
          next: (res) => {
            this.orderarry.update((list) => list.map((o) => (o.id === res.id ? res : o)));
            this.isSubmitting.set(false);
          },
          error: () => {
            this.errorMessage.set('Failed to update order');
            this.isSubmitting.set(false);
          },
        });
    }


      });
  }

  loadShipment(): void {
    this.isLoading.set(true);
    this.producerService
      .getProducerByID(this.IdProducer)
      .pipe(
        catchError(() => {
          this.errorMessage.set('Failed to load producer');
          this.isLoading.set(false);
          return of(null);
        }),
      )
      .subscribe((producer) => {
        this.producer.set(producer);
        this.isLoading.set(false);
      });
  }

  loadOrders(): void {
    this.orderService
      .getAllOrder()
      .pipe(
        catchError(() => {
          this.errorMessage.set('Failed to load orders');
          return of([]);
        }),
      )
      .subscribe((orders) => {
        this.orderarry.set(orders);

      });
  }
}
