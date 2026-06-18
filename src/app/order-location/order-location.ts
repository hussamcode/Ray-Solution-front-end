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
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OrderService } from '../services/OrderService';
import { ordermodel, UpdateLocationRequest } from '../models/ordermodel.model';
import { Header } from '../header/header';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { catchError, of } from 'rxjs';
import * as L from 'leaflet';

@Component({
  selector: 'app-order-location',
  standalone: true,
  imports: [Header, FormsModule, CommonModule],
  templateUrl: './order-location.html',
  styleUrl: './order-location.css',
})
export class OrderLocation implements OnInit, AfterViewInit, OnDestroy {

  private route = inject(ActivatedRoute);
  public router = inject(Router);
  private orderService = inject(OrderService);
  private destroyRef = inject(DestroyRef);

  orderCode = signal<string | null>(null);
  isAdminView = signal(false);

  order = signal<ordermodel | null>(null);
  allOrders = signal<ordermodel[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  isSaving = signal(false);
  isGettingLocation = signal(false);
  successMessage = signal('');

  editForm = signal<UpdateLocationRequest>({
    latitude: null,
    longitude: null,
    address: ''
  });

  searchCode = signal('');

  filteredOrders = computed(() => {
    const term = this.searchCode().toLowerCase().trim();
    if (!term) return this.allOrders();
    return this.allOrders().filter(o => o.code.toLowerCase().includes(term));
  });

  editingCode = signal<string | null>(null);

  private pickerMap: L.Map | null = null;
  private pickerMarker: L.Marker | null = null;
  private miniMaps = new Map<string, L.Map>();

  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('code');
    if (code) {
      this.orderCode.set(code);
      this.isAdminView.set(false);
      this.loadOrder(code);
    } else {
      this.isAdminView.set(true);
      this.loadAllOrders();
    }
  }

  ngAfterViewInit(): void {
    if (!this.isAdminView()) {
      this.waitForMapContainer();
    }
  }

  ngOnDestroy(): void {
    if (this.pickerMap) {
      this.pickerMap.remove();
      this.pickerMap = null;
    }
    this.miniMaps.forEach(map => map.remove());
    this.miniMaps.clear();
  }

  loadOrder(code: string): void {
    this.isLoading.set(true);
    this.orderService.getOrderByCode(code).pipe(
      catchError(() => {
        this.errorMessage.set('Failed to load order');
        this.isLoading.set(false);
        return of(null);
      })
    ).subscribe(order => {
      this.order.set(order);
      if (order) {
        this.editForm.set({
          latitude: order.latitude ?? null,
          longitude: order.longitude ?? null,
          address: order.address ?? ''
        });
      }
      this.isLoading.set(false);
    });
  }

  loadAllOrders(): void {
    this.isLoading.set(true);
    this.orderService.getAllOrderAdmin().pipe(
      catchError(() => {
        this.errorMessage.set('Failed to load orders');
        this.isLoading.set(false);
        return of([]);
      })
    ).subscribe(orders => {
      this.allOrders.set(orders);
      this.isLoading.set(false);
    });
  }

  startEdit(order: ordermodel): void {
    this.editingCode.set(order.code);
    this.editForm.set({
      latitude: order.latitude ?? null,
      longitude: order.longitude ?? null,
      address: order.address ?? ''
    });
    this.errorMessage.set('');
    this.successMessage.set('');

    setTimeout(() => this.initMiniMap(order.code), 0);
  }

  cancelEdit(): void {
    const code = this.editingCode();
    if (code) {
      const map = this.miniMaps.get(code);
      if (map) {
        map.remove();
        this.miniMaps.delete(code);
      }
    }
    this.editingCode.set(null);
    this.editForm.set({ latitude: null, longitude: null, address: '' });
  }

  saveLocation(): void {
    const code = this.editingCode() ?? this.orderCode();
    if (!code || this.isSaving()) return;

    this.isSaving.set(true);
    this.errorMessage.set('');

    this.orderService.updateOrderLocation(code, this.editForm()).subscribe({
      next: (updated) => {
        this.isSaving.set(false);
        this.successMessage.set('Location updated successfully');

        if (this.isAdminView()) {
          this.allOrders.update(list =>
            list.map(o => o.code === code ? updated : o)
          );
          this.cancelEdit();
        } else {
          this.order.set(updated);
        }

        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to update location');
        this.isSaving.set(false);
      }
    });
  }

  canEdit(order: ordermodel): boolean {
    return order.status === 'PENDING_APPROVAL' || order.status === 'PROCESSING';
  }

