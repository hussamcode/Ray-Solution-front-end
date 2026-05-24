import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CreateProducerRequest, MyProducer, UpdateProducerRequest } from '../models/myproducer.model';

@Injectable({
  providedIn: 'root',
})
export class MyproducerService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/login/producer';

  // Search
  public searchTerm = new BehaviorSubject<string>('');
  public currentSearchTerm$ = this.searchTerm.asObservable();

  // Token - computed once as a getter so it's always fresh
  private get headers() {
    return {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    };
  }

  setSearchTerm(term: string) {
    this.searchTerm.next(term);
  }

  createProducer(request: CreateProducerRequest): Observable<MyProducer> {
    return this.http.post<MyProducer>(this.apiUrl, request, { headers: this.headers });
  }

  getAllProducer(): Observable<MyProducer[]> {
    return this.http.get<MyProducer[]>(this.apiUrl, { headers: this.headers });
  }

  getProducerByID(id: number): Observable<MyProducer> {
    return this.http.get<MyProducer>(`${this.apiUrl}/${id}`, { headers: this.headers });
  }

  getProducerByCode(code: string): Observable<MyProducer> {
    return this.http.get<MyProducer>(`${this.apiUrl}/code/${code}`, { headers: this.headers });
  }

  updateProducerStatus(id: number, request: UpdateProducerRequest): Observable<MyProducer> {
    return this.http.put<MyProducer>(`${this.apiUrl}/${id}`, request, { headers: this.headers });
  }


}
