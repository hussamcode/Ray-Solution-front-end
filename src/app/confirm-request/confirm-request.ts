import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { ordermodel, UpdateInformationRequest } from '../models/ordermodel.model';
import { Producer } from '../models/producer.model';
import { WebsocketService } from '../services/websocket-service';
import { OrderService } from '../services/OrderService';
import { ProducerService } from '../services/producer-service';
import { catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Header } from '../header/header';
import { FormsModule } from '@angular/forms';
import { Footer } from '../footer/footer';
import { Router } from '@angular/router';

@Component({
  selector: 'app-confirm-request',
  imports: [Header, FormsModule, Footer],
  templateUrl: './confirm-request.html',
  styleUrl: './confirm-request.css',
})
export class ConfirmRequest implements OnInit {

  // ✅ نوع صحيح
  Information: UpdateInformationRequest = {
    establishmentname: '',
    name: '',
    phonenumber: '',
    status:'PENDING_APPROVAL'
  };

  private webSocketService = inject(WebsocketService);
  private orderService = inject(OrderService);
  private producerService = inject(ProducerService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router); // ✅ inject بدل constructor

  orderconfirm = signal<ordermodel[]>([]);
  producerall = signal<Producer[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  isSubmitting = signal(false); 

  pendingOrder = computed(() =>
    this.orderconfirm().find(o => o.status === 'AWAITING_CONFIRMATION')
  );

  ngOnInit(): void {
    this.loadOrders();
    this.handleOrderUpdates();
    this.handleWebSocketUpdates();
  }

  loadOrders(): void {
    this.isLoading.set(true);
    this.orderService.getAllOrder().pipe(
      catchError(() => {
        this.errorMessage.set('Failed to load orders');
        this.isLoading.set(false);
        return of([]);
      })
    ).subscribe((orders: ordermodel[]) => {
      this.orderconfirm.set(orders);
      this.isLoading.set(false);
      this.loadproducer();
    });
  }

  loadproducer(): void {
    const order = this.pendingOrder();
    if (!order) return;

    this.isLoading.set(true);
    this.producerall.set([]);

    const codes = order.producerCode ?? [];

    let loaded = 0;
    codes.forEach(code => {
      this.producerService.getProducerByCode(code).pipe(
        catchError(() => {
          this.errorMessage.set(`Failed to load producer: ${code}`);
          return of(null);
        })
      ).subscribe((producer: Producer | null) => {
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

  private handleOrderUpdates(): void {
    this.webSocketService.getOrderUpdates().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((update) => {
      if (!update) return;

      this.orderconfirm.update(list => {
        if (update.message === 'deleted') {
          return list.filter(o => o.id !== update.id);
        }

        const exists = list.find(o => o.id === update.id);

        if (!exists) return [...list, update];

        return list.map(o =>
          o.id === update.id ? { ...o, ...update } : o
        );
      });

      this.loadproducer();
    });
  }

  private handleWebSocketUpdates(): void {
    this.webSocketService.getStatusUpdates().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((update) => {
      if (!update) return;

      if (update.message === 'deleted') {
        this.producerall.update(arr =>
          arr.filter(p => p.id !== update.id)
        );
        return;
      }

      this.producerall.update(arr =>
        arr.map(p =>
          p.id !== update.id ? p : {
            ...p,
            producerAdd: update.producerAdd,
            stowage: update.stowage,
          }
        )
      );
    });
  }

  submitOrder(): void {
    const pending = this.pendingOrder();
    if (!pending || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.orderService.updateOrderInformation(pending.code, this.Information)
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigate(['/successfulorder', pending.code]);
        },
        error: () => {
          this.errorMessage.set('Failed to submit order');
          this.isSubmitting.set(false);
        }
      });
  }
}