import { Component, ElementRef, ViewChild, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from './chat.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
  // Inject the service
  chatService = inject(ChatService);
  
  // Reference the message board for scrolling
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  constructor() {
    // 🚀 Modern Auto-Scroll: Runs every time chatService.messages() changes
    effect(() => {
      // We just access the signal to register the dependency
      const _ = this.chatService.messages();
      
      // Schedule scroll after view updates
      setTimeout(() => this.scrollToBottom(), 100);
    });
  }

  login() {
    this.chatService.login();
  }

  logout() {
    this.chatService.logout();
  }

  sendMessage(text: string) {
    this.chatService.sendMessage(text);
  }

  private scrollToBottom(): void {
    if (this.scrollContainer) {
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }
}