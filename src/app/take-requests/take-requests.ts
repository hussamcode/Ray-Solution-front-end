import {
  AfterViewInit,
  Component,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  input,
  effect,
  afterNextRender
} from '@angular/core';

import { catchError, finalize, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ordermodel } from '../models/ordermodel.model';
import { Producer } from '../models/producer.model';

import { ProducerService } from '../services/producer-service';
import { OrderService } from '../services/OrderService';
import { WebsocketService } from '../services/websocket-service';

import { jwtDecode } from 'jwt-decode';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import * as L from 'leaflet';

interface JwtPayload {
  sub: string;
  role: string;
  exp: number;
}

@Component({
  selector: 'app-take-requests',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './take-requests.html',
  styleUrl: './take-requests.css',
})
export class TakeRequests implements OnInit, OnDestroy {

  readonly orderRequest = input.required<ordermodel>();
  currentOrder = signal<ordermodel | null>(null);

  private producerService = inject(ProducerService);
  private orderService = inject(OrderService);
  private webSocketService = inject(WebsocketService);
  private destroyRef = inject(DestroyRef);

  producerall = signal<Producer[]>([]);
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');

  isAdmin = false;
  isManager = false;

  deliveryAt: string = '';
  minDate: string = '';

  private orderMap: L.Map | null = null;

  constructor() {
    effect(() => {
      this.currentOrder.set(this.orderRequest());
    });

    afterNextRender(() => {
      this.initOrderMapWithRetry();
    });

    const role = this.getRole();
    this.isAdmin = role === 'ADMIN';
    this.isManager = role === 'MANAGER';

    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    this.minDate = now.toISOString().slice(0, 16);
  }

  ngOnInit(): void {
    this.loadProducer();
    this.handleWebSocketUpdates();
    this.handleOrderUpdates();
  }

  ngOnDestroy(): void {
    if (this.orderMap) {
      this.orderMap.remove();
      this.orderMap = null;
    }
  }

  private initOrderMapWithRetry(retries = 20): void {
    const order = this.orderRequest();
    if (order.latitude == null || order.longitude == null) return;

    const el = document.getElementById(`order-map-${order.code}`);
    if (el && el.offsetHeight > 0) {
      this.initOrderMap();
    } else if (retries > 0) {
      setTimeout(() => this.initOrderMapWithRetry(retries - 1), 50);
    }
  }

  private initOrderMap(): void {
    const order = this.orderRequest();
    if (order.latitude == null || order.longitude == null) return;

    const mapId = `order-map-${order.code}`;
    const mapEl = document.getElementById(mapId);
    if (!mapEl || this.orderMap) return;

    this.orderMap = L.map(mapId, {
      center: [order.latitude, order.longitude],
      zoom: 14,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.orderMap);

    const icon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    L.marker([order.latitude, order.longitude], { icon }).addTo(this.orderMap)
      .bindPopup(order.address || `${order.latitude}, ${order.longitude}`)
      .openPopup();
  }

  private getRole(): string {
    try {
      const token = localStorage.getItem('token');
      if (!token) return '';
      const decoded = jwtDecode<JwtPayload>(token);
      return decoded.role;
    } catch {
      return '';
    }
  }

  loadProducer(): void {
    const order = this.orderRequest();
    const codes = order?.producerCode ?? [];

    const currentCodes = this.producerall().map(p => p.code);

    const isSame =
      codes.length === currentCodes.length &&
      codes.every(c => currentCodes.includes(c));

    if (isSame && codes.length > 0) return;

    this.isLoading.set(true);
    this.producerall.set([]);

    if (codes.length === 0) {
      this.isLoading.set(false);
      return;
    }

    let completed = 0;

    codes.forEach(code => {
      this.producerService.getProducerByCode(code).pipe(
        catchError(() => {
          this.errorMessage.set('Failed to load producer');
          return of(null);
        })
      ).subscribe((producer: Producer | null) => {
        if (producer) {
          this.producerall.update(list => [...list, producer]);
        }

        completed++;
        if (completed === codes.length) {
          this.isLoading.set(false);
        }
      });
    });
  }

  Approve(): void {
    const order = this.currentOrder();

    if (!order?.code || this.isSubmitting()) return;

    if (this.isAdmin && !this.deliveryAt) {
      this.errorMessage.set('Please enter delivery date');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const status = this.isAdmin ? 'PROCESSED' : 'PROCESSING';
    console.log("test:"+this.deliveryAt);
    this.orderService.updateOrderStatusAdmin(order.code, {
      status,
      deliveryAt: this.isAdmin ? this.deliveryAt : undefined
    }).pipe(
      finalize(() => this.isSubmitting.set(false))
    ).subscribe({
      next: () => {},
      error: () => this.errorMessage.set('Failed to approve order')
    });
  }

  Reject(): void {
    const order = this.currentOrder();

    if (!order?.code || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    console
    this.orderService.updateOrderStatusAdmin(order.code, {
      status: 'REJECTED'
    }).pipe(
      finalize(() => this.isSubmitting.set(false))
    ).subscribe({
      next: () => {},
      error: () => this.errorMessage.set('Failed to reject order')
    });
  }

  Deliver(): void {
    const order = this.currentOrder();

    if (!order?.code || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.orderService.updateOrderStatusAdmin(order.code, {
      status: 'DELIVERED'
    }).pipe(
      finalize(() => this.isSubmitting.set(false))
    ).subscribe({
      next: () => {},
      error: () => this.errorMessage.set('Failed to mark as delivered')
    });
  }

  private handleWebSocketUpdates(): void {
    this.webSocketService.getStatusUpdates().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(update => {
      if (!update) return;

      if (update.message === 'deleted') {
        this.producerall.update(arr =>
          arr.filter(p => p.id !== update.id)
        );
        return;
      }

      this.producerall.update(arr =>
        arr.map(p =>
          p.id === update.id
            ? {
                ...p,
                producerAdd: update.producerAdd,
                stowage: update.stowage
              }
            : p
        )
      );
    });
  }

  private handleOrderUpdates(): void {
    this.webSocketService.getOrderUpdates().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(update => {
      if (!update) return;

      if (update.message === 'deleted') {
        this.currentOrder.set(null);
        return;
      }

      const oldCodes = this.currentOrder()?.producerCode ?? [];

      this.currentOrder.update(order => {
        if (!order || order.id !== update.id) return order;

        return {
          ...order,
          producerCode: update.producerCode ?? order.producerCode,
          status: update.status ?? order.status,
          acceptableAT: update.acceptableAT ?? order.acceptableAT,
          phonenumber: update.phonenumber ?? order.phonenumber,
          name: update.name ?? order.name,
          establishmentname: update.establishmentname ?? order.establishmentname
        };
      });

      const newCodes = update.producerCode ?? [];

      if (JSON.stringify(oldCodes) !== JSON.stringify(newCodes)) {
        this.loadProducer();
      }
    });
  }
}