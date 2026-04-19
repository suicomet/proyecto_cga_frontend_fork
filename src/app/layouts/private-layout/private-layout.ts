import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-private-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './private-layout.html',
  styleUrl: './private-layout.scss'
})
export class PrivateLayout {

}