import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
  sub: string;
  role: string;
  exp: number;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './navbar.html'
})
export class Navbar {

  isAdmin = false;

  constructor() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const currentTime = Date.now() / 1000;

      if (decoded.exp < currentTime) {
        localStorage.removeItem('token');
        this.isAdmin = false;
        return;
      }

      this.isAdmin = decoded.role === 'ADMIN' || decoded.role === 'MANAGER';

    } catch (error) {
      localStorage.removeItem('token');
      this.isAdmin = false;
    }
  }
}