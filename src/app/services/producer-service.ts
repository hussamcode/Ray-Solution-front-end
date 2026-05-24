import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CreateProducerRequest, Producer, UpdateProducerRequest, UpdateProducerRequestAdd } from '../models/producer.model';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ProducerService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/producer';

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

  createProducer(request: CreateProducerRequest): Observable<Producer> {
    return this.http.post<Producer>(this.apiUrl, request, { headers: this.headers });
  }

  getAllProducer(): Observable<Producer[]> {
    return this.http.get<Producer[]>(this.apiUrl, { headers: this.headers });
  }

  getProducerByID(id: number): Observable<Producer> {
    return this.http.get<Producer>(`${this.apiUrl}/${id}`, { headers: this.headers });
  }

  getProducerByCode(code: string): Observable<Producer> {
    return this.http.get<Producer>(`${this.apiUrl}/code/${code}`, { headers: this.headers });
  }

  updateProducer(id: number, request: UpdateProducerRequest): Observable<Producer> {
    return this.http.put<Producer>(`${this.apiUrl}/${id}/producer`, request, { headers: this.headers });
  }

  updateProducerAdd(id: number, request: UpdateProducerRequestAdd): Observable<Producer> {
    return this.http.put<Producer>(`${this.apiUrl}/${id}/producerAdd`, request, { headers: this.headers });
  }
}