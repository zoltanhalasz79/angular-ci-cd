import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common'; // Add this for [ngClass]

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
  title = signal('Angular CI/CD Demo');
  deployStatus = signal('Online');
  lastUpdated = signal(new Date().toLocaleTimeString());

  updateTime() {
    this.lastUpdated.set(new Date().toLocaleTimeString());
  }
}