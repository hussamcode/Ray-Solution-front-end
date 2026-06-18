import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';

import { Card } from '../card/card';
import { Producer, StatusUpdateMessage } from '../models/producer.model';
import { ProducerService } from '../services/producer-service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WebsocketService } from '../services/websocket-service';
import { Header } from '../header/header';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
@Component({
  selector: 'app-catalog',
  imports: [Card,FormsModule,ReactiveFormsModule],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css',
})
export class Catalog implements OnInit {
    form!: FormGroup;

  private producerService = inject(ProducerService);
  private webSocketService =inject(WebsocketService);
  protecteditemlist = signal<Producer[]>([]);
  private destroyRef = inject(DestroyRef);
  filteredproducers =  signal<Producer[]>([]);
  searchvlue ="";
  //filter brand
  brandvale: string = 'all';
  
  ngOnInit(): void {
    this.loadProducer();
    this.connectWebSocket();
   
    
  }
  loadProducer(): void {
    this.producerService.getAllProducer().subscribe({
      next: (producers) => {
      this.protecteditemlist.set(producers);
      this.filteredproducers.set(producers); 
      },
      error: (err) => {
        console.error('Failed to load producers:', err);
      }
    });
     this.producerService.currentSearchTerm$
      .subscribe(value => {
        this.searchvlue = value; 
        this.onSearch(value);
      });
  }
    //update real time
  private connectWebSocket(): void{
    this.webSocketService.connect();
    this.handleUpdate();
  }
  private handleUpdate(): void {
    this.webSocketService
      .getStatusUpdates()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((update) => {
        if (update){
          this.handleStatusUpdate(update);
        } else{
          }
      });
  }

    private handleStatusUpdate(update: StatusUpdateMessage): void {
    this.protecteditemlist.update((protecteds) => {
      const updatedProtected = protecteds.find((protecteditem) => protecteditem.id === update.id);
      if (!updatedProtected) {
        return protecteds;
      }

      const updatedProtecteds = protecteds.map((shipment) => {
        if (shipment.id !== updatedProtected.id) return shipment;

        return {
          ...shipment,
          producerAdd: update.producerAdd,

        };
      });

      return updatedProtecteds;
    });
         console.log('searchvlue:', this.searchvlue); // ← هل فيه قيمة؟
    console.log('filteredproducers:', this.filteredproducers()); // ← هل تحدّث؟
    this.onSearch(this.searchvlue);
  }
 //serach
onSearch(value: string) {
    this.searchvlue = value;
    let list = this.protecteditemlist();

    if (this.brandvale !== 'all') {
        list = list.filter(p => p.brand === this.brandvale);
    }

    if (value) {
        list = list.filter(item =>
            item.name.toLowerCase().includes(value.toLowerCase())
        );
    }

    this.filteredproducers.set(list);
}

onChange() {
    this.brandvale = this.form.get('brand')?.value;
    this.onSearch(this.searchvlue); // ✅ أعد الفلتر مع البراند
}
//radio brand
 constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
       brand: ['all']
    });
  }

  
}
