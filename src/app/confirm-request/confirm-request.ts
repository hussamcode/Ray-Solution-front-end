import {
  AfterViewInit,
  Component,
  computed,
  DestroyRef,
  inject,
  OnDestroy,
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
import * as L from 'leaflet';

@Component({
  selector: 'app-confirm-request',
  imports: [Header, FormsModule, Footer],
  templateUrl: './confirm-request.html',
  styleUrl: './confirm-request.css',
})
export class ConfirmRequest implements OnInit, AfterViewInit, OnDestroy {

  Information: UpdateInformationRequest = {
    establishmentname: '',
    name: '',
    phonenumber: '',
    status: 'PENDING_APPROVAL',
    latitude: null,
    longitude: null,
    address: ''
  };

  private webSocketService = inject(WebsocketService);
  private orderService = inject(OrderService);
  private producerService = inject(ProducerService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);

  orderconfirm = signal<ordermodel[]>([]);
  producerall = signal<Producer[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  isSubmitting = signal(false);
  isGettingLocation = signal(false);

  private pickerMap: L.Map | null = null;
  private pickerMarker: L.Marker | null = null;

  pendingOrder = computed(() =>
    this.orderconfirm().find(o => o.status === 'AWAITING_CONFIRMATION')
  );

  ngOnInit(): void {
    this.loadOrders();
    this.handleOrderUpdates();
    this.handleWebSocketUpdates();
  }

  ngAfterViewInit(): void {
    this.waitForMapContainer();
  }

  ngOnDestroy(): void {
    if (this.pickerMap) {
      this.pickerMap.remove();
      this.pickerMap = null;
    }
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

        if (!exists) return [...list, {
          id: update.id,
          userId: update.userId ?? 0,
          code: update.code ?? '',
          producerCode: update.producerCode ?? [],
          status: update.status ?? 'AWAITING_CONFIRMATION',
          acceptableAT: update.acceptableAT ?? null,
          deliveryAt: update.deliveryAt ?? null,
          phonenumber: update.phonenumber ?? '',
          name: update.name ?? '',
          establishmentname: update.establishmentname ?? ''
        }];

        return list.map(o =>
          o.id === update.id ? {
            ...o,
            producerCode: update.producerCode ?? o.producerCode,
            status: update.status ?? o.status,
            acceptableAT: update.acceptableAT ?? o.acceptableAT,
            deliveryAt: update.deliveryAt ?? o.deliveryAt,
            phonenumber: update.phonenumber ?? o.phonenumber,
            name: update.name ?? o.name,
            establishmentname: update.establishmentname ?? o.establishmentname
          } : o
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

  private waitForMapContainer(retries = 10): void {
    const el = document.getElementById('confirm-picker-map');
    if (el && el.offsetHeight > 0) {
      this.initPickerMap();
    } else if (retries > 0) {
      requestAnimationFrame(() => this.waitForMapContainer(retries - 1));
    }
  }

  private initPickerMap(): void {
    const mapEl = document.getElementById('confirm-picker-map');
    if (!mapEl || this.pickerMap) return;

    const lat = this.Information.latitude ?? 33.3128;
    const lng = this.Information.longitude ?? 44.3615;
    const zoom = this.Information.latitude != null && this.Information.longitude != null ? 14 : 6;

    this.pickerMap = L.map('confirm-picker-map', {
      center: [lat, lng],
      zoom,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.pickerMap);

    this.pickerMap.on('click', (e: L.LeafletMouseEvent) => {
      this.Information.latitude = Math.round(e.latlng.lat * 1e6) / 1e6;
      this.Information.longitude = Math.round(e.latlng.lng * 1e6) / 1e6;
      this.updatePickerMarker(false);
    });

    if (this.Information.latitude != null && this.Information.longitude != null) {
      this.updatePickerMarker(false);
    }
  }

  private updatePickerMarker(panTo = true): void {
    if (!this.pickerMap) return;

    const lat = this.Information.latitude;
    const lng = this.Information.longitude;

    if (lat == null || lng == null) {
      if (this.pickerMarker) {
        this.pickerMarker.remove();
        this.pickerMarker = null;
      }
      return;
    }

    if (!this.pickerMarker) {
      const icon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      this.pickerMarker = L.marker([lat, lng], { icon }).addTo(this.pickerMap);
    } else {
      this.pickerMarker.setLatLng([lat, lng]);
    }

    if (panTo) {
      this.pickerMap.setView([lat, lng], Math.max(this.pickerMap.getZoom(), 14));
    }
  }

  useMyLocation(): void {
    if (!navigator.geolocation) {
      this.errorMessage.set('Geolocation is not supported by your browser.');
      return;
    }

    this.isGettingLocation.set(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.Information.latitude = Math.round(position.coords.latitude * 1e6) / 1e6;
        this.Information.longitude = Math.round(position.coords.longitude * 1e6) / 1e6;
        this.isGettingLocation.set(false);
        this.updatePickerMarker(true);
      },
      () => {
        this.isGettingLocation.set(false);
        this.errorMessage.set('Unable to retrieve your location.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  onLatLngInput(): void {
    this.updatePickerMarker(false);
  }

  establishmentNameError = signal('');
  personNameError = signal('');
  phoneNumberError = signal('');

  validate(): boolean {
    let valid = true;

    if (!this.Information.establishmentname.trim()) {
      this.establishmentNameError.set('Establishment Name is required.');
      valid = false;
    } else {
      this.establishmentNameError.set('');
    }

    if (!this.Information.name.trim()) {
      this.personNameError.set("Person's Name is required.");
      valid = false;
    } else {
      this.personNameError.set('');
    }

    const phone = this.Information.phonenumber.trim();
    if (!phone) {
      this.phoneNumberError.set('Phone Number is required.');
      valid = false;
    } else if (!/^\+?\d{7,15}$/.test(phone.replace(/[\s\-()]/g, ''))) {
      this.phoneNumberError.set('Enter a valid phone number (7-15 digits).');
      valid = false;
    } else {
      this.phoneNumberError.set('');
    }

    return valid;
  }

  submitOrder(): void {
    const pending = this.pendingOrder();
    if (!pending || this.isSubmitting()) return;

    if (!this.validate()) return;

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