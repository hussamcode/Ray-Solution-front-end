import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';
import { Brand, brandtype, CreateProducerRequest, Producer as ProducerModel, UpdateProducerRequest } from '../models/producer.model';
import { ProducerService } from '../services/producer-service';
import * as L from 'leaflet';

@Component({
  selector: 'app-producer',
  standalone: true,
  imports: [CommonModule, FormsModule, Header, Footer],
  templateUrl: './producer.html',
  styleUrl: './producer.css',
})
export class Producer implements OnInit, AfterViewInit, OnDestroy {
  private producerService = inject(ProducerService);
  private cdr = inject(ChangeDetectorRef);

  brands = Object.keys(Brand) as brandtype[];
  products: ProducerModel[] = [];
  productSearchTerm = '';
  selectedProductId: number | null = null;
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  private imageObjectUrl: string | null = null;
  uploadProgress = 0;
  isUploading = false;
  isSubmitting = false;
  isLoadingProducts = false;
  deletingProductId: number | null = null;
  successMessage = '';
  errorMessage = '';
  private messageTimer: ReturnType<typeof setTimeout> | null = null;
  isGettingLocation = false;

  private pickerMap: L.Map | null = null;
  private pickerMarker: L.Marker | null = null;

  producerForm: CreateProducerRequest = this.getEmptyForm();

  ngOnInit(): void {
    this.loadProducts();
  }

  ngAfterViewInit(): void {
    this.waitForMapContainer();
  }

  private waitForMapContainer(retries = 10): void {
    const el = document.getElementById('picker-map');
    if (el && el.offsetHeight > 0) {
      this.initPickerMap();
    } else if (retries > 0) {
      requestAnimationFrame(() => this.waitForMapContainer(retries - 1));
    }
  }

  ngOnDestroy(): void {
    if (this.pickerMap) {
      this.pickerMap.remove();
      this.pickerMap = null;
    }
  }

  get filteredProducts(): ProducerModel[] {
    const term = this.productSearchTerm.trim().toLowerCase();

    if (!term) {
      return this.products;
    }

    return this.products.filter((product) =>
      product.name?.toLowerCase().includes(term) ||
      product.code?.toLowerCase().includes(term)
    );
  }

  clearProductSearch(): void {
    this.productSearchTerm = '';
  }

