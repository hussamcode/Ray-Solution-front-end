import {
  Component,
  computed,
  DestroyRef,
  inject,
  Input,
  OnInit,
  signal
} from '@angular/core';

import { ordermodel, OrderUpdate } from '../models/ordermodel.model';
import { WebsocketService } from '../services/websocket-service';
import { OrderService } from '../services/OrderService';
import { catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProducerService } from '../services/producer-service';
import { Producer } from '../models/producer.model';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-takitorder',
  templateUrl: './takitorder.html',
    imports: [CommonModule],
  styleUrl: './takitorder.css',
})
export class Takitorder implements OnInit {

  @Input() ordercode: string = '';

  private webSocketService = inject(WebsocketService);
  public orderService = inject(OrderService);
  private producerService = inject(ProducerService);
  private destroyRef = inject(DestroyRef);

  // ✅ signals
  ordertake = signal<ordermodel | null>(null);
  producerall = signal<Producer[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  private router = inject(Router); // ✅ inject بدل constructor

  // ✅ computed state
  public state = computed(() => {
    switch (this.ordertake()?.status) {

      case 'AWAITING_CONFIRMATION':
        return 'Awaiting Confirmation';

      case 'PENDING_APPROVAL':
        return 'Pending Approval';

      case 'PROCESSING':
        return 'Processing';

      case 'PROCESSED':
        return 'Processed';

      case 'DELIVERED':
        return 'Delivered';

      default:
        return 'Under Review';
    }
  });

  ngOnInit(): void {
    this.loadOrders();
     this.handleOrderUpdates();
    this.handleWebSocketUpdates();
  }

  // =========================
  // Load Order
  // =========================
  loadOrders(): void {
    this.orderService
      .getOrderByCode(this.ordercode)
      .pipe(
        catchError(() => {
          this.errorMessage.set('Failed to load order');
          return of(null);
        })
      )
      .subscribe((order) => {

        if (!order) return;

        this.ordertake.set(order);
        this.loadproducer();
      });
  }

  // =========================
  // Load Producers
  // =========================
  loadproducer(): void {
    this.isLoading.set(true);

    const codes = this.ordertake()?.producerCode ?? [];

    this.producerall.set([]); // reset

    if (codes.length === 0) {
      this.isLoading.set(false);
      return;
    }

    let loaded = 0;
    codes.forEach(code => {
      this.producerService
        .getProducerByCode(code)
        .pipe(
          catchError(() => {
            this.errorMessage.set('Failed to load producer');
            return of(null);
          })
        )
        .subscribe((producer) => {

          if (producer) {
            this.producerall.update(arr => [...arr, producer]);
          }

          loaded++;
          if (loaded === codes.length) {
            this.isLoading.set(false);
          }
        });
    });
  }

  // =========================
  // Order WebSocket Updates
  // =========================
  private handleOrderUpdates(): void {
    this.webSocketService
      .getOrderUpdates()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((update: OrderUpdate | null) => {

        if (!update) return;

        if (update.message === 'deleted') {
          this.ordertake.set(null);
          return;
        }

        this.ordertake.update(ordertake => {

          if (!ordertake) return null;
          if (ordertake.id !== update.id) return ordertake;

          return {
            ...ordertake,
            producerCode: update.producerCode ?? ordertake.producerCode,
            status: update.status ?? ordertake.status,
            acceptableAT: update.acceptableAT ?? ordertake.acceptableAT,
            deliveryAt: update.deliveryAt ?? ordertake.deliveryAt,
            phonenumber: update.phonenumber ?? ordertake.phonenumber,
            name: update.name ?? ordertake.name,
            establishmentname: update.establishmentname ?? ordertake.establishmentname
          };
        });
      });
  }

  // =========================
  // Producer WebSocket Updates
  // =========================
  private handleWebSocketUpdates(): void {
    this.webSocketService
      .getStatusUpdates()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((update) => {

        if (!update) return;

        if (update.message === 'deleted') {

          this.producerall.update(arr =>
            arr.filter(p => p.id !== update.id)
          );

        } else {

          this.producerall.update(arr =>
            arr.map(p =>
              p.id === update.id
                ? {
                    ...p,
                    producerAdd: update.producerAdd,
                    stowage: update.stowage,
                  }
                : p
            )
          );
        }
      });
  }
  Confirmation(): void {
    this.router.navigate(['confirm-request']);
  }

  changeLocation(): void {
    this.router.navigate(['/order-location'], { queryParams: { code: this.ordercode } });
  }

  formatDate(value: string | null | undefined) {
  if (!value) return null;

  // حذف microseconds الزائدة
  const cleanDate = value.split('.')[0];

  return new Date(cleanDate);
}
}