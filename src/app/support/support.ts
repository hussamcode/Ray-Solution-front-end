import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Header } from '../header/header';
import { environment } from '../../environments/environment';

interface SupportRequest {
  name: string;
  email: string;
  category: string;
  message: string;
}

@Component({
  selector: 'app-support',
  imports: [Header, FormsModule],
  templateUrl: './support.html',
  styleUrl: './support.css',
})
export class Support {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  formData: SupportRequest = { name: '', email: '', category: 'Technical Support', message: '' };

  isSubmitting = signal(false);
  submitSuccess = signal(false);
  submitError = signal(false);
  errorMessage = signal('');

  errors = signal<Record<string, string>>({});

  validate(): boolean {
    const e: Record<string, string> = {};
    if (!this.formData.name.trim()) e['name'] = 'Name is required';
    if (!this.formData.email.trim()) e['email'] = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.formData.email)) e['email'] = 'Invalid email format';
    if (!this.formData.message.trim()) e['message'] = 'Message is required';
    else if (this.formData.message.trim().length < 10) e['message'] = 'Message must be at least 10 characters';
    this.errors.set(e);
    return Object.keys(e).length === 0;
  }

  onSubmit() {
    if (!this.validate()) return;

    this.isSubmitting.set(true);
    this.submitSuccess.set(false);
    this.submitError.set(false);

    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    this.http.post<{ message: string }>(`${this.apiUrl}/api/support`, this.formData, { headers }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.submitSuccess.set(true);
        this.formData = { name: '', email: '', category: 'Technical Support', message: '' };
        this.errors.set({});
        setTimeout(() => this.submitSuccess.set(false), 5000);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.submitError.set(true);
        this.errorMessage.set(err.error?.message || 'Failed to send message. Please try again.');
        setTimeout(() => this.submitError.set(false), 5000);
      },
    });
  }
}
