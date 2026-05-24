import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { WebsocketService } from '../services/websocket-service';
import { MyProducer } from '../models/myproducer.model';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, catchError, of } from 'rxjs';
import { MyproducerService } from '../services/myproducer-service';
import { ProducerService } from '../services/producer-service';
import { OrderService } from '../services/OrderService';
import { ordermodel,StatusUpdateMessage } from '../models/ordermodel.model';
import { Navbar } from "../navbar/navbar";
@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, FormsModule, Navbar],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit {
isActive(arg0: string) {
throw new Error('Method not implemented.');
}
  public myproducerService = inject(MyproducerService);
  public orderSrvice = inject(OrderService);
  private webSocketService =inject(WebsocketService);
  public producerService = inject(ProducerService);
  protecteds = signal<MyProducer[]>([]);
  allprotectedadd = signal<number>(0);
  private destroyRef = inject(DestroyRef);
   public orderService = inject(OrderService);
   //serch
  searchTermvale: string = '';

 
 //order
   orderarry = signal<ordermodel[]>([]);
 errorMessage = signal<string>('');
  isSubmitting = signal<boolean>(false);
  isLoading = signal<boolean>(false);

     ngOnInit(): void {
    this.loadOrders();
    this.connectWebSocket();
  }

    //update real time
  private connectWebSocket(): void{
    this.webSocketService.connect();
    this.handleUpdate();
    
  }
  private handleUpdate(): void {
    this.webSocketService
      .getOrderUpdates()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((update) => {
        if (update){
          this.handleStatusUpdate(update);
          this.loadOrders();
        } else{
          }
      });
  }
   
      private handleStatusUpdate(update: StatusUpdateMessage): void {
      this.orderarry.update((order) => {
        const updatedOrder = order.find((orderitem) => orderitem.id === update.id);
        if (!updatedOrder) {
          return order;
        }
  
        const updatedOrders= order.map((order) => {
          if (order.id !== updatedOrder.id) return order;
  
          return {
            ...order,
            producerCode: update.producerCode,
  
          };
        });
  
        return updatedOrders;
      });
    }


    onSearch(value: string): void {
    this.producerService.setSearchTerm(value);     
    this.myproducerService.setSearchTerm(value);   
}

loadOrders(): void {
    this.orderService
      .getAllOrder()
      .pipe(
        catchError(() => {
          this.errorMessage.set('Failed to load orders');
          return of([]);
        }),
      )
      .subscribe((orders) => {
        this.orderarry.set(orders);
        const pending = this.orderarry().find((o) => o.status === 'AWAITING_CONFIRMATION');
        this.allprotectedadd.set(pending?.producerCode?.length ?? 0);

      });
  }
}
