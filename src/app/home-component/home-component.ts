import { Component } from '@angular/core';
import { Catalog } from '../catalog/catalog';
import { Footer } from '../footer/footer';
import { Header } from '../header/header';
@Component({
  selector: 'app-home-component',
  imports: [Header,Catalog,Footer],
  templateUrl: './home-component.html',
  styleUrl: './home-component.css',
})
export class HomeComponent {}
