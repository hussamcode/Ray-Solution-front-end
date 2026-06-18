import { Component, computed, DestroyRef, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Header } from '../header/header';
import { ProducerService } from '../services/producer-service';
import { OrderService } from '../services/OrderService';
import { ProducerLocation } from '../models/producer.model';
import { ordermodel } from '../models/ordermodel.model';
import * as L from 'leaflet';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, Header, DatePipe, FormsModule],
  templateUrl: './map.html',
  styleUrl: './map.css',
})
export class MapComponent implements OnInit, OnDestroy {
  private producerService = inject(ProducerService);
  private orderService = inject(OrderService);
  private destroyRef = inject(DestroyRef);

  locations = signal<ProducerLocation[]>([]);
  deliveredOrders = signal<ordermodel[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  selectedFilter = signal<'all' | 'producers' | 'delivered'>('all');
  searchTerm = signal('');

  filteredLocations = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.locations();
    return this.locations().filter(
      loc => loc.name.toLowerCase().includes(term) || loc.code.toLowerCase().includes(term)
    );
  });

  filteredDeliveredOrders = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.deliveredOrders();
    return this.deliveredOrders().filter(
      o => o.code.toLowerCase().includes(term) || o.establishmentname.toLowerCase().includes(term)
    );
  });

  private map: L.Map | null = null;
  private producerMarkers: L.Marker[] = [];
  private orderMarkers: L.Marker[] = [];
  private resizeObserver: ResizeObserver | null = null;

  private producerIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  private orderIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  ngOnInit(): void {
    this.loadLocations();
  }

  loadLocations(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.producerService.getLocations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (locations) => {
          this.locations.set(locations);
          this.loadDeliveredOrders();
        },
        error: () => {
          this.errorMessage.set('Failed to load locations');
          this.isLoading.set(false);
        },
      });
  }

  private loadDeliveredOrders(): void {
    this.orderService.getAllOrderAdmin()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (orders) => {
          const delivered = orders.filter(
            o => o.status === 'DELIVERED' && o.latitude != null && o.longitude != null
          );
          this.deliveredOrders.set(delivered);
          this.isLoading.set(false);
          this.waitForContainer();
        },
        error: () => {
          this.isLoading.set(false);
          this.waitForContainer();
        },
      });
  }

  toggleFilter(filter: 'all' | 'producers' | 'delivered'): void {
    this.selectedFilter.set(filter);
    this.refreshMarkers();
  }

  focusLocation(loc: ProducerLocation): void {
    if (this.map && loc.latitude != null && loc.longitude != null) {
      this.map.setView([loc.latitude, loc.longitude], 15);
      const marker = this.producerMarkers.find(
        (m) => (m.options as any).locationId === loc.id
      );
      if (marker) {
        marker.openPopup();
      }
    }
  }

  focusOrder(order: ordermodel): void {
    if (this.map && order.latitude != null && order.longitude != null) {
      this.map.setView([order.latitude, order.longitude], 15);
      const marker = this.orderMarkers.find(
        (m) => (m.options as any).orderCode === order.code
      );
      if (marker) {
        marker.openPopup();
      }
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private waitForContainer(retries = 30): void {
    const el = document.getElementById('map');
    if (el && el.offsetHeight > 0) {
      this.initMap();
    } else if (retries > 0) {
      requestAnimationFrame(() => this.waitForContainer(retries - 1));
    }
  }

  private initMap(): void {
    if (this.map) {
      this.map.remove();
    }

    const mapEl = document.getElementById('map');
    if (!mapEl) return;

    this.map = L.map('map', {
      center: [33.3128, 44.3615],
      zoom: 6,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map);

    this.refreshMarkers();

    this.resizeObserver = new ResizeObserver(() => {
      this.map?.invalidateSize();
    });
    this.resizeObserver.observe(mapEl);

    this.map.whenReady(() => {
      setTimeout(() => this.map?.invalidateSize(), 0);
    });
  }

  private refreshMarkers(): void {
    if (!this.map) return;

    this.producerMarkers.forEach(m => m.remove());
    this.orderMarkers.forEach(m => m.remove());
    this.producerMarkers = [];
    this.orderMarkers = [];

    const filter = this.selectedFilter();

    if (filter === 'all' || filter === 'producers') {
      this.addProducerMarkers();
    }
    if (filter === 'all' || filter === 'delivered') {
      this.addOrderMarkers();
    }

    this.fitMapBounds();
  }

  private addProducerMarkers(): void {
    const locs = this.filteredLocations();
    locs.forEach((loc) => {
      if (loc.latitude != null && loc.longitude != null && this.map) {
        const marker = L.marker([loc.latitude, loc.longitude], { icon: this.producerIcon })
          .addTo(this.map)
          .bindPopup(
            `<div style="min-width:150px">
              <strong>${loc.name}</strong><br>
              <span style="color:#666;font-size:12px">${loc.code}</span><br>
              ${loc.address ? `<span style="color:#666;font-size:12px">${loc.address}</span>` : ''}
            </div>`
          );
        (marker.options as any).locationId = loc.id;
        this.producerMarkers.push(marker);
      }
    });
  }

  private addOrderMarkers(): void {
    const orders = this.filteredDeliveredOrders();
    orders.forEach((order) => {
      if (order.latitude != null && order.longitude != null && this.map) {
        const marker = L.marker([order.latitude, order.longitude], { icon: this.orderIcon })
          .addTo(this.map)
          .bindPopup(
            `<div style="min-width:170px">
              <strong style="color:#16a34a">Delivered</strong><br>
              <span style="font-size:13px;font-weight:600">${order.code}</span><br>
              <span style="color:#666;font-size:12px">${order.establishmentname}</span><br>
              ${order.address ? `<span style="color:#666;font-size:12px;margin-top:4px;display:block">${order.address}</span>` : ''}
              ${order.deliveryAt ? `<span style="color:#999;font-size:11px;margin-top:4px;display:block">Delivered: ${new Date(order.deliveryAt).toLocaleDateString()}</span>` : ''}
            </div>`
          );
        (marker.options as any).orderCode = order.code;
        this.orderMarkers.push(marker);
      }
    });
  }

  private fitMapBounds(): void {
    if (!this.map) return;

    const allCoords: L.LatLngTuple[] = [];

    this.producerMarkers.forEach(m => {
      const latlng = m.getLatLng();
      allCoords.push([latlng.lat, latlng.lng]);
    });

    this.orderMarkers.forEach(m => {
      const latlng = m.getLatLng();
      allCoords.push([latlng.lat, latlng.lng]);
    });

    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      this.map.fitBounds(bounds, { padding: [50, 50] });
    }
  }
}
