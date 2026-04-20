import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './header/header';
import { Catalog } from './catalog/catalog';
import { Footer } from './footer/footer';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet,Header,Catalog,Footer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('front-end');
}
