import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { Header } from "../header/header";
import { Takitorder } from "../takitorder/takitorder";
import { OrderService } from '../services/OrderService';
import { ordermodel, OrderUpdate } from '../models/ordermodel.model';
import { WebsocketService } from '../services/websocket-service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-order',
  standalone: true,
  imports: [Header, Takitorder, RouterLink, RouterLinkActive],
  templateUrl: './order.html',
  styleUrl: './order.css',
})
export class order implements OnInit { // ✅ حرف كبير

  private orderService = inject(OrderService);
  private webSocketService = inject(WebsocketService);
  private destroyRef = inject(DestroyRef);

  orderarry = signal<ordermodel[]>([]);
  errorMessage = signal<string>('');
  isLoading = signal<boolean>(false);
  selectedFilter = signal<'ALL' | 'PENDING' | 'COMPLETED' | 'REJECTED'>('ALL');

  filteredOrders = computed(() => {
    const orders = this.orderarry();
    switch (this.selectedFilter()) {
      case 'PENDING':
        return orders.filter(o =>
          ['AWAITING_CONFIRMATION', 'PENDING_APPROVAL', 'PROCESSING', 'PROCESSED'].includes(o.status)
        );
      case 'COMPLETED':
        return orders.filter(o => o.status === 'DELIVERED');
      case 'REJECTED':
        return orders.filter(o => o.status === 'REJECTED');
      default:
        return orders;
    }
  });

  ngOnInit(): void {
    this.webSocketService.connect();
    this.loadOrders();
    this.handleOrderUpdates(); // ✅ أضف هذا
  }

  loadOrders(): void {
    this.isLoading.set(true);
    this.orderService.getAllOrder().pipe(
      catchError(() => {
        this.errorMessage.set('Failed to load orders');
        this.isLoading.set(false);
        return of([]);
      })
    ).subscribe((orders) => {
      this.orderarry.set(orders);
      this.isLoading.set(false);
    });
  }

  private handleOrderUpdates(): void {
    this.webSocketService.getOrderUpdates()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((update: OrderUpdate | null) => {
        if (!update) return;

        this.orderarry.update((list) => {
          if (update.message === 'deleted') {
            return list.filter((o) => o.id !== update.id);
          }

          const exists = list.find((o) => o.id === update.id);

          if (!exists) {
            return [...list, {
              id: update.id,
              userId: update.userId ?? 0,
              code: update.code ?? '',
              producerCode: update.producerCode ?? [],
              status: update.status ?? 'AWAITING_CONFIRMATION',
              acceptableAT: update.acceptableAT ?? '',
              deliveryAt: update.deliveryAt ?? '',
              phonenumber: update.phonenumber ?? '',
              name: update.name ?? '',
              establishmentname: update.establishmentname ?? ''
            }];
          }

          return list.map((o) =>
            o.id !== update.id ? o : {
              ...o,
              producerCode: update.producerCode ?? o.producerCode,
              status: update.status ?? o.status,
              acceptableAT: update.acceptableAT ?? o.acceptableAT,
              deliveryAt: update.deliveryAt ?? o.deliveryAt,
              phonenumber: update.phonenumber ?? o.phonenumber,
              name: update.name ?? o.name,
              establishmentname: update.establishmentname ?? o.establishmentname
            }
          );
        });
      });
  }
}