  loadProducts(): void {
    this.isLoadingProducts = true;

    this.producerService.getAllProducerIncludeInactive().subscribe({
      next: (products) => {
        this.products = products;
        this.isLoadingProducts = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to load producers', error);
        this.isLoadingProducts = false;
        this.showMessage('Products could not be loaded.', 'error');
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    this.selectedFile = input.files[0];

    if (!this.selectedFile.type.startsWith('image/')) {
      this.showMessage('Please select an image file.', 'error');
      input.value = '';
      return;
    }

    if (this.imageObjectUrl) {
      URL.revokeObjectURL(this.imageObjectUrl);
    }
    this.imageObjectUrl = URL.createObjectURL(this.selectedFile);
    this.imagePreview = this.imageObjectUrl;
    this.cdr.detectChanges();

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      this.producerForm.image = this.extractBase64(result);
      this.cdr.detectChanges();
    };

    reader.readAsDataURL(this.selectedFile);
    input.value = '';
  }

  removeImage(): void {
    this.selectedFile = null;
    if (this.imageObjectUrl) {
      URL.revokeObjectURL(this.imageObjectUrl);
    }
    this.imageObjectUrl = null;
    this.imagePreview = null;
    this.producerForm.image = null;
    this.uploadProgress = 0;
    this.isUploading = false;
  }

  uploadImage(): void {
    if (!this.selectedFile || this.isUploading) {
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;

    const interval = setInterval(() => {
      this.uploadProgress += 5;

      if (this.uploadProgress >= 100) {
        this.uploadProgress = 100;
        this.isUploading = false;
        clearInterval(interval);
      }
    }, 100);
  }

  saveProducer(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (!this.producerForm.code.trim() || !this.producerForm.name.trim()) {
      this.showMessage('Product code and name are required.', 'error');
      return;
    }

    this.isSubmitting = true;

    if (this.selectedProductId) {
      this.updateProducer();
      return;
    }

    this.createProducer();
  }

  createProducer(): void {
    this.producerService.createProducer(this.producerForm).subscribe({
      next: () => {
        this.resetForm();
        this.isSubmitting = false;
        this.loadProducts();
        this.showMessage('Product added successfully.', 'success');
      },
      error: (error) => {
        console.error('Failed to create producer', error);
        this.isSubmitting = false;
        this.showMessage(this.getProducerErrorMessage(error, 'added'), 'error');
      },
    });
  }

  updateProducer(): void {
    if (!this.selectedProductId) {
      return;
    }

    const request: UpdateProducerRequest = { ...this.producerForm };

    this.producerService.updateProducer(this.selectedProductId, request).subscribe({
      next: () => {
        this.resetForm();
        this.isSubmitting = false;
        this.loadProducts();
        this.showMessage('Product updated successfully.', 'success');
      },
      error: (error) => {
        console.error('Failed to update producer', error);
        this.isSubmitting = false;
        this.showMessage(this.getProducerErrorMessage(error, 'updated'), 'error');
      },
    });
  }

  editProduct(product: ProducerModel): void {
    this.selectedProductId = product.id;
    this.producerForm = {
      code: product.code || '',
      name: product.name || '',
      description: product.description || '',
      brand: product.brand || 'Other',
      stowage: product.stowage || 0,
      image: product.image || null,
      active: product.active ?? true,
      latitude: product.latitude ?? null,
      longitude: product.longitude ?? null,
      address: product.address || null,
    };

    if (this.imageObjectUrl) {
      URL.revokeObjectURL(this.imageObjectUrl);
      this.imageObjectUrl = null;
    }
    this.selectedFile = null;
    this.imagePreview = this.getImageSrc(product.image);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.cdr.detectChanges();

    setTimeout(() => {
      if (this.pickerMap) {
        this.updatePickerMarker(true);
        if (product.latitude != null && product.longitude != null) {
          this.pickerMap.setView([product.latitude, product.longitude], 14);
        }
      }
    }, 100);
  }

  deleteProduct(product: ProducerModel): void {
    if (!confirm(`Delete product "${product.name}"?`)) {
      return;
    }

    this.deletingProductId = product.id;

    this.producerService.deleteProducer(product.id).subscribe({
      next: () => {
        if (this.selectedProductId === product.id) {
          this.resetForm();
        }
        this.deletingProductId = null;
        this.loadProducts();
        this.showMessage('Product deleted successfully.', 'success');
      },
      error: (error) => {
        console.error('Failed to delete producer', error);
        this.deletingProductId = null;
        this.showMessage(this.getProducerErrorMessage(error, 'deleted'), 'error');
      },
    });
  }

  cancelEdit(): void {
    this.resetForm();
  }

  useMyLocation(): void {
    if (!navigator.geolocation) {
      this.showMessage('Geolocation is not supported by your browser.', 'error');
      return;
    }

    this.isGettingLocation = true;
    this.cdr.detectChanges();

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.producerForm.latitude = Math.round(position.coords.latitude * 1e6) / 1e6;
        this.producerForm.longitude = Math.round(position.coords.longitude * 1e6) / 1e6;
        this.isGettingLocation = false;
        this.updatePickerMarker(true);
        this.cdr.detectChanges();
        this.showMessage('Location filled from GPS.', 'success');
      },
      () => {
        this.isGettingLocation = false;
        this.cdr.detectChanges();
        this.showMessage('Unable to retrieve your location.', 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  onLatLngInput(): void {
    this.updatePickerMarker(false);
  }

  private initPickerMap(): void {
    const mapEl = document.getElementById('picker-map');
    if (!mapEl || this.pickerMap) return;

    const lat = this.producerForm.latitude ?? 33.3128;
    const lng = this.producerForm.longitude ?? 44.3615;
    const zoom = this.producerForm.latitude != null && this.producerForm.longitude != null ? 14 : 6;

    this.pickerMap = L.map('picker-map', {
      center: [lat, lng],
      zoom,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.pickerMap);

    this.pickerMap.on('click', (e: L.LeafletMouseEvent) => {
      this.producerForm.latitude = Math.round(e.latlng.lat * 1e6) / 1e6;
      this.producerForm.longitude = Math.round(e.latlng.lng * 1e6) / 1e6;
      this.updatePickerMarker(false);
      this.cdr.detectChanges();
    });

    if (this.producerForm.latitude != null && this.producerForm.longitude != null) {
      this.updatePickerMarker(false);
    }
  }

  private updatePickerMarker(panTo = true): void {
    if (!this.pickerMap) return;

    const lat = this.producerForm.latitude;
    const lng = this.producerForm.longitude;

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

  getImageSrc(image: string | null | undefined): string | null {
    if (!image) {
      return null;
    }

    if (typeof image === 'string') {
      return image.startsWith('data:') ? image : `data:image/png;base64,${image}`;
    }

    return null;
  }

  private resetForm(): void {
    this.selectedProductId = null;
    this.producerForm = this.getEmptyForm();
    this.removeImage();
    this.updatePickerMarker(false);
  }

  private getEmptyForm(): CreateProducerRequest {
    return {
      code: '',
      name: '',
      description: '',
      brand: 'Other',
      stowage: 0,
      image: null,
      active: true,
      latitude: null,
      longitude: null,
      address: null,
    };
  }

  private extractBase64(dataUrl: string): string {
    return dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    this.successMessage = type === 'success' ? message : '';
    this.errorMessage = type === 'error' ? message : '';

    if (this.messageTimer) {
      clearTimeout(this.messageTimer);
    }

    this.messageTimer = setTimeout(() => {
      this.successMessage = '';
      this.errorMessage = '';
      this.cdr.detectChanges();
    }, 3000);

    this.cdr.detectChanges();
  }

  private getProducerErrorMessage(error: { error?: { message?: string } | string; status?: number } | null, action: 'added' | 'updated' | 'deleted'): string {
    const errBody = error?.error;
    if (errBody) {
      if (typeof errBody === 'string') {
        if (errBody.trim()) return errBody;
      } else if (errBody.message) {
        return errBody.message;
      }
    }

    if (error?.status === 0) {
      return `Product was not ${action}. Cannot connect to the server.`;
    }

    return `Product was not ${action}. Please check the data and try again.`;
  }
}
