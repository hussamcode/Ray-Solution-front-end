import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateOrderRequest, ordermodel, UpdateInformationRequest, UpdateLocationRequest, UpdateOrderRequest, UpdateStateRequest } from '../models/ordermodel.model';


@Injectable({
    providedIn: 'root',
})
export class OrderService { 

    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/login/order`;

    public searchTerm = new BehaviorSubject<string>('');
    public currentSearchTerm$ = this.searchTerm.asObservable();

    private get headers() {
        return {
            Authorization: `Bearer ${localStorage.getItem('token')}`
        };
    }

    setSearchTerm(term: string) {
        this.searchTerm.next(term);
    }

    createOrder(request: CreateOrderRequest): Observable<ordermodel> {
        return this.http.post<ordermodel>(this.apiUrl, request, { headers: this.headers });
    }

    getAllOrder(): Observable<ordermodel[]> {
        return this.http.get<ordermodel[]>(this.apiUrl, { headers: this.headers });
    }
        getAllOrderAdmin(): Observable<ordermodel[]> {
        return this.http.get<ordermodel[]>(`${this.apiUrl}/admin`, { headers: this.headers });
    }


    getOrderByID(id: number): Observable<ordermodel> {
        return this.http.get<ordermodel>(`${this.apiUrl}/${id}`, { headers: this.headers });
    }

    getOrderByCode(code: string): Observable<ordermodel> {
        return this.http.get<ordermodel>(`${this.apiUrl}/code/${code}`, { headers: this.headers });
    }
      getOrderByCodeAdmin(code: string): Observable<ordermodel> {
        return this.http.get<ordermodel>(`${this.apiUrl}/code/${code}/admin`, { headers: this.headers });
    }

    updateOrder(code: string, request: UpdateOrderRequest): Observable<ordermodel> {
        return this.http.put<ordermodel>(`${this.apiUrl}/${code}/producer`, request, { headers: this.headers });
    }

    updateOrderStatus(code: string, request: UpdateStateRequest): Observable<ordermodel> {
        return this.http.put<ordermodel>(`${this.apiUrl}/${code}/status`, request, { headers: this.headers });
    }
        updateOrderStatusAdmin(code: string, request: UpdateStateRequest): Observable<ordermodel> {
        return this.http.put<ordermodel>(`${this.apiUrl}/${code}/status/admin`, request, { headers: this.headers });
    }
 
    updateOrderInformation(code: string, request: UpdateInformationRequest): Observable<ordermodel> {
        return this.http.put<ordermodel>(`${this.apiUrl}/${code}/confirmrequest`, request, { headers: this.headers });
    }

    updateOrderLocation(code: string, request: UpdateLocationRequest): Observable<ordermodel> {
        return this.http.put<ordermodel>(`${this.apiUrl}/${code}/location`, request, { headers: this.headers });
    }

    deleteOrder(code: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${code}`, { headers: this.headers });
    }
}