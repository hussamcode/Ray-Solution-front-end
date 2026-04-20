import { Component } from '@angular/core';

import { Card } from '../card/card';

@Component({
  selector: 'app-catalog',
  imports: [Card],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css',
})
export class Catalog {}