  isEditing(order: ordermodel): boolean {
    return this.editingCode() === order.code;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      AWAITING_CONFIRMATION: 'Awaiting',
      PENDING_APPROVAL: 'Pending',
      PROCESSING: 'Processing',
      PROCESSED: 'Processed',
      DELIVERED: 'Delivered',
      REJECTED: 'Rejected'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      AWAITING_CONFIRMATION: 'bg-amber-100 text-amber-700',
      PENDING_APPROVAL: 'bg-blue-100 text-blue-700',
      PROCESSING: 'bg-indigo-100 text-indigo-700',
      PROCESSED: 'bg-cyan-100 text-cyan-700',
      DELIVERED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-700'
    };
    return classes[status] || 'bg-slate-100 text-slate-700';
  }

  // --- Map methods (single-order view) ---

  private waitForMapContainer(retries = 10): void {
    const el = document.getElementById('order-location-map');
    if (el && el.offsetHeight > 0) {
      this.initPickerMap();
    } else if (retries > 0) {
      requestAnimationFrame(() => this.waitForMapContainer(retries - 1));
    }
  }

  private initPickerMap(): void {
    const mapEl = document.getElementById('order-location-map');
    if (!mapEl || this.pickerMap) return;

    const lat = this.editForm().latitude ?? 33.3128;
    const lng = this.editForm().longitude ?? 44.3615;
    const zoom = this.editForm().latitude != null && this.editForm().longitude != null ? 14 : 6;

    this.pickerMap = L.map('order-location-map', {
      center: [lat, lng],
      zoom,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.pickerMap);

    this.pickerMap.on('click', (e: L.LeafletMouseEvent) => {
      this.editForm.update(f => ({
        ...f,
        latitude: Math.round(e.latlng.lat * 1e6) / 1e6,
        longitude: Math.round(e.latlng.lng * 1e6) / 1e6,
      }));
      this.updatePickerMarker(false);
    });

    if (this.editForm().latitude != null && this.editForm().longitude != null) {
      this.updatePickerMarker(false);
    }
  }

  private updatePickerMarker(panTo = true): void {
    if (!this.pickerMap) return;

    const lat = this.editForm().latitude;
    const lng = this.editForm().longitude;

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
        this.editForm.update(f => ({
          ...f,
          latitude: Math.round(position.coords.latitude * 1e6) / 1e6,
          longitude: Math.round(position.coords.longitude * 1e6) / 1e6,
        }));
        this.isGettingLocation.set(false);
        if (this.isAdminView()) {
          const code = this.editingCode();
          if (code) this.updateMiniMapMarker(code);
        } else {
          this.updatePickerMarker(true);
        }
      },
      () => {
        this.isGettingLocation.set(false);
        this.errorMessage.set('Unable to retrieve your location.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  onLatLngInput(): void {
    if (this.isAdminView()) {
      const code = this.editingCode();
      if (code) this.updateMiniMapMarker(code);
    } else {
      this.updatePickerMarker(false);
    }
  }

  // --- Mini map methods (admin table view) ---

  private initMiniMap(orderCode: string): void {
    const mapId = `mini-map-${orderCode}`;
    const el = document.getElementById(mapId);
    if (!el || el.offsetHeight === 0) return;

    if (this.miniMaps.has(orderCode)) {
      this.miniMaps.get(orderCode)!.invalidateSize();
      return;
    }

    const lat = this.editForm().latitude ?? 33.3128;
    const lng = this.editForm().longitude ?? 44.3615;
    const zoom = this.editForm().latitude != null && this.editForm().longitude != null ? 14 : 6;

    const map = L.map(mapId, {
      center: [lat, lng],
      zoom,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      this.editForm.update(f => ({
        ...f,
        latitude: Math.round(e.latlng.lat * 1e6) / 1e6,
        longitude: Math.round(e.latlng.lng * 1e6) / 1e6,
      }));
      this.updateMiniMapMarker(orderCode);
    });

    this.miniMaps.set(orderCode, map);

    if (this.editForm().latitude != null && this.editForm().longitude != null) {
      const icon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      L.marker([lat, lng], { icon }).addTo(map);
    }
  }

  private updateMiniMapMarker(orderCode: string): void {
    const map = this.miniMaps.get(orderCode);
    if (!map) return;

    map.eachLayer(layer => {
      if (layer instanceof L.Marker) layer.remove();
    });

    const lat = this.editForm().latitude;
    const lng = this.editForm().longitude;

    if (lat == null || lng == null) return;

    const icon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    L.marker([lat, lng], { icon }).addTo(map);
    map.setView([lat, lng], Math.max(map.getZoom(), 14));
  }
}
