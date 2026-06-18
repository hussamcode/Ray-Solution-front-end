import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginRequest, LoginResponse, RegisterRequest } from '../models/auth.model';
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, data);
  }

  register(data: RegisterRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/signup`, data);
  }

  verify(data: { email: string; verificationCode: string }) {
    return this.http.post(`${this.apiUrl}/auth/verify`, data, { responseType: 'text' });
  }

  resendCode(email: string) {
    return this.http.post(`${this.apiUrl}/auth/resend?email=${email}`, null, { responseType: 'text' });
  }
}
