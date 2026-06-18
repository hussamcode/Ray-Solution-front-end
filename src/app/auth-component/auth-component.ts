import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth-service';
import { FormsModule } from '@angular/forms';
import { LoginResponse } from '../models/auth.model';

@Component({
  selector: 'app-auth-component',
  imports: [FormsModule],
  templateUrl: './auth-component.html',
  styleUrl: './auth-component.css',
})
export class AuthComponent {

  login = { username: '', password: '' };
  register = { username: '', email: '', password: '' };

  // ✅ Error signals
  loginError = signal('');
  registerError = signal('');
  emailError = signal('');

  // ✅ Verification signals
  showVerification = signal(false);
  verifyEmail = signal('');
  verifyCode = '';
  verifyError = signal('');
  verifySuccess = signal('');
  isVerified = signal(false);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  // ✅ Email validation
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  loginUser() {
    this.loginError.set('');

    if (!this.login.username) {
      this.loginError.set('Username is required');
      return;
    }
    if (!this.login.password) {
      this.loginError.set('Password is required');
      return;
    }

    this.authService.login(this.login).subscribe({
      next: (res: LoginResponse) => {
        localStorage.setItem('token', res.token);
        this.router.navigate(['/home']);
      },
      error: () => {
        this.loginError.set('Invalid username or password');
      }
    });
  }

  registerUser() {
    this.registerError.set('');
    this.emailError.set('');

    if (!this.register.username) {
      this.registerError.set('Name is required');
      return;
    }

    if (!this.register.email) {
      this.emailError.set('Email is required');
      return;
    }

    // ✅ تحقق من صيغة الـ email
    if (!this.isValidEmail(this.register.email)) {
      this.emailError.set('Please enter a valid email address');
      return;
    }

    if (!this.register.password || this.register.password.length < 6) {
      this.registerError.set('Password must be at least 6 characters');
      return;
    }

    this.authService.register(this.register).subscribe({
      next: () => {
        this.register.username = '';
        this.register.password = '';
        this.verifyEmail.set(this.register.email);
        this.register.email = '';
        this.showVerification.set(true);
      },
      error: () => {
        this.registerError.set('Registration failed. Please try again');
      }
    });
  }

  verifyAccount() {
    this.verifyError.set('');
    this.verifySuccess.set('');

    if (!this.verifyCode) {
      this.verifyError.set('Verification code is required');
      return;
    }

    const data = { email: this.verifyEmail(), verificationCode: this.verifyCode };
    this.authService.verify(data).subscribe({
      next: () => {
        this.verifySuccess.set('Account verified successfully! You can now log in.');
        this.isVerified.set(true);
      },
      error: (err) => {
        this.verifyError.set(err.error || 'Verification failed');
      }
    });
  }

  resendCode() {
    this.verifyError.set('');
    this.verifySuccess.set('');
    this.authService.resendCode(this.verifyEmail()).subscribe({
      next: () => {
        this.verifySuccess.set('Verification code resent. Please check your email.');
      },
      error: () => {
        this.verifyError.set('Failed to resend code. Try again.');
      }
    });
  }

  backToLogin() {
    this.showVerification.set(false);
    this.verifyCode = '';
    this.verifyError.set('');
    this.verifySuccess.set('');
    this.isVerified.set(false);
  }
}