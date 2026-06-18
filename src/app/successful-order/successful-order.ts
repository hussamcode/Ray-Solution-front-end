import { Component, DestroyRef, inject, Input, OnInit, signal } from '@angular/core';
import { Header } from "../header/header";
import { Footer } from "../footer/footer";
import { ordermodel } from '../models/ordermodel.model';
import { Producer } from '../models/producer.model';
import { ActivatedRoute, Router } from '@angular/router';
import { ProducerService } from '../services/producer-service';
import { WebsocketService } from '../services/websocket-service';
import { OrderService } from '../services/OrderService';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-successful-order',
  imports: [Header, Footer],
  templateUrl: './successful-order.html',
  styleUrl: './successful-order.css',
})
export class SuccessfulOrder implements OnInit{
  dataOrder = signal<ordermodel | null>(null);
  producerall = signal<Producer[]>([]);
 
  codeorder = '';


  private webSocketService = inject(WebsocketService);
  private orderService = inject(OrderService);
  private producerService = inject(ProducerService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);

    isLoading = signal(false);
  errorMessage = signal('');
  isSubmitting = signal(false);
    constructor(
    private route: ActivatedRoute,
  ) {}
  ngOnInit(): void {
    this.loadOrderscode();
    this.loadOrders();
  }
  loadOrderscode(): void{
       this.codeorder = String(
      this.route.snapshot.paramMap.get('code')
    );
  }
   loadOrders(): void {
      this.isLoading.set(true);
      this.orderService.getOrderByCode(this.codeorder).pipe(
        catchError(() => {
          this.errorMessage.set('Failed to load orders');
          this.isLoading.set(false);
          return of(null);
        })
      ).subscribe((order: ordermodel | null) => {
        if (!order) return;
        this.dataOrder.set(order);
        this.isLoading.set(false);
         this.loadproducer();
      });
    }
    loadproducer(): void {
    const order = this.dataOrder();
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

    Confirmation(): void {
    this.router.navigate(['home']);
  }
}
