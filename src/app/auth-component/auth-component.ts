import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth-service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-auth-component',
  imports: [FormsModule],
  templateUrl: './auth-component.html',
  styleUrl: './auth-component.css',
})
export class AuthComponent {
  
  login = { username: '', password: '' };
  register = { name: '', email: '', password: '' };
    constructor(
    private authService: AuthService,
    private router: Router
  ) {}

   // LOGIN
  loginUser() {
    this.authService.login(this.login).subscribe((res:any) => {
      localStorage.setItem('token', res.token);
      this.router.navigate(['/home']);
    });
  }

  // REGISTER
  registerUser() {
    this.authService.register(this.register).subscribe(() => {
      this.router.navigate(['/home']);
    });
  }
}
  