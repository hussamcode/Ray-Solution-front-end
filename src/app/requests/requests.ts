import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { OrderService } from '../services/OrderService';
import { ordermodel, OrderUpdate } from '../models/ordermodel.model';
import { Header } from "../header/header";
import { TakeRequests } from "../take-requests/take-requests";
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WebsocketService } from '../services/websocket-service';
import { jwtDecode, JwtPayload } from 'jwt-decode';

@Component({
  selector: 'app-requests',
  imports: [Header, TakeRequests],
  templateUrl: './requests.html',
  styleUrl: './requests.css',
})
export class Requests implements OnInit {

  public orderService = inject(OrderService);
  private router = inject(Router);
  private webSocketService = inject(WebsocketService);
  private destroyRef = inject(DestroyRef);

  orderRequests = signal<ordermodel[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  role ='';
  ngOnInit(): void {
    this.webSocketService.connect();
    this.loadOrders();
    this.handleOrderUpdates();
    this.cheekrole()
    

  }

  loadOrders(): void {
    this.isLoading.set(true);
    this.orderService.getAllOrderAdmin().pipe(
        catchError(() => {
            this.errorMessage.set('Failed to load orders');
            this.isLoading.set(false);
            return of([]);
        })
    ).subscribe((orders: ordermodel[]) => {
        this.orderRequests.set(
            orders.filter(o => 
                o.status === 'PENDING_APPROVAL' || o.status === 'PROCESSING' || o.status === 'PROCESSED'
            )
        );
        this.isLoading.set(false);
    });
}

  private handleOrderUpdates(): void {
    this.webSocketService
      .getOrderUpdates()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((update: OrderUpdate | null) => {
        if (!update) return;

        this.orderRequests.update((list) => {

          if (update.message === 'deleted') {
            return list.filter((o) => o.id !== update.id);
          }

          const exists = list.find((o) => o.id === update.id);

// ✅ أضف PROCESSING
if (!exists && (update.status === 'PENDING_APPROVAL' || update.status === 'PROCESSING' || update.status === 'PROCESSED')) {
    return [...list, {
        id: update.id,
        userId: update.userId ?? 0,
        code: update.code ?? '',
        producerCode: update.producerCode ?? [],
        status: update.status,
        acceptableAT: update.acceptableAT ?? '',
        phonenumber: update.phonenumber ?? '',
        deliveryAt: update.deliveryAt ?? null,
        name: update.name ?? '',
        establishmentname: update.establishmentname ?? '',
        latitude: update.latitude ?? null,
        longitude: update.longitude ?? null,
        address: update.address ?? null
    }];
}

return list.map((o) => {
    if (o.id !== update.id) return o;
    
    // ✅ احذف فقط إذا تغير لـ status غير مطلوب
    if (update.status !== 'PENDING_APPROVAL' && update.status !== 'PROCESSING' && update.status !== 'PROCESSED') {
        return null;
    }
    
    return {
        ...o,
        producerCode: update.producerCode ?? o.producerCode,
        status: update.status ?? o.status,
        acceptableAT: update.acceptableAT ?? o.acceptableAT,
        deliveryAt: update.deliveryAt ?? o.deliveryAt,
        phonenumber: update.phonenumber ?? o.phonenumber,
        name: update.name ?? o.name,
        establishmentname: update.establishmentname ?? o.establishmentname,
        latitude: update.latitude ?? o.latitude,
        longitude: update.longitude ?? o.longitude,
        address: update.address ?? o.address
    };
}).filter(o => o !== null) as ordermodel[];
        });
      });
  }
  cheekrole(): void {

  const token = localStorage.getItem('token');

  if (!token) {
    return;
  }

  try {

    const decoded = jwtDecode<JwtPayload>(token);
    
    this.role = decoded.sub ?? '';
  } catch (error) {

    console.log(error);

  }
}
}